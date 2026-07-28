export const HUMAN_OUTPUT_SCHEMA_VERSION = "miku-scm.human-output/v1";

const WORKFLOW_TITLES = Object.freeze({
  "repository.status": "リポジトリ状態",
  "github.issue.read": "GitHub Issue取得",
  "github.read.batch": "GitHub READONLY一括取得",
  "github.issue.create.preflight": "GitHub Issue作成",
  "github.issue.create.apply": "GitHub Issue作成",
  "github.issue.update.preflight": "GitHub Issue更新",
  "github.issue.update.apply": "GitHub Issue更新",
  "github.issue.comment.preflight": "GitHub Issueコメント",
  "github.issue.comment.apply": "GitHub Issueコメント",
  "github.issue.label.preflight": "GitHub Issueラベル更新",
  "github.issue.label.apply": "GitHub Issueラベル更新",
  "github.issue.close.preflight": "GitHub Issueクローズ",
  "github.issue.close.apply": "GitHub Issueクローズ",
  "repository.maintenance.diagnose": "リポジトリメンテナンス診断",
  "repository.maintenance.plan": "リポジトリメンテナンス計画",
  "repository.maintenance.apply": "リポジトリメンテナンス",
  "repository.post-merge.next-work": "マージ後の次作業準備",
  "pr.publish.preflight": "PR publication",
  "pr.publish.apply": "PR publication",
  "pr.recommit.preflight": "PR recommit",
  "pr.recommit.apply": "PR recommit",
  "version.status": "バージョン状態",
  "version.increment.validate": "バージョン候補検証",
  "writing.issue.prepare": "Issue writing evidence",
  "writing.pr.prepare": "PR writing evidence",
  "writing.release.prepare": "Release writing evidence",
  "writing.about.prepare": "About writing evidence",
});

function oneLine(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function displayValue(value, fallback = "なし") {
  if (value === null || value === undefined || value === "") return fallback;
  return oneLine(value);
}

function labelsValue(labels) {
  return Array.isArray(labels) && labels.length > 0
    ? labels.map(oneLine).join(", ")
    : "なし";
}

function resultHeader({ status, approvalGate, delegateStatus }) {
  if (status === "conflict") return "CONFLICT";
  if (status === "unresolved") return "UNRESOLVED";
  if (status === "not-applied") return "NOT APPLIED";
  if (approvalGate === "preflight" && delegateStatus === "preflight-ok") {
    return "READY FOR APPROVAL";
  }
  return "SUCCESS";
}

function appendRepositoryStatus(lines, result) {
  lines.push(`ブランチ: ${displayValue(result.branch)}`);
  lines.push(`HEAD: ${displayValue(result.head)}`);
  lines.push(`upstream: ${displayValue(result.upstream)}`);
  lines.push(`ahead / behind: ${result.ahead ?? 0} / ${result.behind ?? 0}`);
  lines.push(`作業ツリー: ${result.dirty ? "変更あり" : "clean"}`);
  lines.push(
    `staged / unstaged / untracked / conflicted: ${result.staged ?? 0}`
    + ` / ${result.unstaged ?? 0} / ${result.untracked ?? 0} / ${result.conflicted ?? 0}`,
  );
  if (Array.isArray(result.versions) && result.versions.length > 0) {
    const versions = result.versions
      .filter((entry) => entry.present)
      .map((entry) => `${oneLine(entry.path)}=${oneLine(entry.value)}`);
    if (versions.length > 0) lines.push(`バージョン: ${versions.join(", ")}`);
  }
}

function appendIssueRead(lines, result) {
  lines.push(`対象: ${displayValue(result.repository)}`);
  lines.push(`取得モード: ${displayValue(result.mode)}`);
  if (result.mode === "issue" && result.issue) {
    lines.push(`Issue: #${result.issue.number}`);
    lines.push(`タイトル: ${displayValue(result.issue.title)}`);
    lines.push(`状態: ${displayValue(result.issue.state)}`);
    lines.push(`ラベル: ${labelsValue(result.issue.labels)}`);
    lines.push(`URL: ${displayValue(result.issue.url)}`);
    lines.push(`コメント数: ${result.issue.comments?.length ?? 0}`);
  } else if (result.mode === "list") {
    lines.push(`状態フィルター: ${displayValue(result.state)}`);
    lines.push(`取得件数: ${result.issues?.length ?? 0}`);
  } else if (result.mode === "labels") {
    lines.push(`ラベル件数: ${result.labels?.length ?? 0}`);
  }
}

function appendIssueOperation(lines, workflow, result) {
  lines.push(`対象: ${displayValue(result.repository)}`);
  if (result.issue_number || result.issue) {
    lines.push(`Issue: #${result.issue_number ?? result.issue}`);
  }
  if (result.title) lines.push(`タイトル: ${oneLine(result.title)}`);
  if (Object.hasOwn(result, "labels")) lines.push(`ラベル: ${labelsValue(result.labels)}`);
  if (result.parent_issue) {
    lines.push(
      `親Issue: #${result.parent_issue.number} (${displayValue(result.parent_issue.state)})`
      + ` ${displayValue(result.parent_issue.title)}`,
    );
  }
  if (result.draft) lines.push(`Draft: ${displayValue(result.draft)}`);
  if (result.draft_sha256) lines.push(`Draft SHA-256: ${result.draft_sha256}`);
  if (result.labels_sha256) lines.push(`ラベル選択 SHA-256: ${result.labels_sha256}`);
  if (result.parent_sha256) lines.push(`親Issue snapshot SHA-256: ${result.parent_sha256}`);
  if (result.issue_url) lines.push(`URL: ${result.issue_url}`);
  if (result.issue_verification?.status) {
    lines.push(`Issue検証: ${result.issue_verification.status}`);
  }
  if (result.label_verification?.status) {
    lines.push(`ラベル検証: ${result.label_verification.status}`);
  }
  if (result.parent_verification?.status) {
    lines.push(`親Issue検証: ${result.parent_verification.status}`);
  }
  if (workflow.endsWith(".preflight") && result.apply_arguments) {
    lines.push("リモート変更: 未実行");
    if (result.handoff) lines.push(`承認ID: ${result.handoff.id}`);
    lines.push("承認: チャットで「miku-scm 承認」と返信");
  }
}

function appendGeneric(lines, result) {
  const repository = result.repository ?? result.repo;
  if (repository) {
    const displayedRepository = pathLikeAbsolute(repository) ? "local repository" : repository;
    lines.push(`対象: ${displayValue(displayedRepository)}`);
  }
  if (result.branch) lines.push(`ブランチ: ${displayValue(result.branch)}`);
  if (result.status) lines.push(`delegate状態: ${displayValue(result.status)}`);
  if (result.plan_path) lines.push(`Plan: ${displayValue(result.plan_path)}`);
  if (result.plan_sha256) lines.push(`Plan SHA-256: ${result.plan_sha256}`);
  if (result.issue_url) lines.push(`URL: ${result.issue_url}`);
}

function pathLikeAbsolute(value) {
  return typeof value === "string"
    && (value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value));
}

