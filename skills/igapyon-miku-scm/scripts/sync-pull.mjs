import { readdir } from "node:fs/promises";
import path from "node:path";
import { inspectNextWorkBranch, nextWorkAdvice, prepareNextWorkBranch, switchNextWorkBranch, workBranchName } from "./post-merge-next-work.mjs";
import { verifyMergedPull } from "./miku-scm-sync-merge-check.mjs";
import { SHA, afterAction, ancestor, assertIdle, assertRemote, assertSnapshot, beforeAction, branch, checkPending, failure, fetchBase, head, loadOperation, newId, newOperation, openSync, readBaseRecord, readJson, remoteState, requireFetchBranch, resolveBase, saveBaseRecord, saveOperation, snapshot } from "./miku-scm-sync-state.mjs";
import { createBackup, guardIgnored, integrateGit, locateStash, rebaseIdentity, requireGitCapabilities, restoreWork, stashWork, verifyLocation } from "./miku-scm-sync-worktree.mjs";

export function parseArgs(argv, cwd = process.cwd()) {
  const o = { repo: cwd, remote: "origin", base: "", apply: false, resume: "", abort: "", empty: "", resolvedCarryover: false, resolvedNextWork: false, help: false };
  const fields = { "--repo": "repo", "--remote": "remote", "--base": "base", "--resume": "resume", "--abort": "abort", "--empty": "empty" };
  const seen = new Set();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (seen.has(a)) throw new Error(`Duplicate argument: ${a}`);
    seen.add(a);
    if (a === "--help" || a === "-h") o.help = true;
    else if (a === "--apply") o.apply = true;
    else if (a === "--resolved-carryover") o.resolvedCarryover = true;
    else if (a === "--resolved-next-work") o.resolvedNextWork = true;
    else if (fields[a]) { if (!argv[i + 1] || argv[i + 1].startsWith("--")) throw new Error(`Missing value: ${a}`); o[fields[a]] = argv[++i]; }
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (o.help) return o;
  if (!o.apply || !o.repo) throw new Error("sync pull requires --repo and --apply");
  if (o.resume && o.abort) throw new Error("--resume and --abort are exclusive");
  if (o.empty && (!o.resume || !["keep", "drop"].includes(o.empty))) throw new Error("--empty keep|drop requires --resume");
  if (o.resolvedCarryover && !o.resume) throw new Error("--resolved-carryover requires --resume and a reviewed carryover resolution");
  if (o.resolvedNextWork && !o.resume) throw new Error("--resolved-next-work requires --resume and a reviewed branch/checkout resolution");
  if ((o.resume || o.abort) && (seen.has("--remote") || seen.has("--base"))) throw new Error("Recovery uses the saved remote and base");
  return o;
}

async function refusePublished(ctx, op) {
  if (ctx.git(ctx.root, ["show-ref", "--verify", "--quiet", `refs/remotes/${op.remote.name}/${op.original.branch}`], { allowFailure: true }).ok) throw new Error("Published work branches cannot be automatically rebased");
  const refs = ctx.git(ctx.root, ["for-each-ref", "--format=%(objectname)", "refs/remotes/"]).out.split("\n").filter(Boolean);
  if (op.commits.some((commit) => refs.some((ref) => ancestor(ctx, commit, ref)))) throw new Error("A replay commit is already shared on a fetched remote ref");
  const directory = path.join(ctx.root, "workplace/miku-scm/ok-push");
  let names = [];
  try { names = await readdir(directory); } catch (error) { if (error.code !== "ENOENT") throw error; }
  for (const name of names.filter((n) => n.endsWith(".json") && !n.endsWith(".attempt.json"))) {
    const plan = await readJson(path.join(directory, name));
    if (plan?.branch !== op.original.branch || !SHA.test(plan.reviewed_head ?? "")) continue;
    const attempt = await readJson(path.join(directory, `${name}.attempt.json`));
    if (attempt && op.commits.some((commit) => ancestor(ctx, commit, plan.reviewed_head))) throw new Error("A publication receipt or unresolved attempt covers the replay history");
  }
}

async function refuseDuplicateNext(ctx, op) {
  let names = [];
  try { names = await readdir(path.join(ctx.storage, "operations")); } catch (error) { if (error.code !== "ENOENT") throw error; }
  for (const id of names) {
    if (id === op.id || !/^[0-9a-f-]{36}$/.test(id)) continue;
    const previous = await loadOperation(ctx, id);
    if (previous.type === "pull" && previous.mutation_invoked && previous.original.branch === op.original.branch && previous.original.head === op.original.head && previous.next_branch) throw new Error(`This done branch already has a next-work transition: ${previous.next_branch}`);
  }
}

