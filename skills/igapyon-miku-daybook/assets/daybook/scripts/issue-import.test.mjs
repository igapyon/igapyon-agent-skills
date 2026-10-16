import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  IssueImportError,
  applyIssueImport,
  deriveTaskDates,
  detectIssueCapabilities,
  hashIssueSource,
  isImportReceipt,
  nextTaskSequence,
  normalizeIssueHelperPayload,
  prepareIssueImport,
  recordIssueCloseResult,
  recordIssueCommentResult,
  validateImportManifest,
  validateIssueSource,
} from "./issue-import.mjs";

const REPO = "acme/daybook";
const IMPORT_DATE = "2026-10-06";

function issue(number, overrides = {}) {
  return {
    number,
    url: `https://github.com/${REPO}/issues/${number}`,
    title: `Issue ${number}`,
    body: "Issue body",
    state: "open",
    is_pull_request: false,
    created_at: null,
    updated_at: "2026-10-05T12:00:00Z",
    comments_scope: "helper-returned",
    comments: [],
    ...overrides,
  };
}

function source(issues = [issue(42)], overrides = {}) {
  return {
    schema_version: 1,
    repo: REPO,
    import_date: IMPORT_DATE,
    receipt_author_logins: ["daybook-bot", "Maintainer"],
    excluded_issue_numbers: [3],
    issues,
    ...overrides,
  };
}

function taskRecord(key = "pay-fee", overrides = {}) {
  return {
    key,
    type: "task",
    action: "create",
    title: "参加費を支払う",
    content: "案内を確認して参加費を支払う。",
    checklist: ["金額を確認する", "支払う"],
    ...overrides,
  };
}

function scheduleRecord(key = "concert", overrides = {}) {
  return {
    key,
    type: "schedule",
    action: "create",
    title: "コンサート",
    content: "ホールで演奏会を聴く。",
    date: "2026-10-08",
    date_evidence: { issue_body: "10月8日の公演" },
    start: "19:00",
    ...overrides,
  };
}

function activityRecord(key = "played-violin", overrides = {}) {
  return {
    key,
    type: "activity",
    action: "create",
    title: "合奏に参加した",
    content: "午後、合奏に参加してバイオリンを弾いた。",
    date: "2026-10-05",
    date_evidence: { issue_body: "昨日の活動" },
    ...overrides,
  };
}

function manifest(issues = [{ number: 42, decision: "import", records: [taskRecord(), scheduleRecord(), activityRecord()] }]) {
  return { schema_version: 1, issues };
}

function makeRoot(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "daybook-issue-import-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return fs.realpathSync(root);
}

function prepare(root, input = source(), decisions = manifest(), dependencies = { gitLog: () => "" }) {
  return prepareIssueImport({ repoRoot: root, source: input, manifest: decisions, dependencies });
}

function createCommentResult(issueNumber, issueUrl) {
  return {
    id: String(issueNumber + 100),
    url: `${issueUrl}#issuecomment-${issueNumber + 100}`,
    author_login: "Maintainer",
    created_at: null,
    updated_at: null,
    body: "Thanks",
  };
}

test("source normalization follows miku-scm raw and runner-wrapped helper payloads", () => {
  const raw = {
    mode: "issue",
    repository: REPO,
    issue: {
      number: 42,
      state: "OPEN",
      title: "Fee",
      body: null,
      html_url: `https://github.com/${REPO}/issues/42`,
      updated_at: "2026-10-05T12:00:00Z",
      labels: [],
      comments: [{
        url: `https://github.com/${REPO}/issues/42#issuecomment-12345678901234567890`,
        author: { login: "Maintainer" },
        body: "Question",
      }],
    },
  };
  const normalized = normalizeIssueHelperPayload(raw, { repo: REPO, number: 42, importDate: IMPORT_DATE, receiptAuthorLogins: ["Maintainer"] });
  assert.equal(normalized.issues[0].body, "");
  assert.equal(normalized.issues[0].created_at, null);
  assert.equal(normalized.issues[0].comments[0].id, "12345678901234567890");
  assert.equal(normalized.issues[0].comments[0].author_login, "Maintainer");
  assert.equal(normalized.issues[0].comments[0].created_at, null);
  assert.equal(normalized.issues[0].comments_scope, "helper-returned");
  const wrapped = normalizeIssueHelperPayload({
    status: "success",
    workflow_contract: "github.issue.read",
    snapshot: { delegate_result: raw },
  }, { repo: REPO, number: 42, importDate: IMPORT_DATE });
  assert.deepEqual(wrapped.issues, normalized.issues);
  const emptyComments = normalizeIssueHelperPayload({ ...raw, issue: { ...raw.issue, comments: [] } }, {
    repo: REPO, number: 42, importDate: IMPORT_DATE,
  });
  assert.deepEqual(emptyComments.issues[0].comments, []);
  assert.throws(() => normalizeIssueHelperPayload({ ...raw, issue: { ...raw.issue, comments: undefined } }, {
    repo: REPO, number: 42, importDate: IMPORT_DATE,
  }), { code: "INVALID_SOURCE" });
  assert.throws(() => normalizeIssueHelperPayload({ status: "not-applied", error: { code: "READONLY_FAILED" } }, {
    repo: REPO, number: 42, importDate: IMPORT_DATE,
  }), { code: "INVALID_SOURCE" });
  const missingUpdatedAt = { ...raw, issue: { ...raw.issue } };
  delete missingUpdatedAt.issue.updated_at;
  assert.throws(() => normalizeIssueHelperPayload(missingUpdatedAt, {
    repo: REPO, number: 42, importDate: IMPORT_DATE,
  }), { code: "INVALID_SOURCE" });
});

