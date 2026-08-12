import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";

import {
  BRANCH_PATTERN,
  MAX_DOCUMENT_CHARS,
  TARGET_PATTERN,
  branchSlug,
  canonicalText,
  defaultGit,
  formatJst,
  isPathInside,
  normalizeResultPath,
  operationalBase,
  repositoryIdentity,
  safeRelativeExisting,
  sha256,
  uniqueFile,
  writeFileAtomic,
} from "./github-writer-core.mjs";
import { workflowContractById } from "./github-writer-workflow-contract-lock.mjs";
import { workflowById } from "./github-writer-workflow-manifest.mjs";

export const PLAN_SCHEMA_VERSION = "github-writer.plan/v1";

const PLAN_PATH_PATTERN = /^(?:workplace|temp)\/github-writer\/plans\/[A-Za-z0-9._-]+\.json$/;

class MutationFailure extends Error {
  constructor(message, cause) {
    super(message, { cause });
    this.name = "MutationFailure";
    this.mutationInvoked = true;
  }
}

function validateDraft(mode, text) {
  const canonical = canonicalText(text);
  const lines = canonical.split("\n");
  if (!lines[0]?.trim()) throw new Error("Draft title or first line is empty");
  if (canonical.length > MAX_DOCUMENT_CHARS) throw new Error("Draft exceeds the size limit");
  if (/\0/.test(canonical)) throw new Error("Draft contains a NUL character");
  if ((mode === "pr" || mode === "release") && !canonical.includes("\n\n")) {
    throw new Error("Draft must contain a first line and Markdown body");
  }
  if (/(?:^|\n)(?:token|password|secret|api[_-]?key|authorization)\s*[:=]/i.test(canonical)) {
    throw new Error("Draft contains a sensitive-looking line");
  }
  return canonical.endsWith("\n") ? canonical : `${canonical}\n`;
}

export function validateAndSaveDraft(options, dependencies = {}) {
  const git = dependencies.git ?? defaultGit;
  const now = dependencies.now?.() ?? new Date();
  const identity = repositoryIdentity(options.repo, git);
  const input = safeRelativeExisting(identity.root, options.input, "Draft input");
  const content = validateDraft(options.mode, readFileSync(input.absolute, "utf8"));
  const base = operationalBase(identity.root);
  const stamp = formatJst(now);
  const slug = branchSlug(identity.branch);
  const filename = options.mode === "pr"
    ? `pr-${slug ? `${slug}-` : ""}${stamp}.md`
    : `${options.mode}-${stamp}.md`;
  const output = uniqueFile(base, filename);
  writeFileAtomic(output, content);
  return {
    repository: identity.repository,
    mode: options.mode,
    source: input.relative,
    saved_path: normalizeResultPath(path.relative(identity.root, output)),
    draft_sha256: sha256(content),
    platform: process.platform,
  };
}

function chooseBackup(root, requested, now, git) {
  const base = requested || `backup/${formatJst(now, true)}`;
  if (!base.startsWith("backup/") || !BRANCH_PATTERN.test(base)) {
    throw new Error("Backup branch must be a valid name under backup/");
  }
  const valid = git(root, ["check-ref-format", "--branch", base], { allowFailure: true });
  if (!valid.ok) throw new Error("Backup branch name is invalid");
  if (requested) {
    const exists = git(root, ["show-ref", "--verify", "--quiet", `refs/heads/${base}`], {
      allowFailure: true,
    });
    if (exists.ok) throw new Error("Requested backup branch already exists");
    return base;
  }
  for (let index = 1; index < 100; index += 1) {
    const candidate = index === 1 ? base : `${base}-${index}`;
    const exists = git(root, ["show-ref", "--verify", "--quiet", `refs/heads/${candidate}`], {
      allowFailure: true,
    });
    if (!exists.ok) return candidate;
  }
  throw new Error("Could not resolve an unused backup branch");
}

function planDirectory(root) {
  return path.join(operationalBase(root), "plans");
}

function attemptDirectory(root) {
  return path.join(operationalBase(root), "attempts");
}

