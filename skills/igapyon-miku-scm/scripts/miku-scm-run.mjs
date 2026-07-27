#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

import {
  parseArgs as parseIssueCreateArgs,
  runIssueCreate,
} from "./github-issue-create.mjs";
import {
  parseArgs as parseIssueReadArgs,
  runIssueRead,
} from "./github-issue-read.mjs";
import {
  applyMaintenancePlan,
  diagnose as diagnoseMaintenance,
  parseArgs as parseMaintenanceArgs,
  saveMaintenancePlan,
} from "./repository-maintenance.mjs";
import {
  WORKFLOW_MANIFEST,
  WORKFLOW_MANIFEST_VERSION,
  workflowManifestById,
} from "./miku-scm-workflow-manifest.mjs";
import {
  collectLocalSnapshot,
  parseLocalSnapshotArgs,
} from "./miku-scm-local-snapshot.mjs";
import {
  parseGitHubBatchArgs,
  runGitHubBatch,
} from "./miku-scm-github-readonly.mjs";
import { failureEvent } from "./miku-scm-observability.mjs";

export const RUNNER_SCHEMA_VERSION = "miku-scm.runner/v1";
export const RESULT_SCHEMA_VERSION = "miku-scm.runner-result/v1";

const RUN_ID = /^[A-Za-z0-9._-]+$/;
const SECRET_OPTION = /(?:token|password|secret|authorization|credential)/i;

export const usage = `Usage:
  node skills/igapyon-miku-scm/scripts/miku-scm-run.mjs <workflow-id> [fixed workflow options]

Workflow IDs:
  repository.status
  github.issue.read
  github.read.batch
  github.issue.create.preflight
  github.issue.create.apply
  repository.maintenance.diagnose
  repository.maintenance.plan
  repository.maintenance.apply

The runner accepts only options validated by the selected workflow's existing
static helper. It never accepts a shell command, executable name, command
fragment, or arbitrary pass-through option.`;

function publicArguments(argv) {
  const output = [];
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value.startsWith("--") && SECRET_OPTION.test(value)) {
      const equals = value.indexOf("=");
      if (equals >= 0) {
        output.push(`${value.slice(0, equals)}=<redacted>`);
      } else {
        output.push(value);
        if (index + 1 < argv.length) {
          output.push("<redacted>");
          index += 1;
        }
      }
      continue;
    }
    output.push(value);
  }
  return output.map((value) => (
    typeof value === "string" && path.isAbsolute(value) ? "<absolute-path>" : value
  ));
}

function normalizedStatus(delegateStatus, mutationLevel, error = false) {
  if (delegateStatus === "not-applied" || delegateStatus === "conflict"
    || delegateStatus === "unresolved") return delegateStatus;
  if (!error) return "success";
  return mutationLevel === "remote" ? "unresolved" : "not-applied";
}

function mutationState(workflow, delegateStatus) {
  if (workflow.approvalGate !== "apply" || workflow.mutationLevel === "readonly") return false;
  if (delegateStatus === "not-applied" || delegateStatus === "conflict") return false;
  if (delegateStatus === "unresolved") return null;
  return true;
}

