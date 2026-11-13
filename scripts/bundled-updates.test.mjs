import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

test("help is local and exits successfully", () => {
  const result = spawnSync(process.execPath, [path.join(root, "scripts/check-bundled-updates.mjs"), "--help"], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage:/);
});

test("invalid options fail before network access", () => {
  const result = spawnSync(process.execPath, [path.join(root, "scripts/check-bundled-updates.mjs"), "--jobs", "5"], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /1\.\.4/);
});
