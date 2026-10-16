#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";

import { operationalBase, normalizeResultPath, writeFileAtomic } from "./github-writer-core.mjs";
import { runCli } from "./github-writer-run.mjs";
import { PRODUCT_VERSION, workflowById } from "./github-writer-workflow-manifest.mjs";

export const BENCHMARK_SCHEMA_VERSION = "github-writer.benchmark/v2";
export const SCENARIOS = Object.freeze({
  mechanical: Object.freeze({
    workflow: "branch.status",
    class: "mechanical",
    description: "Fixed local branch-status check with normal run-record writes.",
    agent_calls: 0,
    model_post: false,
  }),
  writing: Object.freeze({
    workflow: "pr.evidence",
    class: "writing",
    description: "Bounded PR evidence used by exactly one later writing pass.",
    agent_calls: 1,
    model_post: true,
  }),
  approval: Object.freeze({
    workflow: "pr.recommit.preflight",
    class: "approval",
    description: "Sealed recommit preflight and approval handoff; no Git mutation.",
    agent_calls: 0,
    model_post: false,
  }),
});

const runner = fileURLToPath(new URL("./github-writer-run.mjs", import.meta.url));

function fail(message) {
  throw new Error(`github-writer benchmark: ${message}`);
}

function positiveInteger(value, name, minimum = 0) {
  if (!/^\d+$/.test(value ?? "")) fail(`${name} must be an integer`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) fail(`${name} must be at least ${minimum}`);
  return parsed;
}

export function parseBenchmarkArgs(argv = process.argv.slice(2)) {
  const options = {
    iterations: 5,
    warmup: 1,
    scenarios: [],
    save: true,
    repo: process.cwd(),
    maxWarmP50Ms: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--iterations") options.iterations = positiveInteger(argv[++index], "--iterations", 1);
    else if (argument === "--warmup") options.warmup = positiveInteger(argv[++index], "--warmup", 0);
    else if (argument === "--scenario") {
      const scenario = argv[++index];
      if (!Object.hasOwn(SCENARIOS, scenario)) fail(`--scenario must be one of: ${Object.keys(SCENARIOS).join(", ")}`);
      if (options.scenarios.includes(scenario)) fail(`duplicate --scenario ${scenario}`);
      options.scenarios.push(scenario);
    } else if (argument === "--repo") {
      options.repo = argv[++index] || fail("--repo requires a value");
    } else if (argument === "--max-warm-p50-ms") {
      options.maxWarmP50Ms = positiveInteger(argv[++index], "--max-warm-p50-ms", 1);
    } else if (argument === "--save") options.save = true;
    else if (argument === "--no-save") options.save = false;
    else if (argument === "--help") return { help: true };
    else fail(`unknown argument ${argument}`);
  }
  if (options.scenarios.length === 0) options.scenarios = Object.keys(SCENARIOS);
  return options;
}