test("source rejects Pull Requests, mismatched Issue identity, and missing updated_at", () => {
  assert.throws(() => validateIssueSource(source([issue(42, { url: `https://github.com/${REPO}/pull/42` })])), { code: "PULL_REQUEST_SOURCE" });
  assert.throws(() => validateIssueSource(source([issue(42, { url: `https://github.com/${REPO}/issues/43` })])), { code: "INVALID_SOURCE" });
  assert.throws(() => validateIssueSource(source([issue(42, { updated_at: null })])), { code: "INVALID_SOURCE" });
  assert.throws(() => validateIssueSource(source([issue(42, { comments_scope: "all", comments: [] })])), { code: "INVALID_SOURCE" });
});

test("task dates distinguish explicit periods from each provisional fallback", () => {
  assert.deepEqual(deriveTaskDates(taskRecord(), IMPORT_DATE), {
    start: IMPORT_DATE, end: IMPORT_DATE, status: "provisional",
    reasons: [`作業予定期間が未指定のため、開始・終了を取り込み日の${IMPORT_DATE}に暫定設定した`],
  });
  assert.equal(deriveTaskDates(taskRecord("one-side", { planned_start_date: "2026-10-20" }), IMPORT_DATE).end, "2026-10-20");
  assert.equal(deriveTaskDates(taskRecord("end-only", { planned_end_date: "2026-10-01" }), IMPORT_DATE).start, "2026-10-01");
  assert.deepEqual(deriveTaskDates(taskRecord("confirmed", { planned_start_date: "2026-10-10", planned_end_date: "2026-10-12" }), IMPORT_DATE), {
    start: "2026-10-10", end: "2026-10-12", status: "confirmed", reasons: [],
  });
  assert.throws(() => deriveTaskDates(taskRecord("reversed", { planned_start_date: "2026-10-12", planned_end_date: "2026-10-10" }), IMPORT_DATE), { code: "INVALID_DATE_RANGE" });
});

test("manifest requires evidence for explicit task, schedule, and activity dates", () => {
  const input = source();
  assert.throws(() => validateImportManifest(manifest([{
    number: 42, decision: "import", records: [taskRecord("evidence", { planned_start_date: "2026-10-10" })],
  }]), input), { code: "INVALID_MANIFEST" });
  assert.throws(() => validateImportManifest(manifest([{
    number: 42, decision: "import", records: [scheduleRecord("bad", { date_evidence: {} })],
  }]), input), { code: "INVALID_MANIFEST" });
  assert.throws(() => validateImportManifest(manifest([{
    number: 42, decision: "import", records: [activityRecord("bad", { date_evidence: {} })],
  }]), input), { code: "INVALID_MANIFEST" });
  assert.throws(() => validateImportManifest(manifest([{
    number: 42, decision: "import", records: [taskRecord("marker", { content: "<!-- daybook-issue-import:v1:fake -->" })],
  }]), input), { code: "INVALID_MANIFEST" });
});

