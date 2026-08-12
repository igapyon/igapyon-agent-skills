export const WORKFLOW_MANIFEST_VERSION = "github-writer.workflow-manifest/v3";
export const WORKFLOW_CONTRACT_VERSION = 3;
export const PRODUCT_VERSION = "1.20260812.4";

const common = {
  network_access: "none",
  remote_mutation: false,
  allowed_executables: ["git"],
};

function option(flag, value, description, {
  key,
  required = false,
  repeatable = false,
  choices = undefined,
  defaultValue = undefined,
  minimumOccurrences = undefined,
  maximumOccurrences = undefined,
} = {}) {
  return Object.freeze({
    flag,
    value,
    key,
    required,
    repeatable,
    choices: choices ? Object.freeze([...choices]) : undefined,
    default: defaultValue,
    minimum_occurrences: minimumOccurrences,
    maximum_occurrences: maximumOccurrences,
    description,
  });
}

function workflow(definition) {
  const contractSources = [
    "scripts/github-writer-run.mjs",
    "scripts/github-writer-kernel.mjs",
    "scripts/github-writer-core.mjs",
    "scripts/github-writer-handoff.mjs",
    `scripts/${definition.runner_entry}`,
    "scripts/github-writer-output.mjs",
    "scripts/github-writer-observability.mjs",
    "scripts/github-writer-help.mjs",
    "scripts/github-writer-workflow-manifest.mjs",
  ];
  return Object.freeze({
    ...common,
    ...definition,
    triggers: Object.freeze([...definition.triggers]),
    required_parameters: Object.freeze([...definition.required_parameters]),
    references: Object.freeze([
      ...definition.references,
      "github-cli-prohibition.md",
      "runtime-and-observability.md",
    ]),
    runtime_references: Object.freeze([...(definition.runtime_references ?? [])]),
    design_references: Object.freeze([
      ...definition.references,
      "github-cli-prohibition.md",
      "runtime-and-observability.md",
    ]),
    allowed_options: Object.freeze([...definition.allowed_options]),
    allowed_executables: Object.freeze([...common.allowed_executables]),
    help_contract: Object.freeze({
      side_effect_free: true,
      delegate_invoked: false,
      subprocess_invoked: false,
      network_access: false,
      artifact_writes: false,
    }),
    contract_sources: Object.freeze([...new Set(contractSources)]),
  });
}

