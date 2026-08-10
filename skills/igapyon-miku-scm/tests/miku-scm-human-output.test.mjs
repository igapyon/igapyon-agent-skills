import assert from "node:assert/strict";
import test from "node:test";

import {
  HUMAN_OUTPUT_SCHEMA_VERSION,
  renderHumanOutput,
} from "../scripts/miku-scm-human-output.mjs";
import { WORKFLOW_MANIFEST } from "../scripts/miku-scm-workflow-manifest.mjs";

test("human output schema is versioned", () => {
  assert.equal(HUMAN_OUTPUT_SCHEMA_VERSION, "miku-scm.human-output/v8");
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

test("handoff recovery output exposes exact commands and dismissal state", () => {
  const listed = renderHumanOutput({
    workflow: "github.issue.handoff.list",
    status: "success",
    approvalGate: "none",
    delegateStatus: "listed",
    mutationInvoked: false,
    result: {
      status: "listed",
      pending_count: 1,
      handoffs: [{
        id: "handoff-7",
        apply_workflow: "github.issue.update.apply",
        repository: "a/b",
        issue: 7,
        title: "Update title",
        created_at: "2026-08-02T00:00:00Z",
      }],
    },
  });
  assert.match(listed, /Pending handoff count: 1/);
  assert.match(listed, /Approve command: miku-scm approve handoff-7/);
  assert.match(listed, /Dismiss command: miku-scm dismiss handoff-7/);
  assert.match(listed, /Mutation invoked: no/);

  const dismissed = renderHumanOutput({
    workflow: "github.issue.handoff.dismiss",
    status: "success",
    approvalGate: "apply",
    delegateStatus: "dismissed",
    mutationInvoked: true,
    result: {
      status: "dismissed",
      handoff: {
        id: "handoff-7",
        status: "not-applied",
        path: "workplace/miku-scm/handoffs/handoff-7.json",
      },
    },
  });
  assert.match(dismissed, /^\[SUCCESS\] GitHub Issue approval handoff dismissal/);
  assert.match(dismissed, /Handoff status: not-applied/);
  assert.match(dismissed, /Mutation invoked: yes/);
});

test("handoff batch output preserves conflict diagnostics for a partial stop", () => {
  const output = renderHumanOutput({
    workflow: "github.issue.handoff.batch.apply",
    status: "partial",
    approvalGate: "apply",
    delegateStatus: "partial",
    mutationInvoked: true,
    result: {
      status: "partial",
      batch_status: "partial-conflict",
      requested_count: 3,
      processed_count: 2,
      applied_count: 1,
      stopped_handoff: "handoff-2",
      stopped_status: "conflict",
      remaining_handoffs: ["handoff-3"],
      results: [
        {
          status: "applied",
          handoff: { id: "handoff-1" },
          apply_workflow: "github.issue.comment.apply",
        },
        {
          status: "conflict",
          handoff: { id: "handoff-2" },
          apply_workflow: "github.issue.close.apply",
          apply_result: {
            status: "conflict",
            delegate_result: {
              stage: "target-conflict",
              reviewed_updated_at: "2026-08-01T00:00:00Z",
              observed_updated_at: "2026-08-02T00:00:00Z",
            },
          },
          dependency_refresh: {
            status: "refreshed",
            refreshed_options: ["--expected-updated-at"],
          },
        },
      ],
    },
  });

  assert.match(output, /^\[PARTIAL\] GitHub Issue approval handoff batch apply/);
  assert.match(output, /Step 1: handoff-1 \| github.issue.comment.apply \| applied/);
  assert.match(output, /Step 2: handoff-2 \| github.issue.close.apply \| conflict/);
  assert.match(output, /Step 2 dependency refresh: refreshed/);
  assert.match(output, /Step 2 refreshed options: --expected-updated-at/);
  assert.match(output, /Stopped handoff: handoff-2/);
  assert.match(output, /Stopped apply status: conflict/);
  assert.match(output, /Stopped stage: target-conflict/);
  assert.match(output, /Reviewed updated at: 2026-08-01T00:00:00Z/);
  assert.match(output, /Observed updated at: 2026-08-02T00:00:00Z/);
  assert.match(output, /Remaining handoff: handoff-3/);
  assert.match(output, /Mutation invoked: yes/);
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

test("PR recommit push output combines local rewrite and publication handoff", () => {
  const output = renderHumanOutput({
    workflow: "pr.recommit.push",
    status: "success",
    approvalGate: "apply",
    delegateStatus: "published",
    mutationInvoked: true,
    result: {
      status: "published",
      repository: "igapyon-agent-skills",
      branch: "devel-test",
      base: "origin/devel",
      backup_branch: "backup/2026-08-10-2100",
      pr_draft: "workplace/miku-scm/pr-drafts/pr-devel-test.md",
      new_head: "a".repeat(40),
      pushed_branch: "devel-test",
      final_branch: "devel-test-done",
      comparison: "0 0",
      repository_url: "https://github.com/igapyon/igapyon-agent-skills",
      pr_lookup: "confirmed-none",
      pr_creation_url: "https://github.com/igapyon/igapyon-agent-skills/pull/new/devel-test",
      version: "1.20260810.1",
      recommended_tag: "v20260810a",
      human_handoff: "Create the PR and tag through GitHub.",
    },
  });

  assert.match(output, /^\[SUCCESS\] PR recommit push$/m);
  assert.match(output, /^Backup branch: backup\/2026-08-10-2100$/m);
  assert.match(output, new RegExp(`^New HEAD: ${"a".repeat(40)}$`, "m"));
  assert.match(output, /^Pushed branch: devel-test$/m);
  assert.match(output, /^Final branch: devel-test-done$/m);
  assert.match(output, /^Recommended tag: v20260810a$/m);
  assert.match(output.trimEnd(), /Create the PR and tag through GitHub\.$/);
});

test("post-merge next-work output is complete and ends with the fixed handoff", () => {
  const output = renderHumanOutput({
    workflow: "repository.post-merge.next-work",
    status: "success",
    approvalGate: "apply",
    delegateStatus: "created",
    mutationInvoked: true,
    result: {
      status: "created",
      previous_branch: "devel-tiga0728vej-done",
      remote: "origin",
      base: "devel",
      base_commit: "a".repeat(40),
      version: "1.20260728.6",
      version_source: "pom.xml",
      recommended_tag: "v20260728f",
      tag_status: "confirmed",
      tag_target: "a".repeat(40),
      next_branch: "devel-tiga0728wcg",
      final_branch: "devel-tiga0728wcg",
      comparison: "0 0",
      tag_mutation: false,
      release_mutation: false,
      human_handoff: "Next work branch is ready: devel-tiga0728wcg",
    },
  });

  assert.equal(output, `[SUCCESS] Post-merge next-work preparation

Previous branch: devel-tiga0728vej-done
Remote: origin
Base branch: devel
Base commit: ${"a".repeat(40)}
Version: 1.20260728.6
Version source: pom.xml
Recommended tag: v20260728f
Tag status: confirmed
Tag target: ${"a".repeat(40)}
Next work branch: devel-tiga0728wcg
Final branch: devel-tiga0728wcg
Post-create comparison: 0 0
Tag mutation: no
Release mutation: no
Mutation invoked: yes

Next work branch is ready: devel-tiga0728wcg
`);
  assert.doesNotMatch(output, /[ぁ-んァ-ヶ一-龠]/);
});

test("PR publication apply output contains the complete human handoff", () => {
  const output = renderHumanOutput({
    workflow: "pr.publish.apply",
    status: "success",
    approvalGate: "apply",
    delegateStatus: "published",
    mutationInvoked: true,
    result: {
      repository: "igapyon-agent-skills",
      pushed_branch: "devel-test",
      final_branch: "devel-test-done",
      final_status: "## devel-test-done...origin/devel-test",
      comparison: "0 0",
      repository_url: "https://github.com/igapyon/igapyon-agent-skills",
      pr_lookup: "confirmed-none",
      pr_creation_url: "https://github.com/igapyon/igapyon-agent-skills/pull/new/devel-test",
      version: "1.20260728.6",
      recommended_tag: "v20260728f",
      pull_request_mutation: false,
      tag_mutation: false,
      plan_path: "workplace/miku-scm/publish-plans/publish-develop-test.json",
      plan_sha256: "d".repeat(64),
      human_handoff: "Create the PR and tag through GitHub.",
    },
  });

  assert.equal(output, `[SUCCESS] PR publication

Repository: igapyon-agent-skills
Pushed branch: devel-test
Final branch: devel-test-done
Final status: ## devel-test-done...origin/devel-test
Post-push comparison: 0 0
Repository URL: https://github.com/igapyon/igapyon-agent-skills
PR lookup: confirmed-none
PR creation URL: https://github.com/igapyon/igapyon-agent-skills/pull/new/devel-test
Version: 1.20260728.6
Recommended tag: v20260728f
PR mutation: no
Tag mutation: no
Plan: workplace/miku-scm/publish-plans/publish-develop-test.json
Plan SHA-256: ${"d".repeat(64)}
Mutation invoked: yes

Create the PR and tag through GitHub.
`);
  assert.doesNotMatch(output, /[ぁ-んァ-ヶ一-龠]/);
});

test("PR publication reports unresolved values without guessing", () => {
  const output = renderHumanOutput({
    workflow: "pr.publish.apply",
    status: "success",
    approvalGate: "apply",
    delegateStatus: "published",
    mutationInvoked: true,
    result: {
      repository: "local-repository",
      pushed_branch: "devel-test",
      final_branch: "devel-test-done",
      final_status: "## devel-test-done",
      comparison: "0 0",
      repository_url: "unresolved",
      pr_lookup: "unresolved",
      pr_url: "unresolved",
      version: "unresolved",
      recommended_tag: "unresolved",
      pull_request_mutation: false,
      tag_mutation: false,
      human_handoff: "Create the PR and tag through GitHub.",
    },
  });

  assert.match(output, /^PR URL: unresolved$/m);
  assert.match(output, /^Recommended tag: unresolved$/m);
  assert.match(output, /^PR mutation: no$/m);
  assert.match(output, /^Tag mutation: no$/m);
});

test("PR publication reports ambiguous PR URLs on one line", () => {
  const output = renderHumanOutput({
    workflow: "pr.publish.apply",
    status: "success",
    approvalGate: "apply",
    delegateStatus: "published",
    mutationInvoked: true,
    result: {
      repository: "igapyon-agent-skills",
      pushed_branch: "devel-test",
      final_branch: "devel-test-done",
      final_status: "## devel-test-done",
      comparison: "0 0",
      repository_url: "https://github.com/igapyon/igapyon-agent-skills",
      pr_lookup: "ambiguous",
      pr_urls: [
        "https://github.com/igapyon/igapyon-agent-skills/pull/315",
        "https://github.com/igapyon/igapyon-agent-skills/pull/316",
      ],
      version: "1.20260728.6",
      recommended_tag: "v20260728f",
      pull_request_mutation: false,
      tag_mutation: false,
      human_handoff: "Create the PR and tag through GitHub.",
    },
  });

  assert.match(
    output,
    /^PR URLs: https:\/\/github\.com\/igapyon\/igapyon-agent-skills\/pull\/315, https:\/\/github\.com\/igapyon\/igapyon-agent-skills\/pull\/316$/m,
  );
  assert.equal(output.split("\n").filter((line) => line.startsWith("PR URLs:")).length, 1);
});
