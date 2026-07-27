import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";

const VERSION_FILE = /^[A-Za-z0-9._/-]+$/;

export const LOCAL_SNAPSHOT_SCHEMA_VERSION = "miku-scm.local-snapshot/v1";

export function parseLocalSnapshotArgs(argv, cwd = process.cwd()) {
  const options = { repo: cwd, versionFiles: ["pom.xml"] };
  let customVersionFiles = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repo") options.repo = argv[++index] ?? "";
    else if (arg === "--version-file") {
      if (!customVersionFiles) {
        options.versionFiles = [];
        customVersionFiles = true;
      }
      options.versionFiles.push(argv[++index] ?? "");
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!options.repo) throw new Error("--repo must not be empty");
  if (options.versionFiles.length > 10) throw new Error("At most 10 --version-file values are allowed");
  for (const file of options.versionFiles) {
    if (!VERSION_FILE.test(file) || path.isAbsolute(file) || file.startsWith("/")
      || file.split("/").includes("..")) {
      throw new Error("--version-file must be a safe repository-relative path");
    }
  }
  return options;
}

export function createSnapshotGitRunner(counter = null) {
  return (cwd, args) => {
    if (counter) counter.git = (counter.git ?? 0) + 1;
    const result = spawnSync("git", args, {
      cwd,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
    if (result.status !== 0) {
      const detail = (result.stderr || result.stdout || "").trim();
      throw new Error(`git ${args.join(" ")} failed${detail ? `: ${detail}` : ""}`);
    }
    return (result.stdout || "").trimEnd();
  };
}

export function parsePorcelainV2(output) {
  const snapshot = {
    head: null,
    branch: null,
    upstream: null,
    ahead: 0,
    behind: 0,
    staged: 0,
    unstaged: 0,
    untracked: 0,
    conflicted: 0,
  };
  for (const record of output.split("\0").filter(Boolean)) {
    if (record.startsWith("# branch.oid ")) snapshot.head = record.slice(13);
    else if (record.startsWith("# branch.head ")) {
      const value = record.slice(14);
      snapshot.branch = value === "(detached)" ? null : value;
    } else if (record.startsWith("# branch.upstream ")) snapshot.upstream = record.slice(18);
    else if (record.startsWith("# branch.ab ")) {
      const match = record.match(/^# branch\.ab \+(\d+) -(\d+)$/);
      if (!match) throw new Error("Malformed branch.ab status record");
      snapshot.ahead = Number(match[1]);
      snapshot.behind = Number(match[2]);
    } else if (record.startsWith("? ")) snapshot.untracked += 1;
    else if (record.startsWith("u ")) snapshot.conflicted += 1;
    else if (record.startsWith("1 ") || record.startsWith("2 ")) {
      const xy = record.slice(2, 4);
      if (xy.length !== 2) throw new Error("Malformed tracked status record");
      if (xy[0] !== ".") snapshot.staged += 1;
      if (xy[1] !== ".") snapshot.unstaged += 1;
    }
  }
  if (!snapshot.head) throw new Error("Git status did not report branch.oid");
  snapshot.dirty = snapshot.staged + snapshot.unstaged + snapshot.untracked + snapshot.conflicted > 0;
  return snapshot;
}

export function parseWorktrees(output) {
  const worktrees = [];
  let current = null;
  for (const line of output.split("\n")) {
    if (line.startsWith("worktree ")) {
      if (current) worktrees.push(current);
      current = { path: line.slice(9), head: null, branch: null, detached: false };
    } else if (current && line.startsWith("HEAD ")) current.head = line.slice(5);
    else if (current && line.startsWith("branch refs/heads/")) current.branch = line.slice(18);
    else if (current && line === "detached") current.detached = true;
  }
  if (current) worktrees.push(current);
  return worktrees;
}

function versionFromContent(file, content) {
  if (path.basename(file) === "pom.xml") {
    const match = content.match(/<version>\s*([^<\s]+)\s*<\/version>/);
    return match?.[1] ?? null;
  }
  const labelled = content.match(/^(?:Version|version):\s*(\S+)\s*$/m);
  if (labelled) return labelled[1];
  const first = content.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  return first ?? null;
}

async function readVersions(root, files) {
  const versions = [];
  for (const file of files) {
    try {
      const content = await readFile(path.join(root, file), "utf8");
      versions.push({ path: file, value: versionFromContent(file, content), present: true });
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      versions.push({ path: file, value: null, present: false });
    }
  }
  return versions;
}

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export async function collectLocalSnapshot(options, dependencies = {}) {
  const git = dependencies.git ?? createSnapshotGitRunner(dependencies.counter);
  const input = await realpath(path.resolve(options.repo));
  const root = path.resolve(git(input, ["rev-parse", "--show-toplevel"]).trim());
  const status = parsePorcelainV2(git(root, [
    "status", "--porcelain=v2", "--branch", "-z", "--untracked-files=normal",
  ]));
  const worktrees = parseWorktrees(git(root, ["worktree", "list", "--porcelain"]));
  const versions = await readVersions(root, options.versionFiles);
  const core = {
    root,
    ...status,
    worktrees,
    versions,
  };
  return {
    schema_version: LOCAL_SNAPSHOT_SCHEMA_VERSION,
    captured_at: (dependencies.now ? dependencies.now() : new Date()).toISOString(),
    identity_sha256: digest(core),
    invalidated_by: [
      "branch-switch",
      "head-change",
      "index-change",
      "working-tree-change",
      "upstream-ref-change",
      "fetch",
      "commit",
      "reset",
      "merge",
      "rebase",
    ],
    mutation_revalidation_fields: ["head", "branch", "dirty", "upstream"],
    subprocess_count: 3,
    ...core,
  };
}