export const WORKFLOW_DEFINITIONS = Object.freeze([
  workflow({
    id: "pr.evidence",
    summary: "Collect bounded local Git evidence for one commit or an explicit range.",
    triggers: ["PR文面", "pull request text"],
    required_parameters: ["repository"],
    mutation_level: "readonly",
    approval_gate: "none",
    runner_entry: "github-writer-evidence.mjs",
    references: ["pr-writing.md", "github-writing-rules.md", "deterministic-runner.md"],
    contract_test: "tests/github-writer-evidence.test.mjs",
    allowed_options: [
      option("--repo", "<path>", "Target local Git repository.", { key: "repo" }),
      option("--target", "<commit-or-range>", "Commit or range; defaults to the resolved branch range.", { key: "target" }),
    ],
  }),
  workflow({
    id: "release.evidence",
    summary: "Collect bounded local Git evidence for release-note drafting.",
    triggers: ["Release文面", "release notes"],
    required_parameters: ["repository", "target"],
    mutation_level: "readonly",
    approval_gate: "none",
    runner_entry: "github-writer-evidence.mjs",
    references: ["release-writing.md", "github-writing-rules.md", "deterministic-runner.md"],
    contract_test: "tests/github-writer-evidence.test.mjs",
    allowed_options: [
      option("--repo", "<path>", "Target local Git repository.", { key: "repo" }),
      option("--target", "<commit-or-range>", "Required start commit or explicit range.", { key: "target", required: true }),
    ],
  }),
  workflow({
    id: "about.evidence",
    summary: "Collect bounded local documents for GitHub About drafting.",
    triggers: ["GitHub About", "repository description"],
    required_parameters: ["repository"],
    mutation_level: "readonly",
    approval_gate: "none",
    runner_entry: "github-writer-evidence.mjs",
    references: ["about-writing.md", "github-writing-rules.md", "deterministic-runner.md"],
    contract_test: "tests/github-writer-evidence.test.mjs",
    allowed_options: [
      option("--repo", "<path>", "Target local Git repository.", { key: "repo" }),
      option("--document", "<relative-path>", "Repository-relative evidence document.", { key: "documents", repeatable: true }),
    ],
  }),
  workflow({
    id: "draft.validate-and-save",
    summary: "Validate and save one completed GitHub Markdown draft locally.",
    triggers: ["下書き保存", "draft save"],
    required_parameters: ["repository", "mode", "input"],
    mutation_level: "operational",
    approval_gate: "none",
    runner_entry: "github-writer-operations.mjs",
    references: ["github-writing-rules.md", "deterministic-runner.md"],
    contract_test: "tests/github-writer-evidence.test.mjs",
    allowed_options: [
      option("--repo", "<path>", "Target local Git repository.", { key: "repo" }),
      option("--mode", "pr|release|about", "Draft type.", { key: "mode", required: true, choices: ["pr", "release", "about"] }),
      option("--input", "<relative-path>", "Repository-relative draft source.", { key: "input", required: true }),
    ],
  }),
  workflow({
    id: "branch.status",
    summary: "Report local branch, upstream, worktree, recent commits, and tags.",
    triggers: ["ブランチ状況", "branch status"],
    required_parameters: ["repository"],
    mutation_level: "readonly",
    approval_gate: "none",
    runner_entry: "github-writer-evidence.mjs",
    references: ["branch-status.md", "deterministic-runner.md"],
    contract_test: "tests/github-writer-platform.test.mjs",
    allowed_options: [
      option("--repo", "<path>", "Target local Git repository.", { key: "repo" }),
    ],
  }),
  workflow({
    id: "backup.preflight",
    summary: "Seal local repository state and a proposed backup branch in a plan.",
    triggers: ["バックアップ事前確認", "backup preflight"],
    required_parameters: ["repository"],
    mutation_level: "operational",
    approval_gate: "preflight",
    runner_entry: "github-writer-operations.mjs",
    references: ["backup-branch.md", "deterministic-runner.md"],
    contract_test: "tests/github-writer-operation.test.mjs",
    allowed_options: [
      option("--repo", "<path>", "Target local Git repository.", { key: "repo" }),
      option("--backup-name", "<backup/name>", "Explicit unused local branch under backup/.", { key: "backupName" }),
    ],
  }),
  workflow({
    id: "backup.apply",
    summary: "Create exactly the sealed local backup branch once.",
    triggers: ["バックアップ作成承認", "backup apply"],
    required_parameters: ["repository", "reviewed_plan", "reviewed_digest"],
    mutation_level: "local",
    approval_gate: "apply",
    runner_entry: "github-writer-operations.mjs",
    references: ["backup-branch.md", "deterministic-runner.md"],
    contract_test: "tests/github-writer-operation.test.mjs",
    allowed_options: [
      option("--repo", "<path>", "Target local Git repository.", { key: "repo" }),
      option("--plan", "<relative-plan>", "Reviewed sealed plan.", { key: "plan", required: true }),
      option("--expected-plan-sha256", "<sha256>", "Reviewed plan digest.", { key: "expectedPlanSha256", required: true }),
    ],
  }),
  workflow({
    id: "pr.recommit.preflight",
    summary: "Seal the PR draft, base, backup branch, and commit range before recommit.",
    triggers: ["PR再コミット事前確認", "recommit preflight"],
    required_parameters: ["repository", "pr_draft"],
    mutation_level: "operational",
    approval_gate: "preflight",
    runner_entry: "github-writer-operations.mjs",
    references: ["pr-soft-reset-recommit.md", "deterministic-runner.md"],
    contract_test: "tests/github-writer-operation.test.mjs",
    allowed_options: [
      option("--repo", "<path>", "Target local Git repository.", { key: "repo" }),
      option("--base", "<ref>", "Explicit recommit base.", { key: "base" }),
      option("--pr-draft", "<relative-path>", "Reviewed PR draft used as the commit message.", { key: "prDraft", required: true }),
    ],
  }),
  workflow({
    id: "pr.recommit.apply",
    summary: "Consume one sealed plan to create a backup and rebuild local commits.",
    triggers: ["PR再コミット承認", "recommit apply"],
    required_parameters: ["repository", "reviewed_plan", "reviewed_digest"],
    mutation_level: "local",
    approval_gate: "apply",
    runner_entry: "github-writer-operations.mjs",
    references: ["pr-soft-reset-recommit.md", "deterministic-runner.md"],
    contract_test: "tests/github-writer-operation.test.mjs",
    allowed_options: [
      option("--repo", "<path>", "Target local Git repository.", { key: "repo" }),
      option("--plan", "<relative-plan>", "Reviewed sealed plan.", { key: "plan", required: true }),
      option("--expected-plan-sha256", "<sha256>", "Reviewed plan digest.", { key: "expectedPlanSha256", required: true }),
    ],
  }),
  workflow({
    id: "approval.handoff.list",
    summary: "List pending local approval handoffs without reconstructing apply arguments.",
    triggers: ["approval pending", "承認待ち一覧"],
    required_parameters: ["repository"],
    mutation_level: "readonly",
    approval_gate: "none",
    runner_entry: "github-writer-handoff.mjs",
    references: ["deterministic-runner.md"],
    contract_test: "tests/github-writer-handoff.test.mjs",
    allowed_options: [
      option("--repo", "<path>", "Target local Git repository.", { key: "repo" }),
    ],
  }),
  workflow({
    id: "approval.handoff.apply",
    summary: "Apply one exact pending local handoff without rebuilding plan arguments.",
    triggers: ["approve", "承認"],
    required_parameters: ["repository", "explicit_apply_request", "optional_handoff_id"],
    mutation_level: "local",
    approval_gate: "apply",
    runner_entry: "github-writer-handoff.mjs",
    references: ["deterministic-runner.md"],
    contract_test: "tests/github-writer-handoff.test.mjs",
    allowed_options: [
      option("--repo", "<path>", "Target local Git repository.", { key: "repo" }),
      option("--handoff", "<full-id>", "Optional exact pending handoff ID.", { key: "handoff" }),
      option("--apply", null, "Confirm consumption of the selected handoff.", { key: "apply", required: true }),
    ],
  }),
  workflow({
    id: "approval.handoff.dismiss",
    summary: "Dismiss one exact pending local handoff without applying it.",
    triggers: ["dismiss", "承認待ち解除"],
    required_parameters: ["repository", "handoff_id", "explicit_dismiss_request"],
    mutation_level: "operational",
    approval_gate: "apply",
    runner_entry: "github-writer-handoff.mjs",
    references: ["deterministic-runner.md"],
    contract_test: "tests/github-writer-handoff.test.mjs",
    allowed_options: [
      option("--repo", "<path>", "Target local Git repository.", { key: "repo" }),
      option("--handoff", "<full-id>", "Exact pending handoff ID.", { key: "handoff", required: true }),
      option("--apply", null, "Confirm dismissal of the selected handoff.", { key: "apply", required: true }),
    ],
  }),
]);

export function workflowById(id) {
  return WORKFLOW_DEFINITIONS.find((entry) => entry.id === id) ?? null;
}
