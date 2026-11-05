import test from "node:test";
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fixture } from "./sync-fixture.mjs";
import { syncGit } from "../scripts/miku-scm-sync-state.mjs";
import { chunkIgnorePaths, guardIgnored } from "../scripts/miku-scm-sync-worktree.mjs";

async function incoming(t, extraNames = [], count = 100) {
  const f = await fixture(t);
  for (let i = 0; i < count; i++) await f.write(`incoming/file-${i}.txt`, "remote\n", f.other);
  for (const name of extraNames) await f.write(`incoming/${name}`, "remote\n", f.other);
  syncGit(f.other, ["add", "."]);
  syncGit(f.other, ["commit", "-m", "Incoming files"]);
  syncGit(f.other, ["push", "origin", "devel"]);
  f.git(["fetch", "origin"]);
  await f.write("incoming/local.txt", "local\n");
  f.git(["config", "core.ignorecase", "true"]);
  return { ...f, target: f.git(["rev-parse", "origin/devel"]) };
}

test("guard reuses one ignore lookup per path and refreshes it on the next call", async (t) => {
  const f = await incoming(t);
  let count = 0;
  const ctx = { root: f.repo, git(cwd, args, options) {
    if (args[0] === "check-ignore") {
      count++;
      assert.deepEqual(args, ["check-ignore", "--stdin", "-z", "--no-index"]);
      assert.equal(options.input, "incoming\0");
    }
    return syncGit(cwd, args, options);
  } };
  await guardIgnored(ctx, [f.target]);
  assert.equal(count, 1);
  await f.write(".gitignore", "workplace/\nincoming/\n");
  await assert.rejects(guardIgnored(ctx, [f.target]), /Ignored path/);
  assert.equal(count, 2);
  assert.equal(await f.read("incoming/local.txt"), "local\n");
});

test("guard stops when ignore lookup fails", async (t) => {
  const f = await incoming(t);
  const ctx = { root: f.repo, git(cwd, args, options) {
    return args[0] === "check-ignore" ? { ok: false, code: 128 }
      : syncGit(cwd, args, options);
  } };
  await assert.rejects(guardIgnored(ctx, [f.target]), /ignore.*failed/i);
});

test("guard batches distinct existing paths and preserves NUL-delimited names", async (t) => {
  const special = ["space name.txt", "tab\tname.txt", "line\nbreak.txt", "日本語.txt", "keep.txt"];
  const f = await incoming(t, special);
  await f.write(".gitignore", "workplace/\nignored/\n*.cache\nincoming/keep.*\n!incoming/keep.txt\n");
  for (let i = 0; i < 100; i++) await f.write(`incoming/file-${i}.txt`, "local\n");
  for (const name of special) await f.write(`incoming/${name}`, "local\n");
  let calls = 0;
  let input;
  const ctx = { root: f.repo, git(cwd, args, options) {
    if (args[0] === "check-ignore") { calls++; input = options.input; }
    return syncGit(cwd, args, options);
  } };
  await guardIgnored(ctx, [f.target]);
  assert.equal(calls, 1);
  assert.ok(input.endsWith("\0"));
  const names = input.slice(0, -1).split("\0");
  assert.equal(names.length, 106);
  for (const name of special) assert.ok(names.includes("incoming/" + name), "Missing special path: " + name);
  assert.equal(new Set(names).size, names.length);
});

test("guard batch rejects an ignored path reported late in a later chunk", async (t) => {
  const f = await incoming(t, [], 513);
  const names = [];
  for (let i = 0; i < 513; i++) {
    const name = `incoming/file-${i}.txt`;
    names.push(name);
    await f.write(name, "local\n");
  }
  await f.write(".gitignore", "workplace/\nincoming/file-99.txt\n");
  let calls = 0;
  const ctx = { root: f.repo, git(cwd, args, options) {
    if (args[0] === "check-ignore") calls++;
    return syncGit(cwd, args, options);
  } };
  await assert.rejects(guardIgnored(ctx, [f.target]), /incoming\/file-99\.txt/);
  assert.equal(calls, 2);
  assert.equal(await f.read("incoming/file-512.txt"), "local\n");
});

test("guard accepts Git's empty non-ignored response and fails closed on malformed results", async (t) => {
  const f = await incoming(t);
  for (const response of [
    { code: 1, stdout: "unexpected\0" },
    { code: 0, stdout: "" },
    { code: 0, stdout: "another/path\0" },
    { code: 0, stdout: "incoming" },
  ]) {
    const ctx = { root: f.repo, git(cwd, args, options) {
      return args[0] === "check-ignore" ? { ...response, ok: response.code === 0 }
        : syncGit(cwd, args, options);
    } };
    await assert.rejects(guardIgnored(ctx, [f.target]), /ignore.*(failed|unexpected|invalid)/i);
  }
});

test("guard skips the Git process when every checkout path is managed", async (t) => {
  const f = await fixture(t);
  let calls = 0;
  await guardIgnored({ root: f.repo, git(cwd, args, options) {
    if (args[0] === "check-ignore") calls++;
    return syncGit(cwd, args, options);
  } }, [f.git(["rev-parse", "HEAD"])]);
  assert.equal(calls, 0);
});

test("ignore batches obey path-count and UTF-8 byte limits", () => {
  assert.deepEqual(chunkIgnorePaths(["a", "b", "c"], { maxPaths: 2, maxBytes: 20 }), [["a", "b"], ["c"]]);
  assert.deepEqual(chunkIgnorePaths(["éé", "x"], { maxPaths: 10, maxBytes: 5 }), [["éé"], ["x"]]);
  assert.throws(() => chunkIgnorePaths(["ééx"], { maxBytes: 5 }), /bounded.*size/);
  const byteBounded = chunkIgnorePaths(Array.from({ length: 400 }, (_, i) => `${i}-${"é".repeat(350)}`));
  assert.equal(byteBounded.length, 2);
  assert.ok(byteBounded.every((chunk) => chunk.reduce((bytes, name) => bytes + Buffer.byteLength(name, "utf8") + 1, 0) <= 256 * 1024));
});

test("guard reads each case-folded directory once per call", async (t) => {
  const f = await incoming(t);
  const counts = new Map();
  const dependencies = { readdir: async (dir) => {
    counts.set(dir, (counts.get(dir) ?? 0) + 1);
    return readdir(dir);
  } };
  const ctx = { root: f.repo, git: syncGit };
  await guardIgnored(ctx, [f.target], dependencies);
  assert.equal(counts.get(path.join(f.repo, "incoming")), 1);
  assert.equal(counts.get(f.repo), 1);
  await guardIgnored(ctx, [f.target], dependencies);
  assert.equal(counts.get(f.repo), 2);
});

test("guard rejects only referenced ambiguous case aliases", async (t) => {
  const f = await incoming(t);
  const ctx = { root: f.repo, git: syncGit };
  const reader = (aliases) => ({ readdir: async (dir) => {
    const entries = await readdir(dir);
    return dir === f.repo ? [...entries, ...aliases] : entries;
  } });
  await assert.rejects(guardIgnored(ctx, [f.target], reader(["INCOMING"])), /Ambiguous/);
  await guardIgnored(ctx, [f.target], reader(["unrelated", "UNRELATED"]));
  f.git(["config", "core.ignorecase", "false"]);
  await guardIgnored(ctx, [f.target], { readdir() { throw new Error("case reader must not run"); } });
});
