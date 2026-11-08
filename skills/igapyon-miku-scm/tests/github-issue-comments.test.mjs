import assert from "node:assert/strict";
import test from "node:test";

import {
  ISSUE_COMMENTS_MAX_PAGES,
  ISSUE_COMMENTS_QUERY,
  readCompleteIssueCommentConnection,
} from "../scripts/github-issue-comments.mjs";

const repository = "github.com/igapyon/igapyon-agent-skills";
const issueNumber = 399;
const issueUrl = `https://github.com/igapyon/igapyon-agent-skills/issues/${issueNumber}`;
const updatedAt = "2026-11-03T01:02:03Z";

function result(comments, overrides = {}) {
  return {
    ok: true,
    status: 0,
    stderr: "",
    stdout: JSON.stringify({
      data: { repository: { issue: {
        number: issueNumber,
        url: issueUrl,
        updatedAt,
        comments,
        ...overrides,
      } } },
    }),
  };
}

function comment(id, body = `comment ${id}`) {
  return {
    id: `IC_${id}`,
    url: `${issueUrl}#issuecomment-${id}`,
    body,
    createdAt: "2026-11-03T01:00:00Z",
    author: { login: "test-user" },
  };
}

function connection(nodes, totalCount, hasNextPage = false, endCursor = null) {
  return { nodes, totalCount, pageInfo: { hasNextPage, endCursor } };
}

test("fetches all pages through one fixed GraphQL query and verifies the Issue snapshot", () => {
  const calls = [];
  const pages = [
    result(connection([comment(1)], 2, true, "cursor-1")),
    result(connection([comment(2)], 2)),
  ];
  const read = readCompleteIssueCommentConnection(repository, issueNumber, {
    expectedUpdatedAt: updatedAt,
    gh(args) {
      calls.push(args);
      return pages.shift();
    },
  });

  assert.equal(read.totalCount, 2);
  assert.equal(read.nodes.length, 2);
  assert.equal(read.pageInfo.hasNextPage, false);
  assert.equal(calls.length, 2);
  const firstArgs = [
    "api", "graphql", "--method", "POST", "--hostname", "github.com",
    "-f", `query=${ISSUE_COMMENTS_QUERY}`,
    "-f", "owner=igapyon",
    "-f", "name=igapyon-agent-skills",
    "-F", "number=399",
  ];
  assert.deepEqual(calls, [firstArgs, [...firstArgs, "-f", "cursor=cursor-1"]]);
  assert.ok(ISSUE_COMMENTS_QUERY.includes("comments(first: 100, after: $cursor)"));
});

test("handles zero, one, 100, 101, and 201 comments without truncation", () => {
  for (const totalCount of [0, 1, 100, 101, 201]) {
    const calls = [];
    const pageCount = Math.max(1, Math.ceil(totalCount / 100));
    const read = readCompleteIssueCommentConnection(repository, issueNumber, {
      expectedUpdatedAt: updatedAt,
      gh(args) {
        calls.push(args);
        const index = calls.length - 1;
        const start = index * 100 + 1;
        const end = Math.min(totalCount, (index + 1) * 100);
        const nodes = Array.from({ length: Math.max(0, end - start + 1) }, (_, offset) => comment(start + offset));
        return result(connection(nodes, totalCount, index + 1 < pageCount,
          index + 1 < pageCount ? `cursor-${index + 1}` : null));
      },
    });
    assert.equal(read.totalCount, totalCount);
    assert.equal(read.nodes.length, totalCount);
    assert.equal(calls.length, pageCount);
  }
});

test("rejects partial GraphQL errors, changed Issue snapshots, and mismatched identities", () => {
  const badResponses = [
    {
      ok: true, status: 0, stdout: JSON.stringify({
        data: { repository: { issue: { number: issueNumber, url: issueUrl, updatedAt, comments: connection([], 0) } } },
        errors: [{ message: "partial result" }],
      }),
    },
    result(connection([], 0), { updatedAt: "2026-11-03T01:02:04Z" }),
    result(connection([], 0), { number: issueNumber + 1 }),
    result(connection([], 0), { url: "https://github.com/other/repo/issues/399" }),
  ];
  for (const bad of badResponses) {
    assert.throws(() => readCompleteIssueCommentConnection(repository, issueNumber, {
      expectedUpdatedAt: updatedAt,
      gh: () => bad,
    }), /partial or failed|incomplete or mismatched/i);
  }
});

