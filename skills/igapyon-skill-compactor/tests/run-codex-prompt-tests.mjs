#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assessDeterministic,
  assessEvaluatorResult,
  assertNoOracleLeak,
  directoryBytes,
  parseCodexEvents,
  readJsonl,
  sha256File,
  substitutePrompt,
  summarizeTrace,
} from "./harness-lib.mjs";

const testsDir = dirname(fileURLToPath(import.meta.url));
const skillDir = resolve(testsDir, "..");
const repoDir = resolve(skillDir, "../..");
const skillName = basename(skillDir);

function usage() {
  console.log(`Usage:
  node skills/igapyon-skill-compactor/tests/run-codex-prompt-tests.mjs [options]

Options:
  --file <path>       JSONL test file; repeatable. Defaults to all prompt files.
  --case <id>         Run only one case id.
  --out-dir <path>    New run directory. Default: workplace/skill-compactor-tests/<run-id>.
  --codex-bin <cmd>   Codex executable. Default: codex.
  --model <model>     Required for non-dry runs unless CODEX_TEST_MODEL is set.
  --reasoning <mode>  Reasoning effort. Default: medium.
  --timeout-ms <ms>   Per Codex subprocess timeout. Default: 180000.
  --repeat <count>    Repeat every selected case in fresh sessions. Default: 1.
  --source-only       Allow source/installed drift during development.
  --no-evaluator      Skip semantic evaluator; deterministic assertions still run.
  --dry-run           Print planned cases without invoking Codex.
  --persist-session   Do not pass --ephemeral.
  --keep-temp         Keep disposable Codex homes and workspaces for debugging.
  --help              Show this help.
`);
}

function requireValue(argv, index, option) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${option} requires a value`);
  return value;
}

function runId() {
  return `${new Date().toISOString().replace(/[-:.]/g, "").replace("Z", "Z")}-${process.pid}`;
}

function parseArgs(argv) {
  const args = {
    files: [],
    caseId: null,
    outDir: null,
    codexBin: "codex",
    model: process.env.CODEX_TEST_MODEL ?? null,
    reasoning: process.env.CODEX_TEST_REASONING ?? "medium",
    timeoutMs: Number(process.env.CODEX_TEST_TIMEOUT_MS ?? 180000),
    repeat: 1,
    sourceOnly: false,
    evaluator: true,
    dryRun: false,
    ephemeral: true,
    keepTemp: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") args.help = true;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--source-only") args.sourceOnly = true;
    else if (arg === "--no-evaluator") args.evaluator = false;
    else if (arg === "--persist-session") args.ephemeral = false;
    else if (arg === "--keep-temp") args.keepTemp = true;
    else if (arg === "--file") args.files.push(resolve(repoDir, requireValue(argv, index++, arg)));
    else if (arg === "--case") args.caseId = requireValue(argv, index++, arg);
    else if (arg === "--out-dir") args.outDir = resolve(repoDir, requireValue(argv, index++, arg));
    else if (arg === "--codex-bin") args.codexBin = requireValue(argv, index++, arg);
    else if (arg === "--model") args.model = requireValue(argv, index++, arg);
    else if (arg === "--reasoning") args.reasoning = requireValue(argv, index++, arg);
    else if (arg === "--timeout-ms") args.timeoutMs = Number(requireValue(argv, index++, arg));
    else if (arg === "--repeat") args.repeat = Number(requireValue(argv, index++, arg));
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (args.files.length === 0) {
    args.files = [
      join(testsDir, "activation-prompts.jsonl"),
      join(testsDir, "behavior-prompts.jsonl"),
      join(testsDir, "reference-routing-prompts.jsonl"),
    ];
  }
  args.outDir ??= join(repoDir, "workplace", "skill-compactor-tests", runId());
  if (!Number.isInteger(args.timeoutMs) || args.timeoutMs < 1000) {
    throw new Error("--timeout-ms must be an integer >= 1000");
  }
  if (!Number.isInteger(args.repeat) || args.repeat < 1) {
    throw new Error("--repeat must be an integer >= 1");
  }
  return args;
}

function command(command, argv, options = {}) {
  return spawnSync(command, argv, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  });
}

function commandText(commandName, argv, cwd = repoDir) {
  const result = command(commandName, argv, { cwd });
  if (result.error || result.status !== 0) {
    throw new Error(
      `${commandName} ${argv.join(" ")} failed: ${result.error?.message ?? result.stderr}`,
    );
  }
  return result.stdout.trim();
}

function ensureNewRunDir(outDir) {
  if (existsSync(outDir) && readdirSync(outDir).length > 0) {
    throw new Error(`Refusing to overwrite non-empty run directory: ${outDir}`);
  }
  mkdirSync(outDir, { recursive: true });
}

function realCodexHome() {
  return resolve(process.env.CODEX_HOME ?? join(homedir(), ".codex"));
}

function prepareCodexHome({ includeSkill }) {
  const root = mkdtempSync(join(tmpdir(), `igapyon-skill-compactor-${includeSkill ? "sut" : "eval"}-`));
  const realHome = realCodexHome();
  const auth = join(realHome, "auth.json");
  if (!existsSync(auth)) throw new Error(`Codex auth not found: ${auth}`);
  copyFileSync(auth, join(root, "auth.json"));
  if (includeSkill) {
    const target = join(root, "skills", skillName);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(skillDir, target, { recursive: true });
  }
  return root;
}

function installedSkillPath() {
  return join(realCodexHome(), "skills", skillName, "SKILL.md");
}

function loadCases(args) {
  const cases = args.files
    .flatMap((file) => readJsonl(file))
    .filter((testCase) => !args.caseId || testCase.id === args.caseId);
  if (cases.length === 0) throw new Error("No test cases matched");
  const ids = new Set();
  for (const testCase of cases) {
    if (!testCase.id || !testCase.prompt) throw new Error("Each test requires id and prompt");
    if (ids.has(testCase.id)) throw new Error(`Duplicate test id: ${testCase.id}`);
    ids.add(testCase.id);
  }
  return cases;
}

function codexArgs(args, sandbox, prompt, extra = []) {
  return [
    "exec",
    ...(args.ephemeral ? ["--ephemeral"] : []),
    "--ignore-user-config",
    "--skip-git-repo-check",
    "--model",
    args.model,
    "-c",
    `model_reasoning_effort=\"${args.reasoning}\"`,
    "--sandbox",
    sandbox,
    ...extra,
    "--",
    prompt,
  ];
}

