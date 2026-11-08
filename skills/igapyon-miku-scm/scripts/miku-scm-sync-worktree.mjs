import { lstat, readdir, readFile } from "node:fs/promises";
import { ORDINARY_PATHSPEC } from "./miku-scm-operational-storage.mjs";

import path from "node:path";
import { SHA, afterAction, beforeAction, branch, head, saveOperation, snapshot, zeros } from "./miku-scm-sync-state.mjs";

// Exported for boundary tests; the workflow runner does not expose this helper.
export function chunkIgnorePaths(paths, { maxPaths = 512, maxBytes = 256 * 1024 } = {}) {
  if (!Number.isInteger(maxPaths) || maxPaths < 1 || !Number.isInteger(maxBytes) || maxBytes < 1) {
    throw new Error("Git ignore batch limits must be positive integers");
  }
  const chunks = [];
  let current = [];
  let currentBytes = 0;
  for (const name of paths) {
    const bytes = Buffer.byteLength(name, "utf8") + 1;
    if (bytes > maxBytes) throw new Error("A checkout path exceeds the bounded Git ignore query size");
    if (current.length && (current.length >= maxPaths || currentBytes + bytes > maxBytes)) {
      chunks.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(name);
    currentBytes += bytes;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

export function assertNoIgnoredPaths(ctx, candidates) {
  for (const names of chunkIgnorePaths(candidates)) {
    const result = ctx.git(ctx.root, ["check-ignore", "--stdin", "-z", "--no-index"], {
      input: `${names.join("\0")}\0`, allowFailure: true,
    });
    if (result.code === 1) {
      if (result.stdout !== "") throw new Error("Git ignore lookup returned unexpected output");
      continue;
    }
    if (result.code !== 0 || typeof result.stdout !== "string" || !result.stdout.endsWith("\0")) {
      throw new Error("Git ignore lookup failed; sync protection could not be verified");
    }
    const ignored = result.stdout.slice(0, -1).split("\0");
    const candidates = new Set(names);
    if (ignored.length === 0 || ignored.some((name) => !candidates.has(name))) {
      throw new Error("Git ignore lookup returned an invalid path result");
    }
    throw new Error(`Ignored path would be overwritten by sync: ${ignored[0]}`);
  }
}

// ort can relocate added files after inferring a directory rename, producing a
// path absent from both input trees. Those writes can overwrite ignored files.
// Keep checkout paths bounded by the checked trees on initial and resumed work.
export function integrateGit(ctx, args, options = {}) {
  return ctx.git(ctx.root, ["-c", "merge.renames=false", "-c", "merge.directoryRenames=false", ...args], options);
}

export function requireGitCapabilities(ctx) {
  const version = ctx.git(ctx.root, ["version"]).out.match(/git version (\d+)\.(\d+)/);
  if (!version || Number(version[1]) < 2 || (Number(version[1]) === 2 && Number(version[2]) < 45)) {
    throw new Error("Sync requires Git 2.45 or later for explicit empty-commit handling");
  }
}

// Check every checkout tree, including intermediate replay commits. Only walk
// paths Git may write: ignored dependency/cache trees otherwise remain untouched.
export async function guardIgnored(ctx, commits, dependencies = {}) {
  const insensitive = ctx.git(ctx.root, ["config", "--bool", "core.ignorecase"], { allowFailure: true }).out === "true";
  const key = (name) => insensitive ? name.normalize("NFC").toLowerCase() : name;
  const trackedPaths = new Set(zeros(ctx.git(ctx.root, ["ls-files", "-z"]).stdout).map(key));
  const trackedDirectories = new Set();
  for (const trackedPath of trackedPaths) {
    let slash = trackedPath.lastIndexOf("/");
    while (slash !== -1) {
      trackedDirectories.add(trackedPath.slice(0, slash));
      slash = trackedPath.lastIndexOf("/", slash - 1);
    }
  }
  const leaves = new Set();
  for (const commit of new Set(commits)) {
    if (!SHA.test(commit)) throw new Error("Invalid checkout tree commit");
    const tree = ctx.git(ctx.root, ["ls-tree", "-r", "-z", commit]).stdout;
    for (const entry of zeros(tree)) {
      if (entry.startsWith("160000 ")) throw new Error("Target trees containing submodules require separate handling");
      leaves.add(entry.slice(entry.indexOf("\t") + 1));
    }
  }
  // Scope the case-folded directory cache to one guard call.
  const directoryCache = new Map();
  const ignoredCandidates = new Set();
  const directoryAliases = async (relative) => {
    if (!directoryCache.has(relative)) {
      const names = new Map();
      for (const entry of await (dependencies.readdir ?? readdir)(path.join(ctx.root, relative))) {
        const folded = key(entry);
        if (!names.has(folded)) names.set(folded, []);
        names.get(folded).push(entry);
      }
      directoryCache.set(relative, names);
    }
    return directoryCache.get(relative);
  };
  for (const name of leaves) {
    let relative = "";
    const pieces = name.split("/");
    for (let i = 0; i < pieces.length; i++) {
      let piece = pieces[i];
      if (piece === ".." || piece === "." || !piece) throw new Error("Unsafe checkout tree path");
      if (insensitive) {
        let entries;
        try { entries = await directoryAliases(relative); } catch (error) { if (error.code === "ENOENT" || error.code === "ENOTDIR") break; throw error; }
        const aliases = entries.get(key(piece)) ?? [];
        if (aliases.length > 1) throw new Error("Ambiguous case-folded checkout path");
        piece = aliases[0] ?? piece;
      }
      relative = relative ? `${relative}/${piece}` : piece;
      let stat;
      try { stat = await lstat(path.join(ctx.root, relative)); } catch (error) { if (error.code === "ENOENT" || error.code === "ENOTDIR") break; throw error; }
      // Ignore rules also match parent directories of tracked generated files.
      // Only real directories qualify; ignored file/symlink replacements remain protected.
      const managed = trackedPaths.has(key(relative)) || (stat.isDirectory() && trackedDirectories.has(key(relative)));
      if (!managed) ignoredCandidates.add(relative);
      if (stat.isSymbolicLink() || !stat.isDirectory()) break;
      if (i === pieces.length - 1) {
        const children = ctx.git(ctx.root, ["ls-files", "--others", "--ignored", "--exclude-standard", "-z", "--", `${relative}/`]).stdout;
        if (children) throw new Error(`Ignored directory contents would be overwritten by sync: ${relative}`);
      }
    }
  }
  assertNoIgnoredPaths(ctx, [...ignoredCandidates]);
}

export async function createBackup(ctx, op) {
  op.backup_branch ??= `backup/sync-${op.id}`;
  await beforeAction(ctx, op, "backup");
  const ref = `refs/heads/${op.backup_branch}`;
  if (ctx.git(ctx.root, ["show-ref", "--verify", "--quiet", ref], { allowFailure: true }).ok) throw new Error("Sync backup branch already exists");
  op.mutation_invoked = true;
  await saveOperation(ctx, op);
  ctx.git(ctx.root, ["branch", op.backup_branch, op.original.head]);
  if (ctx.git(ctx.root, ["rev-parse", ref]).out !== op.original.head) throw new Error("Sync backup verification failed");
  await afterAction(ctx, op);
}

export async function stashWork(ctx, op) {
  if (!op.original.dirty) return;
  op.stash_message = `miku-scm sync ${op.id}`;
  await beforeAction(ctx, op, "stash-create");
  op.mutation_invoked = true;
  await saveOperation(ctx, op);
  const operationalIgnored = ctx.git(ctx.root, ["check-ignore", "--quiet", "--", "workplace/miku-scm/probe"], { allowFailure: true }).ok;
  const r = ctx.git(ctx.root, ["stash", "push", "--include-untracked", "--message", op.stash_message,
    ...(operationalIgnored ? [] : ORDINARY_PATHSPEC)], { allowFailure: true });
  await locateStash(ctx, op);
  if (!r.ok || !op.stash_sha) throw new Error("Sync stash creation did not complete; inspect retained work before recovery");
  if ((await snapshot(ctx)).dirty) throw new Error("Working tree was not clean after sync stash");
  await afterAction(ctx, op);
}

export async function locateStash(ctx, op) {
  if (!op.stash_message) return;
  const matches = ctx.git(ctx.root, ["stash", "list", "--format=%H%x00%gs"]).out.split("\n")
    .filter((line) => line.endsWith(`\0On ${op.original.branch}: ${op.stash_message}`));
  if (matches.length > 1) throw new Error("Sync stash identity is ambiguous");
  if (matches.length === 1) {
    const sha = matches[0].split("\0")[0];
    if (!SHA.test(sha) || (op.stash_sha && op.stash_sha !== sha)) throw new Error("Sync stash identity changed");
    op.stash_sha = sha;
    await saveOperation(ctx, op);
  }
}

export async function restoreWork(ctx, op) {
  if (!op.stash_sha) return;
  if (op.restore_started) throw new Error("Carryover restoration already started; resolve it and resume without applying the stash again");
  if ((await snapshot(ctx)).dirty) throw new Error("Worktree changed before carryover restoration; preserve those edits and recover explicitly");
  if (!ctx.git(ctx.root, ["stash", "list", "--format=%H"]).out.split("\n").includes(op.stash_sha)) throw new Error("Exact sync stash is no longer retained");
  await beforeAction(ctx, op, "stash-restore");
  op.restore_before_snapshot = (await snapshot(ctx)).digest;
  op.restore_started = true;
  await saveOperation(ctx, op);
  const r = integrateGit(ctx, ["stash", "apply", "--index", op.stash_sha], { allowFailure: true });
  op.restore_ok = r.ok;
  if (!r.ok) op.restore_failure_snapshot = (await snapshot(ctx)).digest;
  await saveOperation(ctx, op);
  if (!r.ok) throw new Error("Carryover restoration requires resolution; the exact stash is retained");
  await afterAction(ctx, op);
}

export async function rebaseIdentity(ctx, op) {
  const directory = path.join(ctx.gitDir, "rebase-merge");
  let original, onto, name;
  try {
    [original, onto, name] = await Promise.all(["orig-head", "onto", "head-name"].map(async (file) => (await readFile(path.join(directory, file), "utf8")).trim()));
  } catch (error) { if (error.code === "ENOENT") return false; throw error; }
  if (original !== op.original.head || onto !== op.base_sha || name !== `refs/heads/${op.original.branch}`) throw new Error("In-progress rebase does not belong to this sync operation");
  return true;
}

export function verifyLocation(ctx, op, expectedHead) {
  if (branch(ctx) !== (op.next_branch ?? op.original.branch) || (expectedHead && head(ctx) !== expectedHead)) throw new Error("Sync branch or HEAD changed");
}
