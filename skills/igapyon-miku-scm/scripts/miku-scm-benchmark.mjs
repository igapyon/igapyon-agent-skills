#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

import { runWorkflow } from "./miku-scm-run.mjs";
import { workflowManifestById } from "./miku-scm-workflow-manifest.mjs";

const SCENARIOS = new Set([
  "github-issue-read",
  "writing-issue-prepare",
  "writing-issue-update-prepare",
  "writing-issue-comment-prepare",
  "github-issue-create-preflight",
  "github-issue-label-preflight",
  "github-issue-close-preflight",
]);
const SCENARIO_WORKFLOW = Object.freeze({
  "github-issue-read": "github.issue.read",
  "writing-issue-prepare": "writing.issue.prepare",
  "writing-issue-update-prepare": "writing.issue.prepare",
  "writing-issue-comment-prepare": "writing.issue.prepare",
  "github-issue-create-preflight": "github.issue.create.preflight",
  "github-issue-label-preflight": "github.issue.label.preflight",
  "github-issue-close-preflight": "github.issue.close.preflight",
});
const SCENARIO_CLASS = Object.freeze({
  "github-issue-read": "mechanical",
  "writing-issue-prepare": "writing",
  "writing-issue-update-prepare": "writing",
  "writing-issue-comment-prepare": "writing",
  "github-issue-create-preflight": "approval",
  "github-issue-label-preflight": "approval",
  "github-issue-close-preflight": "approval",
});
const EXPECTED_MODEL_INVOCATIONS_AFTER_RUNNER = Object.freeze({
  "github-issue-read": 0,
  "writing-issue-prepare": 1,
  "writing-issue-update-prepare": 1,
  "writing-issue-comment-prepare": 1,
  "github-issue-create-preflight": 0,
  "github-issue-label-preflight": 0,
  "github-issue-close-preflight": 0,
});
const FIXED_GH_READS_PER_SAMPLE = Object.freeze({
  "github-issue-read": 1,
  "writing-issue-prepare": 1,
  "writing-issue-update-prepare": 2,
  "writing-issue-comment-prepare": 1,
  "github-issue-create-preflight": 1,
  "github-issue-label-preflight": 2,
  "github-issue-close-preflight": 1,
});

export const usage = `Usage:
  node skills/igapyon-miku-scm/scripts/miku-scm-benchmark.mjs \
    [--scenario github-issue-read|writing-issue-prepare|writing-issue-update-prepare|writing-issue-comment-prepare|github-issue-create-preflight|github-issue-label-preflight|github-issue-close-preflight] \
    [--iterations <1..100>] [--warmup <0..20>] \
    [--max-warm-p50-ms <milliseconds>] [--save]

The benchmark is remote-free and never invokes a GitHub mutation. It reports
cold and warm p50/p95 measurements separately.`;

