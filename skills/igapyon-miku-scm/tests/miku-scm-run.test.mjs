import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  PRODUCT_VERSION,
  RESULT_SCHEMA_VERSION,
  RUNNER_SCHEMA_VERSION,
  parseRunnerCliArgs,
  runWorkflow,
  workflowRegistry,
} from "../scripts/miku-scm-run.mjs";
import {
  HELP_SCHEMA_VERSION,
  WORKFLOW_LIST_SCHEMA_VERSION,
  resolveHelpRequest,
} from "../scripts/miku-scm-help.mjs";
import { HUMAN_OUTPUT_SCHEMA_VERSION } from "../scripts/miku-scm-human-output.mjs";
import { WORKFLOW_MANIFEST } from "../scripts/miku-scm-workflow-manifest.mjs";

const RUNNER_PATH = fileURLToPath(new URL("../scripts/miku-scm-run.mjs", import.meta.url));
const REPOSITORY_ROOT = path.resolve(path.dirname(RUNNER_PATH), "../../..");

async function workspace(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "miku-scm-runner-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test("runner CLI format is fixed and cannot become a workflow option", () => {
  assert.deepEqual(
    parseRunnerCliArgs(["--format", "human", "repository.status", "--repo", "."]),
    {
      format: "human",
      workflowId: "repository.status",
      workflowArguments: ["--repo", "."],
    },
  );
  assert.deepEqual(parseRunnerCliArgs(["repository.status"]), {
    format: "json",
    workflowId: "repository.status",
    workflowArguments: [],
  });
  assert.throws(
    () => parseRunnerCliArgs(["--format", "shell", "repository.status"]),
    /exactly json or human/,
  );
});

test("--version is plain, side-effect-free, and aligned with the repository version", async (t) => {
  const root = await workspace(t);
  const result = spawnSync(process.execPath, [RUNNER_PATH, "--version"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, `${PRODUCT_VERSION}\n`);
  assert.equal(result.stderr, "");
  assert.equal(existsSync(path.join(root, "workplace")), false);

  const explicitlyFormatted = spawnSync(process.execPath, [
    RUNNER_PATH,
    "--format", "json",
    "--version",
  ], { cwd: root, encoding: "utf8" });
  assert.equal(explicitlyFormatted.status, 0, explicitlyFormatted.stderr);
  assert.equal(explicitlyFormatted.stdout, `${PRODUCT_VERSION}\n`);

  const pom = await readFile(path.join(REPOSITORY_ROOT, "pom.xml"), "utf8");
  const projectVersion = pom.match(/<artifactId>igapyon-agent-skills<\/artifactId>\s*<version>([^<]+)<\/version>/);
  assert.ok(projectVersion, "root pom.xml must declare the repository version");
  assert.equal(PRODUCT_VERSION, projectVersion[1]);
});

test("--version rejects extra arguments without creating artifacts", async (t) => {
  const root = await workspace(t);
  const result = spawnSync(process.execPath, [RUNNER_PATH, "--version", "unexpected"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.equal(JSON.parse(result.stderr).error.code, "UNEXPECTED_ARGUMENT");
  assert.equal(existsSync(path.join(root, "workplace")), false);
});

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
    "github.issue.handoff.list",
    "github.issue.handoff.apply",
    "github.issue.handoff.batch.apply",
    "github.issue.handoff.dismiss",
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
    "writing.issue.prepare",
    "writing.pr.prepare",
    "writing.release.prepare",
    "writing.about.prepare",
  ]);
  assert.equal(workflowRegistry().has("shell"), false);
  assert.equal(workflowRegistry().has("exec"), false);
});

test("manifest exposes complete AI-readable CLI help contracts", () => {
  assert.equal(WORKFLOW_MANIFEST.length, 31);
  for (const workflow of WORKFLOW_MANIFEST) {
    assert.equal(typeof workflow.cli.summary, "string", workflow.id);
    assert.ok(workflow.cli.summary.length > 0, workflow.id);
    assert.ok(Array.isArray(workflow.cli.options), workflow.id);
    assert.ok(Array.isArray(workflow.cli.example_arguments), workflow.id);
    assert.equal(typeof workflow.cli.network_access, "string", workflow.id);
    assert.equal(typeof workflow.cli.authentication, "string", workflow.id);
    assert.ok(Array.isArray(workflow.cli.operational_artifacts), workflow.id);
    const flags = workflow.cli.options.map((entry) => entry.flag);
    assert.equal(new Set(flags).size, flags.length, `${workflow.id} has duplicate option flags`);
    for (const option of workflow.cli.options) {
      assert.match(option.flag, /^--[a-z0-9-]+$/, `${workflow.id} ${option.flag}`);
      assert.equal(typeof option.description, "string", `${workflow.id} ${option.flag}`);
    }
  }
});

