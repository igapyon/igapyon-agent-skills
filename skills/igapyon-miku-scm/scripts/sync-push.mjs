import { access, readFile, realpath } from "node:fs/promises";
import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { prepareWritingEvidence } from "./miku-scm-writing-prepare.mjs";
import { runWorkCommit } from "./work-commit.mjs";
import { runPublish } from "./post-recommit-publish.mjs";
import { runRecommitPush } from "./pr-recommit-push.mjs";
import { workflowContractById } from "./miku-scm-workflow-contract-lock.mjs";
import { platformWarnings } from "./miku-scm-command-runner.mjs";
import { ancestor, assertIdle, assertRemote, assertSnapshot, beforeAction, branch, checkPending, checkedId, failure, fetchBase, hash, head, loadOperation, newId, newOperation, openSync, operationPath, pendingOperations, readJson, remoteState, requireFetchBranch, resolveBase, saveOperation, snapshot, writeJson } from "./miku-scm-sync-state.mjs";

export function parseArgs(mode, argv, cwd = process.cwd()) {
  const o = { repo: cwd, remote: "origin", base: "", message: "", allowSensitivePaths: [], operation: "", resume: "", cancel: "", recover: "", expectedPlanSha256: "", prDraft: "", expectedDraftSha256: "", apply: false, help: false };
  const common = { "--repo": "repo" };
  const fields = mode === "prepare" ? { ...common, "--remote": "remote", "--base": "base", "--message": "message", "--resume": "resume", "--cancel": "cancel", "--recover": "recover" }
    : mode === "draft.prepare" ? { ...common, "--operation": "operation", "--expected-plan-sha256": "expectedPlanSha256" }
      : { ...common, "--operation": "operation", "--expected-plan-sha256": "expectedPlanSha256", "--pr-draft": "prDraft", "--expected-draft-sha256": "expectedDraftSha256" };
  const seen = new Set();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--allow-sensitive-path" && mode === "prepare") {
      const value = argv[++i] ?? "";
      if (!value || path.isAbsolute(value) || value.split(/[\\/]/).includes("..") || /[\r\n\0]/.test(value)) throw new Error("--allow-sensitive-path must name one reviewed repository-relative path");
      o.allowSensitivePaths.push(value.replaceAll("\\", "/"));
      continue;
    }
    if (seen.has(a)) throw new Error(`Duplicate argument: ${a}`);
    seen.add(a);
    if (a === "--help" || a === "-h") o.help = true;
    else if (a === "--apply") o.apply = true;
    else if (fields[a]) { if (!argv[i + 1] || argv[i + 1].startsWith("--")) throw new Error(`Missing value: ${a}`); o[fields[a]] = argv[++i]; }
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (o.help) return o;
  if (!o.repo || (mode !== "draft.prepare" && !o.apply) || (mode === "draft.prepare" && o.apply)) throw new Error(mode === "draft.prepare" ? "sync push draft preparation is read-only and rejects --apply" : "sync push requires --apply");
  if ([o.resume, o.cancel, o.recover].filter(Boolean).length > 1) throw new Error("--resume, --cancel and --recover are exclusive");
  if ((o.resume || o.cancel) && o.allowSensitivePaths.length) throw new Error("Recovery uses the saved push options");
  if ((o.resume || o.cancel) && ["--remote", "--base", "--message"].some((v) => seen.has(v))) throw new Error("Recovery uses the saved push options");
  if (o.recover && ["--remote", "--base"].some((v) => seen.has(v))) throw new Error("Partial recovery uses the saved remote and base");
  if (o.recover) checkedId(o.recover);
  if (mode === "apply" || mode === "draft.prepare") {
    checkedId(o.operation);
    if (!/^[0-9a-f]{64}$/.test(o.expectedPlanSha256)) throw new Error("Push workflow requires the exact plan SHA-256");
    if (mode === "apply" && (!o.prDraft || !/^[0-9a-f]{64}$/.test(o.expectedDraftSha256))) throw new Error("Push apply requires the exact draft SHA-256");
  }
  return o;
}

