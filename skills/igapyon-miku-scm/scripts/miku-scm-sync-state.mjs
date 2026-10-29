import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, open, readFile, readdir, readlink, realpath, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { repositoryFromRemote } from "./miku-scm-repository.mjs";
import { ensureOperationalExclusion, ORDINARY_PATHSPEC } from "./miku-scm-operational-storage.mjs";

export const SYNC_SCHEMA = "miku-scm.sync/v1";
export const SHA = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const ID = /^[0-9a-f]{8}-[0-9a-f-]{27}$/;
const TERMINAL = new Set(["completed", "aborted", "cancelled", "superseded", "rejected"]);
export const hash = (value) => createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest("hex");
export const zeros = (value) => value.split("\0").filter(Boolean);

export function syncGit(cwd, args, options = {}) {
  const r = spawnSync("git", args, {
    cwd, input: options.input, maxBuffer: 64 * 1024 * 1024, shell: false,
    windowsHide: true, timeout: options.timeout ?? 120_000,
    env: { ...process.env, LC_ALL: "C", GIT_TERMINAL_PROMPT: "0", GIT_MERGE_AUTOEDIT: "no", GIT_EDITOR: "true" },
  });
  const stdout = Buffer.isBuffer(r.stdout) ? r.stdout : Buffer.from(r.stdout ?? "");
  const stderr = Buffer.isBuffer(r.stderr) ? r.stderr.toString("utf8") : String(r.stderr ?? "");
  const result = { ok: r.status === 0, code: r.status, bytes: stdout, stdout: stdout.toString("utf8"), out: stdout.toString("utf8").trimEnd(), err: stderr };
  if (!result.ok && !options.allowFailure) {
    const error = new Error(`git ${args[0]} failed (exit ${r.status ?? "unknown"}${r.error?.code ? `, ${r.error.code}` : ""})`);
    error.gitExit = r.status;
    throw error;
  }
  return result;
}

