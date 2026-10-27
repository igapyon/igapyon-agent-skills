import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  createGitRunner,
  cli,
  executePublish,
  parseArgs,
  resolvePrHandoff,
  runPublish,
} from "../scripts/post-recommit-publish.mjs";
import {
  classifyTagLookup,
  prepareNextWorkBranch,
  run as runNextWork,
} from "../scripts/post-merge-next-work.mjs";
import { runWorkflow } from "../scripts/miku-scm-run.mjs";

const PUBLISH_SCRIPT = fileURLToPath(new URL("../scripts/post-recommit-publish.mjs", import.meta.url));

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function recordedGit(calls) {
  return (cwd, args, allowFailure = false) => {
    calls.push(args);
    const result = spawnSync("git", args, { cwd, encoding: "utf8" });
    const output = { ok: result.status === 0, out: (result.stdout || "").trim(), err: (result.stderr || "").trim() };
    if (!output.ok && !allowFailure) throw new Error(`git ${args.join(" ")} failed: ${output.err || output.out}`);
    return output;
  };
}

const NEXT_WORK_DATE = new Date("2026-07-25T08:45:00+09:00");

async function mergedScenario(t) {
  const state = await scenario(t);
  git(state.repo, "push", "origin", "HEAD:devel");
  git(state.repo, "branch", "-m", `${state.branch}-done`);
  return state;
}

function nextWorkOptions(state) {
  return { repo: state.repo, remote: "origin", base: "devel", confirmedMerged: true, apply: true };
}

async function scenario(t, { existingRemoteBranch = false } = {}) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "miku-scm-publish-test-"));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const remote = path.join(temporary, "remote.git");
  const repo = path.join(temporary, "repo");
  execFileSync("git", ["init", "--bare", remote], { stdio: "ignore" });
  execFileSync("git", ["init", repo], { stdio: "ignore" });
  git(repo, "config", "core.autocrlf", "false");
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
const windowsApplyDependencies = { platform: "win32", gh: null };
const nativeApplyDependencies = {
  platform: process.platform,
  gh: null,
};

test("post-merge tag lookup keeps all advisory states distinct", () => {
  const base = "a".repeat(40);
  const other = "b".repeat(40);
  assert.deepEqual(classifyTagLookup("unresolved", null, base), {
    tag_target: null,
    tag_status: "unresolved",
  });
  assert.deepEqual(classifyTagLookup("v20260728f", { ok: true, out: "" }, base), {
    tag_target: null,
    tag_status: "absent",
  });
  assert.deepEqual(classifyTagLookup("v20260728f", {
    ok: false,
    out: "",
    err: "remote unavailable",
  }, base), {
    tag_target: null,
    tag_status: "lookup-failed",
    tag_lookup_warning: "remote unavailable",
  });
  assert.deepEqual(classifyTagLookup("v20260728f", {
    ok: true,
    out: `${base}\trefs/tags/v20260728f`,
  }, base), {
    tag_target: base,
    tag_status: "confirmed",
  });
  assert.deepEqual(classifyTagLookup("v20260728f", {
    ok: true,
    out: `${other}\trefs/tags/v20260728f`,
  }, base), {
    tag_target: other,
    tag_status: "mismatch",
  });
});

