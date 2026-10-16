import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  BENCHMARK_SCHEMA_VERSION,
  parseBenchmarkArgs,
  runBenchmark,
} from "../scripts/github-writer-benchmark.mjs";

test("benchmark scenarios measure cold and warm fixed-runner paths without model calls", (t) => {
  const destination = mkdtempSync(path.join(os.tmpdir(), "github-writer-benchmark-output-"));
  t.after(() => rmSync(destination, { force: true, recursive: true }));
  const result = runBenchmark({
    iterations: 1,
    warmup: 0,
    scenarios: ["mechanical", "writing", "approval"],
    save: false,
    repo: destination,
    maxWarmP50Ms: null,
  });
  assert.equal(result.schema_version, BENCHMARK_SCHEMA_VERSION);
  assert.match(result.platform.git, /^git version /);
  assert.equal(result.scenarios.length, 3);
  for (const scenario of result.scenarios) {
    assert.equal(scenario.cold_process.samples_ms.length, 1);
    assert.equal(scenario.warm_process.samples_ms.length, 1);
    assert.equal(scenario.warm_process.failure_rate, 0);
    assert.ok(scenario.warm_process.structured_result_bytes > 0);
    assert.ok(scenario.warm_process.human_output_bytes > 0);
    assert.equal(scenario.workflow_contract.network_access, "none");
    assert.equal(scenario.workflow_contract.remote_mutation, false);
  }
  assert.equal(result.scenarios.find((entry) => entry.scenario === "writing").expected_model_post, true);
});

test("benchmark parser keeps scenarios explicit and rejects accidental duplication", () => {
  assert.deepEqual(parseBenchmarkArgs(["--iterations", "2", "--warmup", "0", "--scenario", "writing", "--no-save"]), {
    iterations: 2,
    warmup: 0,
    scenarios: ["writing"],
    save: false,
    repo: process.cwd(),
    maxWarmP50Ms: null,
  });
  assert.throws(() => parseBenchmarkArgs(["--scenario", "writing", "--scenario", "writing"]), /duplicate/);
});
