import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

const TOKYO = "Asia/Tokyo";
const TERMINAL_STATUSES = new Set(["done", "cancelled"]);
const SCHEDULE_STATUSES = new Set(["scheduled", "cancelled"]);

export function validateIsoDate(value, label = "date") {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must be YYYY-MM-DD: ${value ?? ""}`);
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} is not a valid date: ${value}`);
  }
  return value;
}

export function addDays(value, amount) {
  const parsed = new Date(`${validateIsoDate(value)}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + amount);
  return parsed.toISOString().slice(0, 10);
}

function valueAsString(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (value === null || value === undefined) return "";
  return String(value);
}

export function parseFrontMatter(text, filePath = "<input>") {
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    throw new Error(`front matter is missing: ${filePath}`);
  }
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (end < 0) throw new Error(`front matter is not closed: ${filePath}`);
  let frontMatter;
  try {
    frontMatter = parseYaml(lines.slice(1, end).join("\n")) ?? {};
  } catch (error) {
    throw new Error(`front matter cannot be parsed: ${filePath}: ${error.message}`);
  }
  if (typeof frontMatter !== "object" || Array.isArray(frontMatter)) {
    throw new Error(`front matter must be a mapping: ${filePath}`);
  }
  const normalized = Object.fromEntries(
    Object.entries(frontMatter).map(([key, value]) => [key, valueAsString(value)]),
  );
  return { frontMatter: normalized, rawFrontMatter: frontMatter, body: lines.slice(end + 1).join("\n") };
}

function titleFromBody(body, filePath) {
  const match = body.match(/^#\s+(.+)$/m);
  return match?.[1].trim() || path.basename(filePath, ".md");
}

function recordFromFile(repoRoot, filePath, expectedType) {
  const text = fs.readFileSync(filePath, "utf8");
  const parsed = parseFrontMatter(text, filePath);
  if (parsed.frontMatter.type !== expectedType) {
    throw new Error(`expected type ${expectedType}: ${filePath}`);
  }
  if (expectedType === "task" && Object.hasOwn(parsed.rawFrontMatter, "priority")) {
    const priority = parsed.rawFrontMatter.priority;
    if (typeof priority !== "number" || !Number.isInteger(priority) || priority < 1 || priority > 9) {
      throw new Error(`priority must be an integer from 1 to 9: ${filePath}`);
    }
  }
  if (expectedType === "schedule") {
    const hasStatus = Object.hasOwn(parsed.rawFrontMatter, "status");
    const status = hasStatus ? parsed.rawFrontMatter.status : "scheduled";
    if (typeof status !== "string" || !SCHEDULE_STATUSES.has(status)) {
      throw new Error(`schedule status must be scheduled or cancelled: ${filePath}`);
    }
    parsed.frontMatter.status = status;
  }
  if (expectedType === "task") {
    for (const [currentKey, legacyKey] of [
      ["planned_start_date", "planned_date"],
      ["planned_end_date", "due"],
    ]) {
      const hasCurrent = Object.hasOwn(parsed.rawFrontMatter, currentKey);
      const hasLegacy = Object.hasOwn(parsed.rawFrontMatter, legacyKey);
      if (hasCurrent) {
        const value = parsed.rawFrontMatter[currentKey];
        if (typeof value !== "string") {
          throw new Error(`${currentKey} must be a scalar YYYY-MM-DD string: ${filePath}`);
        }
        validateIsoDate(value, `${filePath}: ${currentKey}`);
      }
      const currentValue = parsed.frontMatter[currentKey];
      const legacyValue = parsed.frontMatter[legacyKey];
      if (hasLegacy && typeof parsed.rawFrontMatter[legacyKey] !== "string") {
        throw new Error(`${legacyKey} must be a scalar YYYY-MM-DD string: ${filePath}`);
      }
      if (currentValue && legacyValue && currentValue !== legacyValue) {
        throw new Error(`conflicting ${currentKey} and legacy ${legacyKey}: ${filePath}`);
      }
      if (!currentValue && legacyValue) parsed.frontMatter[currentKey] = legacyValue;
      // Preserve legacy properties for diagnosis while all selection uses current names.
      if (hasLegacy) validateIsoDate(legacyValue, `${filePath}: ${legacyKey}`);
    }
    if (parsed.frontMatter.planned_start_date && parsed.frontMatter.planned_end_date
      && parsed.frontMatter.planned_start_date > parsed.frontMatter.planned_end_date) {
      throw new Error(`planned_start_date must not be after planned_end_date: ${filePath}`);
    }
    if (Object.hasOwn(parsed.rawFrontMatter, "planned_dates_status")) {
      const value = parsed.rawFrontMatter.planned_dates_status;
      if (typeof value !== "string" || !new Set(["confirmed", "provisional"]).has(value)) {
        throw new Error(`planned_dates_status must be confirmed or provisional: ${filePath}`);
      }
      if (!parsed.frontMatter.planned_start_date || !parsed.frontMatter.planned_end_date) {
        throw new Error(`planned_dates_status requires a complete planned period: ${filePath}`);
      }
      if (parsed.frontMatter.recurrence === "weekly") {
        throw new Error(`weekly recurrence must not use planned_dates_status: ${filePath}`);
      }
    }
  }
  for (const key of ["date", "created", "due", "planned_date", "planned_start_date", "planned_end_date", "planned_week"]) {
    const explicitTaskCreationDate = expectedType === "task" && key === "created"
      && Object.hasOwn(parsed.rawFrontMatter, "created");
    if (parsed.frontMatter[key] || explicitTaskCreationDate) {
      validateIsoDate(parsed.frontMatter[key], `${filePath}: ${key}`);
    }
  }
  const relativePath = path.relative(repoRoot, filePath).split(path.sep).join("/");
  return {
    filePath,
    relativePath,
    frontMatter: parsed.frontMatter,
    title: titleFromBody(parsed.body, filePath),
  };
}

export function loadRecords(repoRoot) {
  const tasks = [];
  const schedules = [];
  if (!fs.existsSync(repoRoot)) return { tasks, schedules };

  for (const yearEntry of fs.readdirSync(repoRoot, { withFileTypes: true })) {
    if (!yearEntry.isDirectory() || !/^\d{4}$/.test(yearEntry.name)) continue;
    const yearPath = path.join(repoRoot, yearEntry.name);
    for (const monthEntry of fs.readdirSync(yearPath, { withFileTypes: true })) {
      if (!monthEntry.isDirectory() || !/^\d{4}(0[1-9]|1[0-2])$/.test(monthEntry.name)
        || !monthEntry.name.startsWith(yearEntry.name)) continue;
      const monthPath = path.join(yearPath, monthEntry.name);
      for (const [directoryName, type, filenamePattern] of [
        ["tasks", "task", /^task-(\d{6})-(\d{5})-(.+)\.md$/],
        ["schedules", "schedule", /^schedule-(\d{8})-(.+)\.md$/],
      ]) {
        const recordDirectory = path.join(monthPath, directoryName);
        if (!fs.existsSync(recordDirectory)) continue;
        for (const entry of fs.readdirSync(recordDirectory, { withFileTypes: true })) {
          if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
          const match = filenamePattern.exec(entry.name);
          if (!match) continue;
          const filePath = path.join(recordDirectory, entry.name);
          const record = recordFromFile(repoRoot, filePath, type);
          if (type === "task") {
            const [, idMonth, sequence] = match;
            const expectedId = `task-${idMonth}-${sequence}`;
            if (idMonth !== monthEntry.name || record.frontMatter.id !== expectedId) {
              throw new Error(`task path, filename, and ID must agree: ${filePath}`);
            }
            const createdMonth = record.frontMatter.created?.slice(0, 7).replace("-", "");
            if (createdMonth && createdMonth !== monthEntry.name) {
              throw new Error(`task created month must agree with its directory and ID: ${filePath}`);
            }
            tasks.push(record);
          } else {
            const [, compactDate] = match;
            const date = `${compactDate.slice(0, 4)}-${compactDate.slice(4, 6)}-${compactDate.slice(6, 8)}`;
            validateIsoDate(date, `${filePath}: filename date`);
            if (compactDate.slice(0, 6) !== monthEntry.name || record.frontMatter.date !== date) {
              throw new Error(`schedule path, filename, and date must agree: ${filePath}`);
            }
            schedules.push(record);
          }
        }
      }
    }
  }
  tasks.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  schedules.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  return { tasks, schedules };
}

function isActiveTask(task) {
  return !TERMINAL_STATUSES.has(task.frontMatter.status);
}

function needsDateReview(task) {
  const hasPlannedPeriod = task.frontMatter.planned_start_date || task.frontMatter.planned_end_date;
  const unboundedWeeklyRule = task.frontMatter.recurrence === "weekly" && !hasPlannedPeriod;
  return isActiveTask(task) && !unboundedWeeklyRule
    && (!task.frontMatter.planned_start_date || !task.frontMatter.planned_end_date
      || task.frontMatter.planned_dates_status === "provisional");
}

function taskPriority(task) {
  return task.frontMatter.priority === undefined ? 5 : Number(task.frontMatter.priority);
}

function taskId(task) {
  return task.frontMatter.id || task.relativePath;
}

function compareTaskId(left, right) {
  return taskId(left).localeCompare(taskId(right));
}

function comparePriorityThenId(left, right) {
  return taskPriority(left) - taskPriority(right) || compareTaskId(left, right);
}

function compareDateThenPriority(field) {
  return (left, right) => left.frontMatter[field].localeCompare(right.frontMatter[field])
    || comparePriorityThenId(left, right);
}

function inWindow(value, start, end) {
  return typeof value === "string" && value >= start && value <= end;
}

function formatWeekday(value) {
  return new Intl.DateTimeFormat("ja-JP", { weekday: "short", timeZone: "UTC" })
    .format(new Date(`${value}T00:00:00Z`));
}

function formatScheduleTime(schedule) {
  const { start, end } = schedule.frontMatter;
  if (!start) return "";
  return end ? `${start}–${end}` : start;
}

export function canonicalPlanPath(date) {
  return `${date.slice(0, 4)}/${date.slice(0, 7).replace("-", "")}/day-plan/day-plan-${date.replaceAll("-", "")}.md`;
}

export function relativeLinkFromDayPlan(date, sourcePath) {
  const planPath = canonicalPlanPath(date);
  return path.posix.relative(path.posix.dirname(planPath), sourcePath) || path.posix.basename(sourcePath);
}

function taskLink(date, task) {
  return `[${task.title}](${relativeLinkFromDayPlan(date, task.relativePath)})`;
}

function scheduleLink(date, schedule) {
  return `[${schedule.title}](${relativeLinkFromDayPlan(date, schedule.relativePath)})`;
}

function taskLine(date, task, detail) {
  const suffix = detail ? `\n  - ${detail}` : "";
  return `- ${taskLink(date, task)}（優先度 ${taskPriority(task)}）${suffix}`;
}

function taskPeriod(task) {
  return `${task.frontMatter.planned_start_date}〜${task.frontMatter.planned_end_date}`;
}

function dateReviewLine(date, task) {
  const details = task.frontMatter.planned_dates_status === "provisional"
    ? [`暫定期間 ${task.frontMatter.planned_start_date}〜${task.frontMatter.planned_end_date}`]
    : [
      task.frontMatter.planned_start_date && `開始 ${task.frontMatter.planned_start_date}`,
      task.frontMatter.planned_end_date && `終了 ${task.frontMatter.planned_end_date}`,
    ].filter(Boolean);
  if (task.frontMatter.due_month) details.push(`期限月 ${task.frontMatter.due_month}`);
  if (task.frontMatter.planned_week) details.push(`予定週 ${task.frontMatter.planned_week}`);
  return taskLine(date, task, `日程要確認${details.length ? `：${details.join(" / ")}` : "：予定期間未設定"}`);
}

function scheduleLine(date, schedule) {
  const time = formatScheduleTime(schedule);
  const when = `${schedule.frontMatter.date}（${formatWeekday(schedule.frontMatter.date)}）${time ? ` ${time}` : ""}`;
  return `- ${when}：${scheduleLink(date, schedule)}`;
}

function section(title, lines) {
  return `## ${title}\n\n${lines.length ? lines.join("\n") : "- なし"}`;
}

export function todayInTokyo() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TOKYO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function buildDayPlan({ repoRoot, targetDate, generatedDate = todayInTokyo() }) {
  validateIsoDate(targetDate, "targetDate");
  validateIsoDate(generatedDate, "generatedDate");
  const windowEnd = addDays(targetDate, 6);
  const { tasks, schedules } = loadRecords(repoRoot);
  const activeTasks = tasks.filter(isActiveTask);
  const datedTasks = activeTasks.filter((task) => task.frontMatter.planned_start_date
    && task.frontMatter.planned_end_date && !needsDateReview(task));
  const dateReviewTasks = activeTasks.filter(needsDateReview);
  const todayTasks = datedTasks.filter((task) =>
    task.frontMatter.planned_start_date <= targetDate && targetDate <= task.frontMatter.planned_end_date)
    .sort(comparePriorityThenId);
  const upcomingStartTasks = datedTasks.filter((task) =>
    task.frontMatter.planned_start_date > targetDate
      && inWindow(task.frontMatter.planned_start_date, targetDate, windowEnd));
  const overdueTasks = datedTasks.filter((task) => task.frontMatter.planned_end_date < targetDate)
    .sort(compareDateThenPriority("planned_end_date"));
  const nearEndTasks = datedTasks.filter((task) =>
    inWindow(task.frontMatter.planned_end_date, targetDate, windowEnd));
  const plannedWeekTasks = activeTasks.filter((task) => {
    if (task.frontMatter.planned_dates_status === "provisional") return false;
    const week = task.frontMatter.planned_week;
    return week && inWindow(addDays(week, 6), targetDate, windowEnd) || week && inWindow(week, targetDate, windowEnd);
  });
  const nearSchedules = schedules.filter((schedule) => schedule.frontMatter.status === "scheduled"
    && inWindow(schedule.frontMatter.date, targetDate, windowEnd));

  const lines = [
    "---",
    "type: day-plan",
    `date: ${targetDate}`,
    `generated: ${generatedDate}`,
    "---",
    "",
    `# ${Number(targetDate.slice(5, 7))}月${Number(targetDate.slice(8, 10))}日 デイリーブリーフ`,
    "",
    section("今日の作業予定", todayTasks.map((task) =>
      taskLine(targetDate, task, `${taskPeriod(task)}：${task.frontMatter.planned_action || "作業予定"}`))),
    "",
    section("予定期間超過", overdueTasks
      .map((task) => `- ${taskPeriod(task)}：${taskLink(targetDate, task)}（優先度 ${taskPriority(task)}）`)),
    "",
    section("近い予定終了日", nearEndTasks
      .sort(compareDateThenPriority("planned_end_date"))
      .map((task) => `- ${taskPeriod(task)}：${taskLink(targetDate, task)}（優先度 ${taskPriority(task)}）`)),
    "",
    section("近々始まる作業予定", upcomingStartTasks
      .sort(compareDateThenPriority("planned_start_date"))
      .map((task) => taskLine(targetDate, task, `${taskPeriod(task)}：${task.frontMatter.planned_action || "作業予定"}`))),
    "",
    section("日程要確認", dateReviewTasks
      .sort(comparePriorityThenId)
      .map((task) => dateReviewLine(targetDate, task))),
    "",
    section("近々の予定", nearSchedules
      .sort((left, right) => `${left.frontMatter.date} ${left.frontMatter.start || ""}`.localeCompare(`${right.frontMatter.date} ${right.frontMatter.start || ""}`))
      .map((schedule) => scheduleLine(targetDate, schedule))),
    "",
    section("実施予定週", plannedWeekTasks
      .sort(compareDateThenPriority("planned_week"))
      .map((task) => `- ${task.frontMatter.planned_week}週：${taskLink(targetDate, task)}（優先度 ${taskPriority(task)}）`)),
    "",
    "## 参照方針",
    "",
    "このファイルは、当日の予定作業と対象日を含む7日間の予定を書き出したスナップショット。taskとscheduleの内容が変わった場合は、元ファイルを正とする。",
    "",
  ];
  return {
    targetDate,
    generatedDate,
    relativePath: canonicalPlanPath(targetDate),
    markdown: lines.join("\n"),
    records: { todayTasks, overdueTasks, upcomingStartTasks, nearEndTasks, dateReviewTasks, nearSchedules, plannedWeekTasks },
  };
}

export function writeDayPlan({ repoRoot, outputRoot, targetDate, generatedDate }) {
  const plan = buildDayPlan({ repoRoot, targetDate, generatedDate });
  const outputPath = path.join(outputRoot, ...plan.relativePath.split("/"));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, plan.markdown, "utf8");
  return { ...plan, outputPath };
}
