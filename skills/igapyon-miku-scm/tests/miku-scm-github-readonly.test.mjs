import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  parseGitHubBatchArgs,
  runGitHubBatch,
} from "../scripts/miku-scm-github-readonly.mjs";
import { parseArgs as parseIssueReadArgs, runIssueRead } from "../scripts/github-issue-read.mjs";

const issueListEntry = {
  number: 316,
  state: "OPEN",
  title: "Bug candidate",
  body: "Body",
  url: "https://github.com/a/b/issues/316",
  updatedAt: "2026-07-27T00:00:00Z",
  labels: [{ name: "bug", color: "d73a4a", description: "Something isn't working" }],
};

function issueListCachePath(root, repository, query) {
  const digest = createHash("sha256").update(`${repository}\0${query}`).digest("hex");
  return path.join(root, "workplace", "miku-scm", "github-readonly-cache", "a", "b", `${digest}.json`);
}

function ghFixture(counter, fail = false) {
  return (args) => {
    counter.calls += 1;
    if (fail) return { ok: false, status: 1, stdout: "", stderr: "offline" };
    if (args[0] === "label") {
      return { ok: true, status: 0, stderr: "", stdout: JSON.stringify([{ name: "enhancement" }]) };
    }
    if (args[0] === "api") {
      return { ok: true, status: 0, stderr: "", stdout: JSON.stringify({ data: { repository: { issue: {
        number: 293,
        url: "https://github.com/a/b/issues/293",
        updatedAt: "2026-07-27T00:00:00Z",
        comments: { nodes: [], totalCount: 0, pageInfo: { hasNextPage: false, endCursor: null } },
      } } } }) };
    }
    return {
      ok: true,
      status: 0,
      stderr: "",
      stdout: JSON.stringify({
        number: 293, state: "OPEN", title: "Title", body: "Body",
        url: "https://github.com/a/b/issues/293", updatedAt: "2026-07-27T00:00:00Z",
        labels: [],
      }),
    };
  };
}

test("batch parser permits fixed query IDs only", () => {
  assert.equal(parseGitHubBatchArgs(["--repo", "a/b", "--query", "labels"]).queries[0], "labels");
  assert.throws(() => parseGitHubBatchArgs(["--repo", "a/b", "--query", "pulls:open"]), /query/);
  assert.throws(() => parseGitHubBatchArgs(["--repo", "a/b"]), /Provide/);
});

test("batch eliminates duplicates and reuses fresh on-disk cache", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "miku-scm-github-cache-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const options = parseGitHubBatchArgs([
    "--repo", "a/b", "--root", root,
    "--query", "issue:293", "--query", "issue:293", "--query", "labels",
  ]);
  const firstCounter = { calls: 0 };
  const first = await runGitHubBatch(options, {
    now: () => new Date("2026-07-27T10:00:00Z"),
    gh: ghFixture(firstCounter),
  });
  assert.equal(firstCounter.calls, 3);
  assert.equal(first.duplicate_queries_eliminated, 1);
  assert.equal(first.status, "success");

  const secondCounter = { calls: 0 };
  const second = await runGitHubBatch(options, {
    now: () => new Date("2026-07-27T10:05:00Z"),
    gh: ghFixture(secondCounter),
  });
  assert.equal(secondCounter.calls, 0);
  assert.equal(second.counters.cache_hits, 2);
});

test("failed refresh qualifies an existing entry as stale", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "miku-scm-github-cache-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const base = ["--repo", "a/b", "--root", root, "--query", "labels"];
  await runGitHubBatch(parseGitHubBatchArgs(base), {
    now: () => new Date("2026-07-27T10:00:00Z"),
    gh: ghFixture({ calls: 0 }),
  });
  const result = await runGitHubBatch(parseGitHubBatchArgs([...base, "--refresh"]), {
    now: () => new Date("2026-07-27T10:01:00Z"),
    gh: ghFixture({ calls: 0 }, true),
  });
  assert.equal(result.status, "degraded");
  assert.equal(result.entries[0].source, "stale-cache");
  assert.equal(result.entries[0].stale, true);
});

test("direct and batch Issue lists return the same validated labels", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "miku-scm-github-cache-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directCalls = [];
  const gh = (args) => {
    directCalls.push(args);
    return { ok: true, status: 0, stderr: "", stdout: JSON.stringify([issueListEntry]) };
  };
  const direct = runIssueRead(parseIssueReadArgs(["--repo", "a/b", "--list"]), { gh });
  const batch = await runGitHubBatch(parseGitHubBatchArgs([
    "--repo", "a/b", "--root", root, "--query", "issues:open",
  ]), { gh: () => ({ ok: true, status: 0, stderr: "", stdout: JSON.stringify([issueListEntry]) }) });

  assert.equal(directCalls[0][0], "issue");
  assert.deepEqual(batch.entries[0].value.issues, direct.issues);
  assert.deepEqual(batch.entries[0].value.issues[0].labels, issueListEntry.labels);
  const withoutLabels = batch.entries[0].value.issues.map(({ labels: _labels, ...issue }) => issue);
  const before = Buffer.byteLength(JSON.stringify(withoutLabels), "utf8");
  const after = Buffer.byteLength(JSON.stringify(batch.entries[0].value.issues), "utf8");
  assert.ok(after > before);
});

test("legacy and malformed list caches are never served, including stale fallback", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "miku-scm-github-cache-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const repository = "a/b";
  const query = "issues:open";
  const file = issueListCachePath(root, repository, query);
  await mkdir(path.dirname(file), { recursive: true });
  const valueWithoutLabels = {
    mode: "list",
    repository,
    state: "open",
    issues: [{
      number: 316,
      state: "OPEN",
      title: "Bug candidate",
      body: "Body",
      html_url: "https://github.com/a/b/issues/316",
      updated_at: "2026-07-27T00:00:00Z",
    }],
  };
  const options = parseGitHubBatchArgs([
    "--repo", repository, "--root", root, "--query", query,
  ]);
  const fetched = await runGitHubBatch(options, {
    now: () => new Date("2026-07-27T10:00:00Z"),
    gh: () => ({ ok: true, status: 0, stderr: "", stdout: JSON.stringify([issueListEntry]) }),
  });
  assert.equal(fetched.entries[0].source, "github");

  await writeFile(file, `${JSON.stringify({
    schema_version: "miku-scm.github-readonly/v2",
    repository,
    query,
    fetched_at: "2026-07-27T10:00:00.000Z",
    complete: true,
    value: valueWithoutLabels,
  })}\n`);
  const stale = await runGitHubBatch(parseGitHubBatchArgs([
    "--repo", repository, "--root", root, "--query", query, "--refresh",
  ]), {
    now: () => new Date("2026-07-27T10:01:00Z"),
    gh: ghFixture({ calls: 0 }, true),
  });
  assert.equal(stale.status, "not-applied");
  assert.equal(stale.entries[0].source, "failed");
  assert.equal(stale.counters.stale_fallbacks, 0);
});
