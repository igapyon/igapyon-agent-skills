import { readFile, realpath } from "node:fs/promises";
import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { prepareWritingEvidence } from "./miku-scm-writing-prepare.mjs";
import { runWorkCommit } from "./work-commit.mjs";
import { runPublish } from "./post-recommit-publish.mjs";
import { runRecommitPush } from "./pr-recommit-push.mjs";
import { workflowContractById } from "./miku-scm-workflow-contract-lock.mjs";
import { platformWarnings } from "./miku-scm-command-runner.mjs";
import { ancestor, assertIdle, assertRemote, assertSnapshot, beforeAction, branch, checkPending, checkedId, failure, fetchBase, hash, head, loadOperation, newId, newOperation, openSync, operationPath, readJson, remoteState, requireFetchBranch, resolveBase, saveOperation, snapshot, writeJson } from "./miku-scm-sync-state.mjs";

export function parseArgs(mode, argv, cwd = process.cwd()) {
  const o = { repo: cwd, remote: "origin", base: "", message: "", allowSensitivePaths: [], operation: "", resume: "", cancel: "", expectedPlanSha256: "", prDraft: "", expectedDraftSha256: "", apply: false, help: false };
  const common = { "--repo": "repo" };
  const fields = mode === "prepare" ? { ...common, "--remote": "remote", "--base": "base", "--message": "message", "--resume": "resume", "--cancel": "cancel" }
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
  if (!o.apply || !o.repo) throw new Error("sync push requires --apply");
  if (o.resume && o.cancel) throw new Error("--resume and --cancel are exclusive");
  if ((o.resume || o.cancel) && o.allowSensitivePaths.length) throw new Error("Recovery uses the saved push options");
  if ((o.resume || o.cancel) && ["--remote", "--base", "--message"].some((v) => seen.has(v))) throw new Error("Recovery uses the saved push options");
  if (mode === "apply") {
    checkedId(o.operation);
    if (!o.prDraft || !/^[0-9a-f]{64}$/.test(o.expectedPlanSha256) || !/^[0-9a-f]{64}$/.test(o.expectedDraftSha256)) throw new Error("Push apply requires the exact plan and draft SHA-256");
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

async function preparedResult(ctx, op) {
  const plan = await readPlan(ctx, op);
  if (!plan || hash(plan) !== op.plan_sha256) throw new Error("Prepared push plan changed");
  return { status: "prepared", warnings: [...new Set([...(op.warnings ?? []), ...ctx.warnings])], operation_id: op.id, plan_sha256: op.plan_sha256, commit: op.commit, head: plan.snapshot.head, base: plan.base.name, base_commit: plan.base_sha, evidence: plan.evidence, suggested_draft_path: plan.draft_path, mutation_invoked: op.mutation_invoked };
}

export async function prepareSyncPush(options, dependencies = {}) {
  const id = options.resume || options.cancel || newId();
  const { ctx, release } = await openSync(options.repo, dependencies, id, Boolean(options.resume || options.cancel));
  let op;
  try {
    runtimePlatform(dependencies, ctx);
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
    await checkPending(ctx);
    await assertIdle(ctx);
    const initial = await snapshot(ctx);
    if (initial.branch.endsWith("-done")) throw new Error("Sync push cannot commit or publish a frozen done branch; use sync pull after merge");
    const remote = remoteState(ctx, options.remote, true);
    const base = resolveBase(ctx, options.remote, options.base);
    op = await newOperation(ctx, "push", id, initial, remote, base, null);
    op.base_sha = fetchBase(ctx, remote, base);
    await assertSnapshot(ctx, initial);
    if (!ancestor(ctx, op.base_sha, initial.head)) {
      op.status = "needs-sync-pull";
      op.commit = { status: "skipped" };
      await saveOperation(ctx, op);
      return { status: "not-applied", stage: "base", reason: "Base advanced; run sync pull before sync push", operation_id: id, mutation_invoked: false };
    }
    if (initial.dirty || initial.head !== op.base_sha) requireFetchBranch(ctx, remote, initial.branch);
    // Publication blockers that are knowable now must precede an ordinary commit.
    if (ctx.git(ctx.root, ["show-ref", "--verify", "--quiet", `refs/heads/${initial.branch}-done`], { allowFailure: true }).ok) throw new Error("The local completion branch already exists");
    const preflight = await (dependencies.publish ?? runPublish)({ repo: ctx.root, remote: remote.name, expectedHead: initial.head, apply: false }, { ...dependencies.publishDependencies, allowDirtyPreflight: true });
    if (preflight.status !== "preflight-ok") throw new Error("Publication preflight did not succeed");
    op.commit = { status: "skipped" };
    if (initial.dirty) {
      await beforeAction(ctx, op, "work-commit");
      assertRemote(ctx, remote, true);
      await assertSnapshot(ctx, initial);
      const committed = await (dependencies.workCommit ?? runWorkCommit)({ repo: ctx.root, message: options.message ?? "", allowSensitivePaths: options.allowSensitivePaths ?? [], apply: true }, dependencies.workCommitDependencies);
      op.commit = { status: committed.status === "committed" ? "created" : committed.status, result: committed };
      op.mutation_invoked = committed.mutation_invoked;
      await saveOperation(ctx, op);
      if (committed.status !== "committed") {
        op.status = committed.mutation_invoked ? "partial" : "rejected";
        await saveOperation(ctx, op);
        return { ...committed, warnings: [...ctx.warnings, ...(committed.warnings ?? [])], commit: op.commit, stage: "work-commit", operation_id: id };
      }
    }
    const current = await snapshot(ctx);
    if (current.dirty || current.branch !== initial.branch || !ancestor(ctx, op.base_sha, current.head)) throw new Error("Commit postcondition did not preserve a clean work branch on the selected base");
    assertRemote(ctx, remote, true);
    if (ctx.git(ctx.root, ["rev-parse", base.ref]).out !== op.base_sha) throw new Error("Base changed during commit; run sync pull");
    if (current.head === op.base_sha) {
      op.status = "completed";
      await saveOperation(ctx, op);
      return { status: "up-to-date", warnings: ctx.warnings, commit: op.commit, head: current.head, mutation_invoked: op.mutation_invoked };
    }
    const evidence = await (dependencies.prepareWriting ?? prepareWritingEvidence)({ mode: "pr", repo: ctx.root, target: `${op.base_sha}..${current.head}` }, { ...dependencies.writingDependencies, now: dependencies.now });
    await assertSnapshot(ctx, current);
    const plan = { schema: op.schema, operation: id, root: ctx.root, common: ctx.common, remote, base, base_sha: op.base_sha, snapshot: current, evidence, draft_path: evidence.suggested_draft_path, contract: pushContract(), publication_expectation: preflight.remote_branch };
    op.plan_sha256 = hash(plan);
    op.status = "prepared";
    await writeJson(planFile(ctx, op), plan);
    await saveOperation(ctx, op);
    return await preparedResult(ctx, op);
  } catch (error) {
    if ((options.resume || options.cancel) && op && !op.apply_started) return { ...await failure(ctx, null, error), operation_id: op.id, commit: op.commit };
    return await failure(ctx, op, error);
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

export async function applySyncPush(options, dependencies = {}) {
  const { ctx, release } = await openSync(options.repo, dependencies, options.operation);
  let op;
  let attemptOwned = false;
  try {
    const platform = runtimePlatform(dependencies, ctx);
    op = await loadOperation(ctx, options.operation);
    if (op.type !== "push" || op.status !== "prepared" || op.apply_started) throw new Error("This push plan is not available for apply; it may be consumed, cancelled or superseded");
    await checkPending(ctx, { except: op.id });
    const plan = await readPlan(ctx, op);
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
      return { status: "not-applied", stage: "base", reason: "Base advanced after preparation; run sync pull and prepare fresh PR evidence", operation_id: op.id, commit: op.commit, mutation_invoked: false };
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
    op.mutation_invoked = Boolean(op.mutation_invoked || delegate.mutation_invoked);
    op.status = delegate.status === "published" ? "completed" : delegate.mutation_invoked ? "partial" : "rejected";
    await saveOperation(ctx, op);
    return { ...delegate, warnings: [...new Set([...(op.warnings ?? []), ...ctx.warnings, ...(delegate.warnings ?? [])])], operation_id: op.id, commit: op.commit, stage: "recommit-push", mutation_invoked: op.mutation_invoked };
  } catch (error) {
    if (!attemptOwned) return { ...await failure(ctx, null, error), operation_id: op?.id, commit: op?.commit };
    if (op?.apply_started && error.mutationInvoked !== false) op.mutation_invoked = true;
    const r = await failure(ctx, op, error);
    if (error.mutationInvoked === null) { op.status = "unresolved"; await saveOperation(ctx, op); return { ...r, status: "unresolved", mutation_invoked: null, next_action: "Inspect the saved publication attempt; do not resend automatically" }; }
    return { ...r, commit: op?.commit };
  } finally { await release(); }
}
