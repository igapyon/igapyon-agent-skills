import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildDayPlan, loadRecords, relativeLinkFromDayPlan, writeDayPlan } from "./day-plan.mjs";

function writeRecord(directory, filename, fields, title) {
  const frontMatter = Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join("\n");
  fs.writeFileSync(path.join(directory, filename), `---\n${frontMatter}\n---\n\n# ${title}\n`);
}

function fixtureRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "daybook-test-"));
  const tasks = path.join(root, "2026/202609/tasks");
  const schedules = path.join(root, "2026/202609/schedules");
  fs.mkdirSync(tasks, { recursive: true });
  fs.mkdirSync(schedules, { recursive: true });
  writeRecord(tasks, "task-202609-00001-today.md", {
    type: "task", id: "task-202609-00001", status: "todo", created: "2026-09-01",
    planned_date: "2026-09-14", planned_action: '"今日の初動を行う"', due: "2026-09-18",
  }, "今日のタスク");
  writeRecord(tasks, "task-202609-00002-week.md", {
    type: "task", id: "task-202609-00002", status: "in_progress", created: "2026-09-01",
    planned_week: "2026-09-21",
  }, "9月21日週のタスク");
  writeRecord(tasks, "task-202609-00003-done.md", {
    type: "task", id: "task-202609-00003", status: "done", created: "2026-09-01",
    planned_date: "2026-09-14", due: "2026-09-15",
  }, "完了済みタスク");
  writeRecord(tasks, "task-202609-00004-too-late.md", {
    type: "task", id: "task-202609-00004", status: "todo", created: "2026-09-01", due: "2026-09-21",
  }, "7日目以降の期限");
  writeRecord(tasks, "task-202609-00005-overdue-high.md", {
    type: "task", id: "task-202609-00005", status: "todo", priority: 1, created: "2026-09-01",
    planned_date: "2026-09-05", due: "2026-09-13",
  }, "期限超過の高優先度");
  writeRecord(tasks, "task-202609-00006-overdue-low.md", {
    type: "task", id: "task-202609-00006", status: "in_progress", priority: 8, created: "2026-09-01",
    planned_date: "2026-09-04", due: "2026-09-10",
  }, "さらに古い期限超過");
  writeRecord(tasks, "task-202609-00007-overdue-done.md", {
    type: "task", id: "task-202609-00007", status: "done", priority: 1, created: "2026-09-01", due: "2026-09-12",
  }, "完了済み期限超過");
  writeRecord(tasks, "task-202609-00008-overdue-same-date.md", {
    type: "task", id: "task-202609-00008", status: "todo", priority: 9, created: "2026-09-01",
    planned_date: "2026-09-05", due: "2026-09-13",
  }, "同日期限超過");
  writeRecord(tasks, "task-202609-00009-cancelled.md", {
    type: "task", id: "task-202609-00009", status: "cancelled", priority: 1,
    created: "2026-09-01", planned_date: "2026-09-04", due: "2026-09-10",
  }, "中止済みタスク");
  writeRecord(schedules, "schedule-20260917-meeting.md", {
    type: "schedule", date: "2026-09-17", start: '"19:00"', end: '"21:00"',
  }, "近い予定");
  writeRecord(schedules, "schedule-20260916-cancelled.md", {
    type: "schedule", date: "2026-09-16", status: "cancelled",
  }, "中止した予定");
  writeRecord(schedules, "schedule-20260922-too-late.md", {
    type: "schedule", date: "2026-09-22",
  }, "対象外の予定");

  const oldTasks = path.join(root, "2025/202512/tasks");
  fs.mkdirSync(oldTasks, { recursive: true });
  writeRecord(oldTasks, "task-202512-00001-old.md", {
    type: "task", id: "task-202512-00001", status: "todo", created: "2025-12-01",
  }, "古い月のタスク");
  writeRecord(oldTasks, "task-202512-00002-legacy-no-created.md", {
    type: "task", id: "task-202512-00002", status: "todo",
  }, "created 未記載の旧タスク");

  const backupTasks = path.join(root, "workplace/backup/2026/202609/tasks");
  fs.mkdirSync(backupTasks, { recursive: true });
  writeRecord(backupTasks, "task-202609-00099-backup.md", {
    type: "task", id: "task-202609-00099", status: "todo", created: "2026-09-01", planned_date: "2026-09-14",
  }, "バックアップのタスク");
  const attachmentTasks = path.join(root, "2026/202609/attachments/task-202609-00001/tasks");
  fs.mkdirSync(attachmentTasks, { recursive: true });
  fs.writeFileSync(path.join(attachmentTasks, "notes.md"), "添付資料\n");
  return root;
}

