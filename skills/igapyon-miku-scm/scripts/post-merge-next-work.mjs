#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { jstDateParts } from "./miku-scm-jst-time.mjs";

const NAME = /^[A-Za-z0-9._-]+$/;

export function parseArgs(argv, cwd = process.cwd()) {
  const o = { repo: cwd, remote: "origin", base: "", confirmedMerged: false, apply: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--help" || a === "-h") o.help = true;
    else if (a === "--repo") o.repo = argv[++i] ?? "";
    else if (a === "--remote") o.remote = argv[++i] ?? "";
    else if (a === "--base") o.base = argv[++i] ?? "";
    else if (a === "--confirmed-merged") o.confirmedMerged = true;
    else if (a === "--apply") o.apply = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (o.help) return o;
  if (!o.confirmedMerged || !o.apply) throw new Error("--confirmed-merged and --apply are required");
  if (![o.remote, o.base || "devel"].every((v) => NAME.test(v))) throw new Error("--remote and --base must be Git names");
  return o;
}

function runner(cwd, args, allowFailure = false) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (r.status !== 0 && !allowFailure) throw new Error(`git ${args.join(" ")} failed: ${(r.stderr || r.stdout).trim()}`);
  return {
    ok: r.status === 0,
    out: (r.stdout || "").trim(),
    err: (r.stderr || "").trim(),
  };
}
export function workBranchName(base, date = new Date()) {
  const parts = jstDateParts(date);
  const abc = (n) => String.fromCharCode(97 + n);
  return `${base}-tiga${String(parts.month).padStart(2, "0")}${String(parts.day).padStart(2, "0")}${abc(parts.hour)}${abc(Math.floor(parts.minute / 10))}${abc(parts.minute % 10)}`;
}
function baseFromDoneBranch(branch) {
  return branch.match(/^(.+)-tiga\d{4}[a-x][a-j][a-j]-done$/)?.[1] ?? "";
}
function baseFromRemoteHead(root, remote, git = runner) {
  const symbolic = git(root, ["symbolic-ref", "--quiet", "--short", `refs/remotes/${remote}/HEAD`], true);
  const prefix = `${remote}/`;
  if (!symbolic.ok || !symbolic.out.startsWith(prefix)) return "";
  const base = symbolic.out.slice(prefix.length);
  return NAME.test(base) ? base : "";
}
async function version(root, commit, git = runner) {
  const standalone = git(root, ["show", `${commit}:VERSION.md`], true);
  const standaloneValue = standalone.ok ? standalone.out.trim() : "";
  if (/^\d{8}[a-z]+$/.test(standaloneValue)) {
    return { source: "VERSION.md", value: standaloneValue, tag: `v${standaloneValue}`, commit };
  }
  const pom = git(root, ["show", `${commit}:pom.xml`], true).out;
  const value = pom.match(/<project\b[\s\S]*?<version>([^<]+)<\/version>/)?.[1]?.trim() ?? "unresolved";
  const m = value.match(/^1\.(\d{8})\.([1-9]\d*)$/);
  return { source: "pom.xml", value, tag: m ? `v${m[1]}${String.fromCharCode(96 + Number(m[2]))}` : "unresolved", commit };
}

export function classifyTagLookup(recommendedTag, lookup, baseCommit) {
  if (recommendedTag === "unresolved") {
    return { tag_target: null, tag_status: "unresolved" };
  }
  if (!lookup?.ok) {
    return {
      tag_target: null,
      tag_status: "lookup-failed",
      ...(lookup?.err ? { tag_lookup_warning: lookup.err } : {}),
    };
  }
  const target = lookup.out.split("\n").filter(Boolean).pop()?.split(/\s+/)[0] ?? "";
  if (!target) return { tag_target: null, tag_status: "absent" };
  return {
    tag_target: target,
    tag_status: target === baseCommit ? "confirmed" : "mismatch",
  };
}

