#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createActivity } from "./activity-files.mjs";
import { todayInTokyo } from "./day-plan.mjs";

export function main(args = process.argv.slice(2)) {
  const options = { repoRoot: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), date: todayInTokyo() };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--help") {
      console.log("Usage: node scripts/create-activity.mjs --file DRAFT.md [--date YYYY-MM-DD] [--repo-root DIRECTORY]");
      return;
    }
    if (!["--file", "--date", "--repo-root"].includes(arg) || !args[index + 1] || args[index + 1].startsWith("--")) {
      throw new Error(`Unknown option or missing value: ${arg}`);
    }
    const key = { "--file": "file", "--date": "date", "--repo-root": "repoRoot" }[arg];
    options[key] = args[++index];
  }
  if (!options.file) throw new Error("--file is required (complete activity Markdown draft)");
  const result = createActivity({ ...options, repoRoot: path.resolve(options.repoRoot), content: fs.readFileSync(options.file, "utf8") });
  console.log(JSON.stringify(result));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
