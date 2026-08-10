import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  applyMaintenancePlan,
  createGitRunner,
  diagnose,
  parseArgs,
  parseBackupName,
  saveMaintenancePlan,
} from "../scripts/repository-maintenance.mjs";


function git(cwd, ...args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

async function repository(t) {
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

function options(root, ...extra) {
  return parseArgs(["--repo", root, ...extra]);
}

function mergedPull(branch, sha, number = 42) {
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

function ghReturning(data, options = {}) {
  return () => ({
    ok: options.ok ?? true,
    status: options.ok === false ? 1 : 0,
    timedOut: options.timedOut ?? false,
    stdout: options.stdout ?? JSON.stringify(data),
    stderr: options.stderr ?? "",
  });
}

test("argument parser keeps apply behind a fixed plan path and digest", () => {
  const digest = "a".repeat(64);
  const parsed = parseArgs([
    "--apply-plan",
    "workplace/miku-scm/maintenance/plans/maintenance-1.json",
    "--expected-plan-sha256",
    digest,
  ]);
  assert.equal(parsed.expectedPlanSha256, digest);
  assert.throws(() => parseArgs(["--apply-plan", "../plan.json", "--expected-plan-sha256", digest]), /maintenance plan path/);
  assert.throws(() => parseArgs(["--save-plan", "--apply-plan",
    "workplace/miku-scm/maintenance/plans/maintenance-1.json",
    "--expected-plan-sha256", digest]), /cannot be combined/);
});

test("backup name parser validates JST calendar values and collision suffixes", () => {
  const parsed = parseBackupName("backup/2026-07-27-1230");
  assert.equal(parsed.sequence, 1);
  assert.equal(parsed.created_at, "2026-07-27T03:30:00.000Z");
  assert.equal(parseBackupName("backup/2026-07-27-1230-3").sequence, 3);
  assert.equal(parseBackupName("backup/2026-02-30-1230"), null);
  assert.equal(parseBackupName("backup/custom"), null);
  assert.equal(parseBackupName("backup/2026-07-27-1230-1"), null);
});

test("diagnosis keeps newest three backups and selects only older remaining backups", async (t) => {
  const state = await repository(t);
  for (const name of [
    "backup/2026-07-26-1200",
    "backup/2026-07-20-1200-3",
    "backup/2026-07-20-1200-2",
    "backup/2026-07-20-1200",
    "backup/2026-07-10-1200",
  ]) git(state.root, "branch", name, state.head);

  const result = await diagnose(options(state.root), {
    now: () => new Date("2026-07-27T03:01:00Z"),
  });

  assert.deepEqual(result.backups.retained.map((value) => value.branch), [
    "backup/2026-07-26-1200",
    "backup/2026-07-20-1200-3",
    "backup/2026-07-20-1200-2",
  ]);
  assert.deepEqual(result.backups.delete_candidates.map((value) => value.branch), [
    "backup/2026-07-20-1200",
    "backup/2026-07-10-1200",
  ]);
  assert.equal(result.deletion_performed, false);
  assert.ok(result.backups.delete_candidates.every((value) => value.contained_by_other_refs.length > 0));
  assert.ok(result.backups.retained.every((value) => !("contained_by_other_refs" in value)));
});

test("backup reachability runs only for deletion candidates", async (t) => {
  const state = await repository(t);
  for (const name of [
    "backup/2026-07-26-1200",
    "backup/2026-07-20-1200-3",
    "backup/2026-07-20-1200-2",
    "backup/2026-07-20-1200",
    "backup/2026-07-10-1200",
  ]) git(state.root, "branch", name, state.head);
  const realGit = createGitRunner();
  let containsCalls = 0;
  const result = await diagnose(options(state.root), {
    now: () => new Date("2026-07-27T03:01:00Z"),
    git: (cwd, args, runOptions) => {
      if (args.some((arg) => arg.startsWith("--contains="))) containsCalls += 1;
      return realGit(cwd, args, runOptions);
    },
  });

  assert.equal(result.backups.delete_candidates.length, 2);
  assert.equal(containsCalls, 2);
});

test("diagnosis classifies exactly matched merged done branch for deletion", async (t) => {
  const state = await repository(t);
  const pushed = "devel-tiga0720daa";
  git(state.root, "branch", `${pushed}-done`, state.head);
  const requests = [];
  const result = await diagnose(options(state.root), {
    now: () => new Date("2026-07-27T12:00:00Z"),
    gh: (args) => {
      requests.push(args);
      return ghReturning([mergedPull(pushed, state.head)])();
    },
  });

  assert.equal(result.done.delete_candidates.length, 1);
  assert.equal(result.done.delete_candidates[0].branch, `${pushed}-done`);
  assert.equal(result.done.delete_candidates[0].pull_request.number, 42);
  assert.deepEqual(requests[0], [
    "api", "--method", "GET", "repos/example/project/pulls",
    "-f", "state=all", "-f", `head=example:${pushed}`, "-f", "per_page=100",
  ]);
  assert.ok(!requests[0].includes("--paginate"));
});

test("diagnosis queries only local done heads and never enumerates all pull requests", async (t) => {
  const state = await repository(t);
  const branches = ["devel-tiga0720daa", "devel-tiga0721ebb"];
  for (const branch of branches) git(state.root, "branch", `${branch}-done`, state.head);
  const requests = [];
  const result = await diagnose(options(state.root), {
    gh: (args) => {
      requests.push(args);
      const branch = branches.find((value) => args.includes(`head=example:${value}`));
      return ghReturning(branch ? [mergedPull(branch, state.head)] : [])();
    },
  });

  assert.equal(result.done.delete_candidates.length, 2);
  assert.equal(requests.length, 2);
  assert.ok(requests.every((args) => args.some((arg) => arg.startsWith("head=example:"))));
  assert.ok(requests.every((args) => !args.includes("--paginate")));
});

test("publication provenance is loaded once per diagnosis", async (t) => {
  const state = await repository(t);
  const branches = ["devel-tiga0720daa", "devel-tiga0721ebb"];
  for (const branch of branches) git(state.root, "branch", `${branch}-done`, state.head);
  let loads = 0;
  const result = await diagnose(options(state.root), {
    loadProvenance: async () => {
      loads += 1;
      return new Map();
    },
    gh: (args) => {
      const branch = branches.find((value) => args.includes(`head=example:${value}`));
      return ghReturning([mergedPull(branch, state.head)])();
    },
  });

  assert.equal(loads, 1);
  assert.equal(result.done.delete_candidates.length, 2);
});

test("one hundred head matches are unresolved without pagination", async (t) => {
  const state = await repository(t);
  const branch = "devel-tiga0720daa";
  git(state.root, "branch", `${branch}-done`, state.head);
  const requests = [];
  const pulls = Array.from({ length: 100 }, (_, index) => mergedPull(branch, state.head, index + 1));
  const result = await diagnose(options(state.root), {
    gh: (args) => {
      requests.push(args);
      return ghReturning(pulls)();
    },
  });

  assert.equal(requests.length, 1);
  assert.ok(!requests[0].includes("--paginate"));
  assert.equal(result.done.unresolved[0].reason, "pull-request-head-result-limit");
});

test("gh failure stops further done lookups and leaves them unresolved", async (t) => {
  const state = await repository(t);
  for (const branch of ["devel-tiga0720daa", "devel-tiga0721ebb"]) {
    git(state.root, "branch", `${branch}-done`, state.head);
  }
  let requests = 0;
  const result = await diagnose(options(state.root), {
    gh: () => {
      requests += 1;
      return ghReturning(null, { ok: false, stderr: "rate limit exceeded" })();
    },
  });

  assert.equal(requests, 1);
  assert.equal(result.done.unresolved.length, 2);
  assert.ok(result.done.unresolved.every((value) => value.reason === "github-inspection-failed"));
});

test("gh timeout is not repeated for every done branch", async (t) => {
  const state = await repository(t);
  for (const branch of ["devel-tiga0720daa", "devel-tiga0721ebb"]) {
    git(state.root, "branch", `${branch}-done`, state.head);
  }
  let requests = 0;
  const result = await diagnose(options(state.root), {
    gh: () => {
      requests += 1;
      return ghReturning(null, { ok: false, timedOut: true })();
    },
  });

  assert.equal(requests, 1);
  assert.equal(result.done.unresolved.length, 2);
  assert.match(result.done.unresolved[0].detail, /timed out after 15000ms/);
});

test("open or mismatched done branches are never deletion candidates", async (t) => {
  const state = await repository(t);
  const pushed = "devel-tiga0720daa";
  git(state.root, "branch", `${pushed}-done`, state.head);
  const open = mergedPull(pushed, state.head);
  open.state = "open";
  open.merged_at = null;

  const retained = await diagnose(options(state.root), {
    gh: ghReturning([open]),
  });
  assert.equal(retained.done.retained[0].reason, "pull-request-not-merged");

  const unresolved = await diagnose(options(state.root), {
    gh: ghReturning([mergedPull(pushed, "0".repeat(40))]),
  });
  assert.equal(unresolved.done.unresolved[0].reason, "exact-pull-request-not-found");
});

test("saved plan applies once after revalidation and records recovery data", async (t) => {
  const state = await repository(t);
  for (const name of [
    "backup/2026-07-26-1200",
    "backup/2026-07-25-1200",
    "backup/2026-07-24-1200",
    "backup/2026-07-10-1200",
    "backup/2026-07-09-1200",
  ]) git(state.root, "branch", name, state.head);
  const dependencies = {
    now: () => new Date("2026-07-27T03:01:00Z"),
  };
  const diagnosis = await diagnose(options(state.root), dependencies);
  const saved = await saveMaintenancePlan(diagnosis, dependencies);
  assert.match(saved.plan_path, /^workplace\/miku-scm\/maintenance\/plans\/maintenance-/);
  assert.match(saved.plan_sha256, /^[0-9a-f]{64}$/);
  const savedPlan = JSON.parse(await readFile(path.join(state.root, saved.plan_path), "utf8"));
  assert.equal(savedPlan.workflow_contract, "repository.maintenance.apply");
  assert.equal(savedPlan.contract_version, 1);
  assert.match(savedPlan.contract_pair_sha256, /^[0-9a-f]{64}$/);

  const applied = await applyMaintenancePlan(options(state.root,
    "--apply-plan", saved.plan_path,
    "--expected-plan-sha256", saved.plan_sha256), dependencies);
  assert.equal(applied.status, "applied");
  assert.equal(git(state.root, "branch", "--list", "backup/2026-07-10-1200"), "");
  assert.equal(git(state.root, "branch", "--list", "backup/2026-07-09-1200"), "");
  assert.equal(applied.deleted.length, 2);
  assert.match(applied.recovery[0].command, /^git branch backup\/2026-07-10-1200 [0-9a-f]+$/);
  const attempt = JSON.parse(await readFile(path.join(state.root, applied.attempt_record), "utf8"));
  assert.equal(attempt.status, "applied");

  await assert.rejects(applyMaintenancePlan(options(state.root,
    "--apply-plan", saved.plan_path,
    "--expected-plan-sha256", saved.plan_sha256), dependencies), /already has an attempt/);
});

test("apply rejects changed plan bytes before diagnosis or deletion", async (t) => {
  const state = await repository(t);
  for (const name of [
    "backup/2026-07-26-1200",
    "backup/2026-07-25-1200",
    "backup/2026-07-24-1200",
    "backup/2026-07-10-1200",
  ]) git(state.root, "branch", name, state.head);
  const dependencies = {
    now: () => new Date("2026-07-27T03:01:00Z"),
  };
  const saved = await saveMaintenancePlan(await diagnose(options(state.root), dependencies), dependencies);
  const planFile = path.join(state.root, saved.plan_path);
  await writeFile(planFile, `${await readFile(planFile, "utf8")}\n`, "utf8");

  await assert.rejects(applyMaintenancePlan(options(state.root,
    "--apply-plan", saved.plan_path,
    "--expected-plan-sha256", saved.plan_sha256), dependencies), /SHA-256 changed/);
  assert.notEqual(git(state.root, "branch", "--list", "backup/2026-07-10-1200"), "");
});

test("apply rechecks only done branches included in the reviewed plan", async (t) => {
  const state = await repository(t);
  const planned = "devel-tiga0720daa";
  const unrelated = "devel-tiga0721ebb";
  git(state.root, "branch", `${planned}-done`, state.head);
  git(state.root, "branch", `${unrelated}-done`, state.head);
  const initial = await diagnose(options(state.root), {
    gh: (args) => ghReturning(args.includes(`head=example:${planned}`)
      ? [mergedPull(planned, state.head)]
      : [])(),
  });
  const saved = await saveMaintenancePlan(initial, {
    now: () => new Date("2026-07-27T12:00:00Z"),
  });
  let applyRequests = 0;
  const applied = await applyMaintenancePlan(options(state.root,
    "--apply-plan", saved.plan_path,
    "--expected-plan-sha256", saved.plan_sha256), {
    gh: (args) => {
      applyRequests += 1;
      assert.deepEqual(args, [
        "api", "--method", "GET", "repos/example/project/pulls/42",
      ]);
      return ghReturning(mergedPull(planned, state.head))();
    },
  });

  assert.equal(applyRequests, 1);
  assert.equal(applied.deleted.length, 1);
  assert.equal(git(state.root, "branch", "--list", `${planned}-done`), "");
  assert.notEqual(git(state.root, "branch", "--list", `${unrelated}-done`), "");
});

test("apply stops before an attempt when a reviewed branch object changed", async (t) => {
  const state = await repository(t);
  for (const name of [
    "backup/2026-07-26-1200",
    "backup/2026-07-25-1200",
    "backup/2026-07-24-1200",
    "backup/2026-07-10-1200",
  ]) git(state.root, "branch", name, state.head);
  const dependencies = {
    now: () => new Date("2026-07-27T03:01:00Z"),
  };
  const saved = await saveMaintenancePlan(await diagnose(options(state.root), dependencies), dependencies);

  await writeFile(path.join(state.root, "changed.txt"), "changed\n", "utf8");
  git(state.root, "add", "changed.txt");
  git(state.root, "commit", "-m", "changed");
  git(state.root, "branch", "-f", "backup/2026-07-10-1200", "HEAD");

  await assert.rejects(applyMaintenancePlan(options(state.root,
    "--apply-plan", saved.plan_path,
    "--expected-plan-sha256", saved.plan_sha256), dependencies), /no longer eligible/);
});

test("current done branch is retained without GitHub deletion classification", async (t) => {
  const state = await repository(t);
  const branch = "devel-tiga0720daa-done";
  git(state.root, "switch", "-c", branch);
  const result = await diagnose(options(state.root), {
    gh() { throw new Error("gh must not run for the current branch"); },
  });
  assert.equal(result.done.retained[0].reason, "current-branch");
  assert.equal(result.done.delete_candidates.length, 0);
});
