import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

const TOKYO = "Asia/Tokyo";
const TERMINAL_STATUSES = new Set(["done", "cancelled"]);

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
  return { frontMatter: normalized, body: lines.slice(end + 1).join("\n") };
}

function walkMarkdownFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...walkMarkdownFiles(entryPath));
    else if (entry.isFile() && entry.name.endsWith(".md")) result.push(entryPath);
  }
  return result;
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
  for (const key of ["date", "created", "due", "planned_date", "planned_week"]) {
    if (parsed.frontMatter[key]) validateIsoDate(parsed.frontMatter[key], `${filePath}: ${key}`);
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
  for (const filePath of walkMarkdownFiles(repoRoot)) {
    const segments = path.relative(repoRoot, filePath).split(path.sep);
    const type = segments.includes("tasks") ? "task" : segments.includes("schedules") ? "schedule" : null;
    if (!type) continue;
    const record = recordFromFile(repoRoot, filePath, type);
    if (type === "task") tasks.push(record);
    else schedules.push(record);
  }
  tasks.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  schedules.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  return { tasks, schedules };
}

function isActiveTask(task) {
  return !TERMINAL_STATUSES.has(task.frontMatter.status);
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
  return `- ${taskLink(date, task)}${suffix}`;
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
  const todayTasks = activeTasks.filter((task) => task.frontMatter.planned_date === targetDate);
  const futurePlannedTasks = activeTasks.filter((task) =>
    task.frontMatter.planned_date > targetDate && inWindow(task.frontMatter.planned_date, targetDate, windowEnd));
  const dueTasks = activeTasks.filter((task) => inWindow(task.frontMatter.due, targetDate, windowEnd));
  const plannedWeekTasks = activeTasks.filter((task) => {
    const week = task.frontMatter.planned_week;
    return week && inWindow(addDays(week, 6), targetDate, windowEnd) || week && inWindow(week, targetDate, windowEnd);
  });
  const nearSchedules = schedules.filter((schedule) => inWindow(schedule.frontMatter.date, targetDate, windowEnd));

  const lines = [
    "---",
    "type: day-plan",
    `date: ${targetDate}`,
    `generated: ${generatedDate}`,
    "---",
    "",
    `# ${Number(targetDate.slice(5, 7))}月${Number(targetDate.slice(8, 10))}日 デイリーブリーフ`,
    "",
    section("今日の実施項目", todayTasks.map((task) => taskLine(targetDate, task, task.frontMatter.planned_action))),
    "",
    section("近い期限", dueTasks
      .sort((left, right) => left.frontMatter.due.localeCompare(right.frontMatter.due) || left.relativePath.localeCompare(right.relativePath))
      .map((task) => `- ${task.frontMatter.due}：${taskLink(targetDate, task)}`)),
    "",
    section("近々の実施予定", futurePlannedTasks
      .sort((left, right) => left.frontMatter.planned_date.localeCompare(right.frontMatter.planned_date))
      .map((task) => taskLine(targetDate, task, `${task.frontMatter.planned_date}：${task.frontMatter.planned_action || "実施予定"}`))),
    "",
    section("近々の予定", nearSchedules
      .sort((left, right) => `${left.frontMatter.date} ${left.frontMatter.start || ""}`.localeCompare(`${right.frontMatter.date} ${right.frontMatter.start || ""}`))
      .map((schedule) => scheduleLine(targetDate, schedule))),
    "",
    section("実施予定週", plannedWeekTasks
      .sort((left, right) => left.frontMatter.planned_week.localeCompare(right.frontMatter.planned_week))
      .map((task) => `- ${task.frontMatter.planned_week}週：${taskLink(targetDate, task)}`)),
    "",
    "## 参照方針",
    "",
    "このファイルは、当日の実施項目と対象日を含む7日間の予定・期限を書き出したスナップショット。taskとscheduleの内容が変わった場合は、元ファイルを正とする。",
    "",
  ];
  return {
    targetDate,
    generatedDate,
    relativePath: canonicalPlanPath(targetDate),
    markdown: lines.join("\n"),
    records: { todayTasks, futurePlannedTasks, dueTasks, nearSchedules, plannedWeekTasks },
  };
}

export function writeDayPlan({ repoRoot, outputRoot, targetDate, generatedDate }) {
  const plan = buildDayPlan({ repoRoot, targetDate, generatedDate });
  const outputPath = path.join(outputRoot, ...plan.relativePath.split("/"));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, plan.markdown, "utf8");
  return { ...plan, outputPath };
}