export async function readJson(file) {
  try { return JSON.parse(await readFile(file, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

export async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${randomUUID()}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, file);
}

export function checkedId(id) {
  if (!ID.test(id ?? "")) throw new Error("A complete sync operation ID is required");
  return id;
}

export async function context(repo, dependencies = {}) {
  const git = dependencies.git ?? syncGit;
  const root = await realpath(git(repo, ["rev-parse", "--show-toplevel"]).out);
  const common = await realpath(git(root, ["rev-parse", "--path-format=absolute", "--git-common-dir"]).out);
  const gitDir = await realpath(git(root, ["rev-parse", "--path-format=absolute", "--git-dir"]).out);
  const warnings = await ensureOperationalExclusion(root, git);
  const storage = path.join(root, "workplace/miku-scm/sync");
  await mkdir(storage, { recursive: true });
  const actual = await realpath(storage);
  if (path.relative(root, actual).startsWith("..") || path.isAbsolute(path.relative(root, actual))) throw new Error("Sync storage escapes the repository");
  return { root, common, gitDir, storage: actual, git, dependencies, warnings };
}

export function branch(ctx) { return ctx.git(ctx.root, ["branch", "--show-current"]).out; }
export function head(ctx) { return ctx.git(ctx.root, ["rev-parse", "HEAD"]).out; }
export function ancestor(ctx, a, b) {
  const r = ctx.git(ctx.root, ["merge-base", "--is-ancestor", a, b], { allowFailure: true });
  if (r.code !== 0 && r.code !== 1) throw new Error("Cannot establish Git ancestry");
  return r.ok;
}

export async function snapshot(ctx) {
  const g = (args) => ctx.git(ctx.root, args);
  const untracked = zeros(g(["ls-files", "--others", "--exclude-standard", "-z", ...ORDINARY_PATHSPEC]).stdout).sort();
  const contents = [];
  for (const name of untracked) {
    const file = path.join(ctx.root, name);
    const st = await lstat(file);
    if (!st.isFile() && !st.isSymbolicLink()) throw new Error("Untracked directories or nested repositories require separate handling");
    if (st.size > 64 * 1024 * 1024) throw new Error("An untracked file exceeds the bounded sync snapshot size");
    contents.push([name, st.mode, hash(st.isSymbolicLink() ? await readlink(file) : await readFile(file))]);
  }
  const index = g(["diff", "--cached", "--binary", "--full-index", "--no-ext-diff", "--no-textconv", "--no-renames", ...ORDINARY_PATHSPEC]).bytes;
  const working = g(["diff", "--binary", "--full-index", "--no-ext-diff", "--no-textconv", "--no-renames", ...ORDINARY_PATHSPEC]).bytes;
  const status = g(["status", "--porcelain=v2", "-z", "--untracked-files=all", ...ORDINARY_PATHSPEC]).stdout;
  const value = { branch: branch(ctx), head: head(ctx), index_dirty: index.length > 0, dirty: Boolean(status),
    index_digest: hash(index), working_digest: hash(working), untracked_digest: hash(contents), status_digest: hash(status) };
  return { ...value, digest: hash(value) };
}

export async function assertSnapshot(ctx, expected) {
  if ((await snapshot(ctx)).digest !== expected.digest) throw new Error("Local branch, HEAD, index or working content changed during sync");
}

export async function assertIdle(ctx) {
  if (!branch(ctx)) throw new Error("Detached HEAD is outside sync");
  for (const name of ["MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "rebase-merge", "rebase-apply", "sequencer"]) {
    try { await lstat(path.join(ctx.gitDir, name)); throw new Error(`An existing ${name} operation must be resolved first`); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  if (ctx.git(ctx.root, ["ls-files", "--unmerged", "-z"]).stdout) throw new Error("Unresolved index conflicts must be resolved first");
  if (ctx.git(ctx.root, ["rev-parse", "--is-shallow-repository"]).out === "true") throw new Error("Shallow history is outside automatic sync");
  const sparse = ctx.git(ctx.root, ["config", "--bool", "core.sparseCheckout"], { allowFailure: true });
  if (sparse.out === "true") throw new Error("Sparse checkout requires separate sync handling");
  if (ctx.git(ctx.root, ["ls-files", "--stage", "-z"]).stdout.split("\0").some((line) => line.startsWith("160000 "))) throw new Error("Submodules require separate sync handling");
}

export function repositoryIdentity(url, root = process.cwd()) {
  const repository = repositoryFromRemote(url);
  if (repository) return `${repository.host}/${repository.full_name}`.toLowerCase();
  try {
    const u = new URL(url);
    if (u.protocol === "file:") return `local:${path.resolve(decodeURIComponent(u.pathname))}`;
    return `${u.protocol}//${u.hostname.toLowerCase()}:${u.port}${u.pathname.replace(/\/$/, "")}`;
  } catch { return `local:${path.resolve(root, url)}`; }
}

export function remoteState(ctx, remote, push = false) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(remote)) throw new Error("Invalid sync remote name");
  const fetch = ctx.git(ctx.root, ["remote", "get-url", "--all", remote]).out.split("\n");
  const send = ctx.git(ctx.root, ["remote", "get-url", "--push", "--all", remote]).out.split("\n");
  if (fetch.length !== 1 || !fetch[0]) throw new Error("Sync requires exactly one fetch URL");
  const identity = repositoryIdentity(fetch[0], ctx.root);
  if (push && (send.length !== 1 || repositoryIdentity(send[0], ctx.root) !== identity)) throw new Error("Sync push requires one fetch and push destination for the same repository");
  if (ctx.git(ctx.root, ["config", "--bool", `remote.${remote}.mirror`], { allowFailure: true }).out === "true") throw new Error("Mirror remotes are outside sync");
  const refspecs = ctx.git(ctx.root, ["config", "--get-all", `remote.${remote}.fetch`], { allowFailure: true });
  if (refspecs.code !== 0 && refspecs.code !== 1) throw new Error("Cannot inspect remote fetch configuration");
  const tagOption = ctx.git(ctx.root, ["config", "--get", `remote.${remote}.tagOpt`], { allowFailure: true });
  if (tagOption.code !== 0 && tagOption.code !== 1) throw new Error("Cannot inspect remote tag configuration");
  return { name: remote, identity, digest: hash([fetch, send]), fetch_refspecs: refspecs.out ? refspecs.out.split("\n") : [], tag_option: tagOption.out };
}

export function assertRemote(ctx, expected, push = false) {
  const current = remoteState(ctx, expected.name, push);
  if (current.digest !== expected.digest) throw new Error("Resolved fetch/push destination changed during sync");
  if ((expected.fetch_refspecs && hash(current.fetch_refspecs) !== hash(expected.fetch_refspecs))
    || (Object.hasOwn(expected, "tag_option") && current.tag_option !== expected.tag_option)) throw new Error("Remote fetch or tag configuration changed during sync");
}

function matchRef(pattern, ref) {
  const parts = pattern.split("*");
  if (parts.length === 1) return pattern === ref ? "" : null;
  return ref.startsWith(parts[0]) && ref.endsWith(parts[1]) && ref.length >= parts[0].length + parts[1].length
    ? ref.slice(parts[0].length, ref.length - parts[1].length) : null;
}

export function requireFetchBranch(ctx, remote, name) {
  const refspecs = remote.fetch_refspecs ?? remoteState(ctx, remote.name).fetch_refspecs;
  const positive = [];
  const negative = [];
  for (const raw of refspecs) {
    const spec = raw.startsWith("+") ? raw.slice(1) : raw;
    const excluded = spec.startsWith("^");
    const parts = (excluded ? spec.slice(1) : spec).split(":");
    const source = parts[0];
    const destination = parts[1];
    if (parts.length !== (excluded ? 1 : 2) || !source.startsWith("refs/heads/")
      || !ctx.git(ctx.root, ["check-ref-format", "--refspec-pattern", source], { allowFailure: true }).ok
      || (!excluded && (!destination?.startsWith(`refs/remotes/${remote.name}/`)
        || !ctx.git(ctx.root, ["check-ref-format", "--refspec-pattern", destination], { allowFailure: true }).ok
        || source.includes("*") !== destination.includes("*")))) throw new Error("Remote fetch refspec is outside supported branch mappings; preserve its configuration and use separate integration");
    if (excluded) negative.push(source);
    else positive.push({ source, destination });
  }
  const source = `refs/heads/${name}`;
  const destination = `refs/remotes/${remote.name}/${name}`;
  const mapped = positive.some((entry) => {
    const matched = matchRef(entry.source, source);
    return matched !== null && entry.destination.replace("*", matched) === destination;
  });
  if (!mapped || negative.some((pattern) => matchRef(pattern, source) !== null)) throw new Error(`Configured fetch does not update ${destination}; preserve its configuration and use separate integration`);
  return { complete_heads: negative.length === 0 && positive.some((entry) => entry.source === "refs/heads/*" && entry.destination === `refs/remotes/${remote.name}/*`) };
}

export function resolveBase(ctx, remote, supplied = "") {
  const current = branch(ctx);
  let base = supplied;
  if (base.startsWith(`${remote}/`)) base = base.slice(remote.length + 1);
  if (!base) {
    const tracking = ctx.git(ctx.root, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], { allowFailure: true }).out;
    if (tracking.startsWith(`${remote}/`) && tracking !== `${remote}/${current.replace(/-done$/, "")}`) base = tracking.slice(remote.length + 1);
    if (!base) base = current.match(/^(.+)-tiga\d{4}[a-x][a-j][a-j](?:-done)?$/)?.[1] ?? "";
    if (!base) {
      const symbolic = ctx.git(ctx.root, ["symbolic-ref", "--quiet", "--short", `refs/remotes/${remote}/HEAD`], { allowFailure: true }).out;
      if (symbolic.startsWith(`${remote}/`)) base = symbolic.slice(remote.length + 1);
    }
  }
  if (!base || base.startsWith("-") || !ctx.git(ctx.root, ["check-ref-format", `refs/heads/${base}`], { allowFailure: true }).ok) throw new Error("Sync base branch is unresolved; pass --base");
  if (current === base) throw new Error("Switch to a work branch before sync");
  return { name: base, ref: `refs/remotes/${remote}/${base}` };
}

export function fetchBase(ctx, remote, base) {
  assertRemote(ctx, remote);
  requireFetchBranch(ctx, remote, base.name);
  ctx.git(ctx.root, ["fetch", remote.name]);
  assertRemote(ctx, remote);
  const sha = ctx.git(ctx.root, ["rev-parse", "--verify", `${base.ref}^{commit}`]).out;
  if (!SHA.test(sha)) throw new Error("Fetched base commit is invalid");
  return sha;
}

export function operationPath(ctx, id) { return path.join(ctx.storage, "operations", checkedId(id), "state.json"); }
export async function saveOperation(ctx, op) { await writeJson(operationPath(ctx, op.id), op); }
export async function loadOperation(ctx, id) {
  const file = operationPath(ctx, id);
  const actual = await realpath(path.dirname(file));
  if (!actual.startsWith(`${ctx.storage}${path.sep}`)) throw new Error("Operation path escapes sync storage");
  if (!(await realpath(file)).startsWith(`${actual}${path.sep}`)) throw new Error("Operation state escapes its directory");
  const op = await readJson(file);
  if (!op || op.schema !== SYNC_SCHEMA || op.id !== id || op.root !== ctx.root || op.common !== ctx.common) throw new Error("Sync operation identity does not match this worktree");
  return op;
}

export async function newOperation(ctx, type, id, initial, remote, base, baseSha) {
  const op = { schema: SYNC_SCHEMA, id, type, root: ctx.root, common: ctx.common, warnings: ctx.warnings, status: "running", phase: "inspect", original: initial, remote, base, base_sha: baseSha, mutation_invoked: false, created_at: new Date().toISOString() };
  await saveOperation(ctx, op);
  return op;
}

export async function pendingOperations(ctx) {
  let names;
  try { names = await readdir(path.join(ctx.storage, "operations")); } catch (error) { if (error.code === "ENOENT") return []; throw error; }
  const found = [];
  for (const id of names.sort()) {
    if (!ID.test(id)) continue;
    const op = await loadOperation(ctx, id);
    if (!TERMINAL.has(op.status)) found.push(op);
  }
  return found;
}

export async function checkPending(ctx, { pull = false, except = "" } = {}) {
  for (const op of await pendingOperations(ctx)) {
    if (op.id === except) continue;
    if (pull && op.type === "pull" && op.status === "awaiting-merge-confirmation" && !op.mutation_invoked) {
      op.status = "superseded";
      await saveOperation(ctx, op);
      continue;
    }
    if (pull && op.type === "push" && !op.apply_started && ["prepared", "needs-sync-pull"].includes(op.status)) {
      op.status = "superseded";
      await saveOperation(ctx, op);
    } else throw new Error(`Sync operation ${op.id} requires explicit recovery before another sync`);
  }
}

export async function lock(ctx, id, recover = false) {
  const file = path.join(ctx.common, "miku-scm-sync.lock");
  const token = randomUUID();
  let handle;
  try { handle = await open(file, "wx", 0o600); }
  catch (error) {
    if (error.code !== "EEXIST") throw error;
    const previous = await readJson(file);
    let alive = true;
    try { process.kill(previous?.pid, 0); } catch (caught) { if (caught.code === "ESRCH") alive = false; }
    if (!recover || alive || previous?.operation !== id || previous.root !== ctx.root) throw new Error(`Another sync holds the repository lock${previous?.operation ? ` (${previous.operation})` : ""}`);
    await loadOperation(ctx, id);
    const again = await readJson(file);
    if (hash(previous) !== hash(again)) throw new Error("Sync lock changed during recovery");
    await unlink(file);
    handle = await open(file, "wx", 0o600);
  }
  await handle.writeFile(JSON.stringify({ token, pid: process.pid, operation: id, root: ctx.root }));
  await handle.close();
  return async () => { if ((await readJson(file))?.token === token) await unlink(file); };
}

export function newId() { return randomUUID(); }
export async function openSync(repo, dependencies, id, recover = false) {
  try {
    const ctx = await context(repo, dependencies);
    const release = await lock(ctx, id, recover);
    return { ctx, release };
  } catch (error) { error.mutationInvoked = false; throw error; }
}
export async function beforeAction(ctx, op, phase) {
  if (ctx.dependencies.beforeAction) await ctx.dependencies.beforeAction(phase, ctx, op);
  op.phase = phase;
  op.attempt = { phase, started_at: new Date().toISOString(), completed: false };
  await saveOperation(ctx, op);
}
export async function afterAction(ctx, op) { op.attempt.completed = true; await saveOperation(ctx, op); }

export async function failure(ctx, op, error) {
  const closed = op && TERMINAL.has(op.status);
  const status = !closed && op?.mutation_invoked ? "partial" : "not-applied";
  if (op && !closed) { op.status = op.mutation_invoked ? "partial" : "rejected"; op.error = error.message; await saveOperation(ctx, op); }
  return { status, warnings: ctx.warnings, reason: error.message, mutation_invoked: closed ? false : op?.mutation_invoked ?? false, operation_id: op?.id ?? null, stage: op?.phase ?? "inspect", final_branch: branch(ctx), head: head(ctx), backup_branch: op?.backup_branch ?? null, stash_sha: op?.stash_sha ?? null, next_action: !closed && op?.mutation_invoked ? "Inspect the retained sync operation; resume or abort it explicitly" : "Resolve the reported condition before starting sync" };
}

function baseRecordFile(ctx, name) { return path.join(ctx.storage, "branches", `${hash(name)}.json`); }
export async function saveBaseRecord(ctx, name, remote, base, sha) {
  if (!SHA.test(sha) || !ancestor(ctx, sha, head(ctx))) throw new Error("Cannot record an unverified branch base");
  const record = { schema: SYNC_SCHEMA, root: ctx.root, common: ctx.common, branch: name, remote_identity: remote.identity, remote_name: remote.name, base: base.name, base_sha: sha, verified_head: head(ctx) };
  await writeJson(baseRecordFile(ctx, name), record);
}

export async function readBaseRecord(ctx, name, remote, base) {
  let record = await readJson(baseRecordFile(ctx, name));
  if (record && (record.schema !== SYNC_SCHEMA || record.root !== ctx.root || record.common !== ctx.common || record.branch !== name || record.remote_identity !== remote.identity || record.remote_name !== remote.name || record.base !== base.name || !SHA.test(record.base_sha))) throw new Error("Branch base record identity changed");
  if (record) return record;
  let runs;
  try { runs = await readdir(path.join(ctx.root, "workplace/miku-scm/runs")); } catch (error) { if (error.code === "ENOENT") return null; throw error; }
  const matches = new Map();
  for (const run of runs) {
    if (!/^[A-Za-z0-9._-]+$/.test(run)) continue;
    const directory = path.join(ctx.root, "workplace/miku-scm/runs", run);
    const result = await readJson(path.join(directory, "result.json"));
    if (result?.workflow !== "repository.post-merge.next-work" || result.status !== "success") continue;
    const plan = await readJson(path.join(directory, "plan.json"));
    const r = result.result;
    let planRoot;
    try { planRoot = typeof plan?.repository === "string" ? await realpath(plan.repository) : null; } catch { continue; }
    if (planRoot !== ctx.root || r?.next_branch !== name || r.remote !== remote.name || r.base !== base.name || !SHA.test(r.base_commit ?? "")) continue;
    matches.set(r.base_commit, r);
  }
  if (matches.size > 1) throw new Error("More than one branch creation base matches this branch");
  if (matches.size === 1) {
    const value = [...matches.keys()][0];
    if (!ancestor(ctx, value, head(ctx))) throw new Error("Legacy branch base is not an ancestor of HEAD");
    record = { base_sha: value, migrated: true };
  }
  return record;
}
