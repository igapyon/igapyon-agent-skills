import assert from "node:assert/strict";
import test from "node:test";

import { parseArgs, runIssueRead } from "../scripts/github-issue-read.mjs";

const issue = {
  number: 7,
  state: "OPEN",
  title: "Title",
  body: "Body",
  url: "https://github.com/a/b/issues/7",
  updatedAt: "2026-07-25T00:00:00Z",
  labels: [{ name: "bug", color: "d73a4a", description: "Something isn't working" }],
};

test("list uses a fixed gh issue list command and normalizes Issue fields", () => {
  const calls = [];
  const result = runIssueRead(parseArgs(["--repo", "a/b", "--list", "--state", "all"]), { gh: (args) => {
    calls.push(args); return { ok: true, status: 0, stdout: JSON.stringify([issue]), stderr: "" };
  } });
  assert.deepEqual(calls, [["issue", "list", "--repo", "a/b", "--state", "all", "--limit", "1000", "--json", "number,state,title,body,url,updatedAt,labels"]]);
  assert.deepEqual(result.issues, [{
    number: 7,
    state: "OPEN",
    title: "Title",
    body: "Body",
    html_url: issue.url,
    updated_at: issue.updatedAt,
    labels: [{ name: "bug", color: "d73a4a", description: "Something isn't working" }],
  }]);
  const previousBytes = Buffer.byteLength(JSON.stringify(result.issues.map(({ labels: _labels, ...entry }) => entry)), "utf8");
  const currentBytes = Buffer.byteLength(JSON.stringify(result.issues), "utf8");
  assert.equal(currentBytes - previousBytes, Buffer.byteLength(JSON.stringify(result.issues[0].labels), "utf8") + 10);
});

test("list defaults to Open Issues", () => {
  const calls = [];
  const result = runIssueRead(parseArgs(["--repo", "a/b", "--list"]), { gh: (args) => {
    calls.push(args); return { ok: true, status: 0, stdout: "[]", stderr: "" };
  } });

  assert.equal(result.state, "open");
  assert.deepEqual(calls, [["issue", "list", "--repo", "a/b", "--state", "open", "--limit", "1000", "--json", "number,state,title,body,url,updatedAt,labels"]]);
});

test("list preserves empty labels and rejects incomplete or malformed label metadata", () => {
  const emptyLabels = runIssueRead(parseArgs(["--repo", "a/b", "--list"]), { gh: () => ({
    ok: true, status: 0, stderr: "", stdout: JSON.stringify([{ ...issue, labels: [] }]),
  }) });
  assert.deepEqual(emptyLabels.issues[0].labels, []);

  const malformed = [
    undefined,
    null,
    "bug",
    [{ name: " " , color: "d73a4a", description: null }],
    [{ name: "bug", color: "red", description: null }],
    [{ name: "bug", color: "d73a4a", description: 3 }],
    [
      { name: "bug", color: "d73a4a", description: null },
      { name: "bug", color: "d73a4a", description: null },
    ],
  ];
  for (const labels of malformed) {
    const fixture = { ...issue };
    if (labels !== undefined) fixture.labels = labels;
    else delete fixture.labels;
    assert.throws(() => runIssueRead(parseArgs(["--repo", "a/b", "--list"]), { gh: () => ({
      ok: true, status: 0, stderr: "", stdout: JSON.stringify([fixture]),
    }) }), /label/);
  }
});

test("single-Issue reading uses fixed Issue metadata and a paginated comment query", () => {
  const calls = [];
  const result = runIssueRead(parseArgs(["--repo", "a/b", "--issue", "7"]), { gh: (args) => {
    calls.push(args); return { ok: true, status: 0, stdout: JSON.stringify({
      ...issue,
      labels: [{ name: "bug" }],
    }), stderr: "" };
  }, ghComments: (args) => {
    calls.push(args);
    return { ok: true, status: 0, stderr: "", stdout: JSON.stringify({ data: { repository: { issue: {
      number: 7, url: issue.url, updatedAt: issue.updatedAt,
      comments: {
        nodes: [{ id: "IC_9", url: `${issue.url}#issuecomment-9`, body: "note", createdAt: "2026-07-25T01:00:00Z", author: null }],
        totalCount: 1, pageInfo: { hasNextPage: false, endCursor: null },
      },
    } } } }) };
  } });
  assert.deepEqual(calls[0], ["issue", "view", "7", "--repo", "a/b", "--json", "number,state,title,body,url,updatedAt,labels"]);
  assert.deepEqual(calls[1].slice(0, 7), ["api", "graphql", "--method", "POST", "-f", calls[1][5], "-f"]);
  assert.equal(calls[1].includes("number=7"), true);
  assert.equal(calls[1][5].includes("comments(first: 100, after: $cursor)"), true);
  assert.equal(result.issue.comments[0].body, "note");
});

test("single-Issue reading rejects incomplete comment connection evidence", () => {
  assert.throws(() => runIssueRead(parseArgs(["--repo", "a/b", "--issue", "7"]), {
    gh: () => ({
      ok: true,
      status: 0,
      stdout: JSON.stringify({
        ...issue,
        labels: [],
      }),
      stderr: "",
    }),
    ghComments: () => ({
      ok: true,
      status: 0,
      stdout: JSON.stringify({ data: { repository: { issue: {
        number: 7, url: issue.url, updatedAt: issue.updatedAt,
        comments: { nodes: [], totalCount: 1, pageInfo: { hasNextPage: false, endCursor: null } },
      } } } }),
      stderr: "",
    }),
  }), /comments final count mismatch/i);
});

test("labels use a fixed gh label list command and parser rejects ambiguous modes", () => {
  const calls = [];
  const result = runIssueRead(parseArgs(["--repo", "a/b", "--labels"]), { gh: (args) => {
    calls.push(args); return { ok: true, status: 0, stdout: JSON.stringify([{ name: "bug", color: "f00", description: "Defect" }]), stderr: "" };
  } });
  assert.deepEqual(calls, [["label", "list", "--repo", "a/b", "--limit", "1000", "--json", "name,description,color"]]);
  assert.equal(result.labels[0].name, "bug");
  assert.throws(() => parseArgs(["--repo", "a/b", "--list", "--labels"]), /exactly one/);
});