test("verified import receipt needs the configured author and valid record data", () => {
  const body = [
    `<!-- daybook-issue-import:v1:${REPO}:42 -->`,
    `<!-- daybook-issue-import-data:v1 ${JSON.stringify({ import_id: "a".repeat(64), records: [{ key: "pay-fee", id: "task-202610-00001", path: "2026/202610/tasks/task-202610-00001-pay-fee.md" }] })} -->`,
  ].join("\n");
  const verified = { ...createCommentResult(42, `https://github.com/${REPO}/issues/42`), body, author_login: "Maintainer" };
  assert.equal(isImportReceipt(verified, REPO, 42, ["maintainer"]).verified, true);
  assert.equal(isImportReceipt({ ...verified, author_login: null }, REPO, 42, ["maintainer"]).code, "UNVERIFIED_RECEIPT");
  assert.equal(isImportReceipt({ ...verified, body: body.replace("pay-fee", "../escape") }, REPO, 42, ["maintainer"]).code, "UNVERIFIED_RECEIPT");
  const normalizedIssue = validateIssueSource(source([issue(42, { comments: [verified] })])).issues[0];
  const originalHash = hashIssueSource(issue(42), { repo: REPO, receipt_author_logins: ["maintainer"] });
  assert.equal(hashIssueSource(normalizedIssue, { repo: REPO, receipt_author_logins: ["maintainer"] }), originalHash);
});

test("prepare generates all three canonical record types and a stable preview without writing records", (t) => {
  const root = makeRoot(t);
  const tasks = path.join(root, "2026/202610/tasks");
  fs.mkdirSync(tasks, { recursive: true });
  fs.writeFileSync(path.join(tasks, "task-202610-00002-old.md"), "---\ntype: task\nid: task-202610-00002\nstatus: done\n---\n\n# Old\n");
  const result = prepare(root, source(), manifest(), { gitLog: () => "2026/202610/tasks/task-202610-00005-deleted.md\n" });
  const { plan, preview } = result;
  assert.match(plan.plan_id, /^[a-f0-9]{64}$/);
  assert.equal(plan.writes.length, 3);
  const task = plan.writes.find((write) => write.path.includes("/tasks/"));
  const schedule = plan.writes.find((write) => write.path.includes("/schedules/"));
  const activity = plan.writes.find((write) => write.path.includes("/activities/"));
  assert.match(task.path, /task-202610-00006-pay-fee\.md$/);
  assert.match(task.content, /planned_dates_status: provisional/);
  assert.match(task.content, /日程要確認/);
  assert.match(schedule.path, /schedule-20261008-issue-42-concert\.md$/);
  assert.match(activity.content, /daybook-issue-record:v1/);
  assert.deepEqual(activity.issue_numbers, [42]);
  assert.match(plan.issues[0].comment_body, /ローカル反映です/);
  assert.match(plan.issues[0].comment_body, /取り込み受付完了としてclose/);
  assert.match(preview, /投稿予定コメント/);
  assert.match(preview, /helper-returned/);
  assert.equal(fs.existsSync(path.join(root, task.path)), false);
});