function appendVersion(lines, result) {
  appendGeneric(lines, result);
  lines.push(`policy: ${displayValue(result.policy, "未指定")}`);
  lines.push(`policy解決: ${result.policy_resolved ? "済み" : "未解決"}`);
  if (Array.isArray(result.authoritative)) {
    for (const entry of result.authoritative) {
      lines.push(`現在値 (${displayValue(entry.path)}): ${displayValue(entry.value)}`);
    }
  }
  if (result.proposed) {
    const proposed = Array.isArray(result.proposed) ? result.proposed : [result.proposed];
    for (const entry of proposed) {
      if (entry && typeof entry === "object") {
        lines.push(
          `候補 (${displayValue(entry.path, "version")}): `
          + `${displayValue(entry.value ?? entry.proposed ?? entry.next)}`,
        );
      }
    }
  }
}

function appendWriting(lines, result) {
  lines.push(`対象: ${displayValue(result.github_repository ?? result.repository)}`);
  if (result.branch) lines.push(`ブランチ: ${displayValue(result.branch)}`);
  if (result.target) {
    lines.push(`Git対象: ${displayValue(result.target.resolved_log_target)}`);
    lines.push(`対象解決: ${displayValue(result.target.resolution)}`);
  }
  if (Number.isSafeInteger(result.commit_count)) {
    lines.push(`commit数: ${result.commit_count}`);
  }
  if (Array.isArray(result.changed_files)) {
    lines.push(`変更ファイル数: ${result.changed_files.length}`);
  }
  if (Array.isArray(result.documents)) {
    lines.push(`証拠文書数: ${result.documents.length}`);
  }
  lines.push(`evidence SHA-256: ${displayValue(result.evidence_sha256)}`);
  lines.push(`Draft候補: ${displayValue(result.suggested_draft_path)}`);
  const truncated = Boolean(
    result.commits_truncated || result.patch_truncated || result.documents_truncated,
  );
  lines.push(`証拠切り詰め: ${truncated ? "あり" : "なし"}`);
  lines.push("作文: 未実行");
}

export function renderHumanOutput({
  workflow,
  status,
  approvalGate,
  delegateStatus,
  mutationInvoked,
  result,
  error,
}) {
  if (workflow === "github.issue.handoff.apply" && result?.apply_result?.human_output) {
    return `${result.apply_result.human_output.trimEnd()}\n`
      + `承認handoff: ${result.handoff.id} (${result.handoff.status})\n`;
  }
  const title = WORKFLOW_TITLES[workflow] ?? workflow;
  const lines = [`[${resultHeader({ status, approvalGate, delegateStatus })}] ${title}`, ""];

  if (error) {
    lines.push(`workflow: ${workflow}`);
    lines.push(`分類: ${displayValue(error.classification, "unknown")}`);
    lines.push(`内容: ${displayValue(error.message, "不明なエラー")}`);
    lines.push(`mutation実行: ${mutationInvoked === null ? "不明" : mutationInvoked ? "あり" : "なし"}`);
    lines.push(`再試行: ${displayValue(error.retryability, "要確認")}`);
    return `${lines.join("\n")}\n`;
  }

  if (workflow === "repository.status") {
    appendRepositoryStatus(lines, result ?? {});
  } else if (workflow === "github.issue.read") {
    appendIssueRead(lines, result ?? {});
  } else if (workflow.startsWith("github.issue.")) {
    appendIssueOperation(lines, workflow, result ?? {});
  } else if (workflow.startsWith("version.")) {
    appendVersion(lines, result ?? {});
  } else if (workflow.startsWith("writing.")) {
    appendWriting(lines, result ?? {});
  } else {
    appendGeneric(lines, result ?? {});
  }
  lines.push(`mutation実行: ${mutationInvoked === null ? "不明" : mutationInvoked ? "あり" : "なし"}`);
  return `${lines.join("\n")}\n`;
}
