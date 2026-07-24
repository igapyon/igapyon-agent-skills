import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createGhIssueReader,
  createGhLabelReader,
  parseArgs,
  runIssueLabelUpdate,
} from "../scripts/github-issue-label-update.mjs";

const ISSUE = {
  number: 42,
  url: "https://github.com/igapyon/example/issues/42",
  title: "Example",
  state: "OPEN",
  updatedAt: "2026-07-24T01:02:03Z",
  labels: ["bug"],
};
const AVAILABLE = ["bug", "documentation", "enhancement"];

async function scenario(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "miku-scm-label-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return { root };
}

function optionsFor(state, ...extra) {
  return parseArgs([
    "--repo", "igapyon/example",
    "--issue", "42",
    "--add-label", "enhancement",
    "--remove-label", "bug",
    "--root", state.root,
    ...extra,
  ]);
}

function applyOptions(state, preflight) {
  return optionsFor(
    state,
    "--expected-operation-sha256", preflight.operation_sha256,
    "--expected-current-labels-sha256", preflight.current_labels_sha256,
    "--expected-updated-at", preflight.current_updated_at,
    "--apply",
  );
}

test("preflight returns exact current and resulting labels without gh", async (t) => {
  const state = await scenario(t);
  let calls = 0;
  const result = await runIssueLabelUpdate(optionsFor(state), {
    readLabels: async () => AVAILABLE,
    readIssue: async () => ISSUE,
    gh: () => { calls += 1; },
  });
  assert.equal(result.status, "preflight-ok");
  assert.deepEqual(result.current_labels, ["bug"]);
  assert.deepEqual(result.resulting_labels, ["enhancement"]);
  assert.equal(calls, 0);
  await assert.rejects(access(path.join(state.root, result.attempt_record)), /ENOENT/);
});

test("preflight rejects absent labels, overlap, and no-op changes", async (t) => {
  const state = await scenario(t);
  await assert.rejects(
    runIssueLabelUpdate(
      parseArgs([
        "--repo", "igapyon/example", "--issue", "42",
        "--add-label", "enhance", "--root", state.root,
      ]),
      { readLabels: async () => AVAILABLE },
    ),
    /do not exist exactly/,
  );
  assert.throws(
    () => parseArgs([
      "--repo", "igapyon/example", "--issue", "42",
      "--add-label", "bug", "--remove-label", "bug",
    ]),
    /both added and removed/,
  );
  await assert.rejects(
    runIssueLabelUpdate(
      parseArgs([
        "--repo", "igapyon/example", "--issue", "42",
        "--add-label", "bug", "--root", state.root,
      ]),
      { readLabels: async () => AVAILABLE, readIssue: async () => ISSUE },
    ),
    /already present/,
  );
});

test("apply invokes one exact label edit and verifies the complete result", async (t) => {
  const state = await scenario(t);
  const preflight = await runIssueLabelUpdate(optionsFor(state), {
    readLabels: async () => AVAILABLE,
    readIssue: async () => ISSUE,
  });
  const calls = [];
  const reads = [ISSUE, { ...ISSUE, labels: ["enhancement"] }];
  const result = await runIssueLabelUpdate(applyOptions(state, preflight), {
    readLabels: async () => AVAILABLE,
    readIssue: async () => reads.shift(),
    gh: (args) => {
      calls.push(args);
      return { ok: true, stdout: ISSUE.url, stderr: "" };
    },
  });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], [
    "issue", "edit", "42", "--repo", "igapyon/example",
    "--add-label", "enhancement", "--remove-label", "bug",
  ]);
  assert.equal(result.status, "updated");
  assert.deepEqual(result.verified_labels, ["enhancement"]);
  const record = JSON.parse(await readFile(path.join(state.root, result.attempt_record), "utf8"));
  assert.equal(record.status, "updated");
});

test("changed labels are a conflict and prevent gh", async (t) => {
  const state = await scenario(t);
  const preflight = await runIssueLabelUpdate(optionsFor(state), {
    readLabels: async () => AVAILABLE,
    readIssue: async () => ISSUE,
  });
  let calls = 0;
  const result = await runIssueLabelUpdate(applyOptions(state, preflight), {
    readLabels: async () => AVAILABLE,
    readIssue: async () => ({ ...ISSUE, labels: ["bug", "documentation"] }),
    gh: () => { calls += 1; },
  });
  assert.equal(result.status, "conflict");
  assert.equal(calls, 0);
});

test("verification retries reads but never repeats the label mutation", async (t) => {
  const state = await scenario(t);
  const preflight = await runIssueLabelUpdate(optionsFor(state), {
    readLabels: async () => AVAILABLE,
    readIssue: async () => ISSUE,
  });
  const reads = [ISSUE, ISSUE, { ...ISSUE, labels: ["enhancement"] }];
  const delays = [];
  let calls = 0;
  const result = await runIssueLabelUpdate(applyOptions(state, preflight), {
    readLabels: async () => AVAILABLE,
    readIssue: async () => reads.shift(),
    gh: () => {
      calls += 1;
      return { ok: true, stdout: ISSUE.url, stderr: "" };
    },
    sleep: async (delay) => { delays.push(delay); },
  });
  assert.equal(result.status, "updated");
  assert.equal(result.verification_attempts, 2);
  assert.equal(calls, 1);
  assert.deepEqual(delays, [250]);
});

test("gh Issue reader uses one fixed READONLY command and validates its JSON", async () => {
  const calls = [];
  const reader = createGhIssueReader((args) => {
    calls.push(args);
    return {
      ok: true,
      status: 0,
      stdout: JSON.stringify({ ...ISSUE, labels: ISSUE.labels.map((name) => ({ name })) }),
      stderr: "",
    };
  });
  assert.deepEqual(await reader("igapyon/example", 42), ISSUE);
  assert.deepEqual(calls, [[
    "issue", "view", "42",
    "--repo", "igapyon/example",
    "--json", "number,url,title,state,labels,updatedAt",
  ]]);
});

test("gh label reader uses one fixed READONLY command and validates its JSON", async () => {
  const calls = [];
  const reader = createGhLabelReader((args) => {
    calls.push(args);
    return {
      ok: true,
      status: 0,
      stdout: JSON.stringify(AVAILABLE.map((name) => ({ name }))),
      stderr: "",
    };
  });
  assert.deepEqual(await reader("igapyon/example"), AVAILABLE);
  assert.deepEqual(calls, [[
    "label", "list",
    "--repo", "igapyon/example",
    "--limit", "1000",
    "--json", "name",
  ]]);
});

test("pre-mutation READONLY failure is not-applied and invokes no mutation", async (t) => {
  const state = await scenario(t);
  const preflight = await runIssueLabelUpdate(optionsFor(state), {
    readLabels: async () => AVAILABLE,
    readIssue: async () => ISSUE,
  });
  let mutationCalls = 0;
  const result = await runIssueLabelUpdate(applyOptions(state, preflight), {
    readLabels: async () => AVAILABLE,
    readIssue: async () => { throw new Error("gh issue view unavailable"); },
    ghMutation: () => { mutationCalls += 1; },
  });
  assert.equal(result.status, "not-applied");
  assert.equal(mutationCalls, 0);
});
