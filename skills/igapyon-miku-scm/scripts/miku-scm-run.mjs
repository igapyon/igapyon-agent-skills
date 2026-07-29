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
  parseArgs as parseIssueUpdateArgs,
  runIssueUpdate,
} from "./github-issue-update.mjs";
import {
  parseArgs as parseIssueCommentArgs,
  runIssueComment,
} from "./github-issue-comment.mjs";
import {
  parseArgs as parseIssueLabelArgs,
  runIssueLabelUpdate,
} from "./github-issue-label-update.mjs";
import {
  parseArgs as parseIssueCloseArgs,
  runIssueClose,
} from "./github-issue-close.mjs";
import {
  applyMaintenancePlan,
  diagnose as diagnoseMaintenance,
  parseArgs as parseMaintenanceArgs,
  saveMaintenancePlan,
} from "./repository-maintenance.mjs";
import {
  parseArgs as parsePostMergeArgs,
  run as runPostMergeNextWork,
} from "./post-merge-next-work.mjs";
import {
  executePublish,
  parseArgs as parsePublishArgs,
} from "./post-recommit-publish.mjs";
import {
  parseArgs as parseRecommitArgs,
  runRecommit,
} from "./pr-soft-reset-recommit-preflight.mjs";
import {
  WORKFLOW_MANIFEST,
  WORKFLOW_MANIFEST_VERSION,
  workflowManifestById,
} from "./miku-scm-workflow-manifest.mjs";
import {
  WORKFLOW_CONTRACT_LOCK_VERSION,
  workflowContractById,
} from "./miku-scm-workflow-contract-lock.mjs";
import {
  collectLocalSnapshot,
  parseLocalSnapshotArgs,
} from "./miku-scm-local-snapshot.mjs";
import {
  inspectVersion,
  parseArgs as parseVersionArgs,
} from "./miku-scm-version.mjs";
import {
  parseWritingPrepareArgs,
  prepareWritingEvidence,
} from "./miku-scm-writing-prepare.mjs";
import {
  parseGitHubBatchArgs,
  runGitHubBatch,
} from "./miku-scm-github-readonly.mjs";
import {
  HUMAN_OUTPUT_SCHEMA_VERSION,
  renderHumanOutput,
} from "./miku-scm-human-output.mjs";
import {
  MikuScmCliError,
  PORTABLE_RUNNER,
  cliErrorPayload,
  inputErrorGuidance,
  renderHelp,
  resolveHelpRequest,
  unknownWorkflowError,
} from "./miku-scm-help.mjs";
import {
  applyPendingIssueHandoff,
  createIssueApprovalHandoff,
  parseHandoffApplyArgs,
} from "./miku-scm-handoff.mjs";
import { failureEvent } from "./miku-scm-observability.mjs";

export const RUNNER_SCHEMA_VERSION = "miku-scm.runner/v1";
export const RESULT_SCHEMA_VERSION = "miku-scm.runner-result/v1";
export const PRODUCT_VERSION = "1.20260729.2";

const RUN_ID = /^[A-Za-z0-9._-]+$/;
const SECRET_OPTION = /(?:token|password|secret|authorization|credential)/i;

export const usage = renderHelp(resolveHelpRequest(undefined, []), "human").trimEnd();