test("rejects incomplete, duplicated, and invalid comment pages", () => {
  const badConnections = [
    connection([], 1),
    connection([comment(1)], 1, true, ""),
    connection([comment(1)], 1, true, "cursor-1"),
    connection([comment(1), comment(1)], 2),
    connection([comment(1), { ...comment(2), id: "IC_1" }], 2),
    connection([comment(1), { ...comment(1), id: "IC_2" }], 2),
    connection([{ ...comment(1), url: "https://github.com/elsewhere/repo/issues/399#issuecomment-1" }], 1),
    { nodes: [], totalCount: 0, pageInfo: { hasNextPage: "false", endCursor: null } },
  ];
  for (const bad of badConnections) {
    assert.throws(() => readCompleteIssueCommentConnection(repository, issueNumber, {
      expectedUpdatedAt: updatedAt,
      gh: () => result(bad),
    }));
  }
});

test("rejects a changing total, a later-page failure, a repeated cursor, and oversized pages", () => {
  const changedTotals = [result(connection([comment(1)], 2, true, "cursor-1")), result(connection([comment(2)], 3))];
  let index = 0;
  assert.throws(() => readCompleteIssueCommentConnection(repository, issueNumber, {
    expectedUpdatedAt: updatedAt,
    gh: () => changedTotals[index++],
  }), /totalCount changed/i);

  index = 0;
  assert.throws(() => readCompleteIssueCommentConnection(repository, issueNumber, {
    expectedUpdatedAt: updatedAt,
    gh: () => index++ === 0
      ? result(connection([comment(1)], 2, true, "cursor-1"))
      : { ok: false, status: 1, stdout: "", stderr: "offline" },
  }), /Issue #399 comment page 2 fetch failed/i);

  index = 0;
  assert.throws(() => readCompleteIssueCommentConnection(repository, issueNumber, {
    expectedUpdatedAt: updatedAt,
    gh: () => {
      index += 1;
      return result(connection([comment(index)], 3, true, "same-cursor"));
    },
  }), /invalid next cursor/i);

  const oversized = Array.from({ length: 101 }, (_, offset) => comment(offset + 1));
  assert.throws(() => readCompleteIssueCommentConnection(repository, issueNumber, {
    expectedUpdatedAt: updatedAt,
    gh: () => result(connection(oversized, 101, true, "cursor-1")),
  }), /maximum is 100/i);
});

test("requires a non-empty metadata updatedAt before reading pages", () => {
  assert.throws(() => readCompleteIssueCommentConnection(repository, issueNumber, {
    expectedUpdatedAt: "",
    gh: () => assert.fail("gh must not run without a metadata timestamp"),
  }), /updatedAt must be a non-empty string/i);
});

test("stops after the configured maximum page count", () => {
  let cursor = 0;
  assert.throws(() => readCompleteIssueCommentConnection(repository, issueNumber, {
    expectedUpdatedAt: updatedAt,
    gh: () => {
      cursor += 1;
      return result(connection([comment(cursor)], ISSUE_COMMENTS_MAX_PAGES + 1, true, `cursor-${cursor}`));
    },
  }), new RegExp(`limit exceeded \\(${ISSUE_COMMENTS_MAX_PAGES} pages\\)`));
  assert.equal(cursor, ISSUE_COMMENTS_MAX_PAGES);
});

test("supports GitHub Enterprise and validates an empty-body comment", () => {
  const enterpriseRepository = "github.example.com/owner/project";
  const url = "https://github.example.com/owner/project/issues/5";
  let call;
  const read = readCompleteIssueCommentConnection(enterpriseRepository, 5, {
    expectedUpdatedAt: updatedAt,
    gh(args) {
      call = args;
      return {
        ok: true,
        status: 0,
        stderr: "",
        stdout: JSON.stringify({ data: { repository: { issue: {
          number: 5,
          url,
          updatedAt,
          comments: connection([{
            id: "IC_empty",
            url: `${url}#issuecomment-55`,
            body: "",
            createdAt: "2026-11-03T01:00:00Z",
            author: null,
          }], 1),
        } } } }),
      };
    },
  });
  assert.equal(read.nodes[0].body, "");
  assert.ok(call.includes("--hostname"));
  assert.ok(call.includes("github.example.com"));
});
