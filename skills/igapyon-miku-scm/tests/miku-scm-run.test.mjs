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
    "repository.maintenance.diagnose",
    "repository.maintenance.plan",
    "repository.maintenance.apply",
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
  assert.deepEqual(calls, [[
    "issue", "view", "7", "--repo", "a/b", "--comments",
    "--json", "number,state,title,body,url,updatedAt,labels,comments",
  ]]);
  const request = JSON.parse(await readFile(path.join(root, "runs", "readonly-1", "request.json"), "utf8"));
  const plan = JSON.parse(await readFile(path.join(root, "runs", "readonly-1", "plan.json"), "utf8"));
  const snapshot = JSON.parse(await readFile(path.join(root, "runs", "readonly-1", "snapshot.json"), "utf8"));
  assert.equal(request.schema_version, RUNNER_SCHEMA_VERSION);
  assert.equal(plan.mutation_invocation_allowed, false);
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
  const plan = JSON.parse(await readFile(path.join(root, "runs", "preflight-ok", "plan.json"), "utf8"));
  assert.equal(plan.approval_gate, "preflight");
  assert.equal(plan.mutation_invocation_allowed, false);
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
