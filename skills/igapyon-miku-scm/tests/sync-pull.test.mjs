import test from "node:test";
import assert from "node:assert/strict";
import { lstat, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { runSyncPull, parseArgs } from "../scripts/sync-pull.mjs";
import { renderHumanOutput } from "../scripts/miku-scm-human-output.mjs";
import { context, hash, loadOperation, lock, newId, snapshot, syncGit, writeJson } from "../scripts/miku-scm-sync-state.mjs";
import { guardIgnored } from "../scripts/miku-scm-sync-worktree.mjs";
import { fixture } from "./sync-fixture.mjs";

import { doneFixture, withoutGh } from "./sync-pull-support.mjs";

test("sync pull done verifies exact PR and carries staged work to one new branch", async (t) => {
  const f = await doneFixture(t); const latest = await f.advance();
  f.git(["config", "branch.autoSetupMerge", "true"]);
  f.git(["config", "core.hooksPath", path.join(f.repo, ".git/hooks")]);
  await writeFile(path.join(f.repo, ".git/hooks/post-checkout"), "#!/bin/sh\ngit rev-parse --symbolic-full-name '@{upstream}' > .git/checkout-upstream\n", { mode: 0o755 });
  await f.write("carry.txt", "stage\n"); f.git(["add", "carry.txt"]); await f.write("carry.txt", "stage\nunstaged\n");
  const r = await runSyncPull(f.options, f.dependencies);
  assert.equal(r.status, "completed", JSON.stringify(r)); assert.equal(r.method, "next-work"); assert.equal(r.head, latest); assert.equal(r.final_branch, "devel-tiga1026mef");
  const output = renderHumanOutput({ workflow: "repository.sync.pull", status: "success", approvalGate: "apply", delegateStatus: r.status, mutationInvoked: r.mutation_invoked, result: r });
  assert.match(output, /^Previous branch: devel-tiga1026aaa-done$/m);
  assert.match(output, /^New work branch: devel-tiga1026mef$/m);
  assert.doesNotMatch(output, /(?:Current|Final) branch:/);
  assert.equal(f.git(["rev-parse", "--symbolic-full-name", "@{upstream}"]), "refs/remotes/origin/devel");
  assert.equal(f.git(["status", "-sb"]).split("\n")[0], "## devel-tiga1026mef...origin/devel");
  assert.equal((await readFile(path.join(f.repo, ".git/checkout-upstream"), "utf8")).trim(), "refs/remotes/origin/devel");
  assert.equal(await f.read("carry.txt"), "stage\nunstaged\n"); assert.equal(f.git(["show", ":carry.txt"]), "stage");
  assert.equal(f.calls.length, 2); assert.equal(f.calls[0].options.timeout, 15000); assert.deepEqual(f.calls[1].args, ["api", "--method", "GET", "repos/owner/repo/pulls/7", "--hostname", "github.com"]);
  assert.deepEqual(f.calls[0].args, ["api", "--method", "GET", "repos/owner/repo/pulls", "--hostname", "github.com", "-f", "state=all", "-f", "head=owner:devel-tiga1026aaa", "-f", "base=devel", "-f", "per_page=100"]);
  await rm(path.join(f.repo, ".git/hooks/post-checkout"));
  f.git(["stash", "push", "--include-untracked"]); f.git(["switch", r.previous_branch]);
  const again = await runSyncPull(f.options, f.dependencies); assert.equal(again.status, "not-applied"); assert.match(again.reason, /already has a next-work transition/);
});

test("sync pull done verifies a compatible Enterprise host and starts the next work branch", async (t) => {
  const f = await doneFixture(t, {}, true, "ghe.example.test");
  await f.write("carry.txt", "carry over\n");
  const result = await runSyncPull(f.options, f.dependencies);
  assert.equal(result.status, "completed", JSON.stringify(result));
  assert.equal(result.method, "next-work");
  assert.equal(result.head, f.pull.merge_commit_sha);
  assert.equal(await f.read("carry.txt"), "carry over\n");
  assert.equal(f.calls.length, 2);
  for (const { args } of f.calls) assert.equal(args[args.indexOf("--hostname") + 1], "ghe.example.test");
});

for (const [host, api] of [
  ["github.com", "https://api.github.com"],
  ["ghe.example.test", "https://ghe.example.test/api/v3"],
  ["ghe.example.test:8443", "https://ghe.example.test:8443/api/v3"],
  ["example.ghe.com", "https://api.example.ghe.com"],
]) test(`sync pull without gh verifies PRs on ${host} and carries work to the next branch`, async (t) => {
  const f = await doneFixture(t, {}, true, host);
  await f.write("carry.txt", "staged\n"); f.git(["add", "carry.txt"]);
  await f.write("carry.txt", "staged\nunstaged\n");
  const calls = [];
  const dependencies = withoutGh(f, async (url, options) => {
    calls.push({ url: String(url), options });
    return new Response(JSON.stringify(calls.length === 1 ? [f.pull] : f.pull));
  });
  const result = await runSyncPull(f.options, dependencies);
  assert.equal(result.status, "completed", JSON.stringify(result));
  assert.equal(result.method, "next-work");
  assert.equal(result.head, f.pull.merge_commit_sha);
  assert.equal(await f.read("carry.txt"), "staged\nunstaged\n");
  assert.equal(f.git(["show", ":carry.txt"]), "staged");
  assert.equal(dependencies.attempts(), 1);
  assert.equal(calls[0].url, `${api}/repos/owner/repo/pulls?state=all&head=owner%3Adevel-tiga1026aaa&base=devel&per_page=100`);
  assert.equal(calls[1].url, `${api}/repos/owner/repo/pulls/7`);
  for (const { options } of calls) {
    assert.equal(options.method, "GET");
    assert.equal(options.redirect, "error");
    assert.equal(options.credentials, "omit");
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(new Headers(options.headers).has("Authorization"), false);
  }
  assert.ok(result.warnings.some((warning) => warning.includes("anonymous HTTPS")));
});

for (const kind of ["404", "403", "429", "redirect", "invalid-json", "oversize", "network", "mismatch", "unmerged", "incomplete"]) {
  test(`sync pull without gh stops before changing work for ${kind} anonymous evidence`, async (t) => {
    const f = await doneFixture(t);
    await f.write("carry.txt", "untouched\n");
    const before = await snapshot(await context(f.repo));
    let calls = 0;
    const dependencies = withoutGh(f, async () => {
      calls++;
      if (kind === "network") throw new TypeError("transport failure");
      if (/^\d+$/.test(kind)) return new Response("", { status: Number(kind) });
      if (kind === "redirect") return new Response("", { status: 302 });
      if (kind === "invalid-json") return new Response("{");
      if (kind === "oversize") return new Response(" ".repeat(1024 * 1024 + 1));
      if (kind === "incomplete") return new Response(JSON.stringify(Array(100).fill(f.pull)));
      const pull = kind === "mismatch" ? { ...f.pull, head: { ...f.pull.head, sha: "0".repeat(40) } }
        : { ...f.pull, merged: false };
      return new Response(JSON.stringify(calls === 1 ? [pull] : pull));
    });
    const result = await runSyncPull(f.options, dependencies);
    assert.equal(result.status, "not-applied", JSON.stringify(result));
    assert.equal(result.stash_sha, null);
    assert.equal(result.backup_branch, null);
    assert.equal((await snapshot(await context(f.repo))).digest, before.digest);
    assert.equal(calls, kind === "unmerged" ? 2 : 1);
    const unavailable = ["404", "403", "429", "redirect", "network"].includes(kind);
    assert.equal(Boolean(result.confirmation_required), unavailable);
    if (unavailable) assert.match(result.reason, /gh is not installed.*anonymous/);
  });
}

test("sync pull does not replace an installed gh authentication failure with anonymous reads", async (t) => {
  const f = await doneFixture(t);
  let calls = 0;
  const result = await runSyncPull(f.options, {
    ...f.dependencies,
    gh: () => ({ ok: false, status: 1, stderr: "authentication required" }),
    fetch: () => { calls++; throw new Error("unexpected anonymous read"); },
  });
  assert.equal(result.status, "not-applied");
  assert.match(result.reason, /GitHub PR verification failed/);
  assert.equal(calls, 0);
});

for (const bad of [{ merged: false }, { state: "open" }, { head: { ref: "wrong" } }, { merge_commit_sha: "0".repeat(40) }]) test(`sync pull done blocks unverifiable merge ${JSON.stringify(bad)}`, async (t) => {
  const f = await doneFixture(t, bad); await f.write("carry.txt", "untouched\n"); const before = await snapshot(await context(f.repo));
  const r = await runSyncPull(f.options, f.dependencies); assert.equal(r.status, "not-applied", JSON.stringify(r)); assert.equal(r.stash_sha, null); assert.equal((await snapshot(await context(f.repo))).digest, before.digest);
});

test("sync pull squash merge uses the merge result rather than PR head ancestry", async (t) => {
  const f = await doneFixture(t, {}, true);
  assert.equal(syncGit(f.repo, ["merge-base", "--is-ancestor", f.pull.head.sha, f.pull.merge_commit_sha], { allowFailure: true }).ok, false);
  const r = await runSyncPull(f.options, f.dependencies); assert.equal(r.status, "completed", JSON.stringify(r)); assert.equal(r.head, f.pull.merge_commit_sha);
});

for (const kind of ["limit", "multiple", "invalid-json", "api-failure"]) test(`sync pull done rejects ${kind} PR evidence before stash`, async (t) => {
  const f = await doneFixture(t); await f.write("carry.txt", "preserve\n");
  const dependencies = { ...f.dependencies, gh: () => kind === "api-failure" ? { ok: false, stdout: "" } : { ok: true, stdout: kind === "invalid-json" ? "{" : JSON.stringify(Array(kind === "limit" ? 100 : 2).fill(f.pull)) } };
  const before = await snapshot(await context(f.repo)); const r = await runSyncPull(f.options, dependencies);
  assert.equal(r.status, "not-applied", JSON.stringify(r)); assert.equal((await snapshot(await context(f.repo))).digest, before.digest); assert.equal(r.stash_sha, null);
});