function savePlan(root, plan, now) {
  const content = `${JSON.stringify(plan, null, 2)}\n`;
  const digest = sha256(content);
  const file = uniqueFile(
    planDirectory(root),
    `${plan.workflow.replaceAll(".", "-")}-${branchSlug(plan.branch)}-${formatJst(now)}.json`,
  );
  writeFileAtomic(file, content);
  return {
    plan_path: normalizeResultPath(path.relative(root, file)),
    plan_sha256: digest,
  };
}

function loadPlan(root, requested, expectedDigest) {
  if (!PLAN_PATH_PATTERN.test(normalizeResultPath(requested))) {
    throw new Error("Plan must be under workplace/github-writer/plans");
  }
  const resolved = safeRelativeExisting(root, requested, "Plan");
  const expectedDirectory = realpathSync(planDirectory(root));
  if (!isPathInside(expectedDirectory, resolved.absolute)) throw new Error("Plan escapes plan directory");
  const content = readFileSync(resolved.absolute, "utf8");
  if (!/^[0-9a-f]{64}$/i.test(expectedDigest) || sha256(content) !== expectedDigest.toLowerCase()) {
    throw new Error("Plan SHA-256 changed");
  }
  const plan = JSON.parse(content);
  if (plan?.schema_version !== PLAN_SCHEMA_VERSION || !workflowById(plan.workflow)) {
    throw new Error("Plan schema or workflow is invalid");
  }
  const contract = workflowContractById(plan.workflow);
  if (!contract
    || plan.workflow_contract !== contract.id
    || plan.contract_version !== contract.contract_version
    || plan.contract_pair_sha256 !== contract.contract_pair_sha256) {
    throw new Error("Plan workflow contract changed; create a new preflight");
  }
  return { plan, plan_path: resolved.relative, plan_sha256: expectedDigest.toLowerCase() };
}

function attemptPaths(root, digest) {
  return {
    pending: path.join(attemptDirectory(root), `${digest}.pending.json`),
    result: path.join(attemptDirectory(root), `${digest}.result.json`),
  };
}

function beginAttempt(root, loaded) {
  const files = attemptPaths(root, loaded.plan_sha256);
  if (existsSync(files.pending) || existsSync(files.result)) {
    throw new Error("This plan already has an attempt; do not retry it");
  }
  writeFileAtomic(files.pending, `${JSON.stringify({
    schema_version: "github-writer.attempt/v1",
    status: "pending",
    plan: loaded.plan_path,
    plan_sha256: loaded.plan_sha256,
    started_at: new Date().toISOString(),
  }, null, 2)}\n`);
  return files;
}

function finishAttempt(files, value) {
  writeFileAtomic(files.result, `${JSON.stringify(value, null, 2)}\n`);
  return files.result;
}

function mutationFailure(attempt, loaded, error) {
  const message = error instanceof Error ? error.message : String(error);
  let recordFailure = "";
  try {
    finishAttempt(attempt, {
      schema_version: "github-writer.attempt/v1",
      status: "failure",
      plan: loaded.plan_path,
      plan_sha256: loaded.plan_sha256,
      message,
      finished_at: new Date().toISOString(),
      retryable: false,
    });
  } catch (recordError) {
    recordFailure = `; attempt result could not be written: ${
      recordError instanceof Error ? recordError.message : String(recordError)
    }`;
  }
  return new MutationFailure(`${message}${recordFailure}`, error);
}

export function backupPreflight(options, dependencies = {}) {
  const git = dependencies.git ?? defaultGit;
  const now = dependencies.now?.() ?? new Date();
  const identity = repositoryIdentity(options.repo, git);
  const backup = chooseBackup(identity.root, options.backupName, now, git);
  const contract = workflowContractById("backup.apply");
  const plan = {
    schema_version: PLAN_SCHEMA_VERSION,
    workflow: "backup.apply",
    workflow_contract: contract.id,
    contract_version: contract.contract_version,
    contract_pair_sha256: contract.contract_pair_sha256,
    repository: identity.repository,
    branch: identity.branch,
    expected_head: identity.head,
    expected_status_sha256: sha256(identity.status_porcelain),
    backup_branch: backup,
    created_at: now.toISOString(),
    platform: process.platform,
  };
  return {
    repository: identity.repository,
    branch: identity.branch,
    head: identity.head,
    dirty: identity.dirty,
    backup_branch: backup,
    ...savePlan(identity.root, plan, now),
  };
}

