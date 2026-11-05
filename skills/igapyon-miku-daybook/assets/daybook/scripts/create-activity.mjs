#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createActivity, readActivityInput } from "./activity-files.mjs";
import { todayInTokyo } from "./day-plan.mjs";

export function main(args = process.argv.slice(2)) {
  const options = { repoRoot: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), date: todayInTokyo() };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--help") {
      console.log("Usage: node scripts/create-activity.mjs (--stdin | --file DRAFT.md) [--date YYYY-MM-DD] [--repo-root DIRECTORY]");
      return;
    }
    if (arg === "--stdin" && !options.stdin) { options.stdin = true; continue; }
    if (!["--file", "--date", "--repo-root"].includes(arg) || !args[index + 1] || args[index + 1].startsWith("--")) {
      throw new Error(`Unknown option or missing value: ${arg}`);
    }
    const key = { "--file": "file", "--date": "date", "--repo-root": "repoRoot" }[arg];
    if (options[key] && key === "file") throw new Error(`Duplicate option: ${arg}`);
    options[key] = args[++index];
  }
  const content = readActivityInput(options);
  const result = createActivity({ ...options, repoRoot: path.resolve(options.repoRoot), content });
  console.log(JSON.stringify(result));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(`${error.code ? error.code + ": " : ""}${error.message}`); process.exitCode = 1; }
}
