import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { repositoryIdentity } from "../scripts/miku-scm-sync-state.mjs";
import { parseRepository, repositoryFromRemote, matchesIssueUrl } from "../scripts/miku-scm-repository.mjs";
import { resolvePrHandoff } from "../scripts/post-recommit-publish.mjs";
import { createGhIssueReader as updateReader } from "../scripts/github-issue-update.mjs";
import { createGhIssueReader as labelReader } from "../scripts/github-issue-label-update.mjs";
import { createGhIssueReader as closeReader } from "../scripts/github-issue-close.mjs";
import { createGhIssueReader as commentReader, createGhCommentReader,
  parseArgs as parseComment, runIssueComment } from "../scripts/github-issue-comment.mjs";
import { createGhParentReader, createGhCreatedIssueReader,
  parseArgs as parseCreate, runIssueCreate } from "../scripts/github-issue-create.mjs";
import { parseGitHubBatchArgs, runGitHubBatch } from "../scripts/miku-scm-github-readonly.mjs";

const repository = "ghe.example.test/team/project";
const issueUrl = "https://ghe.example.test/team/project/issues/7";
const issue = { number: 7, url: issueUrl, title: "Issue", body: "Body", state: "OPEN",
  stateReason: null, updatedAt: "2026-10-27T00:00:00Z", labels: [], parent: null,
  comments: { nodes: [], totalCount: 0, pageInfo: { hasNextPage: false } } };
const json = (value) => ({ ok: true, status: 0, stdout: JSON.stringify(value), stderr: "" });

async function workspace(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "miku-scm-host-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test("hosted remotes share repository identity across HTTPS and SSH without a domain allowlist", () => {
  for (const host of ["github.com", "ghe.example.test", "forge.internal"]) {
    const remotes = [`https://${host}/team/project.git`, `git@${host}:team/project.git`,
      `ssh://git@${host}:2222/team/project.git`];
    assert.equal(new Set(remotes.map((remote) => repositoryIdentity(remote))).size, 1);
    for (const remote of remotes) {
      assert.equal(repositoryFromRemote(remote).url, `https://${host}/team/project`);
    }
  }
  assert.equal(repositoryFromRemote("https://user:secret@ghe.example.test/team/project.git").url,
    "https://ghe.example.test/team/project");
  assert.equal(repositoryFromRemote("/tmp/repository.git"), null);
  assert.equal(repositoryIdentity("/tmp/repository.git"), `local:${path.resolve("/tmp/repository.git")}`);
  assert.equal(parseRepository("local:/tmp/repository.git"), null);
  assert.equal(parseRepository("/team/project"), null);
});

test("Issue readers accept Enterprise URLs while retaining target repository and Issue checks", async () => {
  for (const factory of [updateReader, labelReader, closeReader, commentReader,
    createGhParentReader, createGhCreatedIssueReader]) {
    const calls = [];
    const read = factory((args) => { calls.push(args); return json(issue); });
    assert.equal((await read(repository, 7)).url, issueUrl);
    assert.equal(calls[0][calls[0].indexOf("--repo") + 1], repository);
    await assert.rejects(read("other.example.test/team/project", 7), /identify/);
    await assert.rejects(read(repository, 8), /identify/);
  }
  assert.equal(matchesIssueUrl(issueUrl, "team/project", 7), true);
  assert.equal(matchesIssueUrl(issueUrl, "team/other", 7), false);
});

test("the configured Enterprise host also applies to unqualified repository arguments", async () => {
  const previous = process.env.GH_HOST;
  process.env.GH_HOST = "ghe.example.test";
  try {
    const options = parseCreate(["--repo", "team/project", "--draft", "issue.md"]);
    assert.equal(options.repository, repository);
    const read = updateReader(() => json(issue));
    assert.equal((await read("team/project", 7)).url, issueUrl);
    process.env.GH_HOST = "other.example.test";
    assert.equal((await read(options.repository, 7)).url, issueUrl);
    await assert.rejects(read("team/project", 7), /identify/);
  } finally {
    if (previous === undefined) delete process.env.GH_HOST;
    else process.env.GH_HOST = previous;
  }
});

