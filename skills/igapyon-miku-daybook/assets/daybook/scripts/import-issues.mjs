#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  IssueImportError,
  applyIssueImport,
  detectIssueCapabilities,
  prepareIssueImport,
  recordIssueCloseResult,
  recordIssueCommentResult,
} from "./issue-import.mjs";

const USAGE = `Usage:
  node scripts/import-issues.mjs capabilities
  node scripts/import-issues.mjs prepare --repo-root <path> --source <source.json> --manifest <manifest.json> --out-dir <run-dir>
  node scripts/import-issues.mjs apply --repo-root <path> --plan <plan.json> [--refresh-source <source.json>] --result <result.json>
  node scripts/import-issues.mjs comment-result --repo-root <path> --result <result.json> --issue <number> --status <status> [options]
  node scripts/import-issues.mjs close-result --repo-root <path> --result <result.json> --issue <number> --status <status> [options]

Remote Issue reads, comments, and closes are performed by the agent through miku-scm.
This CLI only validates local inputs, writes daybook records, and records verified outcomes.
`;

const VALUE_OPTIONS = new Set([
  "--repo-root", "--source", "--manifest", "--out-dir", "--plan", "--refresh-source", "--result",
  "--issue", "--status", "--url", "--message", "--reason", "--handoff-id", "--attempt-path",
]);

function parseArguments(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 1) {
    const name = args[index];
    if (name === "--help" || name === "-h") return { help: true };
    if (!VALUE_OPTIONS.has(name)) throw new IssueImportError("INVALID_ARGUMENT", `Unknown argument: ${name}`);
    if (Object.hasOwn(values, name)) throw new IssueImportError("INVALID_ARGUMENT", `Duplicate argument: ${name}`);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) throw new IssueImportError("INVALID_ARGUMENT", `Missing value for ${name}`);
    values[name] = value;
    index += 1;
  }
  return values;
}

function required(options, name) {
  if (!options[name]) throw new IssueImportError("INVALID_ARGUMENT", `Required argument is missing: ${name}`);
  return options[name];
}

function rootPath(options) {
  return fs.realpathSync(path.resolve(options["--repo-root"] ?? "."));
}

function inputPath(root, value) {
  return path.isAbsolute(value) ? value : path.resolve(root, value);
}

function readJson(filePath, name) {
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
  catch { throw new IssueImportError("INVALID_SOURCE", `${name} must be readable JSON`, { path: filePath }); }
}

function safeRunDirectory(root, value) {
  if (typeof value !== "string" || value.split(/[\\/]/).includes("..")) {
    throw new IssueImportError("PATH_OUTSIDE_REPO", "Run directory path must not contain parent-directory segments", { path: value });
  }
  const absolute = path.resolve(inputPath(root, value));
  const relative = path.relative(root, absolute).split(path.sep).join("/");
  if (relative.startsWith("../") || relative === ".." || !relative.startsWith("workplace/issue-import/")) {
    throw new IssueImportError("PATH_OUTSIDE_REPO", "Run directory must be inside workplace/issue-import/<run>/", { path: value });
  }
  let current = root;
  for (const part of relative.split("/")) {
    current = path.join(current, part);
    if (fs.existsSync(current) && (fs.lstatSync(current).isSymbolicLink() || !fs.lstatSync(current).isDirectory())) {
      throw new IssueImportError("PATH_OUTSIDE_REPO", "Run directory paths cannot contain symbolic links or files", { path: relative });
    }
  }
  return absolute;
}

function requireRegularRunFile(filePath, runDirectory, label) {
  if (path.dirname(filePath) !== runDirectory) {
    throw new IssueImportError("PATH_OUTSIDE_REPO", `${label} must be in the run directory`, { path: filePath });
  }
  let stat;
  try { stat = fs.lstatSync(filePath); }
  catch { throw new IssueImportError("INVALID_SOURCE", `${label} is missing or unreadable`, { path: filePath }); }
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new IssueImportError("PATH_OUTSIDE_REPO", `${label} must be a regular file`, { path: filePath });
  }
}

function createExclusive(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const handle = fs.openSync(filePath, "wx", 0o600);
  try { fs.writeFileSync(handle, content, "utf8"); fs.fsyncSync(handle); }
  finally { fs.closeSync(handle); }
}

function parseIssueNumber(options) {
  const value = required(options, "--issue");
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new IssueImportError("INVALID_ARGUMENT", "--issue must be a positive integer");
  }
  return Number(value);
}

