import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  parseGitHubBatchArgs,
  runGitHubBatch,
} from "../scripts/miku-scm-github-readonly.mjs";

function ghFixture(counter, fail = false) {
  return (args) => {
    counter.calls += 1;
    if (fail) return { ok: false, status: 1, stdout: "", stderr: "offline" };
    if (args[0] === "label") {
      return { ok: true, status: 0, stderr: "", stdout: JSON.stringify([{ name: "enhancement" }]) };
    }
    return {
      ok: true,
      status: 0,
      stderr: "",
      stdout: JSON.stringify({
        number: 293, state: "OPEN", title: "Title", body: "Body",
        url: "https://github.com/a/b/issues/293", updatedAt: "2026-07-27T00:00:00Z",
        labels: [], comments: [],
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
  assert.equal(firstCounter.calls, 2);
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
