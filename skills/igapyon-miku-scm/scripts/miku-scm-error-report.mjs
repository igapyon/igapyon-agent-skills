#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export function parseErrorReportArgs(argv, cwd = process.cwd()) {
  const options = { root: cwd };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") options.root = argv[++index] ?? "";
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!options.root) throw new Error("--root must not be empty");
  return options;
}

export async function errorReport(options) {
  const root = path.resolve(options.root);
  const directory = path.join(root, "workplace", "miku-scm", "runs");
  let names = [];
  try {
    names = await readdir(directory);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const grouped = new Map();
  let inspectedRuns = 0;
  for (const name of names) {
    try {
      const event = JSON.parse(await readFile(path.join(directory, name, "error-event.json"), "utf8"));
      if (typeof event.signature !== "string" || typeof event.classification !== "string") continue;
      inspectedRuns += 1;
      const current = grouped.get(event.signature) ?? {
        signature: event.signature,
        workflow: event.workflow,
        phase: event.phase,
        command_id: event.command_id,
        classification: event.classification,
        mutation_invoked: event.mutation_invoked,
        retryability: event.retryability,
        count: 0,
      };
      current.count += 1;
      grouped.set(event.signature, current);
    } catch {
      // Ignore successful, incomplete, or unrelated run directories.
    }
  }
  return {
    schema_version: "miku-scm.error-report/v1",
    inspected_error_runs: inspectedRuns,
    unique_signatures: grouped.size,
    signatures: [...grouped.values()].sort((left, right) => (
      right.count - left.count || left.signature.localeCompare(right.signature)
    )),
  };
}

async function main() {
  const result = await errorReport(parseErrorReportArgs(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({ status: "error", message: error.message })}\n`);
    process.exitCode = 1;
  });
}