test("PR handoff resolves GitHub URL results and deterministic fallbacks", () => {
  const repository = {
    owner: "igapyon",
    repository: "example",
    url: "https://github.com/igapyon/example",
  };
  const branch = "devel-test";
  const creationUrl = "https://github.com/igapyon/example/pull/new/devel-test";
  const expectedArgs = [
    "pr", "list", "--repo", "igapyon/example",
    "--head", branch, "--state", "open", "--limit", "100", "--json", "url",
  ];
  const gh = (payload) => {
    assert.deepEqual(payload, expectedArgs);
    return {
      ok: true,
      stdout: JSON.stringify([{ url: "https://github.com/igapyon/example/pull/7" }]),
    };
  };

  assert.deepEqual(resolvePrHandoff(repository, branch, gh), {
    repository_url: repository.url,
    pr_url: "https://github.com/igapyon/example/pull/7",
    pr_lookup: "confirmed",
  });
  assert.deepEqual(resolvePrHandoff(repository, branch, () => ({ ok: true, stdout: "[]" })), {
    repository_url: repository.url,
    pr_creation_url: creationUrl,
    pr_lookup: "confirmed-none",
  });
  assert.deepEqual(resolvePrHandoff(repository, branch, () => ({
    ok: true,
    stdout: JSON.stringify([
      { url: "https://github.com/igapyon/example/pull/7" },
      { url: "https://github.com/igapyon/example/pull/8" },
    ]),
  })), {
    repository_url: repository.url,
    pr_urls: [
      "https://github.com/igapyon/example/pull/7",
      "https://github.com/igapyon/example/pull/8",
    ],
    pr_lookup: "ambiguous",
  });

  const failed = resolvePrHandoff(repository, branch, () => ({ ok: false, stderr: "offline" }));
  assert.equal(failed.pr_lookup, "unconfirmed");
  assert.equal(failed.pr_creation_url, creationUrl);
  assert.equal(failed.pr_lookup_warning, "offline");

  const malformed = resolvePrHandoff(repository, branch, () => ({
    ok: true,
    stdout: JSON.stringify([{}]),
  }));
  assert.equal(malformed.pr_lookup, "unconfirmed");
  assert.equal(malformed.pr_creation_url, creationUrl);
  assert.match(malformed.pr_lookup_warning, /malformed PR URL metadata/);

  assert.deepEqual(resolvePrHandoff(null, branch, gh), {
    repository_url: "unresolved",
    pr_url: "unresolved",
    pr_lookup: "unresolved",
  });
});

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
  assert.equal(saved.publication_plan.workflow_contract, "pr.publish.apply");
  assert.equal(saved.publication_plan.contract_version, 1);
  assert.match(saved.publication_plan.contract_pair_sha256, /^[0-9a-f]{64}$/);
  const published = JSON.parse(execFileSync(process.execPath, [PUBLISH_SCRIPT,
    "--repo", state.repo, "--apply-plan", saved.plan_path,
    "--expected-plan-sha256", saved.plan_sha256], { encoding: "utf8" }));
  assert.equal(published.status, "published");
  assert.equal(git(state.repo, "branch", "--show-current"), `${state.branch}-done`);
  assert.throws(() => execFileSync(process.execPath, [PUBLISH_SCRIPT,
    "--repo", state.repo, "--apply-plan", saved.plan_path,
    "--expected-plan-sha256", saved.plan_sha256], { encoding: "utf8", stdio: "pipe" }));
});

test("saved publication plan stops before mutation when its workflow contract changed", async (t) => {
  const state = await scenario(t);
  const saved = JSON.parse(execFileSync(process.execPath, [PUBLISH_SCRIPT,
    "--repo", state.repo, "--expected-head", state.expectedHead, "--save-plan"], { encoding: "utf8" }));
  const planFile = path.join(state.repo, saved.plan_path);
  const plan = JSON.parse(await readFile(planFile, "utf8"));
  plan.contract_pair_sha256 = "0".repeat(64);
  const changed = `${JSON.stringify(plan, null, 2)}\n`;
  await writeFile(planFile, changed, "utf8");
  const changedDigest = createHash("sha256").update(changed).digest("hex");

  await assert.rejects(
    executePublish(parseArgs([
      "--repo", state.repo,
      "--apply-plan", saved.plan_path,
      "--expected-plan-sha256", changedDigest,
    ]), applyDependencies),
    (error) => error?.mutationInvoked === false && /workflow contract changed/.test(error.message),
  );
  assert.equal(git(state.remote, "branch", "--list", state.branch), "");
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

test("programmatic publication marks a pre-mutation failure as not invoked", async (t) => {
  const state = await scenario(t);
  const saved = JSON.parse(execFileSync(process.execPath, [PUBLISH_SCRIPT,
    "--repo", state.repo, "--expected-head", state.expectedHead, "--save-plan"], { encoding: "utf8" }));
  const options = parseArgs([
    "--repo", state.repo,
    "--apply-plan", saved.plan_path,
    "--expected-plan-sha256", saved.plan_sha256,
  ]);
  await assert.rejects(
    executePublish(options, {
      ...applyDependencies,
      beforeMutation: async () => {
        throw new Error("sandbox network denied before mutation");
      },
    }),
    (error) => error?.mutationInvoked === false
      && /sandbox network denied/.test(error.message),
  );
  await assert.rejects(
    readFile(path.join(state.repo, `${saved.plan_path}.attempt.json`), "utf8"),
    (error) => error?.code === "ENOENT",
  );
});

test("programmatic publication marks plan-load failure as not invoked", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "miku-scm-missing-plan-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const options = parseArgs([
    "--repo", root,
    "--apply-plan", "workplace/miku-scm/ok-push/missing.json",
    "--expected-plan-sha256", "d".repeat(64),
  ]);
  await assert.rejects(
    executePublish(options, applyDependencies),
    (error) => error?.mutationInvoked === false,
  );
});

