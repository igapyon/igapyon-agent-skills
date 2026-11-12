import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
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
  savePublicationPlan,
} from "../scripts/post-recommit-publish.mjs";
import {
  classifyTagLookup,
  prepareNextWorkBranch,
  run as runNextWork,
} from "../scripts/post-merge-next-work.mjs";
import { runWorkflow } from "../scripts/miku-scm-run.mjs";

import { PUBLISH_SCRIPT, git, recordedGit, NEXT_WORK_DATE, mergedScenario, nextWorkOptions, scenario, optionsFor, preparePublicationPlan, applySavedPublication, applyDependencies, windowsApplyDependencies, nativeApplyDependencies } from "./post-recommit-publish-support.mjs";

test("saved publication rejects a different branch at the same HEAD", async (t) => {
  const state = await scenario(t);
  const p = await executePublish(optionsFor(state, "--save-plan"), { gh: null });
  git(state.repo, "switch", "-c", "other-branch");
  await assert.rejects(executePublish(parseArgs(["--repo", state.repo, "--apply-plan", p.plan_path,
    "--expected-plan-sha256", p.plan_sha256]), { gh: null }), /branch changed/);
  assert.equal(git(state.remote, "for-each-ref", "--format=%(refname)", "refs/heads/"), "refs/heads/devel");
  assert.equal(git(state.repo, "branch", "--show-current"), "other-branch");
});

test("saved publication rejects changed fetch and push destinations", async (t) => {
  for (const mode of ["fetch", "push", "multiple"]) await t.test(mode, async (sub) => {
    const state = await scenario(sub);
    const p = await executePublish(optionsFor(state, "--save-plan"), { gh: null });
    const other = path.join(state.temporary, "other.git");
    execFileSync("git", ["init", "--bare", other], { stdio: "ignore" });
    if (mode === "fetch") git(state.repo, "remote", "set-url", "origin", other);
    else git(state.repo, "remote", "set-url", ...(mode === "multiple" ? ["--add"] : []), "--push", "origin", other);
    await assert.rejects(executePublish(parseArgs(["--repo", state.repo, "--apply-plan", p.plan_path,
      "--expected-plan-sha256", p.plan_sha256]), { gh: null }), /remote URLs changed/);
    assert.equal(git(other, "for-each-ref", "--format=%(refname)"), "");
    assert.equal(git(state.remote, "for-each-ref", "--format=%(refname)", "refs/heads/"), "refs/heads/devel");
  });
});

test("saved publication rejects branch and URL changes during fetch before an attempt", async (t) => {
  for (const kind of ["branch", "url"]) await t.test(kind, async (sub) => {
    const state = await scenario(sub);
    const p = await executePublish(optionsFor(state, "--save-plan"), { gh: null });
    const native = createGitRunner();
    let sends = 0;
    const intercepted = (cwd, args, options) => {
      if (args[0] === "push") sends++;
      const result = native(cwd, args, options);
      if (args[0] === "fetch") {
        if (kind === "branch") git(cwd, "switch", "-c", "changed-branch");
        else git(cwd, "remote", "set-url", "--push", "origin", path.join(state.temporary, "different.git"));
      }
      return result;
    };
    await assert.rejects(executePublish(parseArgs(["--repo", state.repo, "--apply-plan", p.plan_path,
      "--expected-plan-sha256", p.plan_sha256]), { git: intercepted, gh: null }), (e) => e.mutationInvoked === false && /changed/.test(e.message));
    assert.equal(sends, 0);
  });
});

test("saved publication rejects legacy plans without inventing a remote binding", async (t) => {
  const state = await scenario(t);
  const p = await executePublish(optionsFor(state, "--save-plan"), { gh: null });
  const plan = { ...p.publication_plan, schema_version: 1 };
  delete plan.remote_urls_sha256;
  const content = JSON.stringify(plan);
  await writeFile(path.join(state.repo, p.plan_path), content);
  await assert.rejects(executePublish(parseArgs(["--repo", state.repo, "--apply-plan", p.plan_path,
    "--expected-plan-sha256", createHash("sha256").update(content).digest("hex")]), { gh: null }), /preflight again/);
});

test("saved publication rechecks a branch changed by the mutation callback", async (t) => {
  const state = await scenario(t);
  const p = await executePublish(optionsFor(state, "--save-plan"), { gh: null });
  await assert.rejects(executePublish(parseArgs(["--repo", state.repo, "--apply-plan", p.plan_path,
    "--expected-plan-sha256", p.plan_sha256]), {
    gh: null, beforeMutation: () => git(state.repo, "switch", "-c", "changed-in-callback"),
  }), (e) => e.mutationInvoked === null && /branch changed/.test(e.message));
  assert.equal(git(state.remote, "for-each-ref", "--format=%(refname)", "refs/heads/"), "refs/heads/devel");
  const attempt = JSON.parse(await readFile(path.join(state.repo, `${p.plan_path}.attempt.json`), "utf8"));
  assert.equal(attempt.status, "unresolved");
});