function runtimePlatform(dependencies, ctx) {
  const platform = dependencies.platform ?? process.platform;
  ctx.warnings = [...new Set([...ctx.warnings, ...platformWarnings(platform)])];
  return platform;
}
function planFile(ctx, op) { return path.join(path.dirname(operationPath(ctx, op.id)), "plan.json"); }
async function readPlan(ctx, op) {
  const file = planFile(ctx, op);
  const actual = await realpath(file);
  const directory = await realpath(path.dirname(file));
  if (!actual.startsWith(`${directory}${path.sep}`)) throw new Error("Push plan escapes its operation directory");
  return readJson(actual);
}
function pushContract() { return workflowContractById().get("repository.sync.push.apply")?.pair_sha256 ?? null; }

async function pathExists(file) {
  try { await access(file); return true; }
  catch (error) { if (error.code === "ENOENT") return false; throw error; }
}

async function inspectRecoverablePreflightFailure(ctx, op) {
  if (op.type !== "push" || op.status !== "partial" || !op.apply_started
    || op.phase !== "recommit-push" || op.attempt?.phase !== "recommit-push" || op.attempt.completed !== false) {
    throw new Error("Only the exact saved sync-push preflight failure can use --recover");
  }
  const branchName = op.original?.branch;
  const publication = op.delegate?.publication;
  if (!branchName || op.delegate?.branch !== branchName || op.delegate?.status !== "partial"
    || publication?.status !== "conflict" || publication.stage !== "publication-preflight"
    || op.delegate.initial_remote_branch?.state !== "absent"
    || !op.recommitted_head || op.delegate.new_head !== op.recommitted_head
    || !op.backup_branch || op.delegate.backup_branch !== op.backup_branch) {
    throw new Error("Saved operation does not prove a preflight-only failure with an unpublished remote branch");
  }

  const plan = await readPlan(ctx, op);
  const expectedBackup = op.commit?.status === "created" ? op.commit.result?.head : op.original?.head;
  if (!plan || hash(plan) !== op.plan_sha256 || plan.operation !== op.id || plan.root !== ctx.root
    || plan.common !== ctx.common || plan.snapshot?.branch !== branchName || plan.snapshot?.head !== expectedBackup
    || plan.base_sha !== op.base_sha || plan.publication_expectation?.state !== "absent") {
    throw new Error("Saved sync-push plan or backup identity changed; recovery stopped");
  }

  const failedPath = /^ENOENT: no such file or directory, open '([^']+)'$/.exec(publication.message ?? "")?.[1];
  const brokenPrefix = path.join(ctx.root, "workplace", "miku-scm", "ok-push", `ok-push-${branchName}-${op.recommitted_head.slice(0, 12)}-`);
  const failedSuffix = failedPath?.startsWith(brokenPrefix) ? failedPath.slice(brokenPrefix.length) : "";
  const structuredNoPush = publication.evidence_version === 1 && publication.push_started === false;
  if (!structuredNoPush && (!branchName.includes("/") || !failedPath || path.resolve(failedPath) !== failedPath
    || !/^\d{12}\.json$/.test(failedSuffix) || await pathExists(failedPath) || await pathExists(`${failedPath}.attempt.json`))) {
    throw new Error("Saved publication result does not prove that push was never started");
  }

  await assertIdle(ctx);
  assertRemote(ctx, op.remote, true);
  const backup = ctx.git(ctx.root, ["rev-parse", "--verify", `refs/heads/${op.backup_branch}`], { allowFailure: true });
  if (!backup.ok || backup.out !== expectedBackup) throw new Error("Retained backup does not match the prepared branch HEAD");
  const current = await snapshot(ctx);
  if (current.branch !== branchName || !ancestor(ctx, op.recommitted_head, current.head)) {
    throw new Error("Current branch no longer contains the recommitted work; recovery stopped");
  }
  const remoteBranch = ctx.git(ctx.root, ["ls-remote", "--heads", op.remote.name, `refs/heads/${branchName}`]);
  if (remoteBranch.out.trim()) throw new Error("Remote work branch now exists; publication state needs manual inspection");
  await assertSnapshot(ctx, current);
  return {
    ...(failedPath ? { failure_path: failedPath } : {}),
    branch: branchName,
    base_sha: op.base_sha,
    backup_branch: op.backup_branch,
    backup_head: backup.out,
    current_head: current.head,
    remote_branch: "absent",
  };
}