test("shared same-day activities are combined into one write with sorted Issue numbers", (t) => {
  const root = makeRoot(t);
  const input = source([issue(43), issue(42)]);
  const decisions = manifest([
    { number: 43, decision: "import", records: [activityRecord("activity-43")] },
    { number: 42, decision: "import", records: [activityRecord("activity-42", { title: "準備をした" })] },
  ]);
  const { plan } = prepare(root, input, decisions);
  assert.equal(plan.writes.length, 1);
  assert.deepEqual(plan.writes[0].issue_numbers, [42, 43]);
  assert.match(plan.writes[0].content, /Issue #42/);
  assert.match(plan.writes[0].content, /Issue #43/);
  assert.equal(plan.issues[0].number, 42);
});

test("receipt, excluded, needs-info, duplicate, and remote-only outcomes avoid unsafe recreation", (t) => {
  const root = makeRoot(t);
  const sourceIssues = [issue(3), issue(42)];
  const choices = manifest([
    { number: 3, decision: "import", records: [taskRecord("system")] },
    { number: 42, decision: "needs-info", questions: ["いつ実施しますか"] },
  ]);
  const skipped = prepare(root, source(sourceIssues), choices).plan;
  assert.deepEqual(skipped.issues.map((entry) => entry.outcome), ["excluded", "needs-info"]);
  assert.equal(skipped.writes.length, 0);

  const receiptBody = `<!-- daybook-issue-import:v1:${REPO}:42 -->\n<!-- daybook-issue-import-data:v1 ${JSON.stringify({ import_id: "b".repeat(64), records: [{ key: "pay-fee", id: "task-202610-00001", path: "2026/202610/tasks/task-202610-00001-pay-fee.md" }] })} -->`;
  const receiptIssue = issue(42, { comments: [{ ...createCommentResult(42, `https://github.com/${REPO}/issues/42`), author_login: "Maintainer", body: receiptBody }] });
  const remote = prepare(root, source([receiptIssue]), manifest([{ number: 42, decision: "import", records: [taskRecord()] }])).plan;
  assert.equal(remote.issues[0].outcome, "remote-only-import");
  const unverified = issue(42, { comments: [{ ...createCommentResult(42, `https://github.com/${REPO}/issues/42`), author_login: "stranger", body: receiptBody }] });
  const needsInfo = prepare(root, source([unverified]), manifest([{ number: 42, decision: "import", records: [taskRecord()] }])).plan;
  assert.equal(needsInfo.issues[0].outcome, "needs-info");
  assert.equal(needsInfo.issues[0].code, "UNVERIFIED_RECEIPT");
});

test("a second import finds canonical local provenance and reports already-imported", (t) => {
  const root = makeRoot(t);
  const first = prepare(root).plan;
  for (const write of first.writes) {
    const target = path.join(root, ...write.path.split("/"));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, write.content);
  }
  const repeated = prepare(root).plan;
  assert.equal(repeated.issues[0].outcome, "already-imported");
  assert.equal(repeated.writes.length, 0);
  assert.equal(repeated.issues[0].records.length, 3);
});

test("existing task can be linked without changing its content or completion state", (t) => {
  const root = makeRoot(t);
  const relative = "2026/202610/tasks/task-202610-00010-existing.md";
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const original = "---\ntype: task\nid: task-202610-00010\nstatus: done\npriority: 2\nplanned_start_date: 2026-10-02\nplanned_end_date: 2026-10-03\n---\n\n# Existing work\n\nUser text\n";
  fs.writeFileSync(target, original);
  const { plan } = prepare(root, source(), manifest([{
    number: 42, decision: "import", records: [{ key: "existing", type: "task", action: "link-existing", title: "Existing work", target_path: relative }],
  }]));
  assert.equal(plan.writes.length, 1);
  assert.match(plan.writes[0].content, /source_issue_import_id:/);
  assert.match(plan.writes[0].content, /status: done/);
  assert.match(plan.writes[0].content, /User text/);
  assert.match(plan.writes[0].content, /既存記録へ関連付けた/);
  assert.equal(fs.readFileSync(target, "utf8"), original);
});

test("apply, comment-result, and close-result retain the local todo state and complete in order", async (t) => {
  const root = makeRoot(t);
  const { plan } = prepare(root);
  const runDirectory = path.join(root, "workplace/issue-import/run-1");
  fs.mkdirSync(runDirectory, { recursive: true });
  fs.writeFileSync(path.join(runDirectory, "plan.json"), `${JSON.stringify(plan, null, 2)}\n`);
  const resultPath = path.join(runDirectory, "result.json");
  const result = await applyIssueImport({ repoRoot: root, plan, refreshSource: source(), resultPath });
  assert.equal(result.status, "local-written");
  assert.equal(result.issues[0].local_status, "local-written");
  assert.equal(result.issues[0].comment.status, "pending");
  assert.equal(fs.existsSync(path.join(runDirectory, "comment-42.md")), true);
  const taskPath = path.join(root, ...plan.writes.find((write) => write.path.includes("/tasks/")).path.split("/"));
  assert.match(fs.readFileSync(taskPath, "utf8"), /status: todo/);
  await assert.rejects(recordIssueCloseResult({ repoRoot: root, resultPath, issueNumber: 42, status: "pending" }), { code: "INVALID_RESULT_TRANSITION" });
  await recordIssueCommentResult({ repoRoot: root, resultPath, issueNumber: 42, status: "sending", handoffId: "comment-handoff" });
  const postedUrl = `https://github.com/${REPO}/issues/42#issuecomment-142`;
  await recordIssueCommentResult({ repoRoot: root, resultPath, issueNumber: 42, status: "posted", url: postedUrl, handoffId: "comment-handoff", attemptPath: "workplace/miku-scm/attempt.json" });
  await recordIssueCloseResult({ repoRoot: root, resultPath, issueNumber: 42, status: "pending" });
  await recordIssueCloseResult({ repoRoot: root, resultPath, issueNumber: 42, status: "closing", handoffId: "close-handoff" });
  const complete = await recordIssueCloseResult({ repoRoot: root, resultPath, issueNumber: 42, status: "closed", url: `https://github.com/${REPO}/issues/42`, handoffId: "close-handoff" });
  assert.equal(complete.status, "complete");
  assert.equal(complete.issues[0].comment.status, "posted");
  assert.equal(complete.issues[0].close.status, "closed");
  assert.match(fs.readFileSync(taskPath, "utf8"), /status: todo/);
  await assert.rejects(recordIssueCommentResult({ repoRoot: root, resultPath, issueNumber: 42, status: "pending" }), { code: "INVALID_RESULT_TRANSITION" });
});

test("apply resumes a partial write without replacing completed records", async (t) => {
  const root = makeRoot(t);
  const { plan } = prepare(root, source(), manifest([{ number: 42, decision: "import", records: [taskRecord(), scheduleRecord()] }]));
  const runDirectory = path.join(root, "workplace/issue-import/run-partial");
  fs.mkdirSync(runDirectory, { recursive: true });
  fs.writeFileSync(path.join(runDirectory, "plan.json"), `${JSON.stringify(plan, null, 2)}\n`);
  const resultPath = path.join(runDirectory, "result.json");
  let writes = 0;
  await assert.rejects(applyIssueImport({
    repoRoot: root, plan, refreshSource: source(), resultPath,
    dependencies: { beforeWrite: () => { writes += 1; if (writes === 2) throw new Error("disk full fixture"); } },
  }), { code: "PARTIAL_WRITE" });
  const partial = JSON.parse(fs.readFileSync(resultPath, "utf8"));
  assert.equal(partial.status, "partial");
  assert.equal(partial.writes.filter((write) => write.status === "written").length, 1);
  const firstContent = fs.readFileSync(path.join(root, ...partial.writes[0].path.split("/")), "utf8");
  const resumed = await applyIssueImport({ repoRoot: root, plan, refreshSource: source(), resultPath });
  assert.equal(resumed.status, "local-written");
  assert.equal(resumed.writes.every((write) => write.status === "written"), true);
  assert.equal(fs.readFileSync(path.join(root, ...partial.writes[0].path.split("/")), "utf8"), firstContent);
});

test("a lost result recovered from written source markers leaves comment uncertain", async (t) => {
  const root = makeRoot(t);
  const { plan } = prepare(root, source(), manifest([{ number: 42, decision: "import", records: [taskRecord()] }]));
  const runDirectory = path.join(root, "workplace/issue-import/run-lost-result");
  fs.mkdirSync(runDirectory, { recursive: true });
  fs.writeFileSync(path.join(runDirectory, "plan.json"), `${JSON.stringify(plan, null, 2)}\n`);
  const write = plan.writes[0];
  const target = path.join(root, ...write.path.split("/"));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, write.content);
  const recovered = await applyIssueImport({ repoRoot: root, plan, resultPath: path.join(runDirectory, "result.json") });
  assert.equal(recovered.status, "local-written");
  assert.equal(recovered.writes[0].status, "written");
  assert.equal(recovered.issues[0].comment.status, "uncertain");
  assert.equal(recovered.issues[0].close.status, "blocked");
});

