import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  createGitRunner,
  cli,
  parseArgs,
  runPublish,
} from "../scripts/post-recommit-publish.mjs";
import { run as runNextWork } from "../scripts/post-merge-next-work.mjs";

const PUBLISH_SCRIPT = fileURLToPath(new URL("../scripts/post-recommit-publish.mjs", import.meta.url));

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

async function scenario(t, { existingRemoteBranch = false } = {}) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "miku-scm-publish-test-"));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const remote = path.join(temporary, "remote.git");
  const repo = path.join(temporary, "repo");
  execFileSync("git", ["init", "--bare", remote], { stdio: "ignore" });
  execFileSync("git", ["init", repo], { stdio: "ignore" });
  git(repo, "config", "user.name", "Test User");
  git(repo, "config", "user.email", "test@example.invalid");
  await writeFile(path.join(repo, "README.md"), "base\n", "utf8");
  await writeFile(path.join(repo, ".gitignore"), "workplace/\n", "utf8");
  await writeFile(path.join(repo, "pom.xml"), "<project><version>1.20260725.3</version></project>\n", "utf8");
  git(repo, "add", "README.md", ".gitignore", "pom.xml");
  git(repo, "commit", "-m", "base");
  git(repo, "branch", "-M", "devel");
  git(repo, "remote", "add", "origin", remote);
  git(repo, "push", "-u", "origin", "devel");
  const branch = "devel-tiga0721kaa";
  git(repo, "switch", "-c", branch);
  await writeFile(path.join(repo, "feature.txt"), "first\n", "utf8");
  git(repo, "add", "feature.txt");
  git(repo, "commit", "-m", "feature");

  let expectedRemoteHead = "";
  if (existingRemoteBranch) {
    git(repo, "push", "-u", "origin", `HEAD:refs/heads/${branch}`);
    expectedRemoteHead = git(repo, "rev-parse", "HEAD");
    await writeFile(path.join(repo, "feature.txt"), "recommitted\n", "utf8");
    git(repo, "add", "feature.txt");
    git(repo, "commit", "--amend", "-m", "feature recommitted");
  }

  return {
    temporary,
    remote,
    repo,
    branch,
    expectedHead: git(repo, "rev-parse", "HEAD"),
    expectedRemoteHead,
  };
}

function optionsFor(state, ...extra) {
  return parseArgs([
    "--repo",
    state.repo,
    "--expected-head",
    state.expectedHead,
    ...extra,
  ]);
}

const applyDependencies = { platform: "darwin", fetchImpl: null };

test("preflight is read-only and fixes the new-branch expectation", async (t) => {
  const state = await scenario(t);
  const before = git(state.repo, "show-ref");
  const result = await runPublish(optionsFor(state), applyDependencies);

  assert.equal(result.status, "preflight-ok");
  assert.deepEqual(result.remote_branch, { state: "absent" });
  assert.ok(result.apply_arguments.includes("--expect-new-remote-branch"));
  assert.equal(git(state.repo, "show-ref"), before);
  assert.equal(git(state.repo, "branch", "--show-current"), state.branch);
  assert.equal(git(state.remote, "branch", "--list", state.branch), "");
});

test("plan CLI modes require a fixed plan path and digest", () => {
  const plan = "workplace/miku-scm/ok-push/ok-push-devel-tiga0721kaa-123456789012-202607250900.json";
  const digest = "a".repeat(64);
  const options = parseArgs(["--apply-plan", plan, "--expected-plan-sha256", digest]);
  assert.equal(options.applyPlan, plan);
  assert.equal(options.expectedPlanSha256, digest);
  assert.throws(() => parseArgs(["--apply-plan", "../plan.json", "--expected-plan-sha256", digest]), /plan under/);
  assert.throws(() => parseArgs(["--expected-head", "a".repeat(40), "--save-plan", "--expect-new-remote-branch", "--apply"]), /save-plan/);
});

test("saved publication plan applies once and publishes the reviewed branch", async (t) => {
  const state = await scenario(t);
  const saved = JSON.parse(execFileSync(process.execPath, [PUBLISH_SCRIPT,
    "--repo", state.repo, "--expected-head", state.expectedHead, "--save-plan"], { encoding: "utf8" }));
  assert.match(saved.plan_path, /^workplace\/miku-scm\/ok-push\/.*\.json$/);
  assert.match(saved.plan_sha256, /^[0-9a-f]{64}$/);
  const published = JSON.parse(execFileSync(process.execPath, [PUBLISH_SCRIPT,
    "--repo", state.repo, "--apply-plan", saved.plan_path,
    "--expected-plan-sha256", saved.plan_sha256], { encoding: "utf8" }));
  assert.equal(published.status, "published");
  assert.equal(git(state.repo, "branch", "--show-current"), `${state.branch}-done`);
  assert.throws(() => execFileSync(process.execPath, [PUBLISH_SCRIPT,
    "--repo", state.repo, "--apply-plan", saved.plan_path,
    "--expected-plan-sha256", saved.plan_sha256], { encoding: "utf8", stdio: "pipe" }));
});

