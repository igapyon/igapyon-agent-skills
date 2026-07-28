import assert from "node:assert/strict";
import test from "node:test";

import {
  HUMAN_OUTPUT_SCHEMA_VERSION,
  renderHumanOutput,
} from "../scripts/miku-scm-human-output.mjs";
import { WORKFLOW_MANIFEST } from "../scripts/miku-scm-workflow-manifest.mjs";

test("human output schema is versioned", () => {
  assert.equal(HUMAN_OUTPUT_SCHEMA_VERSION, "miku-scm.human-output/v2");
});

test("every workflow uses English fixed output wording", () => {
  for (const workflow of WORKFLOW_MANIFEST) {
    const output = renderHumanOutput({
      workflow: workflow.id,
      status: "success",
      approvalGate: workflow.approval_gate,
      delegateStatus: "fixture",
      mutationInvoked: false,
      result: {},
    });
    assert.doesNotMatch(output, /[ぁ-んァ-ヶ一-龠]/, workflow.id);
  }
});

test("repository status output is deterministic and omits the absolute root", () => {
  const output = renderHumanOutput({
    workflow: "repository.status",
    status: "success",
    approvalGate: "none",
    delegateStatus: null,
    mutationInvoked: false,
    result: {
      root: "/Users/example/private/repository",
      branch: "devel-test",
      head: "a".repeat(40),
      upstream: "origin/devel",
      ahead: 1,
      behind: 2,
      dirty: true,
      staged: 1,
      unstaged: 2,
      untracked: 3,
      conflicted: 0,
      versions: [{ path: "pom.xml", value: "1.20260728.2", present: true }],
    },
  });

  assert.equal(output, `[SUCCESS] Repository status

Branch: devel-test
HEAD: ${"a".repeat(40)}
upstream: origin/devel
ahead / behind: 1 / 2
Working tree: dirty
staged / unstaged / untracked / conflicted: 1 / 2 / 3 / 0
Versions: pom.xml=1.20260728.2
Mutation invoked: no
`);
  assert.doesNotMatch(output, /Users\/example/);
});

test("Issue create preflight output contains complete review identifiers", () => {
  const output = renderHumanOutput({
    workflow: "github.issue.create.preflight",
    status: "success",
    approvalGate: "preflight",
    delegateStatus: "preflight-ok",
    mutationInvoked: false,
    result: {
      repository: "a/b",
      title: "Deterministic output",
      labels: ["enhancement"],
      parent_issue: { number: 2, state: "OPEN", title: "Parent" },
      draft: "workplace/miku-scm/new-issues/issue-new-202607282100.md",
      draft_sha256: "a".repeat(64),
      labels_sha256: "b".repeat(64),
      parent_sha256: "c".repeat(64),
      apply_arguments: ["--apply"],
    },
  });

  assert.match(output, /^\[READY FOR APPROVAL\] GitHub Issue create/);
  assert.match(output, /Repository: a\/b/);
  assert.match(output, /Labels: enhancement/);
  assert.match(output, /Parent Issue: #2 \(OPEN\) Parent/);
  assert.match(output, new RegExp(`Draft SHA-256: ${"a".repeat(64)}`));
  assert.match(output, /Remote mutation: not invoked/);
  assert.match(output, /miku-scm approve/);
});

test("Issue create apply output reports verification without rewording the body", () => {
  const output = renderHumanOutput({
    workflow: "github.issue.create.apply",
    status: "success",
    approvalGate: "apply",
    delegateStatus: "created",
    mutationInvoked: true,
    result: {
      repository: "a/b",
      issue_number: 8,
      title: "Created",
      labels: ["enhancement"],
      issue_url: "https://github.com/a/b/issues/8",
      issue_verification: { status: "verified" },
      label_verification: { status: "verified" },
      parent_verification: { status: "not-requested" },
      body: "This body must not be repeated.",
    },
  });

  assert.match(output, /^\[SUCCESS\] GitHub Issue create/);
  assert.match(output, /Issue: #8/);
  assert.match(output, /Issue verification: verified/);
  assert.match(output, /Mutation invoked: yes/);
  assert.doesNotMatch(output, /This body must not be repeated/);
});

test("failure output uses stable classification and retryability", () => {
  const output = renderHumanOutput({
    workflow: "github.issue.create.apply",
    status: "unresolved",
    approvalGate: "apply",
    delegateStatus: null,
    mutationInvoked: null,
    error: {
      classification: "network",
      message: "remote result is uncertain",
      retryability: "do-not-retry",
    },
  });

  assert.equal(output, `[UNRESOLVED] GitHub Issue create

workflow: github.issue.create.apply
Classification: network
Message: remote result is uncertain
Mutation invoked: unknown
Retryability: do-not-retry
`);
});

test("Japanese user data is preserved without translating it", () => {
  const output = renderHumanOutput({
    workflow: "github.issue.read",
    status: "success",
    approvalGate: "none",
    delegateStatus: "read",
    mutationInvoked: false,
    result: {
      repository: "a/b",
      mode: "issue",
      issue: {
        number: 9,
        title: "日本語のIssueタイトル",
        state: "OPEN",
        labels: [{ name: "改善" }],
        html_url: "https://github.com/a/b/issues/9",
        comments: [],
      },
    },
  });

  assert.match(output, /Title: 日本語のIssueタイトル/);
  assert.match(output, /Labels: 改善/);
  assert.match(output, /URL: https:\/\/github\.com\/a\/b\/issues\/9/);
});

test("PR recommit apply output is complete without structured-result supplementation", () => {
  const output = renderHumanOutput({
    workflow: "pr.recommit.apply",
    status: "success",
    approvalGate: "apply",
    delegateStatus: "recommitted",
    mutationInvoked: true,
    result: {
      repository: "igapyon-agent-skills",
      mode: "apply",
      status: "recommitted",
      branch: "devel-test",
      base: "origin/devel",
      base_commit: "a".repeat(40),
      backup_branch: "backup/2026-07-28-2200",
      pr_draft: "workplace/miku-scm/pr-drafts/pr-devel-test.md",
      pr_draft_sha256: "b".repeat(64),
      commits_to_collapse: 4,
      new_head: "c".repeat(40),
      final_status: "## devel-test...origin/devel [ahead 1]",
    },
  });

  assert.equal(output, `[SUCCESS] PR recommit

Repository: igapyon-agent-skills
Branch: devel-test
Delegate status: recommitted
Base: origin/devel
Base commit: ${"a".repeat(40)}
Backup branch: backup/2026-07-28-2200
PR draft: workplace/miku-scm/pr-drafts/pr-devel-test.md
PR draft SHA-256: ${"b".repeat(64)}
Commits to collapse: 4
New HEAD: ${"c".repeat(40)}
Final status: ## devel-test...origin/devel [ahead 1]
Mutation invoked: yes
`);
});