test("post-merge helper creates the next work branch from refreshed devel", async (t) => {
  const state = await scenario(t);
  git(state.repo, "config", "branch.autoSetupMerge", "true");
  git(state.repo, "config", "core.hooksPath", path.join(state.repo, ".git/hooks"));
  await writeFile(path.join(state.repo, ".git/hooks/post-checkout"), "#!/bin/sh\ngit rev-parse --symbolic-full-name '@{upstream}' > .git/checkout-upstream\n", { mode: 0o755 });
  git(state.repo, "branch", "-m", state.branch, `${state.branch}-done`);
  const result = await runNextWork({ repo: state.repo, remote: "origin", base: "devel", confirmedMerged: true, apply: true }, {
    now: () => new Date("2026-07-25T08:45:00+09:00"),
  });
  assert.equal(result.status, "created");
  assert.equal(result.final_branch, "devel-tiga0725ief");
  assert.equal(result.comparison, "0 0");
  assert.equal(result.tag_status, "absent");
  assert.equal(result.human_handoff, "Next work branch is ready: devel-tiga0725ief");
  assert.equal(git(state.repo, "branch", "--show-current"), "devel-tiga0725ief");
  assert.equal(git(state.repo, "rev-parse", "--symbolic-full-name", "@{upstream}"), "refs/remotes/origin/devel");
  assert.equal(git(state.repo, "status", "-sb"), "## devel-tiga0725ief...origin/devel");
  assert.equal((await readFile(path.join(state.repo, ".git/checkout-upstream"), "utf8")).trim(), "refs/remotes/origin/devel");
});

test("post-merge helper tracks the selected remote and base", async (t) => {
  const state = await mergedScenario(t);
  git(state.repo, "config", "branch.autoSetupMerge", "true");
  git(state.repo, "remote", "rename", "origin", "shared");
  git(state.repo, "push", "shared", "HEAD:release");
  const result = await runNextWork({ ...nextWorkOptions(state), remote: "shared", base: "release" }, {
    now: () => NEXT_WORK_DATE,
  });
  assert.equal(result.status, "created");
  assert.equal(result.base_commit, state.expectedHead);
  assert.equal(result.final_branch, "release-tiga0725ief");
  assert.equal(git(state.repo, "rev-parse", "HEAD"), state.expectedHead);
  assert.equal(git(state.repo, "rev-parse", "--symbolic-full-name", "@{upstream}"), "refs/remotes/shared/release");
  assert.equal(git(state.repo, "status", "-sb"), "## release-tiga0725ief...shared/release");
});

