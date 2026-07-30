import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { parseArgs as parseIssueReadArgs, runIssueRead } from "./github-issue-read.mjs";

const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const QUERY = /^(?:labels|issue:[1-9]\d*|issues:(?:open|closed|all))$/;
const DEFAULT_TTL_MS = 10 * 60 * 1000;
const MAX_QUERIES = 20;
const MAX_CONCURRENCY = 4;

export const GITHUB_READONLY_SCHEMA_VERSION = "miku-scm.github-readonly/v1";

export function parseGitHubBatchArgs(argv, cwd = process.cwd()) {
  const options = {
    repository: "",
    queries: [],
    refresh: false,
    root: cwd,
    ttlMs: DEFAULT_TTL_MS,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repo") options.repository = argv[++index] ?? "";
    else if (arg === "--query") options.queries.push(argv[++index] ?? "");
    else if (arg === "--refresh") options.refresh = true;
    else if (arg === "--root") options.root = argv[++index] ?? "";
    else if (arg === "--ttl-ms") options.ttlMs = Number(argv[++index]);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!REPOSITORY.test(options.repository)) throw new Error("--repo must be exactly owner/repo");
  if (options.queries.length < 1 || options.queries.length > MAX_QUERIES) {
    throw new Error(`Provide 1 through ${MAX_QUERIES} --query values`);
  }
  if (options.queries.some((query) => !QUERY.test(query))) {
    throw new Error("--query must be labels, issue:<number>, or issues:<state>");
  }
  if (!Number.isSafeInteger(options.ttlMs) || options.ttlMs < 0 || options.ttlMs > 86_400_000) {
    throw new Error("--ttl-ms must be an integer from 0 through 86400000");
  }
  if (!options.root) throw new Error("--root must not be empty");
  return options;
}

function queryDigest(repository, query) {
  return createHash("sha256").update(`${repository}\0${query}`).digest("hex");
}

function queryArgs(repository, query) {
  if (query === "labels") return ["--repo", repository, "--labels"];
  if (query.startsWith("issue:")) return ["--repo", repository, "--issue", query.slice(6)];
  return ["--repo", repository, "--list", "--state", query.slice(7)];
}

async function readCache(file) {
  try {
    const record = JSON.parse(await readFile(file, "utf8"));
    if (record?.schema_version !== GITHUB_READONLY_SCHEMA_VERSION
      || typeof record.repository !== "string" || typeof record.query !== "string"
      || typeof record.fetched_at !== "string" || record.complete !== true
      || !("value" in record)) return null;
    return record;
  } catch {
    return null;
  }
}

async function writeJsonAtomic(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}-${randomUUID()}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(temporary, file);
}

async function parallelMap(values, limit, mapper) {
  const results = new Array(values.length);
  let next = 0;
  async function worker() {
    while (next < values.length) {
      const index = next;
      next += 1;
      results[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return results;
}

export async function runGitHubBatch(options, dependencies = {}) {
  const now = dependencies.now ? dependencies.now() : new Date();
  const root = path.resolve(options.root);
  const [owner, repo] = options.repository.split("/");
  const cacheDirectory = path.join(root, "workplace", "miku-scm", "github-readonly-cache", owner, repo);
  const uniqueQueries = [...new Set(options.queries)];
  const counters = { cache_hits: 0, stale_fallbacks: 0, fixed_gh_reads: 0 };
  const gh = dependencies.gh;

  const entries = await parallelMap(uniqueQueries, MAX_CONCURRENCY, async (query) => {
    const file = path.join(cacheDirectory, `${queryDigest(options.repository, query)}.json`);
    const cached = await readCache(file);
    const ageMs = cached ? now.getTime() - new Date(cached.fetched_at).getTime() : null;
    if (!options.refresh && cached && Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= options.ttlMs) {
      counters.cache_hits += 1;
      return { query, source: "cache", stale: false, fetched_at: cached.fetched_at, value: cached.value };
    }
    try {
      counters.fixed_gh_reads += 1;
      const value = runIssueRead(parseIssueReadArgs(queryArgs(options.repository, query)), { gh });
      const record = {
        schema_version: GITHUB_READONLY_SCHEMA_VERSION,
        repository: options.repository,
        query,
        fetched_at: now.toISOString(),
        complete: true,
        value,
      };
      await writeJsonAtomic(file, record);
      return { query, source: "github", stale: false, fetched_at: record.fetched_at, value };
    } catch (error) {
      if (cached) {
        counters.stale_fallbacks += 1;
        return {
          query,
          source: "stale-cache",
          stale: true,
          fetched_at: cached.fetched_at,
          error: error instanceof Error ? error.message : String(error),
          value: cached.value,
        };
      }
      return {
        query,
        source: "failed",
        stale: false,
        fetched_at: null,
        error: error instanceof Error ? error.message : String(error),
        value: null,
      };
    }
  });

  return {
    status: entries.some((entry) => entry.source === "failed") ? "not-applied"
      : entries.some((entry) => entry.stale) ? "degraded" : "success",
    schema_version: GITHUB_READONLY_SCHEMA_VERSION,
    repository: options.repository,
    requested_queries: options.queries,
    executed_queries: uniqueQueries,
    duplicate_queries_eliminated: options.queries.length - uniqueQueries.length,
    bounded_concurrency: MAX_CONCURRENCY,
    cache_ttl_ms: options.ttlMs,
    refresh: options.refresh,
    counters,
    entries,
  };
}
