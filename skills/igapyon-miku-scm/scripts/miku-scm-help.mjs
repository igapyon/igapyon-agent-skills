import {
  WORKFLOW_MANIFEST,
  WORKFLOW_MANIFEST_VERSION,
  workflowManifestById,
} from "./miku-scm-workflow-manifest.mjs";

export const HELP_SCHEMA_VERSION = "miku-scm.help/v1";
export const WORKFLOW_LIST_SCHEMA_VERSION = "miku-scm.workflow-list/v1";
export const PORTABLE_RUNNER = "node <skill-root>/scripts/miku-scm-run.mjs";

const SAFETY_LEVELS = Object.freeze({
  mutation_level: Object.freeze({
    readonly: "No domain mutation; execution may still read Git/GitHub and write declared artifacts.",
    local: "May change local repository state.",
    remote: "May change remote Git or GitHub state.",
  }),
  approval_gate: Object.freeze({
    none: "No apply approval gate.",
    preflight: "Collect and persist reviewed evidence; does not authorize apply.",
    apply: "Requires the workflow-specific explicit approval inputs.",
  }),
});

export class MikuScmCliError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "MikuScmCliError";
    this.code = code;
    Object.assign(this, details);
  }
}

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

export function suggestWorkflowIds(value, limit = 3) {
  return WORKFLOW_MANIFEST
    .map((entry) => entry.id)
    .map((id) => ({ id, distance: levenshtein(String(value), id) }))
    .sort((left, right) => left.distance - right.distance || left.id.localeCompare(right.id, "en"))
    .slice(0, limit)
    .map((entry) => entry.id);
}

export function unknownWorkflowError(workflowId) {
  return new MikuScmCliError(
    "UNKNOWN_WORKFLOW",
    `Unknown workflow ID: ${workflowId}`,
    {
      workflow: workflowId,
      suggestions: suggestWorkflowIds(workflowId),
      valid_workflows: WORKFLOW_MANIFEST.map((entry) => entry.id),
      help_command: `${PORTABLE_RUNNER} --format json --list-workflows`,
    },
  );
}

function workflowEntry(workflowId) {
  const entry = workflowManifestById().get(workflowId);
  if (!entry) throw unknownWorkflowError(workflowId);
  return entry;
}

function optionSynopsis(entry) {
  const name = `${entry.flag}${entry.value ? ` ${entry.value}` : ""}`;
  if (entry.required === true) return name;
  return `[${name}]`;
}

function requiredFlags(options) {
  return options.filter((entry) => entry.required === true).map((entry) => entry.flag);
}

function workflowSummary(entry) {
  return {
    id: entry.id,
    summary: entry.cli.summary,
    triggers: [...entry.triggers],
    required_parameters: [...entry.required_parameters],
    required_parameter_semantics:
      "Conceptual workflow inputs; exact required CLI flags are authoritative and may resolve defaults.",
    required_flags: requiredFlags(entry.cli.options),
    mutation_level: entry.mutation_level,
    approval_gate: entry.approval_gate,
    network_access: entry.cli.network_access,
    operational_artifacts: [...entry.cli.operational_artifacts],
    help_command: `${PORTABLE_RUNNER} help ${entry.id}`,
  };
}

function workflowDocument(entry) {
  const usage = [
    PORTABLE_RUNNER,
    "[--format json|human]",
    entry.id,
    ...entry.cli.options.map(optionSynopsis),
  ].join(" ");
  return {
    schema_version: HELP_SCHEMA_VERSION,
    kind: "workflow",
    manifest_version: WORKFLOW_MANIFEST_VERSION,
    command: PORTABLE_RUNNER,
    workflow: entry.id,
    summary: entry.cli.summary,
    triggers: [...entry.triggers],
    required_parameters: [...entry.required_parameters],
    required_parameter_semantics:
      "Conceptual workflow inputs; exact required CLI flags below are authoritative and may resolve defaults.",
    mutation_level: entry.mutation_level,
    mutation_description: SAFETY_LEVELS.mutation_level[entry.mutation_level],
    approval_gate: entry.approval_gate,
    approval_description: SAFETY_LEVELS.approval_gate[entry.approval_gate],
    usage,
    options: entry.cli.options.map((option) => ({ ...option })),
    network_access: entry.cli.network_access,
    authentication: entry.cli.authentication,
    execution_artifacts: [
      "workplace/miku-scm/runs/<run-id>",
      ...entry.cli.operational_artifacts,
    ],
    notes: [...entry.cli.notes],
    example: [PORTABLE_RUNNER, entry.id, ...entry.cli.example_arguments].join(" "),
    output: {
      default_format: "json",
      formats: ["json", "human"],
      success_exit_code: 0,
      non_success_exit_code: 1,
      result_schema: "miku-scm.runner-result/v1",
      run_artifacts: "Execution writes request, plan, snapshot, result, and conditional attempt/error records.",
    },
    help_contract: {
      side_effect_free: true,
      delegate_invoked: false,
      subprocess_invoked: false,
      network_access: false,
      artifact_writes: false,
    },
  };
}

