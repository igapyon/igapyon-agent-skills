#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const runner = fileURLToPath(new URL("./github-writer-run.mjs", import.meta.url));
const samples = [];

for (let index = 0; index < 4; index += 1) {
  const started = performance.now();
  const result = spawnSync(process.execPath, [
    runner,
    "--format", "json",
    "branch.status",
    "--repo", process.cwd(),
  ], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  const elapsed = performance.now() - started;
  if (result.status !== 0) {
    process.stderr.write(result.stdout || result.stderr || "benchmark failed\n");
    process.exitCode = 1;
    break;
  }
  JSON.parse(result.stdout);
  if (index > 0) samples.push(Number(elapsed.toFixed(2)));
}

if (!process.exitCode) {
  const sorted = [...samples].sort((left, right) => left - right);
  process.stdout.write(`${JSON.stringify({
    benchmark: "github-writer.branch-status-process",
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    samples_ms: samples,
    median_ms: sorted[Math.floor(sorted.length / 2)],
    threshold: "informational-os-specific-baseline",
  }, null, 2)}\n`);
}
