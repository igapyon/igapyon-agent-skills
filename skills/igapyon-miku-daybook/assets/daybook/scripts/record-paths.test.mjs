import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  activityPath,
  assertUniqueRecordPaths,
  dayPlanPath,
  listCanonicalRecordFiles,
  parseRecordPath,
  resolveRecordPath,
  schedulePath,
  taskPath,
  todoPath,
  validateIsoDate,
} from "./record-paths.mjs";

function makeRoot(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "daybook-record-paths-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function write(root, relativePath) {
  const filePath = path.join(root, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "fixture\n");
}

test("canonical path generators create the new type-first hierarchy", () => {
  assert.equal(activityPath("2026-11-17", "aaa"), "activities/2026/202611/20261117/activity-20261117aaa.md");
  assert.equal(taskPath("2026-11-17", "task-202611-00001", "example"), "tasks/2026/202611/20261117/task-202611-00001-example.md");
  assert.equal(todoPath("2026-11-17", "todo-202611-00002", "example"), "todos/2026/202611/20261117/todo-202611-00002-example.md");
  assert.equal(schedulePath("2026-11-17", "schedule-20261117-example.md"), "schedules/2026/202611/schedule-20261117-example.md");
  assert.equal(dayPlanPath("2026-11-17"), "day-plans/2026/202611/day-plan-20261117.md");
  assert.throws(() => validateIsoDate("2026-02-30"), /not a valid date/);
  assert.throws(() => activityPath("2026-11-17", "zz"), /at least three/);
  assert.throws(() => taskPath("2026-11-17", "task-202610-00001", "example"), /ID month/);
  assert.throws(() => todoPath("2026-11-17", "todo-202610-00001", "example"), /ID month/);
  assert.throws(() => taskPath("2026-11-17", "task-202611-00000", "example"), /canonical task ID/);
  assert.throws(() => todoPath("2026-11-17", "todo-202611-00000", "example"), /canonical todo ID/);
});

test("path parser accepts legacy and current layouts, including migrated task ID month mismatch", () => {
  const activity = parseRecordPath("activities/2026/202611/20261117/activity-20261117aaa.md");
  assert.equal(activity.type, "activity");
  assert.equal(activity.layout, "current");
  assert.equal(activity.date, "2026-11-17");

  const legacyTask = parseRecordPath("2026/202610/tasks/task-202610-00014-legacy.md");
  assert.equal(legacyTask.type, "task");
  assert.equal(legacyTask.layout, "legacy");
  assert.equal(legacyTask.id, "task-202610-00014");

  const migratedTask = parseRecordPath("tasks/2026/202611/20261117/task-202610-00014-migrated.md");
  assert.equal(migratedTask.type, "task");
  assert.equal(migratedTask.date, "2026-11-17");
  assert.equal(migratedTask.idMonth, "202610");

  const legacyPlan = parseRecordPath("2026/202611/day-plan/day-plan-20261117.md");
  assert.equal(legacyPlan.type, "day-plan");
  assert.equal(legacyPlan.date, "2026-11-17");
  assert.throws(() => parseRecordPath("tasks/2026/202611/20261117/task-202610-00014-bad.md/../x"), /normalized/);
  assert.throws(() => parseRecordPath("2026/202611/tasks/task-202610-00014-bad.md"), /ID month/);
  assert.throws(() => parseRecordPath("tasks/2026/202611/20261117/task-202600-00000-bad.md"), /year\/month|sequence must be positive/);
  assert.throws(() => parseRecordPath("activities/2026/202611/20261117/activity-20261118aaa.md"), /agree/);
});

test("canonical record discovery walks only the current and legacy directories and reports duplicate IDs", (t) => {
  const root = makeRoot(t);
  write(root, "activities/2026/202611/20261117/activity-20261117aaa.md");
  write(root, "2026/202611/activities/activity-20261117aab.md");
  write(root, "tasks/2026/202611/20261117/task-202610-00014-migrated.md");
  write(root, "2026/202610/tasks/task-202610-00015-legacy.md");
  write(root, "schedules/2026/202611/schedule-20261117-new.md");
  write(root, "2026/202611/schedules/schedule-20261118-legacy.md");
  write(root, "day-plans/2026/202611/day-plan-20261117.md");
  write(root, "2026/202610/day-plan/day-plan-20261005.md");
  write(root, "workplace/backup/tasks/2026/202611/20261117/task-202610-00099-copy.md");
  write(root, "attachments/2026/202611/task-202610-00014/result.md");

  const found = listCanonicalRecordFiles(root, ["activity", "task", "schedule", "day-plan"]);
  assert.deepEqual(found.map((record) => record.relativePath), [
    "2026/202610/tasks/task-202610-00015-legacy.md",
    "2026/202611/activities/activity-20261117aab.md",
    "2026/202611/schedules/schedule-20261118-legacy.md",
    "2026/202610/day-plan/day-plan-20261005.md",
    "day-plans/2026/202611/day-plan-20261117.md",
    "activities/2026/202611/20261117/activity-20261117aaa.md",
    "schedules/2026/202611/schedule-20261117-new.md",
    "tasks/2026/202611/20261117/task-202610-00014-migrated.md",
  ].sort((left, right) => left.localeCompare(right)));
  assert.doesNotThrow(() => assertUniqueRecordPaths(found));

  write(root, "2026/202610/tasks/task-202610-00014-duplicate.md");
  const withDuplicate = listCanonicalRecordFiles(root, ["task"]);
  assert.throws(() => assertUniqueRecordPaths(withDuplicate), { code: "DUPLICATE_RECORD" });
});

test("direct record path resolution refuses symbolic-link parents", (t) => {
  const root = makeRoot(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "daybook-record-outside-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.symlinkSync(outside, path.join(root, "tasks"));
  assert.throws(() => resolveRecordPath(root, "tasks/2026/202611/20261117/task-202611-00001-example.md", { createParents: true }), {
    code: "PATH_OUTSIDE_REPO",
  });
});

test("canonical discovery refuses a symbolic-link type root without following it", (t) => {
  const root = makeRoot(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "daybook-record-symlink-outside-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.symlinkSync(outside, path.join(root, "activities"));
  assert.throws(() => listCanonicalRecordFiles(root, ["activity"]), { code: "PATH_OUTSIDE_REPO" });
});