export function parseRunnerCliArgs(argv) {
  const args = [...argv];
  let format = "json";
  if (args[0] === "--format") {
    format = args[1] ?? "";
    args.splice(0, 2);
  }
  if (format !== "json" && format !== "human") {
    throw new MikuScmCliError(
      "INVALID_FORMAT",
      "--format must be exactly json or human",
      {
        bad_argument: format,
        valid_values: ["json", "human"],
        help_command: "node <skill-root>/scripts/miku-scm-run.mjs --help",
      },
    );
  }
  const [workflowId, ...workflowArguments] = args;
  return { format, workflowId, workflowArguments };
}

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
      if (mode === "apply" && !options.expectedContractPairSha256) {
        throw new Error("github.issue.create.apply requires the reviewed workflow contract digest");
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

const ISSUE_MUTATION_DELEGATES = Object.freeze({
  update: {
    parse: parseIssueUpdateArgs,
    run: runIssueUpdate,
    dependency: "issueUpdateExecute",
    runDependencies: "issueUpdateDependencies",
  },
  comment: {
    parse: parseIssueCommentArgs,
    run: runIssueComment,
    dependency: "issueCommentExecute",
    runDependencies: "issueCommentDependencies",
  },
  label: {
    parse: parseIssueLabelArgs,
    run: runIssueLabelUpdate,
    dependency: "issueLabelExecute",
    runDependencies: "issueLabelDependencies",
  },
  close: {
    parse: parseIssueCloseArgs,
    run: runIssueClose,
    dependency: "issueCloseExecute",
    runDependencies: "issueCloseDependencies",
  },
});

function issueMutationWorkflow(kind, mode, dependencies) {
  const delegate = ISSUE_MUTATION_DELEGATES[kind];
  return {
    version: 1,
    mutationLevel: mode === "apply" ? "remote" : "readonly",
    approvalGate: mode,
    parse(argv, cwd) {
      const options = delegate.parse(argv, cwd);
      if (mode === "preflight" && options.apply) {
        throw new Error(`github.issue.${kind}.preflight rejects --apply`);
      }
      if (mode === "apply" && !options.apply) {
        throw new Error(`github.issue.${kind}.apply requires --apply and reviewed digests`);
      }
      if (mode === "apply" && !options.expectedContractPairSha256) {
        throw new Error(`github.issue.${kind}.apply requires the reviewed workflow contract digest`);
      }
      return options;
    },
    plan(options) {
      return {
        operation: `github-issue-${kind}-${mode}`,
        repository: options.repository,
        issue: options.issueNumber,
        draft: options.draft || null,
        labels: kind === "label" || kind === "update"
          ? { add: options.addLabels, remove: options.removeLabels }
          : null,
        reason: options.reason || null,
        duplicate_of: options.duplicateOf || null,
        mutation_invocation_allowed: mode === "apply",
      };
    },
    execute(options) {
      const implementation = dependencies[delegate.dependency] ?? delegate.run;
      return implementation(options, dependencies[delegate.runDependencies]);
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

function publishWorkflow(mode, dependencies) {
  return {
    version: 1,
    mutationLevel: mode === "apply" ? "remote" : "readonly",
    approvalGate: mode,
    parse(argv, cwd) {
      const options = parsePublishArgs(argv, cwd);
      if (mode === "preflight" && !options.savePlan) {
        throw new Error("pr.publish.preflight requires --save-plan");
      }
      if (mode === "apply" && !options.applyPlan) {
        throw new Error("pr.publish.apply requires --apply-plan and its reviewed digest");
      }
      return options;
    },
    plan(options) {
      return {
        operation: mode === "apply" ? "pr-publish-apply" : "pr-publish-preflight",
        repository: path.resolve(options.repo),
        remote: options.remote,
        reviewed_head: options.expectedHead || null,
        reviewed_plan: options.applyPlan || null,
        mutation_invocation_allowed: mode === "apply",
      };
    },
    execute(options) {
      const implementation = dependencies.publishExecute ?? executePublish;
      return implementation(options, dependencies.publishDependencies);
    },
  };
}

function recommitWorkflow(mode, dependencies) {
  return {
    version: 1,
    mutationLevel: mode === "apply" ? "local" : "readonly",
    approvalGate: mode,
    parse(argv, cwd) {
      const options = parseRecommitArgs(argv, cwd);
      if (mode === "preflight" && (options.apply || options.allowDirty)) {
        throw new Error("pr.recommit.preflight rejects --apply and --allow-dirty");
      }
      if (mode === "apply" && !options.apply) {
        throw new Error("pr.recommit.apply requires --apply");
      }
      if (mode === "apply" && (!options.base || !options.prDraft)) {
        throw new Error("pr.recommit.apply requires explicit --base and --pr-draft");
      }
      return options;
    },
    plan(options) {
      return {
        operation: mode === "apply" ? "pr-recommit-apply" : "pr-recommit-preflight",
        repository: path.resolve(options.repo),
        base: options.base || null,
        pr_draft: options.prDraft || null,
        allow_dirty: Boolean(options.allowDirty),
        mutation_invocation_allowed: mode === "apply",
      };
    },
    execute(options) {
      const implementation = dependencies.recommitExecute ?? runRecommit;
      return implementation(options, dependencies.recommitDependencies);
    },
  };
}

function versionWorkflow(mode, dependencies) {
  return {
    version: 1,
    mutationLevel: "readonly",
    approvalGate: mode === "status" ? "none" : "preflight",
    parse(argv, cwd) {
      const options = parseVersionArgs(argv, cwd);
      if (mode === "status" && options.validateIncrement) {
        throw new Error("version.status rejects --validate-increment");
      }
      if (mode === "validate" && !options.validateIncrement) {
        throw new Error("version.increment.validate requires --validate-increment");
      }
      if (mode === "validate" && options.policy === "auto") {
        throw new Error("version.increment.validate requires explicit --policy");
      }
      return options;
    },
    plan(options) {
      return {
        operation: mode === "status" ? "version-status" : "version-increment-validation",
        repository: path.resolve(options.repo),
        version_files: options.versionFiles,
        coupled_version_files: options.coupledVersionFiles,
        policy: options.policy,
        timezone: options.timezone || null,
        level: options.level || null,
        mutation_invocation_allowed: false,
      };
    },
    execute(options) {
      const implementation = dependencies.versionExecute ?? inspectVersion;
      return implementation(options, dependencies.versionDependencies);
    },
  };
}

function writingWorkflow(mode, dependencies) {
  return {
    version: 1,
    mutationLevel: "readonly",
    approvalGate: "none",
    parse: (argv, cwd) => parseWritingPrepareArgs(mode, argv, cwd),
    plan: (options) => ({
      operation: `writing-${mode}-prepare`,
      repository: path.resolve(options.repo),
      target: options.target || null,
      github_repository: options.githubRepository || null,
      issue: options.issue,
      mutation_invocation_allowed: false,
    }),
    execute: (options) => prepareWritingEvidence(options, {
      git: dependencies.writingGit,
      gh: dependencies.gh,
      readFile: dependencies.writingReadFile,
      now: dependencies.now,
    }),
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
    ["github.issue.update.preflight", issueMutationWorkflow("update", "preflight", dependencies)],
    ["github.issue.update.apply", issueMutationWorkflow("update", "apply", dependencies)],
    ["github.issue.comment.preflight", issueMutationWorkflow("comment", "preflight", dependencies)],
    ["github.issue.comment.apply", issueMutationWorkflow("comment", "apply", dependencies)],
    ["github.issue.label.preflight", issueMutationWorkflow("label", "preflight", dependencies)],
    ["github.issue.label.apply", issueMutationWorkflow("label", "apply", dependencies)],
    ["github.issue.close.preflight", issueMutationWorkflow("close", "preflight", dependencies)],
    ["github.issue.close.apply", issueMutationWorkflow("close", "apply", dependencies)],
    ["github.issue.handoff.apply", {
      version: 1,
      mutationLevel: "remote",
      approvalGate: "apply",
      parse: parseHandoffApplyArgs,
      plan: (options) => ({
        operation: "github-issue-approval-handoff-apply",
        repository: path.resolve(options.root),
        mutation_invocation_allowed: true,
      }),
      execute: (options) => applyPendingIssueHandoff(options, {
        now: dependencies.now,
        runApply: dependencies.handoffRunApply ?? ((applyWorkflow, applyArguments) => runWorkflow(
          applyWorkflow,
          applyArguments,
          { cwd: options.root },
        )),
      }),
    }],
    ["repository.maintenance.diagnose", maintenanceWorkflow("diagnose", dependencies)],
    ["repository.maintenance.plan", maintenanceWorkflow("plan", dependencies)],
    ["repository.maintenance.apply", maintenanceWorkflow("apply", dependencies)],
    ["repository.post-merge.next-work", {
      version: 1,
      mutationLevel: "local",
      approvalGate: "apply",
      parse: parsePostMergeArgs,
      plan: (options) => ({
        operation: "post-merge-next-work",
        repository: path.resolve(options.repo),
        remote: options.remote,
        base: options.base || null,
        confirmed_merge: options.confirmedMerged,
        mutation_invocation_allowed: true,
      }),
      execute: (options) => runPostMergeNextWork(
        options,
        dependencies.postMergeDependencies,
      ),
    }],
    ["pr.publish.preflight", publishWorkflow("preflight", dependencies)],
    ["pr.publish.apply", publishWorkflow("apply", dependencies)],
    ["pr.recommit.preflight", recommitWorkflow("preflight", dependencies)],
    ["pr.recommit.apply", recommitWorkflow("apply", dependencies)],
    ["version.status", versionWorkflow("status", dependencies)],
    ["version.increment.validate", versionWorkflow("validate", dependencies)],
    ["writing.issue.prepare", writingWorkflow("issue", dependencies)],
    ["writing.pr.prepare", writingWorkflow("pr", dependencies)],
    ["writing.release.prepare", writingWorkflow("release", dependencies)],
    ["writing.about.prepare", writingWorkflow("about", dependencies)],
  ]);
  const manifest = workflowManifestById();
  const contracts = workflowContractById();
  if (manifest.size !== implementations.size
    || contracts.size !== implementations.size
    || [...implementations.keys()].some((id) => !manifest.has(id) || !contracts.has(id))) {
    throw new Error("Workflow manifest and runner implementation registry are inconsistent");
  }
  return new Map([...implementations].map(([id, implementation]) => {
    const metadata = manifest.get(id);
    const contract = contracts.get(id);
    if (metadata.mutation_level !== implementation.mutationLevel
      || metadata.approval_gate !== implementation.approvalGate
      || metadata.contract_id !== contract.contract_id
      || metadata.contract_version !== contract.contract_version
      || metadata.runner_entry !== contract.runner_entry
      || metadata.contract_spec !== contract.contract_spec
      || metadata.contract_test !== contract.contract_test) {
      throw new Error(`Workflow manifest safety metadata mismatch: ${id}`);
    }
    return [id, { ...implementation, manifest: metadata, contract }];
  }));
}

export async function runWorkflow(workflowId, argv, dependencies = {}) {
  const registry = dependencies.registry ?? workflowRegistry(dependencies);
  const workflow = registry.get(workflowId);
  if (!workflow) throw new Error(`Unknown workflow ID: ${workflowId}`);
  if (!Array.isArray(argv) || argv.some((value) => typeof value !== "string")) {
    throw new Error("Workflow arguments must be a string array");
  }
  if (argv.includes("--help") || argv.includes("-h")) {
    throw new MikuScmCliError(
      "HELP_REQUEST_REQUIRES_CLI",
      `Workflow help must be resolved before execution: ${workflowId}`,
      { workflow: workflowId, help_command: `node <skill-root>/scripts/miku-scm-run.mjs help ${workflowId}` },
    );
  }
  const requiresApplyFlag = workflow.manifest.approval_gate === "apply"
    && workflow.manifest.cli.options.some((entry) => entry.flag === "--apply" && entry.required);

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
  const contractFields = {
    workflow_contract: workflow.contract.contract_id,
    contract_version: workflow.contract.contract_version,
    contract_pair_sha256: workflow.contract.pair_sha256,
    workflow_contract_lock_version: WORKFLOW_CONTRACT_LOCK_VERSION,
  };
  const request = {
    schema_version: RUNNER_SCHEMA_VERSION,
    run_id: runId,
    workflow: workflowId,
    workflow_version: workflow.version,
    workflow_manifest_version: WORKFLOW_MANIFEST_VERSION,
    mutation_level: workflow.mutationLevel,
    approval_gate: workflow.approvalGate,
    ...contractFields,
    arguments: publicArguments(argv),
    started_at: startedAt,
  };
  await writeJsonAtomic(path.join(runDirectory, "request.json"), request);

  let plan;
  let phase = "parse";
  let executeStarted = false;
  try {
    if (requiresApplyFlag && !argv.includes("--apply")) {
      throw new MikuScmCliError(
        "EXPLICIT_APPLY_REQUIRED",
        `${workflowId} requires --apply before execution`,
        {
          workflow: workflowId,
          help_command: `node <skill-root>/scripts/miku-scm-run.mjs help ${workflowId}`,
        },
      );
    }
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
      ...contractFields,
      ...workflow.plan(options),
    };
    await writeJsonAtomic(path.join(runDirectory, "plan.json"), plan);
    phase = "delegate";
    executeStarted = true;
    let delegateResult = await workflow.execute(options);
    const finishedAt = (dependencies.now ? dependencies.now() : new Date()).toISOString();
    if (workflowId.startsWith("github.issue.")
      && workflowId.endsWith(".preflight")
      && delegateResult?.status === "preflight-ok"
      && Array.isArray(delegateResult.apply_arguments)) {
      const summary = renderHumanOutput({
        workflow: workflowId,
        status: "success",
        approvalGate: workflow.approvalGate,
        delegateStatus: delegateResult.status,
        mutationInvoked: false,
        result: delegateResult,
      });
      const handoff = await createIssueApprovalHandoff({
        root: cwd,
        runId,
        preflightWorkflow: workflowId,
        applyWorkflow: workflowId.replace(/\.preflight$/, ".apply"),
        applyArguments: [...delegateResult.apply_arguments],
        reviewedResult: delegateResult,
        humanSummary: summary,
        createdAt: finishedAt,
      });
      delegateResult = { ...delegateResult, handoff };
    }
    const result = {
      schema_version: RESULT_SCHEMA_VERSION,
      run_id: runId,
      workflow: workflowId,
      workflow_version: workflow.version,
      workflow_manifest_version: WORKFLOW_MANIFEST_VERSION,
      mutation_level: workflow.mutationLevel,
      approval_gate: workflow.approvalGate,
      ...contractFields,
      status: normalizedStatus(delegateResult?.status, workflow.mutationLevel),
      delegate_status: delegateResult?.status ?? null,
      started_at: startedAt,
      finished_at: finishedAt,
      duration_ms: Math.round((performance.now() - performanceStarted) * 1000) / 1000,
      mutation_invoked: mutationState(workflow, delegateResult?.status),
      run_directory: path.relative(cwd, runDirectory),
      result: delegateResult,
    };
    result.human_output_schema_version = HUMAN_OUTPUT_SCHEMA_VERSION;
    result.human_output = renderHumanOutput({
      workflow: workflowId,
      status: result.status,
      approvalGate: workflow.approvalGate,
      delegateStatus: result.delegate_status,
      mutationInvoked: result.mutation_invoked,
      result: delegateResult,
    });
    await writeJsonAtomic(path.join(runDirectory, "snapshot.json"), {
      schema_version: RUNNER_SCHEMA_VERSION,
      run_id: runId,
      workflow: workflowId,
      ...contractFields,
      delegate_result: delegateResult,
    });
    if (workflow.approvalGate === "apply") {
      await writeJsonAtomic(path.join(runDirectory, "attempt.json"), {
        schema_version: RUNNER_SCHEMA_VERSION,
        run_id: runId,
        workflow: workflowId,
        ...contractFields,
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
    const delegatedMutationState = error && typeof error === "object"
      && Object.hasOwn(error, "mutationInvoked")
      ? error.mutationInvoked
      : undefined;
    const mutationInvoked = delegatedMutationState !== undefined
      ? delegatedMutationState
      : executeStarted && workflow.approvalGate === "apply"
        ? null
        : false;
    const event = failureEvent({
      workflow: workflowId,
      phase,
      commandId: `${workflowId}:${phase}`,
      message,
      mutationInvoked,
    });
    let guidance = event.classification === "invalid-input"
      ? inputErrorGuidance(message, workflowId)
      : {};
    if (error instanceof MikuScmCliError) {
      guidance = {
        ...guidance,
        code: error.code,
        ...(error.help_command ? { help_command: error.help_command } : {}),
      };
    }
    const result = {
      schema_version: RESULT_SCHEMA_VERSION,
      run_id: runId,
      workflow: workflowId,
      workflow_version: workflow.version,
      workflow_manifest_version: WORKFLOW_MANIFEST_VERSION,
      mutation_level: workflow.mutationLevel,
      approval_gate: workflow.approvalGate,
      ...contractFields,
      status: mutationInvoked === false
        ? "not-applied"
        : executeStarted && workflow.approvalGate === "apply"
          ? "unresolved"
          : executeStarted
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
        ...guidance,
      },
    };
    result.human_output_schema_version = HUMAN_OUTPUT_SCHEMA_VERSION;
    result.human_output = renderHumanOutput({
      workflow: workflowId,
      status: result.status,
      approvalGate: workflow.approvalGate,
      delegateStatus: result.delegate_status,
      mutationInvoked: result.mutation_invoked,
      error: result.error,
    });
    if (workflow.approvalGate === "apply") {
      await writeJsonAtomic(path.join(runDirectory, "attempt.json"), {
        schema_version: RUNNER_SCHEMA_VERSION,
        run_id: runId,
        workflow: workflowId,
        ...contractFields,
        status: result.status,
        delegate_status: null,
      });
    }
    await writeJsonAtomic(path.join(runDirectory, "snapshot.json"), {
      schema_version: RUNNER_SCHEMA_VERSION,
      run_id: runId,
      workflow: workflowId,
      ...contractFields,
      error: result.error,
    });
    await writeJsonAtomic(path.join(runDirectory, "error-event.json"), {
      schema_version: RUNNER_SCHEMA_VERSION,
      run_id: runId,
      ...contractFields,
      ...event,
      ...guidance,
      message,
      recorded_at: finishedAt,
    });
    await writeJsonAtomic(path.join(runDirectory, "result.json"), result);
    return result;
  }
}

async function main() {
  const rawArguments = process.argv.slice(2);
  const { format, workflowId, workflowArguments } = parseRunnerCliArgs(rawArguments);
  if (workflowId === "--version") {
    if (workflowArguments.length > 0) {
      throw new MikuScmCliError(
        "UNEXPECTED_ARGUMENT",
        "--version does not accept workflow arguments",
        {
          bad_arguments: [...workflowArguments],
          help_command: `${PORTABLE_RUNNER} --version`,
        },
      );
    }
    process.stdout.write(`${PRODUCT_VERSION}\n`);
    return;
  }
  const help = resolveHelpRequest(workflowId, workflowArguments);
  if (help) {
    const helpFormat = rawArguments[0] === "--format" ? format : "human";
    process.stdout.write(renderHelp(help, helpFormat));
    return;
  }
  if (!WORKFLOW_MANIFEST.some((entry) => entry.id === workflowId)) {
    throw unknownWorkflowError(workflowId);
  }
  const result = await runWorkflow(workflowId, workflowArguments);
  process.stdout.write(format === "human"
    ? result.human_output
    : `${JSON.stringify(result, null, 2)}\n`);
  if (result.status !== "success") process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify(cliErrorPayload(error), null, 2)}\n`);
    process.exitCode = 1;
  });
}