function result(ctx, op, status = "completed") {
  return { status, method: op.method, operation_id: op.id, previous_branch: op.original.branch, final_branch: branch(ctx), head: head(ctx), base: op.base.name, base_commit: op.base_sha, backup_branch: op.backup_branch ?? null, stash_sha: op.stash_sha ?? null, stash_retained: Boolean(op.stash_sha), merge_verification: op.merge_evidence ?? null, ...op.advice, mutation_invoked: op.mutation_invoked };
}

async function complete(ctx, op, aborted = false) {
  verifyLocation(ctx, op, aborted ? op.original.head : op.integrated_head);
  if (ctx.git(ctx.root, ["ls-files", "--unmerged", "-z"]).stdout) throw new Error("Resolve and stage every carryover conflict before resuming");
  if (await rebaseIdentity(ctx, op)) throw new Error("Rebase is still in progress");
  if (!aborted && !ancestor(ctx, op.base_sha, head(ctx))) throw new Error("Synchronized HEAD does not contain the pinned base");
  if (!aborted && (op.method !== "up-to-date" || op.record_base || op.original.head === op.base_sha)) await saveBaseRecord(ctx, branch(ctx), op.remote, op.base, op.base_sha);
  op.status = aborted ? "aborted" : "completed";
  await saveOperation(ctx, op);
  return result(ctx, op, aborted ? "aborted" : op.method === "up-to-date" ? "up-to-date" : "completed");
}

async function integrateNextWork(ctx, op, options = {}) {
  const onOriginal = () => branch(ctx) === op.original.branch && head(ctx) === op.original.head;
  const onNext = () => branch(ctx) === op.next_branch && head(ctx) === op.base_sha;
  const requireCleanOriginal = () => {
    if (!onOriginal() || ctx.git(ctx.root, ["status", "--porcelain"]).out) throw new Error("Next-work checkout requires the original clean branch and HEAD");
  };
  if (!op.next_work || op.next_work.phase === "creating") {
    const exists = ctx.git(ctx.root, ["show-ref", "--verify", "--quiet", `refs/heads/${op.next_branch}`], { allowFailure: true }).ok;
    let prepared;
    if (exists) {
      if (!options.resolvedNextWork) throw new Error("Next-work preparation has no complete receipt; inspect its branch configuration and checkout hook, then resume with --resolved-next-work");
      if (!onNext()) requireCleanOriginal();
      prepared = inspectNextWorkBranch(ctx.root, op.next_branch, op.base_sha, ctx.git);
    } else {
      requireCleanOriginal();
      op.next_work = { phase: "creating" };
      await beforeAction(ctx, op, "next-work-create");
      prepared = prepareNextWorkBranch(ctx.root, op.next_branch, op.base_sha, op.base.ref, ctx.git);
    }
    op.next_work = { phase: onNext() ? "switched" : "prepared", ...prepared };
    await saveOperation(ctx, op);
  }
  if (["switching", "checkout-failed"].includes(op.next_work.phase)) {
    if (!options.resolvedNextWork) throw new Error("Next-work checkout or its hook is unconfirmed; inspect and resolve it, then resume with --resolved-next-work");
    if (!onNext()) requireCleanOriginal();
    op.next_work.phase = onNext() ? "switched" : "prepared";
    await saveOperation(ctx, op);
  }
  if (op.next_work.phase === "prepared") {
    requireCleanOriginal();
    const prepared = inspectNextWorkBranch(ctx.root, op.next_branch, op.base_sha, ctx.git);
    if (prepared.upstream !== op.next_work.upstream && !options.resolvedNextWork) throw new Error("Prepared next-work tracking configuration changed; inspect it before --resolved-next-work");
    assertRemote(ctx, op.remote);
    await guardIgnored(ctx, [op.base_sha]);
    await beforeAction(ctx, op, "next-work-switch");
    op.next_work.phase = "switching";
    await saveOperation(ctx, op);
    try { switchNextWorkBranch(ctx.root, op.next_branch, op.base_sha, ctx.git); }
    catch (error) { op.next_work.phase = "checkout-failed"; await saveOperation(ctx, op); throw error; }
    op.next_work.phase = "switched";
    await afterAction(ctx, op);
  }
  if (op.next_work.phase !== "switched" || !onNext()) throw new Error("Next-work checkout does not match its saved branch and pinned HEAD");
  op.integrated_head = op.base_sha;
  await saveOperation(ctx, op);
}