test("workflow help never advertises an option absent from its fixed parser", async () => {
  const scripts = path.dirname(RUNNER_PATH);
  for (const workflow of WORKFLOW_MANIFEST) {
    const source = await readFile(path.join(scripts, workflow.runner_entry), "utf8");
    const parserFlags = new Set(
      [...source.matchAll(/(?:arg|argument|a) === "(--[a-z0-9-]+)"/g)]
        .map((match) => match[1]),
    );
    for (const option of workflow.cli.options) {
      assert.ok(
        parserFlags.has(option.flag),
        `${workflow.id} help advertises unsupported ${option.flag}`,
      );
    }
  }
});

test("top-level and machine-readable workflow help are metadata-only", async (t) => {
  const root = await workspace(t);
  const list = spawnSync(process.execPath, [
    RUNNER_PATH,
    "--format", "json",
    "--list-workflows",
  ], { cwd: root, encoding: "utf8" });
  assert.equal(list.status, 0, list.stderr);
  const catalog = JSON.parse(list.stdout);
  assert.equal(catalog.schema_version, WORKFLOW_LIST_SCHEMA_VERSION);
  assert.equal(catalog.workflows.length, WORKFLOW_MANIFEST.length);
  assert.equal(catalog.help_contract.side_effect_free, true);
  assert.equal(existsSync(path.join(root, "workplace")), false);

  const workflow = spawnSync(process.execPath, [
    RUNNER_PATH,
    "--format", "json",
    "help", "repository.status",
  ], { cwd: root, encoding: "utf8" });
  assert.equal(workflow.status, 0, workflow.stderr);
  const document = JSON.parse(workflow.stdout);
  assert.equal(document.schema_version, HELP_SCHEMA_VERSION);
  assert.equal(document.workflow, "repository.status");
  assert.equal(document.help_contract.artifact_writes, false);
  assert.equal(existsSync(path.join(root, "workplace")), false);
});

test("every workflow-scoped --help exits zero without artifacts or execution", async (t) => {
  const root = await workspace(t);
  for (const workflow of WORKFLOW_MANIFEST) {
    const result = spawnSync(process.execPath, [
      RUNNER_PATH,
      "--format", "json",
      workflow.id,
      "--help",
    ], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, `${workflow.id}: ${result.stderr}`);
    const document = JSON.parse(result.stdout);
    assert.equal(document.kind, "workflow", workflow.id);
    assert.equal(document.workflow, workflow.id);
    assert.equal(document.help_contract.delegate_invoked, false, workflow.id);
    assert.equal(document.help_contract.subprocess_invoked, false, workflow.id);
    assert.equal(document.help_contract.network_access, false, workflow.id);
    assert.equal(document.help_contract.artifact_writes, false, workflow.id);
    assert.equal(existsSync(path.join(root, "workplace")), false, workflow.id);
  }
});