async function preparedResult(ctx, op) {
  const plan = await readPlan(ctx, op);
  if (!plan || hash(plan) !== op.plan_sha256) throw new Error("Prepared push plan changed");
  const existingDraft = await pathExists(path.resolve(ctx.root, plan.draft_path)) ? hash(await draftBytes(ctx, plan.draft_path)) : null;
  return { status: "prepared", warnings: [...new Set([...(op.warnings ?? []), ...ctx.warnings])], operation_id: op.id, plan_sha256: op.plan_sha256, commit: op.commit, head: plan.snapshot.head, base: plan.base.name, base_commit: plan.base_sha, evidence: plan.evidence, suggested_draft_path: plan.draft_path, ...(existingDraft ? { existing_draft_sha256: existingDraft } : {}), ...(op.continuation ? { continuation: op.continuation } : {}), mutation_invoked: op.mutation_invoked };
}

function pendingStop(ctx, op, detail) {
  const unknown = op.status === "unresolved" || (op.apply_started && op.delegate?.publication?.stage !== "publication-preflight");
  return {
    status: "not-applied", mutation_invoked: false, operation_id: op.id,
    pending_status: op.status, pending_branch: op.original?.branch,
    publication_state: unknown ? "unknown" : "not-started-or-unverified",
    reason: `The previous sync needs inspection: ${detail}`,
    stage: op.phase, final_branch: branch(ctx), head: head(ctx), backup_branch: op.backup_branch,
    next_action: unknown
      ? "Inspect the saved publication receipt and verify the remote result before any resend. The agent must perform this inspection."
      : "Inspect the saved operation and the reported mismatch. Current work and backups are retained.",
  };
}

async function continuePendingPush(ctx, options) {
  const pending = await pendingOperations(ctx);
  if (!pending.length) return {};
  const op = pending[0];
  if (pending.length !== 1) return { stop: pendingStop(ctx, op, "More than one pending sync exists; automatic selection is ambiguous") };
  if (op.type !== "push" || op.original?.branch !== branch(ctx) || op.remote?.name !== options.remote) {
    return { stop: pendingStop(ctx, op, "The saved operation belongs to another branch or remote") };
  }
  try {
    await assertIdle(ctx);
    assertRemote(ctx, op.remote, true);
    if (options.base && resolveBase(ctx, options.remote, options.base).ref !== op.base.ref) throw new Error("Requested base differs from the saved operation");
    const stoppedCommit = op.commit?.result;
    if (op.status === "partial" && op.phase === "work-commit" && !op.apply_started
      && stoppedCommit?.status === "partial" && ["pre-commit-check", "post-check-verify"].includes(stoppedCommit.stage)
      && stoppedCommit.head_before === op.original.head && head(ctx) === op.original.head
      && !op.backup_branch && !op.recommitted_head && !op.delegate) {
      op.status = "superseded";
      op.superseded_reason = "A repeated sync push requested fresh checks after a known pre-commit stop";
      await saveOperation(ctx, op);
      return { continuation: "refreshed-after-check-failure" };
    }
    if (!op.apply_started && ["prepared", "needs-sync-pull"].includes(op.status)) {
      if (op.status === "prepared") {
        const plan = await readPlan(ctx, op);
        if (!plan || hash(plan) !== op.plan_sha256 || plan.operation !== op.id || plan.root !== ctx.root || plan.common !== ctx.common) throw new Error("Prepared plan integrity changed");
        const current = await snapshot(ctx);
        const baseHead = ctx.git(ctx.root, ["rev-parse", "--verify", op.base.ref], { allowFailure: true }).out;
        if (current.digest === plan.snapshot.digest && plan.contract === pushContract() && baseHead === op.base_sha) {
          return { prepared: { ...await preparedResult(ctx, op), continuation: "resumed-preparation", mutation_invoked: false } };
        }
      }
      op.status = "superseded";
      op.superseded_reason = "A repeated sync push requested fresh evidence for the current work";
      await saveOperation(ctx, op);
      return { continuation: "refreshed-preparation" };
    }
    const recovery = await inspectRecoverablePreflightFailure(ctx, op);
    op.status = "recovered";
    op.recovered_at = new Date().toISOString();
    op.recovery = { status: "verified-not-published", ...recovery };
    await saveOperation(ctx, op);
    ctx.warnings = [...new Set([...ctx.warnings, "Recovered the previous preflight-only failure after verifying the backup and absence of the remote branch."])];
    return { continuation: "recovered-before-push", remote: op.remote.name, base: op.base.name, recovered: true };
  } catch (error) {
    return { stop: pendingStop(ctx, op, error.message) };
  }
}

