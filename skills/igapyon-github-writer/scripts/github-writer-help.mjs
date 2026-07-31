import { WORKFLOW_DEFINITIONS, workflowById } from "./github-writer-workflow-manifest.mjs";

export const HELP_SCHEMA_VERSION = "github-writer.help/v1";
export const WORKFLOW_LIST_SCHEMA_VERSION = "github-writer.workflow-list/v1";
export const PORTABLE_RUNNER = "node <skill-root>/scripts/github-writer-run.mjs";

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
    purpose: "Run fixed local GitHub-writing evidence and local Git workflows without gh or network access.",
    usage: [
      `${PORTABLE_RUNNER} [--format json|human] <workflow> [options]`,
      `${PORTABLE_RUNNER} help <workflow>`,
      `${PORTABLE_RUNNER} --list-workflows`,
    ],
    safety: {
      gh_command: "prohibited",
      network_access: "none",
      remote_mutation: false,
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
    if (workflowArguments.length !== 1) throw new Error("help requires exactly one workflow ID");
    const workflow = workflowById(workflowArguments[0]);
    if (!workflow) throw new Error(`Unknown workflow: ${workflowArguments[0]}`);
    return workflowDocument(workflow);
  }
  if (workflowArguments.includes("--help") || workflowArguments.includes("-h")) {
    const workflow = workflowById(workflowId);
    if (!workflow) throw new Error(`Unknown workflow: ${workflowId}`);
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
  lines.push("", "Help is metadata-only and invokes no subprocess or network access.");
  lines.push("Workflow execution writes repository-relative run records after execution.");
  return `${lines.join("\n")}\n`;
}

function renderOverviewHuman(document) {
  const lines = [
    "igapyon-github-writer fixed workflow runner",
    document.purpose,
    "",
    "Safety: gh is prohibited; network access and remote mutation are not supported.",
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