test("source changes, edits, bad paths, and lock collisions stop before unsafe writes", async (t) => {
  const root = makeRoot(t);
  const { plan } = prepare(root, source(), manifest([{ number: 42, decision: "import", records: [taskRecord()] }]));
  const runDirectory = path.join(root, "workplace/issue-import/run-conflict");
  fs.mkdirSync(runDirectory, { recursive: true });
  const resultPath = path.join(runDirectory, "result.json");
  const changed = source([issue(42, { title: "Changed title" })]);
  await assert.rejects(applyIssueImport({ repoRoot: root, plan, refreshSource: changed, resultPath }), { code: "SOURCE_CHANGED" });
  assert.equal(fs.existsSync(resultPath), true);
  const write = plan.writes[0];
  const target = path.join(root, ...write.path.split("/"));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, "manual edit\n");
  await assert.rejects(applyIssueImport({ repoRoot: root, plan, refreshSource: source(), resultPath }), { code: "LOCAL_CONFLICT" });
  const bad = { ...plan, plan_id: "0".repeat(64), writes: [{ ...plan.writes[0], path: "../escape.md" }] };
  await assert.rejects(applyIssueImport({ repoRoot: root, plan: bad, resultPath }), { code: "PLAN_CHANGED" });
  const lockPath = path.join(root, "workplace/issue-import.lock");
  fs.writeFileSync(lockPath, "{}\n");
  await assert.rejects(applyIssueImport({ repoRoot: root, plan, refreshSource: source(), resultPath }), { code: "BUSY" });
});