function verifyPlanState(identity, plan) {
  if (identity.repository !== plan.repository
    || identity.branch !== plan.branch
    || identity.head !== plan.expected_head
    || sha256(identity.status_porcelain) !== plan.expected_status_sha256) {
    throw new Error("Repository state changed after preflight");
  }
}

function assertRecommitBranch(identity) {
  if (!identity.branch) throw new Error("PR recommit requires a non-detached branch");
  if (identity.branch.endsWith("-done")) throw new Error(`PR recommit refuses a frozen branch: ${identity.branch}`);
}

function createAndVerifyBackup(root, backupBranch, expectedHead, git) {
  git(root, ["branch", backupBranch, "HEAD"]);
  const target = git(root, ["rev-parse", "--verify", `refs/heads/${backupBranch}^{commit}`]).out;
  if (target !== expectedHead) throw new Error("Backup branch does not point to the reviewed pre-reset HEAD");
  return target;
}

export function backupApply(options, dependencies = {}) {
  const git = dependencies.git ?? defaultGit;
  const identity = repositoryIdentity(options.repo, git);
  const loaded = loadPlan(identity.root, options.plan, options.expectedPlanSha256);
  if (loaded.plan.workflow !== "backup.apply") throw new Error("Plan is not a backup plan");
  verifyPlanState(identity, loaded.plan);
  const attempt = beginAttempt(identity.root, loaded);
  try {
    const target = createAndVerifyBackup(identity.root, loaded.plan.backup_branch, identity.head, git);
    const result = {
      schema_version: "github-writer.attempt/v1",
      status: "success",
      plan: loaded.plan_path,
      plan_sha256: loaded.plan_sha256,
      backup_branch: loaded.plan.backup_branch,
      target,
      finished_at: new Date().toISOString(),
    };
    const resultFile = finishAttempt(attempt, result);
    return { ...result, attempt_record: normalizeResultPath(path.relative(identity.root, resultFile)) };
  } catch (error) {
    throw mutationFailure(attempt, loaded, error);
  }
}

