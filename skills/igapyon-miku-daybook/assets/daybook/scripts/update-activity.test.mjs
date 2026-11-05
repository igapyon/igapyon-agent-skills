import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { activityHash, readActivity, updateActivity } from "./activity-files.mjs";

const DATE = "2026-11-06";
const RELATIVE = "2026/202611/activities/activity-20261106a.md";
const updateCli = fileURLToPath(new URL("./update-activity.mjs", import.meta.url));
const createCli = fileURLToPath(new URL("./create-activity.mjs", import.meta.url));
const content = (title) => `---\ntype: activity\ndate: ${DATE}\n---\n\n# ${title}\n\n既存の記録と [参照](../tasks/example.md) を保持します。\n`;

function fixture(t, relative = RELATIVE) {
  const repoRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "activity-update-")));
  t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));
  const target = path.join(repoRoot, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content("Original"));
  return { repoRoot, target, relative };
}
function cli(repoRoot, args, input, executable = updateCli) {
  return spawnSync(process.execPath, [executable, "--repo-root", repoRoot, ...args], { input, encoding: "utf8", timeout: 5000 });
}
function writeArgs(relative, hash) {
  return ["--path", relative, "--expected-sha256", hash, "--stdin"];
}

test("read snapshot and stdin update preserve content, links and legacy unsuffixed identity", (t) => {
  const f = fixture(t, RELATIVE.replace("a.md", ".md"));
  const original = content("Original").replaceAll("\n", "\r\n");
  fs.writeFileSync(f.target, original);
  const read = cli(f.repoRoot, ["--path", f.relative, "--read"]);
  assert.equal(read.status, 0, read.stderr);
  const snapshot = JSON.parse(read.stdout);
  assert.equal(snapshot.content, original);
  assert.equal(snapshot.sha256, activityHash(Buffer.from(original)));
  const updated = snapshot.content + "\r\n追記しました。\r\n";
  const saved = cli(f.repoRoot, writeArgs(f.relative, snapshot.sha256), updated);
  assert.equal(saved.status, 0, saved.stderr);
  assert.equal(JSON.parse(saved.stdout).sha256, activityHash(updated));
  assert.equal(fs.readFileSync(f.target, "utf8"), updated);
  const draftDirectory = fs.mkdtempSync(path.join(f.repoRoot, "draft-"));
  const draft = path.join(draftDirectory, "updated.md");
  fs.writeFileSync(draft, updated.replace("Original", "New"), { flag: "wx" });
  const fileSaved = cli(f.repoRoot, ["--path", f.relative, "--expected-sha256", activityHash(updated), "--file", draft]);
  assert.equal(fileSaved.status, 0, fileSaved.stderr);
  assert.equal(fs.readFileSync(f.target, "utf8"), fs.readFileSync(draft, "utf8"));
  assert.equal(fs.existsSync(path.join(f.repoRoot, "workplace")), false);
});

test("stale snapshot and disappeared target stop without restoring or overwriting them", (t) => {
  const f = fixture(t);
  const snapshot = readActivity({ repoRoot: f.repoRoot, path: f.relative });
  const first = content("First writer");
  updateActivity({ repoRoot: f.repoRoot, path: f.relative, expectedSha256: snapshot.sha256, content: first });
  const stale = cli(f.repoRoot, writeArgs(f.relative, snapshot.sha256), content("Stale writer"));
  assert.equal(stale.status, 1);
  assert.match(stale.stderr, /ACTIVITY_UPDATE_CONFLICT/);
  assert.equal(fs.readFileSync(f.target, "utf8"), first);
  const latest = readActivity({ repoRoot: f.repoRoot, path: f.relative });
  const reconsidered = latest.content + "\n追加分を統合しました。\n";
  assert.equal(cli(f.repoRoot, writeArgs(f.relative, latest.sha256), reconsidered).status, 0);
  assert.equal(fs.readFileSync(f.target, "utf8"), reconsidered);
  fs.unlinkSync(f.target);
  assert.throws(() => updateActivity({ repoRoot: f.repoRoot, path: f.relative, expectedSha256: activityHash(first), content: content("Restore") }), { code: "ACTIVITY_UPDATE_CONFLICT" });
  assert.equal(fs.existsSync(f.target), false);
  assert.equal(fs.existsSync(path.join(f.repoRoot, "workplace")), false);
});