test("post-merge branch preparation preserves native Git tracking and rebase policies", async (t) => {
  for (const merge of ["true", "false", "inherit", "simple", "always"]) {
    for (const rebase of ["never", "remote"]) {
      const state = await scenario(t);
      git(state.repo, "config", "branch.autoSetupMerge", merge);
      git(state.repo, "config", "branch.autoSetupRebase", rebase);
      const base = git(state.repo, "rev-parse", "origin/devel");
      git(state.repo, "branch", "control", "origin/devel");
      const result = prepareNextWorkBranch(state.repo, "candidate", base, "refs/remotes/origin/devel");
      const config = (name) => (spawnSync("git", ["config", "--local", "--get-regexp", `^branch\\.${name}\\.`], { cwd: state.repo, encoding: "utf8" }).stdout || "")
        .replaceAll(`branch.${name}.`, "branch.NEXT.").trim().split("\n").sort();
      assert.deepEqual(config("candidate"), config("control"), `${merge}/${rebase}`);
      assert.equal(result.upstream, git(state.repo, "for-each-ref", "--format=%(upstream)", "refs/heads/control"));
      assert.equal(git(state.repo, "rev-parse", "candidate"), base);
      assert.equal(git(state.repo, "branch", "--show-current"), state.branch);
    }
  }
});

test("post-merge branch preparation stops before checkout if the shared ref moves", async (t) => {
  const state = await scenario(t);
  const base = git(state.repo, "rev-parse", "origin/devel");
  const calls = []; const localGit = recordedGit(calls);
  assert.throws(() => prepareNextWorkBranch(state.repo, "candidate", base, "refs/remotes/origin/devel", (cwd, args, allowFailure) => {
    if (args[0] === "branch" && args[1] === "candidate") git(state.repo, "update-ref", "refs/remotes/origin/devel", state.expectedHead);
    return localGit(cwd, args, allowFailure);
  }), /pinned base/);
  assert.equal(git(state.repo, "branch", "--show-current"), state.branch);
  assert.ok(!calls.some((args) => args[0] === "switch"));
});

test("post-merge carries unstaged edits, deletions and new files while retaining both new and existing stashes", async (t) => {
  const state = await mergedScenario(t);
  await writeFile(path.join(state.repo, "README.md"), "older stash\n");
  git(state.repo, "stash", "push", "-m", "existing stash");
  const olderStash = git(state.repo, "rev-parse", "refs/stash");
  await writeFile(path.join(state.repo, "README.md"), "next work\n");
  await rm(path.join(state.repo, "feature.txt"));
  const bytes = Buffer.from([0, 255, 13, 10, 128]);
  await writeFile(path.join(state.repo, "new file.bin"), bytes);
  const calls = [];

  const result = await runNextWork(nextWorkOptions(state), {
    now: () => NEXT_WORK_DATE,
    git: recordedGit(calls),
  });

  assert.equal(result.final_branch, "devel-tiga0725ief");
  assert.equal(result.base_commit, state.expectedHead);
  assert.equal(result.comparison, "0 0");
  assert.equal(await readFile(path.join(state.repo, "README.md"), "utf8"), "next work\n");
  await assert.rejects(readFile(path.join(state.repo, "feature.txt")), { code: "ENOENT" });
  assert.deepEqual(await readFile(path.join(state.repo, "new file.bin")), bytes);
  assert.equal(git(state.repo, "diff", "--cached", "--name-only"), "");
  assert.match(git(state.repo, "status", "--porcelain"), /\?\? "new file.bin"/);
  assert.deepEqual(result.carryover, {
    stash_sha: git(state.repo, "rev-parse", "refs/stash"),
    stash_retained: true,
    restore_status: "restored",
    working_tree: "dirty",
  });
  assert.notEqual(result.carryover.stash_sha, olderStash);
  assert.deepEqual(git(state.repo, "stash", "list", "--format=%H").split("\n"), [result.carryover.stash_sha, olderStash]);
  assert.ok(calls.some((args) => args[0] === "stash" && args[1] === "push" && args.includes("--include-untracked")));
  assert.deepEqual(calls.filter((args) => args[0] === "stash" && args[1] === "apply"), [["stash", "apply", result.carryover.stash_sha]]);
  assert.ok(!calls.some((args) => args[0] === "stash" && ["pop", "drop", "clear"].includes(args[1])));
});

