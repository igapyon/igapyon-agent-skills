import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createGhCreatedIssueReader,
  createGhLabelReader,
  parseArgs,
  parseDraft,
  runIssueCreate,
} from "../scripts/github-issue-create.mjs";

async function scenario(t, content = "A reviewed title\n\nThe reviewed body.\n") {
  const root = await mkdtemp(path.join(os.tmpdir(), "miku-scm-issue-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = path.join(root, "workplace", "miku-scm", "new-issues");
  await mkdir(directory, { recursive: true });
  const draft = path.join(directory, "issue-new-202607221230.md");
  await writeFile(draft, content, "utf8");
  return { root, draft };
}

function optionsFor(state, ...extra) {
  return parseArgs([
    "--repo", "igapyon/example",
    "--draft", state.draft,
    "--root", state.root,
    ...extra,
  ]);
}

function optionsWithLabels(state, labels, ...extra) {
  return optionsFor(
    state,
    ...labels.flatMap((label) => ["--label", label]),
    ...extra,
  );
}

function applyOptions(state, preflight, labels = preflight.labels) {
  const extra = [
    ...(preflight.parent_issue
      ? ["--parent", String(preflight.parent_issue.number)]
      : []),
    "--expected-draft-sha256", preflight.draft_sha256,
    "--expected-labels-sha256", preflight.labels_sha256,
    ...(preflight.parent_sha256
      ? ["--expected-parent-sha256", preflight.parent_sha256]
      : []),
    "--apply",
  ];
  return optionsWithLabels(state, labels, ...extra);
}

test("preflight validates and separates the paste-ready draft without invoking gh", async (t) => {
  const state = await scenario(t);
  let calls = 0;
  const result = await runIssueCreate(optionsFor(state), {
    gh: () => {
      calls += 1;
      throw new Error("gh must not run in preflight");
    },
  });

  assert.equal(result.status, "preflight-ok");
  assert.equal(result.title, "A reviewed title");
  assert.equal(result.body, "The reviewed body.\n");
  assert.match(result.draft_sha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(result.labels, []);
  assert.match(result.labels_sha256, /^[0-9a-f]{64}$/);
  assert.equal(calls, 0);
  assert.ok(result.apply_arguments.includes("--apply"));
  assert.ok(result.apply_arguments.includes(result.draft_sha256));
  await assert.rejects(access(path.join(state.root, result.attempt_record)), /ENOENT/);
});

test("apply invokes exactly gh issue create and sends only the body through the temporary file", async (t) => {
  const state = await scenario(t);
  const preflight = await runIssueCreate(optionsFor(state));
  const calls = [];
  let submittedBody = "";
  const result = await runIssueCreate(
    applyOptions(state, preflight),
    {
      gh: (args) => {
        calls.push(args);
        if (args[1] === "create") {
          submittedBody = readFileSync(args[7], "utf8");
          return {
            ok: true,
            status: 0,
            stdout: "https://github.com/igapyon/example/issues/42",
            stderr: "",
          };
        }
        return {
          ok: true,
          status: 0,
          stdout: JSON.stringify({
            number: 42,
            url: "https://github.com/igapyon/example/issues/42",
            labels: [],
            parent: null,
          }),
          stderr: "",
        };
      },
    },
  );

  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].slice(0, 6), [
    "issue", "create", "--repo", "igapyon/example", "--title", "A reviewed title",
  ]);
  assert.equal(calls[0][6], "--body-file");
  assert.deepEqual(calls[1], [
    "issue", "view", "42",
    "--repo", "igapyon/example",
    "--json", "number,url,labels,parent",
  ]);
  assert.equal(submittedBody, "The reviewed body.\n");
  assert.equal(result.status, "created");
  assert.equal(result.issue_verification.status, "verified");
  assert.equal(result.issue_url, "https://github.com/igapyon/example/issues/42");
  assert.equal(result.issue_number, 42);
  assert.equal(result.draft_archive.status, "archived");
  await assert.rejects(access(state.draft), /ENOENT/);
  assert.equal(
    await readFile(path.join(state.root, result.draft_archive.path), "utf8"),
    "A reviewed title\n\nThe reviewed body.\n",
  );
  const receipt = JSON.parse(await readFile(path.join(state.root, result.attempt_record), "utf8"));
  assert.equal(receipt.status, "created");
  assert.equal(receipt.issue_number, 42);
  assert.equal(receipt.issue_url, result.issue_url);
  assert.equal(receipt.archived_draft, result.draft_archive.path);
});

test("apply rejects a changed reviewed draft before invoking gh", async (t) => {
  const state = await scenario(t);
  const preflight = await runIssueCreate(optionsFor(state));
  await writeFile(state.draft, "Changed title\n\nChanged body.\n", "utf8");
  let calls = 0;

  await assert.rejects(
    runIssueCreate(
      applyOptions(state, preflight),
      { gh: () => { calls += 1; } },
    ),
    /Reviewed draft changed/,
  );
  assert.equal(calls, 0);
});

test("helper rejects existing-Issue update drafts and paths outside the draft directory", async (t) => {
  const state = await scenario(t);
  const updateDirectory = path.join(state.root, "workplace", "miku-scm", "issue-updates");
  await mkdir(updateDirectory, { recursive: true });
  const update = path.join(updateDirectory, "issue-42-update-202607221230.md");
  await writeFile(update, "Updated title\n\nUpdated body.\n", "utf8");
  await assert.rejects(
    runIssueCreate(parseArgs([
      "--repo", "igapyon/example", "--draft", update, "--root", state.root,
    ])),
    /directly under/,
  );

  const outside = path.join(state.root, "outside.md");
  await writeFile(outside, "Title\n\nBody.\n", "utf8");
  await assert.rejects(
    runIssueCreate(parseArgs([
      "--repo", "igapyon/example", "--draft", outside, "--root", state.root,
    ])),
    /directly under/,
  );
});

test("helper rejects malformed drafts", () => {
  assert.throws(() => parseDraft("Title only"), /title, one blank line, and a body/);
  assert.throws(() => parseDraft("# Heading\n\nBody\n"), /heading marker/);
  assert.throws(() => parseDraft("Title\r\n\r\nBody\r\n"), /LF line endings/);
  assert.throws(
    () => parseArgs([
      "--repo", "igapyon/example",
      "--draft", "workplace/miku-scm/new-issues/issue-new-202607221230.md",
      "--label", "enhancement",
      "--label", "enhancement",
    ]),
    /Duplicate --label/,
  );
  assert.throws(
    () => parseArgs([
      "--repo", "igapyon/example",
      "--draft", "workplace/miku-scm/new-issues/issue-new-202607221230.md",
      "--expected-draft-sha256", "a".repeat(64),
      "--apply",
    ]),
    /--expected-labels-sha256/,
  );
  assert.throws(
    () => parseArgs([
      "--repo", "igapyon/example",
      "--draft", "workplace/miku-scm/new-issues/issue-new-202607221230.md",
      "--parent", "0",
    ]),
    /positive decimal Issue number/,
  );
  assert.throws(
    () => parseArgs([
      "--repo", "igapyon/example",
      "--draft", "workplace/miku-scm/new-issues/issue-new-202607221230.md",
      "--parent", "275",
      "--expected-draft-sha256", "a".repeat(64),
      "--expected-labels-sha256", "b".repeat(64),
      "--apply",
    ]),
    /--expected-parent-sha256/,
  );
});

test("gh label reader uses one fixed read-only command and validates its JSON", async () => {
  const calls = [];
  const readLabels = createGhLabelReader((args) => {
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

  assert.deepEqual(await readLabels("igapyon/example"), ["bug", "enhancement"]);
  assert.deepEqual(calls, [[
    "label", "list",
    "--repo", "igapyon/example",
    "--limit", "1000",
    "--json", "name",
  ]]);

  const malformed = createGhLabelReader(() => ({
    ok: true,
    status: 0,
    stdout: JSON.stringify([{ name: "" }]),
    stderr: "",
  }));
  await assert.rejects(malformed("igapyon/example"), /malformed label metadata/);
});

test("a gh label-list failure stops preflight before an attempt or mutation", async (t) => {
  const state = await scenario(t);
  const calls = [];
  await assert.rejects(
    runIssueCreate(
      optionsWithLabels(state, ["enhancement"]),
      {
        gh: (args) => {
          calls.push(args);
          return {
            ok: false,
            status: 1,
            stdout: "",
            stderr: "label read failed",
          };
        },
      },
    ),
    /gh label list failed: label read failed/,
  );
  assert.deepEqual(calls, [[
    "label", "list",
    "--repo", "igapyon/example",
    "--limit", "1000",
    "--json", "name",
  ]]);
  const attempts = path.join(state.root, "workplace", "miku-scm", "issue-attempts");
  await assert.rejects(access(attempts), /ENOENT/);
});

test("gh created-Issue reader retrieves labels and parent in one fixed command", async () => {
  const calls = [];
  const readCreatedIssue = createGhCreatedIssueReader((args) => {
    calls.push(args);
    return {
      ok: true,
      status: 0,
      stdout: JSON.stringify({
        number: 300,
        url: "https://github.com/igapyon/example/issues/300",
        labels: [{ name: "enhancement" }],
        parent: {
          number: 275,
          url: "https://github.com/igapyon/example/issues/275",
        },
      }),
      stderr: "",
    };
  });

  assert.deepEqual(await readCreatedIssue("igapyon/example", 300), {
    number: 300,
    url: "https://github.com/igapyon/example/issues/300",
    labels: ["enhancement"],
    parent: {
      number: 275,
      url: "https://github.com/igapyon/example/issues/275",
    },
  });
  assert.deepEqual(calls, [[
    "issue", "view", "300",
    "--repo", "igapyon/example",
    "--json", "number,url,labels,parent",
  ]]);
});

test("post-create read failure is recorded without retrying the mutation", async (t) => {
  const state = await scenario(t);
  const readLabels = async () => ["enhancement"];
  const preflight = await runIssueCreate(
    optionsWithLabels(state, ["enhancement"]),
    { readLabels },
  );
  const calls = [];
  const result = await runIssueCreate(
    applyOptions(state, preflight),
    {
      readLabels,
      gh: (args) => {
        calls.push(args);
        if (args[1] === "create") {
          return {
            ok: true,
            status: 0,
            stdout: "https://github.com/igapyon/example/issues/42",
            stderr: "",
          };
        }
        return {
          ok: false,
          status: 1,
          stdout: "",
          stderr: "post-create read failed",
        };
      },
    },
  );

  assert.equal(calls.filter((args) => args[1] === "create").length, 1);
  assert.equal(calls.filter((args) => args[1] === "view").length, 1);
  assert.equal(result.status, "created");
  assert.equal(result.issue_verification.status, "unresolved");
  assert.equal(result.label_verification.status, "unresolved");
  assert.equal(result.parent_verification.status, "not-requested");
  const receipt = JSON.parse(await readFile(path.join(state.root, result.attempt_record), "utf8"));
  assert.equal(receipt.issue_verification.status, "unresolved");
  assert.equal(receipt.label_verification.status, "unresolved");
});

test("preflight and apply create one reviewed sub-issue and verify its parent", async (t) => {
  const state = await scenario(t);
  const parent = {
    number: 275,
    url: "https://github.com/igapyon/example/issues/275",
    title: "Parent work",
    state: "OPEN",
    updated_at: "2026-07-25T00:00:00Z",
  };
  const preflightCalls = [];
  const preflight = await runIssueCreate(
    optionsFor(state, "--parent", "275"),
    {
      gh: (args) => {
        preflightCalls.push(args);
        return {
          ok: true,
          status: 0,
          stdout: JSON.stringify({
            number: parent.number,
            url: parent.url,
            title: parent.title,
            state: parent.state,
            updatedAt: parent.updated_at,
          }),
          stderr: "",
        };
      },
    },
  );

  assert.deepEqual(preflightCalls, [[
    "issue", "view", "275",
    "--repo", "igapyon/example",
    "--json", "number,url,title,state,updatedAt",
  ]]);
  assert.deepEqual(preflight.parent_issue, parent);
  assert.match(preflight.parent_sha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(preflight.planned_gh_arguments.slice(-2), ["--parent", "275"]);
  assert.ok(preflight.apply_arguments.includes(preflight.parent_sha256));

  const calls = [];
  let submittedBody = "";
  const result = await runIssueCreate(
    applyOptions(state, preflight),
    {
      gh: (args) => {
        calls.push(args);
        if (args[1] === "view" && args[2] === "275") {
          return {
            ok: true,
            status: 0,
            stdout: JSON.stringify({
              number: parent.number,
              url: parent.url,
              title: parent.title,
              state: parent.state,
              updatedAt: parent.updated_at,
            }),
            stderr: "",
          };
        }
        if (args[1] === "create") {
          const bodyIndex = args.indexOf("--body-file") + 1;
          submittedBody = readFileSync(args[bodyIndex], "utf8");
          return {
            ok: true,
            status: 0,
            stdout: "https://github.com/igapyon/example/issues/300",
            stderr: "",
          };
        }
        return {
          ok: true,
          status: 0,
          stdout: JSON.stringify({
            number: 300,
            url: "https://github.com/igapyon/example/issues/300",
            labels: [],
            parent: {
              number: parent.number,
              url: parent.url,
            },
          }),
          stderr: "",
        };
      },
    },
  );

  assert.equal(submittedBody, "The reviewed body.\n");
  assert.equal(calls.filter((args) => args[1] === "create").length, 1);
  assert.deepEqual(calls.find((args) => args[1] === "create").slice(-2), [
    "--parent", "275",
  ]);
  assert.equal(result.status, "created");
  assert.equal(result.parent_verification.status, "verified");
  const receipt = JSON.parse(await readFile(path.join(state.root, result.attempt_record), "utf8"));
  assert.equal(receipt.parent_issue.number, 275);
  assert.equal(receipt.parent_verification.status, "verified");
});

test("apply rejects a changed reviewed parent before creating an Issue", async (t) => {
  const state = await scenario(t);
  const original = {
    number: 275,
    url: "https://github.com/igapyon/example/issues/275",
    title: "Parent work",
    state: "OPEN",
    updated_at: "2026-07-25T00:00:00Z",
  };
  const preflight = await runIssueCreate(
    optionsFor(state, "--parent", "275"),
    { readParent: async () => original },
  );
  let mutationCalls = 0;

  await assert.rejects(
    runIssueCreate(
      applyOptions(state, preflight),
      {
        readParent: async () => ({
          ...original,
          title: "Changed parent",
          updated_at: "2026-07-25T00:01:00Z",
        }),
        gh: () => {
          mutationCalls += 1;
          return { ok: true, stdout: "https://github.com/igapyon/example/issues/300" };
        },
      },
    ),
    /Reviewed parent Issue changed/,
  );
  assert.equal(mutationCalls, 0);
});

test("a created Issue with an unconfirmed parent is recorded without retrying creation", async (t) => {
  const state = await scenario(t);
  const parent = {
    number: 275,
    url: "https://github.com/igapyon/example/issues/275",
    title: "Parent work",
    state: "OPEN",
    updated_at: "2026-07-25T00:00:00Z",
  };
  const preflight = await runIssueCreate(
    optionsFor(state, "--parent", "275"),
    { readParent: async () => parent },
  );
  let mutationCalls = 0;
  const result = await runIssueCreate(
    applyOptions(state, preflight),
    {
      readParent: async () => parent,
      readCreatedIssue: async () => ({
        number: 300,
        url: "https://github.com/igapyon/example/issues/300",
        parent: null,
      }),
      gh: () => {
        mutationCalls += 1;
        return {
          ok: true,
          status: 0,
          stdout: "https://github.com/igapyon/example/issues/300",
          stderr: "",
        };
      },
    },
  );

  assert.equal(mutationCalls, 1);
  assert.equal(result.status, "created");
  assert.equal(result.parent_verification.status, "mismatch");
  const receipt = JSON.parse(await readFile(path.join(state.root, result.attempt_record), "utf8"));
  assert.equal(receipt.status, "created");
  assert.equal(receipt.parent_verification.status, "mismatch");
});

test("preflight validates requested labels and apply fixes them to the reviewed selection", async (t) => {
  const state = await scenario(t);
  const readLabels = async () => ["bug", "documentation", "enhancement"];
  const preflight = await runIssueCreate(
    optionsWithLabels(state, ["enhancement", "documentation"]),
    { readLabels },
  );

  assert.deepEqual(preflight.labels, ["enhancement", "documentation"]);
  assert.deepEqual(preflight.planned_gh_arguments.slice(-4), [
    "--label", "enhancement", "--label", "documentation",
  ]);
  assert.ok(preflight.apply_arguments.includes(preflight.labels_sha256));

  const calls = [];
  const result = await runIssueCreate(
    applyOptions(state, preflight),
    {
      readLabels,
      readCreatedIssue: async () => ({
        number: 42,
        url: "https://github.com/igapyon/example/issues/42",
        labels: ["documentation", "enhancement"],
        parent: null,
      }),
      gh: (args) => {
        calls.push(args);
        return {
          ok: true,
          status: 0,
          stdout: "https://github.com/igapyon/example/issues/42",
          stderr: "",
        };
      },
    },
  );

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].slice(-4), [
    "--label", "enhancement", "--label", "documentation",
  ]);
  assert.equal(result.label_verification.status, "verified");
  assert.deepEqual(result.label_verification.missing_labels, []);
  const receipt = JSON.parse(await readFile(path.join(state.root, result.attempt_record), "utf8"));
  assert.deepEqual(receipt.labels, ["enhancement", "documentation"]);
  assert.equal(receipt.label_verification.status, "verified");
});

test("preflight rejects labels absent from the target repository", async (t) => {
  const state = await scenario(t);
  await assert.rejects(
    runIssueCreate(
      optionsWithLabels(state, ["enhance"]),
      { readLabels: async () => ["bug", "enhancement"] },
    ),
    /do not exist exactly.*enhance/,
  );
});

test("apply rejects a changed label selection before invoking gh", async (t) => {
  const state = await scenario(t);
  const readLabels = async () => ["bug", "enhancement"];
  const preflight = await runIssueCreate(
    optionsWithLabels(state, ["enhancement"]),
    { readLabels },
  );
  let calls = 0;
  await assert.rejects(
    runIssueCreate(
      applyOptions(state, preflight, ["bug"]),
      {
        readLabels,
        gh: () => {
          calls += 1;
          return { ok: true, stdout: "https://github.com/igapyon/example/issues/42" };
        },
      },
    ),
    /Reviewed label selection changed/,
  );
  assert.equal(calls, 0);
});

test("a created Issue with missing requested labels is recorded without retrying creation", async (t) => {
  const state = await scenario(t);
  const readLabels = async () => ["bug", "enhancement"];
  const preflight = await runIssueCreate(
    optionsWithLabels(state, ["enhancement"]),
    { readLabels },
  );
  let calls = 0;
  const result = await runIssueCreate(
    applyOptions(state, preflight),
    {
      readLabels,
      readCreatedIssue: async () => ({
        number: 42,
        url: "https://github.com/igapyon/example/issues/42",
        labels: ["bug"],
        parent: null,
      }),
      gh: () => {
        calls += 1;
        return {
          ok: true,
          status: 0,
          stdout: "https://github.com/igapyon/example/issues/42",
          stderr: "",
        };
      },
    },
  );

  assert.equal(calls, 1);
  assert.equal(result.status, "created");
  assert.equal(result.label_verification.status, "mismatch");
  assert.deepEqual(result.label_verification.missing_labels, ["enhancement"]);
  const receipt = JSON.parse(await readFile(path.join(state.root, result.attempt_record), "utf8"));
  assert.equal(receipt.status, "created");
  assert.equal(receipt.label_verification.status, "mismatch");
});

test("gh failure is surfaced as uncertain and is never retried", async (t) => {
  const state = await scenario(t);
  const preflight = await runIssueCreate(optionsFor(state));
  let calls = 0;
  await assert.rejects(
    runIssueCreate(
      applyOptions(state, preflight),
      {
        gh: () => {
          calls += 1;
          return { ok: false, status: 1, stdout: "", stderr: "network failure" };
        },
      },
    ),
    /Do not retry automatically/,
  );
  assert.equal(calls, 1);
  const receipt = JSON.parse(await readFile(path.join(state.root, preflight.attempt_record), "utf8"));
  assert.equal(receipt.status, "pending");
  await assert.rejects(
    runIssueCreate(optionsFor(state), {
      gh: () => {
        calls += 1;
        throw new Error("gh must not run after a pending attempt");
      },
    }),
    /pending or uncertain/,
  );
  assert.equal(calls, 1);
});

test("a successful command without the exact repository Issue URL remains unresolved", async (t) => {
  const state = await scenario(t);
  const preflight = await runIssueCreate(optionsFor(state));
  await assert.rejects(
    runIssueCreate(
      applyOptions(state, preflight),
      { gh: () => ({ ok: true, status: 0, stdout: "created", stderr: "" }) },
    ),
    /outcome as unresolved/,
  );
  const receipt = JSON.parse(await readFile(path.join(state.root, preflight.attempt_record), "utf8"));
  assert.equal(receipt.status, "pending");
});

test("a copied draft with the same repository and digest cannot be registered twice", async (t) => {
  const content = "A reviewed title\n\nThe reviewed body.\n";
  const state = await scenario(t, content);
  const preflight = await runIssueCreate(optionsFor(state));
  await runIssueCreate(
    applyOptions(state, preflight),
    {
      gh: () => ({
        ok: true,
        status: 0,
        stdout: "https://github.com/igapyon/example/issues/42",
        stderr: "",
      }),
    },
  );

  const copiedDraft = path.join(
    state.root,
    "workplace",
    "miku-scm",
    "new-issues",
    "issue-new-202607221230-2.md",
  );
  await writeFile(copiedDraft, content, "utf8");
  await assert.rejects(
    runIssueCreate(parseArgs([
      "--repo", "igapyon/example",
      "--draft", copiedDraft,
      "--root", state.root,
    ])),
    /already registered/,
  );
});