function runSut({ args, testCase, sutHome, workspace, prompt }) {
  const sandbox = testCase.sandbox ?? "read-only";
  return command(args.codexBin, codexArgs(args, sandbox, prompt, ["--json"]), {
    cwd: workspace,
    env: { ...process.env, CODEX_HOME: sutHome },
    stdio: ["ignore", "pipe", "pipe"],
    timeout: args.timeoutMs,
    killSignal: "SIGTERM",
  });
}

function evaluatorInput({ testCase, expectation, sourceText, resultText, trace }) {
  const template = readFileSync(join(testsDir, "evaluator-prompt.md"), "utf8");
  return `${template}\n\n## Raw SUT Artifact\n\n### User prompt\n\n${testCase.prompt}\n\n### Source artifact\n\n\`\`\`markdown\n${sourceText ?? "<none>"}\n\`\`\`\n\n### Result artifact\n\n\`\`\`markdown\n${resultText ?? "<none>"}\n\`\`\`\n\n### SUT final response\n\n${trace.finalText}\n\n## Hidden Expectations\n\n${JSON.stringify({ semanticChecks: testCase.semanticChecks ?? [], expectation }, null, 2)}\n`;
}

function runEvaluator({ args, testCase, expectation, evalHome, workspace, sourceText, resultText, trace, caseDir }) {
  const outputFile = join(caseDir, "evaluator-result.json");
  const prompt = evaluatorInput({ testCase, expectation, sourceText, resultText, trace });
  writeFileSync(join(caseDir, "evaluator-input.md"), prompt);
  const result = command(
    args.codexBin,
    codexArgs(args, "read-only", prompt, [
      "--output-schema",
      join(testsDir, "expected-result-schema.json"),
      "-o",
      outputFile,
    ]),
    {
      cwd: workspace,
      env: { ...process.env, CODEX_HOME: evalHome },
      stdio: ["ignore", "pipe", "pipe"],
      timeout: args.timeoutMs,
      killSignal: "SIGTERM",
    },
  );
  writeFileSync(join(caseDir, "evaluator-stdout.log"), result.stdout ?? "");
  writeFileSync(join(caseDir, "evaluator-stderr.log"), result.stderr ?? "");
  if (result.error || result.status !== 0 || !existsSync(outputFile)) {
    return {
      processStatus: result.status,
      error: result.error?.message ?? result.stderr ?? "evaluator output missing",
      result: null,
    };
  }
  try {
    return { processStatus: result.status, result: JSON.parse(readFileSync(outputFile, "utf8")) };
  } catch (error) {
    return { processStatus: result.status, error: error.message, result: null };
  }
}