test("post-merge carries untracked-only work through the runner and reports the retained stash", async (t) => {
  const state = await mergedScenario(t);
  await writeFile(path.join(state.repo, "new.txt"), "new work\n");
  const result = await runWorkflow("repository.post-merge.next-work", [
    "--repo", state.repo, "--confirmed-merged", "--apply",
  ], {
    cwd: state.repo,
    artifactRoot: path.join(state.temporary, "runs"),
    runId: "carryover-success",
    postMergeDependencies: { now: () => NEXT_WORK_DATE },
  });

  assert.equal(result.status, "success");
  assert.equal(result.mutation_invoked, true);
  assert.equal(await readFile(path.join(state.repo, "new.txt"), "utf8"), "new work\n");
  assert.equal(git(state.repo, "status", "--porcelain"), "?? new.txt");
  assert.match(result.human_output, new RegExp(`Carryover stash: ${result.result.carryover.stash_sha}`));
  assert.match(result.human_output, /Stash retained: yes\nRestore status: restored\nWorking tree: dirty/);
  const saved = JSON.parse(await readFile(path.join(state.temporary, "runs", "carryover-success", "result.json"), "utf8"));
  assert.deepEqual(saved.result.carryover, result.result.carryover);
});

test("post-merge staged changes stop before stash or branch creation", async (t) => {
  const state = await mergedScenario(t);
  await writeFile(path.join(state.repo, "README.md"), "staged\n");
  git(state.repo, "add", "README.md");
  await writeFile(path.join(state.repo, "README.md"), "unstaged too\n");
  const status = git(state.repo, "status", "--porcelain");
  const calls = [];
  await assert.rejects(runNextWork(nextWorkOptions(state), { git: recordedGit(calls), now: () => NEXT_WORK_DATE }),
    (error) => error.mutationInvoked === false && /staged changes/.test(error.message));
  assert.equal(git(state.repo, "status", "--porcelain"), status);
  assert.equal(git(state.repo, "branch", "--show-current"), `${state.branch}-done`);
  assert.ok(!calls.some((args) => ["stash", "switch", "fetch"].includes(args[0])));
});

test("post-merge a next-branch collision preserves unstaged work without creating a stash", async (t) => {
  const state = await mergedScenario(t);
  git(state.repo, "branch", "devel-tiga0725ief");
  await writeFile(path.join(state.repo, "README.md"), "uncommitted\n");
  const calls = [];
  await assert.rejects(runNextWork(nextWorkOptions(state), { git: recordedGit(calls), now: () => NEXT_WORK_DATE }),
    (error) => error.mutationInvoked === false && /already exists/.test(error.message));
  assert.equal(await readFile(path.join(state.repo, "README.md"), "utf8"), "uncommitted\n");
  assert.equal(git(state.repo, "branch", "--show-current"), `${state.branch}-done`);
  assert.ok(!calls.some((args) => ["stash", "switch"].includes(args[0])));
});

test("post-merge fetch failure leaves unstaged work and the done branch untouched", async (t) => {
  const state = await mergedScenario(t);
  git(state.repo, "remote", "set-url", "origin", path.join(state.temporary, "missing-remote.git"));
  await writeFile(path.join(state.repo, "README.md"), "remain here\n");
  const calls = [];
  await assert.rejects(runNextWork(nextWorkOptions(state), { git: recordedGit(calls), now: () => NEXT_WORK_DATE }),
    (error) => error.mutationInvoked === false && /git fetch/.test(error.message));
  assert.equal(await readFile(path.join(state.repo, "README.md"), "utf8"), "remain here\n");
  assert.equal(git(state.repo, "branch", "--show-current"), `${state.branch}-done`);
  assert.ok(!calls.some((args) => ["stash", "switch"].includes(args[0])));
});

