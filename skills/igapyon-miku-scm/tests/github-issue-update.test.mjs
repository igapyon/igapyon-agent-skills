import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  access,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  bodyDiff,
  createGhIssueReader,
  createGhLabelReader,
  parseArgs,
  runIssueUpdate,
} from "../scripts/github-issue-update.mjs";

const CURRENT = {
  number: 42,
  url: "https://github.com/igapyon/example/issues/42",
  title: "Existing title",
  body: "Old body.\n",
  labels: ["bug"],
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

function applyOptions(state, preflight, ...operationArgs) {
  const contractIndex = preflight.apply_arguments.indexOf("--expected-contract-pair-sha256");
  return optionsFor(
    state,
    ...operationArgs,
    "--expected-draft-sha256", preflight.draft_sha256,
    "--expected-update-sha256", preflight.update_sha256,
    "--expected-current-issue-sha256", preflight.current_issue_sha256,
    "--expected-updated-at", preflight.current_updated_at,
    "--expected-contract-pair-sha256", preflight.apply_arguments[contractIndex + 1],
    "--apply",
  );
}

test("preflight retrieves the Issue through the fixed reader and exposes complete review evidence", async (t) => {
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
  assert.equal(result.proposed_title, CURRENT.title);
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
  assert.ok(result.apply_arguments.includes(result.current_issue_sha256));
  assert.ok(result.apply_arguments.includes(result.update_sha256));
  assert.ok(result.apply_arguments.includes(result.current_updated_at));
  assert.ok(result.apply_arguments.includes("--expected-contract-pair-sha256"));
  await assert.rejects(access(path.join(state.root, result.attempt_record)), /ENOENT/);
});

test("preflight permits a reviewed title change", async (t) => {
  const state = await scenario(t, "Changed title\n\nNew body.\n");
  const result = await runIssueUpdate(optionsFor(state), {
    readIssue: async () => CURRENT,
  });
  assert.equal(result.status, "preflight-ok");
  assert.equal(result.current_title, CURRENT.title);
  assert.equal(result.proposed_title, "Changed title");
  assert.deepEqual(result.planned_gh_arguments.slice(0, 8), [
    "issue", "edit", "42", "--repo", "igapyon/example",
    "--title", "Changed title", "--body-file",
  ]);
});

test("one reviewed update can change title, body, and existing labels", async (t) => {
  const state = await scenario(t, "Changed title\n\nNew body.\n");
  const operation = ["--add-label", "enhancement", "--remove-label", "bug"];
  const preflight = await runIssueUpdate(optionsFor(state, ...operation), {
    readLabels: async () => ["bug", "enhancement"],
    readIssue: async () => CURRENT,
  });
  assert.deepEqual(preflight.current_labels, ["bug"]);
  assert.deepEqual(preflight.resulting_labels, ["enhancement"]);
  assert.deepEqual(preflight.planned_gh_arguments, [
    "issue", "edit", "42", "--repo", "igapyon/example",
    "--title", "Changed title",
    "--body-file", "<generated-temporary-body-file>",
    "--add-label", "enhancement",
    "--remove-label", "bug",
  ]);

  const calls = [];
  const result = await runIssueUpdate(applyOptions(state, preflight, ...operation), {
    readLabels: async () => ["bug", "enhancement"],
    readIssue: async (_repository, _issueNumber, options) => options?.cacheBypass
      ? {
        ...CURRENT,
        title: "Changed title",
        body: "New body.\n",
        labels: ["enhancement"],
        updatedAt: "2026-07-23T01:03:04Z",
      }
      : CURRENT,
    gh: (args) => {
      calls.push(args);
      return { ok: true, status: 0, stdout: CURRENT.url, stderr: "" };
    },
  });
  assert.equal(result.status, "updated");
  assert.equal(calls.length, 1);
  assert.equal(calls[0][5], "--title");
  assert.equal(calls[0][6], "Changed title");
  assert.equal(calls[0][7], "--body-file");
  assert.deepEqual(calls[0].slice(9), [
    "--add-label", "enhancement", "--remove-label", "bug",
  ]);
  assert.equal(result.verified_title, "Changed title");
  assert.deepEqual(result.verified_labels, ["enhancement"]);
});

test("integrated label update rejects nonexistent and no-op labels", async (t) => {
  const state = await scenario(t);
  await assert.rejects(
    runIssueUpdate(optionsFor(state, "--add-label", "enhance"), {
      readLabels: async () => ["bug", "enhancement"],
    }),
    /do not exist exactly/,
  );
  await assert.rejects(
    runIssueUpdate(optionsFor(state, "--add-label", "bug"), {
      readLabels: async () => ["bug", "enhancement"],
      readIssue: async () => CURRENT,
    }),
    /already present/,
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
  assert.equal(result.verification_attempts, 1);
  const record = JSON.parse(await readFile(path.join(state.root, result.attempt_record), "utf8"));
  assert.equal(record.status, "updated");
  assert.equal(record.issue_url, CURRENT.url);
});

test("post-update verification tolerates one stale read without retrying mutation", async (t) => {
  const state = await scenario(t);
  const preflight = await runIssueUpdate(optionsFor(state), {
    readIssue: async () => CURRENT,
  });
  const fresh = { ...CURRENT, body: "New body.\n", updatedAt: "2026-07-23T01:03:04Z" };
  const reads = [CURRENT, CURRENT, fresh];
  const readOptions = [];
  const delays = [];
  let ghCalls = 0;
  const result = await runIssueUpdate(applyOptions(state, preflight), {
    readIssue: async (_repository, _issueNumber, options) => {
      readOptions.push(options);
      return reads.shift();
    },
    gh: () => {
      ghCalls += 1;
      return { ok: true, status: 0, stdout: CURRENT.url, stderr: "" };
    },
    sleep: async (milliseconds) => {
      delays.push(milliseconds);
    },
  });

  assert.equal(result.status, "updated");
  assert.equal(result.verification_attempts, 2);
  assert.equal(ghCalls, 1);
  assert.deepEqual(delays, [250]);
  assert.equal(readOptions[0], undefined);
  assert.deepEqual(readOptions.slice(1), [
    { cacheBypass: true, verificationAttempt: 1 },
    { cacheBypass: true, verificationAttempt: 2 },
  ]);
});

test("gh issue reader uses one fixed read-only command and validates its JSON", async () => {
  const calls = [];
  const reader = createGhIssueReader((args) => {
    calls.push(args);
    return {
      ok: true,
      status: 0,
      stdout: JSON.stringify({
        number: CURRENT.number,
        url: CURRENT.url,
        title: CURRENT.title,
        body: CURRENT.body,
        labels: CURRENT.labels.map((name) => ({ name })),
        updatedAt: CURRENT.updatedAt,
      }),
      stderr: "",
    };
  });
  assert.deepEqual(await reader("igapyon/example", 42), CURRENT);
  assert.deepEqual(calls, [[
    "issue", "view", "42",
    "--repo", "igapyon/example",
    "--json", "number,url,title,body,labels,updatedAt",
  ]]);
});

test("gh label reader uses one fixed read-only command", async () => {
  const calls = [];
  const reader = createGhLabelReader((args) => {
    calls.push(args);
    return {
      ok: true,
      status: 0,
      stdout: JSON.stringify([
        { name: "bug" },
        { name: "enhancement" },
      ]),
      stderr: "",
    };
  });
  assert.deepEqual(await reader("igapyon/example"), ["bug", "enhancement"]);
  assert.deepEqual(calls, [[
    "label", "list",
    "--repo", "igapyon/example",
    "--limit", "1000",
    "--json", "name",
  ]]);
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

test("approved apply uses read-only gh issue view before and after mutation", async (t) => {
  const state = await scenario(t);
  const preflight = await runIssueUpdate(optionsFor(state), {
    readIssue: async () => CURRENT,
  });
  const fresh = { ...CURRENT, body: "New body.\n", updatedAt: "2026-07-23T01:03:04Z" };
  let anonymousReads = 0;
  let ghReads = 0;
  let ghEdits = 0;
  const result = await runIssueUpdate(applyOptions(state, preflight), {
    readIssue: async () => {
      anonymousReads += 1;
      throw new TypeError("fetch failed");
    },
    readIssueWithGh: async () => {
      ghReads += 1;
      return ghReads === 1 ? CURRENT : fresh;
    },
    gh: () => {
      ghEdits += 1;
      return { ok: true, status: 0, stdout: CURRENT.url, stderr: "" };
    },
  });
  assert.equal(result.status, "updated");
  assert.equal(result.pre_update_read_source, "gh-issue-view");
  assert.equal(anonymousReads, 0);
  assert.equal(ghReads, 2);
  assert.equal(ghEdits, 1);
});

test("gh issue view failure before edit is not-applied and can recover safely", async (t) => {
  const state = await scenario(t);
  const preflight = await runIssueUpdate(optionsFor(state), {
    readIssue: async () => CURRENT,
  });
  let ghEdits = 0;
  const failed = await runIssueUpdate(applyOptions(state, preflight), {
    readIssue: async () => {
      throw new TypeError("fetch failed");
    },
    readIssueWithGh: async () => {
      throw new Error("gh issue view network failure");
    },
    gh: () => {
      ghEdits += 1;
      return { ok: true };
    },
  });
  assert.equal(failed.status, "not-applied");
  assert.equal(failed.gh_invoked, false);
  assert.equal(ghEdits, 0);
  const failedRecord = JSON.parse(
    await readFile(path.join(state.root, failed.attempt_record), "utf8"),
  );
  assert.equal(failedRecord.status, "not-applied");

  const reads = [
    CURRENT,
    { ...CURRENT, body: "New body.\n", updatedAt: "2026-07-23T01:03:04Z" },
  ];
  const recovered = await runIssueUpdate(applyOptions(state, preflight), {
    readIssue: async () => reads.shift(),
    gh: () => {
      ghEdits += 1;
      return { ok: true, status: 0, stdout: CURRENT.url, stderr: "" };
    },
  });
  assert.equal(recovered.status, "updated");
  assert.equal(recovered.retrying_not_applied_attempt, true);
  assert.equal(ghEdits, 1);
  const files = await readdir(path.dirname(path.join(state.root, failed.attempt_record)));
  assert.ok(files.some((name) => name.includes(".not-applied-")));
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
  let reads = 0;
  const result = await runIssueUpdate(applyOptions(state, preflight), {
    readIssue: async () => {
      reads += 1;
      return reads === 1 ? CURRENT : { ...CURRENT, body: "Unexpected body.\n" };
    },
    gh: () => ({ ok: true, status: 0, stdout: CURRENT.url, stderr: "" }),
    sleep: async () => {},
  });
  assert.equal(result.status, "unresolved");
  assert.equal(result.stage, "post-update-verification");
  assert.equal(reads, 4);
  const record = JSON.parse(await readFile(path.join(state.root, result.attempt_record), "utf8"));
  assert.equal(record.status, "unresolved");
  assert.equal(record.verification_attempts, 3);
});

test("body diff has a bounded fallback for very large line matrices", () => {
  const before = Array.from({ length: 1_001 }, (_, index) => `old-${index}`).join("\n");
  const after = Array.from({ length: 1_001 }, (_, index) => `new-${index}`).join("\n");
  assert.match(bodyDiff(before, after), /input is too large/);
});