function workspaceForCase(testCase) {
  const workspace = mkdtempSync(join(tmpdir(), `igapyon-skill-compactor-case-${testCase.id}-`));
  if (testCase.fixture) {
    cpSync(resolve(testsDir, testCase.fixture), workspace, { recursive: true });
  }
  return workspace;
}

function diffArtifacts(beforeFile, afterFile) {
  if (!existsSync(beforeFile) || !existsSync(afterFile)) return "";
  const result = command("git", ["diff", "--no-index", "--", beforeFile, afterFile]);
  if (result.status !== 0 && result.status !== 1) return result.stderr;
  return result.stdout;
}

function textMetrics(text) {
  if (typeof text !== "string") return null;
  return {
    utf8Bytes: Buffer.byteLength(text, "utf8"),
    lines: text.length === 0 ? 0 : text.split(/\r?\n/).length,
  };
}

function artifactMetrics(sourceText, resultText, expectation) {
  if (typeof sourceText !== "string" || typeof resultText !== "string") return null;
  const required = expectation.requiredSubstrings ?? [];
  const inventory = required.map((value) => ({
    value,
    sourcePresent: sourceText.includes(value),
    resultPresent: resultText.includes(value),
  }));
  return {
    before: textMetrics(sourceText),
    after: textMetrics(resultText),
    changed: sourceText !== resultText,
    requiredInventory: inventory,
    missingRequired: inventory.filter((item) => !item.resultPresent).map((item) => item.value),
  };
}

