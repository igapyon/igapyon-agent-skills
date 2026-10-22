import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  applyPendingIssueHandoff,
  applyPendingIssueHandoffBatch,
  createIssueApprovalHandoff,
  dismissPendingIssueHandoff,
  parseHandoffApplyArgs,
  parseHandoffBatchApplyArgs,
  parseHandoffDismissArgs,
  parseHandoffListArgs,
  shortHandoffId,
  listPendingIssueHandoffs,
  parseHandoffReviewArgs,
  reviewIssueApprovalHandoffs,
  validateHandoffRecord,
} from "../scripts/miku-scm-handoff.mjs";
import {
  ISSUE_APPROVAL_CONTRACTS,
  issueCommentsSha256,
} from "../scripts/miku-scm-issue-approval.mjs";
import { workflowContractById } from "../scripts/miku-scm-workflow-contract-lock.mjs";

async function workspace(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "miku-scm-handoff-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

const approvalContracts = workflowContractById();

async function approvedOne(root, handoff, command = "approve") {
  const reviewed = await reviewIssueApprovalHandoffs(
    { root, handoffs: [handoff] },
    { approvalContracts },
  );
  return {
    root,
    handoff,
    expectedReviewSha256: reviewed.review_binding.review_sha256,
    approvalCommand: command,
    apply: true,
  };
}

async function approvedBatch(root, handoffs, command = "approve") {
  const reviewed = await reviewIssueApprovalHandoffs(
    { root, handoffs },
    { approvalContracts },
  );
  return {
    root,
    handoffs,
    expectedReviewSha256: reviewed.review_binding.review_sha256,
    approvalCommand: command,
    apply: true,
  };
}

function applyArguments() {
  return [
    "--repo", "a/b",
    "--draft", "workplace/miku-scm/new-issues/issue-new-202607282100.md",
    "--expected-draft-sha256", "a".repeat(64),
    "--expected-labels-sha256", "b".repeat(64),
    "--expected-contract-pair-sha256", "c".repeat(64),
    "--apply",
  ];
}

async function createPending(root, id = "handoff-1") {
  return createIssueApprovalHandoff({
    root,
    runId: id,
    preflightWorkflow: "github.issue.create.preflight",
    applyWorkflow: "github.issue.create.apply",
    applyArguments: applyArguments(),
    reviewedResult: {
      status: "preflight-ok",
      repository: "a/b",
      title: "Title",
      body: "Complete Issue body",
      draft: "workplace/miku-scm/new-issues/issue-new-202607282100.md",
      draft_sha256: "a".repeat(64),
      labels: [],
      labels_sha256: "b".repeat(64),
    },
    humanSummary: "[READY FOR APPROVAL] GitHub Issue create\n",
    createdAt: "2026-07-28T12:00:00.000Z",
  });
}

async function createExistingIssuePending(root, {
  id,
  issue = 18,
  repository = "a/b",
  operation = "comment",
}) {
  const applyWorkflow = `github.issue.${operation}.apply`;
  const common = ["--repo", repository, "--issue", String(issue)];
  const commentSnapshot = [];
  const commentDigest = issueCommentsSha256(commentSnapshot);
  const applyArguments = operation === "comment"
    ? [
      ...common,
      "--draft", `workplace/miku-scm/issue-comments/issue-${issue}-comment-202607281200.md`,
      "--expected-draft-sha256", "a".repeat(64),
      "--expected-issue-sha256", "b".repeat(64),
      "--expected-updated-at", "2026-07-28T11:59:00.000Z",
      "--expected-contract-pair-sha256", "d".repeat(64),
      "--apply",
    ]
    : [
      ...common,
      "--reason", "completed",
      "--expected-operation-sha256", "a".repeat(64),
      "--expected-current-body-sha256", "b".repeat(64),
      "--expected-comments-sha256", commentDigest,
      "--expected-updated-at", "2026-07-28T11:59:00.000Z",
      "--expected-contract-pair-sha256", "d".repeat(64),
      "--apply",
    ];
  return createIssueApprovalHandoff({
    root,
    runId: id,
    preflightWorkflow: `github.issue.${operation}.preflight`,
    applyWorkflow,
    applyArguments,
    reviewedResult: {
      status: "preflight-ok",
      repository,
      issue_number: issue,
      title: "Existing Issue",
      issue_url: `https://github.com/${repository}/issues/${issue}`,
      issue_title: "Existing Issue",
      issue_state: "OPEN",
      current_title: "Existing Issue",
      current_body: "Current body",
      current_state: "OPEN",
      current_labels: [],
      current_comments: commentSnapshot,
      current_updated_at: "2026-07-28T11:59:00.000Z",
      ...(operation === "comment"
        ? { comment_body: "Reviewed comment body" }
        : { reason: "completed" }),
    },
    humanSummary: `[READY FOR APPROVAL] ${applyWorkflow}\n`,
    createdAt: "2026-07-28T12:00:00.000Z",
  });
}

test("handoff parsers accept only fixed list, selection, and dismissal options", () => {
  const root = path.resolve("/tmp/project");
  const nestedRoot = path.resolve(root, "nested");

  assert.deepEqual(parseHandoffListArgs([], "/tmp/project"), {
    root,
  });
  assert.deepEqual(parseHandoffListArgs(["--root", "nested"], "/tmp/project"), {
    root: nestedRoot,
  });
  assert.deepEqual(
    parseHandoffApplyArgs([
      "--handoff", "handoff-2", "--expected-review-sha256", "a".repeat(64),
      "--approval-command", "approve", "--apply",
    ], "/tmp/project"),
    {
      root, handoff: "handoff-2", expectedReviewSha256: "a".repeat(64),
      approvalCommand: "approve", resume: false, apply: true,
    },
  );
  assert.deepEqual(
    parseHandoffApplyArgs([
      "--handoff", "550b907faf95", "--expected-review-sha256", "a".repeat(64),
      "--approval-command", "approve", "--apply",
    ], "/tmp/project"),
    {
      root, handoff: "550b907faf95", expectedReviewSha256: "a".repeat(64),
      approvalCommand: "approve", resume: false, apply: true,
    },
  );
  assert.deepEqual(
    parseHandoffBatchApplyArgs([
      "--handoff", "handoff-2", "--handoff", "handoff-1",
      "--expected-review-sha256", "a".repeat(64), "--approval-command", "approve", "--apply",
    ], "/tmp/project"),
    {
      root, handoffs: ["handoff-2", "handoff-1"], expectedReviewSha256: "a".repeat(64),
      approvalCommand: "approve", resume: false, apply: true,
    },
  );
  assert.deepEqual(
    parseHandoffDismissArgs(["--handoff", "handoff-2", "--apply"], "/tmp/project"),
    { root, handoff: "handoff-2", apply: true },
  );
  assert.throws(() => parseHandoffApplyArgs(["--apply"]), /requires --handoff/);
  assert.throws(() => parseHandoffReviewArgs([]), /requires 1\.\.20/);
  assert.deepEqual(parseHandoffReviewArgs(["--handoff", "handoff-1"], "/tmp/project"), {
    root, handoffs: ["handoff-1"],
  });
  assert.throws(
    () => parseHandoffApplyArgs(["--handoff", "../other", "--expected-review-sha256", "a".repeat(64), "--approval-command", "approve", "--apply"]),
    /full approval handoff ID or a 12-character approval suffix/,
  );
  assert.throws(
    () => parseHandoffApplyArgs(["--handoff", "handoff-1", "--handoff", "handoff-2", "--expected-review-sha256", "a".repeat(64), "--approval-command", "approve", "--apply"]),
    /Duplicate argument/,
  );
  assert.throws(
    () => parseHandoffBatchApplyArgs(["--handoff", "handoff-1", "--expected-review-sha256", "a".repeat(64), "--approval-command", "approve", "--apply"]),
    /at least two/,
  );
  assert.throws(
    () => parseHandoffBatchApplyArgs([
      "--handoff", "handoff-1", "--handoff", "handoff-1", "--apply",
    ]),
    /Duplicate batch approval handoff selector/,
  );
  assert.throws(() => parseHandoffListArgs(["--root"]), /requires a value/);
  assert.throws(() => parseHandoffDismissArgs(["--apply"]), /requires --handoff/);
  assert.throws(() => parseHandoffDismissArgs(["--handoff", "handoff-2"]), /requires --apply/);
  assert.throws(
    () => parseHandoffApplyArgs(["--apply", "--workflow", "shell"]),
    /Unknown argument/,
  );
});

test("Issue preflight handoff persists validated immutable apply arguments", async (t) => {
  const root = await workspace(t);
  const handoff = await createPending(root);
  const record = JSON.parse(await readFile(path.join(root, handoff.path), "utf8"));

  assert.equal(handoff.status, "pending");
  assert.equal(record.apply_workflow, "github.issue.create.apply");
  assert.deepEqual(record.apply_arguments, applyArguments());
  assert.equal(validateHandoffRecord(record), record);
});

test("changed immutable handoff content is rejected", async (t) => {
  const root = await workspace(t);
  const handoff = await createPending(root);
  const options = await approvedOne(root, handoff.id);
  const file = path.join(root, handoff.path);
  const record = JSON.parse(await readFile(file, "utf8"));
  record.apply_arguments[1] = "other/repository";
  await writeFile(file, `${JSON.stringify(record, null, 2)}\n`, "utf8");

  await assert.rejects(
    applyPendingIssueHandoff(
      options,
      { runApply: async () => ({ status: "success" }) },
    ),
    /immutable content changed|record changed/,
  );
});

test("list returns deterministic public summaries for every pending handoff", async (t) => {
  const root = await workspace(t);
  await createPending(root, "handoff-2");
  await createPending(root, "handoff-1");

  const result = await listPendingIssueHandoffs({ root });

  assert.equal(result.status, "listed");
  assert.equal(result.pending_count, 2);
  assert.deepEqual(result.handoffs.map(({ id }) => id), ["handoff-1", "handoff-2"]);
  assert.equal(result.handoffs[0].repository, "a/b");
  assert.equal(result.handoffs[0].title, "Title");
  assert.equal(Object.hasOwn(result.handoffs[0], "apply_arguments"), false);
});

test("list exposes a 12-character approval suffix for a generated-style handoff ID", async (t) => {
  const root = await workspace(t);
  const id = "20260816003919398-c119ac32-29cb-4f58-ad70-550b907faf95";
  await createPending(root, id);

  const result = await listPendingIssueHandoffs({ root });

  assert.equal(shortHandoffId(id), "550b907faf95");
  assert.equal(result.handoffs[0].id, id);
  assert.equal(result.handoffs[0].short_id, "550b907faf95");
});

test("apply requires an explicit reviewed handoff and forwards unchanged arguments", async (t) => {
  const root = await workspace(t);
  const handoff = await createPending(root);
  const options = await approvedOne(root, handoff.id);
  const calls = [];
  const result = await applyPendingIssueHandoff(
    options,
    {
      now: () => new Date("2026-07-28T12:01:00.000Z"),
      runApply: async (workflow, args) => {
        calls.push({ workflow, args });
        return {
          status: "success",
          run_id: "apply-run",
          mutation_invoked: true,
          human_output: "[SUCCESS] GitHub Issue create\n",
        };
      },
    },
  );

  assert.deepEqual(calls, [{
    workflow: "github.issue.create.apply",
    args: applyArguments(),
  }]);
  assert.equal(result.status, "applied");
  const record = JSON.parse(await readFile(path.join(root, handoff.path), "utf8"));
  assert.equal(record.status, "applied");
  assert.equal(record.apply_run_id, "apply-run");

  await assert.rejects(
    applyPendingIssueHandoff(
      options,
      { runApply: async () => ({ status: "success" }) },
    ),
    /not found/,
  );
});

test("apply parser never selects a global pending handoff", async (t) => {
  const root = await workspace(t);
  await createPending(root, "handoff-1");
  await createPending(root, "handoff-2");
  assert.throws(() => parseHandoffApplyArgs(["--apply"], root), /requires --handoff/);
  assert.equal((await listPendingIssueHandoffs({ root })).pending_count, 2);
});

test("explicit handoff selection applies only that pending record", async (t) => {
  const root = await workspace(t);
  const first = await createPending(root, "handoff-1");
  const second = await createPending(root, "handoff-2");
  const options = await approvedOne(root, "handoff-2");
  const calls = [];

  const result = await applyPendingIssueHandoff(
    options,
    {
      now: () => new Date("2026-07-28T12:02:00.000Z"),
      runApply: async (workflow, args) => {
        calls.push({ workflow, args });
        return { status: "success", mutation_invoked: true, run_id: "selected-apply" };
      },
    },
  );

  assert.equal(result.handoff.id, "handoff-2");
  assert.equal(calls.length, 1);
  assert.equal(JSON.parse(await readFile(path.join(root, first.path), "utf8")).status, "pending");
  assert.equal(JSON.parse(await readFile(path.join(root, second.path), "utf8")).status, "applied");
});

test("a human-supplied approval suffix applies its uniquely matching pending handoff", async (t) => {
  const root = await workspace(t);
  const first = await createPending(root, "20260816003919397-b119ac32-29cb-4f58-ad70-118b907faf95");
  const selected = await createPending(root, "20260816003919398-c119ac32-29cb-4f58-ad70-550b907faf95");
  const options = await approvedOne(root, "550b907faf95", "miku-scm approve 550b907faf95");
  const calls = [];

  const result = await applyPendingIssueHandoff(
    options,
    {
      runApply: async (workflow, args) => {
        calls.push({ workflow, args });
        return { status: "success", mutation_invoked: true, run_id: "suffix-apply" };
      },
    },
  );

  assert.equal(result.handoff.id, selected.id);
  assert.equal(calls.length, 1);
  assert.equal(JSON.parse(await readFile(path.join(root, first.path), "utf8")).status, "pending");
  assert.equal(JSON.parse(await readFile(path.join(root, selected.path), "utf8")).status, "applied");
});

test("an ambiguous approval suffix cannot produce a review binding", async (t) => {
  const root = await workspace(t);
  await createPending(root, "20260816003919398-c119ac32-29cb-4f58-ad70-550b907faf95");
  await createPending(root, "20260816003919399-d119ac32-29cb-4f58-ad70-550b907faf95");
  await assert.rejects(
    reviewIssueApprovalHandoffs({ root, handoffs: ["550b907faf95"] }, { approvalContracts }),
    /Ambiguous Issue approval handoff selector/,
  );
});

test("stored approval receipt resumes only a known not-applied handoff", async (t) => {
  const root = await workspace(t);
  await createPending(root, "resume-safe");
  const review = await reviewIssueApprovalHandoffs(
    { root, handoffs: ["resume-safe"] },
    { approvalContracts },
  );
  const options = {
    root,
    handoff: "resume-safe",
    expectedReviewSha256: review.review_binding.review_sha256,
    approvalCommand: "approve",
    apply: true,
  };
  let calls = 0;
  const first = await applyPendingIssueHandoff(options, {
    approvalContracts,
    runApply: async () => {
      calls += 1;
      return { status: "not-applied", mutation_invoked: false };
    },
  });
  assert.equal(first.status, "not-applied");

  const record = JSON.parse(await readFile(
    path.join(root, "workplace", "miku-scm", "handoffs", "resume-safe.json"),
    "utf8",
  ));
  assert.equal(record.approval_receipt.review_sha256, review.review_binding.review_sha256);

  const resumed = await applyPendingIssueHandoff({
    ...options,
    approvalCommand: null,
    resume: true,
  }, {
    approvalContracts,
    runApply: async () => {
      calls += 1;
      return { status: "success", mutation_invoked: true };
    },
  });
  assert.equal(resumed.status, "applied");
  assert.equal(calls, 2);
});

test("unknown apply outcome remains blocked and is visible for reconciliation", async (t) => {
  const root = await workspace(t);
  await createPending(root, "resume-unknown");
  const options = await approvedOne(root, "resume-unknown");
  const unknown = await applyPendingIssueHandoff(options, {
    approvalContracts,
    runApply: async () => ({ status: "unresolved", mutation_invoked: null }),
  });
  assert.equal(unknown.status, "unresolved");

  const listed = await listPendingIssueHandoffs({ root });
  assert.equal(listed.pending_count, 0);
  assert.equal(listed.attention_count, 1);
  assert.equal(listed.attention_handoffs[0].status, "unresolved");
  await assert.rejects(applyPendingIssueHandoff({
    root,
    handoff: "resume-unknown",
    expectedReviewSha256: options.expectedReviewSha256,
    resume: true,
    approvalCommand: null,
    apply: true,
  }, { approvalContracts, runApply: async () => assert.fail("unknown result must not be retried") }));
});

test("parallel approval attempts execute a handoff at most once", async (t) => {
  const root = await workspace(t);
  await createPending(root, "resume-race");
  const options = await approvedOne(root, "resume-race");
  let release;
  let started;
  const startedPromise = new Promise((resolve) => { started = resolve; });
  const held = new Promise((resolve) => { release = resolve; });
  let calls = 0;
  const first = applyPendingIssueHandoff(options, {
    approvalContracts,
    runApply: async () => {
      calls += 1;
      started();
      await held;
      return { status: "success", mutation_invoked: true };
    },
  });
  await startedPromise;
  await assert.rejects(applyPendingIssueHandoff(options, {
    approvalContracts,
    runApply: async () => {
      calls += 1;
      return { status: "success", mutation_invoked: true };
    },
  }));
  release();
  assert.equal((await first).status, "applied");
  assert.equal(calls, 1);
});

test("a batch cannot select the same pending handoff by full ID and suffix", async (t) => {
  const root = await workspace(t);
  const id = "20260816003919398-c119ac32-29cb-4f58-ad70-550b907faf95";
  await createPending(root, id);
  const reviewed = await approvedOne(root, id);
  const options = {
    root,
    handoffs: [id, "550b907faf95"],
    expectedReviewSha256: reviewed.expectedReviewSha256,
    approvalCommand: "approve",
    apply: true,
  };
  let invoked = false;

  await assert.rejects(
    applyPendingIssueHandoffBatch(
      options,
      { runApply: async () => { invoked = true; } },
    ),
    (error) => error.mutationInvoked === false
      && /selectors must resolve to unique records/.test(error.message),
  );
  assert.equal(invoked, false);
});

test("apply preserves a known conflict as a distinct terminal handoff state", async (t) => {
  const root = await workspace(t);
  const handoff = await createPending(root);
  const options = await approvedOne(root, handoff.id);
  const result = await applyPendingIssueHandoff(
    options,
    {
      runApply: async () => ({
        status: "conflict",
        mutation_invoked: false,
        run_id: "conflict-run",
      }),
    },
  );

  assert.equal(result.status, "conflict");
  assert.equal(result.handoff.status, "conflict");
  assert.equal(
    JSON.parse(await readFile(path.join(root, handoff.path), "utf8")).status,
    "conflict",
  );
  assert.equal((await listPendingIssueHandoffs({ root })).pending_count, 0);
});

test("dismiss marks only the explicitly selected pending handoff as dismissed", async (t) => {
  const root = await workspace(t);
  const first = await createPending(root, "handoff-1");
  const second = await createPending(root, "handoff-2");

  const result = await dismissPendingIssueHandoff(
    { root, handoff: "handoff-1", apply: true },
    { now: () => new Date("2026-07-28T12:03:00.000Z") },
  );

  assert.equal(result.status, "dismissed");
  assert.equal(result.handoff.status, "dismissed");
  const dismissed = JSON.parse(await readFile(path.join(root, first.path), "utf8"));
  assert.equal(dismissed.status, "dismissed");
  assert.equal(dismissed.disposition, "dismissed-by-human");
  assert.equal(JSON.parse(await readFile(path.join(root, second.path), "utf8")).status, "pending");
  assert.equal((await listPendingIssueHandoffs({ root })).pending_count, 1);
  await assert.rejects(
    dismissPendingIssueHandoff({ root, handoff: "handoff-1", apply: true }),
    /not found/,
  );
});

test("batch applies every prevalidated handoff in the exact supplied order", async (t) => {
  const root = await workspace(t);
  await createPending(root, "handoff-1");
  await createPending(root, "handoff-2");
  await createPending(root, "handoff-3");
  const options = await approvedBatch(root, ["handoff-2", "handoff-1"]);
  const calls = [];

  const result = await applyPendingIssueHandoffBatch(
    options,
    {
      now: () => new Date("2026-07-28T12:04:00.000Z"),
      runApply: async (workflow, args) => {
        calls.push({ workflow, args });
        return {
          status: "success",
          mutation_invoked: true,
          run_id: `batch-apply-${calls.length}`,
        };
      },
    },
  );

  assert.equal(result.status, "applied");
  assert.equal(result.batch_status, "applied");
  assert.deepEqual(
    result.results.map(({ handoff }) => handoff.id),
    ["handoff-2", "handoff-1"],
  );
  assert.equal(calls.length, 2);
  assert.deepEqual(
    (await listPendingIssueHandoffs({ root })).handoffs.map(({ id }) => id),
    ["handoff-3"],
  );
});

test("batch validates the complete selection before the first apply", async (t) => {
  const root = await workspace(t);
  await createPending(root, "handoff-1");
  let invoked = false;
  const reviewed = await approvedOne(root, "handoff-1");
  const options = { ...reviewed, handoffs: ["handoff-1", "missing-handoff"] };

  await assert.rejects(
    applyPendingIssueHandoffBatch(
      options,
      { runApply: async () => { invoked = true; } },
    ),
    (error) => error.mutationInvoked === false && /not found/.test(error.message),
  );
  assert.equal(invoked, false);
  assert.equal((await listPendingIssueHandoffs({ root })).pending_count, 1);
});

test("batch refreshes only state expectations for a later same-Issue mutation", async (t) => {
  const root = await workspace(t);
  await createExistingIssuePending(root, { id: "comment-18", operation: "comment" });
  const close = await createExistingIssuePending(root, {
    id: "close-18",
    repository: "a/b",
    operation: "close",
  });
  const options = await approvedBatch(root, ["comment-18", "close-18"]);
  const verifiedComment = {
    url: "https://github.com/a/b/issues/18#issuecomment-77",
    body: "Reviewed comment body",
  };
  const refreshedCloseArguments = [
    "--repo", "a/b",
    "--issue", "18",
    "--reason", "completed",
    "--expected-operation-sha256", "a".repeat(64),
    "--expected-current-body-sha256", "b".repeat(64),
    "--expected-comments-sha256", issueCommentsSha256([verifiedComment]),
    "--expected-updated-at", "2026-07-28T12:01:00.000Z",
    "--expected-contract-pair-sha256", "d".repeat(64),
    "--apply",
  ];
  const applyCalls = [];
  const preflightCalls = [];

  const result = await applyPendingIssueHandoffBatch(
    options,
    {
      runApply: async (workflow, args) => {
        applyCalls.push({ workflow, args });
        return {
          status: "success",
          mutation_invoked: true,
          run_id: `apply-${applyCalls.length}`,
          ...(applyCalls.length === 1 ? { result: {
            status: "commented",
            comment_id: 77,
            comment_url: verifiedComment.url,
            verified_body_sha256: createHash("sha256").update(verifiedComment.body).digest("hex"),
          } } : {}),
        };
      },
      runPreflight: async (workflow, args) => {
        preflightCalls.push({ workflow, args });
        return {
          status: "success",
          run_id: "dependency-close-preflight",
          result: {
            status: "preflight-ok",
            apply_arguments: refreshedCloseArguments,
            current_title: "Existing Issue",
            current_body: "Current body",
            current_state: "OPEN",
            current_labels: [],
            current_comments: [verifiedComment],
          },
        };
      },
    },
  );

  assert.equal(result.status, "applied");
  assert.equal(applyCalls.length, 2);
  assert.deepEqual(preflightCalls, [{
    workflow: "github.issue.close.preflight",
    args: ["--repo", "a/b", "--issue", "18", "--reason", "completed"],
  }]);
  assert.deepEqual(applyCalls[1], {
    workflow: "github.issue.close.apply",
    args: refreshedCloseArguments,
  });
  assert.deepEqual(result.results[1].dependency_refresh.refreshed_options, [
    "--expected-updated-at",
    "--expected-comments-sha256",
  ]);
  const closeRecord = JSON.parse(await readFile(path.join(root, close.path), "utf8"));
  assert.equal(closeRecord.status, "applied");
  assert.equal(closeRecord.dependency_refresh.preflight_run_id, "dependency-close-preflight");
});

test("batch stops after an earlier apply when dependency refresh changes operation content", async (t) => {
  const root = await workspace(t);
  await createExistingIssuePending(root, { id: "comment-18", operation: "comment" });
  const close = await createExistingIssuePending(root, {
    id: "close-18",
    operation: "close",
  });
  const options = await approvedBatch(root, ["comment-18", "close-18"]);
  const verifiedComment = {
    url: "https://github.com/a/b/issues/18#issuecomment-77",
    body: "Reviewed comment body",
  };
  let applyCalls = 0;
  const result = await applyPendingIssueHandoffBatch(
    options,
    {
      runApply: async () => {
        applyCalls += 1;
        return {
          status: "success",
          mutation_invoked: true,
          run_id: "comment-apply",
          result: {
            status: "commented",
            comment_id: 77,
            comment_url: verifiedComment.url,
            verified_body_sha256: createHash("sha256").update(verifiedComment.body).digest("hex"),
          },
        };
      },
      runPreflight: async () => ({
        status: "success",
        run_id: "changed-operation-preflight",
        result: {
          status: "preflight-ok",
          apply_arguments: [
            "--repo", "a/b",
            "--issue", "18",
            "--reason", "not planned",
            "--expected-operation-sha256", "a".repeat(64),
            "--expected-current-body-sha256", "b".repeat(64),
            "--expected-comments-sha256", issueCommentsSha256([verifiedComment]),
            "--expected-updated-at", "2026-07-28T12:01:00.000Z",
            "--expected-contract-pair-sha256", "d".repeat(64),
            "--apply",
          ],
          current_title: "Existing Issue",
          current_body: "Current body",
          current_state: "OPEN",
          current_labels: [],
          current_comments: [verifiedComment],
        },
      }),
    },
  );

  assert.equal(result.status, "partial");
  assert.equal(result.batch_status, "partial-conflict");
  assert.equal(result.stopped_handoff, "close-18");
  assert.match(result.stop_reason, /changed reviewed operation content/);
  assert.equal(applyCalls, 1);
  assert.equal(JSON.parse(await readFile(path.join(root, close.path), "utf8")).status, "conflict");
});

test("batch records a dependency preflight read failure as not-applied", async (t) => {
  const root = await workspace(t);
  await createExistingIssuePending(root, { id: "comment-18", operation: "comment" });
  const close = await createExistingIssuePending(root, {
    id: "close-18",
    operation: "close",
  });
  const options = await approvedBatch(root, ["comment-18", "close-18"]);
  let applyCalls = 0;
  const result = await applyPendingIssueHandoffBatch(
    options,
    {
      runApply: async () => {
        applyCalls += 1;
        return { status: "success", mutation_invoked: true, run_id: "comment-apply" };
      },
      runPreflight: async () => ({
        status: "not-applied",
        run_id: "failed-dependency-preflight",
        error: { message: "gh issue view failed before mutation" },
      }),
    },
  );

  assert.equal(result.status, "partial");
  assert.equal(result.batch_status, "partial-not-applied");
  assert.equal(result.stopped_handoff, "close-18");
  assert.equal(result.stopped_status, "not-applied");
  assert.equal(applyCalls, 1);
  const closeRecord = JSON.parse(await readFile(path.join(root, close.path), "utf8"));
  assert.equal(closeRecord.status, "not-applied");
  assert.equal(closeRecord.dependency_refresh.preflight_run_id, "failed-dependency-preflight");
});

test("batch stops before later handoffs after a non-applied result", async (t) => {
  const root = await workspace(t);
  await createPending(root, "handoff-1");
  await createPending(root, "handoff-2");
  await createPending(root, "handoff-3");
  const options = await approvedBatch(root, ["handoff-1", "handoff-2", "handoff-3"]);
  let calls = 0;

  const result = await applyPendingIssueHandoffBatch(
    options,
    {
      now: () => new Date("2026-07-28T12:05:00.000Z"),
      runApply: async () => {
        calls += 1;
        return calls === 1
          ? { status: "success", mutation_invoked: true, run_id: "batch-first" }
          : { status: "not-applied", mutation_invoked: false, run_id: "batch-second" };
      },
    },
  );

  assert.equal(result.status, "partial");
  assert.equal(result.batch_status, "partial-not-applied");
  assert.equal(result.applied_count, 1);
  assert.equal(result.stopped_handoff, "handoff-2");
  assert.deepEqual(result.remaining_handoffs, ["handoff-3"]);
  assert.equal(calls, 2);
  assert.deepEqual(
    (await listPendingIssueHandoffs({ root })).handoffs.map(({ id }) => id),
    ["handoff-3"],
  );
});
