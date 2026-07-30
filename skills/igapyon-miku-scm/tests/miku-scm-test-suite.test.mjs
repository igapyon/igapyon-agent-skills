import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFullJobs,
  extractTestNames,
  validateShards,
} from "../scripts/miku-scm-test-suite.mjs";

test("test-name extraction and shard validation require exactly one match", () => {
  const names = extractTestNames('test("alpha", () => {});\ntest("beta", async () => {});\n');
  assert.deepEqual(names, ["alpha", "beta"]);
  assert.doesNotThrow(() => validateShards(names, ["^alpha$", "^beta$"], "fixture"));
  assert.throws(() => validateShards(names, ["a", "alpha"], "fixture"), /exactly one/);
  assert.throws(() => validateShards(names, ["^alpha$"], "fixture"), /exactly one/);
});

test("full suite build keeps regular files and fixed slow shards separate", async () => {
  const jobs = await buildFullJobs(process.cwd());
  assert.equal(jobs[0].id, "regular");
  assert.ok(jobs[0].args.every((value) => !value.endsWith("post-recommit-publish.test.mjs")));
  assert.ok(jobs.some((job) => job.id.startsWith("post-recommit-publish.test.mjs:")));
  assert.ok(jobs.some((job) => job.id.startsWith("repository-maintenance.test.mjs:")));
});
