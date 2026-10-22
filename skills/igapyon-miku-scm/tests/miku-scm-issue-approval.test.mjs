import assert from "node:assert/strict";
import test from "node:test";

import {
  ISSUE_APPROVAL_CONTRACTS,
  buildIssueReviewBinding,
  normalizeIssueCommentConnection,
  normalizeIssueReview,
  parseIssueApprovalCommand,
  validateIssueApprovalBinding,
} from "../scripts/miku-scm-issue-approval.mjs";

test("normalizes a complete gh issue view comment connection", () => {
  const nodes = [
    {
      url: "https://github.com/a/b/issues/1#issuecomment-2",
      body: "Second",
      createdAt: "2026-10-22T00:00:00Z",
      author: { login: "user" },
    },
    {
      url: "https://github.com/a/b/issues/1#issuecomment-1",
      body: "First",
      createdAt: "2026-10-21T00:00:00Z",
      author: { login: "user" },
    },
  ];
  const expected = [
    {
      url: "https://github.com/a/b/issues/1#issuecomment-1",
      body: "First",
      created_at: "2026-10-21T00:00:00Z",
      author: "user",
    },
    {
      url: "https://github.com/a/b/issues/1#issuecomment-2",
      body: "Second",
      created_at: "2026-10-22T00:00:00Z",
      author: "user",
    },
  ];
  assert.deepEqual(normalizeIssueCommentConnection({
    nodes,
    totalCount: 2,
    pageInfo: { hasNextPage: false },
  }), expected);
  assert.deepEqual(normalizeIssueCommentConnection({
    Nodes: nodes,
    TotalCount: 2,
    PageInfo: { HasNextPage: false },
  }), expected);
});

test("rejects truncated or inconsistent gh issue view comment connections", () => {
  assert.throws(
    () => normalizeIssueCommentConnection({ nodes: [], totalCount: 1 }),
    /missing or incomplete/,
  );
  assert.throws(
    () => normalizeIssueCommentConnection({ nodes: [], totalCount: 0, pageInfo: { hasNextPage: true } }),
    /missing or incomplete/,
  );
});

const contracts = ISSUE_APPROVAL_CONTRACTS.map((workflow, index) => ({
  workflow,
  pair_sha256: String(index + 1).repeat(64),
}));

function record(id, immutable = "a") {
  return { record: { id, immutable_sha256: immutable.repeat(64) } };
}

test("only exact standalone lowercase approve commands are accepted", () => {
  for (const command of ["approve", "  approve  ", "miku-scm approve"]) {
    assert.equal(parseIssueApprovalCommand(command).accepted, true);
  }
  for (const command of [
    "APPROVE", "approved", "please approve", "approve?", "approveしない",
    '"approve"', "`approve`", "miku-scm 承認", "Issue更新OK", "approve batch a",
  ]) {
    assert.equal(parseIssueApprovalCommand(command).accepted, false, command);
  }
});

test("selector approvals retain exact order and reject duplicates", () => {
  assert.deepEqual(parseIssueApprovalCommand("miku-scm approve abc-123"), {
    accepted: true,
    kind: "single",
    selectors: ["abc-123"],
  });
  assert.deepEqual(parseIssueApprovalCommand("miku-scm approve batch abc-1 abc-2").selectors, ["abc-1", "abc-2"]);
  assert.equal(parseIssueApprovalCommand("miku-scm approve batch abc-1 abc-1").accepted, false);
  assert.equal(parseIssueApprovalCommand(`miku-scm approve ${"f".repeat(12)}`).accepted, true);
  assert.equal(parseIssueApprovalCommand(`miku-scm approve ${"F".repeat(12)}`).accepted, true);
});

test("review normalization keeps complete operation text and metadata", () => {
  const review = normalizeIssueReview("github.issue.update.preflight", {
    status: "preflight-ok",
    repository: "owner/repo",
    issue_number: 42,
    issue_url: "https://github.com/owner/repo/issues/42",
    current_title: "Old title",
    proposed_title: "New title",
    current_body: "old body",
    proposed_body: "new body\nsecond line",
    body_diff: "-old body\n+new body\n+second line",
    current_labels: ["bug"],
    resulting_labels: ["bug", "triaged"],
    add_labels: ["triaged"],
    remove_labels: [],
    current_issue_sha256: "b".repeat(64),
    current_updated_at: "2026-10-23T00:00:00Z",
  });
  assert.equal(review.issue_number, 42);
  assert.equal(review.proposal.proposed_body, "new body\nsecond line");
  assert.equal(review.proposal.body_diff, "-old body\n+new body\n+second line");
  assert.equal(review.context.issue_sha256, "b".repeat(64));
});

test("review normalization refuses missing content rather than summarizing it", () => {
  assert.throws(() => normalizeIssueReview("github.issue.comment.preflight", {
    status: "preflight-ok", repository: "owner/repo", issue_number: 42,
  }), /complete comment body/);
});

test("review binding fixes root, contracts, immutable content, and order", () => {
  const records = [record("first"), record("second", "b")];
  const binding = buildIssueReviewBinding("/workspace/repo", records, contracts);
  assert.match(binding.review_sha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(binding.handoffs.map(({ id }) => id), ["first", "second"]);
  assert.equal(validateIssueApprovalBinding("approve", binding, records).kind, "approve");
  assert.equal(validateIssueApprovalBinding("miku-scm approve batch first second", binding, records).kind, "batch");
  assert.throws(
    () => validateIssueApprovalBinding("miku-scm approve batch second first", binding, records),
    /selectors do not match/,
  );
  assert.throws(
    () => validateIssueApprovalBinding("miku-scm approve batch first other", binding, records),
    /selectors do not match/,
  );
  assert.throws(
    () => validateIssueApprovalBinding("miku-scm approve first", binding, records),
    /exactly one/,
  );
  assert.notEqual(buildIssueReviewBinding("/other/repo", records, contracts).review_sha256, binding.review_sha256);
  const changed = [record("first"), record("second", "c")];
  assert.throws(() => validateIssueApprovalBinding("approve", binding, changed), /immutable content changed/);
});

test("review binding changes when an approval wrapper contract changes", () => {
  const records = [record("single")];
  const binding = buildIssueReviewBinding("/workspace/repo", records, contracts);
  const changedContracts = contracts.map((entry, index) => index === 1
    ? { ...entry, pair_sha256: "f".repeat(64) }
    : entry);
  assert.notEqual(
    buildIssueReviewBinding("/workspace/repo", records, changedContracts).review_sha256,
    binding.review_sha256,
  );
});