test("saved plan remains unconsumed when a pre-mutation environment check fails", async (t) => {
  const state = await scenario(t);
  const saved = JSON.parse(execFileSync(process.execPath, [PUBLISH_SCRIPT,
    "--repo", state.repo, "--expected-head", state.expectedHead, "--save-plan"], { encoding: "utf8" }));
  await assert.rejects(cli([
    "--repo", state.repo,
    "--apply-plan", saved.plan_path,
    "--expected-plan-sha256", saved.plan_sha256,
  ], {
    ...applyDependencies,
    beforeMutation: async () => {
      throw new Error("sandbox network denied before mutation");
    },
  }), /sandbox network denied/);
  await assert.rejects(
    readFile(path.join(state.repo, `${saved.plan_path}.attempt.json`), "utf8"),
    (error) => error?.code === "ENOENT",
  );
  assert.equal(git(state.repo, "branch", "--show-current"), state.branch);
  assert.equal(git(state.remote, "branch", "--list", state.branch), "");
});

test("post-merge helper creates the next work branch from refreshed devel", async (t) => {
  const state = await scenario(t);
  git(state.repo, "branch", "-m", state.branch, `${state.branch}-done`);
  const result = await runNextWork({ repo: state.repo, remote: "origin", base: "devel", confirmedMerged: true, apply: true }, {
    now: () => new Date("2026-07-25T08:45:00+09:00"),
  });
  assert.equal(result.status, "created");
  assert.equal(result.final_branch, "devel-tiga0725ief");
  assert.equal(result.comparison, "0 0");
  assert.equal(git(state.repo, "branch", "--show-current"), "devel-tiga0725ief");
});

test("content VERSION.md derives a v-prefixed tag and resets to a on a new date", async (t) => {
  const state = await scenario(t);
  await writeFile(path.join(state.repo, "VERSION.md"), "20260726a\n", "utf8");
  git(state.repo, "add", "VERSION.md");
  git(state.repo, "commit", "-m", "add content version");
  state.expectedHead = git(state.repo, "rev-parse", "HEAD");

  const result = await runPublish(
    optionsFor(state, "--expect-new-remote-branch", "--apply"),
    applyDependencies,
  );

  assert.equal(result.version, "20260726a");
  assert.equal(result.recommended_tag, "v20260726a");
});

test("post-merge helper derives a content VERSION.md tag after same-day overflow", async (t) => {
  const state = await scenario(t);
  await writeFile(path.join(state.repo, "VERSION.md"), "20260725aa\n", "utf8");
  git(state.repo, "add", "VERSION.md");
  git(state.repo, "commit", "-m", "add content version");
  git(state.repo, "push", "origin", "HEAD:devel");
  git(state.repo, "branch", "-m", state.branch, `${state.branch}-done`);

  const result = await runNextWork({ repo: state.repo, remote: "origin", base: "devel", confirmedMerged: true, apply: true }, {
    now: () => new Date("2026-07-25T08:45:00+09:00"),
  });

  assert.equal(result.version_source, "VERSION.md");
  assert.equal(result.version, "20260725aa");
  assert.equal(result.recommended_tag, "v20260725aa");
});

test("apply rejects a changed reviewed local HEAD before push", async (t) => {
  const state = await scenario(t);
  const wrongHead = "0".repeat(40);
  const options = parseArgs([
    "--repo", state.repo,
    "--expected-head", wrongHead,
    "--expect-new-remote-branch",
    "--apply",
  ]);

  await assert.rejects(runPublish(options, applyDependencies), /local HEAD changed/);
  assert.equal(git(state.remote, "branch", "--list", state.branch), "");
});

test("apply rejects a dirty worktree before push", async (t) => {
  const state = await scenario(t);
  await writeFile(path.join(state.repo, "dirty.txt"), "dirty\n", "utf8");

  await assert.rejects(
    runPublish(optionsFor(state, "--expect-new-remote-branch", "--apply"), applyDependencies),
    /dirty/,
  );
  assert.equal(git(state.remote, "branch", "--list", state.branch), "");
});

test("apply publishes a new branch and renames locally only after equality", async (t) => {
  const state = await scenario(t);
  const result = await runPublish(
    optionsFor(state, "--expect-new-remote-branch", "--apply"),
    applyDependencies,
  );

  assert.equal(result.push_mode, "new-branch");
  assert.equal(result.comparison, "0 0");
  assert.equal(result.recommended_tag, "unresolved");
  assert.equal(result.human_handoff, "PRとタグはgithub上で操作してください。");
  assert.equal(git(state.repo, "branch", "--show-current"), `${state.branch}-done`);
  assert.equal(git(state.remote, "rev-parse", `refs/heads/${state.branch}`), state.expectedHead);
});