export async function prepareSyncPush(options, dependencies = {}) {
  let id = options.resume || options.cancel || options.recover || newId();
  const { ctx, release } = await openSync(options.repo, dependencies, id, Boolean(options.resume || options.cancel || options.recover), { allowMissingInitialization: Boolean(options.cancel) });
  let op;
  let recoveryCompleted = false;
  let effectiveOptions = options;
  let continuation = "";
  try {
    runtimePlatform(dependencies, ctx);
    if (ctx.recoveredInitialization && options.cancel) return { status: "cancelled", operation_id: id, reason: "Cancelled interrupted sync initialization; start a new sync", final_branch: branch(ctx), head: head(ctx), mutation_invoked: false };
    if (options.recover) {
      op = await loadOperation(ctx, options.recover);
      await checkPending(ctx, { except: op.id });
      const recovery = await inspectRecoverablePreflightFailure(ctx, op);
      const previousId = op.id;
      const savedRemote = op.remote.name;
      const savedBase = op.base.name;
      op.status = "recovered";
      op.recovered_at = new Date().toISOString();
      op.recovery = { status: "verified-not-published", ...recovery };
      await saveOperation(ctx, op);
      recoveryCompleted = true;
      continuation = "recovered-before-push";
      ctx.warnings = [...new Set([...ctx.warnings, `Recovered preflight-only sync push ${previousId}; retained backup and confirmed the remote branch is absent.`])];
      effectiveOptions = { ...options, remote: savedRemote, base: savedBase };
      id = newId();
      op = null;
    }
    if (options.resume || options.cancel) {
      op = await loadOperation(ctx, id);
      if (op.type !== "push" || op.apply_started || !(options.cancel ? ["prepared", "needs-sync-pull", "partial", "running"] : ["prepared", "needs-sync-pull"]).includes(op.status)) throw new Error("Only an unapplied push can be cancelled; resume requires prepared evidence");
      await checkPending(ctx, { except: id });
      if (options.cancel) {
        op.status = "cancelled";
        await saveOperation(ctx, op);
        return { status: "cancelled", operation_id: id, commit: op.commit, head: head(ctx), mutation_invoked: false };
      }
      assertRemote(ctx, op.remote, true);
      const plan = await readPlan(ctx, op);
      if (!plan) throw new Error("No completed evidence was saved; cancel this unapplied preparation before preparing again");
      await assertSnapshot(ctx, plan.snapshot);
      if (ctx.git(ctx.root, ["rev-parse", op.base.ref]).out !== op.base_sha) throw new Error("Prepared base changed; cancel or sync pull before preparing again");
      return await preparedResult(ctx, op);
    }
    if (!options.recover) {
      const continued = await continuePendingPush(ctx, options);
      if (continued.stop) return continued.stop;
      if (continued.prepared) return continued.prepared;
      continuation = continued.continuation ?? "";
      recoveryCompleted = Boolean(continued.recovered);
      if (continued.recovered) effectiveOptions = { ...options, remote: continued.remote, base: continued.base };
    }
    await checkPending(ctx);
    await assertIdle(ctx);
    const initial = await snapshot(ctx);
    if (initial.branch.endsWith("-done")) throw new Error("Sync push cannot commit or publish a frozen done branch; use sync pull after merge");
    const remote = remoteState(ctx, effectiveOptions.remote, true);
    const base = resolveBase(ctx, effectiveOptions.remote, effectiveOptions.base);
    op = await newOperation(ctx, "push", id, initial, remote, base, null);
    if (continuation) op.continuation = continuation;
    op.base_sha = fetchBase(ctx, remote, base);
    await assertSnapshot(ctx, initial);
    if (!ancestor(ctx, op.base_sha, initial.head)) {
      op.status = "needs-sync-pull";
      op.commit = { status: "skipped" };
      await saveOperation(ctx, op);
      return { status: "not-applied", stage: "base", reason: "Base advanced; run sync pull before sync push", operation_id: id, publication_state: "not-started", next_command: "miku-scm sync pull", next_action: "Run miku-scm sync pull, then repeat miku-scm sync push. Local work is retained.", mutation_invoked: false };
    }
    if (!initial.dirty && initial.head === op.base_sha) {
      op.commit = { status: "skipped" };
      op.status = "completed";
      op.mutation_invoked = false;
      await saveOperation(ctx, op);
      return { status: "up-to-date", warnings: ctx.warnings, commit: op.commit, operation_id: op.id, head: initial.head, mutation_invoked: false };
    }
    if (initial.dirty || initial.head !== op.base_sha) requireFetchBranch(ctx, remote, initial.branch);
    // Publication blockers that are knowable now must precede an ordinary commit.
    if (ctx.git(ctx.root, ["show-ref", "--verify", "--quiet", `refs/heads/${initial.branch}-done`], { allowFailure: true }).ok) throw new Error("The local completion branch already exists");
    const preflight = await (dependencies.publish ?? runPublish)({ repo: ctx.root, remote: remote.name, expectedHead: initial.head, apply: false }, { ...dependencies.publishDependencies, allowDirtyPreflight: true });
    if (preflight.status !== "preflight-ok") throw new Error("Publication preflight did not succeed");
    if (recoveryCompleted && preflight.remote_branch?.state !== "absent") {
      throw new Error("Remote work branch appeared during recovery; no commit was made and publication needs review");
    }
    op.commit = { status: "skipped" };
    if (initial.dirty) {
      await beforeAction(ctx, op, "work-commit");
      assertRemote(ctx, remote, true);
      await assertSnapshot(ctx, initial);
      const committed = await (dependencies.workCommit ?? runWorkCommit)({ repo: ctx.root, message: effectiveOptions.message ?? "", allowSensitivePaths: effectiveOptions.allowSensitivePaths ?? [], apply: true }, dependencies.workCommitDependencies);
      op.commit = { status: committed.status === "committed" ? "created" : committed.status, result: committed };
      op.mutation_invoked = committed.mutation_invoked;
      await saveOperation(ctx, op);
      if (committed.status !== "committed") {
        op.status = committed.mutation_invoked ? "partial" : "rejected";
        await saveOperation(ctx, op);
        const retryable = committed.status === "partial" && ["pre-commit-check", "post-check-verify"].includes(committed.stage)
          && branch(ctx) === initial.branch && head(ctx) === initial.head;
        return { ...committed, reason: committed.reason ?? committed.message, warnings: [...ctx.warnings, ...(committed.warnings ?? [])], commit: op.commit, stage: "work-commit", operation_id: id,
          ...(retryable ? { next_command: "miku-scm sync push", next_action: "Resolve the reported check problem, then repeat miku-scm sync push. Current work and the index are retained." } : {}) };
      }
    }
    const current = await snapshot(ctx);
    if (current.dirty || current.branch !== initial.branch || !ancestor(ctx, op.base_sha, current.head)) throw new Error("Commit postcondition did not preserve a clean work branch on the selected base");
    assertRemote(ctx, remote, true);
    if (ctx.git(ctx.root, ["rev-parse", base.ref]).out !== op.base_sha) throw new Error("Base changed during commit; run sync pull");
    if (current.head === op.base_sha) {
      op.status = "completed";
      await saveOperation(ctx, op);
      return { status: "up-to-date", warnings: ctx.warnings, commit: op.commit, operation_id: op.id, head: current.head, mutation_invoked: op.mutation_invoked };
    }
    const { evidence_sha256: _previousEvidenceDigest, ...evidenceFields } = await (dependencies.prepareWriting ?? prepareWritingEvidence)({ mode: "pr", repo: ctx.root, target: `${op.base_sha}..${current.head}` }, { ...dependencies.writingDependencies, now: dependencies.now });
    // Fresh preparations must not overwrite a draft retained from the same minute.
    const evidence = { ...evidenceFields, suggested_draft_path: evidenceFields.suggested_draft_path.replace(/\.md$/, `-${id}.md`) };
    evidence.evidence_sha256 = hash(evidence);
    await assertSnapshot(ctx, current);
    const plan = { schema: op.schema, operation: id, root: ctx.root, common: ctx.common, remote, base, base_sha: op.base_sha, snapshot: current, evidence, draft_path: evidence.suggested_draft_path, contract: pushContract(), publication_expectation: preflight.remote_branch };
    op.plan_sha256 = hash(plan);
    op.status = "prepared";
    await writeJson(planFile(ctx, op), plan);
    await saveOperation(ctx, op);
    return await preparedResult(ctx, op);
  } catch (error) {
    if (options.recover && !recoveryCompleted) return { ...await failure(ctx, null, error), operation_id: options.recover, commit: op?.commit };
    if ((options.resume || options.cancel) && op && !op.apply_started) return { ...await failure(ctx, null, error), operation_id: op.id, commit: op.commit };
    const stopped = await failure(ctx, op, error);
    if (/frozen done branch/.test(error.message)) return { ...stopped, publication_state: "not-started", next_command: "miku-scm sync pull", next_action: "After merging the PR, run miku-scm sync pull to start the next work branch." };
    return stopped;
  }
  finally { await release(); }
}

