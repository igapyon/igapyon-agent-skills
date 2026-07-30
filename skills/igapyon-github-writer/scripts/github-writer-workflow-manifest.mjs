export const WORKFLOW_MANIFEST_VERSION = "github-writer.workflow-manifest/v1";

export const WORKFLOW_DEFINITIONS = Object.freeze([
  { id: "pr.evidence", mutation_level: "readonly", approval_gate: "none" },
  { id: "release.evidence", mutation_level: "readonly", approval_gate: "none" },
  { id: "about.evidence", mutation_level: "readonly", approval_gate: "none" },
  { id: "draft.validate-and-save", mutation_level: "operational", approval_gate: "none" },
  { id: "branch.status", mutation_level: "readonly", approval_gate: "none" },
  { id: "backup.preflight", mutation_level: "operational", approval_gate: "preflight" },
  { id: "backup.apply", mutation_level: "local", approval_gate: "apply" },
  { id: "pr.recommit.preflight", mutation_level: "operational", approval_gate: "preflight" },
  { id: "pr.recommit.apply", mutation_level: "local", approval_gate: "apply" },
]);

export function workflowById(id) {
  return WORKFLOW_DEFINITIONS.find((workflow) => workflow.id === id) ?? null;
}
