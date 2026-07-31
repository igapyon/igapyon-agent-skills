#!/usr/bin/env node

import { readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.dirname(scriptDirectory);
const testDirectory = path.join(skillRoot, "tests");

function runNode(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  process.stdout.write(result.stdout || "");
  process.stderr.write(result.stderr || "");
  if (result.status !== 0) process.exit(result.status ?? 1);
}

export function runSuite(argv = process.argv.slice(2)) {
  if (argv.length !== 1 || !["--fast", "--full"].includes(argv[0])) {
    throw new Error("Usage: node github-writer-test-suite.mjs --fast|--full");
  }
  if (argv[0] === "--full") {
    runNode([path.join(scriptDirectory, "github-writer-workflow-contracts.mjs"), "--check"]);
  }
  const tests = readdirSync(testDirectory)
    .filter((name) => name.endsWith(".test.mjs"))
    .sort()
    .map((name) => path.join(testDirectory, name));
  runNode(["--test", ...tests]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    runSuite();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
