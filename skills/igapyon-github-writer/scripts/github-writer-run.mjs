#!/usr/bin/env node

import {
  backupApply,
  backupPreflight,
  branchStatus,
  failureEnvelope,
  prepareAboutEvidence,
  prepareGitEvidence,
  recommitApply,
  recommitPreflight,
  successEnvelope,
  validateAndSaveDraft,
} from "./github-writer-kernel.mjs";
import {
  WORKFLOW_DEFINITIONS,
  workflowById,
} from "./github-writer-workflow-manifest.mjs";
import {
  renderHelp,
  resolveHelpRequest,
} from "./github-writer-help.mjs";
import {
  attachRunArtifacts,
  createRunContext,
  recordRunResult,
} from "./github-writer-observability.mjs";
import { pathToFileURL } from "node:url";

export const usage = renderHelp(resolveHelpRequest(undefined, []), "human").trimEnd();

function readOption(argv, index, name) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

function parseOptions(workflow, argv, cwd = process.cwd()) {
  const definition = workflowById(workflow);
  const allowed = new Set(definition.allowed_options.map((entry) => entry.flag));
  const options = {
    repo: cwd,
    target: "",
    documents: [],
    mode: "",
    input: "",
    backupName: "",
    plan: "",
    expectedPlanSha256: "",
    base: "",
    prDraft: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!allowed.has(argument)) throw new Error(`${workflow} does not accept ${argument}`);
    if (argument === "--repo") options.repo = readOption(argv, index++, "--repo");
    else if (argument === "--target") options.target = readOption(argv, index++, "--target");
    else if (argument === "--document") options.documents.push(readOption(argv, index++, "--document"));
    else if (argument === "--mode") options.mode = readOption(argv, index++, "--mode");
    else if (argument === "--input") options.input = readOption(argv, index++, "--input");
    else if (argument === "--backup-name") options.backupName = readOption(argv, index++, "--backup-name");
    else if (argument === "--plan") options.plan = readOption(argv, index++, "--plan");
    else if (argument === "--expected-plan-sha256") {
      options.expectedPlanSha256 = readOption(argv, index++, "--expected-plan-sha256");
    } else if (argument === "--base") options.base = readOption(argv, index++, "--base");
    else if (argument === "--pr-draft") options.prDraft = readOption(argv, index++, "--pr-draft");
  }

  if (workflow === "release.evidence" && !options.target) {
    throw new Error("release.evidence requires --target");
  }
  if (workflow === "about.evidence" && options.target) {
    throw new Error("about.evidence does not accept --target");
  }
  if (workflow === "draft.validate-and-save") {
    if (!["pr", "release", "about"].includes(options.mode)) {
      throw new Error("draft.validate-and-save requires --mode pr|release|about");
    }
    if (!options.input) throw new Error("draft.validate-and-save requires --input");
  }
  if (workflow === "backup.apply" || workflow === "pr.recommit.apply") {
    if (!options.plan || !options.expectedPlanSha256) {
      throw new Error(`${workflow} requires --plan and --expected-plan-sha256`);
    }
  }
  if (workflow === "pr.recommit.preflight" && !options.prDraft) {
    throw new Error("pr.recommit.preflight requires --pr-draft");
  }
  return options;
}

function execute(workflow, options) {
  if (workflow === "pr.evidence") {
    return prepareGitEvidence({ ...options, mode: "pr" });
  }
  if (workflow === "release.evidence") {
    return prepareGitEvidence({ ...options, mode: "release" });
  }
  if (workflow === "about.evidence") return prepareAboutEvidence(options);
  if (workflow === "draft.validate-and-save") return validateAndSaveDraft(options);
  if (workflow === "branch.status") return branchStatus(options);
  if (workflow === "backup.preflight") return backupPreflight(options);
  if (workflow === "backup.apply") return backupApply(options);
  if (workflow === "pr.recommit.preflight") return recommitPreflight(options);
  if (workflow === "pr.recommit.apply") return recommitApply(options);
  throw new Error(`Unsupported workflow: ${workflow}`);
}

export function parseInvocation(argv) {
  const remaining = [...argv];
  let format = "json";
  let explicitFormat = false;
  if (remaining[0] === "--format") {
    format = remaining[1] ?? "";
    remaining.splice(0, 2);
    explicitFormat = true;
  }
  if (!["json", "human"].includes(format)) throw new Error("--format must be json or human");
  const workflow = remaining.shift();
  const help = resolveHelpRequest(workflow, remaining);
  if (help) return { help: true, format: explicitFormat ? format : "human", document: help };
  if (!workflowById(workflow)) throw new Error(`Unknown workflow: ${workflow}`);
  return { help: false, format, workflow, options: parseOptions(workflow, remaining) };
}

export function runCli(argv = process.argv.slice(2)) {
  const startedAt = new Date().toISOString();
  let invocation;
  let runContext;
  let phase = "parse";
  try {
    invocation = parseInvocation(argv);
    if (invocation.help) {
      process.stdout.write(renderHelp(invocation.document, invocation.format));
      return 0;
    }
    phase = "audit-init";
    runContext = createRunContext({
      workflow: invocation.workflow,
      options: invocation.options,
      argv,
      startedAt,
    });
    phase = "execute";
    let envelope = successEnvelope(
      invocation.workflow,
      execute(invocation.workflow, invocation.options),
      startedAt,
    );
    envelope = attachRunArtifacts(envelope, runContext);
    phase = "audit-result";
    try {
      recordRunResult(runContext, envelope);
    } catch (error) {
      envelope = {
        ...envelope,
        audit_warning: {
          code: "RUN_RESULT_RECORD_FAILED",
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
    process.stdout.write(invocation.format === "human"
      ? `${envelope.human_output}\n`
      : `${JSON.stringify(envelope, null, 2)}\n`);
    return 0;
  } catch (error) {
    const workflow = invocation?.workflow
      ?? argv.find((argument) => WORKFLOW_DEFINITIONS.some((item) => item.id === argument))
      ?? "unknown";
    let envelope = failureEnvelope(workflow, error, startedAt, {
      phase,
      repository_root: runContext?.root,
      help_command: workflow === "unknown"
        ? "node <skill-root>/scripts/github-writer-run.mjs --help"
        : `node <skill-root>/scripts/github-writer-run.mjs help ${workflow}`,
    });
    if (runContext) {
      envelope = attachRunArtifacts(envelope, runContext);
      try {
        recordRunResult(runContext, envelope);
      } catch (recordError) {
        envelope = {
          ...envelope,
          audit_warning: {
            code: "ERROR_EVENT_RECORD_FAILED",
            message: recordError instanceof Error ? recordError.message : String(recordError),
          },
        };
      }
    }
    const format = invocation?.format ?? "json";
    process.stdout.write(format === "human"
      ? `${envelope.human_output}\n`
      : `${JSON.stringify(envelope, null, 2)}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runCli();
}
