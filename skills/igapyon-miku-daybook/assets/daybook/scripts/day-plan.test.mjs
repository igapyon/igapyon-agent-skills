import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildDayPlan, relativeLinkFromDayPlan } from "./day-plan.mjs";

function fixtureRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "daybook-test-"));
  const tasks = path.join(root, "2026/202609/tasks");
  const schedules = path.join(root, "2026/202609/schedules");
  fs.mkdirSync(tasks, { recursive: true });
  fs.mkdirSync(schedules, { recursive: true });
  fs.writeFileSync(path.join(tasks, "task-202609-00001-today.md"), `---
type: task
id: task-202609-00001
status: todo
created: 2026-09-01
planned_date: 2026-09-14
planned_action: "今日の初動を行う"
due: 2026-09-18
---

# 今日のタスク
`);
  fs.writeFileSync(path.join(tasks, "task-202609-00002-week.md"), `---
type: task
id: task-202609-00002
status: in_progress
created: 2026-09-01
planned_week: 2026-09-21
---

# 9月21日週のタスク
`);
  fs.writeFileSync(path.join(tasks, "task-202609-00003-done.md"), `---
type: task
id: task-202609-00003
status: done
created: 2026-09-01
planned_date: 2026-09-14
due: 2026-09-15
---

# 完了済みタスク
`);
  fs.writeFileSync(path.join(tasks, "task-202609-00004-too-late.md"), `---
type: task
id: task-202609-00004
status: todo
created: 2026-09-01
due: 2026-09-21
---

# 7日目以降の期限
`);
  fs.writeFileSync(path.join(schedules, "schedule-20260917-meeting.md"), `---
type: schedule
date: 2026-09-17
start: 19:00
end: 21:00
---

# 近い予定
`);
  fs.writeFileSync(path.join(schedules, "schedule-20260922-too-late.md"), `---
type: schedule
date: 2026-09-22
---

# 対象外の予定
`);
  return root;
}

test("buildDayPlan selects today's work and the inclusive six-day window", () => {
  const root = fixtureRoot();
  const plan = buildDayPlan({ repoRoot: root, targetDate: "2026-09-14", generatedDate: "2026-09-14" });
  assert.equal(plan.records.todayTasks.length, 1);
  assert.equal(plan.records.dueTasks.length, 1);
  assert.equal(plan.records.nearSchedules.length, 1);
  assert.equal(plan.records.plannedWeekTasks.length, 0);
  assert.match(plan.markdown, /今日のタスク/);
  assert.match(plan.markdown, /2026-09-17/);
  assert.doesNotMatch(plan.markdown, /7日目以降の期限/);
  assert.doesNotMatch(plan.markdown, /完了済みタスク/);
  assert.doesNotMatch(plan.markdown, /対象外の予定/);
});

test("planned week is included when it overlaps the target window", () => {
  const root = fixtureRoot();
  const plan = buildDayPlan({ repoRoot: root, targetDate: "2026-09-18", generatedDate: "2026-09-14" });
  assert.equal(plan.records.plannedWeekTasks.length, 1);
  assert.match(plan.markdown, /9月21日週のタスク/);
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
