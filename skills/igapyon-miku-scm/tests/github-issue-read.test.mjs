import assert from "node:assert/strict";
import test from "node:test";

import { parseArgs, runIssueRead } from "../scripts/github-issue-read.mjs";

const issue = { number: 7, state: "OPEN", title: "Title", body: "Body", url: "https://github.com/a/b/issues/7", updatedAt: "2026-07-25T00:00:00Z" };

test("list uses a fixed gh issue list command and normalizes Issue fields", () => {
  const calls = [];
  const result = runIssueRead(parseArgs(["--repo", "a/b", "--list", "--state", "all"]), { gh: (args) => {
    calls.push(args); return { ok: true, status: 0, stdout: JSON.stringify([issue]), stderr: "" };
  } });
  assert.deepEqual(calls, [["issue", "list", "--repo", "a/b", "--state", "all", "--limit", "1000", "--json", "number,state,title,body,url,updatedAt"]]);
  assert.deepEqual(result.issues, [{ number: 7, state: "OPEN", title: "Title", body: "Body", html_url: issue.url, updated_at: issue.updatedAt }]);
});

test("list defaults to Open Issues", () => {
  const calls = [];
  const result = runIssueRead(parseArgs(["--repo", "a/b", "--list"]), { gh: (args) => {
    calls.push(args); return { ok: true, status: 0, stdout: "[]", stderr: "" };
  } });

  assert.equal(result.state, "open");
  assert.deepEqual(calls, [["issue", "list", "--repo", "a/b", "--state", "open", "--limit", "1000", "--json", "number,state,title,body,url,updatedAt"]]);
});

test("single-Issue reading uses fixed gh issue view with comments", () => {
  const calls = [];
  const result = runIssueRead(parseArgs(["--repo", "a/b", "--issue", "7"]), { gh: (args) => {
    calls.push(args); return { ok: true, status: 0, stdout: JSON.stringify({ ...issue, labels: [{ name: "bug" }], comments: [{ body: "note" }] }), stderr: "" };
  } });
  assert.deepEqual(calls, [["issue", "view", "7", "--repo", "a/b", "--comments", "--json", "number,state,title,body,url,updatedAt,labels,comments"]]);
  assert.equal(result.issue.comments[0].body, "note");
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
