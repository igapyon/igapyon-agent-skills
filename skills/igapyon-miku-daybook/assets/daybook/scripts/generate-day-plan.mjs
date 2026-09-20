#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import { todayInTokyo, validateIsoDate, writeDayPlan } from "./day-plan.mjs";

function parseArgs(args) {
  const options = { date: todayInTokyo(), outputRoot: path.resolve("workplace/generated") };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--date") options.date = args[++index];
    else if (arg === "--output-root") options.outputRoot = path.resolve(args[++index]);
    else if (arg === "--help") options.help = true;
    else throw new Error(`unknown option: ${arg}`);
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("Usage: node scripts/generate-day-plan.mjs [--date YYYY-MM-DD] [--output-root DIRECTORY]");
    return;
  }
  validateIsoDate(options.date, "date");
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const result = writeDayPlan({ repoRoot, outputRoot: options.outputRoot, targetDate: options.date });
  console.log(`Generated ${result.outputPath}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