function executeCase({ args, testCase, sutHome, evalHome, stagedSkillDir, outDir, tempPaths }) {
  const caseDir = join(outDir, testCase.id);
  mkdirSync(caseDir, { recursive: true });
  const workspace = workspaceForCase(testCase);
  tempPaths.push(workspace);
  const target = testCase.target ? resolve(workspace, testCase.target) : null;
  const sourceText = target && existsSync(target) ? readFileSync(target, "utf8") : null;
  if (sourceText !== null) writeFileSync(join(caseDir, "before.md"), sourceText);

  const prompt = substitutePrompt(testCase.prompt, {
    TARGET_SKILL: target ?? workspace,
    WORKSPACE: workspace,
    SOURCE_SKILL: skillDir,
  });
  assertNoOracleLeak(prompt, testCase);
  writeFileSync(join(caseDir, "sut-prompt.txt"), prompt);

  const sut = runSut({ args, testCase, sutHome, workspace, prompt });
  writeFileSync(join(caseDir, "sut-stdout.jsonl"), sut.stdout ?? "");
  writeFileSync(join(caseDir, "sut-stderr.log"), sut.stderr ?? "");
  const parsed = parseCodexEvents(sut.stdout ?? "");
  const trace = summarizeTrace(parsed.events, stagedSkillDir);
  writeFileSync(join(caseDir, "trace-summary.json"), `${JSON.stringify(trace, null, 2)}\n`);

  const resultText = target && existsSync(target) ? readFileSync(target, "utf8") : null;
  if (resultText !== null) {
    writeFileSync(join(caseDir, "after.md"), resultText);
    writeFileSync(
      join(caseDir, "artifact.diff"),
      diffArtifacts(join(caseDir, "before.md"), join(caseDir, "after.md")),
    );
  }

  const deterministic = assessDeterministic({
    testCase: {
      ...testCase,
      forbiddenWriteRoots: [repoDir, skillDir, stagedSkillDir, dirname(installedSkillPath())],
    },
    testsDir,
    trace,
    parseErrors: parsed.errors,
    processStatus: sut.status,
    sourceText,
    resultText,
  });

  let evaluator = null;
  let evaluatorAssessment = { pass: true, assertions: [] };
  if (args.evaluator && (testCase.semanticChecks?.length ?? 0) > 0 && trace.finalText) {
    evaluator = runEvaluator({
      args,
      testCase,
      expectation: deterministic.expected,
      evalHome,
      workspace,
      sourceText,
      resultText,
      trace,
      caseDir,
    });
    evaluatorAssessment = assessEvaluatorResult(evaluator.result, testCase.semanticChecks);
  } else if ((testCase.semanticChecks?.length ?? 0) > 0) {
    evaluatorAssessment = {
      pass: false,
      assertions: [{
        id: "semantic-evaluator",
        pass: false,
        evidence: args.evaluator ? "SUT final response missing" : "evaluator disabled",
      }],
    };
  }

  const result = {
    id: testCase.id,
    kind: testCase.kind,
    status: deterministic.pass && evaluatorAssessment.pass ? "passed" : "failed",
    pass: deterministic.pass && evaluatorAssessment.pass,
    processStatus: sut.status,
    assertions: [...deterministic.assertions, ...evaluatorAssessment.assertions],
    trace: {
      usage: trace.usage,
      skillFilesRead: trace.skillFilesRead,
      commandCount: trace.commands.length,
    },
    artifact: artifactMetrics(sourceText, resultText, deterministic.expected),
    evaluator: evaluator
      ? { processStatus: evaluator.processStatus, error: evaluator.error ?? null }
      : null,
  };
  writeFileSync(join(caseDir, "result.json"), `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  const cases = loadCases(args);
  if (args.dryRun) {
    for (const testCase of cases) {
      console.log(`${testCase.id}\t${testCase.kind ?? "unknown"}\t${testCase.prompt}`);
    }
    return;
  }
  if (!args.model) throw new Error("--model or CODEX_TEST_MODEL is required for reproducible runs");

  ensureNewRunDir(args.outDir);
  const sourceSkillFile = join(skillDir, "SKILL.md");
  const installedFile = installedSkillPath();
  const sourceHash = sha256File(sourceSkillFile);
  const installedHash = existsSync(installedFile) ? sha256File(installedFile) : null;
  if (!args.sourceOnly && sourceHash !== installedHash) {
    throw new Error(
      `Source/installed drift: source=${sourceHash}, installed=${installedHash ?? "missing"}`,
    );
  }

  const sutHome = prepareCodexHome({ includeSkill: true });
  const evalHome = prepareCodexHome({ includeSkill: false });
  const tempPaths = [sutHome, evalHome];
  const stagedSkillDir = join(sutHome, "skills", skillName);
  const stagedHash = sha256File(join(stagedSkillDir, "SKILL.md"));
  if (stagedHash !== sourceHash) throw new Error("Staged Skill hash does not match source");

  const metadata = {
    runId: basename(args.outDir),
    startedAt: new Date().toISOString(),
    gitCommit: commandText("git", ["rev-parse", "HEAD"]),
    codexCli: commandText(args.codexBin, ["--version"]),
    model: args.model,
    reasoning: args.reasoning,
    timeoutMs: args.timeoutMs,
    sourceOnly: args.sourceOnly,
    sourceSkill: { path: skillDir, sha256: sourceHash, bytes: directoryBytes(skillDir) },
    installedSkill: { path: dirname(installedFile), sha256: installedHash },
    stagedSkill: { path: stagedSkillDir, sha256: stagedHash },
    repeat: args.repeat,
    cases: cases.map((testCase) => testCase.id),
  };
  writeFileSync(join(args.outDir, "run-metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`);

  const results = [];
  try {
    for (const testCase of cases) {
      for (let repetition = 1; repetition <= args.repeat; repetition += 1) {
        const repeatedCase = args.repeat === 1
          ? testCase
          : { ...testCase, id: `${testCase.id}--run-${repetition}` };
        const result = executeCase({
          args,
          testCase: repeatedCase,
          sutHome,
          evalHome,
          stagedSkillDir,
          outDir: args.outDir,
          tempPaths,
        });
        results.push(result);
        console.error(`${result.status}: ${result.id}`);
      }
    }
  } finally {
    if (!args.keepTemp) {
      for (const path of tempPaths) rmSync(path, { recursive: true, force: true });
    } else {
      metadata.keptTempPaths = tempPaths;
    }
  }

  const summary = {
    ...metadata,
    completedAt: new Date().toISOString(),
    pass: results.every((result) => result.pass),
    passed: results.filter((result) => result.pass).length,
    failed: results.filter((result) => !result.pass).length,
    results,
  };
  writeFileSync(join(args.outDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(join(args.outDir, "summary.json"));
  if (!summary.pass) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
}