test("day-plan selects current work and includes unfinished overdue tasks", () => {
  const plan = buildDayPlan({ repoRoot: fixtureRoot(), targetDate: "2026-09-14", generatedDate: "2026-09-14" });
  assert.equal(plan.records.todayTasks.length, 1);
  assert.deepEqual(plan.records.overdueTasks.map((task) => task.frontMatter.id), [
    "task-202609-00006", "task-202609-00005", "task-202609-00008",
  ]);
  assert.equal(plan.records.nearEndTasks.length, 1);
  assert.equal(plan.records.nearSchedules.length, 1);
  assert.equal(plan.records.plannedWeekTasks.length, 0);
  assert.match(plan.markdown, /今日のタスク/);
  assert.match(plan.markdown, /期限超過の高優先度/);
  assert.doesNotMatch(plan.markdown, /完了済み期限超過/);
  assert.match(plan.markdown, /2026-09-17/);
  assert.match(plan.markdown, /7日目以降の期限/);
  assert.match(plan.markdown, /日程要確認/);
  assert.doesNotMatch(plan.markdown, /完了済みタスク/);
  assert.doesNotMatch(plan.markdown, /中止済みタスク/);
  assert.doesNotMatch(plan.markdown, /中止した予定/);
  assert.doesNotMatch(plan.markdown, /対象外の予定/);
});

