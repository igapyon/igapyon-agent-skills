export const HUMAN_OUTPUT_SCHEMA_VERSION = "miku-scm.human-output/v9";

const WORKFLOW_TITLES = Object.freeze({
  "repository.status": "Repository status",
  "github.issue.read": "GitHub Issue read",
  "github.read.batch": "GitHub READONLY batch read",
  "github.issue.create.preflight": "GitHub Issue create",
  "github.issue.create.apply": "GitHub Issue create",
  "github.issue.update.preflight": "GitHub Issue update",
  "github.issue.update.apply": "GitHub Issue update",
  "github.issue.comment.preflight": "GitHub Issue comment",
  "github.issue.comment.apply": "GitHub Issue comment",
  "github.issue.label.preflight": "GitHub Issue label update",
  "github.issue.label.apply": "GitHub Issue label update",
  "github.issue.close.preflight": "GitHub Issue close",
  "github.issue.close.apply": "GitHub Issue close",
  "github.issue.handoff.list": "GitHub Issue approval handoff list",
  "github.issue.handoff.apply": "GitHub Issue approval handoff apply",
  "github.issue.handoff.batch.apply": "GitHub Issue approval handoff batch apply",
  "github.issue.handoff.dismiss": "GitHub Issue approval handoff dismissal",
  "repository.maintenance.diagnose": "Repository maintenance diagnosis",
  "repository.maintenance.plan": "Repository maintenance plan",
  "repository.maintenance.apply": "Repository maintenance",
  "repository.post-merge.next-work": "Post-merge next-work preparation",
  "work.commit": "Work commit",
  "pr.publish.preflight": "PR publication",
  "pr.publish.apply": "PR publication",
  "pr.recommit.preflight": "PR recommit",
  "pr.recommit.apply": "PR recommit",
  "pr.recommit.push": "PR recommit push",
  "version.status": "Version status",
  "version.increment.validate": "Version increment validation",
  "writing.issue.prepare": "Issue writing evidence",
  "writing.pr.prepare": "PR writing evidence",
  "writing.release.prepare": "Release writing evidence",
  "writing.about.prepare": "About writing evidence",
});