test("post-merge a missing new stash never falls back to an existing stash", async (t) => {
  const state = await mergedScenario(t);
  await writeFile(path.join(state.repo, "README.md"), "older work\n");
  git(state.repo, "stash", "push", "-m", "existing stash");
  const existing = git(state.repo, "rev-parse", "refs/stash");
  await writeFile(path.join(state.repo, "README.md"), "new work\n");
  const calls = [];
  const localGit = recordedGit(calls);
  let failure;
  await assert.rejects(runNextWork(nextWorkOptions(state), {
    now: () => NEXT_WORK_DATE,
    git: (cwd, args, allowFailure) => {
      if (args[0] === "stash" && args[1] === "push") {
        calls.push(args);
        return { ok: true, out: "No local changes to save", err: "" };
      }
      return localGit(cwd, args, allowFailure);
    },
  }), (error) => { failure = error; return /stash creation failed/.test(error.message); });
  assert.equal(failure.recovery.stash_sha, null);
  assert.equal(git(state.repo, "rev-parse", "refs/stash"), existing);
  assert.equal(await readFile(path.join(state.repo, "README.md"), "utf8"), "new work\n");
  assert.ok(!calls.some((args) => args[0] === "switch" || (args[0] === "stash" && ["apply", "pop", "drop"].includes(args[1]))));
});

test("post-merge branch-creation failure retains the exact stash without applying or dropping it", async (t) => {
  const state = await mergedScenario(t);
  await writeFile(path.join(state.repo, "README.md"), "preserve me\n");
  const calls = [];
  const localGit = recordedGit(calls);
  let failure;
  await assert.rejects(runNextWork(nextWorkOptions(state), {
    now: () => NEXT_WORK_DATE,
    git: (cwd, args, allowFailure) => {
      if (args[0] === "switch") { calls.push(args); throw new Error("git switch failed: injected failure"); }
      return localGit(cwd, args, allowFailure);
    },
  }), (error) => { failure = error; return error.mutationInvoked === true; });
  assert.equal(failure.recovery.stage, "branch-create");
  assert.equal(failure.recovery.final_branch, `${state.branch}-done`);
  assert.equal(failure.recovery.stash_retained, true);
  assert.equal(failure.recovery.restore_status, "not-started");
  assert.equal(failure.recovery.working_tree, "clean");
  assert.equal(git(state.repo, "show", `${failure.recovery.stash_sha}:README.md`), "preserve me");
  assert.equal(calls.filter((args) => args[0] === "switch").length, 1);
  assert.ok(!calls.some((args) => args[0] === "stash" && ["apply", "pop", "drop"].includes(args[1])));
});

test("post-merge a partially failed stash creation reports the created stash and stops before switching", async (t) => {
  const state = await mergedScenario(t);
  await writeFile(path.join(state.repo, "new.txt"), "preserve new file\n");
  const calls = [];
  const localGit = recordedGit(calls);
  let failure;
  await assert.rejects(runNextWork(nextWorkOptions(state), {
    now: () => NEXT_WORK_DATE,
    git: (cwd, args, allowFailure) => {
      const output = localGit(cwd, args, allowFailure);
      return args[0] === "stash" && args[1] === "push" ? { ...output, ok: false, err: "injected partial failure" } : output;
    },
  }), (error) => { failure = error; return /stash creation failed/.test(error.message); });
  assert.equal(failure.mutationInvoked, true);
  assert.equal(failure.recovery.stage, "stash-create");
  assert.equal(failure.recovery.stash_retained, true);
  assert.equal(git(state.repo, "show", `${failure.recovery.stash_sha}^3:new.txt`), "preserve new file");
  assert.ok(!calls.some((args) => args[0] === "switch"));
});

