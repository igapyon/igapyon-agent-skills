#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  defaultGit,
  operationalBase,
  repositoryIdentity,
} from "./github-writer-core.mjs";

export const ERROR_REPORT_SCHEMA_VERSION = "github-writer.error-report/v1";

function parseArgs(argv, cwd = process.cwd()) {
  const options = { repo: cwd, format: "human" };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--repo") options.repo = argv[++index] ?? "";
    else if (argument === "--format") options.format = argv[++index] ?? "";
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!options.repo) throw new Error("--repo requires a value");
  if (!["json", "human"].includes(options.format)) throw new Error("--format must be json or human");
  return options;
}

export function collectErrorEvents(repo, dependencies = {}) {
  const git = dependencies.git ?? defaultGit;
  const identity = repositoryIdentity(repo, git);
  const runs = path.join(operationalBase(identity.root), "runs");
  const events = [];
  if (existsSync(runs)) {
    for (const entry of readdirSync(runs, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const file = path.join(runs, entry.name, "error-event.json");
      if (!existsSync(file)) continue;
      try {
        const event = JSON.parse(readFileSync(file, "utf8"));
        if (event?.schema_version === "github-writer.error-event/v1") events.push(event);
      } catch {
        // Invalid operational records are skipped; this READONLY report never repairs them.
      }
    }
  }
  const grouped = new Map();
  for (const event of events) {
    const signature = event.error?.signature_sha256 ?? "missing-signature";
    const current = grouped.get(signature) ?? {
      signature_sha256: signature,
      workflow: event.workflow ?? "unknown",
      phase: event.phase ?? "unknown",
      code: event.error?.code ?? "UNKNOWN",
      classification: event.error?.classification ?? "unknown",
      retryability: event.error?.retryability ?? "unknown",
      count: 0,
      latest_recorded_at: "",
    };
    current.count += 1;
    if ((event.recorded_at ?? "") > current.latest_recorded_at) {
      current.latest_recorded_at = event.recorded_at;
    }
    grouped.set(signature, current);
  }
  return {
    schema_version: ERROR_REPORT_SCHEMA_VERSION,
    repository: identity.repository,
    event_count: events.length,
    group_count: grouped.size,
    groups: [...grouped.values()].sort((left, right) => (
      right.count - left.count || left.signature_sha256.localeCompare(right.signature_sha256)
    )),
  };
}

function renderHuman(report) {
  const lines = [
    "github-writer error report",
    `Repository: ${report.repository}`,
    `Events: ${report.event_count}`,
    `Groups: ${report.group_count}`,
  ];
  for (const group of report.groups) {
    lines.push(
      "",
      `${group.code} (${group.count})`,
      `  workflow=${group.workflow}; phase=${group.phase}; classification=${group.classification}`,
      `  retryability=${group.retryability}; signature=${group.signature_sha256}`,
    );
  }
  return `${lines.join("\n")}\n`;
}

export function runCli(argv = process.argv.slice(2)) {
  try {
    const options = parseArgs(argv);
    const report = collectErrorEvents(options.repo);
    process.stdout.write(options.format === "json"
      ? `${JSON.stringify(report, null, 2)}\n`
      : renderHuman(report));
    return 0;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runCli();
}