async function writeJsonAtomic(file, value) {
  const temporary = `${file}.tmp-${process.pid}-${randomUUID()}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(temporary, file);
}

function createRunId(now = new Date()) {
  return `${now.toISOString().replace(/[-:.TZ]/g, "")}-${randomUUID()}`;
}

function issueCreateWorkflow(mode, dependencies) {
  return {
    version: 1,
    mutationLevel: mode === "apply" ? "remote" : "readonly",
    approvalGate: mode,
    parse(argv, cwd) {
      const options = parseIssueCreateArgs(argv, cwd);
      if (mode === "preflight" && options.apply) {
        throw new Error("github.issue.create.preflight rejects --apply");
      }
      if (mode === "apply" && !options.apply) {
        throw new Error("github.issue.create.apply requires --apply and reviewed digests");
      }
      return options;
    },
    plan(options) {
      return {
        operation: mode === "apply" ? "github-issue-create-apply" : "github-issue-create-preflight",
        repository: options.repository,
        draft: options.draft,
        labels: options.labels,
        parent: options.parent,
        mutation_invocation_allowed: mode === "apply",
      };
    },
    execute(options) {
      return runIssueCreate(options, dependencies.issueCreateDependencies);
    },
  };
}

function maintenanceWorkflow(mode, dependencies) {
  return {
    version: 1,
    mutationLevel: mode === "apply" ? "local" : "readonly",
    approvalGate: mode === "diagnose" ? "none" : mode === "plan" ? "preflight" : "apply",
    parse(argv, cwd) {
      const options = parseMaintenanceArgs(argv, cwd);
      if (mode === "diagnose" && (options.savePlan || options.applyPlan)) {
        throw new Error("repository.maintenance.diagnose accepts diagnosis options only");
      }
      if (mode === "plan" && (!options.savePlan || options.applyPlan)) {
        throw new Error("repository.maintenance.plan requires --save-plan");
      }
      if (mode === "apply" && !options.applyPlan) {
        throw new Error("repository.maintenance.apply requires --apply-plan and its reviewed digest");
      }
      return options;
    },
    plan(options) {
      return {
        operation: `repository-maintenance-${mode}`,
        repository: path.resolve(options.repo),
        remote: options.remote,
        reviewed_plan: options.applyPlan || null,
        mutation_invocation_allowed: mode === "apply",
      };
    },
    async execute(options) {
      const maintenanceDependencies = dependencies.maintenanceDependencies;
      if (mode === "apply") return applyMaintenancePlan(options, maintenanceDependencies);
      const diagnosis = await diagnoseMaintenance(options, maintenanceDependencies);
      return mode === "plan" ? saveMaintenancePlan(diagnosis, maintenanceDependencies) : diagnosis;
    },
  };
}

export function workflowRegistry(dependencies = {}) {
  const implementations = new Map([
    ["repository.status", {
      version: 1,
      mutationLevel: "readonly",
      approvalGate: "none",
      parse: parseLocalSnapshotArgs,
      plan: (options) => ({
        operation: "local-repository-snapshot",
        repository: path.resolve(options.repo),
        version_files: options.versionFiles,
        mutation_invocation_allowed: false,
      }),
      execute: (options) => collectLocalSnapshot(options, dependencies.localSnapshotDependencies),
    }],
    ["github.issue.read", {
      version: 1,
      mutationLevel: "readonly",
      approvalGate: "none",
      parse: parseIssueReadArgs,
      plan: (options) => ({
        operation: "github-issue-read",
        repository: options.repo,
        mode: options.mode,
        state: options.mode === "list" ? options.state : null,
        issue: options.issue,
        mutation_invocation_allowed: false,
      }),
      execute: (options) => runIssueRead(options, { gh: dependencies.gh }),
    }],
    ["github.read.batch", {
      version: 1,
      mutationLevel: "readonly",
      approvalGate: "none",
      parse: parseGitHubBatchArgs,
      plan: (options) => ({
        operation: "github-readonly-batch",
        repository: options.repository,
        queries: [...new Set(options.queries)],
        refresh: options.refresh,
        mutation_invocation_allowed: false,
      }),
      execute: (options) => runGitHubBatch(options, {
        gh: dependencies.gh,
        now: dependencies.now,
      }),
    }],
    ["github.issue.create.preflight", issueCreateWorkflow("preflight", dependencies)],
    ["github.issue.create.apply", issueCreateWorkflow("apply", dependencies)],
    ["repository.maintenance.diagnose", maintenanceWorkflow("diagnose", dependencies)],
    ["repository.maintenance.plan", maintenanceWorkflow("plan", dependencies)],
    ["repository.maintenance.apply", maintenanceWorkflow("apply", dependencies)],
  ]);
  const manifest = workflowManifestById();
  if (manifest.size !== implementations.size
    || [...implementations.keys()].some((id) => !manifest.has(id))) {
    throw new Error("Workflow manifest and runner implementation registry are inconsistent");
  }
  return new Map([...implementations].map(([id, implementation]) => {
    const metadata = manifest.get(id);
    if (metadata.mutation_level !== implementation.mutationLevel
      || metadata.approval_gate !== implementation.approvalGate) {
      throw new Error(`Workflow manifest safety metadata mismatch: ${id}`);
    }
    return [id, { ...implementation, manifest: metadata }];
  }));
}

export async function runWorkflow(workflowId, argv, dependencies = {}) {
  const registry = dependencies.registry ?? workflowRegistry(dependencies);
  const workflow = registry.get(workflowId);
  if (!workflow) throw new Error(`Unknown workflow ID: ${workflowId}`);
  if (!Array.isArray(argv) || argv.some((value) => typeof value !== "string")) {
    throw new Error("Workflow arguments must be a string array");
  }

  const cwd = path.resolve(dependencies.cwd ?? process.cwd());
  const now = dependencies.now ? dependencies.now() : new Date();
  const runId = dependencies.runId ?? createRunId(now);
  if (!RUN_ID.test(runId)) throw new Error("Invalid internal run ID");
  const runsRoot = path.resolve(dependencies.artifactRoot ?? path.join(cwd, "workplace", "miku-scm", "runs"));
  const runDirectory = path.join(runsRoot, runId);
  await mkdir(runsRoot, { recursive: true, mode: 0o700 });
  await mkdir(runDirectory, { recursive: false, mode: 0o700 });

  const startedAt = now.toISOString();
  const performanceStarted = performance.now();
  const request = {
    schema_version: RUNNER_SCHEMA_VERSION,
    run_id: runId,
    workflow: workflowId,
    workflow_version: workflow.version,
    workflow_manifest_version: WORKFLOW_MANIFEST_VERSION,
    mutation_level: workflow.mutationLevel,
    approval_gate: workflow.approvalGate,
    arguments: publicArguments(argv),
    started_at: startedAt,
  };
  await writeJsonAtomic(path.join(runDirectory, "request.json"), request);

  let plan;
  let phase = "parse";
  let executeStarted = false;
  try {
    const options = workflow.parse(argv, cwd);
    phase = "plan";
    plan = {
      schema_version: RUNNER_SCHEMA_VERSION,
      run_id: runId,
      workflow: workflowId,
      workflow_version: workflow.version,
      workflow_manifest_version: WORKFLOW_MANIFEST_VERSION,
      mutation_level: workflow.mutationLevel,
      approval_gate: workflow.approvalGate,
      ...workflow.plan(options),
    };
    await writeJsonAtomic(path.join(runDirectory, "plan.json"), plan);
    phase = "delegate";
    executeStarted = true;
    const delegateResult = await workflow.execute(options);
    const finishedAt = (dependencies.now ? dependencies.now() : new Date()).toISOString();
    const result = {
      schema_version: RESULT_SCHEMA_VERSION,
      run_id: runId,
      workflow: workflowId,
      workflow_version: workflow.version,
      workflow_manifest_version: WORKFLOW_MANIFEST_VERSION,
      mutation_level: workflow.mutationLevel,
      approval_gate: workflow.approvalGate,
      status: normalizedStatus(delegateResult?.status, workflow.mutationLevel),
      delegate_status: delegateResult?.status ?? null,
      started_at: startedAt,
      finished_at: finishedAt,
      duration_ms: Math.round((performance.now() - performanceStarted) * 1000) / 1000,
      mutation_invoked: mutationState(workflow, delegateResult?.status),
      run_directory: path.relative(cwd, runDirectory),
      result: delegateResult,
    };
    await writeJsonAtomic(path.join(runDirectory, "snapshot.json"), {
      schema_version: RUNNER_SCHEMA_VERSION,
      run_id: runId,
      workflow: workflowId,
      delegate_result: delegateResult,
    });
    if (workflow.approvalGate === "apply") {
      await writeJsonAtomic(path.join(runDirectory, "attempt.json"), {
        schema_version: RUNNER_SCHEMA_VERSION,
        run_id: runId,
        workflow: workflowId,
        status: result.status,
        delegate_status: result.delegate_status,
        delegate_attempt_record: delegateResult?.attempt_record ?? null,
      });
    }
    await writeJsonAtomic(path.join(runDirectory, "result.json"), result);
    return result;
  } catch (error) {
    const finishedAt = (dependencies.now ? dependencies.now() : new Date()).toISOString();
    const message = error instanceof Error ? error.message : String(error);
    const mutationInvoked = executeStarted && workflow.approvalGate === "apply"
      ? null
      : false;
    const event = failureEvent({
      workflow: workflowId,
      phase,
      commandId: `${workflowId}:${phase}`,
      message,
      mutationInvoked,
    });
    const result = {
      schema_version: RESULT_SCHEMA_VERSION,
      run_id: runId,
      workflow: workflowId,
      workflow_version: workflow.version,
      workflow_manifest_version: WORKFLOW_MANIFEST_VERSION,
      mutation_level: workflow.mutationLevel,
      approval_gate: workflow.approvalGate,
      status: executeStarted
        ? normalizedStatus(null, workflow.mutationLevel, true)
        : "not-applied",
      delegate_status: null,
      started_at: startedAt,
      finished_at: finishedAt,
      duration_ms: Math.round((performance.now() - performanceStarted) * 1000) / 1000,
      mutation_invoked: mutationInvoked,
      run_directory: path.relative(cwd, runDirectory),
      error: {
        name: error instanceof Error ? error.name : "Error",
        message,
        ...event,
      },
    };
    if (workflow.approvalGate === "apply") {
      await writeJsonAtomic(path.join(runDirectory, "attempt.json"), {
        schema_version: RUNNER_SCHEMA_VERSION,
        run_id: runId,
        workflow: workflowId,
        status: result.status,
        delegate_status: null,
      });
    }
    await writeJsonAtomic(path.join(runDirectory, "snapshot.json"), {
      schema_version: RUNNER_SCHEMA_VERSION,
      run_id: runId,
      workflow: workflowId,
      error: result.error,
    });
    await writeJsonAtomic(path.join(runDirectory, "error-event.json"), {
      schema_version: RUNNER_SCHEMA_VERSION,
      run_id: runId,
      ...event,
      message,
      recorded_at: finishedAt,
    });
    await writeJsonAtomic(path.join(runDirectory, "result.json"), result);
    return result;
  }
}

async function main() {
  const [workflowId, ...argv] = process.argv.slice(2);
  if (!workflowId || workflowId === "--help" || workflowId === "-h") {
    process.stdout.write(`${usage}\n`);
    return;
  }
  const result = await runWorkflow(workflowId, argv);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.status !== "success") process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({
      schema_version: RESULT_SCHEMA_VERSION,
      status: "not-applied",
      error: { name: error.name, message: error.message },
    }, null, 2)}\n`);
    process.exitCode = 1;
  });
}
