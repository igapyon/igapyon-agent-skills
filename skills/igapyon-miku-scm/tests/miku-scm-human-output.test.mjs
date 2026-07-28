import assert from "node:assert/strict";
import test from "node:test";

import {
  HUMAN_OUTPUT_SCHEMA_VERSION,
  renderHumanOutput,
} from "../scripts/miku-scm-human-output.mjs";

test("human output schema is versioned", () => {
  assert.equal(HUMAN_OUTPUT_SCHEMA_VERSION, "miku-scm.human-output/v1");
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

  assert.equal(output, `[SUCCESS] リポジトリ状態

ブランチ: devel-test
HEAD: ${"a".repeat(40)}
upstream: origin/devel
ahead / behind: 1 / 2
作業ツリー: 変更あり
staged / unstaged / untracked / conflicted: 1 / 2 / 3 / 0
バージョン: pom.xml=1.20260728.2
mutation実行: なし
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

  assert.match(output, /^\[READY FOR APPROVAL\] GitHub Issue作成/);
  assert.match(output, /対象: a\/b/);
  assert.match(output, /ラベル: enhancement/);
  assert.match(output, /親Issue: #2 \(OPEN\) Parent/);
  assert.match(output, new RegExp(`Draft SHA-256: ${"a".repeat(64)}`));
  assert.match(output, /リモート変更: 未実行/);
  assert.match(output, /miku-scm 承認/);
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

  assert.match(output, /^\[SUCCESS\] GitHub Issue作成/);
  assert.match(output, /Issue: #8/);
  assert.match(output, /Issue検証: verified/);
  assert.match(output, /mutation実行: あり/);
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

  assert.equal(output, `[UNRESOLVED] GitHub Issue作成

workflow: github.issue.create.apply
分類: network
内容: remote result is uncertain
mutation実行: 不明
再試行: do-not-retry
`);
});