function oneLine(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function displayValue(value, fallback = "none") {
  if (value === null || value === undefined || value === "") return fallback;
  return oneLine(value);
}

function labelsValue(labels) {
  return Array.isArray(labels) && labels.length > 0
    ? labels.map((label) => (
      label && typeof label === "object" && typeof label.name === "string"
        ? oneLine(label.name)
        : oneLine(label)
    )).join(", ")
    : "none";
}

function resultHeader({ status, approvalGate, delegateStatus }) {
  if (status === "partial") return "PARTIAL";
  if (status === "conflict") return "CONFLICT";
  if (status === "unresolved") return "UNRESOLVED";
  if (status === "not-applied") return "NOT APPLIED";
  if (approvalGate === "preflight" && delegateStatus === "preflight-ok") {
    return "READY FOR APPROVAL";
  }
  return "SUCCESS";
}

function appendRepositoryStatus(lines, result) {
  lines.push(`Branch: ${displayValue(result.branch)}`);
  lines.push(`HEAD: ${displayValue(result.head)}`);
  lines.push(`upstream: ${displayValue(result.upstream)}`);
  lines.push(`ahead / behind: ${result.ahead ?? 0} / ${result.behind ?? 0}`);
  lines.push(`Working tree: ${result.dirty ? "dirty" : "clean"}`);
  lines.push(
    `staged / unstaged / untracked / conflicted: ${result.staged ?? 0}`
    + ` / ${result.unstaged ?? 0} / ${result.untracked ?? 0} / ${result.conflicted ?? 0}`,
  );
  if (Array.isArray(result.versions) && result.versions.length > 0) {
    const versions = result.versions
      .filter((entry) => entry.present)
      .map((entry) => `${oneLine(entry.path)}=${oneLine(entry.value)}`);
    if (versions.length > 0) lines.push(`Versions: ${versions.join(", ")}`);
  }
}

function appendIssueRead(lines, result) {
  lines.push(`Repository: ${displayValue(result.repository)}`);
  lines.push(`Read mode: ${displayValue(result.mode)}`);
  if (result.mode === "issue" && result.issue) {
    lines.push(`Issue: #${result.issue.number}`);
    lines.push(`Title: ${displayValue(result.issue.title)}`);
    lines.push(`State: ${displayValue(result.issue.state)}`);
    lines.push(`Labels: ${labelsValue(result.issue.labels)}`);
    lines.push(`URL: ${displayValue(result.issue.html_url ?? result.issue.url)}`);
    lines.push(`Comment count: ${result.issue.comments?.length ?? 0}`);
  } else if (result.mode === "list") {
    lines.push(`State filter: ${displayValue(result.state)}`);
    lines.push(`Issue count: ${result.issues?.length ?? 0}`);
  } else if (result.mode === "labels") {
    lines.push(`Label count: ${result.labels?.length ?? 0}`);
  }
}

function appendIssueOperation(lines, workflow, result) {
  lines.push(`Repository: ${displayValue(result.repository)}`);
  if (result.issue_number || result.issue) {
    lines.push(`Issue: #${result.issue_number ?? result.issue}`);
  }
  if (result.title) lines.push(`Title: ${oneLine(result.title)}`);
  if (Object.hasOwn(result, "labels")) lines.push(`Labels: ${labelsValue(result.labels)}`);
  if (result.parent_issue) {
    lines.push(
      `Parent Issue: #${result.parent_issue.number} (${displayValue(result.parent_issue.state)})`
      + ` ${displayValue(result.parent_issue.title)}`,
    );
  }
  if (result.draft) lines.push(`Draft: ${displayValue(result.draft)}`);
  if (result.draft_sha256) lines.push(`Draft SHA-256: ${result.draft_sha256}`);
  if (result.labels_sha256) lines.push(`Label selection SHA-256: ${result.labels_sha256}`);
  if (result.parent_sha256) lines.push(`Parent Issue snapshot SHA-256: ${result.parent_sha256}`);
  if (result.issue_url) lines.push(`URL: ${result.issue_url}`);
  if (result.issue_verification?.status) {
    lines.push(`Issue verification: ${result.issue_verification.status}`);
  }
  if (result.label_verification?.status) {
    lines.push(`Label verification: ${result.label_verification.status}`);
  }
  if (result.parent_verification?.status) {
    lines.push(`Parent Issue verification: ${result.parent_verification.status}`);
  }
  if (workflow.endsWith(".preflight") && result.apply_arguments) {
    lines.push("Remote mutation: not invoked");
    if (result.handoff) {
      lines.push(`Approval ID: ${result.handoff.id}`);
      if (result.handoff.short_id) lines.push(`Approval suffix: ${result.handoff.short_id}`);
    }
    const approval = result.handoff
      ? `miku-scm approve ${result.handoff.short_id ?? result.handoff.id}`
      : "miku-scm approve";
    lines.push(`Approval command: reply with exactly \`${approval}\` in chat`);
  }
}

function appendHandoffList(lines, result) {
  const handoffs = Array.isArray(result.handoffs) ? result.handoffs : [];
  lines.push(`Pending handoff count: ${result.pending_count ?? handoffs.length}`);
  for (const handoff of handoffs) {
    lines.push(`Handoff ID: ${displayValue(handoff.id)}`);
    if (handoff.short_id) lines.push(`Approval suffix: ${displayValue(handoff.short_id)}`);
    lines.push(`Apply workflow: ${displayValue(handoff.apply_workflow)}`);
    lines.push(`Repository: ${displayValue(handoff.repository)}`);
    if (handoff.issue) lines.push(`Issue: #${handoff.issue}`);
    if (handoff.title) lines.push(`Title: ${displayValue(handoff.title)}`);
    if (handoff.draft) lines.push(`Draft: ${displayValue(handoff.draft)}`);
    lines.push(`Created at: ${displayValue(handoff.created_at)}`);
    const selector = handoff.short_id ?? handoff.id;
    lines.push(`Approve command: miku-scm approve ${displayValue(selector)}`);
    lines.push(`Dismiss command: miku-scm dismiss ${displayValue(selector)}`);
  }
  if (handoffs.length > 1) {
    lines.push("Batch approval format: miku-scm approve batch <handoff-selector> <handoff-selector> [...]");
  }
}

function appendHandoffBatch(lines, result) {
  const results = Array.isArray(result.results) ? result.results : [];
  lines.push(`Batch status: ${displayValue(result.batch_status ?? result.status)}`);
  lines.push(`Requested handoff count: ${result.requested_count ?? 0}`);
  lines.push(`Processed handoff count: ${result.processed_count ?? results.length}`);
  lines.push(`Applied handoff count: ${result.applied_count ?? 0}`);
  for (let index = 0; index < results.length; index += 1) {
    const entry = results[index];
    lines.push(
      `Step ${index + 1}: ${displayValue(entry.handoff?.id)}`
      + ` | ${displayValue(entry.apply_workflow)}`
      + ` | ${displayValue(entry.status)}`,
    );
    if (entry.dependency_refresh) {
      lines.push(
        `Step ${index + 1} dependency refresh: `
        + `${displayValue(entry.dependency_refresh.status)}`,
      );
      const options = Array.isArray(entry.dependency_refresh.refreshed_options)
        ? entry.dependency_refresh.refreshed_options
        : [];
      if (options.length > 0) {
        lines.push(`Step ${index + 1} refreshed options: ${options.map(oneLine).join(", ")}`);
      }
    }
  }
  if (result.stopped_handoff) {
    lines.push(`Stopped handoff: ${displayValue(result.stopped_handoff)}`);
    lines.push(`Stopped status: ${displayValue(result.stopped_status)}`);
    const stopped = results.find((entry) => entry.handoff?.id === result.stopped_handoff);
    const delegate = stopped?.apply_result?.delegate_result;
    if (stopped?.apply_result?.status) {
      lines.push(`Stopped apply status: ${displayValue(stopped.apply_result.status)}`);
    }
    if (delegate?.stage) lines.push(`Stopped stage: ${displayValue(delegate.stage)}`);
    if (delegate?.reviewed_updated_at) {
      lines.push(`Reviewed updated at: ${displayValue(delegate.reviewed_updated_at)}`);
    }
    if (delegate?.observed_updated_at) {
      lines.push(`Observed updated at: ${displayValue(delegate.observed_updated_at)}`);
    }
  }
  if (result.stop_reason) lines.push(`Stop reason: ${displayValue(result.stop_reason)}`);
  const remaining = Array.isArray(result.remaining_handoffs) ? result.remaining_handoffs : [];
  lines.push(`Remaining handoff count: ${remaining.length}`);
  for (const handoff of remaining) lines.push(`Remaining handoff: ${displayValue(handoff)}`);
}

function appendHandoffDismiss(lines, result) {
  lines.push(`Handoff ID: ${displayValue(result.handoff?.id)}`);
  lines.push(`Handoff status: ${displayValue(result.handoff?.status)}`);
  lines.push(`Handoff path: ${displayValue(result.handoff?.path)}`);
}

function appendGeneric(lines, result) {
  const repository = result.repository ?? result.repo;
  if (repository) {
    const displayedRepository = pathLikeAbsolute(repository) ? "local repository" : repository;
    lines.push(`Repository: ${displayValue(displayedRepository)}`);
  }
  if (result.branch) lines.push(`Branch: ${displayValue(result.branch)}`);
  if (result.status) lines.push(`Delegate status: ${displayValue(result.status)}`);
  if (result.plan_path) lines.push(`Plan: ${displayValue(result.plan_path)}`);
  if (result.plan_sha256) lines.push(`Plan SHA-256: ${result.plan_sha256}`);
  if (result.issue_url) lines.push(`URL: ${result.issue_url}`);
}

function appendRecommit(lines, result) {
  const repository = result.repository ?? result.repo;
  if (repository) {
    const displayedRepository = pathLikeAbsolute(repository) ? "local repository" : repository;
    lines.push(`Repository: ${displayValue(displayedRepository)}`);
  }
  lines.push(`Branch: ${displayValue(result.branch)}`);
  lines.push(`Delegate status: ${displayValue(result.status)}`);
  lines.push(`Base: ${displayValue(result.base)}`);
  if (result.base_commit) lines.push(`Base commit: ${result.base_commit}`);
  lines.push(
    `${result.mode === "apply" ? "Backup branch" : "Backup branch candidate"}: `
    + `${displayValue(result.backup_branch)}`,
  );
  lines.push(`PR draft: ${displayValue(result.pr_draft)}`);
  if (result.pr_draft_sha256) lines.push(`PR draft SHA-256: ${result.pr_draft_sha256}`);
  if (Number.isSafeInteger(result.commits_to_collapse)) {
    lines.push(`Commits to collapse: ${result.commits_to_collapse}`);
  }
  if (result.mode === "apply") {
    lines.push(`New HEAD: ${displayValue(result.new_head)}`);
    lines.push(`Final status: ${displayValue(result.final_status)}`);
  } else {
    lines.push(`Working tree: ${result.dirty ? "dirty" : "clean"}`);
    lines.push(`Blockers: ${labelsValue(result.blockers)}`);
  }
}

function appendPublication(lines, result) {
  lines.push(`Repository: ${displayValue(result.repository)}`);
  lines.push(`Pushed branch: ${displayValue(result.pushed_branch)}`);
  lines.push(`Final branch: ${displayValue(result.final_branch)}`);
  lines.push(`Final status: ${displayValue(result.final_status)}`);
  lines.push(`Post-push comparison: ${displayValue(result.comparison)}`);
  lines.push(`Repository URL: ${displayValue(result.repository_url, "unresolved")}`);
  lines.push(`PR lookup: ${displayValue(result.pr_lookup, "unresolved")}`);
  if (result.pr_url) {
    lines.push(`PR URL: ${displayValue(result.pr_url, "unresolved")}`);
  } else if (Array.isArray(result.pr_urls) && result.pr_urls.length > 0) {
    lines.push(`PR URLs: ${result.pr_urls.map((url) => displayValue(url, "unresolved")).join(", ")}`);
  } else {
    lines.push(`PR creation URL: ${displayValue(result.pr_creation_url, "unresolved")}`);
  }
  lines.push(`Version: ${displayValue(result.version, "unresolved")}`);
  lines.push(`Recommended tag: ${displayValue(result.recommended_tag, "unresolved")}`);
  lines.push(`PR mutation: ${result.pull_request_mutation ? "yes" : "no"}`);
  lines.push(`Tag mutation: ${result.tag_mutation ? "yes" : "no"}`);
  if (result.plan_path) lines.push(`Plan: ${displayValue(result.plan_path)}`);
  if (result.plan_sha256) lines.push(`Plan SHA-256: ${displayValue(result.plan_sha256)}`);
}

function appendRecommitPush(lines, result) {
  lines.push(`Repository: ${displayValue(result.repository)}`);
  lines.push(`Branch: ${displayValue(result.branch)}`);
  lines.push(`Delegate status: ${displayValue(result.status)}`);
  lines.push(`Base: ${displayValue(result.base)}`);
  if (result.base_commit) lines.push(`Base commit: ${displayValue(result.base_commit)}`);
  lines.push(`Backup branch: ${displayValue(result.backup_branch)}`);
  lines.push(`PR draft: ${displayValue(result.pr_draft)}`);
  if (result.pr_draft_sha256) lines.push(`PR draft SHA-256: ${displayValue(result.pr_draft_sha256)}`);
  if (Number.isSafeInteger(result.commits_to_collapse)) {
    lines.push(`Commits to collapse: ${result.commits_to_collapse}`);
  }
  if (result.new_head) lines.push(`New HEAD: ${displayValue(result.new_head)}`);
  if (result.status === "published") {
    lines.push(`Pushed branch: ${displayValue(result.pushed_branch)}`);
    lines.push(`Final branch: ${displayValue(result.final_branch)}`);
    lines.push(`Post-push comparison: ${displayValue(result.comparison)}`);
    lines.push(`Repository URL: ${displayValue(result.repository_url, "unresolved")}`);
    lines.push(`PR lookup: ${displayValue(result.pr_lookup, "unresolved")}`);
    if (result.pr_url) lines.push(`PR URL: ${displayValue(result.pr_url)}`);
    else lines.push(`PR creation URL: ${displayValue(result.pr_creation_url, "unresolved")}`);
    lines.push(`Version: ${displayValue(result.version, "unresolved")}`);
    lines.push(`Recommended tag: ${displayValue(result.recommended_tag, "unresolved")}`);
  } else if (result.publication) {
    lines.push(`Publication status: ${displayValue(result.publication.status)}`);
    lines.push(`Publication stage: ${displayValue(result.publication.stage)}`);
    lines.push(`Publication detail: ${displayValue(result.publication.message)}`);
  }
}

function appendPostMergeNextWork(lines, result) {
  lines.push(`Previous branch: ${displayValue(result.previous_branch)}`);
  lines.push(`Remote: ${displayValue(result.remote)}`);
  lines.push(`Base branch: ${displayValue(result.base)}`);
  lines.push(`Base commit: ${displayValue(result.base_commit)}`);
  lines.push(`Version: ${displayValue(result.version, "unresolved")}`);
  lines.push(`Version source: ${displayValue(result.version_source, "unresolved")}`);
  lines.push(`Recommended tag: ${displayValue(result.recommended_tag, "unresolved")}`);
  lines.push(`Tag status: ${displayValue(result.tag_status, "unresolved")}`);
  if (result.tag_target) lines.push(`Tag target: ${displayValue(result.tag_target)}`);
  lines.push(`Next work branch: ${displayValue(result.next_branch)}`);
  lines.push(`Final branch: ${displayValue(result.final_branch)}`);
  lines.push(`Post-create comparison: ${displayValue(result.comparison)}`);
  lines.push(`Tag mutation: ${result.tag_mutation ? "yes" : "no"}`);
  lines.push(`Release mutation: ${result.release_mutation ? "yes" : "no"}`);
}

function appendWorkCommit(lines, result) {
  lines.push(`Repository: ${displayValue(result.repository)}`);
  lines.push(`Branch: ${displayValue(result.branch)}`);
  lines.push(`Delegate status: ${displayValue(result.status)}`);
  if (result.head_before) lines.push(`Previous HEAD: ${displayValue(result.head_before)}`);
  if (result.head) lines.push(`New HEAD: ${displayValue(result.head)}`);
  if (result.commit_message) lines.push(`Commit message: ${oneLine(result.commit_message)}`);
  if (result.message_source) lines.push(`Commit message source: ${displayValue(result.message_source)}`);
  if (Array.isArray(result.paths)) lines.push(`Committed path count: ${result.paths.length}`);
  if (Array.isArray(result.checks)) lines.push(`Pre-commit checks: ${result.checks.length ? result.checks.join(", ") : "none"}`);
  if (result.version_notice) {
    lines.push(`Version notice: ${displayValue(result.version_notice.version, "unresolved")}`);
    lines.push(`Coupled version: ${displayValue(result.version_notice.coupled_version, "not-applicable")}`);
    lines.push(`Recommended tag: ${displayValue(result.version_notice.recommended_tag, "unresolved")}`);
    lines.push(`Version increment: ${displayValue(result.version_notice.increment_status, "not_applicable")}`);
    if (result.version_notice.increment_status === "increment_not_observed") {
      lines.push("Version increment reminder: not observed; this is non-blocking.");
    }
  }
  if (Object.hasOwn(result, "working_tree_clean")) lines.push(`Working tree: ${result.working_tree_clean ? "clean" : "dirty"}`);
  if (result.stage) lines.push(`Stopped stage: ${displayValue(result.stage)}`);
  if (result.reason) lines.push(`Reason: ${displayValue(result.reason)}`);
  if (result.message) lines.push(`Detail: ${displayValue(result.message)}`);
}

function pathLikeAbsolute(value) {
  return typeof value === "string"
    && (value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value));
}

