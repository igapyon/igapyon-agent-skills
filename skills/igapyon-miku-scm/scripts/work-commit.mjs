#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  commandForPlatform,
  runFixedCommand,
} from "./miku-scm-fixed-command-runner.mjs";

export { commandForPlatform } from "./miku-scm-fixed-command-runner.mjs";

const GIT_MAX_BUFFER_BYTES = 64 * 1024 * 1024;

export const usage = `Usage:
  node skills/igapyon-miku-scm/scripts/work-commit.mjs \\
    [--repo <path>] [--message <commit-message>] --apply

Stages every non-ignored current change, runs recognised repository consistency
checks, and creates one local commit. It never pushes, creates a tag, or
creates a GitHub Release.`;

function sha256(value) { return createHash("sha256").update(value).digest("hex"); }

function sensitivePath(value) {
  const name = String(value).replaceAll("\\", "/").split("/").at(-1).toLowerCase();
  if ([".env", ".npmrc", ".netrc", ".pypirc", "id_rsa", "id_dsa", "id_ecdsa", "id_ed25519"].includes(name)) return true;
  if (name.startsWith(".env.")) return true;
  if (/^(secret|secrets|credential|credentials|token|tokens)([._-].*)?$/.test(name)) return true;
  return [".pem", ".p12", ".pfx", ".key"].some((suffix) => name.endsWith(suffix));
}

function boundedDiagnostic(value, maximum = 2000) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length <= maximum ? text : `${text.slice(0, maximum)}…[truncated]`;
}

function gitFailureMessage(args, result, stdout, stderr) {
  const details = [
    `exit_code=${result.status ?? "null"}`,
    `signal=${result.signal ?? "none"}`,
    `spawn_error=${result.error?.code ?? "none"}`,
    `stdout_bytes=${Buffer.byteLength(stdout, "utf8")}`,
    `stdout_sha256=${sha256(stdout)}`,
  ];
  const diagnostic = boundedDiagnostic(stderr || result.error?.message);
  if (diagnostic) details.push(`stderr=${diagnostic}`);
  return `git ${args.join(" ")} failed: ${details.join("; ")}`;
}

export function createGitRunner(spawn = spawnSync) {
  return (cwd, args, options = {}) => {
    const result = spawn("git", args, {
      cwd,
      encoding: "utf8",
      input: options.input,
      maxBuffer: GIT_MAX_BUFFER_BYTES,
    });
    const stdout = result.stdout ? String(result.stdout) : "";
    const stderr = result.stderr ? String(result.stderr) : "";
    if (result.status !== 0 && !options.allowFailure) {
      throw new Error(gitFailureMessage(args, result, stdout, stderr));
    }
    return {
      ok: result.status === 0,
      stdout,
      stderr,
    };
  };
}

function createCommandRunner() {
  return (command, args, cwd) => runFixedCommand(command, args, cwd);
}

function output(git, root, args, options) { return git(root, args, options).stdout; }
function zeroPaths(value) { return value.split("\0").filter(Boolean); }
function stablePaths(paths) { return [...new Set(paths)].sort(); }

const VERSION_SOURCE_PATHS = Object.freeze([
  "pom.xml",
  "skills/igapyon-mikuku-agent/references/VERSION.md",
]);

function changedPaths(root, git) {
  return stablePaths([
    ...zeroPaths(output(git, root, ["diff", "--name-only", "-z", "--no-renames"])),
    ...zeroPaths(output(git, root, ["diff", "--cached", "--name-only", "-z", "--no-renames"])),
    ...zeroPaths(output(git, root, ["ls-files", "--others", "--exclude-standard", "-z"])),
  ]);
}

function coupledSuffix(sequence) {
  let remaining = sequence;
  let value = "";
  while (remaining > 0) {
    remaining -= 1;
    value = String.fromCharCode(97 + (remaining % 26)) + value;
    remaining = Math.floor(remaining / 26);
  }
  return value;
}

function versionNoticeFromText(pom, versionFile) {
  const version = pom.match(/<project\b[\s\S]*?<version>([^<]+)<\/version>/)?.[1]?.trim() ?? "unresolved";
  const coupled = versionFile.match(/^Version:\s*(\S+)\s*$/m)?.[1] ?? "not-applicable";
  const miku = version.match(/^1\.(\d{8})\.([1-9]\d*)$/);
  const recommendedTag = miku ? `v${miku[1]}${coupledSuffix(Number(miku[2]))}` : "unresolved";
  let alignment = "not-applicable";
  if (miku && /^\d{8}[a-z]+$/.test(coupled)) {
    alignment = coupled === `${miku[1]}${coupledSuffix(Number(miku[2]))}` ? "aligned" : "mismatch";
  }
  return { version, coupled_version: coupled, recommended_tag: recommendedTag, alignment };
}

