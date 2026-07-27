import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createGhCommentReader,
  createGhIssueReader,
  parseArgs,
  runIssueComment,
} from "../scripts/github-issue-comment.mjs";

const ISSUE = {
  number: 42,
  url: "https://github.com/igapyon/example/issues/42",
  title: "Example",
  body: "Current Issue body.\n",
  state: "OPEN",
  labels: ["enhancement"],
  updatedAt: "2026-07-24T01:02:03Z",
};

async function scenario(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "miku-scm-comment-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = path.join(root, "workplace", "miku-scm", "issue-comments");
  await mkdir(directory, { recursive: true });
  const draft = path.join(directory, "issue-42-comment-202607242300.md");
  await writeFile(draft, "A reviewed comment.\n", "utf8");
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
  const contractIndex = preflight.apply_arguments.indexOf("--expected-contract-pair-sha256");
  return optionsFor(
    state,
    "--expected-draft-sha256", preflight.draft_sha256,
    "--expected-issue-sha256", preflight.current_issue_sha256,
    "--expected-updated-at", preflight.current_updated_at,
    "--expected-contract-pair-sha256", preflight.apply_arguments[contractIndex + 1],
    "--apply",
  );
}

test("preflight returns complete comment review evidence without gh", async (t) => {
  const state = await scenario(t);
  let calls = 0;
  const result = await runIssueComment(optionsFor(state), {
    readIssue: async () => ISSUE,
    gh: () => { calls += 1; },
  });
  assert.equal(result.status, "preflight-ok");
  assert.equal(result.comment_body, "A reviewed comment.\n");
  assert.equal(result.issue_state, "OPEN");
  assert.match(result.draft_sha256, /^[0-9a-f]{64}$/);
  assert.ok(result.apply_arguments.includes("--expected-contract-pair-sha256"));
  assert.equal(calls, 0);
  await assert.rejects(access(path.join(state.root, result.attempt_record)), /ENOENT/);
});

test("apply invokes one body-file comment and verifies its exact URL and body", async (t) => {
  const state = await scenario(t);
  const preflight = await runIssueComment(optionsFor(state), {
    readIssue: async () => ISSUE,
  });
  const calls = [];
  const result = await runIssueComment(applyOptions(state, preflight), {
    readIssue: async () => ISSUE,
    readComment: async () => ({
      id: 77,
      url: `${ISSUE.url}#issuecomment-77`,
      body: "A reviewed comment.\n",
    }),
    gh: (args) => {
      calls.push(args);
      assert.equal(readFileSync(args.at(-1), "utf8"), "A reviewed comment.\n");
      return { ok: true, stdout: `${ISSUE.url}#issuecomment-77`, stderr: "" };
    },
  });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].slice(0, -1), [
    "issue", "comment", "42",
    "--repo", "igapyon/example",
    "--body-file",
  ]);
  assert.equal(result.status, "commented");
  assert.equal(result.comment_url, `${ISSUE.url}#issuecomment-77`);
  const record = JSON.parse(await readFile(path.join(state.root, result.attempt_record), "utf8"));
  assert.equal(record.status, "commented");
});

test("changed Issue state is a conflict and prevents gh", async (t) => {
  const state = await scenario(t);
  const preflight = await runIssueComment(optionsFor(state), {
    readIssue: async () => ISSUE,
  });
  let calls = 0;
  const result = await runIssueComment(applyOptions(state, preflight), {
    readIssue: async () => ({ ...ISSUE, updatedAt: "2026-07-24T02:00:00Z" }),
    gh: () => { calls += 1; },
  });
  assert.equal(result.status, "conflict");
  assert.equal(calls, 0);
});

test("gh failure is unresolved and the same draft cannot be retried", async (t) => {
  const state = await scenario(t);
  const preflight = await runIssueComment(optionsFor(state), {
    readIssue: async () => ISSUE,
  });
  let calls = 0;
  const result = await runIssueComment(applyOptions(state, preflight), {
    readIssue: async () => ISSUE,
    gh: () => {
      calls += 1;
      return { ok: false, stderr: "network failure" };
    },
  });
  assert.equal(result.status, "unresolved");
  assert.equal(calls, 1);
  await assert.rejects(
    runIssueComment(optionsFor(state), { readIssue: async () => ISSUE }),
    /Do not retry/,
  );
});

test("post-comment verification retries reads but never mutation", async (t) => {
  const state = await scenario(t);
  const preflight = await runIssueComment(optionsFor(state), {
    readIssue: async () => ISSUE,
  });
  let reads = 0;
  let calls = 0;
  const delays = [];
  const result = await runIssueComment(applyOptions(state, preflight), {
    readIssue: async () => ISSUE,
    readComment: async () => {
      reads += 1;
      return {
        id: 77,
        url: `${ISSUE.url}#issuecomment-77`,
        body: reads === 1 ? "stale" : "A reviewed comment.\n",
      };
    },
    gh: () => {
      calls += 1;
      return { ok: true, stdout: `${ISSUE.url}#issuecomment-77`, stderr: "" };
    },
    sleep: async (delay) => { delays.push(delay); },
  });
  assert.equal(result.status, "commented");
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
      stdout: JSON.stringify({
        ...ISSUE,
        labels: ISSUE.labels.map((name) => ({ name })),
      }),
      stderr: "",
    };
  });
  assert.deepEqual(await reader("igapyon/example", 42), ISSUE);
  assert.deepEqual(calls, [[
    "issue", "view", "42",
    "--repo", "igapyon/example",
    "--json", "number,url,title,body,state,labels,updatedAt",
  ]]);
});

test("gh comment reader uses one fixed READONLY command and validates its JSON", async () => {
  const calls = [];
  const reader = createGhCommentReader((args) => {
    calls.push(args);
    return {
      ok: true,
      status: 0,
      stdout: JSON.stringify({
        id: 77,
        html_url: `${ISSUE.url}#issuecomment-77`,
        body: "A reviewed comment.\n",
      }),
      stderr: "",
    };
  });
  assert.deepEqual(await reader("igapyon/example", 42, 77), {
    id: 77,
    url: `${ISSUE.url}#issuecomment-77`,
    body: "A reviewed comment.\n",
  });
  assert.deepEqual(calls, [[
    "api", "--method", "GET",
    "repos/igapyon/example/issues/comments/77",
  ]]);
});

test("pre-mutation READONLY failure is not-applied and invokes no mutation", async (t) => {
  const state = await scenario(t);
  const preflight = await runIssueComment(optionsFor(state), {
    readIssue: async () => ISSUE,
  });
  let mutationCalls = 0;
  const result = await runIssueComment(applyOptions(state, preflight), {
    readIssue: async () => { throw new Error("gh issue view unavailable"); },
    ghMutation: () => { mutationCalls += 1; },
  });
  assert.equal(result.status, "not-applied");
  assert.equal(mutationCalls, 0);
});