function overviewDocument(kind = "overview") {
  return {
    schema_version: kind === "list" ? WORKFLOW_LIST_SCHEMA_VERSION : HELP_SCHEMA_VERSION,
    kind,
    manifest_version: WORKFLOW_MANIFEST_VERSION,
    command: PORTABLE_RUNNER,
    purpose: "Run one fixed, validated miku-scm workflow without arbitrary command pass-through.",
    usage: [
      `${PORTABLE_RUNNER} --version`,
      `${PORTABLE_RUNNER} [--format json|human] --help`,
      `${PORTABLE_RUNNER} [--format json|human] --list-workflows`,
      `${PORTABLE_RUNNER} [--format json|human] help <workflow-id>`,
      `${PORTABLE_RUNNER} [--format json|human] <workflow-id> [workflow options]`,
      `${PORTABLE_RUNNER} [--format json|human] <workflow-id> --help`,
    ],
    default_execution_format: "json",
    default_help_format: "human",
    help_contract: {
      side_effect_free: true,
      delegate_invoked: false,
      subprocess_invoked: false,
      network_access: false,
      artifact_writes: false,
    },
    execution_contract: {
      run_artifacts: "workplace/miku-scm/runs/<run-id>",
      authentication: "The runner never authenticates or changes scopes; workflows use existing Git/gh authentication.",
      arbitrary_command_passthrough: false,
    },
    safety_levels: SAFETY_LEVELS,
    workflows: WORKFLOW_MANIFEST.map(workflowSummary),
  };
}

function renderOption(option) {
  const labels = [];
  if (option.required === true) labels.push("required");
  if (option.required_when) labels.push(`required when ${option.required_when}`);
  if (option.required_group) labels.push(option.required_group);
  if (option.repeatable) labels.push("repeatable");
  if (Object.hasOwn(option, "default") && option.default !== undefined) {
    labels.push(`default: ${option.default}`);
  }
  if (option.minimum_occurrences !== undefined || option.maximum_occurrences !== undefined) {
    labels.push(
      `occurrences: ${option.minimum_occurrences ?? 0}..${option.maximum_occurrences ?? "unbounded"}`,
    );
  }
  if (option.choices) labels.push(`choices: ${option.choices.join(", ")}`);
  const name = `${option.flag}${option.value ? ` ${option.value}` : ""}`;
  return `  ${name}${labels.length ? ` (${labels.join("; ")})` : ""}\n    ${option.description}`;
}

function renderWorkflowHuman(document) {
  const lines = [
    `Workflow: ${document.workflow}`,
    document.summary,
    "",
    `Mutation level: ${document.mutation_level}`,
    `  ${document.mutation_description}`,
    `Approval gate: ${document.approval_gate}`,
    `  ${document.approval_description}`,
    `Network: ${document.network_access}`,
    `Authentication: ${document.authentication}`,
    "",
    "Usage:",
    `  ${document.usage}`,
    "",
    "Options:",
    ...document.options.flatMap((entry) => renderOption(entry).split("\n")),
    "",
    "Execution artifacts:",
    ...document.execution_artifacts.map((entry) => `  ${entry}`),
  ];
  if (document.notes.length > 0) {
    lines.push("", "Notes:", ...document.notes.map((entry) => `  ${entry}`));
  }
  lines.push(
    "",
    "Example:",
    `  ${document.example}`,
    "",
    "Output:",
    "  Default format: json; use --format human before the workflow ID for a human summary.",
    "  Exit 0 means success; exit 1 means invalid input or a non-success workflow result.",
    "",
    "Help safety:",
    "  Help is metadata-only: no delegate, subprocess, network access, or artifact write.",
  );
  return `${lines.join("\n")}\n`;
}

