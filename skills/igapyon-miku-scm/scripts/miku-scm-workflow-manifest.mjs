export const WORKFLOW_MANIFEST_VERSION = "miku-scm.workflow-manifest/v1";

export const WORKFLOW_MANIFEST = Object.freeze([
  {
    id: "repository.status",
    triggers: ["リポジトリ状態", "branch status", "repository state"],
    required_parameters: ["repository"],
    mutation_level: "readonly",
    approval_gate: "none",
    runner_entry: "miku-scm-local-snapshot.mjs",
    references: ["local-git-readonly.md", "deterministic-workflow-runner.md"],
  },
  {
    id: "github.issue.read",
    triggers: ["Issue取得", "Issue確認", "Issue一覧", "label確認"],
    required_parameters: ["repository", "mode"],
    mutation_level: "readonly",
    approval_gate: "none",
    runner_entry: "github-issue-read.mjs",
    references: ["github-cli-static-helper-policy.md", "deterministic-workflow-runner.md"],
  },
  {
    id: "github.read.batch",
    triggers: ["GitHub READONLY一括取得", "GitHub cache取得"],
    required_parameters: ["repository", "queries"],
    mutation_level: "readonly",
    approval_gate: "none",
    runner_entry: "miku-scm-github-readonly.mjs",
    references: ["github-cli-static-helper-policy.md", "github-readonly-cache.md", "deterministic-workflow-runner.md"],
  },
  {
    id: "github.issue.create.preflight",
    triggers: ["Issue登録事前確認", "子Issue登録事前確認"],
    required_parameters: ["repository", "draft"],
    mutation_level: "readonly",
    approval_gate: "preflight",
    runner_entry: "github-issue-create.mjs",
    references: ["github-issue-create.md", "deterministic-workflow-runner.md"],
  },
  {
    id: "github.issue.create.apply",
    triggers: ["Issue登録OK", "子Issue登録OK"],
    required_parameters: ["repository", "draft", "reviewed_digests"],
    mutation_level: "remote",
    approval_gate: "apply",
    runner_entry: "github-issue-create.mjs",
    references: ["github-issue-create.md", "deterministic-workflow-runner.md"],
  },
  {
    id: "repository.maintenance.diagnose",
    triggers: ["リポジトリメンテナンス診断", "不要branch確認"],
    required_parameters: ["repository"],
    mutation_level: "readonly",
    approval_gate: "none",
    runner_entry: "repository-maintenance.mjs",
    references: ["repository-maintenance.md", "deterministic-workflow-runner.md"],
  },
  {
    id: "repository.maintenance.plan",
    triggers: ["リポジトリメンテナンス計画", "削除計画作成"],
    required_parameters: ["repository"],
    mutation_level: "readonly",
    approval_gate: "preflight",
    runner_entry: "repository-maintenance.mjs",
    references: ["repository-maintenance.md", "deterministic-workflow-runner.md"],
  },
  {
    id: "repository.maintenance.apply",
    triggers: ["承認済みメンテナンス実行"],
    required_parameters: ["repository", "reviewed_plan", "reviewed_digest"],
    mutation_level: "local",
    approval_gate: "apply",
    runner_entry: "repository-maintenance.mjs",
    references: ["repository-maintenance.md", "deterministic-workflow-runner.md"],
  },
]);

export function workflowManifestById() {
  return new Map(WORKFLOW_MANIFEST.map((entry) => [entry.id, entry]));
}