function git(root, args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    shell: false,
    windowsHide: true,
  });
  if (result.status !== 0) fail(`fixture git ${args[0]} failed: ${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), "github-writer-benchmark-"));
  git(root, ["init", "-b", "feature/benchmark"]);
  git(root, ["config", "user.name", "GitHub Writer Benchmark"]);
  git(root, ["config", "user.email", "github-writer-benchmark@example.invalid"]);
  writeFileSync(path.join(root, ".gitignore"), "workplace/\n", "utf8");
  writeFileSync(path.join(root, "README.md"), "base\n", "utf8");
  git(root, ["add", "."]);
  git(root, ["commit", "-m", "Base"]);
  const base = git(root, ["rev-parse", "HEAD"]);
  git(root, ["update-ref", "refs/remotes/origin/devel", base]);
  writeFileSync(path.join(root, "README.md"), "first change\n", "utf8");
  writeFileSync(path.join(root, "PR_DRAFT.md"), "Benchmark PR\n\n- bounded fixture\n", "utf8");
  git(root, ["add", "."]);
  git(root, ["commit", "-m", "First change"]);
  writeFileSync(path.join(root, "second.md"), "second change\n", "utf8");
  git(root, ["add", "."]);
  git(root, ["commit", "-m", "Second change"]);
  return root;
}

function scenarioArgs(name, root) {
  const scenario = SCENARIOS[name];
  if (name === "approval") return [scenario.workflow, "--repo", root, "--base", "origin/devel", "--pr-draft", "PR_DRAFT.md"];
  return [scenario.workflow, "--repo", root];
}

function summary(samples) {
  const sorted = [...samples].sort((left, right) => left - right);
  const percentile = (ratio) => sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
  return {
    samples_ms: samples.map((value) => Number(value.toFixed(2))),
    min_ms: Number(sorted[0].toFixed(2)),
    p50_ms: Number(percentile(0.5).toFixed(2)),
    median_ms: Number(percentile(0.5).toFixed(2)),
    p95_ms: Number(percentile(0.95).toFixed(2)),
    max_ms: Number(sorted.at(-1).toFixed(2)),
  };
}

function coldProcess(args) {
  const started = performance.now();
  const result = spawnSync(process.execPath, [runner, "--format", "json", ...args], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    shell: false,
    windowsHide: true,
  });
  const elapsed = performance.now() - started;
  if (result.status !== 0) fail(result.stderr || result.stdout || "cold runner failed");
  return { elapsed, result: JSON.parse(result.stdout) };
}

function warmProcess(args) {
  const writes = [];
  const originalWrite = process.stdout.write;
  process.stdout.write = (chunk, encoding, callback) => {
    writes.push(Buffer.isBuffer(chunk) ? chunk.toString(encoding) : String(chunk));
    if (typeof callback === "function") callback();
    return true;
  };
  try {
    const started = performance.now();
    const status = runCli(["--format", "json", ...args]);
    const elapsed = performance.now() - started;
    if (status !== 0) fail(writes.join("") || "warm runner failed");
    return { elapsed, result: JSON.parse(writes.join("")) };
  } finally {
    process.stdout.write = originalWrite;
  }
}

function runMeasurements(run, args, warmup, iterations) {
  for (let index = 0; index < warmup; index += 1) run(args);
  const samples = [];
  let lastResult;
  for (let index = 0; index < iterations; index += 1) {
    const measured = run(args);
    samples.push(measured.elapsed);
    lastResult = measured.result;
  }
  const structured = JSON.stringify(lastResult);
  return {
    ...summary(samples),
    failure_rate: 0,
    structured_result_bytes: Buffer.byteLength(structured, "utf8"),
    human_output_bytes: Buffer.byteLength(lastResult.human_output ?? "", "utf8"),
  };
}

function scenarioResult(name, root, options) {
  const definition = SCENARIOS[name];
  const args = scenarioArgs(name, root);
  const workflow = workflowById(definition.workflow);
  return {
    scenario: name,
    scenario_class: definition.class,
    description: definition.description,
    workflow: definition.workflow,
    workflow_contract: {
      runtime_references: workflow.runtime_references,
      design_references: workflow.design_references,
      allowed_executables: workflow.allowed_executables,
      network_access: workflow.network_access,
      remote_mutation: workflow.remote_mutation,
    },
    expected_agent_calls: definition.agent_calls,
    expected_model_post: definition.model_post,
    expected_model_invocations_after_runner: definition.model_post ? 1 : 0,
    token_metrics: { input_tokens: null, output_tokens: null, total_tokens: null },
    runtime_reference_files: {
      count: workflow.runtime_references.length,
      bytes: 0,
    },
    cold_process: runMeasurements(coldProcess, args, 0, options.iterations),
    warm_process: runMeasurements(warmProcess, args, options.warmup, options.iterations),
  };
}

export function runBenchmark(options = parseBenchmarkArgs()) {
  if (options.help) {
    process.stdout.write("Usage: node github-writer-benchmark.mjs [--iterations <n>] [--warmup <n>] [--scenario mechanical|writing|approval] [--max-warm-p50-ms <n>] [--repo <path>] [--save|--no-save]\n");
    return null;
  }
  const root = fixture();
  try {
    const gitVersion = git(root, ["--version"]);
    const result = {
      schema_version: BENCHMARK_SCHEMA_VERSION,
      product_version: PRODUCT_VERSION,
      generated_at: new Date().toISOString(),
      platform: { os: process.platform, arch: process.arch, node: process.version, git: gitVersion },
      benchmark_policy: {
        comparison: "Compare only the same scenario on the same OS, architecture, Node.js major version, and Git version.",
        metrics: ["cold_process.p50_ms", "warm_process.p50_ms", "warm_process.structured_result_bytes", "warm_process.human_output_bytes"],
        token_metrics: "not measured: the fixed runner invokes no model; expected Agent/model participation is declared per scenario",
        run_records: true,
        fixture: "isolated local Git repository; no network and no remote mutation",
      },
      iterations: options.iterations,
      warmup: options.warmup,
      max_warm_p50_ms: options.maxWarmP50Ms,
      scenarios: options.scenarios.map((name) => scenarioResult(name, root, options)),
    };
    result.thresholds = options.maxWarmP50Ms === null ? null : result.scenarios.map((scenario) => ({
      scenario: scenario.scenario,
      max_warm_p50_ms: options.maxWarmP50Ms,
      observed_warm_p50_ms: scenario.warm_process.p50_ms,
      passed: scenario.warm_process.p50_ms <= options.maxWarmP50Ms,
    }));
    if (options.save) {
      const destinationRoot = path.resolve(options.repo);
      const destination = path.join(operationalBase(destinationRoot), "benchmarks", `${new Date().toISOString().replaceAll(/[:.]/g, "-")}-${process.platform}.json`);
      writeFileAtomic(destination, `${JSON.stringify(result, null, 2)}\n`);
      result.saved_path = normalizeResultPath(path.relative(destinationRoot, destination));
    }
    if (result.thresholds?.some((threshold) => !threshold.passed)) {
      fail(`warm p50 exceeded --max-warm-p50-ms ${options.maxWarmP50Ms}`);
    }
    return result;
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = runBenchmark();
    if (result) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
