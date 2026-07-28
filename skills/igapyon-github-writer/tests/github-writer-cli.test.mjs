import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const runner = fileURLToPath(new URL("../scripts/github-writer-run.mjs", import.meta.url));

function invoke(args) {
  return spawnSync(process.execPath, [runner, ...args], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
}

test("CLI returns a versioned JSON envelope", () => {
  const result = invoke(["--format", "json", "branch.status", "--repo", process.cwd()]);
  assert.equal(result.status, 0, result.stderr);
  const envelope = JSON.parse(result.stdout);
  assert.equal(envelope.schema_version, "github-writer.runner-result/v1");
  assert.equal(envelope.workflow, "branch.status");
  assert.equal(envelope.status, "success");
  assert.equal(envelope.mutation_invoked, false);
});

test("CLI rejects options outside a workflow's fixed contract", () => {
  const result = invoke(["--format", "json", "branch.status", "--target", "HEAD"]);
  assert.equal(result.status, 1);
  const envelope = JSON.parse(result.stdout);
  assert.equal(envelope.status, "failure");
  assert.equal(envelope.mutation_invoked, false);
  assert.match(envelope.error.message, /does not accept --target/);
});
