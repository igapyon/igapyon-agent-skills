import assert from "node:assert/strict";
import test from "node:test";

import {
  createCommandRunner,
  createGhCommandRunner,
  createGitCommandRunner,
} from "../scripts/miku-scm-command-runner.mjs";

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
