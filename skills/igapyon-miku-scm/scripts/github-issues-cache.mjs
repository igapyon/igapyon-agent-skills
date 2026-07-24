#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_MAX_AGE_MINUTES = 10;

function usage() {
  return `Usage: github-issues-cache.mjs --repo <owner>/<repo> [options]

Options:
  --state <open|all>       Issue state to cache (default: open)
  --max-age-minutes <min>  Freshness window (default: 10)
  --refresh                Ignore freshness and fetch now
  --help                   Show this help
`;
}

function parseArgs(argv) {
  const options = {
    repo: "",
    state: "open",
    maxAgeMinutes: DEFAULT_MAX_AGE_MINUTES,
    refresh: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") {
      process.stdout.write(usage());
      process.exit(0);
    } else if (arg === "--repo") {
      options.repo = argv[++index] ?? "";
    } else if (arg === "--state") {
      options.state = argv[++index] ?? "";
    } else if (arg === "--max-age-minutes") {
      options.maxAgeMinutes = Number(argv[++index]);
    } else if (arg === "--refresh") {
      options.refresh = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(options.repo)) {
    throw new Error("--repo must use the owner/repository form");
  }
  if (!new Set(["open", "all"]).has(options.state)) {
    throw new Error("--state must be open or all");
  }
  if (!Number.isFinite(options.maxAgeMinutes) || options.maxAgeMinutes < 0) {
    throw new Error("--max-age-minutes must be a non-negative number");
  }

  return options;
}

function repositoryRoot() {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT" || error instanceof SyntaxError) return null;
    throw error;
  }
}

function isFresh(metadata, maxAgeMinutes) {
  if (metadata?.schema_version !== 3) return false;
  const fetchedAt = Date.parse(metadata?.fetched_at ?? "");
  if (!Number.isFinite(fetchedAt)) return false;
  return Date.now() - fetchedAt <= maxAgeMinutes * 60 * 1000;
}

function fetchIssues(repo, state) {
  const result = spawnSync("gh", ["issue", "list", "--repo", repo, "--state", state,
    "--limit", "1000", "--json", "number,state,title,body,url,updatedAt"], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`gh issue list failed: ${(result.stderr || result.stdout || "unknown failure").trim()}`);
  let entries;
  try { entries = JSON.parse(result.stdout); } catch { throw new Error("gh issue list returned malformed JSON"); }
  if (!Array.isArray(entries)) throw new Error("gh issue list returned a non-array response");
  const issues = entries.map((entry) => ({ number: entry.number, state: entry.state, title: entry.title,
    body: entry.body ?? "", html_url: entry.url, updated_at: entry.updatedAt }));
  if (issues.some((entry) => !Number.isSafeInteger(entry.number) || typeof entry.state !== "string"
    || typeof entry.title !== "string" || typeof entry.html_url !== "string" || typeof entry.updated_at !== "string")) {
    throw new Error("gh issue list returned malformed Issue metadata");
  }
  return { issues, pageCount: 1 };
}

async function writeJsonAtomic(file, value) {
  const temporary = `${file}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, file);
}

function report(status, dataFile, metadata) {
  const relativeDataFile = path.relative(repositoryRoot(), dataFile);
  process.stdout.write(`${JSON.stringify({
    status,
    cache: relativeDataFile,
    repository: metadata.repository,
    state: metadata.state,
    fetched_at: metadata.fetched_at,
    issue_count: metadata.issue_count,
    stale: status === "stale-cache",
  })}\n`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const root = repositoryRoot();
  const [owner, repository] = options.repo.split("/");
  const cacheDirectory = path.join(root, "workplace", "miku-scm", "github-cache", owner, repository);
  const basename = `issues-${options.state}`;
  const dataFile = path.join(cacheDirectory, `${basename}.json`);
  const metadataFile = path.join(cacheDirectory, `${basename}.meta.json`);
  await mkdir(cacheDirectory, { recursive: true });

  const existingData = await readJson(dataFile);
  const existingMetadata = await readJson(metadataFile);
  if (!options.refresh && existingData && isFresh(existingMetadata, options.maxAgeMinutes)) {
    report("cache-hit", dataFile, existingMetadata);
    return;
  }

  try {
    const { issues, pageCount } = fetchIssues(options.repo, options.state);
    const fetchedAt = new Date().toISOString();
    const metadata = {
      schema_version: 3,
      repository: options.repo,
      state: options.state,
      source_url: `gh issue list --repo ${options.repo} --state ${options.state} --limit 1000 --json number,state,title,body,url,updatedAt`,
      fetched_at: fetchedAt,
      page_count: pageCount,
      issue_count: issues.length,
      max_age_minutes: options.maxAgeMinutes,
    };
    await writeJsonAtomic(dataFile, issues);
    await writeJsonAtomic(metadataFile, metadata);
    report("refreshed", dataFile, metadata);
  } catch (error) {
    if (existingData && existingMetadata) {
      report("stale-cache", dataFile, existingMetadata);
      process.stderr.write(`Refresh failed; using stale cache: ${error.message}\n`);
      return;
    }
    throw error;
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
