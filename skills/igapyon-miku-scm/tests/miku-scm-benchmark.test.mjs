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
  assert.equal(
    parseArgs(["--scenario", "writing-issue-prepare"]).scenario,
    "writing-issue-prepare",
  );
  assert.equal(
    parseArgs(["--scenario", "github-issue-create-preflight"]).scenario,
    "github-issue-create-preflight",
  );
  for (const scenario of [
    "writing-issue-update-prepare",
    "writing-issue-comment-prepare",
    "github-issue-label-preflight",
    "github-issue-close-preflight",
  ]) {
    assert.equal(parseArgs(["--scenario", scenario]).scenario, scenario);
  }
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
  assert.equal(result.schema_version, "miku-scm.benchmark/v2");
  assert.equal(result.workflow_class, "mechanical");
  assert.equal(result.remote_mutation_invoked, false);
  assert.equal(result.cold.samples.length, 2);
  assert.equal(result.warm.samples.length, 2);
  assert.equal(result.warm.observed_fixed_gh_reads, 2);
  assert.equal(result.budget.status, "passed");
  assert.equal(result.fixture.expected_ai_tool_calls_per_sample, 1);
  assert.equal(result.fixture.expected_agent_tool_calls_per_sample, 1);
  assert.equal(result.fixture.model_invocations, null);
  assert.equal(result.fixture.expected_model_invocations_after_runner, 0);
  assert.equal(result.fixture.observed_failure_rate, 0);
  assert.ok(result.fixture.structured_result_bytes > result.fixture.human_output_bytes);
  assert.ok(result.fixture.human_output_bytes > 0);
  assert.equal(
    result.fixture.human_output_schema_version,
    "miku-scm.human-output/v9",
  );
  assert.equal(result.context.file_count, 1);
  assert.deepEqual(result.context.files, ["skills/igapyon-miku-scm/SKILL.md"]);
  assert.ok(result.context.bytes > 0);
});

test("benchmark exposes comparable writing and approval profiles", async () => {
  const profiles = [];
  for (const scenario of [
    "writing-issue-prepare",
    "writing-issue-update-prepare",
    "writing-issue-comment-prepare",
    "github-issue-create-preflight",
    "github-issue-label-preflight",
    "github-issue-close-preflight",
  ]) {
    profiles.push(await benchmark(parseArgs([
      "--scenario", scenario, "--iterations", "1", "--warmup", "0",
    ]), {
      cwd: process.cwd(),
      script: BENCHMARK_SCRIPT,
      now: () => new Date("2026-07-28T13:00:00Z"),
    }));
  }

  assert.deepEqual(
    profiles.map((entry) => entry.workflow_class),
    ["writing", "writing", "writing", "approval", "approval", "approval"],
  );
  assert.deepEqual(
    profiles.map((entry) => entry.fixture.expected_model_invocations_after_runner),
    [1, 1, 1, 0, 0, 0],
  );
  for (const profile of profiles) {
    assert.equal(profile.remote_mutation_invoked, false);
    assert.equal(profile.fixture.expected_agent_tool_calls_per_sample, 1);
    assert.equal(profile.fixture.observed_failure_rate, 0);
    assert.ok(profile.warm.p50_ms >= 0);
  }
});
