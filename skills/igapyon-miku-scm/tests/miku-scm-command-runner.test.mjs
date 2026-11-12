import assert from "node:assert/strict";
import test from "node:test";

import {
  createCommandRunner,
  createGhCommandRunner,
  createGitCommandRunner,
  platformWarnings,
} from "../scripts/miku-scm-command-runner.mjs";

test("other operating systems receive a notice without changing fixed argv", () => {
  assert.deepEqual(platformWarnings("linux"), ["Platform linux: continuing with the available Git and Node.js commands."]);
  assert.deepEqual(platformWarnings("darwin"), []);
  assert.deepEqual(platformWarnings("win32"), []);
});

test("Windows Git and gh runners use fixed argv without a shell", () => {
  const calls = [];
  const spawn = (command, args, options) => {
    calls.push({ command, args, options });
    return { status: 0, stdout: "ok", stderr: "" };
  };
  createGitCommandRunner({ platform: "win32", spawn })("C:\\work", ["status"]);
  createGhCommandRunner({ platform: "win32", spawn })("C:\\work", ["pr", "list"]);
  assert.equal(calls[0].command, "git");
  assert.equal(calls[1].command, "gh");
  assert.equal(calls[0].options.shell, false);
  assert.equal(calls[0].options.windowsHide, true);
  assert.deepEqual(calls[0].args, ["status"]);
  assert.deepEqual(calls[1].args, ["pr", "list"]);
  assert.equal(calls[0].options.timeout, 120_000);
  assert.equal(calls[0].options.env.GIT_TERMINAL_PROMPT, "0");
  assert.equal(calls[1].options.timeout, undefined);
});

test("command runner preserves spawn failures and does not retry", () => {
  let count = 0;
  const runner = createCommandRunner({
    executable: "git",
    platform: "win32",
    spawn: () => {
      count += 1;
      return { status: null, stdout: "", stderr: "", error: { code: "ENOENT", message: "not found" } };
    },
  });
  assert.throws(() => runner("C:\\work", ["fetch"]), /not found/);
  assert.equal(count, 1);
});

test("Git timeout overrides must be positive and finite before spawn", () => {
  let calls = 0;
  const runner = createGitCommandRunner({ spawn: () => { calls++; return { status: 0 }; } });
  for (const timeout of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => runner("/repo", ["fetch"], { timeout }), /positive finite/);
  }
  assert.equal(calls, 0);
});

test("Git timeout errors retain timeout and signal without exposing transport output", () => {
  const runner = createGitCommandRunner({ spawn: () => ({ status: null, signal: "SIGTERM", stdout: "", stderr: "https://user:secret@host/path", error: { code: "ETIMEDOUT" } }) });
  assert.throws(() => runner("/repo", ["push"]), (error) => {
    assert.match(error.message, /git push failed.*SIGTERM.*ETIMEDOUT/);
    assert.doesNotMatch(error.message, /secret|host/);
    return true;
  });
});
