import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  parseArgs as parseCommentArgs,
  runIssueComment,
} from "../scripts/github-issue-comment.mjs";
import {
  parseArgs as parseCloseArgs,
  runIssueClose,
} from "../scripts/github-issue-close.mjs";
import {
  applyPendingIssueHandoffBatch,
  createIssueApprovalHandoff,
  reviewIssueApprovalHandoffs,
} from "../scripts/miku-scm-handoff.mjs";
import { workflowContractById } from "../scripts/miku-scm-workflow-contract-lock.mjs";

const REPOSITORY = "igapyon/example";
const APPROVAL_CONTRACTS = workflowContractById();

async function makeRoot(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "miku-scm-comment-close-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

function newIssue(number, comments = []) {
  return {
    number,
    url: `https://github.com/${REPOSITORY}/issues/${number}`,
    title: `Fixture issue ${number}`,
    body: "Fixture body.\n",
    state: "OPEN",
    stateReason: null,
    labels: ["enhancement"],
    updatedAt: "2026-11-03T00:00:00.000Z",
    comments: structuredClone(comments),
  };
}

async function prepareCommentClose(root, issue, suffix) {
  const directory = path.join(root, "workplace", "miku-scm", "issue-comments");
  await mkdir(directory, { recursive: true });
  const draft = path.join(directory, `issue-${issue.number}-comment-202611030000${suffix ? `-${suffix}` : ""}.md`);
  await writeFile(draft, `承認済みコメント ${issue.number}。\n`, "utf8");

  const commentPreflight = await runIssueComment(
    parseCommentArgs([
      "--repo", REPOSITORY,
      "--issue", String(issue.number),
      "--draft", draft,
      "--root", root,
    ]),
    { readIssue: async () => structuredClone(issue) },
  );
  const closePreflight = await runIssueClose(
    parseCloseArgs([
      "--repo", REPOSITORY,
      "--issue", String(issue.number),
      "--reason", "completed",
      "--root", root,
    ]),
    { readIssue: async () => structuredClone(issue) },
  );

  assert.equal(commentPreflight.status, "preflight-ok");
  assert.equal(closePreflight.status, "preflight-ok");
  assert.equal(Object.hasOwn(closePreflight, "current_title"), false);
  assert.equal(closePreflight.issue_title, issue.title);

  const commentId = `comment-${issue.number}`;
  const closeId = `close-${issue.number}`;
  await createIssueApprovalHandoff({
    root,
    runId: commentId,
    preflightWorkflow: "github.issue.comment.preflight",
    applyWorkflow: "github.issue.comment.apply",
    applyArguments: commentPreflight.apply_arguments,
    reviewedResult: commentPreflight,
    humanSummary: `[READY FOR APPROVAL] Issue #${issue.number} comment\n`,
    createdAt: "2026-11-03T00:00:00.000Z",
  });
  await createIssueApprovalHandoff({
    root,
    runId: closeId,
    preflightWorkflow: "github.issue.close.preflight",
    applyWorkflow: "github.issue.close.apply",
    applyArguments: closePreflight.apply_arguments,
    reviewedResult: closePreflight,
    humanSummary: `[READY FOR APPROVAL] Issue #${issue.number} close\n`,
    createdAt: "2026-11-03T00:00:00.000Z",
  });
  return [commentId, closeId];
}

function helperEnvelope(helperResult, runId, mutationInvoked) {
  const statusByHelperStatus = new Map([
    ["commented", "success"],
    ["closed", "success"],
    ["up-to-date", "success"],
    ["preflight-ok", "success"],
    ["conflict", "conflict"],
    ["not-applied", "not-applied"],
    ["unresolved", "unresolved"],
  ]);
  const status = statusByHelperStatus.get(helperResult?.status);
  assert.ok(status, `unexpected helper status: ${helperResult?.status}`);
  return { status, run_id: runId, mutation_invoked: mutationInvoked, result: helperResult };
}

function helperDependencies(issues, mutationLog, {
  beforeClosePreflight = null,
  transformClosePreflight = null,
  commentUrlMissing = false,
} = {}) {
  let run = 0;
  const readIssue = async (repository, number) => {
    assert.equal(repository, REPOSITORY);
    const issue = issues.get(number);
    assert.ok(issue, `unexpected Issue read: ${number}`);
    return structuredClone(issue);
  };
  const readComment = async (repository, number, commentId) => {
    assert.equal(repository, REPOSITORY);
    const comment = issues.get(number)?.comments.find((entry) => entry.id === commentId);
    assert.ok(comment, `unexpected comment read: ${number}/${commentId}`);
    return { id: comment.id, url: comment.url, body: comment.body };
  };
  const ghMutation = (args) => {
    assert.ok(Array.isArray(args));
    const number = Number(args[2]);
    const issue = issues.get(number);
    assert.ok(issue, `unexpected mutation target: ${number}`);
    if (args[0] === "issue" && args[1] === "comment") {
      assert.deepEqual(args.slice(0, 3), ["issue", "comment", String(number)]);
      assert.equal(args[3], "--repo");
      assert.equal(args[4], REPOSITORY);
      assert.equal(args[5], "--body-file");
      const body = readFileSync(args[6], "utf8");
      const id = issue.comments.reduce((maximum, comment) => Math.max(maximum, comment.id), 0) + 77;
      const url = `${issue.url}#issuecomment-${id}`;
      issue.comments.push({ id, url, body, createdAt: "2026-11-03T00:01:00.000Z", author: "fixture" });
      issue.updatedAt = new Date(Date.parse(issue.updatedAt) + 1_000).toISOString();
      mutationLog.push({ operation: "comment", issue: number, id, url, body });
      return { ok: true, status: 0, stdout: commentUrlMissing ? "comment submitted" : url, stderr: "" };
    }
    if (args[0] === "issue" && args[1] === "close") {
      assert.deepEqual(args.slice(0, 3), ["issue", "close", String(number)]);
      assert.equal(args[3], "--repo");
      assert.equal(args[4], REPOSITORY);
      assert.equal(args[5], "--reason");
      assert.equal(args[6], "completed");
      issue.state = "CLOSED";
      issue.stateReason = "COMPLETED";
      issue.updatedAt = new Date(Date.parse(issue.updatedAt) + 1_000).toISOString();
      mutationLog.push({ operation: "close", issue: number });
      return { ok: true, status: 0, stdout: "", stderr: "" };
    }
    assert.fail(`unexpected GitHub mutation argv: ${JSON.stringify(args)}`);
  };

  return {
    async runPreflight(workflow, args) {
      run += 1;
      assert.equal(workflow, "github.issue.close.preflight");
      const options = parseCloseArgs(args);
      await beforeClosePreflight?.(options.issueNumber, issues.get(options.issueNumber));
      let result = await runIssueClose(options, { readIssue });
      result = transformClosePreflight ? transformClosePreflight(result) : result;
      return helperEnvelope(result, `preflight-${run}`, false);
    },
    async runApply(workflow, args) {
      run += 1;
      const before = mutationLog.length;
      let result;
      if (workflow === "github.issue.comment.apply") {
        result = await runIssueComment(parseCommentArgs(args), {
          readIssue,
          readComment,
          ghMutation,
          sleep: async () => {},
        });
      } else if (workflow === "github.issue.close.apply") {
        result = await runIssueClose(parseCloseArgs(args), {
          readIssue,
          ghMutation,
          sleep: async () => {},
        });
      } else {
        assert.fail(`unexpected Issue apply workflow: ${workflow}`);
      }
      return helperEnvelope(result, `apply-${run}`, mutationLog.length > before);
    },
  };
}

test("a comment followed by close uses the real helper preflight shapes", async (t) => {
  const root = await makeRoot(t);
  const issue = newIssue(42);
  const issues = new Map([[issue.number, issue]]);
  const mutationLog = [];
  const handoffs = await prepareCommentClose(root, issue, "");
  const review = await reviewIssueApprovalHandoffs(
    { root, handoffs },
    { approvalContracts: APPROVAL_CONTRACTS },
  );

  const result = await applyPendingIssueHandoffBatch({
    root,
    handoffs,
    expectedReviewSha256: review.review_binding.review_sha256,
    approvalCommand: "approve",
    apply: true,
  }, helperDependencies(issues, mutationLog));

  assert.equal(result.status, "applied");
  assert.equal(result.batch_status, "applied");
  assert.deepEqual(mutationLog.map(({ operation, issue: number }) => [operation, number]), [
    ["comment", 42],
    ["close", 42],
  ]);
  assert.equal(issue.comments.length, 1);
  assert.equal(issue.state, "CLOSED");
  assert.equal(issue.stateReason, "COMPLETED");
  assert.equal(result.requested_count, 2);
  assert.equal(result.applied_count, 2);
  assert.equal(result.remaining_handoffs.length, 0);
  assert.equal(result.results[1].dependency_refresh.preflight_run_id, "preflight-2");
  assert.equal((await readFile(path.join(root, "workplace", "miku-scm", "handoffs", "close-42.json"), "utf8"))
    .includes('"status": "applied"'), true);
});

test("one review and approval apply comment then close for three Issues in order", async (t) => {
  const root = await makeRoot(t);
  const existingComment = {
    id: 5,
    url: "https://github.com/igapyon/example/issues/43#issuecomment-5",
    body: "Existing comment remains.",
    createdAt: "2026-11-02T00:00:00.000Z",
    author: "fixture",
  };
  const issueList = [newIssue(42), newIssue(43, [existingComment]), newIssue(44)];
  const issues = new Map(issueList.map((issue) => [issue.number, issue]));
  const mutationLog = [];
  const handoffs = [];
  for (const issue of issueList) handoffs.push(...await prepareCommentClose(root, issue, ""));
  const review = await reviewIssueApprovalHandoffs(
    { root, handoffs },
    { approvalContracts: APPROVAL_CONTRACTS },
  );
  assert.equal(review.handoff_count, 6);

  const result = await applyPendingIssueHandoffBatch({
    root,
    handoffs,
    expectedReviewSha256: review.review_binding.review_sha256,
    approvalCommand: "approve",
    apply: true,
  }, helperDependencies(issues, mutationLog));

  assert.equal(result.status, "applied");
  assert.equal(result.batch_status, "applied");
  assert.equal(result.requested_count, 6);
  assert.equal(result.processed_count, 6);
  assert.equal(result.applied_count, 6);
  assert.equal(result.remaining_handoffs.length, 0);
  assert.deepEqual(mutationLog.map(({ operation, issue: number }) => [operation, number]), [
    ["comment", 42], ["close", 42],
    ["comment", 43], ["close", 43],
    ["comment", 44], ["close", 44],
  ]);
  for (const issue of issueList) {
    const current = issues.get(issue.number);
    assert.equal(current.state, "CLOSED");
    assert.equal(current.stateReason, "COMPLETED");
    assert.equal(current.comments.filter((comment) => comment.body === `承認済みコメント ${issue.number}。\n`).length, 1);
  }
  assert.ok(issues.get(43).comments.some((comment) => comment.id === existingComment.id));
  assert.equal(mutationLog.filter(({ operation }) => operation === "comment").length, 3);
  assert.equal(mutationLog.filter(({ operation }) => operation === "close").length, 3);
});

test("a real external Issue change stops close and records the preflight run without reposting", async (t) => {
  const root = await makeRoot(t);
  const issue = newIssue(42);
  const issues = new Map([[issue.number, issue]]);
  const mutationLog = [];
  const handoffs = await prepareCommentClose(root, issue, "");
  const review = await reviewIssueApprovalHandoffs(
    { root, handoffs },
    { approvalContracts: APPROVAL_CONTRACTS },
  );
  const dependencies = helperDependencies(issues, mutationLog, {
    beforeClosePreflight: async (_number, current) => {
      current.title = "Changed outside the approved batch";
      current.labels = ["enhancement", "triaged"];
    },
  });

  const result = await applyPendingIssueHandoffBatch({
    root,
    handoffs,
    expectedReviewSha256: review.review_binding.review_sha256,
    approvalCommand: "approve",
    apply: true,
  }, dependencies);

  assert.equal(result.batch_status, "partial-conflict");
  assert.match(result.stop_reason, /Issue fields changed outside the approved sequence: title, labels/);
  assert.deepEqual(mutationLog.map(({ operation }) => operation), ["comment"]);
  assert.equal(issue.comments.length, 1);
  assert.equal(mutationLog.some(({ operation }) => operation === "close"), false);
  assert.equal(result.results[1].dependency_refresh.preflight_run_id, "preflight-2");
  const closeRecord = JSON.parse(await readFile(
    path.join(root, "workplace", "miku-scm", "handoffs", "close-42.json"),
    "utf8",
  ));
  assert.equal(closeRecord.status, "conflict");
  assert.equal(closeRecord.dependency_refresh.preflight_run_id, "preflight-2");
});

test("an outside body edit is reported separately and prevents close", async (t) => {
  const root = await makeRoot(t);
  const issue = newIssue(42);
  const issues = new Map([[issue.number, issue]]);
  const mutationLog = [];
  const handoffs = await prepareCommentClose(root, issue, "");
  const review = await reviewIssueApprovalHandoffs(
    { root, handoffs },
    { approvalContracts: APPROVAL_CONTRACTS },
  );
  const dependencies = helperDependencies(issues, mutationLog, {
    beforeClosePreflight: async (_number, current) => {
      current.body = "Outside body edit.\n";
    },
  });

  const result = await applyPendingIssueHandoffBatch({
    root,
    handoffs,
    expectedReviewSha256: review.review_binding.review_sha256,
    approvalCommand: "approve",
    apply: true,
  }, dependencies);

  assert.equal(result.batch_status, "partial-conflict");
  assert.equal(result.stop_reason, "Issue fields changed outside the approved sequence: body");
  assert.deepEqual(mutationLog.map(({ operation }) => operation), ["comment"]);
  assert.equal(issue.comments.length, 1);
  assert.equal(mutationLog.some(({ operation }) => operation === "close"), false);
});

test("an incomplete dependency snapshot names the missing field and keeps its run ID", async (t) => {
  const root = await makeRoot(t);
  const issue = newIssue(42);
  const issues = new Map([[issue.number, issue]]);
  const mutationLog = [];
  const handoffs = await prepareCommentClose(root, issue, "");
  const review = await reviewIssueApprovalHandoffs(
    { root, handoffs },
    { approvalContracts: APPROVAL_CONTRACTS },
  );
  const dependencies = helperDependencies(issues, mutationLog, {
    transformClosePreflight(result) {
      const incomplete = { ...result };
      delete incomplete.issue_title;
      return incomplete;
    },
  });

  const result = await applyPendingIssueHandoffBatch({
    root,
    handoffs,
    expectedReviewSha256: review.review_binding.review_sha256,
    approvalCommand: "approve",
    apply: true,
  }, dependencies);

  assert.equal(result.batch_status, "partial-conflict");
  assert.equal(result.stop_reason, "Dependency preflight Issue snapshot is incomplete: title");
  assert.deepEqual(mutationLog.map(({ operation }) => operation), ["comment"]);
  assert.equal(issue.comments.length, 1);
  assert.equal(result.results[1].dependency_refresh.preflight_run_id, "preflight-2");
});

test("missing dependency comment evidence is incomplete rather than an empty thread", async (t) => {
  const root = await makeRoot(t);
  const issue = newIssue(42);
  const issues = new Map([[issue.number, issue]]);
  const mutationLog = [];
  const handoffs = await prepareCommentClose(root, issue, "");
  const review = await reviewIssueApprovalHandoffs(
    { root, handoffs },
    { approvalContracts: APPROVAL_CONTRACTS },
  );
  const dependencies = helperDependencies(issues, mutationLog, {
    transformClosePreflight(result) {
      const incomplete = { ...result };
      delete incomplete.current_comments;
      return incomplete;
    },
  });

  const result = await applyPendingIssueHandoffBatch({
    root,
    handoffs,
    expectedReviewSha256: review.review_binding.review_sha256,
    approvalCommand: "approve",
    apply: true,
  }, dependencies);

  assert.equal(result.batch_status, "partial-conflict");
  assert.equal(result.stop_reason, "Dependency preflight Issue snapshot is incomplete: comments");
  assert.deepEqual(mutationLog.map(({ operation }) => operation), ["comment"]);
  assert.equal(issue.comments.length, 1);
  assert.equal(result.results[1].dependency_refresh.preflight_run_id, "preflight-2");
});

test("an extra outside comment stops close while preserving the approved comment", async (t) => {
  const root = await makeRoot(t);
  const issue = newIssue(42);
  const issues = new Map([[issue.number, issue]]);
  const mutationLog = [];
  const handoffs = await prepareCommentClose(root, issue, "");
  const review = await reviewIssueApprovalHandoffs(
    { root, handoffs },
    { approvalContracts: APPROVAL_CONTRACTS },
  );
  const dependencies = helperDependencies(issues, mutationLog, {
    beforeClosePreflight: async (_number, current) => {
      current.comments.push({
        id: 999,
        url: `${current.url}#issuecomment-999`,
        body: "Outside comment",
        createdAt: "2026-11-03T00:02:00.000Z",
        author: "another-user",
      });
      current.updatedAt = new Date(Date.parse(current.updatedAt) + 1_000).toISOString();
    },
  });

  const result = await applyPendingIssueHandoffBatch({
    root,
    handoffs,
    expectedReviewSha256: review.review_binding.review_sha256,
    approvalCommand: "approve",
    apply: true,
  }, dependencies);

  assert.equal(result.batch_status, "partial-conflict");
  assert.equal(result.stop_reason, "Issue comments changed outside the approved sequence");
  assert.deepEqual(mutationLog.map(({ operation }) => operation), ["comment"]);
  assert.equal(issue.comments.length, 2);
  assert.ok(issue.comments.some((comment) => comment.body === "承認済みコメント 42。\n"));
  assert.equal(mutationLog.some(({ operation }) => operation === "close"), false);
});

test("a close already satisfied at real dependency preflight completes without another mutation", async (t) => {
  const root = await makeRoot(t);
  const issue = newIssue(42);
  const issues = new Map([[issue.number, issue]]);
  const mutationLog = [];
  const handoffs = await prepareCommentClose(root, issue, "");
  const review = await reviewIssueApprovalHandoffs(
    { root, handoffs },
    { approvalContracts: APPROVAL_CONTRACTS },
  );
  const dependencies = helperDependencies(issues, mutationLog, {
    beforeClosePreflight: async (_number, current) => {
      current.state = "CLOSED";
      current.stateReason = "COMPLETED";
    },
  });

  const result = await applyPendingIssueHandoffBatch({
    root,
    handoffs,
    expectedReviewSha256: review.review_binding.review_sha256,
    approvalCommand: "approve",
    apply: true,
  }, dependencies);

  assert.equal(result.status, "applied");
  assert.equal(result.mutation_invoked, true);
  assert.deepEqual(mutationLog.map(({ operation }) => operation), ["comment"]);
  assert.equal(result.results[1].apply_result.result.status, "up-to-date");
  assert.equal(result.results[1].mutation_invoked, false);
});

test("an unresolved real comment result is not retried by batch resume", async (t) => {
  const root = await makeRoot(t);
  const issue = newIssue(42);
  const issues = new Map([[issue.number, issue]]);
  const mutationLog = [];
  const handoffs = await prepareCommentClose(root, issue, "");
  const review = await reviewIssueApprovalHandoffs(
    { root, handoffs },
    { approvalContracts: APPROVAL_CONTRACTS },
  );
  const dependencies = helperDependencies(issues, mutationLog, { commentUrlMissing: true });
  const options = {
    root,
    handoffs,
    expectedReviewSha256: review.review_binding.review_sha256,
    approvalCommand: "approve",
    apply: true,
  };

  const result = await applyPendingIssueHandoffBatch(options, dependencies);
  assert.equal(result.batch_status, "stopped-unresolved");
  assert.deepEqual(mutationLog.map(({ operation }) => operation), ["comment"]);
  assert.equal(issue.comments.length, 1);
  await assert.rejects(applyPendingIssueHandoffBatch({
    ...options,
    approvalCommand: null,
    resume: true,
  }, dependencies), /not found|pending|eligible/i);
  assert.deepEqual(mutationLog.map(({ operation }) => operation), ["comment"]);
  assert.equal(mutationLog.some(({ operation }) => operation === "close"), false);
});
