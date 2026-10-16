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
  applyPendingHandoff,
  createPendingHandoff,
  dismissPendingHandoff,
  listPendingHandoffs,
} from "./github-writer-handoff.mjs";
import {
  PRODUCT_VERSION,
  WORKFLOW_DEFINITIONS,
  workflowById,
} from "./github-writer-workflow-manifest.mjs";
import {
  GitHubWriterCliError,
  renderHelp,
  resolveHelpRequest,
  unknownWorkflowError,
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
  if (!value || value.startsWith("--")) {
    throw new GitHubWriterCliError("MISSING_OPTION_VALUE", `${name} requires a value`, { bad_argument: name });
  }
  return value;
}

function initialOptions(definition, cwd) {
  const options = { repo: cwd };
  for (const entry of definition.allowed_options) {
    if (entry.key === "repo") continue;
    if (entry.repeatable) options[entry.key] = [];
    else if (entry.value === null) options[entry.key] = false;
    else options[entry.key] = entry.default ?? "";
  }
  return options;
}

function parseOptions(workflow, argv, cwd = process.cwd()) {
  const definition = workflowById(workflow);
  const allowed = new Map(definition.allowed_options.map((entry) => [entry.flag, entry]));
  const options = initialOptions(definition, cwd);
  const occurrences = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const entry = allowed.get(argument);
    if (!entry) throw new GitHubWriterCliError(
      "UNKNOWN_OPTION", `${workflow} does not accept ${argument}`,
      { bad_argument: argument, help_command: `node <skill-root>/scripts/github-writer-run.mjs help ${workflow}` },
    );
    const count = (occurrences.get(entry.flag) ?? 0) + 1;
    occurrences.set(entry.flag, count);
    if (!entry.repeatable && count > 1) throw new GitHubWriterCliError(
      "DUPLICATE_OPTION", `${workflow} does not accept duplicate ${entry.flag}`, { bad_argument: entry.flag },
    );
    if (entry.maximum_occurrences !== undefined && count > entry.maximum_occurrences) {
      throw new GitHubWriterCliError(
        "TOO_MANY_OPTIONS", `${workflow} accepts at most ${entry.maximum_occurrences} ${entry.flag} options`,
        { bad_argument: entry.flag },
      );
    }
    if (entry.value === null) {
      options[entry.key] = true;
      continue;
    }
    const value = readOption(argv, index++, entry.flag);
    if (entry.choices && !entry.choices.includes(value)) {
      throw new GitHubWriterCliError(
        "INVALID_OPTION_VALUE", `${entry.flag} must be one of: ${entry.choices.join(", ")}`,
        { bad_argument: value, valid_values: entry.choices },
      );
    }
    if (entry.repeatable) options[entry.key].push(value);
    else options[entry.key] = value;
  }
  for (const entry of definition.allowed_options) {
    const count = occurrences.get(entry.flag) ?? 0;
    if (entry.required && (entry.value === null ? options[entry.key] !== true : count === 0)) {
      throw new GitHubWriterCliError(
        "MISSING_REQUIRED_OPTION", `${workflow} requires ${entry.flag}`, { bad_argument: entry.flag },
      );
    }
    if (entry.minimum_occurrences !== undefined && count < entry.minimum_occurrences) {
      throw new GitHubWriterCliError(
        "TOO_FEW_OPTIONS", `${workflow} requires at least ${entry.minimum_occurrences} ${entry.flag} options`,
        { bad_argument: entry.flag },
      );
    }
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
  if (workflow === "approval.handoff.list") return listPendingHandoffs(options);
  if (workflow === "approval.handoff.apply") return applyPendingHandoff(options);
  if (workflow === "approval.handoff.dismiss") return dismissPendingHandoff(options);
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
  if (!["json", "human"].includes(format)) {
    throw new GitHubWriterCliError("INVALID_FORMAT", "--format must be json or human", {
      bad_argument: format,
      valid_values: ["json", "human"],
      help_command: "node <skill-root>/scripts/github-writer-run.mjs --help",
    });
  }
  if (remaining[0] === "--version") {
    if (remaining.length !== 1) throw new GitHubWriterCliError(
      "INVALID_VERSION", "--version does not accept arguments", { help_command: "node <skill-root>/scripts/github-writer-run.mjs --help" },
    );
    return { version: true };
  }
  const workflow = remaining.shift();
  const help = resolveHelpRequest(workflow, remaining);
  if (help) return { help: true, format: explicitFormat ? format : "human", document: help };
  if (!workflowById(workflow)) throw unknownWorkflowError(workflow);
  return { help: false, format, workflow, options: parseOptions(workflow, remaining) };
}

export function runCli(argv = process.argv.slice(2)) {
  const startedAt = new Date().toISOString();
  let invocation;
  let runContext;
  let phase = "parse";
  try {
    invocation = parseInvocation(argv);
    if (invocation.version) {
      process.stdout.write(`${PRODUCT_VERSION}\n`);
      return 0;
    }
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
    let result = execute(invocation.workflow, invocation.options);
    if (invocation.workflow === "backup.preflight" || invocation.workflow === "pr.recommit.preflight") {
      const handoff = createPendingHandoff(invocation.options, invocation.workflow, result);
      if (handoff) result = { ...result, approval_handoff: handoff };
    }
    let envelope = successEnvelope(invocation.workflow, result, startedAt);
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
