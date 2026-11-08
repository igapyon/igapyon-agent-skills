#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readActivity, readActivityInput, updateActivity } from "./activity-files.mjs";

export function main(args = process.argv.slice(2)) {
  const options = { repoRoot: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..") };
  const keys = { "--repo-root": "repoRoot", "--path": "path", "--expected-sha256": "expectedSha256", "--file": "file" };
  const seen = new Set();
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--help") {
      console.log("Usage: node scripts/update-activity.mjs --path ACTIVITY.md [--repo-root DIRECTORY] (--read | --expected-sha256 HASH (--stdin | --file DRAFT.md))");
      return;
    }
    if (seen.has(arg)) throw new Error(`Duplicate option: ${arg}`);
    seen.add(arg);
    if (arg === "--read" || arg === "--stdin") { options[arg.slice(2)] = true; continue; }
    if (!Object.hasOwn(keys, arg) || !args[index + 1] || args[index + 1].startsWith("--")) {
      throw new Error(`Unknown option or missing value: ${arg}`);
    }
    options[keys[arg]] = args[++index];
  }
  if (!options.path) throw new Error("--path is required (repository-relative activity path)");
  options.repoRoot = path.resolve(options.repoRoot);
  if (options.read) {
    if (options.expectedSha256 || options.file || options.stdin) throw new Error("--read cannot be combined with update options");
    console.log(JSON.stringify(readActivity(options)));
  } else {
    if (!options.expectedSha256) throw new Error("--expected-sha256 is required; use --read before editing");
    console.log(JSON.stringify(updateActivity({ ...options, content: readActivityInput(options) })));
  }
}

if (process.argv[1] && fs.existsSync(process.argv[1])
  && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  try { main(); } catch (error) {
    console.error(`${error.code ? error.code + ": " : ""}${error.message}`);
    process.exitCode = 1;
  }
}