test("legacy ordinary apply arguments are rejected before any Git command", async (t) => {
  const state = await scenario(t);
  const args = ["--repo", state.repo, "--expected-head", state.expectedHead,
    "--expect-new-remote-branch", "--apply"];
  assert.throws(() => parseArgs(args), /save.*plan/i);
  const unsafeOptions = { ...optionsFor(state, "--expect-new-remote-branch"), apply: true };
  let calls = 0;
  const gitRunner = () => { calls++; throw new Error("Git must not run"); };
  await assert.rejects(runPublish(unsafeOptions, { git: gitRunner }), /save.*plan/i);
  await assert.rejects(executePublish(unsafeOptions, { git: gitRunner }), /save.*plan/i);
  assert.equal(calls, 0);
  assert.equal(git(state.remote, "for-each-ref", "--format=%(refname)", "refs/heads/"), "refs/heads/devel");
});

test("documented ordinary arguments cannot publish a changed branch to a changed remote", async (t) => {
  const state = await scenario(t);
  const preflight = await runPublish(optionsFor(state), { gh: null });
  assert.equal(preflight.apply_arguments, undefined);
  const different = path.join(state.temporary, "different.git");
  execFileSync("git", ["clone", "--bare", state.remote, different], { stdio: "ignore" });
  git(state.repo, "remote", "set-url", "origin", different);
  git(state.repo, "switch", "-c", "different-branch");
  const oldArguments = ["--repo", state.repo, "--expected-head", preflight.head,
    "--expect-new-remote-branch", "--apply"];
  assert.throws(() => parseArgs(oldArguments), /save.*plan/i);
  const unsafeOptions = { ...optionsFor(state), apply: true };
  await assert.rejects(executePublish(unsafeOptions, { gh: null }), /save.*plan/i);
  assert.equal(git(different, "for-each-ref", "--format=%(refname)", "refs/heads/"), "refs/heads/devel");
  assert.equal(git(state.repo, "branch", "--show-current"), "different-branch");
});

test("saved publication plan applies once and publishes the reviewed branch", async (t) => {
  const state = await scenario(t);
  const saved = JSON.parse(execFileSync(process.execPath, [PUBLISH_SCRIPT,
    "--repo", state.repo, "--expected-head", state.expectedHead, "--save-plan"], { encoding: "utf8" }));
  assert.match(saved.plan_path, /^workplace\/miku-scm\/ok-push\/.*\.json$/);
  assert.match(saved.plan_sha256, /^[0-9a-f]{64}$/);
  assert.equal(saved.publication_plan.workflow_contract, "pr.publish.apply");
  assert.equal(saved.publication_plan.contract_version, 4);
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

test("saved publication plans for the same branch and HEAD have unique safe filenames", async (t) => {
  const state = await scenario(t);
  const preflight = await runPublish(optionsFor(state), applyDependencies);
  const first = await savePublicationPlan(state.repo, preflight);
  const second = await savePublicationPlan(state.repo, preflight);
  assert.notEqual(first.plan_path, second.plan_path);
  for (const saved of [first, second]) {
    assert.match(saved.plan_path, /^workplace\/miku-scm\/ok-push\/[A-Za-z0-9._-]+\.json$/);
    const bytes = await readFile(path.join(state.repo, saved.plan_path));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), saved.plan_sha256);
    assert.equal(JSON.parse(bytes).reviewed_head, state.expectedHead);
  }
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

test("saved publication rejects a branch created at the last push checkpoint", async (t) => {
  const state = await scenario(t);
  const saved = await preparePublicationPlan(state, "--expect-new-remote-branch");
  let raced = false;
  await assert.rejects(applySavedPublication(state, saved, {
    ...applyDependencies,
    beforeMutation: () => {
      git(state.repo, "push", "origin", `devel:refs/heads/${state.branch}`);
      raced = true;
    },
  }), (error) => error.mutationInvoked === null && /push/i.test(error.message));
  assert.equal(raced, true);
  assert.equal(git(state.remote, "rev-parse", `refs/heads/${state.branch}`), git(state.repo, "rev-parse", "devel"));
  assert.equal(git(state.repo, "branch", "--show-current"), state.branch);
  const attempt = JSON.parse(await readFile(path.join(state.repo, `${saved.plan_path}.attempt.json`), "utf8"));
  assert.equal(attempt.status, "unresolved");
});