export async function run(options, dependencies = {}) {
  const git = dependencies.git ?? runner;
  let root;
  let before;
  let next;
  let stage = "inspect";
  let mutationInvoked = false;
  let stashSha = null;
  let restoreStatus = "not-started";
  try {
    root = git(options.repo, ["rev-parse", "--show-toplevel"]).out;
    before = git(root, ["branch", "--show-current"]).out;
    if (!before.endsWith("-done")) throw new Error("Current branch must end in -done");
    const initialStatus = git(root, ["status", "--porcelain"]).out;
    const staged = () => git(root, ["diff", "--cached", "--name-only", "--no-ext-diff", "--no-textconv"]).out;
    if (initialStatus && staged()) throw new Error("Index is dirty; staged changes are outside the unstaged carryover workflow");
    const nameBase = baseFromDoneBranch(before);
    const head = git(root, ["rev-parse", "HEAD"]).out;
    stage = "fetch";
    git(root, ["fetch", options.remote]);
    if (git(root, ["branch", "--show-current"]).out !== before || git(root, ["rev-parse", "HEAD"]).out !== head || git(root, ["status", "--porcelain"]).out !== initialStatus) throw new Error("Local state changed during fetch");
    const base = options.base || nameBase || baseFromRemoteHead(root, options.remote, git);
    if (!base || !NAME.test(base)) throw new Error("Base branch is unresolved; pass --base");
    const remoteBase = `${options.remote}/${base}`;
    const baseCommit = git(root, ["rev-parse", remoteBase]).out;
    next = workBranchName(base, dependencies.now ? dependencies.now() : new Date());
    if (git(root, ["show-ref", "--verify", "--quiet", `refs/heads/${next}`], true).ok) throw new Error(`Next work branch already exists: ${next}`);
    const info = await version(root, baseCommit, git);
    const tagLookup = info.tag === "unresolved"
      ? null
      : git(root, ["ls-remote", "--tags", options.remote, `refs/tags/${info.tag}`, `refs/tags/${info.tag}^{}`], true);
    const tagResult = classifyTagLookup(info.tag, tagLookup, baseCommit);
    if (git(root, ["branch", "--show-current"]).out !== before || git(root, ["rev-parse", "HEAD"]).out !== head || git(root, ["status", "--porcelain"]).out !== initialStatus) throw new Error("Local state changed before branch creation");
    if (initialStatus) {
      if (staged()) throw new Error("Index is dirty; staged changes are outside the unstaged carryover workflow");
      stage = "stash-create";
      const stashMessage = `miku-scm post-merge: ${before} -> ${next} (${randomUUID()})`;
      mutationInvoked = true;
      const saved = git(root, ["stash", "push", "--include-untracked", "--message", stashMessage], true);
      const stashes = git(root, ["stash", "list", "--format=%H%x00%gs"], true);
      if (stashes.ok) {
        const created = stashes.out.split("\n").find((line) => line.endsWith(`\0On ${before}: ${stashMessage}`));
        if (created) stashSha = created.split("\0")[0];
      }
      if (!saved.ok || !stashSha) throw new Error(`Carryover stash creation failed: ${saved.err || saved.out || "no new stash was created"}`);
      if (git(root, ["status", "--porcelain"]).out) throw new Error("Working tree or index is dirty after stash creation");
    }
    stage = "branch-create";
    mutationInvoked = true;
    git(root, ["switch", "-c", next, remoteBase]);
    stage = "branch-verify";
    const comparison = git(root, ["rev-list", "--left-right", "--count", `HEAD...${remoteBase}`]).out.replace(/\s+/g, " ");
    if (git(root, ["branch", "--show-current"]).out !== next || git(root, ["rev-parse", "HEAD"]).out !== baseCommit || comparison !== "0 0" || git(root, ["status", "--porcelain"]).out) throw new Error("Post-create verification failed");
    let carryover;
    if (stashSha) {
      stage = "stash-apply";
      restoreStatus = "failed";
      const restored = git(root, ["stash", "apply", stashSha], true);
      if (!restored.ok) throw new Error(`Carryover stash apply failed: ${restored.err || restored.out}`);
      restoreStatus = "applied";
      stage = "restore-verify";
      if (git(root, ["branch", "--show-current"]).out !== next || git(root, ["rev-parse", "HEAD"]).out !== baseCommit || staged()) throw new Error("Carryover restore verification failed");
      if (!git(root, ["stash", "list", "--format=%H"]).out.split("\n").includes(stashSha)) throw new Error("Carryover stash is no longer retained");
      restoreStatus = "restored";
      carryover = {
        stash_sha: stashSha,
        stash_retained: true,
        restore_status: restoreStatus,
        working_tree: git(root, ["status", "--porcelain"]).out ? "dirty" : "clean",
      };
    }
    return {
      status: "created",
      previous_branch: before,
      remote: options.remote,
      base,
      base_commit: baseCommit,
      version: info.value,
      version_source: info.source,
      recommended_tag: info.tag,
      ...tagResult,
      next_branch: next,
      final_branch: next,
      comparison,
      tag_mutation: false,
      release_mutation: false,
      ...(carryover ? { carryover } : {}),
      human_handoff: `Next work branch is ready: ${next}`,
    };
  } catch (caught) {
    const error = caught instanceof Error ? caught : new Error(String(caught));
    error.mutationInvoked = mutationInvoked;
    if (mutationInvoked) {
      const inspect = (args) => {
        try { return git(root, args, true); } catch { return { ok: false, out: "" }; }
      };
      const current = inspect(["branch", "--show-current"]);
      const status = inspect(["status", "--porcelain"]);
      const stashes = stashSha ? inspect(["stash", "list", "--format=%H"]) : null;
      error.recovery = {
        stage,
        previous_branch: before,
        next_branch: next,
        final_branch: current.ok ? current.out : null,
        stash_sha: stashSha,
        stash_retained: stashSha ? (stashes.ok ? stashes.out.split("\n").includes(stashSha) : null) : null,
        restore_status: restoreStatus,
        working_tree: status.ok ? (status.out ? "dirty" : "clean") : "unknown",
      };
    }
    throw error;
  }
}
export async function cli(argv = process.argv.slice(2)) { const o = parseArgs(argv); if (o.help) return; process.stdout.write(`${JSON.stringify(await run(o), null, 2)}\n`); }
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) cli().catch((e) => { process.stderr.write(`${JSON.stringify({ status: "error", message: e.message, mutation_invoked: e.mutationInvoked, ...(e.recovery ? { recovery: e.recovery } : {}) })}\n`); process.exitCode = 1; });
