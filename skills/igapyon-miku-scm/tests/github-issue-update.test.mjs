import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  bodyDiff,
  createAnonymousIssueReader,
  parseArgs,
  runIssueUpdate,
} from "../scripts/github-issue-update.mjs";

const CURRENT = {
  number: 42,
  url: "https://github.com/igapyon/example/issues/42",
  title: "Existing title",
  body: "Old body.\n",
  updatedAt: "2026-07-23T01:02:03Z",
};

async function scenario(t, content = "Existing title\n\nNew body.\n") {
  const root = await mkdtemp(path.join(os.tmpdir(), "miku-scm-issue-update-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = path.join(root, "workplace", "miku-scm", "issue-updates");
  await mkdir(directory, { recursive: true });
  const draft = path.join(directory, "issue-42-update-202607231230.md");
  await writeFile(draft, content, "utf8");
  return { root, draft };
}

function optionsFor(state, ...extra) {
  return parseArgs([
    "--repo", "igapyon/example",
    "--issue", "42",
    "--draft", state.draft,
    "--root", state.root,
    ...extra,
  ]);
}

function applyOptions(state, preflight) {
  return optionsFor(
    state,
    "--expected-draft-sha256", preflight.draft_sha256,
    "--expected-current-body-sha256", preflight.current_body_sha256,
    "--expected-updated-at", preflight.current_updated_at,
    "--apply",
  );
}

test("preflight retrieves the Issue anonymously and exposes complete review evidence", async (t) => {
  const state = await scenario(t);
  let ghCalls = 0;
  const result = await runIssueUpdate(optionsFor(state), {
    readIssue: async () => CURRENT,
    gh: () => {
      ghCalls += 1;
      throw new Error("gh must not run during preflight");
    },
  });

  assert.equal(result.status, "preflight-ok");
  assert.equal(result.issue_url, CURRENT.url);
  assert.equal(result.current_title, CURRENT.title);
  assert.equal(result.current_body, CURRENT.body);
  assert.equal(result.proposed_body, "New body.\n");
  assert.match(result.current_body_sha256, /^[0-9a-f]{64}$/);
  assert.match(result.draft_sha256, /^[0-9a-f]{64}$/);
  assert.equal(result.current_updated_at, CURRENT.updatedAt);
  assert.match(result.body_diff, /^--- current-body\n\+\+\+ proposed-body/m);
  assert.match(result.body_diff, /-Old body\./);
  assert.match(result.body_diff, /\+New body\./);
  assert.equal(ghCalls, 0);
  assert.ok(result.apply_arguments.includes("--apply"));
  assert.ok(result.apply_arguments.includes(result.current_body_sha256));
  assert.ok(result.apply_arguments.includes(result.current_updated_at));
  await assert.rejects(access(path.join(state.root, result.attempt_record)), /ENOENT/);
});

test("anonymous reader uses only GET without authorization and rejects Pull Requests", async () => {
  const calls = [];
  const reader = createAnonymousIssueReader(async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      json: async () => ({
        number: 42,
        html_url: CURRENT.url,
        title: CURRENT.title,
        body: CURRENT.body,
        updated_at: CURRENT.updatedAt,
      }),
    };
  });
  assert.deepEqual(await reader("igapyon/example", 42), CURRENT);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.method, "GET");
  assert.equal("Authorization" in calls[0].options.headers, false);

  const pullReader = createAnonymousIssueReader(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      number: 42,
      html_url: CURRENT.url,
      title: CURRENT.title,
      body: CURRENT.body,
      updated_at: CURRENT.updatedAt,
      pull_request: {},
    }),
  }));
  await assert.rejects(pullReader("igapyon/example", 42), /Pull Request/);
});

test("preflight rejects title changes", async (t) => {
  const state = await scenario(t, "Changed title\n\nNew body.\n");
  await assert.rejects(
    runIssueUpdate(optionsFor(state), { readIssue: async () => CURRENT }),
    /title changes are outside/,
  );
});

test("helper rejects a mismatched Issue number and drafts outside issue-updates", async (t) => {
  const state = await scenario(t);
  await assert.rejects(
    runIssueUpdate(parseArgs([
      "--repo", "igapyon/example",
      "--issue", "41",
      "--draft", state.draft,
      "--root", state.root,
    ]), { readIssue: async () => CURRENT }),
    /must match --issue/,
  );

  const outside = path.join(state.root, "outside.md");
  await writeFile(outside, "Existing title\n\nNew body.\n", "utf8");
  await assert.rejects(
    runIssueUpdate(parseArgs([
      "--repo", "igapyon/example",
      "--issue", "42",
      "--draft", outside,
      "--root", state.root,
    ]), { readIssue: async () => CURRENT }),
    /directly under/,
  );
});

