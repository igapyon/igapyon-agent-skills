import assert from "node:assert/strict";
import test from "node:test";
import { markerForDate, postDayPlan, renderComment } from "./post-day-plan.mjs";

test("renderComment adds the mention and commit-pinned source links", () => {
  const body = renderComment({
    markdown: `---
type: day-plan
date: 2026-09-14
generated: 2026-09-14
---

# 9月14日 デイリーブリーフ

- [今日のタスク](../tasks/task-202609-00001-today.md)
- [外部資料](https://example.com/reference)
`,
    date: "2026-09-14",
    slot: "0 21 * * *",
    repo: "igapyon/daybook",
    sha: "abc123",
  });
  assert.ok(body.includes(markerForDate("2026-09-14")));
  assert.equal(markerForDate("2026-09-14", "0 3 * * *"), markerForDate("2026-09-14"));
  assert.match(body, /<!-- daybook-briefing:2026-09-14 -->/);
  assert.match(body, /@igapyon/);
  assert.match(body, /https:\/\/github\.com\/igapyon\/daybook\/blob\/abc123\/2026\/202609\/tasks\/task-202609-00001-today\.md/);
  assert.match(body, /https:\/\/example\.com\/reference/);
});

test("renderComment accepts a configured mention", () => {
  const body = renderComment({
    markdown: `---
type: day-plan
date: 2026-09-14
generated: 2026-09-14
---

# 9月14日 デイリーブリーフ
`,
    date: "2026-09-14",
    mention: "@daybook-owner",
    repo: "example/daybook",
    sha: "abc123",
  });
  assert.match(body, /@daybook-owner/);
  assert.doesNotMatch(body, /@igapyon/);
});

function response(body, status = 200, link = null) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => name.toLowerCase() === "link" ? link : null },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

test("postDayPlan skips every duplicate bot comment for the same date", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  let postedBody = null;
  const markdown = `---
type: day-plan
date: 2026-09-14
generated: 2026-09-14
---

# 9月14日 デイリーブリーフ
`;
  try {
    globalThis.fetch = async (url, options = {}) => {
      calls.push({ url, options });
      if (url.endsWith("/issues/42")) return response({ state: "open" });
      if (url.endsWith("/issues/42/comments") && options.method === "POST") {
        postedBody = JSON.parse(options.body).body;
        return response({ html_url: "https://github.com/igapyon/daybook/issues/42#issuecomment-1" });
      }
      if (url.includes("/issues/42/comments")) {
        return response(postedBody ? [{ user: { type: "Bot" }, body: postedBody, html_url: "https://github.com/igapyon/daybook/issues/42#issuecomment-1" }] : []);
      }
      throw new Error(`unexpected URL: ${url}`);
    };
    const created = await postDayPlan({
      markdown,
      date: "2026-09-14",
      repo: "igapyon/daybook",
      sha: "abc123",
      issueNumber: 42,
      apiUrl: "https://api.github.test",
      token: "test-token",
      slot: "0 21 * * *",
    });
    assert.equal(created.status, "created");
    assert.equal(calls.length, 3);
    assert.equal(calls[2].options.method, "POST");

    const duplicate = await postDayPlan({
      markdown,
      date: "2026-09-14",
      repo: "igapyon/daybook",
      sha: "abc123",
      issueNumber: 42,
      apiUrl: "https://api.github.test",
      token: "test-token",
      slot: "0 21 * * *",
    });
    assert.equal(duplicate.status, "skipped");

    const otherSlot = await postDayPlan({
      markdown,
      date: "2026-09-14",
      repo: "igapyon/daybook",
      sha: "abc123",
      issueNumber: 42,
      apiUrl: "https://api.github.test",
      token: "test-token",
      slot: "0 3 * * *",
    });
    assert.equal(otherSlot.status, "skipped");

    const otherDate = await postDayPlan({
      markdown,
      date: "2026-09-15",
      repo: "igapyon/daybook",
      sha: "abc123",
      issueNumber: 42,
      apiUrl: "https://api.github.test",
      token: "test-token",
      slot: "0 21 * * *",
    });
    assert.equal(otherDate.status, "created");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("postDayPlan recognizes legacy slot markers but ignores human comments", async () => {
  const originalFetch = globalThis.fetch;
  const markdown = `---
type: day-plan
date: 2026-09-14
generated: 2026-09-14
---

# 9月14日 デイリーブリーフ
`;
  const legacyComments = [
    { user: { type: "User" }, body: "<!-- daybook-briefing:2026-09-14:0 9 * * * -->" },
    { user: { type: "Bot" }, body: "<!-- daybook-briefing:2026-09-14:0 3 * * * -->", html_url: "https://github.com/igapyon/daybook/issues/42#issuecomment-legacy" },
  ];
  try {
    globalThis.fetch = async (url, options = {}) => {
      if (url.endsWith("/issues/42")) return response({ state: "open" });
      if (url.includes("/issues/42/comments") && options.method !== "POST") return response(legacyComments);
      throw new Error(`unexpected URL: ${url}`);
    };
    const result = await postDayPlan({
      markdown,
      date: "2026-09-14",
      repo: "igapyon/daybook",
      sha: "abc123",
      issueNumber: 42,
      apiUrl: "https://api.github.test",
      token: "test-token",
    });
    assert.equal(result.status, "skipped");
    assert.equal(result.url, "https://github.com/igapyon/daybook/issues/42#issuecomment-legacy");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("postDayPlan allows a duplicate when explicitly requested", async () => {
  const originalFetch = globalThis.fetch;
  const postedBodies = [];
  const markdown = `---
type: day-plan
date: 2026-09-14
generated: 2026-09-14
---

# 9月14日 デイリーブリーフ
`;
  try {
    globalThis.fetch = async (url, options = {}) => {
      if (url.endsWith("/issues/42")) return response({ state: "open" });
      if (url.endsWith("/issues/42/comments") && options.method === "POST") {
        postedBodies.push(JSON.parse(options.body).body);
        return response({ html_url: `https://github.com/igapyon/daybook/issues/42#issuecomment-${postedBodies.length}` });
      }
      if (url.includes("/issues/42/comments")) {
        return response([{ user: { type: "Bot" }, body: "<!-- daybook-briefing:2026-09-14 -->\n\nold comment", html_url: "https://github.com/igapyon/daybook/issues/42#issuecomment-existing" }]);
      }
      throw new Error(`unexpected URL: ${url}`);
    };
    const result = await postDayPlan({
      markdown,
      date: "2026-09-14",
      repo: "igapyon/daybook",
      sha: "abc123",
      issueNumber: 42,
      apiUrl: "https://api.github.test",
      token: "test-token",
      allowDuplicate: true,
    });
    assert.equal(result.status, "created");
    assert.equal(postedBodies.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("postDayPlan dry-run does not call GitHub", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => {
      throw new Error("GitHub must not be called during dry-run");
    };
    const result = await postDayPlan({
      markdown: `---
type: day-plan
date: 2026-09-14
generated: 2026-09-14
---

# 9月14日 デイリーブリーフ
`,
      date: "2026-09-14",
      repo: "igapyon/daybook",
      sha: "abc123",
      issueNumber: 42,
      dryRun: true,
    });
    assert.equal(result.status, "dry-run");
    assert.equal(result.marker, markerForDate("2026-09-14"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
