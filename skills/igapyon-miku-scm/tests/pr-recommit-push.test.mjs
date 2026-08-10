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
import { prepareWritingEvidence } from "../scripts/miku-scm-writing-prepare.mjs";

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

async function multiRemoteScenario(t) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "miku-scm-recommit-push-remote-test-"));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const origin = path.join(temporary, "origin.git");
  const upstream = path.join(temporary, "upstream.git");
  const repo = path.join(temporary, "repo");
  execFileSync("git", ["init", "--bare", origin], { stdio: "ignore" });
  execFileSync("git", ["init", "--bare", upstream], { stdio: "ignore" });
  execFileSync("git", ["init", repo], { stdio: "ignore" });
  git(repo, "config", "user.name", "Test User");
  git(repo, "config", "user.email", "test@example.invalid");
  await writeFile(path.join(repo, ".gitignore"), "workplace/\n", "utf8");
  await writeFile(path.join(repo, "README.md"), "origin base\n", "utf8");
  git(repo, "add", ".gitignore", "README.md");
  git(repo, "commit", "-m", "origin base");
  git(repo, "branch", "-M", "devel");
  git(repo, "remote", "add", "origin", origin);
  git(repo, "push", "-u", "origin", "devel");
  execFileSync("git", ["--git-dir", origin, "symbolic-ref", "HEAD", "refs/heads/devel"]);
  git(repo, "remote", "set-head", "origin", "devel");

  git(repo, "remote", "add", "upstream", upstream);
  await writeFile(path.join(repo, "README.md"), "upstream base\n", "utf8");
  git(repo, "add", "README.md");
  git(repo, "commit", "-m", "upstream base");
  git(repo, "push", "-u", "upstream", "devel");
  const upstreamHead = git(repo, "rev-parse", "HEAD");
  execFileSync("git", ["--git-dir", upstream, "symbolic-ref", "HEAD", "refs/heads/devel"]);
  git(repo, "remote", "set-head", "upstream", "devel");

  const branch = "devel-tiga0725jaa";
  git(repo, "switch", "-c", branch);
  await writeFile(path.join(repo, "feature.txt"), "feature\n", "utf8");
  git(repo, "add", "feature.txt");
  git(repo, "commit", "-m", "checkpoint");
  const oldHead = git(repo, "rev-parse", "HEAD");
  const draft = "workplace/miku-scm/pr-drafts/pr-devel-tiga0725jaa-202607252100.md";
  await mkdir(path.join(repo, path.dirname(draft)), { recursive: true });
  await writeFile(path.join(repo, draft), "Upstream-only recommit publish\n\nBody\n", "utf8");
  return { origin, upstream, repo, branch, draft, oldHead, upstreamHead };
}

function automaticOptions(state) {
  return parseArgs([
    "--repo", state.repo,
    "--apply",
  ]);
}

const macos = {
  platform: "darwin",
  recommitDependencies: { now: () => new Date("2026-07-25T21:00:00+09:00") },
  publishDependencies: { gh: null },
};

test("parser permits automatic base and reviewed-draft resolution but requires apply", () => {
  const automatic = parseArgs(["--apply"]);
  assert.equal(automatic.base, "");
  assert.equal(automatic.prDraft, "");
  assert.throws(
    () => parseArgs([]),
    /requires --apply/,
  );
  assert.throws(
    () => parseArgs(["--base", "devel", "--pr-draft", "draft.md", "--remote", "bad/name", "--apply"]),
    /Git remote name/,
  );
});