export function parseArgs(argv) {
  const options = {
    scenario: "github-issue-read",
    iterations: 10,
    warmup: 2,
    maxWarmP50Ms: null,
    save: false,
    internalWorker: false,
    artifactRoot: "",
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--scenario") options.scenario = argv[++index] ?? "";
    else if (arg === "--iterations") options.iterations = Number(argv[++index]);
    else if (arg === "--warmup") options.warmup = Number(argv[++index]);
    else if (arg === "--max-warm-p50-ms") options.maxWarmP50Ms = Number(argv[++index]);
    else if (arg === "--save") options.save = true;
    else if (arg === "--internal-worker") options.internalWorker = true;
    else if (arg === "--artifact-root") options.artifactRoot = argv[++index] ?? "";
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (options.help) return options;
  if (!SCENARIOS.has(options.scenario)) throw new Error("Unsupported benchmark scenario");
  if (!Number.isSafeInteger(options.iterations) || options.iterations < 1 || options.iterations > 100) {
    throw new Error("--iterations must be an integer from 1 through 100");
  }
  if (!Number.isSafeInteger(options.warmup) || options.warmup < 0 || options.warmup > 20) {
    throw new Error("--warmup must be an integer from 0 through 20");
  }
  if (options.maxWarmP50Ms !== null
    && (!Number.isFinite(options.maxWarmP50Ms) || options.maxWarmP50Ms <= 0)) {
    throw new Error("--max-warm-p50-ms must be a positive number");
  }
  if (options.internalWorker) {
    const resolved = path.resolve(options.artifactRoot);
    const temporaryRoot = path.resolve(os.tmpdir());
    if (!options.artifactRoot || (resolved !== temporaryRoot
      && !resolved.startsWith(`${temporaryRoot}${path.sep}`))) {
      throw new Error("Internal worker artifact root must be beneath the system temporary directory");
    }
  } else if (options.artifactRoot) {
    throw new Error("--artifact-root is reserved for the internal worker");
  }
  return options;
}

export function percentile(samples, ratio) {
  if (!Array.isArray(samples) || samples.length === 0) throw new Error("samples must not be empty");
  const ordered = [...samples].sort((left, right) => left - right);
  const index = Math.min(ordered.length - 1, Math.ceil(ratio * ordered.length) - 1);
  return ordered[Math.max(0, index)];
}

function rounded(value) {
  return Math.round(value * 1000) / 1000;
}

function statistics(samples) {
  return {
    samples: samples.map(rounded),
    p50_ms: rounded(percentile(samples, 0.50)),
    p95_ms: rounded(percentile(samples, 0.95)),
    min_ms: rounded(Math.min(...samples)),
    max_ms: rounded(Math.max(...samples)),
  };
}

function fakeGh(counter, mode) {
  return (args) => {
    counter.gh += 1;
    if (mode === "labels" || args[0] === "label") {
      return {
        ok: true,
        status: 0,
        stderr: "",
        stdout: JSON.stringify([
          { name: "enhancement", description: "New feature", color: "a2eeef" },
        ]),
        args,
      };
    }
    return {
      ok: true,
      status: 0,
      stderr: "",
      stdout: JSON.stringify({
        number: 293,
        state: "OPEN",
        title: "Runner",
        body: "Benchmark fixture",
        url: "https://github.com/igapyon/igapyon-agent-skills/issues/293",
        updatedAt: "2026-07-27T13:00:00Z",
        labels: [{ name: "enhancement" }],
        comments: [],
      }),
      args,
    };
  };
}

function fakeWritingGit(root) {
  return (_cwd, args) => {
    const command = args.join(" ");
    const values = new Map([
      ["rev-parse --show-toplevel", root],
      ["branch --show-current", "devel-benchmark"],
      ["rev-parse HEAD", "a".repeat(40)],
    ]);
    if (!values.has(command)) throw new Error(`Unexpected benchmark git command: ${command}`);
    return { ok: true, out: values.get(command), err: "" };
  };
}

async function missingDocument() {
  const error = new Error("missing");
  error.code = "ENOENT";
  throw error;
}

async function runFixture(scenario, fixtureRoot, runId, counter = { gh: 0 }) {
  await mkdir(fixtureRoot, { recursive: true });
  const common = {
    cwd: fixtureRoot,
    artifactRoot: path.join(fixtureRoot, "runs"),
    runId,
  };
  let result;
  if (scenario === "github-issue-read") {
    result = await runWorkflow("github.issue.read", [
      "--repo", "igapyon/igapyon-agent-skills", "--issue", "293",
    ], {
      ...common,
      gh: fakeGh(counter, "issue"),
    });
  } else if (scenario === "writing-issue-prepare") {
    result = await runWorkflow("writing.issue.prepare", [
      "--repo", fixtureRoot,
      "--github-repo", "igapyon/igapyon-agent-skills",
    ], {
      ...common,
      writingGit: fakeWritingGit(fixtureRoot),
      writingReadFile: missingDocument,
      gh: fakeGh(counter, "labels"),
    });
  } else if (scenario === "writing-issue-update-prepare"
    || scenario === "writing-issue-comment-prepare") {
    const operation = scenario === "writing-issue-update-prepare" ? "update" : "comment";
    result = await runWorkflow("writing.issue.prepare", [
      "--repo", fixtureRoot,
      "--github-repo", "igapyon/igapyon-agent-skills",
      "--operation", operation,
      "--issue", "293",
    ], {
      ...common,
      writingGit: fakeWritingGit(fixtureRoot),
      writingReadFile: missingDocument,
      gh: fakeGh(counter, operation),
    });
  } else if (scenario === "github-issue-create-preflight") {
    const draft = path.join(
      fixtureRoot,
      "workplace/miku-scm/new-issues/issue-new-202607282200.md",
    );
    await mkdir(path.dirname(draft), { recursive: true });
    await writeFile(draft, "Benchmark approval\n\nRemote-free fixture.\n", "utf8");
    result = await runWorkflow("github.issue.create.preflight", [
      "--repo", "igapyon/igapyon-agent-skills",
      "--draft", draft,
      "--label", "enhancement",
      "--root", fixtureRoot,
    ], {
      ...common,
      issueCreateDependencies: {
        readLabels: async () => {
          counter.gh += 1;
          return ["enhancement"];
        },
      },
    });
  } else if (scenario === "github-issue-label-preflight") {
    result = await runWorkflow("github.issue.label.preflight", [
      "--repo", "igapyon/igapyon-agent-skills",
      "--issue", "293",
      "--add-label", "enhancement",
      "--root", fixtureRoot,
    ], {
      ...common,
      issueLabelDependencies: {
        readLabels: async () => {
          counter.gh += 1;
          return ["enhancement"];
        },
        readIssue: async () => {
          counter.gh += 1;
          return {
            number: 293,
            url: "https://github.com/igapyon/igapyon-agent-skills/issues/293",
            title: "Runner",
            state: "OPEN",
            labels: [],
            updatedAt: "2026-07-27T13:00:00Z",
          };
        },
      },
    });
  } else {
    result = await runWorkflow("github.issue.close.preflight", [
      "--repo", "igapyon/igapyon-agent-skills",
      "--issue", "293",
      "--reason", "completed",
      "--root", fixtureRoot,
    ], {
      ...common,
      issueCloseDependencies: {
        readIssue: async () => {
          counter.gh += 1;
          return {
            number: 293,
            url: "https://github.com/igapyon/igapyon-agent-skills/issues/293",
            title: "Runner",
            body: "Benchmark fixture",
            state: "OPEN",
            stateReason: null,
            updatedAt: "2026-07-27T13:00:00Z",
          };
        },
      },
    });
  }
  if (result.status !== "success") throw new Error(`Benchmark fixture failed: ${result.status}`);
  return result;
}

async function contextMetrics(root, scenario) {
  const workflow = workflowManifestById().get(SCENARIO_WORKFLOW[scenario]);
  if (!workflow) throw new Error(`Benchmark workflow is not in the manifest: ${scenario}`);
  const files = [
    "skills/igapyon-miku-scm/SKILL.md",
    ...workflow.runtime_references.map(
      (reference) => `skills/igapyon-miku-scm/references/${reference}`,
    ),
  ];
  let bytes = 0;
  for (const file of files) bytes += (await stat(path.join(root, file))).size;
  return { files, file_count: files.length, bytes };
}

async function writeJsonAtomic(file, value) {
  const temporary = `${file}.tmp-${process.pid}-${randomUUID()}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, file);
}

async function saveResult(root, result) {
  const directory = path.join(root, "workplace", "miku-scm", "benchmarks");
  await mkdir(directory, { recursive: true });
  const stamp = result.measured_at.replace(/[-:.TZ]/g, "");
  const file = path.join(directory, `benchmark-${result.scenario}-${stamp}.json`);
  await writeJsonAtomic(file, result);
  return path.relative(root, file);
}

async function internalWorker(options) {
  await runFixture(options.scenario, options.artifactRoot, `cold-${randomUUID()}`);
  process.stdout.write('{"status":"ok"}\n');
}

export async function benchmark(options, dependencies = {}) {
  const root = path.resolve(dependencies.cwd ?? process.cwd());
  const temporary = await mkdtemp(path.join(os.tmpdir(), "miku-scm-benchmark-"));
  const script = path.resolve(dependencies.script ?? process.argv[1]);
  const spawn = dependencies.spawn ?? spawnSync;
  try {
    const warmCounter = { gh: 0 };
    let lastWarmResult = null;
    for (let index = 0; index < options.warmup; index += 1) {
      await runFixture(
        options.scenario,
        path.join(temporary, "warm-fixture"),
        `warmup-${index}`,
        warmCounter,
      );
    }
    const warm = [];
    for (let index = 0; index < options.iterations; index += 1) {
      const started = performance.now();
      lastWarmResult = await runFixture(
        options.scenario,
        path.join(temporary, "warm-fixture"),
        `warm-${index}`,
        warmCounter,
      );
      warm.push(performance.now() - started);
    }

    const cold = [];
    for (let index = 0; index < options.iterations; index += 1) {
      const artifactRoot = path.join(temporary, "cold", String(index));
      const started = performance.now();
      const child = spawn(process.execPath, [
        script,
        "--scenario", options.scenario,
        "--iterations", "1",
        "--warmup", "0",
        "--internal-worker",
        "--artifact-root", artifactRoot,
      ], { cwd: root, encoding: "utf8" });
      cold.push(performance.now() - started);
      if (child.status !== 0) {
        throw new Error(`Cold benchmark worker failed: ${(child.stderr || child.stdout || "").trim()}`);
      }
    }

    const warmStats = statistics(warm);
    const result = {
      schema_version: "miku-scm.benchmark/v2",
      scenario: options.scenario,
      workflow_class: SCENARIO_CLASS[options.scenario],
      measured_at: (dependencies.now ? dependencies.now() : new Date()).toISOString(),
      iterations: options.iterations,
      warmup_iterations: options.warmup,
      remote_mutation_invoked: false,
      comparison_dimensions: [
        "expected_model_invocations_after_runner",
        "expected_agent_tool_calls_per_sample",
        "elapsed_time_ms",
        "observed_failure_rate",
      ],
      fixture: {
        runner_invocations_per_sample: 1,
        expected_agent_tool_calls_per_sample: 1,
        expected_ai_tool_calls_per_sample: 1,
        expected_model_invocations_after_runner:
          EXPECTED_MODEL_INVOCATIONS_AFTER_RUNNER[options.scenario],
        fixed_gh_reads_per_warm_sample: FIXED_GH_READS_PER_SAMPLE[options.scenario],
        actual_network_requests_per_sample: 0,
        input_tokens: null,
        output_tokens: null,
        model_invocations: null,
        structured_result_bytes: Buffer.byteLength(JSON.stringify(lastWarmResult), "utf8"),
        human_output_bytes: Buffer.byteLength(lastWarmResult.human_output, "utf8"),
        human_output_schema_version: lastWarmResult.human_output_schema_version,
        observed_failures: 0,
        observed_failure_rate: 0,
      },
      context: await contextMetrics(root, options.scenario),
      cold: {
        ...statistics(cold),
        process_spawns_per_sample: 1,
      },
      warm: {
        ...warmStats,
        process_spawns_per_sample: 0,
        observed_fixed_gh_reads: warmCounter.gh - options.warmup,
      },
      budget: {
        max_warm_p50_ms: options.maxWarmP50Ms,
        status: options.maxWarmP50Ms === null
          ? "not-configured"
          : warmStats.p50_ms <= options.maxWarmP50Ms ? "passed" : "failed",
      },
    };
    if (options.save) result.saved_result = await saveResult(root, result);
    return result;
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage}\n`);
    return;
  }
  if (options.internalWorker) {
    await internalWorker(options);
    return;
  }
  const result = await benchmark(options);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.budget.status === "failed") process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({ status: "error", message: error.message })}\n`);
    process.exitCode = 1;
  });
}
