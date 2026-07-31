export const WORKFLOW_MANIFEST_VERSION = "github-writer.workflow-manifest/v2";
export const WORKFLOW_CONTRACT_VERSION = 2;

const common = {
  network_access: "none",
  remote_mutation: false,
  allowed_executables: ["git"],
};

function option(flag, value, description, { required = false, repeatable = false } = {}) {
  return Object.freeze({ flag, value, description, required, repeatable });
}

function workflow(definition) {
  const contractSources = [
    "scripts/github-writer-run.mjs",
    "scripts/github-writer-kernel.mjs",
    "scripts/github-writer-core.mjs",
    `scripts/${definition.runner_entry}`,
    "scripts/github-writer-output.mjs",
    "scripts/github-writer-observability.mjs",
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
    allowed_options: Object.freeze([...definition.allowed_options]),
    allowed_executables: Object.freeze([...common.allowed_executables]),
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
      option("--repo", "<path>", "Target local Git repository."),
      option("--target", "<commit-or-range>", "Commit or range; defaults to the latest single commit."),
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
      option("--repo", "<path>", "Target local Git repository."),
      option("--target", "<commit-or-range>", "Required start commit or explicit range.", { required: true }),
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
      option("--repo", "<path>", "Target local Git repository."),
      option("--document", "<relative-path>", "Repository-relative evidence document.", { repeatable: true }),
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
      option("--repo", "<path>", "Target local Git repository."),
      option("--mode", "pr|release|about", "Draft type.", { required: true }),
      option("--input", "<relative-path>", "Repository-relative draft source.", { required: true }),
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
      option("--repo", "<path>", "Target local Git repository."),
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
      option("--repo", "<path>", "Target local Git repository."),
      option("--backup-name", "<backup/name>", "Explicit unused local branch under backup/."),
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
      option("--repo", "<path>", "Target local Git repository."),
      option("--plan", "<relative-plan>", "Reviewed sealed plan.", { required: true }),
      option("--expected-plan-sha256", "<sha256>", "Reviewed plan digest.", { required: true }),
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
      option("--repo", "<path>", "Target local Git repository."),
      option("--base", "<ref>", "Explicit recommit base."),
      option("--pr-draft", "<relative-path>", "Reviewed PR draft used as the commit message.", { required: true }),
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
      option("--repo", "<path>", "Target local Git repository."),
      option("--plan", "<relative-plan>", "Reviewed sealed plan.", { required: true }),
      option("--expected-plan-sha256", "<sha256>", "Reviewed plan digest.", { required: true }),
    ],
  }),
]);

export function workflowById(id) {
  return WORKFLOW_DEFINITIONS.find((entry) => entry.id === id) ?? null;
}
