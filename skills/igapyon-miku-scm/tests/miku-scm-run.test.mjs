import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  RESULT_SCHEMA_VERSION,
  RUNNER_SCHEMA_VERSION,
  runWorkflow,
  workflowRegistry,
} from "../scripts/miku-scm-run.mjs";

async function workspace(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "miku-scm-runner-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test("registry exposes fixed workflow IDs and no free-form command workflow", () => {
  assert.deepEqual([...workflowRegistry().keys()], [
    "repository.status",
    "github.issue.read",
    "github.read.batch",
    "github.issue.create.preflight",
    "github.issue.create.apply",
    "github.issue.update.preflight",
    "github.issue.update.apply",
    "github.issue.comment.preflight",
    "github.issue.comment.apply",
    "github.issue.label.preflight",
    "github.issue.label.apply",
    "github.issue.close.preflight",
    "github.issue.close.apply",
    "repository.maintenance.diagnose",
    "repository.maintenance.plan",
    "repository.maintenance.apply",
    "repository.post-merge.next-work",
    "pr.publish.preflight",
    "pr.publish.apply",
    "pr.recommit.preflight",
    "pr.recommit.apply",
    "version.status",
    "version.increment.validate",
  ]);
  assert.equal(workflowRegistry().has("shell"), false);
  assert.equal(workflowRegistry().has("exec"), false);
});

