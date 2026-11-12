#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

export const FAST_FILES = Object.freeze([
  "miku-scm-command-runner.test.mjs",
  "miku-scm-fixed-command-runner.test.mjs",
  "miku-scm-jst-time.test.mjs",
  "miku-scm-workflow-manifest.test.mjs",
  "miku-scm-workflow-contracts.test.mjs",
  "miku-scm-test-suite.test.mjs",
]);

export const usage = `Usage:
  node skills/igapyon-miku-scm/scripts/miku-scm-test-suite.mjs --full|--fast
    [--jobs <1..16>]

Runs one job per test file. --fast uses an explicit allowlist of pure tests;
--full discovers every test file. At most four child processes run at once by default. Progress goes to stderr;
the final JSON on stdout includes timings for every file.`;

export async function buildFullJobs(root) {
  const directory = path.join(root, "skills", "igapyon-miku-scm", "tests");
  const files = (await readdir(directory)).filter((file) => file.endsWith(".test.mjs")).sort();
  return files.map((file) => ({
    id: file,
    args: ["--test", "--test-reporter=spec", path.join(directory, file)],
  }));
}

export function validateFastFiles(files, fullFiles) {
  if (!Array.isArray(files) || files.some((file) => typeof file !== "string" || !file.endsWith(".test.mjs"))) {
    throw new Error("Fast suite must list test file names");
  }
  if (new Set(files).size !== files.length) throw new Error("Fast suite contains duplicate files");
  const available = new Set(fullFiles);
  const missing = files.filter((file) => !available.has(file));
  if (missing.length) throw new Error(`Fast suite files are missing from the full suite: ${missing.join(", ")}`);
  return [...files];
}

export async function buildFastJobs(root) {
  const fullJobs = await buildFullJobs(root);
  const fullFiles = fullJobs.map((job) => job.id);
  const files = validateFastFiles(FAST_FILES, fullFiles);
  const byId = new Map(fullJobs.map((job) => [job.id, job]));
  return files.map((file) => byId.get(file));
}

function runJob(job, root, spawnProcess = spawn) {
  return new Promise((resolve) => {
    const started = performance.now();
    const env = { ...process.env };
    // A suite launched by node --test must give its child test process a fresh
    // test-runner context instead of inheriting the parent's recursion guard.
    delete env.NODE_TEST_CONTEXT;
    const child = spawnProcess(process.execPath, job.args, {
      cwd: root,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => { stderr += `${error.message}\n`; });
    child.on("close", (code, signal) => resolve({
      id: job.id,
      ok: code === 0,
      code,
      signal,
      stdout,
      stderr,
      passed: Number(stdout.match(/ℹ pass (\d+)/)?.[1] ?? 0),
      failed: Number(stdout.match(/ℹ fail (\d+)/)?.[1] ?? 0),
      duration_ms: Math.round((performance.now() - started) * 1000) / 1000,
    }));
  });
}

export function parseSuiteArgs(argv) {
  if (!["--full", "--fast"].includes(argv[0]) || ![1, 3].includes(argv.length)
    || (argv.length === 3 && (argv[1] !== "--jobs" || !/^(?:[1-9]|1[0-6])$/.test(argv[2])))) {
    throw new Error("Specify --full|--fast [--jobs <1..16>]");
  }
  return { mode: argv[0] === "--fast" ? "fast" : "full", concurrency: argv.length === 3 ? Number(argv[2]) : 4 };
}

export async function runJobs(jobs, root, dependencies = {}) {
  const started = performance.now();
  const concurrency = dependencies.concurrency ?? 4;
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 16) {
    throw new Error("Concurrency must be an integer from 1 through 16");
  }
  const progress = dependencies.progress ?? ((line) => process.stderr.write(`${line}\n`));
  const results = new Array(jobs.length);
  const active = new Map();
  let next = 0;
  let completed = 0;
  const heartbeat = setInterval(() => {
    const pending = [...active].map(([id, time]) => `${id} (${Math.round((performance.now() - time) / 1000)}s)`);
    progress(`[suite] ${completed}/${jobs.length} completed; ${jobs.length - next} queued; running: ${pending.join(", ")}`);
  }, dependencies.heartbeatMs ?? 30_000);
  try {
    await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, async () => {
      while (next < jobs.length) {
        const index = next++;
        const job = jobs[index];
        active.set(job.id, performance.now());
        progress(`[start] ${job.id}`);
        let result;
        try {
          result = await runJob(job, root, dependencies.spawn);
        } catch (error) {
          result = { id: job.id, ok: false, passed: 0, failed: 0, stdout: "", stderr: error.message,
            duration_ms: performance.now() - active.get(job.id) };
        }
        results[index] = result;
        active.delete(job.id);
        completed++;
        progress(`[${result.ok ? "pass" : "FAIL"}] ${job.id} ${(result.duration_ms / 1000).toFixed(1)}s (${completed}/${jobs.length})`);
        if (!result.ok) progress(`${result.stdout}${result.stderr}`);
      }
    }));
  } finally {
    clearInterval(heartbeat);
  }
  const failed = results.filter((result) => !result.ok);
  return {
    schema_version: "miku-scm.test-suite/v1",
    status: failed.length === 0 ? "passed" : "failed",
    concurrency,
    jobs: results.length,
    passed: results.reduce((sum, result) => sum + result.passed, 0),
    failed: results.reduce((sum, result) => sum + result.failed, 0),
    duration_ms: Math.round((performance.now() - started) * 1000) / 1000,
    failed_jobs: failed.map((result) => result.id),
    job_durations_ms: Object.fromEntries(results.map((result) => [result.id, result.duration_ms])),
  };
}

export async function runFullSuite(root = process.cwd(), dependencies = {}) {
  const resolved = path.resolve(root);
  return runJobs(await buildFullJobs(resolved), resolved, dependencies);
}

export async function runFastSuite(root = process.cwd(), dependencies = {}) {
  const resolved = path.resolve(root);
  return runJobs(await buildFastJobs(resolved), resolved, dependencies);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(`${usage}\n`);
    return;
  }
  const options = parseSuiteArgs(argv);
  const result = options.mode === "fast"
    ? await runFastSuite(process.cwd(), options)
    : await runFullSuite(process.cwd(), options);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.status !== "passed") process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({ status: "error", message: error.message })}\n`);
    process.exitCode = 1;
  });
}