function withIncrementStatus(notice, paths) {
  if (notice.version === "unresolved") {
    return { ...notice, increment_status: "not_applicable" };
  }
  return {
    ...notice,
    increment_status: paths.some((entry) => VERSION_SOURCE_PATHS.includes(entry))
      ? "increment_observed"
      : "increment_not_observed",
  };
}

async function readVersionNotice(root, read = readFile) {
  let pom = "";
  let versionFile = "";
  try { pom = await read(path.join(root, "pom.xml"), "utf8"); } catch (error) { if (error?.code !== "ENOENT") throw error; }
  try { versionFile = await read(path.join(root, "skills", "igapyon-mikuku-agent", "references", "VERSION.md"), "utf8"); } catch (error) { if (error?.code !== "ENOENT") throw error; }
  return versionNoticeFromText(pom, versionFile);
}

async function resolveChecks(root, read = readFile) {
  const checks = [];
  let packageText = "";
  let pom = "";
  try { packageText = await read(path.join(root, "package.json"), "utf8"); } catch (error) { if (error?.code !== "ENOENT") throw error; }
  if (packageText) {
    const packageJson = JSON.parse(packageText);
    if (packageJson?.mikuIndex?.required === true) {
      if (typeof packageJson?.scripts?.["check:index"] !== "string") {
        throw new Error("mikuIndex.required is true but package.json has no check:index script");
      }
      checks.push({ command: "npm", args: ["run", "check:index"], label: "npm run check:index" });
    }
  }
  try { pom = await read(path.join(root, "pom.xml"), "utf8"); } catch (error) { if (error?.code !== "ENOENT") throw error; }
  if (pom.includes("<id>validate-version-alignment</id>")) {
    checks.push({ command: "mvn", args: ["validate"], label: "mvn validate" });
  }
  return checks;
}

function resolveCommitMessage(paths, notice, supplied) {
  const explicit = supplied.trim();
  if (explicit) return { message: explicit, source: "supplied" };
  if (paths.length > 0 && paths.every((entry) => VERSION_SOURCE_PATHS.includes(entry)) && notice.version !== "unresolved") {
    return { message: `バージョンを${notice.version}へ更新`, source: "version_fallback" };
  }
  return { message: "作業内容を更新", source: "generic_fallback" };
}

function result(status, values) { return { status, mode: "apply", ...values }; }

function preMutationFailure(error) {
  const failure = error instanceof Error ? error : new Error(String(error));
  failure.mutationInvoked = false;
  return failure;
}

