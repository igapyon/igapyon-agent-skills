import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { describeSyncGitFailure, syncGit } from "../scripts/miku-scm-sync-state.mjs";
import { runSyncPull } from "../scripts/sync-pull.mjs";
import { fixture } from "./sync-fixture.mjs";

test("sync diagnostics classify Git failures without exposing transport text", () => {
  const cases = [
    [{ error: { code: "ETIMEDOUT" } }, "", "timeout"],
    [{ error: { code: "ENOENT" } }, "", "missing-executable"],
    [{}, "Authentication failed", "authentication"],
    [{}, "unable to access: The requested URL returned error: 401", "authentication"],
    [{}, "unable to access: The requested URL returned error: 403", "permission"],
    [{}, "Could not resolve host", "network-dns"],
    [{}, "Connection refused", "network-connect"],
    [{}, "does not appear to be a git repository", "repository-unavailable"],
    [{}, "Permission denied", "permission"],
    [{}, "unexpected failure", "unknown"],
  ];
  for (const [result, text, category] of cases) {
    const r = describeSyncGitFailure(["fetch", "origin"], { status: 128, ...result },
      `${text} https://user:password@example.invalid/repo?token=SECRET Authorization: SECRET /private/data`);
    assert.equal(r.category, category);
    assert.doesNotMatch(JSON.stringify(r), /SECRET|password|example.invalid|private\/data/);
    assert.equal(r.command, "fetch");
    assert.ok(r.next_action);
  }
});

test("sync diagnostics reach a failed pull result with actionable guidance", async (t) => {
  const f = await fixture(t);
  f.git(["remote", "set-url", "origin", path.join(f.directory, "missing.git")]);
  const r = await runSyncPull(f.options);
  assert.equal(r.status, "not-applied");
  assert.equal(r.diagnostic.category, "repository-unavailable");
  assert.match(r.next_action, /remote URL.*access/);
  assert.doesNotMatch(JSON.stringify(r.diagnostic), /missing.git/);
});

test("sync Git runner applies bounded timeout and terminal prompt policy", () => {
  let captured;
  const result = syncGit("/repo", ["fetch"], { spawn: (_command, _args, options) => {
    captured = options;
    return { status: 0, stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
  } });
  assert.equal(result.ok, true);
  assert.equal(captured.timeout, 120_000);
  assert.equal(captured.env.GIT_TERMINAL_PROMPT, "0");
  assert.equal(captured.env.LC_ALL, "C");
});

test("sync Git runner rejects invalid timeouts before spawn", () => {
  let calls = 0;
  for (const timeout of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => syncGit("/repo", ["fetch"], { timeout, spawn: () => { calls++; return {}; } }), /positive finite/);
  }
  assert.equal(calls, 0);
});

test("sync Git timeout errors retain signal and spawn code", () => {
  assert.throws(() => syncGit("/repo", ["fetch"], { spawn: () => ({ status: null, signal: "SIGTERM",
    stdout: Buffer.alloc(0), stderr: Buffer.alloc(0), error: { code: "ETIMEDOUT" } }) }), (error) => {
    assert.equal(error.gitSignal, "SIGTERM");
    assert.equal(error.gitSpawnError, "ETIMEDOUT");
    assert.equal(error.gitDiagnostic.category, "timeout");
    assert.doesNotMatch(error.message, /password|token|example\.invalid/);
    return true;
  });
});
