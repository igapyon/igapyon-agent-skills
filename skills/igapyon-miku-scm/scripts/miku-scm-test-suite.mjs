#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const SYNC_PULL_GROUPS = [
  "sync pull (?:without gh|done|does not replace|squash)",
  "(?:human|a fresh pull|unmerged PR|TLS|sync pull (?:next-work|never retries|recovers))",
  "sync pull (?:rebase|replays|identical|retains|directory|stash|refuses)",
];

const SLOW_SHARDS = new Map([
  // Each case creates its own fixture. Anchor every shard to a test-name
  // prefix: a bare negative lookahead also matches Node's file container and
  // would run all of its tests, including ones selected by another shard.
  ["sync-pull.test.mjs", [
    ...SYNC_PULL_GROUPS.map((pattern) => `^${pattern}`),
    `^(?!(?:${SYNC_PULL_GROUPS.join("|")}))(?:sync pull |sync locks )`,
  ]],
  ["post-recommit-publish.test.mjs", [
    "^(?:PR handoff|preflight|plan CLI|content VERSION)",
    "^post-merge",
    "^(?:saved publication|apply rejects a changed|apply rejects a dirty)",
    "^(?:saved plan remains|programmatic publication)",
    "^(?:apply publishes|apply uses)",
    "^(?:apply stops when|apply stops before push|fetch failure)",
    "^(?:push failure|post-push)",
  ]],
  ["repository-maintenance.test.mjs", [
    "^(?:argument parser|backup name|maintenance plan repository paths|diagnosis keeps|backup reachability)",
    "^(?:diagnosis classifies|diagnosis queries|publication provenance|one hundred)",
    "^(?:gh failure|gh timeout|open or mismatched|current done)",
    "^(?:saved plan|apply rejects|apply rechecks|apply stops)",
  ]],
]);

export const usage = `Usage:
  node skills/igapyon-miku-scm/scripts/miku-scm-test-suite.mjs --full
    [--jobs <1..16>]

Runs the complete miku-scm safety suite. Slow, repository-isolated Git tests
are divided into fixed non-overlapping name shards. Other files run separately.
At most four child processes run at once by default. Progress goes to stderr;
the final JSON on stdout includes timings for every file or shard.`;

export function extractTestNames(content) {
  return [...content.matchAll(/^test\("([^"]+)"/gm)].map((match) => match[1]);
}

export function validateShards(names, patterns, file) {
  const regexes = patterns.map((pattern) => new RegExp(pattern));
  for (const name of names) {
    const count = regexes.filter((regex) => regex.test(name)).length;
    if (count !== 1) throw new Error(`${file}: test must match exactly one shard: ${name}`);
  }
}

export async function buildFullJobs(root) {
  const directory = path.join(root, "skills", "igapyon-miku-scm", "tests");
  const files = (await readdir(directory)).filter((file) => file.endsWith(".test.mjs")).sort();
  const regular = files.filter((file) => !SLOW_SHARDS.has(file));
  const jobs = regular.map((file) => ({
    id: file,
    args: ["--test", "--test-reporter=spec", path.join(directory, file)],
  }));
  for (const [file, patterns] of SLOW_SHARDS) {
    const absolute = path.join(directory, file);
    validateShards(extractTestNames(await readFile(absolute, "utf8")), patterns, file);
    patterns.forEach((pattern, index) => {
      jobs.push({
        id: `${file}:${index + 1}`,
        args: ["--test", "--test-reporter=spec", "--test-name-pattern", pattern, absolute],
      });
    });
  }
  return jobs;
}

function runJob(job, root, spawnProcess = spawn) {
  return new Promise((resolve) => {
    const started = performance.now();
    const child = spawnProcess(process.execPath, job.args, {
      cwd: root,
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
  if (argv[0] !== "--full" || ![1, 3].includes(argv.length)
    || (argv.length === 3 && (argv[1] !== "--jobs" || !/^(?:[1-9]|1[0-6])$/.test(argv[2])))) {
    throw new Error("Specify --full [--jobs <1..16>]");
  }
  return { concurrency: argv.length === 3 ? Number(argv[2]) : 4 };
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

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(`${usage}\n`);
    return;
  }
  const result = await runFullSuite(process.cwd(), parseSuiteArgs(argv));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.status !== "passed") process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({ status: "error", message: error.message })}\n`);
    process.exitCode = 1;
  });
}