function renderOverviewHuman(document) {
  const lines = [
    "miku-scm fixed workflow runner",
    document.purpose,
    "",
    "Usage:",
    ...document.usage.map((entry) => `  ${entry}`),
    "",
    "Defaults and safety:",
    "  --version prints one plain-text version line and writes no artifacts.",
    "  Workflow execution defaults to json; help/list output defaults to human.",
    "  An explicit --format must appear before the workflow ID or help/list command.",
    "  Help and workflow listing are metadata-only and write no artifacts.",
    "  Workflow execution writes audit records under workplace/miku-scm/runs/<run-id>.",
    "  readonly may still read Git/GitHub and write declared operational artifacts.",
    "  preflight never authorizes apply; apply requires workflow-specific reviewed inputs.",
    "",
    "Workflows:",
  ];
  for (const workflow of document.workflows) {
    const required = workflow.required_flags.length > 0
      ? workflow.required_flags.join(", ")
      : "(see workflow help for conditional inputs)";
    lines.push(
      `  ${workflow.id}`,
      `    ${workflow.summary}`,
      `    mutation=${workflow.mutation_level}; gate=${workflow.approval_gate}; required=${required}`,
    );
  }
  lines.push(
    "",
    `Run \`${PORTABLE_RUNNER} help <workflow-id>\` for exact options and side effects.`,
  );
  return `${lines.join("\n")}\n`;
}

export function renderHelp(document, format) {
  if (format === "json") return `${JSON.stringify(document, null, 2)}\n`;
  if (format !== "human") {
    throw new MikuScmCliError(
      "INVALID_FORMAT",
      "--format must be exactly json or human",
      {
        bad_argument: format,
        valid_values: ["json", "human"],
        help_command: `${PORTABLE_RUNNER} --help`,
      },
    );
  }
  return document.kind === "workflow"
    ? renderWorkflowHuman(document)
    : renderOverviewHuman(document);
}

export function resolveHelpRequest(workflowId, workflowArguments) {
  if (!workflowId || workflowId === "--help" || workflowId === "-h") {
    return overviewDocument();
  }
  if (workflowId === "--list-workflows") {
    if (workflowArguments.length > 0) {
      throw new MikuScmCliError(
        "UNEXPECTED_ARGUMENT",
        "--list-workflows does not accept workflow arguments",
        {
          bad_arguments: [...workflowArguments],
          help_command: `${PORTABLE_RUNNER} --format json --list-workflows`,
        },
      );
    }
    return overviewDocument("list");
  }
  if (workflowId === "help") {
    if (workflowArguments.length === 0) return overviewDocument();
    if (workflowArguments.length !== 1) {
      throw new MikuScmCliError(
        "INVALID_HELP_REQUEST",
        "help accepts exactly one workflow ID",
        {
          bad_arguments: [...workflowArguments],
          help_command: `${PORTABLE_RUNNER} help <workflow-id>`,
        },
      );
    }
    return workflowDocument(workflowEntry(workflowArguments[0]));
  }
  if (workflowArguments.includes("--help") || workflowArguments.includes("-h")) {
    return workflowDocument(workflowEntry(workflowId));
  }
  return null;
}

export function cliErrorPayload(error) {
  const fields = [
    "code",
    "workflow",
    "bad_argument",
    "bad_arguments",
    "valid_values",
    "valid_workflows",
    "suggestions",
    "help_command",
  ];
  return {
    schema_version: "miku-scm.cli-error/v1",
    status: "not-applied",
    error: {
      name: error instanceof Error ? error.name : "Error",
      code: error?.code ?? "CLI_ERROR",
      message: error instanceof Error ? error.message : String(error),
      ...Object.fromEntries(fields
        .filter((field) => error && Object.hasOwn(error, field))
        .map((field) => [field, error[field]])),
    },
  };
}

export function inputErrorGuidance(message, workflowId) {
  const unknown = String(message).match(/^Unknown argument: (.+)$/);
  if (unknown) {
    return {
      code: "UNKNOWN_ARGUMENT",
      bad_argument: unknown[1],
      help_command: `${PORTABLE_RUNNER} help ${workflowId}`,
    };
  }
  return {
    code: "INVALID_INPUT",
    help_command: `${PORTABLE_RUNNER} help ${workflowId}`,
  };
}