async function draftBytes(ctx, relative) {
  const file = await realpath(path.resolve(ctx.root, relative));
  const allowed = await realpath(path.join(ctx.root, "workplace"));
  if (!file.startsWith(`${allowed}${path.sep}`) || !(await realpath(path.dirname(file))).startsWith(`${allowed}${path.sep}`)) throw new Error("PR draft escapes repository workplace");
  const bytes = await readFile(file);
  if (!bytes.length || bytes.length > 1024 * 1024) throw new Error("PR draft is empty or too large");
  return bytes;
}

export async function prepareSyncPushDraft(options, dependencies = {}) {
  const { ctx, release } = await openSync(options.repo, dependencies, options.operation);
  try {
    const op = await loadOperation(ctx, options.operation);
    if (op.type !== "push" || op.status !== "prepared" || op.apply_started
      || op.root !== ctx.root || op.common !== ctx.common) throw new Error("This sync push is not an unused prepared operation for this repository");
    const plan = await readPlan(ctx, op);
    if (!plan || hash(plan) !== options.expectedPlanSha256 || op.plan_sha256 !== options.expectedPlanSha256
      || plan.operation !== op.id || plan.root !== ctx.root || plan.common !== ctx.common || plan.contract !== pushContract()) {
      throw new Error("Push plan digest, identity or workflow contract changed");
    }
    const bytes = await draftBytes(ctx, plan.draft_path);
    const draftSha256 = hash(bytes);
    return {
      status: "draft-ready",
      warnings: ctx.warnings,
      operation_id: op.id,
      plan_sha256: op.plan_sha256,
      draft_path: plan.draft_path,
      draft_sha256: draftSha256,
      workflow_id: "repository.sync.push.apply",
      apply_arguments: ["--repo", ctx.root, "--operation", op.id,
        "--expected-plan-sha256", op.plan_sha256, "--pr-draft", plan.draft_path,
        "--expected-draft-sha256", draftSha256, "--apply"],
      mutation_invoked: false,
    };
  } finally { await release(); }
}