function appendVersion(lines, result) {
  appendGeneric(lines, result);
  lines.push(`Policy: ${displayValue(result.policy, "unspecified")}`);
  lines.push(`Policy resolved: ${result.policy_resolved ? "yes" : "no"}`);
  if (Array.isArray(result.authoritative)) {
    for (const entry of result.authoritative) {
      lines.push(`Current value (${displayValue(entry.path)}): ${displayValue(entry.value)}`);
    }
  }
  if (result.proposed) {
    const proposed = Array.isArray(result.proposed) ? result.proposed : [result.proposed];
    for (const entry of proposed) {
      if (entry && typeof entry === "object") {
        lines.push(
          `Candidate (${displayValue(entry.path, "version")}): `
          + `${displayValue(entry.value ?? entry.proposed ?? entry.next)}`,
        );
      }
    }
  }
}

function appendWriting(lines, result) {
  lines.push(`Repository: ${displayValue(result.github_repository ?? result.repository)}`);
  if (result.branch) lines.push(`Branch: ${displayValue(result.branch)}`);
  if (result.target) {
    lines.push(`Git target: ${displayValue(result.target.resolved_log_target)}`);
    lines.push(`Target resolution: ${displayValue(result.target.resolution)}`);
  }
  if (Number.isSafeInteger(result.commit_count)) {
    lines.push(`Commit count: ${result.commit_count}`);
  }
  if (Array.isArray(result.changed_files)) {
    lines.push(`Changed file count: ${result.changed_files.length}`);
  }
  if (Array.isArray(result.documents)) {
    lines.push(`Evidence document count: ${result.documents.length}`);
  }
  lines.push(`evidence SHA-256: ${displayValue(result.evidence_sha256)}`);
  lines.push(`Suggested draft: ${displayValue(result.suggested_draft_path)}`);
  const truncated = Boolean(
    result.commits_truncated || result.patch_truncated || result.documents_truncated,
  );
  lines.push(`Evidence truncated: ${truncated ? "yes" : "no"}`);
  lines.push("Writing: not invoked");
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
      + `Approval handoff: ${result.handoff.id} (${result.handoff.status})\n`;
  }
  const title = WORKFLOW_TITLES[workflow] ?? workflow;
  const lines = [`[${resultHeader({ status, approvalGate, delegateStatus })}] ${title}`, ""];

  if (error) {
    lines.push(`workflow: ${workflow}`);
    lines.push(`Classification: ${displayValue(error.classification, "unknown")}`);
    if (error.code) lines.push(`Code: ${error.code}`);
    lines.push(`Message: ${displayValue(error.message, "unknown error")}`);
    if (error.bad_argument) lines.push(`Bad argument: ${error.bad_argument}`);
    lines.push(`Mutation invoked: ${mutationInvoked === null ? "unknown" : mutationInvoked ? "yes" : "no"}`);
    lines.push(`Retryability: ${displayValue(error.retryability, "review-required")}`);
    if (error.help_command) lines.push(`Help: ${error.help_command}`);
    return `${lines.join("\n")}\n`;
  }

  if (workflow === "repository.status") {
    appendRepositoryStatus(lines, result ?? {});
  } else if (workflow === "repository.post-merge.next-work") {
    appendPostMergeNextWork(lines, result ?? {});
  } else if (workflow === "work.commit") {
    appendWorkCommit(lines, result ?? {});
  } else if (workflow === "github.issue.read") {
    appendIssueRead(lines, result ?? {});
  } else if (workflow === "github.issue.handoff.list") {
    appendHandoffList(lines, result ?? {});
  } else if (workflow === "github.issue.handoff.batch.apply") {
    appendHandoffBatch(lines, result ?? {});
  } else if (workflow === "github.issue.handoff.dismiss") {
    appendHandoffDismiss(lines, result ?? {});
  } else if (workflow.startsWith("github.issue.")) {
    appendIssueOperation(lines, workflow, result ?? {});
  } else if (workflow.startsWith("version.")) {
    appendVersion(lines, result ?? {});
  } else if (workflow.startsWith("writing.")) {
    appendWriting(lines, result ?? {});
  } else if (workflow === "pr.publish.apply") {
    appendPublication(lines, result ?? {});
  } else if (workflow === "pr.recommit.push") {
    appendRecommitPush(lines, result ?? {});
  } else if (workflow.startsWith("pr.recommit.")) {
    appendRecommit(lines, result ?? {});
  } else {
    appendGeneric(lines, result ?? {});
  }
  lines.push(`Mutation invoked: ${mutationInvoked === null ? "unknown" : mutationInvoked ? "yes" : "no"}`);
  if ((workflow === "pr.publish.apply" || workflow === "pr.recommit.push" || workflow === "repository.post-merge.next-work")
    && result?.human_handoff) {
    lines.push("");
    lines.push(displayValue(result.human_handoff));
  }
  return `${lines.join("\n")}\n`;
}