test("READONLY Issue workflow completes in one runner call with stable artifacts", async (t) => {
  const root = await workspace(t);
  const calls = [];
  const result = await runWorkflow("github.issue.read", [
    "--repo", "a/b", "--issue", "7",
  ], {
    cwd: root,
    artifactRoot: path.join(root, "runs"),
    runId: "readonly-1",
    now: () => new Date("2026-07-27T14:00:00Z"),
    gh: (args) => {
      calls.push(args);
      return {
        ok: true,
        status: 0,
        stderr: "",
        stdout: JSON.stringify({
          number: 7,
          state: "OPEN",
          title: "Title",
          body: "Body",
          url: "https://github.com/a/b/issues/7",
          updatedAt: "2026-07-27T13:00:00Z",
          labels: [],
          comments: [],
        }),
      };
    },
  });

  assert.equal(result.schema_version, RESULT_SCHEMA_VERSION);
  assert.equal(result.status, "success");
  assert.equal(result.delegate_status, null);
  assert.equal(result.workflow_contract, "github.issue.read");
  assert.equal(result.contract_version, 1);
  assert.match(result.contract_pair_sha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(calls, [[
    "issue", "view", "7", "--repo", "a/b", "--comments",
    "--json", "number,state,title,body,url,updatedAt,labels,comments",
  ]]);
  const request = JSON.parse(await readFile(path.join(root, "runs", "readonly-1", "request.json"), "utf8"));
  const plan = JSON.parse(await readFile(path.join(root, "runs", "readonly-1", "plan.json"), "utf8"));
  const snapshot = JSON.parse(await readFile(path.join(root, "runs", "readonly-1", "snapshot.json"), "utf8"));
  assert.equal(request.schema_version, RUNNER_SCHEMA_VERSION);
  assert.equal(request.contract_pair_sha256, result.contract_pair_sha256);
  assert.equal(plan.contract_pair_sha256, result.contract_pair_sha256);
  assert.equal(plan.mutation_invocation_allowed, false);
  assert.equal(snapshot.contract_pair_sha256, result.contract_pair_sha256);
  assert.equal(snapshot.delegate_result.issue.number, 7);
});

test("preflight and apply workflow IDs cannot cross the approval boundary", async (t) => {
  const root = await workspace(t);
  const draftDirectory = path.join(root, "workplace", "miku-scm", "new-issues");
  await mkdir(draftDirectory, { recursive: true });
  const draft = "workplace/miku-scm/new-issues/issue-new-202607271400.md";
  await writeFile(path.join(root, draft), "Runner test\n\nBody\n", "utf8");

  const preflightReject = await runWorkflow("github.issue.create.preflight", [
    "--repo", "a/b", "--draft", draft,
    "--expected-draft-sha256", "a".repeat(64),
    "--expected-labels-sha256", "b".repeat(64),
    "--apply",
  ], {
    cwd: root,
    artifactRoot: path.join(root, "runs"),
    runId: "preflight-reject",
    now: () => new Date("2026-07-27T14:00:00Z"),
  });
  assert.equal(preflightReject.status, "not-applied");
  assert.match(preflightReject.error.message, /preflight rejects --apply/);
  assert.equal(preflightReject.error.mutation_invoked, false);
  assert.equal(preflightReject.error.classification, "invalid-input");
  assert.match(preflightReject.error.signature, /^[0-9a-f]{64}$/);

  const applyReject = await runWorkflow("github.issue.create.apply", [
    "--repo", "a/b", "--draft", draft,
  ], {
    cwd: root,
    artifactRoot: path.join(root, "runs"),
    runId: "apply-reject",
    now: () => new Date("2026-07-27T14:00:00Z"),
  });
  assert.equal(applyReject.status, "not-applied");
  assert.match(applyReject.error.message, /requires --apply/);
  assert.equal(applyReject.error.retryability, "new-preflight-required");
});

test("Issue preflight delegates label and parent checks and returns reviewed apply arguments", async (t) => {
  const root = await workspace(t);
  const draftDirectory = path.join(root, "workplace", "miku-scm", "new-issues");
  await mkdir(draftDirectory, { recursive: true });
  const draft = "workplace/miku-scm/new-issues/issue-new-202607271401.md";
  await writeFile(path.join(root, draft), "Runner test\n\nBody\n", "utf8");
  const parent = {
    number: 2,
    url: "https://github.com/a/b/issues/2",
    title: "Parent",
    state: "OPEN",
    updated_at: "2026-07-27T13:00:00Z",
  };
  const result = await runWorkflow("github.issue.create.preflight", [
    "--repo", "a/b", "--draft", draft, "--label", "enhancement", "--parent", "2",
  ], {
    cwd: root,
    artifactRoot: path.join(root, "runs"),
    runId: "preflight-ok",
    now: () => new Date("2026-07-27T14:00:00Z"),
    issueCreateDependencies: {
      readLabels: async () => ["enhancement"],
      readParent: async () => parent,
    },
  });

  assert.equal(result.status, "success");
  assert.equal(result.delegate_status, "preflight-ok");
  assert.equal(result.result.parent_issue.number, 2);
  assert.ok(result.result.apply_arguments.includes("--apply"));
  const contractOption = result.result.apply_arguments.indexOf("--expected-contract-pair-sha256");
  assert.ok(contractOption >= 0);
  assert.match(result.result.apply_arguments[contractOption + 1], /^[0-9a-f]{64}$/);
  const plan = JSON.parse(await readFile(path.join(root, "runs", "preflight-ok", "plan.json"), "utf8"));
  assert.equal(plan.approval_gate, "preflight");
  assert.equal(plan.mutation_invocation_allowed, false);
});

test("migrated Issue mutations return contract-fixed apply arguments", async (t) => {
  const root = await workspace(t);
  const updateDirectory = path.join(root, "workplace", "miku-scm", "issue-updates");
  const commentDirectory = path.join(root, "workplace", "miku-scm", "issue-comments");
  await mkdir(updateDirectory, { recursive: true });
  await mkdir(commentDirectory, { recursive: true });
  const updateDraft = "workplace/miku-scm/issue-updates/issue-7-update-202607271402.md";
  const commentDraft = "workplace/miku-scm/issue-comments/issue-7-comment-202607271403.md";
  await writeFile(path.join(root, updateDraft), "Updated title\n\nUpdated body\n", "utf8");
  await writeFile(path.join(root, commentDraft), "Reviewed comment\n", "utf8");

  const updateIssue = {
    number: 7,
    url: "https://github.com/a/b/issues/7",
    title: "Current title",
    body: "Current body",
    labels: ["enhancement"],
    updatedAt: "2026-07-27T13:00:00Z",
  };
  const commentIssue = {
    ...updateIssue,
    state: "OPEN",
  };
  const labelIssue = {
    number: 7,
    url: updateIssue.url,
    title: updateIssue.title,
    state: "OPEN",
    labels: ["enhancement"],
    updatedAt: updateIssue.updatedAt,
  };
  const closeIssue = {
    number: 7,
    url: updateIssue.url,
    title: updateIssue.title,
    body: updateIssue.body,
    state: "OPEN",
    stateReason: null,
    updatedAt: updateIssue.updatedAt,
  };

  const cases = [
    {
      id: "github.issue.update.preflight",
      args: ["--repo", "a/b", "--issue", "7", "--draft", updateDraft],
      dependencies: { issueUpdateDependencies: { readIssue: async () => updateIssue } },
    },
    {
      id: "github.issue.comment.preflight",
      args: ["--repo", "a/b", "--issue", "7", "--draft", commentDraft],
      dependencies: { issueCommentDependencies: { readIssue: async () => commentIssue } },
    },
    {
      id: "github.issue.label.preflight",
      args: ["--repo", "a/b", "--issue", "7", "--add-label", "documentation"],
      dependencies: {
        issueLabelDependencies: {
          readIssue: async () => labelIssue,
          readLabels: async () => ["enhancement", "documentation"],
        },
      },
    },
    {
      id: "github.issue.close.preflight",
      args: ["--repo", "a/b", "--issue", "7", "--reason", "completed"],
      dependencies: { issueCloseDependencies: { readIssue: async () => closeIssue } },
    },
  ];

  for (const [index, entry] of cases.entries()) {
    const result = await runWorkflow(entry.id, entry.args, {
      cwd: root,
      artifactRoot: path.join(root, "runs"),
      runId: `issue-mutation-${index}`,
      now: () => new Date("2026-07-27T14:00:00Z"),
      ...entry.dependencies,
    });
    assert.equal(result.status, "success");
    assert.equal(result.delegate_status, "preflight-ok");
    const contractOption = result.result.apply_arguments.indexOf(
      "--expected-contract-pair-sha256",
    );
    assert.ok(contractOption >= 0, entry.id);
    assert.match(result.result.apply_arguments[contractOption + 1], /^[0-9a-f]{64}$/);
    assert.equal(result.mutation_invoked, false);
  }
});

test("unknown workflow and arbitrary helper options are rejected without execution", async (t) => {
  const root = await workspace(t);
  await assert.rejects(
    runWorkflow("shell", ["git", "status"], {
      cwd: root,
      artifactRoot: path.join(root, "runs"),
      runId: "unknown",
    }),
    /Unknown workflow ID/,
  );
  const result = await runWorkflow("github.issue.read", [
    "--repo", "a/b", "--list", "--command", "git status",
  ], {
    cwd: root,
    artifactRoot: path.join(root, "runs"),
    runId: "unknown-option",
    now: () => new Date("2026-07-27T14:00:00Z"),
  });
  assert.equal(result.status, "not-applied");
  assert.match(result.error.message, /Unknown argument/);

  const secretResult = await runWorkflow("github.issue.read", [
    "--repo", "a/b", "--list", "--token=super-secret-value",
  ], {
    cwd: root,
    artifactRoot: path.join(root, "runs"),
    runId: "redacted-option",
    now: () => new Date("2026-07-27T14:00:00Z"),
  });
  assert.equal(secretResult.status, "not-applied");
  const request = await readFile(path.join(root, "runs", "redacted-option", "request.json"), "utf8");
  assert.doesNotMatch(request, /super-secret-value/);
  assert.match(request, /<redacted>/);
});

test("post-merge workflow keeps merge confirmation and apply inside one fixed runner call", async (t) => {
  const root = await workspace(t);
  let branch = "devel-tiga0727vda-done";
  let head = "a".repeat(40);
  const baseHead = "b".repeat(40);
  const calls = [];
  const git = (_cwd, args, allowFailure = false) => {
    calls.push(args);
    const command = args.join(" ");
    if (command === "rev-parse --show-toplevel") return { ok: true, out: root };
    if (command === "branch --show-current") return { ok: true, out: branch };
    if (command === "status --porcelain") return { ok: true, out: "" };
    if (command === "rev-parse HEAD") return { ok: true, out: head };
    if (command === "fetch origin") return { ok: true, out: "" };
    if (command === "rev-parse origin/devel") return { ok: true, out: baseHead };
    if (command === "show-ref --verify --quiet refs/heads/devel-tiga0727weg") {
      return { ok: false, out: "" };
    }
    if (command === `show ${baseHead}:VERSION.md`) return { ok: false, out: "" };
    if (command === `show ${baseHead}:pom.xml`) {
      return { ok: true, out: "<project><version>1.20260727.3</version></project>" };
    }
    if (command.startsWith("ls-remote --tags origin refs/tags/v20260727c")) {
      return { ok: true, out: `${baseHead}\trefs/tags/v20260727c` };
    }
    if (command === "switch -c devel-tiga0727weg origin/devel") {
      branch = "devel-tiga0727weg";
      head = baseHead;
      return { ok: true, out: "" };
    }
    if (command === "rev-list --left-right --count HEAD...origin/devel") {
      return { ok: true, out: "0\t0" };
    }
    if (allowFailure) return { ok: false, out: "" };
    throw new Error(`Unexpected git command: ${command}`);
  };

  const rejected = await runWorkflow("repository.post-merge.next-work", [
    "--repo", root,
    "--apply",
  ], {
    cwd: root,
    artifactRoot: path.join(root, "runs"),
    runId: "post-merge-rejected",
    now: () => new Date("2026-07-27T22:46:00+09:00"),
    postMergeDependencies: { git },
  });
  assert.equal(rejected.status, "not-applied");
  assert.match(rejected.error.message, /--confirmed-merged and --apply are required/);
  assert.equal(calls.length, 0);

  const result = await runWorkflow("repository.post-merge.next-work", [
    "--repo", root,
    "--confirmed-merged",
    "--apply",
  ], {
    cwd: root,
    artifactRoot: path.join(root, "runs"),
    runId: "post-merge-ok",
    now: () => new Date("2026-07-27T22:46:00+09:00"),
    postMergeDependencies: {
      git,
      now: () => new Date("2026-07-27T22:46:00+09:00"),
    },
  });
  assert.equal(result.status, "success");
  assert.equal(result.result.status, "created");
  assert.equal(result.result.final_branch, "devel-tiga0727weg");
  assert.equal(result.result.comparison, "0 0");
  assert.equal(result.mutation_invoked, true);
  assert.ok(calls.some((args) => args.join(" ") === "fetch origin"));
  const attempt = JSON.parse(await readFile(
    path.join(root, "runs", "post-merge-ok", "attempt.json"),
    "utf8",
  ));
  assert.equal(attempt.status, "success");
});

test("publication runner keeps saved preflight and reviewed-plan apply separate", async (t) => {
  const root = await workspace(t);
  const head = "a".repeat(40);
  const planPath = "workplace/miku-scm/ok-push/ok-push-test.json";
  const digest = "b".repeat(64);
  const calls = [];
  const publishExecute = async (options) => {
    calls.push(options);
    if (options.savePlan) {
      return {
        status: "preflight-ok",
        plan_path: planPath,
        plan_sha256: digest,
        remote_branch: { state: "absent" },
      };
    }
    return {
      status: "published",
      attempt_record: `${planPath}.attempt.json`,
      comparison: "0 0",
    };
  };

  const preflight = await runWorkflow("pr.publish.preflight", [
    "--repo", root,
    "--expected-head", head,
    "--save-plan",
  ], {
    cwd: root,
    artifactRoot: path.join(root, "runs"),
    runId: "publish-preflight",
    publishExecute,
  });
  assert.equal(preflight.status, "success");
  assert.equal(preflight.result.plan_sha256, digest);
  assert.equal(preflight.mutation_invoked, false);

  const apply = await runWorkflow("pr.publish.apply", [
    "--repo", root,
    "--apply-plan", planPath,
    "--expected-plan-sha256", digest,
  ], {
    cwd: root,
    artifactRoot: path.join(root, "runs"),
    runId: "publish-apply",
    publishExecute,
  });
  assert.equal(apply.status, "success");
  assert.equal(apply.result.status, "published");
  assert.equal(apply.mutation_invoked, true);
  assert.equal(calls.length, 2);

  const rejected = await runWorkflow("pr.publish.preflight", [
    "--repo", root,
    "--expected-head", head,
  ], {
    cwd: root,
    artifactRoot: path.join(root, "runs"),
    runId: "publish-preflight-rejected",
    publishExecute,
  });
  assert.equal(rejected.status, "not-applied");
  assert.match(rejected.error.message, /requires --save-plan/);
  assert.equal(calls.length, 2);
});

test("publication apply records a known pre-mutation failure as not-applied", async (t) => {
  const root = await workspace(t);
  const planPath = "workplace/miku-scm/ok-push/ok-push-test.json";
  const failure = new Error("sandbox network denied before mutation");
  failure.mutationInvoked = false;
  const result = await runWorkflow("pr.publish.apply", [
    "--repo", root,
    "--apply-plan", planPath,
    "--expected-plan-sha256", "c".repeat(64),
  ], {
    cwd: root,
    artifactRoot: path.join(root, "runs"),
    runId: "publish-apply-safe-stop",
    publishExecute: async () => {
      throw failure;
    },
  });
  assert.equal(result.status, "not-applied");
  assert.equal(result.mutation_invoked, false);
  assert.equal(result.error.mutation_invoked, false);
});

test("recommit runner separates inspection from the explicit one-shot local rewrite", async (t) => {
  const root = await workspace(t);
  const draft = "workplace/miku-scm/pr-drafts/pr-test.md";
  const calls = [];
  const recommitExecute = (options) => {
    calls.push(options);
    return options.apply
      ? { status: "recommitted", mutation_invoked: true, new_head: "b".repeat(40) }
      : { status: "preflight-ok", mutation_invoked: false, head: "a".repeat(40) };
  };

  const preflight = await runWorkflow("pr.recommit.preflight", [
    "--repo", root,
    "--pr-draft", draft,
  ], {
    cwd: root,
    artifactRoot: path.join(root, "runs"),
    runId: "recommit-preflight",
    recommitExecute,
  });
  assert.equal(preflight.status, "success");
  assert.equal(preflight.mutation_invoked, false);

  const apply = await runWorkflow("pr.recommit.apply", [
    "--repo", root,
    "--base", "origin/devel",
    "--pr-draft", draft,
    "--apply",
  ], {
    cwd: root,
    artifactRoot: path.join(root, "runs"),
    runId: "recommit-apply",
    recommitExecute,
  });
  assert.equal(apply.status, "success");
  assert.equal(apply.result.status, "recommitted");
  assert.equal(apply.mutation_invoked, true);
  assert.equal(calls.length, 2);

  const rejected = await runWorkflow("pr.recommit.apply", [
    "--repo", root,
    "--pr-draft", draft,
    "--apply",
  ], {
    cwd: root,
    artifactRoot: path.join(root, "runs"),
    runId: "recommit-apply-rejected",
    recommitExecute,
  });
  assert.equal(rejected.status, "not-applied");
  assert.match(rejected.error.message, /explicit --base and --pr-draft/);
  assert.equal(calls.length, 2);
});

test("local apply failure after a known mutation is unresolved", async (t) => {
  const root = await workspace(t);
  const failure = new Error("reset failed after backup creation");
  failure.mutationInvoked = true;
  const result = await runWorkflow("pr.recommit.apply", [
    "--repo", root,
    "--base", "origin/devel",
    "--pr-draft", "workplace/miku-scm/pr-drafts/pr-test.md",
    "--apply",
  ], {
    cwd: root,
    artifactRoot: path.join(root, "runs"),
    runId: "recommit-apply-unresolved",
    recommitExecute: () => {
      throw failure;
    },
  });
  assert.equal(result.status, "unresolved");
  assert.equal(result.mutation_invoked, true);
});

test("version runner separates status from explicit increment validation", async (t) => {
  const root = await workspace(t);
  const calls = [];
  const versionExecute = (options) => {
    calls.push(options);
    return {
      status: options.validateIncrement ? "validated" : "inspected",
      readonly: true,
      mutation_invoked: false,
    };
  };
  const status = await runWorkflow("version.status", [
    "--repo", root,
    "--version-file", "pom.xml",
  ], {
    cwd: root,
    artifactRoot: path.join(root, "runs"),
    runId: "version-status",
    versionExecute,
  });
  assert.equal(status.status, "success");
  assert.equal(status.mutation_invoked, false);

  const validation = await runWorkflow("version.increment.validate", [
    "--repo", root,
    "--version-file", "pom.xml",
    "--coupled-version-file", "VERSION.md",
    "--policy", "miku-date-coupled",
    "--timezone", "Asia/Tokyo",
    "--validate-increment",
  ], {
    cwd: root,
    artifactRoot: path.join(root, "runs"),
    runId: "version-validation",
    versionExecute,
  });
  assert.equal(validation.status, "success");
  assert.equal(validation.result.status, "validated");
  assert.equal(validation.mutation_invoked, false);
  assert.equal(calls.length, 2);
});

test("version validation rejects implicit policy before delegate execution", async (t) => {
  const root = await workspace(t);
  let executed = false;
  const result = await runWorkflow("version.increment.validate", [
    "--repo", root,
    "--version-file", "pom.xml",
    "--validate-increment",
  ], {
    cwd: root,
    artifactRoot: path.join(root, "runs"),
    runId: "version-validation-rejected",
    versionExecute: () => {
      executed = true;
    },
  });
  assert.equal(result.status, "not-applied");
  assert.equal(result.mutation_invoked, false);
  assert.match(result.error.message, /explicit --policy/);
  assert.equal(executed, false);
});
