import assert from "node:assert/strict";
import test from "node:test";
import { EventEmitter } from "node:events";
import { readdir } from "node:fs/promises";
import path from "node:path";

import {
  buildFullJobs,
  extractTestNames,
  validateShards,
  parseSuiteArgs,
  runJobs,
} from "../scripts/miku-scm-test-suite.mjs";

test("test-name extraction and shard validation require exactly one match", () => {
  const names = extractTestNames('test("alpha", () => {});\ntest("beta", async () => {});\n');
  assert.deepEqual(names, ["alpha", "beta"]);
  assert.doesNotThrow(() => validateShards(names, ["^alpha$", "^beta$"], "fixture"));
  assert.throws(() => validateShards(names, ["a", "alpha"], "fixture"), /exactly one/);
  assert.throws(() => validateShards(names, ["^alpha$"], "fixture"), /exactly one/);
});

test("full suite build keeps regular files and fixed slow shards separate", async () => {
  const jobs = await buildFullJobs(process.cwd());
  const files = (await readdir("skills/igapyon-miku-scm/tests")).filter((name) => name.endsWith(".test.mjs"));
  assert.deepEqual([...new Set(jobs.map((job) => path.basename(job.args.at(-1))))].sort(), files.sort());
  assert.equal(new Set(jobs.map((job) => job.id)).size, jobs.length);
  for (const file of files.filter((name) => !["sync-pull.test.mjs", "post-recommit-publish.test.mjs", "repository-maintenance.test.mjs"].includes(name))) {
    assert.equal(jobs.filter((job) => job.id === file).length, 1);
  }
  assert.ok(jobs.some((job) => job.id.startsWith("post-recommit-publish.test.mjs:")));
  assert.ok(jobs.some((job) => job.id.startsWith("repository-maintenance.test.mjs:")));
  const syncPatterns = jobs.filter((job) => job.id.startsWith("sync-pull.test.mjs:"))
    .map((job) => job.args[job.args.indexOf("--test-name-pattern") + 1]);
  validateShards([
    "sync pull without gh verifies PRs on github.com and carries work to the next branch",
    "sync pull without gh stops before changing work for 404 anonymous evidence",
    "human merge confirmation rejects changed worktree",
    "sync pull directory rename cannot overwrite ignored contents during commit integration",
    "sync pull protects an ignored symlink replacing a tracked directory",
  ], syncPatterns, "sync-pull.test.mjs");
  for (const pattern of syncPatterns) {
    assert.equal(new RegExp(pattern).test(path.resolve("skills/igapyon-miku-scm/tests/sync-pull.test.mjs")), false);
  }
  assert.throws(() => validateShards(["unclassified future test"], syncPatterns, "sync-pull.test.mjs"));
});

test("suite CLI validates its process limit", () => {
  assert.equal(parseSuiteArgs(["--full"]).concurrency, 4);
  assert.equal(parseSuiteArgs(["--full", "--jobs", "2"]).concurrency, 2);
  for (const args of [[], ["--full", "--jobs"], ["--full", "--jobs", "0"], ["--full", "--jobs", "17"], ["--full", "--jobs", "2.5"], ["--full", "--exec", "4"]]) {
    assert.throws(() => parseSuiteArgs(args));
  }
});

test("bounded workers report progress, timings and failures while finishing remaining jobs", async () => {
  let active = 0;
  let peak = 0;
  const lines = [];
  const launched = [];
  const result = await runJobs(["one", "fail", "three", "four"].map((id) => ({ id, args: [id] })), process.cwd(), {
    concurrency: 2,
    heartbeatMs: 1,
    progress: (line) => lines.push(line),
    spawn: (_command, [id]) => {
      launched.push(id);
      active++;
      peak = Math.max(peak, active);
      const child = new EventEmitter();
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
      setTimeout(() => {
        child.stdout.emit("data", id === "fail" ? "ℹ pass 0\nℹ fail 1\n" : "ℹ pass 1\nℹ fail 0\n");
        active--;
        child.emit("close", id === "fail" ? 1 : 0, null);
      }, 10);
      return child;
    },
  });
  assert.equal(peak, 2);
  assert.equal(result.status, "failed");
  assert.equal(result.passed, 3);
  assert.equal(result.failed, 1);
  assert.deepEqual(result.failed_jobs, ["fail"]);
  assert.deepEqual(Object.keys(result.job_durations_ms), launched);
  assert.ok(lines.some((line) => line.includes("running:")));
  assert.ok(lines.some((line) => line.startsWith("[FAIL] fail")));
  assert.ok(lines.some((line) => line.includes("(4/4)")));
});

test("spawn errors produce a failed suite and do not discard subsequent jobs", async () => {
  const result = await runJobs([{ id: "missing", args: [] }, { id: "next", args: [] }], process.cwd(), {
    concurrency: 1, progress: () => {}, spawn: () => { throw new Error("ENOENT"); },
  });
  assert.equal(result.status, "failed");
  assert.deepEqual(result.failed_jobs, ["missing", "next"]);
});