test("Enterprise Issue creation verifies and archives the returned Issue instead of reporting an unknown URL", async (t) => {
  const root = await workspace(t);
  const directory = path.join(root, "workplace/miku-scm/new-issues");
  await mkdir(directory, { recursive: true });
  const draft = path.join(directory, "issue-new-202610271230.md");
  await writeFile(draft, "A title\n\nA body.\n");
  const options = parseCreate(["--repo", repository, "--root", root, "--draft", draft]);
  const preflight = await runIssueCreate(options);
  const calls = [];
  const result = await runIssueCreate(parseCreate(preflight.apply_arguments), {
    gh: (args) => {
      calls.push(args);
      return args[1] === "create" ? { ok: true, stdout: issueUrl } : json(issue);
    },
  });
  assert.equal(result.status, "created");
  assert.equal(result.issue_url, issueUrl);
  assert.equal(result.issue_verification.status, "verified");
  assert.equal(result.draft_archive.status, "archived");
  assert.equal(calls.filter((args) => args[1] === "create").length, 1);
});

test("Enterprise comment publication and verification use the same host and exact Issue", async (t) => {
  const root = await workspace(t);
  const directory = path.join(root, "workplace/miku-scm/issue-comments");
  await mkdir(directory, { recursive: true });
  const draft = path.join(directory, "issue-7-comment-202610271230.md");
  await writeFile(draft, "A comment.\n");
  const calls = [];
  const gh = (args) => {
    calls.push(args);
    if (args[0] === "api") return json({ id: 77, html_url: `${issueUrl}#issuecomment-77`, body: "A comment.\n" });
    if (args[1] === "comment") return { ok: true, stdout: `${issueUrl}#issuecomment-77` };
    return json(issue);
  };
  const dependencies = { gh, readIssue: commentReader(gh), readComment: createGhCommentReader(gh) };
  const preflight = await runIssueComment(parseComment(["--repo", repository, "--root", root, "--draft", draft, "--issue", "7"]), dependencies);
  const result = await runIssueComment(parseComment(preflight.apply_arguments), dependencies);
  assert.equal(result.status, "commented");
  assert.equal(result.comment_url, `${issueUrl}#issuecomment-77`);
  assert.deepEqual(calls.find((args) => args[0] === "api"), ["api", "--method", "GET",
    "repos/team/project/issues/comments/77", "--hostname", "ghe.example.test"]);
  assert.equal(calls.filter((args) => args[1] === "comment").length, 1);
});

test("PR handoff retains the selected host for its URL and fixed gh lookup", () => {
  for (const host of ["github.com", "ghe.example.test"]) {
    const calls = [];
    const result = resolvePrHandoff(repositoryFromRemote(`git@${host}:team/project.git`), "work",
      (args) => { calls.push(args); return json([]); });
    assert.equal(result.pr_creation_url, `https://${host}/team/project/pull/new/work`);
    assert.equal(calls[0][calls[0].indexOf("--repo") + 1], `${host}/team/project`);
  }
});

test("cached reads for matching repository paths on different hosts stay independent", async (t) => {
  const root = await workspace(t);
  let calls = 0;
  const gh = () => { calls++; return json([{ name: `host-${calls}`, description: "", color: "ffffff" }]); };
  const first = parseGitHubBatchArgs(["--repo", repository, "--query", "labels", "--root", root]);
  const second = { ...first, repository: "another.example.test/team/project" };
  assert.equal((await runGitHubBatch(first, { gh })).counters.fixed_gh_reads, 1);
  assert.equal((await runGitHubBatch(second, { gh })).counters.fixed_gh_reads, 1);
  const cached = await runGitHubBatch(first, { gh });
  assert.equal(cached.counters.cache_hits, 1);
  assert.equal(cached.entries[0].value.labels[0].name, "host-1");
  assert.equal(calls, 2);
});