function resolveBase(root, branch, requested, git) {
  const candidates = requested
    ? [{ value: requested, source: "explicit" }]
    : [
      {
        value: git(root, [
          "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}",
        ], { allowFailure: true }).out,
        source: "upstream",
      },
      {
        value: git(root, [
          "symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD",
        ], { allowFailure: true }).out,
        source: "origin-head",
      },
      { value: "origin/devel", source: "origin-devel" },
    ];
  for (const candidate of candidates) {
    if (!candidate.value || !TARGET_PATTERN.test(candidate.value)) continue;
    if (candidate.source === "upstream"
      && branch
      && candidate.value.replace(/^refs\/remotes\//, "").endsWith(`/${branch}`)) {
      continue;
    }
    const resolved = git(root, [
      "rev-parse", "--verify", `${candidate.value}^{commit}`,
    ], { allowFailure: true });
    if (resolved.ok) return { base: candidate.value, base_commit: resolved.out, source: candidate.source };
  }
  throw new Error("Could not resolve recommit base");
}

export function recommitPreflight(options, dependencies = {}) {
  const git = dependencies.git ?? defaultGit;
  const now = dependencies.now?.() ?? new Date();
  const identity = repositoryIdentity(options.repo, git);
  assertRecommitBranch(identity);
  if (identity.dirty) throw new Error("PR recommit requires a clean working tree");
  const base = resolveBase(identity.root, identity.branch, options.base, git);
  const ancestor = git(identity.root, [
    "merge-base", "--is-ancestor", base.base_commit, identity.head,
  ], { allowFailure: true });
  if (!ancestor.ok) throw new Error("Recommit base is not an ancestor of HEAD");
  const draft = safeRelativeExisting(identity.root, options.prDraft, "PR draft");
  const draftContent = validateDraft("pr", readFileSync(draft.absolute, "utf8"));
  const backup = chooseBackup(identity.root, "", now, git);
  const commits = git(identity.root, [
    "log", "--oneline", `${base.base_commit}..${identity.head}`,
  ]).out.split("\n").filter(Boolean);
  if (commits.length === 0) throw new Error("No commits to collapse");
  const contract = workflowContractById("pr.recommit.apply");
  const plan = {
    schema_version: PLAN_SCHEMA_VERSION,
    workflow: "pr.recommit.apply",
    workflow_contract: contract.id,
    contract_version: contract.contract_version,
    contract_pair_sha256: contract.contract_pair_sha256,
    repository: identity.repository,
    branch: identity.branch,
    expected_head: identity.head,
    expected_status_sha256: sha256(identity.status_porcelain),
    base: base.base,
    base_commit: base.base_commit,
    pr_draft: draft.relative,
    pr_draft_sha256: sha256(draftContent),
    backup_branch: backup,
    commits_to_collapse: commits.length,
    created_at: now.toISOString(),
    platform: process.platform,
  };
  return {
    repository: identity.repository,
    branch: identity.branch,
    head: identity.head,
    base: base.base,
    base_commit: base.base_commit,
    base_source: base.source,
    pr_draft: draft.relative,
    pr_draft_sha256: plan.pr_draft_sha256,
    backup_branch: backup,
    commits_to_collapse: commits.length,
    commits,
    diff_stat: git(identity.root, ["diff", "--stat", `${base.base_commit}..${identity.head}`]).out,
    ...savePlan(identity.root, plan, now),
  };
}

export function recommitApply(options, dependencies = {}) {
  const git = dependencies.git ?? defaultGit;
  const identity = repositoryIdentity(options.repo, git);
  assertRecommitBranch(identity);
  const loaded = loadPlan(identity.root, options.plan, options.expectedPlanSha256);
  const plan = loaded.plan;
  if (plan.workflow !== "pr.recommit.apply") throw new Error("Plan is not a recommit plan");
  verifyPlanState(identity, plan);
  const base = git(identity.root, ["rev-parse", "--verify", `${plan.base}^{commit}`]).out;
  if (base !== plan.base_commit) throw new Error("Base changed after preflight");
  const draft = safeRelativeExisting(identity.root, plan.pr_draft, "PR draft");
  const draftContent = validateDraft("pr", readFileSync(draft.absolute, "utf8"));
  if (sha256(draftContent) !== plan.pr_draft_sha256) throw new Error("PR draft changed after preflight");
  const attempt = beginAttempt(identity.root, loaded);
  try {
    createAndVerifyBackup(identity.root, plan.backup_branch, plan.expected_head, git);
    git(identity.root, ["reset", "--soft", plan.base_commit]);
    git(identity.root, ["commit", "-F", draft.absolute]);
    const finalIdentity = repositoryIdentity(identity.root, git);
    if (finalIdentity.dirty) throw new Error("Recommit postcondition left a dirty working tree");
    const parent = git(identity.root, ["rev-parse", `${finalIdentity.head}^`]).out;
    if (parent !== plan.base_commit) throw new Error("Recommit parent postcondition failed");
    const result = {
      schema_version: "github-writer.attempt/v1",
      status: "success",
      plan: loaded.plan_path,
      plan_sha256: loaded.plan_sha256,
      backup_branch: plan.backup_branch,
      previous_head: plan.expected_head,
      new_head: finalIdentity.head,
      finished_at: new Date().toISOString(),
    };
    const resultFile = finishAttempt(attempt, result);
    return { ...result, attempt_record: normalizeResultPath(path.relative(identity.root, resultFile)) };
  } catch (error) {
    throw mutationFailure(attempt, loaded, error);
  }
}