test("a peer edit seen by the final reread stops the update", (t) => {
  const f = fixture(t);
  const read = fs.readFileSync;
  const peer = content("Peer's latest edit");
  let changed = false;
  t.mock.method(fs, "readFileSync", (file, ...args) => {
    if (file === f.target && !changed) {
      changed = true;
      fs.writeFileSync(f.target, peer);
    }
    return read(file, ...args);
  });
  assert.throws(() => updateActivity({ repoRoot: f.repoRoot, path: f.relative,
    expectedSha256: activityHash(content("Original")), content: content("Stale draft") }), { code: "ACTIVITY_UPDATE_CONFLICT" });
  assert.equal(changed, true);
  assert.equal(fs.readFileSync(f.target, "utf8"), peer);
  assert.equal(fs.existsSync(path.join(f.repoRoot, "workplace")), false);
});

test("write errors are reported directly without creating recovery files", (t) => {
  const f = fixture(t);
  const write = fs.writeFileSync;
  t.mock.method(fs, "writeFileSync", (file, ...args) => {
    if (file === f.target) throw Object.assign(new Error("Write failure fixture"), { code: "EIO" });
    return write(file, ...args);
  });
  assert.throws(() => updateActivity({ repoRoot: f.repoRoot, path: f.relative,
    expectedSha256: activityHash(content("Original")), content: content("Draft") }), { code: "EIO" });
  assert.equal(fs.existsSync(path.join(f.repoRoot, "workplace")), false);
});

test("invalid input modes, dates, paths and symlinks cannot modify an activity", (t) => {
  const f = fixture(t);
  const hash = activityHash(content("Original"));
  for (const args of [
    ["--path", f.relative],
    ["--path", f.relative, "--read", "--stdin"],
    [...writeArgs(f.relative, hash), "--file", "unused.md"],
    writeArgs(f.relative, "not-a-hash"),
    writeArgs("../" + f.relative, hash),
  ]) assert.equal(cli(f.repoRoot, args, content("Draft")).status, 1);
  assert.equal(cli(f.repoRoot, writeArgs(f.relative, hash), content("Draft").replace(DATE, "2026-11-07")).status, 1);
  const outside = path.join(f.repoRoot, "outside.md");
  fs.writeFileSync(outside, content("Outside"));
  fs.unlinkSync(f.target);
  fs.symlinkSync(outside, f.target);
  assert.throws(() => readActivity({ repoRoot: f.repoRoot, path: f.relative }), { code: "PATH_OUTSIDE_REPO" });
  assert.equal(cli(f.repoRoot, writeArgs(f.relative, hash), content("Draft")).status, 1);
  assert.equal(fs.readFileSync(outside, "utf8"), content("Outside"));
});

test("parallel stdin creation keeps each process's own content without shared drafts", async (t) => {
  const f = fixture(t);
  const run = (title) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [createCli, "--repo-root", f.repoRoot, "--date", DATE, "--stdin"]);
    let out = "", err = "";
    child.stdout.on("data", (data) => out += data);
    child.stderr.on("data", (data) => err += data);
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve(JSON.parse(out)) : reject(new Error(err)));
    child.stdin.end(content(title));
  });
  const results = await Promise.all([run("Alpha"), run("Beta")]);
  assert.notEqual(results[0].path, results[1].path);
  for (const [index, title] of ["Alpha", "Beta"].entries()) {
    assert.equal(fs.readFileSync(path.join(f.repoRoot, results[index].path), "utf8"), content(title));
  }
  assert.equal(fs.readFileSync(f.target, "utf8"), content("Original"));
  for (const args of [[], ["--stdin", "--file", "unused.md"]]) {
    assert.equal(cli(f.repoRoot, args, content("Rejected"), createCli).status, 1);
  }
});