test("post-merge restore conflict preserves the stash and reports recoverable partial state through the runner", async (t) => {
  const state = await mergedScenario(t);
  await writeFile(path.join(state.repo, "README.md"), "upstream edit\n");
  git(state.repo, "add", "README.md");
  git(state.repo, "commit", "-m", "upstream edit");
  const baseHead = git(state.repo, "rev-parse", "HEAD");
  git(state.repo, "push", "origin", "HEAD:devel");
  // Recreate the frozen PR branch at its original HEAD, then add follow-up work.
  git(state.repo, "switch", "--detach", state.expectedHead);
  git(state.repo, "branch", "-f", `${state.branch}-done`, state.expectedHead);
  git(state.repo, "switch", `${state.branch}-done`);
  await writeFile(path.join(state.repo, "README.md"), "local follow-up\n");
  const calls = [];
  const result = await runWorkflow("repository.post-merge.next-work", [
    "--repo", state.repo, "--confirmed-merged", "--apply",
  ], {
    cwd: state.repo,
    artifactRoot: path.join(state.temporary, "runs"),
    runId: "carryover-conflict",
    postMergeDependencies: { git: recordedGit(calls), now: () => NEXT_WORK_DATE },
  });

  assert.equal(result.status, "unresolved");
  assert.equal(result.mutation_invoked, true);
  assert.equal(result.error.retryability, "do-not-retry");
  assert.equal(result.error.recovery.stage, "stash-apply");
  assert.equal(result.error.recovery.final_branch, "devel-tiga0725ief");
  assert.equal(result.error.recovery.restore_status, "failed");
  assert.equal(result.error.recovery.stash_retained, true);
  assert.equal(git(state.repo, "rev-parse", "HEAD"), baseHead);
  assert.equal(git(state.repo, "show", `${result.error.recovery.stash_sha}:README.md`), "local follow-up");
  assert.equal(git(state.repo, "status", "--porcelain"), "UU README.md");
  assert.equal(calls.filter((args) => args[0] === "stash" && args[1] === "apply").length, 1);
  assert.ok(!calls.some((args) => args[0] === "reset" || (args[0] === "stash" && ["pop", "drop", "clear"].includes(args[1]))));
  assert.match(result.human_output, /Stopped stage: stash-apply/);
  assert.match(result.human_output, /Stash retained: yes\nRestore status: failed\nWorking tree: dirty/);
  assert.doesNotMatch(result.human_output, /Next work branch is ready/);
  const saved = JSON.parse(await readFile(path.join(state.temporary, "runs", "carryover-conflict", "result.json"), "utf8"));
  assert.deepEqual(saved.error.recovery, result.error.recovery);
  const attempt = JSON.parse(await readFile(path.join(state.temporary, "runs", "carryover-conflict", "attempt.json"), "utf8"));
  assert.equal(attempt.status, "unresolved");
});

test("post-merge an untracked path collision retains the original file in the stash", async (t) => {
  const state = await mergedScenario(t);
  await writeFile(path.join(state.repo, "new.txt"), "upstream file\n");
  git(state.repo, "add", "new.txt");
  git(state.repo, "commit", "-m", "upstream new file");
  git(state.repo, "push", "origin", "HEAD:devel");
  git(state.repo, "switch", "--detach", state.expectedHead);
  git(state.repo, "branch", "-f", `${state.branch}-done`, state.expectedHead);
  git(state.repo, "switch", `${state.branch}-done`);
  await writeFile(path.join(state.repo, "new.txt"), "local new file\n");
  let failure;
  await assert.rejects(runNextWork(nextWorkOptions(state), { now: () => NEXT_WORK_DATE }),
    (error) => { failure = error; return /stash apply failed/.test(error.message); });
  assert.equal(failure.recovery.stash_retained, true);
  assert.equal(failure.recovery.final_branch, "devel-tiga0725ief");
  assert.equal(git(state.repo, "show", `${failure.recovery.stash_sha}^3:new.txt`), "local new file");
  assert.equal(await readFile(path.join(state.repo, "new.txt"), "utf8"), "upstream file\n");
});