async function recover(ctx, op, options) {
  if (op.type !== "pull" || !["partial", "running"].includes(op.status)) throw new Error("This pull operation cannot be resumed or aborted");
  assertRemote(ctx, op.remote);
  if (op.stash_message && !op.stash_sha) {
    await locateStash(ctx, op);
    if (!op.stash_sha) throw new Error("The interrupted stash cannot be identified; preserve current work and inspect the operation explicitly");
  }
  const rebasing = await rebaseIdentity(ctx, op);
  if (options.resolvedNextWork && op.method !== "next-work") throw new Error("--resolved-next-work only applies to a saved next-work transition");
  if (options.abort) {
    if (op.restore_started) throw new Error("Restoration has started; preserve the resolution and recover from the retained backup/stash explicitly");
    if (rebasing) {
      await beforeAction(ctx, op, "rebase-abort");
      integrateGit(ctx, ["rebase", "--abort"]);
      await afterAction(ctx, op);
    }
    if (op.next_branch || branch(ctx) !== op.original.branch || head(ctx) !== op.original.head) throw new Error("Integration already changed HEAD; automatic abort would discard work. Use the retained backup explicitly");
    if (op.stash_sha) await restoreWork(ctx, op);
    return complete(ctx, op, true);
  }
  if (op.method === "next-work") {
    if (rebasing) throw new Error("An unexpected rebase blocks next-work recovery");
    await integrateNextWork(ctx, op, options);
  } else if (rebasing) {
    if (ctx.git(ctx.root, ["ls-files", "--unmerged", "-z"]).stdout) throw new Error("Resolve and stage rebase conflicts before resuming");
    const dirtyIndex = ctx.git(ctx.root, ["diff", "--cached", "--quiet"], { allowFailure: true });
    if (dirtyIndex.code !== 0 && dirtyIndex.code !== 1) throw new Error("Cannot inspect rebase resolution");
    const stopped = ctx.git(ctx.root, ["rev-parse", "--verify", "REBASE_HEAD"], { allowFailure: true }).out;
    if (!op.commits.includes(stopped)) throw new Error("Rebase stopped at an unexpected commit");
    if (dirtyIndex.ok && !options.empty) throw new Error("This replay commit is empty; explicitly choose --empty keep or --empty drop");
    if (!dirtyIndex.ok && options.empty) throw new Error("--empty only applies to an empty stopped commit");
    await beforeAction(ctx, op, "rebase-continue");
    if (options.empty === "keep") ctx.git(ctx.root, ["commit", "--allow-empty", "-C", stopped]);
    const r = integrateGit(ctx, ["rebase", options.empty === "drop" ? "--skip" : "--continue"], { allowFailure: true });
    await afterAction(ctx, op);
    if (!r.ok) throw new Error("Rebase stopped again; resolve the reported commit before resuming");
    op.integrated_head = head(ctx);
    await saveOperation(ctx, op);
  } else if (!op.integrated_head) {
    // Crash after Git completed, before its receipt: recognize only a pinned
    // FF. A finished rebase needs explicit inspection, never replay.
    if (op.method === "fast-forward" && head(ctx) === op.base_sha) {
      verifyLocation(ctx, op, op.base_sha);
      op.integrated_head = op.base_sha;
      await saveOperation(ctx, op);
    } else throw new Error("The interrupted integration cannot be proven complete; inspect the backup and exact stash");
  }
  verifyLocation(ctx, op, op.integrated_head);
  if (op.restore_started && !op.restore_ok && !options.resolvedCarryover) throw new Error("Inspect every path in the retained stash and explicitly confirm its resolution with --resolved-carryover");
  if (!op.restore_started) await restoreWork(ctx, op);
  return complete(ctx, op);
}