test("task sequencing considers working files, deleted Git history, and ID exhaustion", (t) => {
  const root = makeRoot(t);
  const tasks = path.join(root, "2026/202610/tasks");
  fs.mkdirSync(tasks, { recursive: true });
  fs.writeFileSync(path.join(tasks, "task-202610-00004-working.md"), "working\n");
  assert.equal(nextTaskSequence(root, "202610", { gitLog: () => "2026/202610/tasks/task-202610-00009-deleted.md\n" }), 10);
  assert.throws(() => nextTaskSequence(root, "202610", { gitLog: () => "task-202610-99999-removed.md" }), { code: "ID_EXHAUSTED" });
  assert.throws(() => nextTaskSequence(root, "202610", { gitLog: () => { throw new Error("unavailable"); } }), { code: "ID_HISTORY_UNAVAILABLE" });
});

test("task sequencing reads deleted names from a temporary Git repository", (t) => {
  const root = makeRoot(t);
  const relative = "2026/202610/tasks/task-202610-00007-deleted.md";
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, "historical task\n");
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: "Issue Import Test",
    GIT_AUTHOR_EMAIL: "issue-import-test@example.invalid",
    GIT_COMMITTER_NAME: "Issue Import Test",
    GIT_COMMITTER_EMAIL: "issue-import-test@example.invalid",
  };
  const git = (args) => {
    const result = spawnSync("git", args, { cwd: root, env, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  };
  git(["init", "-q"]);
  git(["add", relative]);
  git(["commit", "-qm", "add historical task"]);
  git(["rm", "-q", relative]);
  git(["commit", "-qm", "remove historical task"]);
  assert.equal(fs.existsSync(target), false);
  assert.equal(nextTaskSequence(root, "202610"), 8);
});

test("capabilities only check PATH entries and report gh unavailable without failing daybook", () => {
  const missing = detectIssueCapabilities({ env: { PATH: "/empty" }, platform: "linux" }, { isExecutable: () => false });
  assert.equal(missing.reason, "GH_NOT_FOUND");
  assert.equal(missing.issue_reception, "disabled");
  assert.equal(missing.issue_comment_posting, "disabled");
  assert.equal(missing.issue_closure, "disabled");
  const available = detectIssueCapabilities({ env: { PATH: "/fake:/other" }, platform: "linux" }, {
    isExecutable: (candidate) => candidate === path.join("/other", "gh"),
  });
  assert.equal(available.reason, null);
  assert.equal(available.issue_reception, "available");
});

test("symlinked canonical destinations are rejected", (t) => {
  const root = makeRoot(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "daybook-issue-import-outside-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "2026/202610"), { recursive: true });
  fs.symlinkSync(outside, path.join(root, "2026/202610/tasks"));
  assert.throws(() => prepare(root, source(), manifest([{ number: 42, decision: "import", records: [taskRecord()] }])), { code: "PATH_OUTSIDE_REPO" });
});

test("invalid result transitions cannot close before comment verification", async (t) => {
  const root = makeRoot(t);
  const { plan } = prepare(root, source(), manifest([{ number: 42, decision: "import", records: [taskRecord()] }]));
  const runDirectory = path.join(root, "workplace/issue-import/run-order");
  fs.mkdirSync(runDirectory, { recursive: true });
  fs.writeFileSync(path.join(runDirectory, "plan.json"), `${JSON.stringify(plan, null, 2)}\n`);
  const resultPath = path.join(runDirectory, "result.json");
  await applyIssueImport({ repoRoot: root, plan, refreshSource: source(), resultPath });
  await assert.rejects(recordIssueCloseResult({ repoRoot: root, resultPath, issueNumber: 42, status: "pending-gh", reason: "GH_NOT_FOUND" }), { code: "INVALID_RESULT_TRANSITION" });
  await assert.rejects(recordIssueCommentResult({ repoRoot: root, resultPath, issueNumber: 42, status: "posted", url: "https://github.com/acme/daybook/issues/42#issuecomment-4" }), { code: "INVALID_RESULT_TRANSITION" });
});