test("post-merge help cannot bypass apply validation or reach runWorkflow", async (t) => {
  const root = await workspace(t);
  const cli = spawnSync(process.execPath, [
    RUNNER_PATH,
    "--format", "json",
    "repository.post-merge.next-work",
    "--confirmed-merged",
    "--apply",
    "--help",
  ], { cwd: root, encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(JSON.parse(cli.stdout).kind, "workflow");
  assert.equal(existsSync(path.join(root, "workplace")), false);

  await assert.rejects(
    () => runWorkflow("repository.post-merge.next-work", ["--help"], {
      cwd: root,
      artifactRoot: path.join(root, "runs"),
    }),
    (error) => error?.code === "HELP_REQUEST_REQUIRES_CLI",
  );
  assert.equal(existsSync(path.join(root, "runs")), false);
});

test("CLI discovery errors provide structured recovery guidance", async (t) => {
  const root = await workspace(t);
  const unknown = spawnSync(process.execPath, [
    RUNNER_PATH,
    "repository.stats",
  ], { cwd: root, encoding: "utf8" });
  assert.equal(unknown.status, 1);
  const error = JSON.parse(unknown.stderr);
  assert.equal(error.schema_version, "miku-scm.cli-error/v1");
  assert.equal(error.error.code, "UNKNOWN_WORKFLOW");
  assert.ok(error.error.suggestions.includes("repository.status"));
  assert.match(error.error.help_command, /--format json --list-workflows$/);
  assert.equal(existsSync(path.join(root, "workplace")), false);
});

test("workflow input errors identify the bad option and exact help command", async (t) => {
  const root = await workspace(t);
  const invalid = spawnSync(process.execPath, [
    RUNNER_PATH,
    "repository.status",
    "--not-an-option",
  ], { cwd: root, encoding: "utf8" });
  assert.equal(invalid.status, 1);
  const result = JSON.parse(invalid.stdout);
  assert.equal(result.status, "not-applied");
  assert.equal(result.error.code, "UNKNOWN_ARGUMENT");
  assert.equal(result.error.bad_argument, "--not-an-option");
  assert.match(result.error.help_command, /help repository\.status$/);

  const human = spawnSync(process.execPath, [
    RUNNER_PATH,
    "--format", "human",
    "repository.status",
    "--not-an-option",
  ], { cwd: root, encoding: "utf8" });
  assert.equal(human.status, 1);
  assert.match(human.stdout, /Code: UNKNOWN_ARGUMENT/);
  assert.match(human.stdout, /Bad argument: --not-an-option/);
  assert.match(human.stdout, /Help: .*help repository\.status/);
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
  assert.equal(result.human_output_schema_version, HUMAN_OUTPUT_SCHEMA_VERSION);
  assert.match(result.human_output, /^\[SUCCESS\] GitHub Issue read/);
  assert.match(result.human_output, /Issue: #7/);
  assert.match(result.human_output, /URL: https:\/\/github\.com\/a\/b\/issues\/7/);
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
  assert.equal(applyReject.error.code, "EXPLICIT_APPLY_REQUIRED");
  assert.match(applyReject.error.help_command, /help github\.issue\.create\.apply$/);
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
  assert.match(result.human_output, /^\[READY FOR APPROVAL\] GitHub Issue create/);
  assert.match(result.human_output, /Approval command: reply with exactly `miku-scm approve preflight-ok` in chat/);
  assert.equal(result.result.handoff.status, "pending");
  assert.match(result.result.handoff.immutable_sha256, /^[0-9a-f]{64}$/);
  assert.equal(result.result.parent_issue.number, 2);
  assert.ok(result.result.apply_arguments.includes("--apply"));
  const contractOption = result.result.apply_arguments.indexOf("--expected-contract-pair-sha256");
  assert.ok(contractOption >= 0);
  assert.match(result.result.apply_arguments[contractOption + 1], /^[0-9a-f]{64}$/);
  const plan = JSON.parse(await readFile(path.join(root, "runs", "preflight-ok", "plan.json"), "utf8"));
  assert.equal(plan.approval_gate, "preflight");
  assert.equal(plan.mutation_invocation_allowed, false);
});

test("an internal dependency preflight records its run without creating another handoff", async (t) => {
  const root = await workspace(t);
  const draftDirectory = path.join(root, "workplace", "miku-scm", "issue-comments");
  await mkdir(draftDirectory, { recursive: true });
  const draft = "workplace/miku-scm/issue-comments/issue-18-comment-202607271401.md";
  await writeFile(path.join(root, draft), "Dependent batch comment\n", "utf8");
  const issue = {
    number: 18,
    url: "https://github.com/a/b/issues/18",
    title: "Issue 18",
    body: "Body",
    state: "OPEN",
    labels: [],
    updatedAt: "2026-07-27T13:00:00Z",
  };

  const result = await runWorkflow("github.issue.comment.preflight", [
    "--repo", "a/b", "--issue", "18", "--draft", draft,
  ], {
    cwd: root,
    artifactRoot: path.join(root, "runs"),
    runId: "dependency-preflight",
    now: () => new Date("2026-07-27T14:00:00Z"),
    saveIssueApprovalHandoff: false,
    issueCommentDependencies: { readIssue: async () => issue },
  });

  assert.equal(result.status, "success");
  assert.equal(result.result.status, "preflight-ok");
  assert.equal(Object.hasOwn(result.result, "handoff"), false);
  assert.equal(existsSync(path.join(root, "workplace", "miku-scm", "handoffs")), false);
  assert.equal(existsSync(path.join(root, "runs", "dependency-preflight", "result.json")), true);
});

test("Issue handoff apply forwards the single reviewed argument set", async (t) => {
  const root = await workspace(t);
  const draftDirectory = path.join(root, "workplace", "miku-scm", "new-issues");
  await mkdir(draftDirectory, { recursive: true });
  const draft = "workplace/miku-scm/new-issues/issue-new-202607271404.md";
  await writeFile(path.join(root, draft), "Runner handoff\n\nBody\n", "utf8");

  const preflight = await runWorkflow("github.issue.create.preflight", [
    "--repo", "a/b", "--draft", draft,
  ], {
    cwd: root,
    artifactRoot: path.join(root, "runs"),
    runId: "handoff-preflight",
    now: () => new Date("2026-07-27T14:00:00Z"),
    issueCreateDependencies: {
      readLabels: async () => [],
    },
  });
  const calls = [];
  const applied = await runWorkflow("github.issue.handoff.apply", [
    "--apply",
  ], {
    cwd: root,
    artifactRoot: path.join(root, "runs"),
    runId: "handoff-apply",
    now: () => new Date("2026-07-27T14:01:00Z"),
    handoffRunApply: async (workflow, args) => {
      calls.push({ workflow, args });
      return {
        status: "success",
        run_id: "nested-apply",
        mutation_invoked: true,
        human_output: "[SUCCESS] GitHub Issue create\n",
      };
    },
  });

  assert.equal(preflight.result.handoff.status, "pending");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].workflow, "github.issue.create.apply");
  assert.deepEqual(calls[0].args, preflight.result.apply_arguments);
  assert.equal(applied.status, "success");
  assert.equal(applied.delegate_status, "applied");
  assert.match(applied.human_output, /Approval handoff: handoff-preflight \(applied\)/);
});

test("Issue handoff recovery lists, selects, and dismisses exact pending IDs", async (t) => {
  const root = await workspace(t);
  const draftDirectory = path.join(root, "workplace", "miku-scm", "new-issues");
  await mkdir(draftDirectory, { recursive: true });
  const draft = "workplace/miku-scm/new-issues/issue-new-202607271405.md";
  await writeFile(path.join(root, draft), "Runner recovery\n\nBody\n", "utf8");

  for (const runId of ["handoff-first", "handoff-second"]) {
    await runWorkflow("github.issue.create.preflight", [
      "--repo", "a/b", "--draft", draft,
    ], {
      cwd: root,
      artifactRoot: path.join(root, "runs"),
      runId,
      now: () => new Date("2026-07-27T14:02:00Z"),
      issueCreateDependencies: { readLabels: async () => [] },
    });
  }

  const listed = await runWorkflow("github.issue.handoff.list", [], {
    cwd: root,
    artifactRoot: path.join(root, "runs"),
    runId: "handoff-list",
    now: () => new Date("2026-07-27T14:03:00Z"),
  });
  assert.equal(listed.result.pending_count, 2);
  assert.deepEqual(
    listed.result.handoffs.map(({ id }) => id),
    ["handoff-first", "handoff-second"],
  );
  assert.match(listed.human_output, /miku-scm approve handoff-second/);
  assert.match(listed.human_output, /miku-scm dismiss handoff-first/);

  const calls = [];
  const applied = await runWorkflow("github.issue.handoff.apply", [
    "--handoff", "handoff-second", "--apply",
  ], {
    cwd: root,
    artifactRoot: path.join(root, "runs"),
    runId: "handoff-selected-apply",
    now: () => new Date("2026-07-27T14:04:00Z"),
    handoffRunApply: async (workflow, args) => {
      calls.push({ workflow, args });
      return {
        status: "success",
        run_id: "nested-selected-apply",
        mutation_invoked: true,
        human_output: "[SUCCESS] GitHub Issue create\n",
      };
    },
  });
  assert.equal(applied.result.handoff.id, "handoff-second");
  assert.equal(calls.length, 1);

  const dismissed = await runWorkflow("github.issue.handoff.dismiss", [
    "--handoff", "handoff-first", "--apply",
  ], {
    cwd: root,
    artifactRoot: path.join(root, "runs"),
    runId: "handoff-dismiss",
    now: () => new Date("2026-07-27T14:05:00Z"),
  });
  assert.equal(dismissed.status, "success");
  assert.equal(dismissed.delegate_status, "dismissed");
  assert.equal(dismissed.mutation_invoked, true);
  assert.equal(dismissed.result.handoff.status, "not-applied");

  const empty = await runWorkflow("github.issue.handoff.list", [], {
    cwd: root,
    artifactRoot: path.join(root, "runs"),
    runId: "handoff-list-empty",
    now: () => new Date("2026-07-27T14:06:00Z"),
  });
  assert.equal(empty.result.pending_count, 0);
});

test("handoff selection stops are recorded as not-applied before mutation", async (t) => {
  const root = await workspace(t);
  let invoked = false;

  const result = await runWorkflow("github.issue.handoff.apply", [
    "--handoff", "missing-handoff", "--apply",
  ], {
    cwd: root,
    artifactRoot: path.join(root, "runs"),
    runId: "handoff-missing",
    handoffRunApply: async () => { invoked = true; },
  });

  assert.equal(result.status, "not-applied");
  assert.equal(result.mutation_invoked, false);
  assert.equal(invoked, false);
  assert.match(result.error.message, /not found/);
});

test("Issue handoff batch preserves order and reports a partial stop", async (t) => {
  const root = await workspace(t);
  const draftDirectory = path.join(root, "workplace", "miku-scm", "new-issues");
  await mkdir(draftDirectory, { recursive: true });
  const draft = "workplace/miku-scm/new-issues/issue-new-202607271406.md";
  await writeFile(path.join(root, draft), "Runner batch\n\nBody\n", "utf8");

  for (const runId of ["batch-first", "batch-second", "batch-third"]) {
    await runWorkflow("github.issue.create.preflight", [
      "--repo", "a/b", "--draft", draft,
    ], {
      cwd: root,
      artifactRoot: path.join(root, "runs"),
      runId,
      now: () => new Date("2026-07-27T14:07:00Z"),
      issueCreateDependencies: { readLabels: async () => [] },
    });
  }

  let calls = 0;
  const result = await runWorkflow("github.issue.handoff.batch.apply", [
    "--handoff", "batch-second",
    "--handoff", "batch-first",
    "--handoff", "batch-third",
    "--apply",
  ], {
    cwd: root,
    artifactRoot: path.join(root, "runs"),
    runId: "batch-run",
    now: () => new Date("2026-07-27T14:08:00Z"),
    handoffRunApply: async () => {
      calls += 1;
      return calls === 1
        ? {
          status: "success",
          run_id: "nested-batch-first",
          mutation_invoked: true,
          human_output: "[SUCCESS] GitHub Issue create\n",
        }
        : {
          status: "not-applied",
          run_id: "nested-batch-second",
          mutation_invoked: false,
          human_output: "[NOT APPLIED] GitHub Issue create\n",
        };
    },
  });

  assert.equal(result.status, "partial");
  assert.equal(result.delegate_status, "partial");
  assert.equal(result.mutation_invoked, true);
  assert.equal(calls, 2);
  assert.deepEqual(
    result.result.results.map(({ handoff }) => handoff.id),
    ["batch-second", "batch-first"],
  );
  assert.deepEqual(result.result.remaining_handoffs, ["batch-third"]);
  assert.match(result.human_output, /^\[PARTIAL\] GitHub Issue approval handoff batch apply/);
  assert.match(result.human_output, /Remaining handoff: batch-third/);
  const plan = JSON.parse(await readFile(path.join(root, "runs", "batch-run", "plan.json"), "utf8"));
  assert.deepEqual(plan.ordered_handoffs, ["batch-second", "batch-first", "batch-third"]);
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
  let tagLookupResult = { ok: true, out: `${baseHead}\trefs/tags/v20260727c` };
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
      return tagLookupResult;
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
  assert.match(result.human_output, /^Previous branch: devel-tiga0727vda-done$/m);
  assert.match(result.human_output, new RegExp(`^Base commit: ${baseHead}$`, "m"));
  assert.match(result.human_output, /^Tag status: confirmed$/m);
  assert.match(result.human_output, /^Next work branch: devel-tiga0727weg$/m);
  assert.match(result.human_output, /\n\nNext work branch is ready: devel-tiga0727weg\n$/);
  assert.ok(calls.some((args) => args.join(" ") === "fetch origin"));
  const attempt = JSON.parse(await readFile(
    path.join(root, "runs", "post-merge-ok", "attempt.json"),
    "utf8",
  ));
  assert.equal(attempt.status, "success");

  branch = "devel-tiga0727vda-done";
  head = "a".repeat(40);
  tagLookupResult = { ok: false, out: "", err: "remote tag lookup failed" };
  const lookupFailed = await runWorkflow("repository.post-merge.next-work", [
    "--repo", root,
    "--confirmed-merged",
    "--apply",
  ], {
    cwd: root,
    artifactRoot: path.join(root, "runs"),
    runId: "post-merge-tag-lookup-failed",
    now: () => new Date("2026-07-27T22:46:00+09:00"),
    postMergeDependencies: {
      git,
      now: () => new Date("2026-07-27T22:46:00+09:00"),
    },
  });
  assert.equal(lookupFailed.status, "success");
  assert.equal(lookupFailed.result.final_branch, "devel-tiga0727weg");
  assert.equal(lookupFailed.result.tag_status, "lookup-failed");
  assert.equal(lookupFailed.result.tag_target, null);
  assert.match(lookupFailed.human_output, /^Tag status: lookup-failed$/m);
  assert.match(lookupFailed.human_output, /^Final branch: devel-tiga0727weg$/m);
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
      repository: "igapyon-agent-skills",
      pushed_branch: "devel-test",
      final_branch: "devel-test-done",
      final_status: "## devel-test-done...origin/devel-test",
      comparison: "0 0",
      repository_url: "https://github.com/igapyon/igapyon-agent-skills",
      pr_lookup: "confirmed",
      pr_url: "https://github.com/igapyon/igapyon-agent-skills/pull/316",
      version: "1.20260728.6",
      recommended_tag: "v20260728f",
      pull_request_mutation: false,
      tag_mutation: false,
      plan_path: planPath,
      plan_sha256: digest,
      human_handoff: "Create the PR and tag through GitHub.",
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
  assert.match(apply.human_output, /^PR URL: https:\/\/github\.com\/igapyon\/igapyon-agent-skills\/pull\/316$/m);
  assert.match(apply.human_output, /^Recommended tag: v20260728f$/m);
  assert.match(apply.human_output, /^Final status: ## devel-test-done\.\.\.origin\/devel-test$/m);
  assert.match(apply.human_output, /\n\nCreate the PR and tag through GitHub\.\n$/);
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
      ? {
        status: "recommitted",
        mode: "apply",
        mutation_invoked: true,
        repository: "test-repository",
        branch: "devel-test",
        base: "origin/devel",
        backup_branch: "backup/2026-07-28-2200",
        pr_draft: draft,
        new_head: "b".repeat(40),
        final_status: "## devel-test...origin/devel [ahead 1]",
      }
      : {
        status: "preflight-ok",
        mode: "preflight",
        mutation_invoked: false,
        repository: "test-repository",
        branch: "devel-test",
        base: "origin/devel",
        backup_branch: "backup/2026-07-28-2200",
        pr_draft: draft,
        head: "a".repeat(40),
        blockers: [],
        dirty: false,
      };
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
  assert.match(apply.human_output, /Base: origin\/devel/);
  assert.match(apply.human_output, /Backup branch: backup\/2026-07-28-2200/);
  assert.match(apply.human_output, /PR draft: workplace\/miku-scm\/pr-drafts\/pr-test\.md/);
  assert.match(apply.human_output, new RegExp(`New HEAD: ${"b".repeat(40)}`));
  assert.match(apply.human_output, /Final status: ## devel-test\.\.\.origin\/devel \[ahead 1\]/);
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
