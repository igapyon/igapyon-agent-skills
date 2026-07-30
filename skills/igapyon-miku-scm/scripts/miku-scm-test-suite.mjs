#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const SLOW_SHARDS = new Map([
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
    "^(?:argument parser|backup name|diagnosis keeps|backup reachability)",
    "^(?:diagnosis classifies|diagnosis queries|publication provenance|one hundred)",
    "^(?:gh failure|gh timeout|open or mismatched|current done)",
    "^(?:saved plan|apply rejects|apply rechecks|apply stops)",
  ]],
]);

export const usage = `Usage:
  node skills/igapyon-miku-scm/scripts/miku-scm-test-suite.mjs --full

Runs the complete miku-scm safety suite. Slow, repository-isolated Git tests
are divided into fixed non-overlapping name shards and executed concurrently.`;

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
  const jobs = [{
    id: "regular",
    args: ["--test", ...regular.map((file) => path.join(directory, file))],
  }];
  for (const [file, patterns] of SLOW_SHARDS) {
    const absolute = path.join(directory, file);
    validateShards(extractTestNames(await readFile(absolute, "utf8")), patterns, file);
    patterns.forEach((pattern, index) => {
      jobs.push({
        id: `${file}:${index + 1}`,
        args: ["--test", "--test-name-pattern", pattern, absolute],
      });
    });
  }
  return jobs;
}

function runJob(job, root, spawnProcess = spawn) {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    const child = spawnProcess(process.execPath, job.args, {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
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

export async function runFullSuite(root = process.cwd(), dependencies = {}) {
  const started = performance.now();
  const jobs = await buildFullJobs(path.resolve(root));
  const results = await Promise.all(jobs.map((job) => runJob(
    job,
    path.resolve(root),
    dependencies.spawn,
  )));
  const failed = results.filter((result) => !result.ok);
  if (failed.length > 0) {
    for (const result of failed) {
      process.stderr.write(`--- ${result.id} ---\n${result.stdout}${result.stderr}`);
    }
  }
  return {
    schema_version: "miku-scm.test-suite/v1",
    status: failed.length === 0 ? "passed" : "failed",
    jobs: results.length,
    passed: results.reduce((sum, result) => sum + result.passed, 0),
    failed: results.reduce((sum, result) => sum + result.failed, 0),
    duration_ms: Math.round((performance.now() - started) * 1000) / 1000,
    failed_jobs: failed.map((result) => result.id),
    job_durations_ms: Object.fromEntries(results.map((result) => [result.id, result.duration_ms])),
  };
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(`${usage}\n`);
    return;
  }
  if (argv.length !== 1 || argv[0] !== "--full") throw new Error("Specify exactly --full");
  const result = await runFullSuite();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.status !== "passed") process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({ status: "error", message: error.message })}\n`);
    process.exitCode = 1;
  });
}