test("one transition recommits, persists an exact publication plan, pushes, and freezes the branch", async (t) => {
  const state = await scenario(t);
  const calls = [];
  const recommit = (argumentsValue, dependencies) => {
    calls.push(argumentsValue);
    return runRecommit(argumentsValue, dependencies);
  };
  const result = await runRecommitPush(automaticOptions(state), { ...macos, recommit });

  assert.equal(result.status, "published");
  assert.equal(result.base, "origin/devel");
  assert.equal(result.pr_draft, state.draft);
  assert.deepEqual(calls.map((entry) => entry.base), ["", "origin/devel"]);
  assert.deepEqual(calls.map((entry) => entry.prDraft), ["", state.draft]);
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

  const result = await runRecommitPush(automaticOptions(state), { ...macos, recommit });

  assert.equal(result.status, "partial");
  assert.equal(result.publication.status, "conflict");
  assert.equal(result.publication.stage, "publication-preflight");
  assert.match(result.publication.message, /Remote branch appeared/);
  assert.equal(git(state.repo, "branch", "--show-current"), state.branch);
  assert.equal(git(state.remote, "rev-parse", `refs/heads/${state.branch}`), remoteHead);
  assert.equal(git(state.repo, "rev-parse", "backup/2026-07-25-2100"), state.oldHead);
});

test("automatic resolution stops before backup when no reviewed draft matches the branch", async (t) => {
  const state = await scenario(t);
  await rm(path.join(state.repo, state.draft));

  const result = await runRecommitPush(automaticOptions(state), macos);

  assert.equal(result.status, "not-applied");
  assert.equal(result.base, "origin/devel");
  assert.equal(result.pr_draft, null);
  assert.match(result.pr_draft_status, /No PR draft candidate/);
  assert.equal(result.mutation_invoked, false);
  assert.equal(git(state.repo, "branch", "--list", "backup/*"), "");
  assert.equal(git(state.remote, "branch", "--list", state.branch), "");
});

test("prepared evidence and its suggested draft path complete the missing-draft route", async (t) => {
  const state = await scenario(t);
  await rm(path.join(state.repo, state.draft));
  const preflight = runRecommit({ repo: state.repo, base: "", prDraft: "", apply: false });
  assert.deepEqual(preflight.blockers, ["PR draft is unresolved or missing"]);

  const evidence = await prepareWritingEvidence({
    mode: "pr",
    repo: state.repo,
    target: `${preflight.base}..HEAD`,
    githubRepository: "",
    issue: null,
  }, { now: () => new Date("2026-07-25T21:00:00+09:00") });
  assert.equal(evidence.target.resolved_log_target, `${preflight.base}..HEAD`);
  assert.match(evidence.suggested_draft_path, /^workplace\/miku-scm\/pr-drafts\/pr-devel-tiga0725jaa-202607252100\.md$/);
  await mkdir(path.join(state.repo, path.dirname(evidence.suggested_draft_path)), { recursive: true });
  await writeFile(
    path.join(state.repo, evidence.suggested_draft_path),
    "Prepared recommit publication\n\n## Changes\n\n- Complete the tested range.\n",
    "utf8",
  );

  const result = await runRecommitPush(parseArgs([
    "--repo", state.repo,
    "--base", preflight.base,
    "--pr-draft", evidence.suggested_draft_path,
    "--apply",
  ]), macos);

  assert.equal(result.status, "published");
  assert.equal(result.pr_draft, evidence.suggested_draft_path);
  assert.equal(result.comparison, "0 0");
  assert.equal(git(state.repo, "branch", "--show-current"), `${state.branch}-done`);
});

test("the selected remote controls both automatic base resolution and publication", async (t) => {
  const state = await multiRemoteScenario(t);

  const result = await runRecommitPush(parseArgs([
    "--repo", state.repo,
    "--remote", "upstream",
    "--apply",
  ]), macos);

  assert.equal(result.status, "published");
  assert.equal(result.base, "upstream/devel");
  assert.equal(result.base_commit, state.upstreamHead);
  assert.equal(git(state.upstream, "rev-parse", `refs/heads/${state.branch}`), result.new_head);
  assert.equal(git(state.origin, "branch", "--list", state.branch), "");
  assert.equal(git(state.repo, "branch", "--show-current"), `${state.branch}-done`);
});

test("unsupported platforms stop before backup creation", async (t) => {
  const state = await scenario(t);
  await assert.rejects(
    runRecommitPush(automaticOptions(state), { platform: "win32" }),
    (error) => error?.mutationInvoked === false && /macOS/.test(error.message),
  );
  assert.equal(git(state.repo, "branch", "--list", "backup/*"), "");
  assert.equal(git(state.remote, "branch", "--list", state.branch), "");
});