function output(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function run(command, args) {
  if (command === "capabilities") {
    if (args.includes("--help") || args.includes("-h")) {
      process.stdout.write(USAGE);
      return 0;
    }
    if (args.length) throw new IssueImportError("INVALID_ARGUMENT", "capabilities takes no options");
    output(detectIssueCapabilities());
    return 0;
  }
  const options = parseArguments(args);
  if (options.help) {
    process.stdout.write(USAGE);
    return 0;
  }
  const root = rootPath(options);
  if (command === "prepare") {
    const sourcePath = inputPath(root, required(options, "--source"));
    const manifestPath = inputPath(root, required(options, "--manifest"));
    const outDir = safeRunDirectory(root, required(options, "--out-dir"));
    if (path.dirname(sourcePath) !== outDir || path.dirname(manifestPath) !== outDir) {
      throw new IssueImportError("PATH_OUTSIDE_REPO", "source.json, manifest.json, and prepare outputs must share one run directory");
    }
    requireRegularRunFile(sourcePath, outDir, "source.json");
    requireRegularRunFile(manifestPath, outDir, "manifest.json");
    const source = readJson(sourcePath, "source.json");
    const manifest = readJson(manifestPath, "manifest.json");
    fs.mkdirSync(outDir, { recursive: true });
    const { plan, preview } = prepareIssueImport({ repoRoot: root, source, manifest });
    createExclusive(path.join(outDir, "plan.json"), `${JSON.stringify(plan, null, 2)}\n`);
    createExclusive(path.join(outDir, "preview.md"), preview);
    output({ plan_id: plan.plan_id, repo: plan.repo, issues: plan.issues.map(({ number, outcome }) => ({ number, outcome })), writes: plan.writes.length });
    return plan.issues.some((issue) => issue.outcome === "needs-info") ? 2 : 0;
  }
  if (command === "apply") {
    const planPath = inputPath(root, required(options, "--plan"));
    const resultPath = inputPath(root, required(options, "--result"));
    if (path.basename(planPath) !== "plan.json" || path.dirname(planPath) !== path.dirname(resultPath)) {
      throw new IssueImportError("PATH_OUTSIDE_REPO", "plan.json and result.json must be in the same run directory");
    }
    const runDirectory = safeRunDirectory(root, path.dirname(resultPath));
    requireRegularRunFile(planPath, runDirectory, "plan.json");
    const plan = readJson(planPath, "plan.json");
    const refreshFile = options["--refresh-source"] ? inputPath(root, options["--refresh-source"]) : null;
    if (refreshFile) requireRegularRunFile(refreshFile, runDirectory, "refresh-source.json");
    const refreshSource = refreshFile ? readJson(refreshFile, "refresh-source.json") : undefined;
    const result = await applyIssueImport({ repoRoot: root, plan, refreshSource, resultPath });
    output({ status: result.status, plan_id: result.plan_id, writes: result.writes, issues: result.issues.map(({ number, outcome, local_status, comment, close }) => ({ number, outcome, local_status, comment_status: comment.status, close_status: close.status })) });
    return result.writes.some((write) => write.status !== "written") ? 2 : 0;
  }
  if (command === "comment-result" || command === "close-result") {
    const common = {
      repoRoot: root,
      resultPath: inputPath(root, required(options, "--result")),
      issueNumber: parseIssueNumber(options),
      status: required(options, "--status"),
      url: options["--url"] ?? null,
      message: options["--message"] ?? null,
      reason: options["--reason"] ?? null,
      handoffId: options["--handoff-id"] ?? null,
      attemptPath: options["--attempt-path"] ?? null,
    };
    const result = command === "comment-result"
      ? await recordIssueCommentResult(common)
      : await recordIssueCloseResult(common);
    const issue = result.issues.find((entry) => entry.number === common.issueNumber);
    output({ status: result.status, issue: common.issueNumber, comment_status: issue.comment.status, close_status: issue.close.status });
    return 0;
  }
  throw new IssueImportError("INVALID_ARGUMENT", `Unknown command: ${command}`);
}

function exitCode(error) {
  if (error.code === "PARTIAL_WRITE") return 4;
  if (["SOURCE_CONFLICT", "SOURCE_CHANGED", "LOCAL_CONFLICT", "PLAN_CHANGED", "BUSY", "PATH_OUTSIDE_REPO", "COMMENT_CONFLICT", "INVALID_RESULT_TRANSITION"].includes(error.code)) return 3;
  return 2;
}

export async function main(argv = process.argv.slice(2)) {
  const [command, ...args] = argv;
  if (command === "--help" || command === "-h" || !command) {
    process.stdout.write(USAGE);
    return 0;
  }
  return run(command, args);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try { process.exitCode = await main(); }
  catch (error) {
    process.stderr.write(`${JSON.stringify({ code: error.code ?? "ERROR", message: error.message, details: error.details ?? {} })}\n`);
    process.exitCode = exitCode(error);
  }
}