test("backlog stays out of date-based sections and is listed once in priority and ID order", () => {
  const root = fixtureRoot();
  const tasks = path.join(root, "2026/202609/tasks");
  const add = (sequence, slug, fields, title = slug) => writeRecord(
    tasks,
    `task-202609-${String(sequence).padStart(5, "0")}-${slug}.md`,
    { type: "task", id: `task-202609-${String(sequence).padStart(5, "0")}`, status: "todo", created: "2026-09-01", ...fields },
    title,
  );
  add(20, "today", {
    planning_state: "backlog", priority: 2,
    planned_start_date: "2026-09-01", planned_end_date: "2026-12-31",
    planned_dates_status: "confirmed", planned_action: '"参考アクション"',
    due_month: '"2026-12"', planned_week: "2026-09-14",
  }, "長期間のBacklog");
  add(21, "overdue", { planning_state: "backlog", priority: 1, planned_start_date: "2026-08-01", planned_end_date: "2026-09-10" });
  add(22, "upcoming", { planning_state: "backlog", priority: 3, planned_start_date: "2026-09-16", planned_end_date: "2026-09-30" });
  add(23, "start-only", { planning_state: "backlog", planned_start_date: "2026-09-14" });
  add(24, "end-only", { planning_state: "backlog", planned_end_date: "2026-09-18" });
  add(25, "provisional", {
    planning_state: "backlog", planned_start_date: "2026-09-14", planned_end_date: "2026-09-14",
    planned_dates_status: "provisional",
  });
  add(26, "no-dates", { planning_state: "backlog" });
  add(27, "in-progress", { planning_state: "backlog", status: "in_progress" });
  add(28, "done", { planning_state: "backlog", status: "done" });
  add(29, "cancelled", { planning_state: "backlog", status: "cancelled" });
  add(30, "weekly", { planning_state: "backlog", recurrence: "weekly", next_occurrence: "2026-09-17" });
  add(31, "same-planned-period", {
    planning_state: "planned", priority: 4, planned_start_date: "2026-09-01", planned_end_date: "2026-12-31",
    planned_dates_status: "confirmed",
  }, "同期間のplanned task");
  add(32, "outside-window", {
    planning_state: "backlog", priority: 4, planned_start_date: "2026-10-01", planned_end_date: "2026-10-30",
    planned_week: "2026-09-14",
  });

  const oldTasks = path.join(root, "2025/202512/tasks");
  writeRecord(oldTasks, "task-202512-00003-old-backlog.md", {
    type: "task", id: "task-202512-00003", status: "todo", planning_state: "backlog", created: "2025-12-01",
  }, "前年のBacklog");
  const scheduleDirectory = path.join(root, "2026/202609/schedules");
  writeRecord(scheduleDirectory, "schedule-20260917-backlog-weekly.md", {
    type: "schedule", date: "2026-09-17", status: "scheduled",
  }, "Backlog週次taskのschedule");

  const plan = buildDayPlan({ repoRoot: root, targetDate: "2026-09-14", generatedDate: "2026-09-14" });
  const backlogIds = plan.records.backlogTasks.map((task) => task.frontMatter.id);
  assert.deepEqual(backlogIds, [
    "task-202609-00021", "task-202609-00020", "task-202609-00022", "task-202609-00032", "task-202512-00003",
    "task-202609-00023", "task-202609-00024", "task-202609-00025", "task-202609-00026",
    "task-202609-00027", "task-202609-00030",
  ]);
  for (const group of [
    plan.records.todayTasks,
    plan.records.overdueTasks,
    plan.records.nearEndTasks,
    plan.records.upcomingStartTasks,
    plan.records.dateReviewTasks,
    plan.records.plannedWeekTasks,
  ]) {
    assert.equal(group.some((task) => task.frontMatter.planning_state === "backlog"), false);
  }
  assert.equal(plan.records.nearSchedules.some((schedule) => schedule.title === "Backlog週次taskのschedule"), true);
  assert.equal(plan.records.todayTasks.some((task) => task.frontMatter.id === "task-202609-00031"), true);
  assert.match(plan.markdown, /## Backlog/);
  assert.match(plan.markdown, /参考予定期間 2026-09-01〜2026-12-31 \/ 期限月 2026-12 \/ 参考予定週 2026-09-14/);
  assert.match(plan.markdown, /参考開始 2026-09-14/);
  assert.match(plan.markdown, /参考終了 2026-09-18/);
  assert.match(plan.markdown, /予定期間未設定/);
  assert.match(plan.markdown, /task-202609-00027：\[in-progress\].*状態 in_progress/);
  assert.match(plan.markdown, /task-202512-00003：\[前年のBacklog\]/);
  assert.ok(plan.markdown.includes("../../../2025/202512/tasks/task-202512-00003-old-backlog.md"));
  assert.match(plan.markdown, /次回 2026-09-17/);
  assert.equal((plan.markdown.match(/長期間のBacklog/g) ?? []).length, 1);
  assert.doesNotMatch(plan.markdown, /task-202609-00028|task-202609-00029/);
  assert.doesNotMatch(plan.markdown, /undefined|null/);
});

test("planning_state defaults to planned and rejects unsupported YAML values", () => {
  const root = fixtureRoot();
  const tasks = path.join(root, "2026/202609/tasks");
  const plan = buildDayPlan({ repoRoot: root, targetDate: "2026-09-14", generatedDate: "2026-09-14" });
  assert.equal(plan.records.todayTasks.some((task) => task.frontMatter.id === "task-202609-00001"), true);
  assert.equal(plan.records.backlogTasks.length, 0);
  assert.match(plan.markdown, /## Backlog\n\n- なし/);

  for (const [index, yamlValue] of ["[]", "{}", "null", "10", "true", '""', '"Backlog"', '"pending"'].entries()) {
    const sequence = String(60 + index).padStart(5, "0");
    const filename = `task-202609-${sequence}-invalid-planning-state.md`;
    fs.writeFileSync(path.join(tasks, filename), [
      "---", "type: task", `id: task-202609-${sequence}`, "status: todo", "created: 2026-09-01",
      `planning_state: ${yamlValue}`, "---", "", "# Invalid planning state", "",
    ].join("\n"));
    assert.throws(() => loadRecords(root), (error) =>
      error.message.includes("planning_state must be planned or backlog") && error.message.includes(filename));
    fs.unlinkSync(path.join(tasks, filename));
  }
});

test("backlog keeps date validation and does not duplicate incomplete tasks in date review", () => {
  const root = fixtureRoot();
  const tasks = path.join(root, "2026/202609/tasks");
  const invalid = path.join(tasks, "task-202609-00070-invalid-backlog-date.md");
  writeRecord(tasks, path.basename(invalid), {
    type: "task", id: "task-202609-00070", status: "todo", planning_state: "backlog",
    created: "2026-09-01", planned_start_date: '"not-a-date"',
  }, "Invalid Backlog date");
  assert.throws(() => loadRecords(root), /planned_start_date must be YYYY-MM-DD/);
  fs.unlinkSync(invalid);

  const incompleteStatus = path.join(tasks, "task-202609-00071-incomplete-backlog-status.md");
  fs.writeFileSync(incompleteStatus, [
    "---", "type: task", "id: task-202609-00071", "status: todo", "created: 2026-09-01",
    "planning_state: backlog", "planned_start_date: 2026-09-14", "planned_dates_status: provisional", "---", "", "# Invalid status use", "",
  ].join("\n"));
  assert.throws(() => loadRecords(root), /planned_dates_status requires a complete planned period/);
  fs.unlinkSync(incompleteStatus);

  const conflictingAlias = path.join(tasks, "task-202609-00074-conflicting-backlog-alias.md");
  writeRecord(tasks, path.basename(conflictingAlias), {
    type: "task", id: "task-202609-00074", status: "todo", planning_state: "backlog",
    created: "2026-09-01", planned_start_date: "2026-09-14", planned_date: "2026-09-13",
  }, "Conflicting Backlog aliases");
  assert.throws(() => loadRecords(root), /conflicting planned_start_date and legacy planned_date/);
  fs.unlinkSync(conflictingAlias);

  const incomplete = path.join(tasks, "task-202609-00072-incomplete-backlog.md");
  writeRecord(tasks, path.basename(incomplete), {
    type: "task", id: "task-202609-00072", status: "todo", planning_state: "backlog",
    created: "2026-09-01", planned_start_date: "2026-09-14",
  }, "Incomplete Backlog");
  const plan = buildDayPlan({ repoRoot: root, targetDate: "2026-09-14", generatedDate: "2026-09-14" });
  assert.equal(plan.records.backlogTasks.some((task) => task.frontMatter.id === "task-202609-00072"), true);
  assert.equal(plan.records.dateReviewTasks.some((task) => task.frontMatter.id === "task-202609-00072"), false);
  assert.match(plan.markdown, /参考開始 2026-09-14/);
});

test("backlog-to-planned classification changes the generated section without changing task dates", () => {
  const root = fixtureRoot();
  const tasks = path.join(root, "2026/202609/tasks");
  const filename = "task-202609-00073-move-backlog.md";
  const filePath = path.join(tasks, filename);
  const fields = {
    type: "task", id: "task-202609-00073", status: "todo", planning_state: "backlog",
    created: "2026-09-01", planned_start_date: "2026-09-14", planned_end_date: "2026-09-14",
    planned_dates_status: "provisional",
  };
  writeRecord(tasks, filename, fields, "Move from backlog");
  const before = fs.readFileSync(filePath, "utf8");
  const backlogPlan = buildDayPlan({ repoRoot: root, targetDate: "2026-09-14", generatedDate: "2026-09-14" });
  assert.equal(backlogPlan.records.backlogTasks.some((task) => task.frontMatter.id === fields.id), true);
  assert.equal(backlogPlan.records.dateReviewTasks.some((task) => task.frontMatter.id === fields.id), false);

  writeRecord(tasks, filename, { ...fields, planning_state: "planned" }, "Move from backlog");
  const plannedPlan = buildDayPlan({ repoRoot: root, targetDate: "2026-09-14", generatedDate: "2026-09-14" });
  assert.equal(plannedPlan.records.backlogTasks.some((task) => task.frontMatter.id === fields.id), false);
  assert.equal(plannedPlan.records.dateReviewTasks.some((task) => task.frontMatter.id === fields.id), true);
  assert.match(fs.readFileSync(filePath, "utf8"), /planned_start_date: 2026-09-14/);
  assert.match(fs.readFileSync(filePath, "utf8"), /planned_dates_status: provisional/);
  assert.notEqual(fs.readFileSync(filePath, "utf8"), before);

  writeRecord(tasks, filename, {
    ...fields, planning_state: "planned", planned_dates_status: "confirmed",
  }, "Move from backlog");
  const confirmedPlan = buildDayPlan({ repoRoot: root, targetDate: "2026-09-14", generatedDate: "2026-09-14" });
  assert.equal(confirmedPlan.records.todayTasks.some((task) => task.frontMatter.id === fields.id), true);
  assert.equal(confirmedPlan.records.dateReviewTasks.some((task) => task.frontMatter.id === fields.id), false);
});

test("record discovery reads canonical records across months and skips backups and attachments", () => {
  const { tasks, schedules } = loadRecords(fixtureRoot());
  assert.equal(tasks.length, 11);
  assert.equal(schedules.length, 3);
  assert.equal(tasks.some((task) => task.frontMatter.id === "task-202609-00099"), false);
  assert.equal(tasks.some((task) => task.frontMatter.id === "task-202512-00001"), true);
  assert.equal(tasks.some((task) => task.frontMatter.id === "task-202512-00002"), true);
  assert.equal(schedules.find((schedule) => schedule.frontMatter.status === "scheduled")?.frontMatter.status, "scheduled");
});

test("invalid schedule status and mismatched task month are rejected", () => {
  const root = fixtureRoot();
  const schedules = path.join(root, "2026/202609/schedules");
  writeRecord(schedules, "schedule-20260918-invalid.md", {
    type: "schedule", date: "2026-09-18", status: "postponed",
  }, "不正な状態");
  assert.throws(() => loadRecords(root), /schedule status must be scheduled or cancelled/);
  fs.unlinkSync(path.join(schedules, "schedule-20260918-invalid.md"));

  const wrongMonth = path.join(root, "2026/202608/tasks");
  fs.mkdirSync(wrongMonth, { recursive: true });
  writeRecord(wrongMonth, "task-202609-00010-wrong-month.md", {
    type: "task", id: "task-202609-00010", status: "todo", created: "2026-09-01",
  }, "月不一致");
  assert.throws(() => loadRecords(root), /task path, filename, and ID must agree/);
});

test("schedule status must be a scalar string", () => {
  const root = fixtureRoot();
  const schedules = path.join(root, "2026/202609/schedules");
  for (const [index, statusYaml] of ["[cancelled]", "{}", "null", "10", "true", '""'].entries()) {
    const filename = `schedule-202609${String(23 + index).padStart(2, "0")}-invalid-type.md`;
    fs.writeFileSync(path.join(schedules, filename), `---\ntype: schedule\ndate: 2026-09-${String(23 + index).padStart(2, "0")}\nstatus: ${statusYaml}\n---\n\n# Invalid status\n`);
    assert.throws(
      () => loadRecords(root),
      (error) => error.message.includes("schedule status must be scheduled or cancelled")
        && error.message.includes(filename),
    );
    fs.unlinkSync(path.join(schedules, filename));
  }
});

test("task created month must match its creation-month directory", () => {
  const root = fixtureRoot();
  const tasks = path.join(root, "2026/202610/tasks");
  fs.mkdirSync(tasks, { recursive: true });
  writeRecord(tasks, "task-202610-00001-wrong-created-month.md", {
    type: "task", id: "task-202610-00001", status: "todo", created: "2026-09-30",
  }, "created 月不一致");
  assert.throws(() => loadRecords(root), /task created month must agree with its directory and ID/);
  fs.unlinkSync(path.join(tasks, "task-202610-00001-wrong-created-month.md"));

  writeRecord(tasks, "task-202610-00002-invalid-created.md", {
    type: "task", id: "task-202610-00002", status: "todo", created: '"not-a-date"',
  }, "created 日付不正");
  assert.throws(() => loadRecords(root), /created must be YYYY-MM-DD/);
  fs.unlinkSync(path.join(tasks, "task-202610-00002-invalid-created.md"));

  writeRecord(tasks, "task-202610-00003-empty-created.md", {
    type: "task", id: "task-202610-00003", status: "todo", created: '""',
  }, "created 空値");
  assert.throws(() => loadRecords(root), /created must be YYYY-MM-DD/);
});

test("planned week is included when it overlaps the target window", () => {
  const plan = buildDayPlan({ repoRoot: fixtureRoot(), targetDate: "2026-09-18", generatedDate: "2026-09-14" });
  assert.equal(plan.records.plannedWeekTasks.length, 1);
  assert.match(plan.markdown, /9月21日週のタスク/);
});

test("provisional periods appear only in date review while confirmed periods keep their normal sections", () => {
  const root = fixtureRoot();
  const tasks = path.join(root, "2026/202609/tasks");
  for (const [sequence, slug, start, end, status] of [
    [20, "provisional-today", "2026-09-14", "2026-09-14", "provisional"],
    [21, "provisional-tomorrow", "2026-09-15", "2026-09-15", "provisional"],
    [22, "provisional-seven-days", "2026-09-21", "2026-09-21", "provisional"],
    [23, "confirmed", "2026-09-14", "2026-09-14", "confirmed"],
    [24, "provisional-done", "2026-09-14", "2026-09-14", "provisional"],
    [25, "provisional-cancelled", "2026-09-14", "2026-09-14", "provisional"],
  ]) {
    const state = slug.endsWith("-done") ? "done" : slug.endsWith("-cancelled") ? "cancelled" : "todo";
    writeRecord(tasks, `task-202609-${String(sequence).padStart(5, "0")}-${slug}.md`, {
      type: "task", id: `task-202609-${String(sequence).padStart(5, "0")}`, status: state,
      created: "2026-09-01", planned_start_date: start, planned_end_date: end,
      planned_dates_status: status, planned_action: '"作業する"',
      ...(slug === "provisional-today" ? { due_month: '"2026-10"', planned_week: "2026-09-14" } : {}),
    }, slug);
  }
  const plan = buildDayPlan({ repoRoot: root, targetDate: "2026-09-14", generatedDate: "2026-09-14" });
  const reviewIds = plan.records.dateReviewTasks
    .filter((task) => task.frontMatter.planned_dates_status === "provisional")
    .map((task) => task.frontMatter.id);
  assert.deepEqual(reviewIds, ["task-202609-00020", "task-202609-00021", "task-202609-00022"]);
  assert.equal(plan.records.todayTasks.some((task) => task.frontMatter.id === "task-202609-00023"), true);
  for (const section of [plan.records.todayTasks, plan.records.overdueTasks, plan.records.nearEndTasks, plan.records.upcomingStartTasks, plan.records.plannedWeekTasks]) {
    assert.equal(section.some((task) => [20, 21, 22].includes(Number(task.frontMatter.id.slice(-5)))), false);
  }
  assert.match(plan.markdown, /日程要確認：暫定期間 2026-09-14〜2026-09-14 \/ 期限月 2026-10 \/ 予定週 2026-09-14/);
  assert.doesNotMatch(plan.markdown, /provisional-done|provisional-cancelled/);
});

test("planned_dates_status must be a supported scalar with a complete non-weekly period", () => {
  const root = fixtureRoot();
  const tasks = path.join(root, "2026/202609/tasks");
  const badValues = ["[provisional]", "{}", "null", "10", "true", '""', '"pending"'];
  for (const [index, statusYaml] of badValues.entries()) {
    const sequence = String(30 + index).padStart(5, "0");
    const filename = `task-202609-${sequence}-invalid-status.md`;
    fs.writeFileSync(path.join(tasks, filename), `---\ntype: task\nid: task-202609-${sequence}\nstatus: todo\ncreated: 2026-09-01\nplanned_start_date: 2026-09-14\nplanned_end_date: 2026-09-14\nplanned_dates_status: ${statusYaml}\n---\n\n# Invalid status\n`);
    assert.throws(() => loadRecords(root), (error) => error.message.includes("planned_dates_status must be confirmed or provisional"));
    fs.unlinkSync(path.join(tasks, filename));
  }
  const incomplete = path.join(tasks, "task-202609-00040-incomplete-status.md");
  fs.writeFileSync(incomplete, "---\ntype: task\nid: task-202609-00040\nstatus: todo\ncreated: 2026-09-01\nplanned_start_date: 2026-09-14\nplanned_dates_status: provisional\n---\n\n# Incomplete\n");
  assert.throws(() => loadRecords(root), /planned_dates_status requires a complete planned period/);
  fs.unlinkSync(incomplete);

  const weekly = path.join(tasks, "task-202609-00041-weekly-status.md");
  fs.writeFileSync(weekly, "---\ntype: task\nid: task-202609-00041\nstatus: todo\ncreated: 2026-09-01\nrecurrence: weekly\nplanned_start_date: 2026-09-14\nplanned_end_date: 2026-09-14\nplanned_dates_status: provisional\n---\n\n# Weekly\n");
  assert.throws(() => loadRecords(root), /weekly recurrence must not use planned_dates_status/);
});

test("priority and date ordering are preserved in the dated task sections", () => {
  const root = fixtureRoot();
  const tasks = path.join(root, "2026/202609/tasks");
  writeRecord(tasks, "task-202609-00016-today-low.md", {
    type: "task", id: "task-202609-00016", status: "todo", priority: 9, created: "2026-09-01", planned_date: "2026-09-14", due: "2026-09-14",
  }, "今日の低優先度");
  writeRecord(tasks, "task-202609-00010-today-high.md", {
    type: "task", id: "task-202609-00010", status: "todo", priority: 1, created: "2026-09-01", planned_date: "2026-09-14", due: "2026-09-14",
  }, "今日の高優先度");
  writeRecord(tasks, "task-202609-00014-today-default.md", {
    type: "task", id: "task-202609-00014", status: "todo", priority: 5, created: "2026-09-01", planned_date: "2026-09-14", due: "2026-09-14",
  }, "今日の通常優先度");
  writeRecord(tasks, "task-202609-00011-future-low.md", {
    type: "task", id: "task-202609-00011", status: "todo", priority: 9, created: "2026-09-01", planned_date: "2026-09-16", due: "2026-09-16",
  }, "後日の低優先度");
  writeRecord(tasks, "task-202609-00012-future-high.md", {
    type: "task", id: "task-202609-00012", status: "todo", priority: 1, created: "2026-09-01", planned_date: "2026-09-16", due: "2026-09-16",
  }, "後日の高優先度");
  writeRecord(tasks, "task-202609-00013-future-earlier.md", {
    type: "task", id: "task-202609-00013", status: "todo", priority: 5, created: "2026-09-01", planned_date: "2026-09-15", due: "2026-09-15",
  }, "先の日付");

  const plan = buildDayPlan({ repoRoot: root, targetDate: "2026-09-14", generatedDate: "2026-09-14" });
  assert.deepEqual(plan.records.todayTasks.map((task) => task.frontMatter.id), [
    "task-202609-00010", "task-202609-00001", "task-202609-00014", "task-202609-00016",
  ]);
  assert.deepEqual(plan.records.upcomingStartTasks.map((task) => task.frontMatter.id), [
    "task-202609-00013", "task-202609-00012", "task-202609-00011",
  ]);
});

test("invalid task priority and schedule filename date are rejected", () => {
  const root = fixtureRoot();
  const tasks = path.join(root, "2026/202609/tasks");
  writeRecord(tasks, "task-202609-00015-invalid-priority.md", {
    type: "task", id: "task-202609-00015", status: "todo", priority: 10, created: "2026-09-01",
  }, "不正な優先度");
  assert.throws(() => loadRecords(root), /priority must be an integer from 1 to 9/);
  fs.unlinkSync(path.join(tasks, "task-202609-00015-invalid-priority.md"));

  const schedules = path.join(root, "2026/202609/schedules");
  writeRecord(schedules, "schedule-20260918-date-mismatch.md", {
    type: "schedule", date: "2026-09-19",
  }, "日付不一致");
  assert.throws(() => loadRecords(root), /schedule path, filename, and date must agree/);
});

test("day-plan output for a date is overwritten on regeneration", () => {
  const root = fixtureRoot();
  const destination = path.join(root, "2026/202609/day-plan/day-plan-20260914.md");
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, "手書きの内容\n");
  const plan = writeDayPlan({
    repoRoot: root, outputRoot: root, targetDate: "2026-09-14", generatedDate: "2026-09-14",
  });
  const output = fs.readFileSync(destination, "utf8");
  assert.equal(plan.outputPath, destination);
  assert.match(output, /今日のタスク/);
  assert.doesNotMatch(output, /手書きの内容/);
});

test("CLI uses the canonical default output and honors an output-root override without changing sources", () => {
  const root = fixtureRoot();
  writeRecord(path.join(root, "2026/202609/tasks"), "task-202609-00080-cli-backlog.md", {
    type: "task", id: "task-202609-00080", status: "todo", planning_state: "backlog", created: "2026-09-01",
  }, "CLI Backlog");
  const bundleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const scripts = path.join(root, "scripts");
  fs.mkdirSync(scripts, { recursive: true });
  for (const filename of ["day-plan.mjs", "generate-day-plan.mjs"]) {
    fs.copyFileSync(path.join(bundleRoot, "scripts", filename), path.join(scripts, filename));
  }
  fs.mkdirSync(path.join(root, "node_modules"), { recursive: true });
  fs.cpSync(path.join(bundleRoot, "node_modules", "yaml"), path.join(root, "node_modules", "yaml"), { recursive: true });

  function sourceSnapshot() {
    const { tasks, schedules } = loadRecords(root);
    return new Map([...tasks, ...schedules].map((record) => [
      record.relativePath,
      fs.readFileSync(record.filePath, "utf8"),
    ]));
  }

  function runGenerator(args) {
    return spawnSync(process.execPath, [path.join(scripts, "generate-day-plan.mjs"), "--date", "2026-09-14", ...args], {
      cwd: root,
      encoding: "utf8",
    });
  }

  const before = sourceSnapshot();
  const defaultRun = runGenerator([]);
  assert.equal(defaultRun.status, 0, defaultRun.stderr);
  const canonicalPlan = path.join(fs.realpathSync(root), "2026/202609/day-plan/day-plan-20260914.md");
  assert.equal(defaultRun.stdout.trim(), `Generated ${canonicalPlan}`);
  assert.match(fs.readFileSync(canonicalPlan, "utf8"), /期限超過/);
  assert.match(fs.readFileSync(canonicalPlan, "utf8"), /## Backlog/);
  assert.match(fs.readFileSync(canonicalPlan, "utf8"), /CLI Backlog/);

  const stagedRoot = path.join(root, "workplace/generated");
  const canonicalBeforeStaging = fs.readFileSync(canonicalPlan, "utf8");
  const stagedRun = runGenerator(["--output-root", stagedRoot]);
  assert.equal(stagedRun.status, 0, stagedRun.stderr);
  const stagedPlan = path.join(stagedRoot, "2026/202609/day-plan/day-plan-20260914.md");
  assert.equal(stagedRun.stdout.trim(), `Generated ${stagedPlan}`);
  const stagedMarkdown = fs.readFileSync(stagedPlan, "utf8");
  assert.match(stagedMarkdown, /期限超過/);
  assert.match(stagedMarkdown, /\]\(\.\.\/tasks\/task-202609-00006/);
  assert.equal(fs.readFileSync(canonicalPlan, "utf8"), canonicalBeforeStaging);
  assert.deepEqual(sourceSnapshot(), before);
});

test("day-plan links are relative to the canonical day-plan directory", () => {
  assert.equal(
    relativeLinkFromDayPlan("2026-09-14", "2026/202609/tasks/task-202609-00001-today.md"),
    "../tasks/task-202609-00001-today.md",
  );
  assert.equal(
    relativeLinkFromDayPlan("2026-09-14", "2026/202610/schedules/schedule-20261003-concert.md"),
    "../../202610/schedules/schedule-20261003-concert.md",
  );
});
