import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { parseArgs, runIssueClose } from "../scripts/github-issue-close.mjs";

const ISSUE = {
  number: 42,
  url: "https://github.com/igapyon/example/issues/42",
  title: "Example",
  body: "Body.\n",
  state: "open",
  stateReason: null,
  updatedAt: "2026-07-24T01:02:03Z",
};

async function scenario(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "miku-scm-close-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return { root };
}

function optionsFor(state, ...extra) {
  return parseArgs([
    "--repo", "igapyon/example",
    "--issue", "42",
    "--reason", "completed",
    "--root", state.root,
    ...extra,
  ]);
}

function applyOptions(state, preflight) {
  return optionsFor(
    state,
    "--expected-operation-sha256", preflight.operation_sha256,
    "--expected-current-body-sha256", preflight.current_body_sha256,
    "--expected-updated-at", preflight.current_updated_at,
    "--apply",
  );
}

test("preflight exposes the complete Open Issue and close operation", async (t) => {
  const state = await scenario(t);
  let calls = 0;
  const result = await runIssueClose(optionsFor(state), {
    readIssue: async () => ISSUE,
    gh: () => { calls += 1; },
  });
  assert.equal(result.status, "preflight-ok");
  assert.equal(result.current_body, "Body.\n");
  assert.equal(result.reason, "completed");
  assert.equal(calls, 0);
  await assert.rejects(access(path.join(state.root, result.attempt_record)), /ENOENT/);
});

test("duplicate preflight requires and exposes a different target Issue", async (t) => {
  const state = await scenario(t);
  assert.throws(
    () => parseArgs([
      "--repo", "igapyon/example", "--issue", "42", "--reason", "duplicate",
    ]),
    /requires --duplicate-of/,
  );
  const duplicate = { ...ISSUE, number: 43, url: "https://github.com/igapyon/example/issues/43" };
  const result = await runIssueClose(
    parseArgs([
      "--repo", "igapyon/example", "--issue", "42",
      "--reason", "duplicate", "--duplicate-of", "43", "--root", state.root,
    ]),
    {
      readIssue: async (_repository, number) => number === 42 ? ISSUE : duplicate,
    },
  );
  assert.equal(result.duplicate_target.number, 43);
  assert.equal(result.duplicate_target.url, duplicate.url);
  assert.equal(result.duplicate_target.title, duplicate.title);
  assert.equal(result.duplicate_target.state, duplicate.state);
  assert.match(result.duplicate_target.snapshot_sha256, /^[0-9a-f]{64}$/);
});

test("duplicate target changes after review are a conflict", async (t) => {
  const state = await scenario(t);
  const duplicate = {
    ...ISSUE,
    number: 43,
    url: "https://github.com/igapyon/example/issues/43",
  };
  const preflightOptions = parseArgs([
    "--repo", "igapyon/example", "--issue", "42",
    "--reason", "duplicate", "--duplicate-of", "43", "--root", state.root,
  ]);
  const preflight = await runIssueClose(preflightOptions, {
    readIssue: async (_repository, number) => number === 42 ? ISSUE : duplicate,
  });
  const apply = parseArgs([
    "--repo", "igapyon/example", "--issue", "42",
    "--reason", "duplicate", "--duplicate-of", "43", "--root", state.root,
    "--expected-operation-sha256", preflight.operation_sha256,
    "--expected-current-body-sha256", preflight.current_body_sha256,
    "--expected-duplicate-sha256", preflight.duplicate_target.snapshot_sha256,
    "--expected-updated-at", preflight.current_updated_at,
    "--apply",
  ]);
  let calls = 0;
  const result = await runIssueClose(apply, {
    readIssue: async (_repository, number) => number === 42
      ? ISSUE
      : { ...duplicate, updatedAt: "2026-07-24T03:00:00Z" },
    gh: () => { calls += 1; },
  });
  assert.equal(result.status, "conflict");
  assert.equal(result.stage, "duplicate-target-conflict");
  assert.equal(calls, 0);
});

test("apply invokes one exact close and verifies state and reason", async (t) => {
  const state = await scenario(t);
  const preflight = await runIssueClose(optionsFor(state), {
    readIssue: async () => ISSUE,
  });
  const reads = [ISSUE, { ...ISSUE, state: "closed", stateReason: "completed" }];
  const calls = [];
  const result = await runIssueClose(applyOptions(state, preflight), {
    readIssue: async () => reads.shift(),
    gh: (args) => {
      calls.push(args);
      return { ok: true, stdout: "closed", stderr: "" };
    },
  });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], [
    "issue", "close", "42", "--repo", "igapyon/example", "--reason", "completed",
  ]);
  assert.equal(result.status, "closed");
  assert.equal(result.verified_state_reason, "completed");
  const record = JSON.parse(await readFile(path.join(state.root, result.attempt_record), "utf8"));
  assert.equal(record.status, "closed");
});

test("already closed or changed Issue is rejected before gh", async (t) => {
  const state = await scenario(t);
  await assert.rejects(
    runIssueClose(optionsFor(state), {
      readIssue: async () => ({ ...ISSUE, state: "closed", stateReason: "completed" }),
    }),
    /Only an Open Issue/,
  );
  const preflight = await runIssueClose(optionsFor(state), {
    readIssue: async () => ISSUE,
  });
  let calls = 0;
  const result = await runIssueClose(applyOptions(state, preflight), {
    readIssue: async () => ({ ...ISSUE, body: "Changed.\n" }),
    gh: () => { calls += 1; },
  });
  assert.equal(result.status, "conflict");
  assert.equal(calls, 0);
});

test("post-close verification retries reads but never repeats close", async (t) => {
  const state = await scenario(t);
  const preflight = await runIssueClose(optionsFor(state), {
    readIssue: async () => ISSUE,
  });
  const reads = [
    ISSUE,
    ISSUE,
    { ...ISSUE, state: "closed", stateReason: "completed" },
  ];
  const delays = [];
  let calls = 0;
  const result = await runIssueClose(applyOptions(state, preflight), {
    readIssue: async () => reads.shift(),
    gh: () => {
      calls += 1;
      return { ok: true, stdout: "closed", stderr: "" };
    },
    sleep: async (delay) => { delays.push(delay); },
  });
  assert.equal(result.status, "closed");
  assert.equal(result.verification_attempts, 2);
  assert.equal(calls, 1);
  assert.deepEqual(delays, [250]);
});
