// Shared test support; importing this module registers no tests.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  applyMaintenancePlan,
  createGitRunner,
  diagnose,
  parseArgs,
  parseBackupName,
  repositoryPathsEqual,
  saveMaintenancePlan,
} from "../scripts/repository-maintenance.mjs";


export function git(cwd, ...args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}


export async function repository(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "miku-scm-maintenance-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  git(root, "init");
  git(root, "config", "user.name", "Test User");
  git(root, "config", "user.email", "test@example.invalid");
  await writeFile(path.join(root, "README.md"), "base\n", "utf8");
  await writeFile(path.join(root, ".gitignore"), "workplace/\n", "utf8");
  git(root, "add", "README.md", ".gitignore");
  git(root, "commit", "-m", "base");
  git(root, "branch", "-M", "devel");
  git(root, "remote", "add", "origin", "https://github.com/example/project.git");
  return { root, head: git(root, "rev-parse", "HEAD") };
}


export function options(root, ...extra) {
  return parseArgs(["--repo", root, ...extra]);
}


export function mergedPull(branch, sha, number = 42) {
  return {
    number,
    html_url: `https://github.com/example/project/pull/${number}`,
    state: "closed",
    merged_at: "2026-07-20T03:00:00Z",
    head: {
      ref: branch,
      sha,
      repo: { full_name: "example/project" },
    },
  };
}


export function ghReturning(data, options = {}) {
  return () => ({
    ok: options.ok ?? true,
    status: options.ok === false ? 1 : 0,
    timedOut: options.timedOut ?? false,
    stdout: options.stdout ?? JSON.stringify(data),
    stderr: options.stderr ?? "",
  });
}
