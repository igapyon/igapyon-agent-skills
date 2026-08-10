import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  parseArgs,
  runRecommitPush,
} from "../scripts/pr-recommit-push.mjs";
import { runRecommit } from "../scripts/pr-soft-reset-recommit-preflight.mjs";

function git(cwd, ...args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

async function scenario(t) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "miku-scm-recommit-push-test-"));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const remote = path.join(temporary, "remote.git");
  const repo = path.join(temporary, "repo");
  execFileSync("git", ["init", "--bare", remote], { stdio: "ignore" });
  execFileSync("git", ["init", repo], { stdio: "ignore" });
  git(repo, "config", "user.name", "Test User");
  git(repo, "config", "user.email", "test@example.invalid");
  await writeFile(path.join(repo, ".gitignore"), "workplace/\n", "utf8");
  await writeFile(path.join(repo, "README.md"), "base\n", "utf8");
  await writeFile(path.join(repo, "pom.xml"), "<project><version>1.20260725.3</version></project>\n", "utf8");
  git(repo, "add", ".gitignore", "README.md", "pom.xml");
  git(repo, "commit", "-m", "base");
  git(repo, "branch", "-M", "devel");
  git(repo, "remote", "add", "origin", remote);
  git(repo, "push", "-u", "origin", "devel");
  const branch = "devel-tiga0725jaa";
  git(repo, "switch", "-c", branch);
  await writeFile(path.join(repo, "feature.txt"), "feature\n", "utf8");
  git(repo, "add", "feature.txt");
  git(repo, "commit", "-m", "checkpoint");
  const oldHead = git(repo, "rev-parse", "HEAD");
  const draft = "workplace/miku-scm/pr-drafts/pr-devel-tiga0725jaa-202607252100.md";
  await mkdir(path.join(repo, path.dirname(draft)), { recursive: true });
  await writeFile(path.join(repo, draft), "One-shot recommit publish\n\nBody\n", "utf8");
  return { temporary, remote, repo, branch, draft, oldHead };
}

function options(state) {
  return parseArgs([
    "--repo", state.repo,
    "--base", "devel",
    "--pr-draft", state.draft,
    "--apply",
  ]);
}

const macos = {
  platform: "darwin",
  recommitDependencies: { now: () => new Date("2026-07-25T21:00:00+09:00") },
  publishDependencies: { gh: null },
};

test("parser requires an explicit base, PR draft, and apply authorization", () => {
  assert.throws(() => parseArgs([]), /--base is required/);
  assert.throws(() => parseArgs(["--base", "devel"]), /--pr-draft is required/);
  assert.throws(
    () => parseArgs(["--base", "devel", "--pr-draft", "draft.md"]),
    /requires --apply/,
  );
  assert.throws(
    () => parseArgs(["--base", "devel", "--pr-draft", "draft.md", "--remote", "bad/name", "--apply"]),
    /Git remote name/,
  );
});

test("one transition recommits, persists an exact publication plan, pushes, and freezes the branch", async (t) => {
  const state = await scenario(t);
  const result = await runRecommitPush(options(state), macos);

  assert.equal(result.status, "published");
  assert.equal(result.initial_remote_branch.state, "absent");
  assert.equal(result.push_mode, "new-branch");
  assert.equal(result.comparison, "0 0");
  assert.equal(git(state.repo, "rev-parse", "backup/2026-07-25-2100"), state.oldHead);
  assert.equal(git(state.repo, "log", "-1", "--format=%s"), "One-shot recommit publish");
  assert.equal(git(state.repo, "branch", "--show-current"), `${state.branch}-done`);
  assert.equal(git(state.remote, "rev-parse", `refs/heads/${state.branch}`), result.new_head);
  assert.match(result.plan_path, /^workplace\/miku-scm\/ok-push\/.*\.json$/);
  const attempt = JSON.parse(await readFile(path.join(state.repo, `${result.plan_path}.attempt.json`), "utf8"));
  assert.equal(attempt.status, "published");
});

test("a remote change after backup stops before push and leaves a candidate branch", async (t) => {
  const state = await scenario(t);
  const other = path.join(state.temporary, "other");
  let remoteHead = "";
  const recommit = (argumentsValue, dependencies) => {
    const result = runRecommit(argumentsValue, dependencies);
    if (argumentsValue.apply && result.status === "recommitted") {
      git(state.temporary, "clone", state.remote, other);
      git(other, "config", "user.name", "Other User");
      git(other, "config", "user.email", "other@example.invalid");
      git(other, "switch", "-c", state.branch, "origin/devel");
      execFileSync("git", ["-C", other, "commit", "--allow-empty", "-m", "remote change"], { stdio: "ignore" });
      git(other, "push", "origin", `HEAD:refs/heads/${state.branch}`);
      remoteHead = git(other, "rev-parse", "HEAD");
    }
    return result;
  };

  const result = await runRecommitPush(options(state), { ...macos, recommit });

  assert.equal(result.status, "partial");
  assert.equal(result.publication.status, "conflict");
  assert.equal(result.publication.stage, "publication-preflight");
  assert.match(result.publication.message, /Remote branch appeared/);
  assert.equal(git(state.repo, "branch", "--show-current"), state.branch);
  assert.equal(git(state.remote, "rev-parse", `refs/heads/${state.branch}`), remoteHead);
  assert.equal(git(state.repo, "rev-parse", "backup/2026-07-25-2100"), state.oldHead);
});

test("unsupported platforms stop before backup creation", async (t) => {
  const state = await scenario(t);
  await assert.rejects(
    runRecommitPush(options(state), { platform: "win32" }),
    (error) => error?.mutationInvoked === false && /macOS/.test(error.message),
  );
  assert.equal(git(state.repo, "branch", "--list", "backup/*"), "");
  assert.equal(git(state.remote, "branch", "--list", state.branch), "");
});
