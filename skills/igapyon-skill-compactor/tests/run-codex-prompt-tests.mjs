#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillDir = resolve(__dirname, "..");
const repoDir = resolve(skillDir, "../..");

function usage() {
  console.log(`Usage:
  node skills/igapyon-skill-compactor/tests/run-codex-prompt-tests.mjs [options]

Options:
  --file <path>       JSONL test file. Defaults to all prompt JSONL files.
  --case <id>         Run only one case id.
  --out-dir <path>    Output directory. Default: skills/igapyon-skill-compactor/tests/results
  --codex-bin <cmd>   Codex executable. Default: codex
  --dry-run           Print planned cases without invoking Codex.
  --persist-session   Do not pass --ephemeral to codex exec.
  --help              Show this help.
`);
}

function parseArgs(argv) {
  const args = {
    files: [],
    caseId: null,
    outDir: join(__dirname, "results"),
    codexBin: "codex",
    dryRun: false,
    ephemeral: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help") {
      args.help = true;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--persist-session") {
      args.ephemeral = false;
    } else if (arg === "--file") {
      args.files.push(resolve(repoDir, argv[++i]));
    } else if (arg === "--case") {
      args.caseId = argv[++i];
    } else if (arg === "--out-dir") {
      args.outDir = resolve(repoDir, argv[++i]);
    } else if (arg === "--codex-bin") {
      args.codexBin = argv[++i];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (args.files.length === 0) {
    args.files = [
      join(__dirname, "activation-prompts.jsonl"),
      join(__dirname, "behavior-prompts.jsonl"),
      join(__dirname, "reference-routing-prompts.jsonl"),
    ];
  }

  return args;
}

function readJsonl(file) {
  return readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${file}:${index + 1}: ${error.message}`);
      }
    });
}

function buildPrompt(evaluatorPrompt, testCase) {
  return `${evaluatorPrompt}

## Test Case

\`\`\`json
${JSON.stringify(testCase, null, 2)}
\`\`\`

Evaluate this case against the local igapyon-skill-compactor files.`;
}

function runCase(args, evaluatorPrompt, testCase) {
  const outputFile = join(args.outDir, `${testCase.id}.json`);
  const prompt = buildPrompt(evaluatorPrompt, testCase);
  const schema = join(__dirname, "expected-result-schema.json");

  const result = spawnSync(
    args.codexBin,
    [
      "exec",
      ...(args.ephemeral ? ["--ephemeral"] : []),
      "--output-schema",
      schema,
      "-o",
      outputFile,
      "--",
      prompt,
    ],
    {
      cwd: repoDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  if (result.error) {
    return {
      id: testCase.id,
      status: "error",
      error: result.error.message,
    };
  }

  return {
    id: testCase.id,
    status: result.status === 0 ? "completed" : "failed",
    exitCode: result.status,
    outputFile,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  const evaluatorPrompt = readFileSync(
    join(__dirname, "evaluator-prompt.md"),
    "utf8",
  );
  const cases = args.files
    .flatMap((file) => readJsonl(file))
    .filter((testCase) => !args.caseId || testCase.id === args.caseId);

  if (cases.length === 0) {
    throw new Error("No test cases matched.");
  }

  if (args.dryRun) {
    for (const testCase of cases) {
      console.log(`${testCase.id}\t${testCase.expected}\t${testCase.prompt}`);
    }
    return;
  }

  if (!existsSync(args.outDir)) {
    mkdirSync(args.outDir, { recursive: true });
  }

  const summary = [];
  let failed = false;
  for (const testCase of cases) {
    const result = runCase(args, evaluatorPrompt, testCase);
    summary.push(result);
    if (result.status !== "completed") {
      failed = true;
    }
    console.error(`${result.status}: ${result.id}`);
  }

  const summaryFile = join(args.outDir, "summary.json");
  writeFileSync(`${summaryFile}`, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(summaryFile);
  if (failed) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