export function parseArgs(argv, cwd = process.cwd()) {
  const options = { repo: cwd, message: "", apply: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--repo") options.repo = argv[++index] ?? "";
    else if (arg === "--message") options.message = argv[++index] ?? "";
    else if (arg === "--apply") options.apply = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (options.help) return options;
  if (!options.repo) throw new Error("--repo must not be empty");
  if (!options.apply) throw new Error("work.commit requires --apply");
  if (options.message.includes("\0")) throw new Error("--message must not contain NUL");
  if (Buffer.byteLength(options.message, "utf8") > 10_000) throw new Error("--message must be at most 10000 bytes");
  return options;
}

export async function runWorkCommit(options, dependencies = {}) {
  const git = dependencies.git ?? createGitRunner();
  const command = dependencies.command ?? createCommandRunner();
  let root;
  let branch;
  let headBefore;
  let paths;
  let versionNotice;
  let checks;
  let message;
  let messageSource;
  try {
    root = output(git, options.repo, ["rev-parse", "--show-toplevel"]).trim();
    branch = output(git, root, ["branch", "--show-current"]).trim();
    headBefore = output(git, root, ["rev-parse", "HEAD"]).trim();
    paths = changedPaths(root, git);
    const conflicts = zeroPaths(output(git, root, ["diff", "--name-only", "--diff-filter=U", "-z"]));
    versionNotice = withIncrementStatus(await readVersionNotice(root, dependencies.readFile), paths);
    checks = dependencies.resolveChecks ? await dependencies.resolveChecks(root) : await resolveChecks(root, dependencies.readFile);

    if (branch.endsWith("-done")) return result("not-applied", { repository: root, branch, head_before: headBefore, reason: "Current branch is frozen (-done)", mutation_invoked: false });
    if (conflicts.length > 0) return result("conflict", { repository: root, branch, head_before: headBefore, conflicted_paths: conflicts, mutation_invoked: false });
    if (paths.length === 0) return result("not-applied", { repository: root, branch, head_before: headBefore, reason: "No non-ignored changes to commit", mutation_invoked: false });
    const sensitivePaths = paths.filter(sensitivePath);
    if (sensitivePaths.length > 0) return result("not-applied", { repository: root, branch, head_before: headBefore, paths, sensitive_paths: sensitivePaths, reason: "Sensitive-path candidate requires explicit separate handling", mutation_invoked: false });
    if (versionNotice.alignment === "mismatch") return result("not-applied", { repository: root, branch, head_before: headBefore, paths, version_notice: versionNotice, reason: "Coupled version sources are mismatched", mutation_invoked: false });

    ({ message, source: messageSource } = resolveCommitMessage(paths, versionNotice, options.message));
    if (!message) return result("not-applied", { repository: root, branch, head_before: headBefore, paths, reason: "Commit message is empty", mutation_invoked: false });
  } catch (error) {
    throw preMutationFailure(error);
  }

  let staged = false;
  let stage = "stage";
  try {
    git(root, ["add", "--all"]);
    staged = true;
    const stagedPaths = stablePaths(zeroPaths(output(git, root, ["diff", "--cached", "--name-only", "-z", "--no-renames"])));
    if (JSON.stringify(stagedPaths) !== JSON.stringify(paths)) throw new Error("Staged paths differ from the reviewed non-ignored worktree paths");
    const stagedDiff = output(git, root, ["diff", "--cached", "--binary", "--full-index", "--no-ext-diff", "--no-textconv"]);
    const stagedDigest = sha256(stagedDiff);

    stage = "pre-commit-check";
    for (const check of checks) {
      const checked = command(check.command, check.args, root);
      if (!checked.ok) throw new Error(`${check.label} failed: ${(checked.stderr || checked.stdout).trim()}`);
    }

    stage = "post-check-verify";
    const verifiedPaths = stablePaths(zeroPaths(output(git, root, ["diff", "--cached", "--name-only", "-z", "--no-renames"])));
    const verifiedDigest = sha256(output(git, root, ["diff", "--cached", "--binary", "--full-index", "--no-ext-diff", "--no-textconv"]));
    if (JSON.stringify(verifiedPaths) !== JSON.stringify(paths) || verifiedDigest !== stagedDigest) {
      throw new Error("Pre-commit checks changed the staged content; rerun work.commit with the refreshed worktree");
    }
    const postCheckUnstagedPaths = stablePaths(zeroPaths(output(git, root, ["diff", "--name-only", "-z", "--no-renames", "--"], { allowFailure: true })));
    const postCheckUntrackedPaths = stablePaths(zeroPaths(output(git, root, ["ls-files", "--others", "--exclude-standard", "-z"])));
    if (postCheckUnstagedPaths.length > 0 || postCheckUntrackedPaths.length > 0) {
      const changedAfterChecks = stablePaths([...postCheckUnstagedPaths, ...postCheckUntrackedPaths]);
      const failure = new Error("Pre-commit checks changed the worktree; rerun work.commit with the refreshed worktree");
      failure.postCheckUnstagedPaths = postCheckUnstagedPaths;
      failure.postCheckUntrackedPaths = postCheckUntrackedPaths;
      failure.changedAfterChecks = changedAfterChecks;
      throw failure;
    }

    stage = "commit";
    git(root, ["commit", "-F", "-"], { input: `${message}\n` });
    const head = output(git, root, ["rev-parse", "HEAD"]).trim();
    const finalPaths = changedPaths(root, git);
    const clean = finalPaths.length === 0;
    return result(clean ? "committed" : "partial", {
      repository: root,
      branch,
      head_before: headBefore,
      head,
      commit_message: message,
      message_source: messageSource,
      commit_message_sha256: sha256(`${message}\n`),
      paths,
      staged_diff_sha256: stagedDigest,
      checks: checks.map((entry) => entry.label),
      version_notice: versionNotice,
      working_tree_clean: clean,
      remaining_paths: finalPaths,
      mutation_invoked: true,
    });
  } catch (error) {
    if (!staged) throw error;
    return result("partial", {
      repository: root,
      branch,
      head_before: headBefore,
      paths,
      version_notice: versionNotice,
      stage,
      message_source: messageSource,
      message: error instanceof Error ? error.message : String(error),
      post_check_unstaged_paths: error?.postCheckUnstagedPaths,
      post_check_untracked_paths: error?.postCheckUntrackedPaths,
      changed_after_checks: error?.changedAfterChecks,
      mutation_invoked: true,
    });
  }
}

export async function cli(argv = process.argv.slice(2), dependencies = {}) {
  const options = parseArgs(argv);
  if (options.help) { process.stdout.write(`${usage}\n`); return; }
  process.stdout.write(`${JSON.stringify(await runWorkCommit(options, dependencies), null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  cli().catch((error) => {
    process.stderr.write(`${JSON.stringify({ status: "error", message: error instanceof Error ? error.message : String(error) })}\n`);
    process.exitCode = 1;
  });
}
