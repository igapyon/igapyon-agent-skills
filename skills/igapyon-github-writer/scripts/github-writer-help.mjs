import { PRODUCT_VERSION, WORKFLOW_DEFINITIONS, workflowById } from "./github-writer-workflow-manifest.mjs";

export const HELP_SCHEMA_VERSION = "github-writer.help/v1";
export const WORKFLOW_LIST_SCHEMA_VERSION = "github-writer.workflow-list/v1";
export const PORTABLE_RUNNER = "node <skill-root>/scripts/github-writer-run.mjs";

export class GitHubWriterCliError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "GitHubWriterCliError";
    this.code = code;
    Object.assign(this, details);
  }
}

const SAFETY_LEVELS = Object.freeze({
  readonly: "No domain mutation; declared operational records may still be written.",
  operational: "May create or update declared local operational artifacts, but not Git history or refs.",
  local: "May change local Git repository state after the workflow-specific apply gate.",
});

function levenshtein(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0];
    previous[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = previous[rightIndex];
      previous[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[right.length];
}

export function unknownWorkflowError(value) {
  const suggestions = WORKFLOW_DEFINITIONS
    .map((workflow) => ({ id: workflow.id, distance: levenshtein(String(value), workflow.id) }))
    .sort((left, right) => left.distance - right.distance || left.id.localeCompare(right.id, "en"))
    .slice(0, 3)
    .map((entry) => entry.id);
  return new GitHubWriterCliError("UNKNOWN_WORKFLOW", `Unknown workflow: ${value}`, {
    bad_argument: value,
    suggestions,
    valid_workflows: WORKFLOW_DEFINITIONS.map((workflow) => workflow.id),
    help_command: `${PORTABLE_RUNNER} --format json --list-workflows`,
  });
}

function optionUsage(entry) {
  const value = entry.value ? ` ${entry.value}` : "";
  const fragment = `${entry.flag}${value}`;
  return entry.required ? fragment : `[${fragment}]`;
}

export function workflowDocument(workflow) {
  return {
    schema_version: HELP_SCHEMA_VERSION,
    kind: "workflow",
    id: workflow.id,
    summary: workflow.summary,
    mutation_level: workflow.mutation_level,
    approval_gate: workflow.approval_gate,
    network_access: workflow.network_access,
    remote_mutation: workflow.remote_mutation,
    allowed_executables: [...workflow.allowed_executables],
    required_parameters: [...workflow.required_parameters],
    usage: `${PORTABLE_RUNNER} ${workflow.id} ${workflow.allowed_options.map(optionUsage).join(" ")}`.trim(),
    options: workflow.allowed_options.map((entry) => ({ ...entry })),
    references: [...workflow.references],
    runtime_references: [...workflow.runtime_references],
    design_references: [...workflow.design_references],
    mutation_description: SAFETY_LEVELS[workflow.mutation_level],
    help_contract: { ...workflow.help_contract },
    execution_artifacts: [
      "workplace/github-writer/runs/<run-id>/request.json",
      "workplace/github-writer/runs/<run-id>/result.json",
      "workplace/github-writer/runs/<run-id>/error-event.json on failure",
    ],
  };
}

export function overviewDocument(kind = "overview") {
  return {
    schema_version: kind === "list" ? WORKFLOW_LIST_SCHEMA_VERSION : HELP_SCHEMA_VERSION,
    kind,
    product: "igapyon-github-writer",
    product_version: PRODUCT_VERSION,
    purpose: "Run fixed local GitHub-writing evidence and local Git workflows without gh or network access.",
    usage: [
      `${PORTABLE_RUNNER} [--format json|human] <workflow> [options]`,
      `${PORTABLE_RUNNER} --version`,
      `${PORTABLE_RUNNER} help <workflow>`,
      `${PORTABLE_RUNNER} --list-workflows`,
    ],
    safety: {
      gh_command: "prohibited",
      network_access: "none",
      remote_mutation: false,
    },
    help_contract: {
      side_effect_free: true,
      delegate_invoked: false,
      subprocess_invoked: false,
      network_access: false,
      artifact_writes: false,
    },
    execution_artifacts: "workplace/github-writer/runs/<run-id>",
    workflows: WORKFLOW_DEFINITIONS.map((workflow) => ({
      id: workflow.id,
      summary: workflow.summary,
      mutation_level: workflow.mutation_level,
      approval_gate: workflow.approval_gate,
      network_access: workflow.network_access,
      required_flags: workflow.allowed_options.filter((entry) => entry.required).map((entry) => entry.flag),
    })),
  };
}

export function resolveHelpRequest(workflowId, workflowArguments) {
  if (!workflowId || workflowId === "--help" || workflowId === "-h") return overviewDocument();
  if (workflowId === "--list-workflows") {
    if (workflowArguments.length > 0) throw new Error("--list-workflows does not accept arguments");
    return overviewDocument("list");
  }
  if (workflowId === "help") {
    if (workflowArguments.length !== 1) throw new GitHubWriterCliError(
      "INVALID_HELP", "help requires exactly one workflow ID", { help_command: `${PORTABLE_RUNNER} --help` },
    );
    const workflow = workflowById(workflowArguments[0]);
    if (!workflow) throw unknownWorkflowError(workflowArguments[0]);
    return workflowDocument(workflow);
  }
  if (workflowArguments.includes("--help") || workflowArguments.includes("-h")) {
    const workflow = workflowById(workflowId);
    if (!workflow) throw unknownWorkflowError(workflowId);
    return workflowDocument(workflow);
  }
  return null;
}

function renderWorkflowHuman(document) {
  const lines = [
    document.id,
    document.summary,
    "",
    `Mutation: ${document.mutation_level}`,
    `  ${document.mutation_description}`,
    `Approval: ${document.approval_gate}`,
    `Network: ${document.network_access}`,
    "GitHub CLI: prohibited",
    "",
    "Usage:",
    `  ${document.usage}`,
    "",
    "Options:",
  ];
  for (const entry of document.options) {
    lines.push(`  ${optionUsage(entry)}`, `    ${entry.description}${entry.repeatable ? " Repeatable." : ""}`);
  }
  lines.push("", "Help is metadata-only and invokes no subprocess, network access, or artifact writes.");
  lines.push("Workflow execution writes repository-relative run records after execution.");
  return `${lines.join("\n")}\n`;
}

function renderOverviewHuman(document) {
  const lines = [
    "igapyon-github-writer fixed workflow runner",
    `Version: ${document.product_version}`,
    document.purpose,
    "",
    "Safety: gh is prohibited; network access and remote mutation are not supported.",
    "--version, help, and workflow listing are metadata-only.",
    "Workflow execution records request/result data under workplace/github-writer/runs/<run-id>.",
    "",
    "Usage:",
    ...document.usage.map((entry) => `  ${entry}`),
    "",
    "Workflows:",
  ];
  for (const workflow of document.workflows) {
    lines.push(
      `  ${workflow.id}`,
      `    ${workflow.summary}`,
      `    mutation=${workflow.mutation_level}; gate=${workflow.approval_gate}; network=${workflow.network_access}`,
    );
  }
  return `${lines.join("\n")}\n`;
}

export function renderHelp(document, format) {
  if (format === "json") return `${JSON.stringify(document, null, 2)}\n`;
  if (format !== "human") throw new Error("--format must be json or human");
  return document.kind === "workflow"
    ? renderWorkflowHuman(document)
    : renderOverviewHuman(document);
}