export async function applySyncPush(options, dependencies = {}) {
  const { ctx, release } = await openSync(options.repo, dependencies, options.operation);
  let op;
  let plan;
  let attemptOwned = false;
  const retainPreparation = async (reason) => {
    if (op.recommitted_head || op.backup_branch || (await snapshot(ctx)).digest !== plan.snapshot.digest) return false;
    op.last_apply_attempt = { ...op.attempt, error: reason, push_started: false };
    op.apply_started = false;
    op.status = "prepared";
    await saveOperation(ctx, op);
    return true;
  };
  try {
    const platform = runtimePlatform(dependencies, ctx);
    op = await loadOperation(ctx, options.operation);
    if (op.type !== "push" || op.status !== "prepared" || op.apply_started) throw new Error("This push plan is not available for apply; it may be consumed, cancelled or superseded");
    await checkPending(ctx, { except: op.id });
    plan = await readPlan(ctx, op);
    if (!plan || hash(plan) !== options.expectedPlanSha256 || op.plan_sha256 !== options.expectedPlanSha256 || plan.operation !== op.id || plan.root !== ctx.root || plan.common !== ctx.common || plan.contract !== pushContract()) throw new Error("Push plan digest, identity or workflow contract changed");
    if (options.prDraft !== plan.draft_path) throw new Error("PR draft is not bound to this prepared evidence");
    const checkDraft = async () => { if (hash(await draftBytes(ctx, options.prDraft)) !== options.expectedDraftSha256) throw new Error("PR draft SHA-256 changed"); };
    await assertIdle(ctx);
    assertRemote(ctx, plan.remote, true);
    await assertSnapshot(ctx, plan.snapshot);
    await checkDraft();
    const base = fetchBase(ctx, plan.remote, plan.base);
    if (base !== plan.base_sha) {
      op.status = "needs-sync-pull";
      await saveOperation(ctx, op);
      return { status: "not-applied", stage: "base", reason: "Base advanced after preparation; run sync pull and prepare fresh PR evidence", operation_id: op.id, commit: op.commit, publication_state: "not-started", next_command: "miku-scm sync pull", next_action: "Run miku-scm sync pull, then repeat miku-scm sync push. The local commit is retained.", mutation_invoked: false };
    }
    let expectedHead = plan.snapshot.head;
    const validateSyncRecommit = (event) => {
      const hook = dependencies.beforeCheckpoint?.(event.phase, ctx, op);
      if (hook?.then) throw new Error("Recommit checkpoint must be synchronous");
      assertRemote(ctx, plan.remote, true);
      const file = realpathSync(path.resolve(ctx.root, options.prDraft));
      const allowed = realpathSync(path.join(ctx.root, "workplace"));
      if (!file.startsWith(`${allowed}${path.sep}`) || hash(readFileSync(file)) !== options.expectedDraftSha256) throw new Error("PR draft identity or SHA-256 changed before reset");
      if (ctx.git(ctx.root, ["rev-parse", plan.base.ref]).out !== plan.base_sha || branch(ctx) !== plan.snapshot.branch || head(ctx) !== expectedHead || ctx.git(ctx.root, ["status", "--porcelain"]).out) throw new Error("Prepared state changed before backup/reset");
    };
    const validateSyncSnapshot = async (event) => {
      await dependencies.beforeCheckpoint?.(event.phase, ctx, op);
      assertRemote(ctx, plan.remote, true);
      await checkDraft();
      if (ctx.git(ctx.root, ["rev-parse", plan.base.ref]).out !== plan.base_sha) throw new Error("Prepared base changed inside publication; run sync pull");
      if (event.phase === "post-recommit") {
        expectedHead = event.head;
        op.recommitted_head = event.head;
        op.backup_branch = event.backup;
        await saveOperation(ctx, op);
      }
      if (branch(ctx) !== plan.snapshot.branch || head(ctx) !== expectedHead || (await snapshot(ctx)).dirty) throw new Error("Prepared branch, HEAD or clean state changed inside publication");
    };
    await validateSyncSnapshot({ phase: "pre-apply" });
    op.apply_started = true;
    attemptOwned = true;
    op.status = "applying";
    await beforeAction(ctx, op, "recommit-push");
    const delegate = await (dependencies.recommitPush ?? runRecommitPush)({ repo: ctx.root, remote: plan.remote.name, base: plan.base.ref, prDraft: options.prDraft, apply: true }, { ...dependencies.recommitPushDependencies, platform, validateSyncSnapshot, validateSyncRecommit, expectedPublication: plan.publication_expectation });
    op.delegate = delegate;
    if (delegate.mutation_invoked === false && delegate.status !== "published" && await retainPreparation(delegate.reason ?? "Publication stopped before recommit")) {
      return { ...delegate, status: "not-applied", operation_id: op.id, commit: op.commit, publication_state: "not-started", next_command: "miku-scm sync push", next_action: "Resolve the reported preflight problem, then repeat miku-scm sync push. The preparation is retained.", mutation_invoked: false };
    }
    op.mutation_invoked = Boolean(op.mutation_invoked || delegate.mutation_invoked);
    op.status = delegate.status === "published" ? "completed" : delegate.mutation_invoked ? "partial" : "rejected";
    await saveOperation(ctx, op);
    const retryable = delegate.publication?.stage === "publication-preflight" && delegate.publication?.push_started === false;
    return { ...delegate, warnings: [...new Set([...(op.warnings ?? []), ...ctx.warnings, ...(delegate.warnings ?? [])])], operation_id: op.id, commit: op.commit, stage: "recommit-push", mutation_invoked: op.mutation_invoked,
      ...(retryable ? { publication_state: "not-started", next_command: "miku-scm sync push", next_action: "Resolve the reported storage/preflight problem, then repeat miku-scm sync push. The helper will verify and recover the unpublished work." } : {}) };
  } catch (error) {
    if (!attemptOwned) return { ...await failure(ctx, null, error), operation_id: op?.id, commit: op?.commit };
    if (error.mutationInvoked === false && await retainPreparation(error.message)) {
      return { status: "not-applied", reason: error.message, operation_id: op.id, commit: op.commit, stage: "publication-preflight", publication_state: "not-started", next_command: "miku-scm sync push", next_action: "Resolve the reported preflight problem, then repeat miku-scm sync push. The preparation is retained.", mutation_invoked: false };
    }
    if (op?.apply_started && error.mutationInvoked !== false) op.mutation_invoked = true;
    const r = await failure(ctx, op, error);
    if (error.mutationInvoked === null) { op.status = "unresolved"; await saveOperation(ctx, op); return { ...r, status: "unresolved", mutation_invoked: null, next_action: "Inspect the saved publication attempt; do not resend automatically" }; }
    return { ...r, commit: op?.commit };
  } finally { await release(); }
}