test("apply invokes exactly one body-only gh edit and verifies the result", async (t) => {
  const state = await scenario(t);
  const preflight = await runIssueUpdate(optionsFor(state), {
    readIssue: async () => CURRENT,
  });
  const reads = [
    CURRENT,
    { ...CURRENT, body: "New body.\n", updatedAt: "2026-07-23T01:03:04Z" },
  ];
  const calls = [];
  let submittedBody = "";
  const result = await runIssueUpdate(applyOptions(state, preflight), {
    readIssue: async () => reads.shift(),
    gh: (args) => {
      calls.push(args);
      submittedBody = readFileSync(args[6], "utf8");
      return { ok: true, status: 0, stdout: CURRENT.url, stderr: "" };
    },
  });

  assert.equal(result.status, "updated");
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].slice(0, 6), [
    "issue", "edit", "42", "--repo", "igapyon/example", "--body-file",
  ]);
  assert.equal(submittedBody, "New body.\n");
  assert.equal(result.issue_url, CURRENT.url);
  assert.equal(result.verified_updated_at, "2026-07-23T01:03:04Z");
  const record = JSON.parse(await readFile(path.join(state.root, result.attempt_record), "utf8"));
  assert.equal(record.status, "updated");
  assert.equal(record.issue_url, CURRENT.url);
});

test("apply records conflict and never invokes gh when the Issue changed after review", async (t) => {
  const state = await scenario(t);
  const preflight = await runIssueUpdate(optionsFor(state), {
    readIssue: async () => CURRENT,
  });
  let ghCalls = 0;
  const result = await runIssueUpdate(applyOptions(state, preflight), {
    readIssue: async () => ({
      ...CURRENT,
      body: "Someone else changed this.\n",
      updatedAt: "2026-07-23T02:00:00Z",
    }),
    gh: () => {
      ghCalls += 1;
      return { ok: true };
    },
  });

  assert.equal(result.status, "conflict");
  assert.equal(ghCalls, 0);
  const record = JSON.parse(await readFile(path.join(state.root, result.attempt_record), "utf8"));
  assert.equal(record.status, "conflict");
  assert.equal(record.observed_updated_at, "2026-07-23T02:00:00Z");
});

test("a changed reviewed draft is rejected before an attempt or remote read", async (t) => {
  const state = await scenario(t);
  const preflight = await runIssueUpdate(optionsFor(state), {
    readIssue: async () => CURRENT,
  });
  await writeFile(state.draft, "Existing title\n\nChanged again.\n", "utf8");
  let reads = 0;
  await assert.rejects(
    runIssueUpdate(applyOptions(state, preflight), {
      readIssue: async () => {
        reads += 1;
        return CURRENT;
      },
    }),
    /Reviewed draft changed/,
  );
  assert.equal(reads, 0);
});

test("gh failure is unresolved, is not retried, and blocks the same draft", async (t) => {
  const state = await scenario(t);
  const preflight = await runIssueUpdate(optionsFor(state), {
    readIssue: async () => CURRENT,
  });
  let ghCalls = 0;
  const result = await runIssueUpdate(applyOptions(state, preflight), {
    readIssue: async () => CURRENT,
    gh: () => {
      ghCalls += 1;
      return { ok: false, status: 1, stdout: "", stderr: "network failure" };
    },
  });
  assert.equal(result.status, "unresolved");
  assert.equal(result.stage, "gh-issue-edit");
  assert.equal(ghCalls, 1);

  await assert.rejects(
    runIssueUpdate(optionsFor(state), { readIssue: async () => CURRENT }),
    /already has a unresolved attempt/,
  );
  assert.equal(ghCalls, 1);
});

test("post-update body mismatch is unresolved", async (t) => {
  const state = await scenario(t);
  const preflight = await runIssueUpdate(optionsFor(state), {
    readIssue: async () => CURRENT,
  });
  const reads = [CURRENT, { ...CURRENT, body: "Unexpected body.\n" }];
  const result = await runIssueUpdate(applyOptions(state, preflight), {
    readIssue: async () => reads.shift(),
    gh: () => ({ ok: true, status: 0, stdout: CURRENT.url, stderr: "" }),
  });
  assert.equal(result.status, "unresolved");
  assert.equal(result.stage, "post-update-verification");
  const record = JSON.parse(await readFile(path.join(state.root, result.attempt_record), "utf8"));
  assert.equal(record.status, "unresolved");
});

test("body diff has a bounded fallback for very large line matrices", () => {
  const before = Array.from({ length: 1_001 }, (_, index) => `old-${index}`).join("\n");
  const after = Array.from({ length: 1_001 }, (_, index) => `new-${index}`).join("\n");
  assert.match(bodyDiff(before, after), /input is too large/);
});
