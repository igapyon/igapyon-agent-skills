import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";
import { EventEmitter } from "node:events";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  buildFullJobs,
  buildFastJobs,
  FAST_FILES,
  parseSuiteArgs,
  runJobs,
  validateFastFiles,
} from "../scripts/miku-scm-test-suite.mjs";

test("full suite discovers each test file once without test-name filtering", async () => {
  const jobs = await buildFullJobs(process.cwd());
  const files = (await readdir("skills/igapyon-miku-scm/tests")).filter((name) => name.endsWith(".test.mjs")).sort();
  assert.deepEqual(jobs.map((job) => job.id), files);
  assert.equal(new Set(jobs.map((job) => job.id)).size, jobs.length);
  assert.ok(jobs.every((job) => !job.args.includes("--test-name-pattern")));
  for (const file of ["sync-pull.test.mjs", "post-recommit-publish.test.mjs", "repository-maintenance.test.mjs"]) {
    assert.equal(jobs.filter((job) => job.id === file).length, 1);
  }
});

test("fast suite is a unique subset of full and rejects missing or duplicate entries", async () => {
  const full = await buildFullJobs(process.cwd());
  const fast = await buildFastJobs(process.cwd());
  assert.deepEqual(fast.map((job) => job.id), FAST_FILES);
  assert.equal(new Set(FAST_FILES).size, FAST_FILES.length);
  assert.ok(fast.every((job) => full.some((fullJob) => fullJob.id === job.id)));
  const fullFiles = full.map((job) => job.id);
  assert.throws(() => validateFastFiles(["missing.test.mjs"], fullFiles), /missing from the full suite/);
  assert.throws(() => validateFastFiles([fullFiles[0], fullFiles[0]], fullFiles), /duplicate/);
  assert.throws(() => validateFastFiles(["not-a-test.js"], fullFiles), /test file names/);
});

test("dynamic, single-quoted and arbitrary test names run in one discovered job", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "miku-suite-dynamic-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = path.join(root, "skills", "igapyon-miku-scm", "tests");
  await mkdir(directory, { recursive: true });
  const marker = path.join(root, "executed.txt");
  await writeFile(path.join(directory, "future-names.test.mjs"), [
    'import test from "node:test";',
    'import { appendFile } from "node:fs/promises";',
    `const mark = () => appendFile(${JSON.stringify(marker)}, "ran\\n");`,
    'for (const [kind, label] of [["generated", "name"]]) test(`${kind} ${label}`, mark);',
    "test('single-quoted name with no old prefix', mark);",
    "test('★ arbitrary / punctuation: [future]', mark);",
    "",
  ].join("\n"));
  const jobs = await buildFullJobs(root);
  assert.equal(jobs.length, 1);
  assert.deepEqual(jobs[0].args.slice(0, 2), ["--test", "--test-reporter=spec"]);
  assert.ok(!jobs[0].args.includes("--test-name-pattern"));
  let launches = 0;
  let output = "";
  const result = await runJobs(jobs, root, { progress: () => {}, spawn: (...args) => {
    launches++;
    const child = spawn(...args);
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    return child;
  } });
  assert.equal(launches, 1);
  assert.equal(result.jobs, 1);
  assert.equal(result.status, "passed", output);
  const markerText = await readFile(marker, "utf8").catch((error) => { throw new Error(`${error.message}\n${output}`); });
  assert.equal(markerText.trim().split("\n").length, 3);
});

test("suite CLI validates its process limit", () => {
  assert.deepEqual(parseSuiteArgs(["--full"]), { mode: "full", concurrency: 4 });
  assert.deepEqual(parseSuiteArgs(["--fast", "--jobs", "2"]), { mode: "fast", concurrency: 2 });
  assert.equal(parseSuiteArgs(["--full", "--jobs", "2"]).concurrency, 2);
  for (const args of [[], ["--full", "--jobs"], ["--fast", "--jobs", "0"], ["--full", "--jobs", "17"], ["--full", "--jobs", "2.5"], ["--full", "--exec", "4"]]) {
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