test("apply uses the reviewed remote SHA as an explicit force-with-lease", async (t) => {
  const state = await scenario(t, { existingRemoteBranch: true });
  const calls = [];
  const realGit = createGitRunner();
  const recordingGit = (cwd, args, options) => {
    calls.push(args);
    return realGit(cwd, args, options);
  };
  const result = await runPublish(
    optionsFor(state, "--expected-remote-head", state.expectedRemoteHead, "--apply"),
    { ...applyDependencies, git: recordingGit },
  );

  const destination = `refs/heads/${state.branch}`;
  assert.equal(result.push_mode, "force-with-explicit-lease");
  assert.ok(calls.some((args) => args.includes(`--force-with-lease=${destination}:${state.expectedRemoteHead}`)));
  assert.ok(calls.some((args) => args.includes(`HEAD:${destination}`)));
  assert.ok(calls.every((args) => !args.includes("--force")));
  assert.equal(git(state.remote, "rev-parse", destination), state.expectedHead);
  assert.equal(git(state.repo, "branch", "--show-current"), `${state.branch}-done`);
});

test("apply stops when the remote SHA changed after preflight", async (t) => {
  const state = await scenario(t, { existingRemoteBranch: true });
  const preflight = await runPublish(optionsFor(state), applyDependencies);
  const reviewedRemoteHead = preflight.remote_branch.head;

  const other = path.join(state.temporary, "other");
  git(state.temporary, "clone", state.remote, other);
  git(other, "config", "user.name", "Other User");
  git(other, "config", "user.email", "other@example.invalid");
  git(other, "switch", state.branch);
  await writeFile(path.join(other, "other.txt"), "remote update\n", "utf8");
  git(other, "add", "other.txt");
  git(other, "commit", "-m", "remote update");
  git(other, "push", "origin", state.branch);
  const thirdPartyHead = git(other, "rev-parse", "HEAD");

  await assert.rejects(
    runPublish(
      optionsFor(state, "--expected-remote-head", reviewedRemoteHead, "--apply"),
      applyDependencies,
    ),
    /remote branch HEAD changed/,
  );
  assert.equal(git(state.remote, "rev-parse", `refs/heads/${state.branch}`), thirdPartyHead);
  assert.equal(git(state.repo, "branch", "--show-current"), state.branch);
});

test("apply stops before push when the completion branch already exists", async (t) => {
  const state = await scenario(t);
  git(state.repo, "branch", `${state.branch}-done`, "HEAD");

  await assert.rejects(
    runPublish(optionsFor(state, "--expect-new-remote-branch", "--apply"), applyDependencies),
    /already exists/,
  );
  assert.equal(git(state.remote, "branch", "--list", state.branch), "");
});

test("fetch failure prevents push and rename through an injectable Git runner", async (t) => {
  const state = await scenario(t);
  const realGit = createGitRunner();
  const failingGit = (cwd, args, options) => {
    if (args[0] === "fetch") throw new Error("injected fetch failure");
    return realGit(cwd, args, options);
  };

  await assert.rejects(
    runPublish(
      optionsFor(state, "--expect-new-remote-branch", "--apply"),
      { ...applyDependencies, git: failingGit },
    ),
    /injected fetch failure/,
  );
  assert.equal(git(state.remote, "branch", "--list", state.branch), "");
  assert.equal(git(state.repo, "branch", "--show-current"), state.branch);
});

test("push failure prevents publication and rename", async (t) => {
  const state = await scenario(t);
  const realGit = createGitRunner();
  const failingGit = (cwd, args, options) => {
    if (args[0] === "push") throw new Error("injected push failure");
    return realGit(cwd, args, options);
  };

  await assert.rejects(
    runPublish(
      optionsFor(state, "--expect-new-remote-branch", "--apply"),
      { ...applyDependencies, git: failingGit },
    ),
    /injected push failure/,
  );
  assert.equal(git(state.remote, "branch", "--list", state.branch), "");
  assert.equal(git(state.repo, "branch", "--show-current"), state.branch);
});

test("post-push fetch failure leaves the successfully pushed branch unrenamed", async (t) => {
  const state = await scenario(t);
  const realGit = createGitRunner();
  let fetchCount = 0;
  const failingGit = (cwd, args, options) => {
    if (args[0] === "fetch" && ++fetchCount === 2) {
      throw new Error("injected post-push fetch failure");
    }
    return realGit(cwd, args, options);
  };

  await assert.rejects(
    runPublish(
      optionsFor(state, "--expect-new-remote-branch", "--apply"),
      { ...applyDependencies, git: failingGit },
    ),
    /injected post-push fetch failure/,
  );
  assert.equal(git(state.remote, "rev-parse", `refs/heads/${state.branch}`), state.expectedHead);
  assert.equal(git(state.repo, "branch", "--show-current"), state.branch);
});

test("post-push mismatch prevents the local done rename", async (t) => {
  const state = await scenario(t);
  const realGit = createGitRunner();
  const mismatchingGit = (cwd, args, options) => {
    const result = realGit(cwd, args, options);
    if (args[0] === "rev-list" && args.includes("--left-right")) {
      return { ...result, stdout: "1\t0" };
    }
    return result;
  };

  await assert.rejects(
    runPublish(
      optionsFor(state, "--expect-new-remote-branch", "--apply"),
      { ...applyDependencies, git: mismatchingGit },
    ),
    /comparison failed/,
  );
  assert.equal(git(state.remote, "rev-parse", `refs/heads/${state.branch}`), state.expectedHead);
  assert.equal(git(state.repo, "branch", "--show-current"), state.branch);
});
