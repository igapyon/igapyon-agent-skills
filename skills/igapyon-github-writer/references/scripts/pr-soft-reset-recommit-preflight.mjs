#!/usr/bin/env node

// Compatibility entry point. New workflows should call scripts/github-writer-run.mjs.
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  branchStatus,
  recommitApply,
  recommitPreflight,
} from "../../scripts/github-writer-kernel.mjs";

const usage = `Usage:
  node skills/igapyon-github-writer/references/scripts/pr-soft-reset-recommit-preflight.mjs [--base <ref>] [--pr-draft <path>] [--repo <path>] [--apply]

Compatibility adapter for the deterministic runner. Without --apply it creates
a sealed preflight plan. With --apply it creates that plan and consumes it once.
It never performs a remote mutation.`;

function parse(argv) {
  const options = { repo: process.cwd(), base: "", prDraft: "", apply: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--apply") options.apply = true;
    else if (argument === "--allow-dirty") {
      throw new Error("--allow-dirty is no longer supported; recommit requires a clean working tree");
    } else if (["--repo", "--base", "--pr-draft"].includes(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value`);
      index += 1;
      if (argument === "--repo") options.repo = value;
      if (argument === "--base") options.base = value;
      if (argument === "--pr-draft") options.prDraft = value;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return options;
}

function branchSlug(branch) {
  return String(branch).toLowerCase().replace(/[^a-z0-9._-]/g, "-");
}

function resolveDraft(repo) {
  const status = branchStatus({ repo });
  const prefix = `pr-${branchSlug(status.branch)}-`;
  const candidates = [];
  for (const base of ["workplace/github-writer", "temp/github-writer"]) {
    const directory = path.resolve(repo, base);
    if (!existsSync(directory)) continue;
    for (const name of readdirSync(directory)) {
      if (name.startsWith(prefix) && name.endsWith(".md")) {
        candidates.push(`${base}/${name}`);
      }
    }
  }
  candidates.sort().reverse();
  if (candidates.length === 0) {
    throw new Error("No current-branch PR draft was found; pass --pr-draft");
  }
  return candidates[0];
}

export function run(argv = process.argv.slice(2)) {
  try {
    const options = parse(argv);
    if (options.help) {
      process.stdout.write(`${usage}\n`);
      return 0;
    }
    const preflight = recommitPreflight({
      repo: options.repo,
      base: options.base,
      prDraft: options.prDraft || resolveDraft(options.repo),
    });
    const result = options.apply
      ? recommitApply({
        repo: options.repo,
        plan: preflight.plan_path,
        expectedPlanSha256: preflight.plan_sha256,
      })
      : preflight;
    process.stdout.write(`${JSON.stringify({
      compatibility_adapter: true,
      workflow: options.apply ? "pr.recommit.apply" : "pr.recommit.preflight",
      status: "success",
      result,
    }, null, 2)}\n`);
    return 0;
  } catch (error) {
    process.stdout.write(`${JSON.stringify({
      compatibility_adapter: true,
      status: "failure",
      message: error instanceof Error ? error.message : String(error),
      retryability: "do-not-retry-without-new-preflight",
    }, null, 2)}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = run();
}