export async function runSyncPull(options, dependencies = {}) {
  const id = options.resume || options.abort || newId();
  const { ctx, release } = await openSync(options.repo, dependencies, id, Boolean(options.resume || options.abort));
  let op;
  try {
    if (options.resume || options.abort) {
      const loaded = await loadOperation(ctx, id);
      if (loaded.type !== "pull") throw new Error("Recovery operation is not a sync pull");
      op = loaded;
      await checkPending(ctx, { except: id });
      return await recover(ctx, op, options);
    }
    await checkPending(ctx, { pull: true });
    await assertIdle(ctx);
    requireGitCapabilities(ctx);
    const initial = await snapshot(ctx);
    const remote = remoteState(ctx, options.remote);
    const base = resolveBase(ctx, options.remote, options.base);
    op = await newOperation(ctx, "pull", id, initial, remote, base, null);
    op.base_sha = fetchBase(ctx, remote, base);
    await assertSnapshot(ctx, initial);
    if (initial.branch.endsWith("-done")) {
      await refuseDuplicateNext(ctx, op);
      op.merge_evidence = await verifyMergedPull(ctx, op);
      assertRemote(ctx, remote);
      op.advice = await nextWorkAdvice(ctx.root, op.base_sha, remote.name, (cwd, args, allowFailure = false) => ctx.git(cwd, args, { allowFailure }));
      if (op.advice.tag_lookup_warning) op.advice.tag_lookup_warning = "Remote tag lookup failed; tag state is unconfirmed";
      assertRemote(ctx, remote);
      await assertSnapshot(ctx, initial);
      op.method = "next-work";
      op.next_branch = workBranchName(base.name, dependencies.now ? dependencies.now() : new Date());
      if (ctx.git(ctx.root, ["show-ref", "--verify", "--quiet", `refs/heads/${op.next_branch}`], { allowFailure: true }).ok) throw new Error("Next work branch already exists");
    } else {
      const record = await readBaseRecord(ctx, initial.branch, remote, base);
      op.record_base = record?.base_sha ?? null;
      if (record && (!ancestor(ctx, record.base_sha, initial.head) || !ancestor(ctx, record.base_sha, op.base_sha))) throw new Error("Recorded branch base is missing from HEAD or the fetched base; history was rewritten");
      op.method = ancestor(ctx, op.base_sha, initial.head) ? "up-to-date" : ancestor(ctx, initial.head, op.base_sha) ? "fast-forward" : "rebase";
      if (op.method === "rebase") {
        if (!requireFetchBranch(ctx, remote, base.name).complete_heads) throw new Error("Configured fetch excludes remote heads; automatic rebase requires complete publication evidence. Preserve the fetch configuration and use separate integration");
        if (!record) throw new Error("Branch creation base is unknown; automatic replay is unsafe");
        if (ctx.git(ctx.root, ["rev-list", "--merges", `${record.base_sha}..${initial.head}`]).out) throw new Error("Local merge commits require separate integration");
        op.commits = ctx.git(ctx.root, ["rev-list", "--reverse", `${record.base_sha}..${initial.head}`]).out.split("\n").filter(Boolean);
        await refusePublished(ctx, op);
      }
    }
    await saveOperation(ctx, op);
    if (op.method === "up-to-date") { op.integrated_head = initial.head; return await complete(ctx, op); }
    await guardIgnored(ctx, [op.base_sha, ...(op.commits ?? [])]);
    await beforeAction(ctx, op, "pre-mutation");
    assertRemote(ctx, remote);
    await assertSnapshot(ctx, initial);
    await createBackup(ctx, op);
    await assertSnapshot(ctx, initial);
    await stashWork(ctx, op);
    await beforeAction(ctx, op, "integrate");
    assertRemote(ctx, remote);
    verifyLocation(ctx, { ...op, next_branch: null }, initial.head);
    if ((await snapshot(ctx)).dirty) throw new Error("Worktree changed before integration");
    await guardIgnored(ctx, [op.base_sha, ...(op.commits ?? [])]);
    let integrated;
    if (op.method === "next-work") {
      await integrateNextWork(ctx, op);
      integrated = true;
    } else if (op.method === "fast-forward") integrated = ctx.git(ctx.root, ["merge", "--ff-only", "--no-overwrite-ignore", op.base_sha], { allowFailure: true }).ok;
    else integrated = integrateGit(ctx, ["rebase", "--merge", "--reapply-cherry-picks", "--empty=stop", "--keep-empty", "--no-autostash", "--no-autosquash", "--no-update-refs", "--no-fork-point", "--onto", op.base_sha, op.record_base], { allowFailure: true }).ok;
    await afterAction(ctx, op);
    if (!integrated) throw new Error("Integration stopped; resolve the same rebase or explicitly abort this operation");
    op.integrated_head = head(ctx);
    await saveOperation(ctx, op);
    await restoreWork(ctx, op);
    return await complete(ctx, op);
  } catch (error) { return await failure(ctx, op, error); }
  finally { await release(); }
}
