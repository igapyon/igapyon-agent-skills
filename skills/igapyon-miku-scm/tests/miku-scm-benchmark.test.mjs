import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  benchmark,
  parseArgs,
  percentile,
} from "../scripts/miku-scm-benchmark.mjs";

const BENCHMARK_SCRIPT = fileURLToPath(new URL("../scripts/miku-scm-benchmark.mjs", import.meta.url));

test("benchmark parser fixes scenario and bounded iteration counts", () => {
  assert.equal(parseArgs([]).scenario, "github-issue-read");
  assert.throws(() => parseArgs(["--scenario", "remote-mutation"]), /Unsupported/);
  assert.throws(() => parseArgs(["--iterations", "0"]), /1 through 100/);
  assert.throws(() => parseArgs(["--warmup", "21"]), /0 through 20/);
  assert.throws(() => parseArgs(["--artifact-root", "/tmp/example"]), /reserved/);
});

test("percentile uses the nearest-rank result", () => {
  assert.equal(percentile([5, 1, 3, 2, 4], 0.5), 3);
  assert.equal(percentile([5, 1, 3, 2, 4], 0.95), 5);
});

test("benchmark separates cold and warm metrics without remote mutation", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "miku-scm-benchmark-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const result = await benchmark(parseArgs([
    "--iterations", "2", "--warmup", "1", "--max-warm-p50-ms", "1000",
  ]), {
    cwd: process.cwd(),
    script: BENCHMARK_SCRIPT,
    now: () => new Date("2026-07-27T15:00:00Z"),
  });
  assert.equal(result.schema_version, "miku-scm.benchmark/v1");
  assert.equal(result.remote_mutation_invoked, false);
  assert.equal(result.cold.samples.length, 2);
  assert.equal(result.warm.samples.length, 2);
  assert.equal(result.warm.observed_fixed_gh_reads, 2);
  assert.equal(result.budget.status, "passed");
  assert.equal(result.fixture.expected_ai_tool_calls_per_sample, 1);
  assert.ok(result.context.bytes > 0);
});