test("post-merge helper uses remote HEAD for a legacy done branch with a feature upstream", async (t) => {
  const state = await scenario(t);
  const legacy = "tiga0501xea";
  git(state.repo, "branch", "-m", state.branch, legacy);
  git(state.repo, "push", "-u", "origin", `HEAD:refs/heads/${legacy}`);
  git(state.repo, "push", "origin", "HEAD:refs/heads/devel");
  git(state.repo, "remote", "set-head", "origin", "devel");
  git(state.repo, "branch", "-m", legacy, `${legacy}-done`);
  assert.equal(git(state.repo, "rev-parse", "--abbrev-ref", "@{upstream}"), `origin/${legacy}`);

  const result = await runNextWork({
    repo: state.repo,
    remote: "origin",
    base: "",
    confirmedMerged: true,
    apply: true,
  }, {
    now: () => new Date("2026-08-09T13:18:00+09:00"),
  });

  assert.equal(result.status, "created");
  assert.equal(result.previous_branch, `${legacy}-done`);
  assert.equal(result.base, "devel");
  assert.equal(result.final_branch, "devel-tiga0809nbi");
  assert.equal(result.comparison, "0 0");
  assert.equal(git(state.repo, "branch", "--show-current"), "devel-tiga0809nbi");
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
  assert.equal(result.human_handoff, "Create the PR and tag through GitHub.");
  assert.equal(git(state.repo, "branch", "--show-current"), `${state.branch}-done`);
  assert.equal(git(state.remote, "rev-parse", `refs/heads/${state.branch}`), state.expectedHead);
});

test("apply publishes on Windows and renames after equality", async (t) => {
  const state = await scenario(t);
  const result = await runPublish(
    optionsFor(state, "--expect-new-remote-branch", "--apply"),
    windowsApplyDependencies,
  );

  assert.equal(result.status, "published");
  assert.equal(result.push_mode, "new-branch");
  assert.equal(result.comparison, "0 0");
  assert.equal(git(state.remote, "rev-parse", `refs/heads/${state.branch}`), state.expectedHead);
  assert.equal(git(state.repo, "branch", "--show-current"), `${state.branch}-done`);
});

test("apply publishes on the native platform and verifies the remote", async (t) => {
  const state = await scenario(t);
  const result = await runPublish(
    optionsFor(state, "--expect-new-remote-branch", "--apply"),
    nativeApplyDependencies,
  );

  assert.equal(result.status, "published");
  assert.equal(result.platform, nativeApplyDependencies.platform);
  assert.equal(result.comparison, "0 0");
  assert.equal(git(state.remote, "rev-parse", `refs/heads/${state.branch}`), state.expectedHead);
  assert.equal(git(state.repo, "branch", "--show-current"), `${state.branch}-done`);
});

test("apply uses available commands on Linux with a warning", async (t) => {
  const state = await scenario(t);
  const result = await runPublish(optionsFor(state, "--expect-new-remote-branch", "--apply"), { platform: "linux", gh: null });
  assert.equal(result.status, "published");
  assert.ok(result.warnings.some((warning) => warning.includes("linux")));
  assert.equal(git(state.remote, "rev-parse", `refs/heads/${state.branch}`), state.expectedHead);
  assert.equal(git(state.repo, "branch", "--show-current"), `${state.branch}-done`);
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

test("apply uses an explicit force-with-lease on Windows for an existing branch", async (t) => {
  const state = await scenario(t, { existingRemoteBranch: true });
  const calls = [];
  const windowsGit = createGitRunner({ platform: "win32" });
  const recordingGit = (cwd, args, options) => {
    calls.push(args);
    return windowsGit(cwd, args, options);
  };
  const result = await runPublish(
    optionsFor(state, "--expected-remote-head", state.expectedRemoteHead, "--apply"),
    { ...windowsApplyDependencies, git: recordingGit },
  );
  const destination = `refs/heads/${state.branch}`;
  assert.equal(result.status, "published");
  assert.equal(result.push_mode, "force-with-explicit-lease");
  assert.ok(calls.some((args) => args.includes(`--force-with-lease=${destination}:${state.expectedRemoteHead}`)));
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
