import assert from "node:assert/strict";
import test from "node:test";

import {
  fixedCommandInvocation,
  runFixedCommand,
} from "../scripts/miku-scm-fixed-command-runner.mjs";

test("Windows fixed checks invoke ComSpec with only allowlisted command lines", () => {
  assert.deepEqual(fixedCommandInvocation("npm", ["run", "check:index"], {
    platform: "win32",
    comSpec: "C:\\Windows\\System32\\cmd.exe",
  }), {
    command: "C:\\Windows\\System32\\cmd.exe",
    args: ["/d", "/s", "/c", "npm.cmd run check:index"],
    shell: false,
  });
  assert.deepEqual(fixedCommandInvocation("mvn", ["validate"], { platform: "darwin" }), {
    command: "mvn",
    args: ["validate"],
    shell: false,
  });
  assert.throws(
    () => fixedCommandInvocation("npm", ["run", "arbitrary"], { platform: "win32" }),
    /Unsupported fixed command/,
  );
  assert.throws(
    () => fixedCommandInvocation("git", ["status"], { platform: "win32" }),
    /Unsupported fixed command/,
  );
});

test("fixed command runner retains exit, stdout, stderr, and missing-executable results", () => {
  const calls = [];
  const failed = runFixedCommand("mvn", ["validate"], "C:\\workspace", {
    platform: "win32",
    comSpec: "C:\\Windows\\System32\\cmd.exe",
    spawn: (command, args, options) => {
      calls.push({ command, args, options });
      return { status: 7, stdout: "standard output", stderr: "standard error" };
    },
  });
  assert.equal(failed.ok, false);
  assert.equal(failed.stdout, "standard output");
  assert.equal(failed.stderr, "standard error");
  assert.equal(calls[0].command, "C:\\Windows\\System32\\cmd.exe");
  assert.deepEqual(calls[0].args, ["/d", "/s", "/c", "mvn.cmd validate"]);
  assert.equal(calls[0].options.shell, false);

  const missing = runFixedCommand("npm", ["run", "check:index"], "/workspace", {
    platform: "darwin",
    spawn: () => ({ status: null, stdout: "", stderr: "", error: { code: "ENOENT", message: "not found" } }),
  });
  assert.equal(missing.ok, false);
  assert.equal(missing.stderr, "not found");
  assert.equal(missing.error_code, "ENOENT");
});
