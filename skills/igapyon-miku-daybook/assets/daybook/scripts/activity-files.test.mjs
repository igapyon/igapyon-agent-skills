import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { activityPath, compareActivitySuffixes, createActivity, nextActivityPath, nextActivitySuffix, validateActivityRecord } from "./activity-files.mjs";

const DATE = "2026-11-03";
const noHistory = { gitLog: () => "" };
const content = (title = "調査") => `---\ntype: activity\ndate: ${DATE}\n---\n\n# ${title}\n\n## やったこと\n\n記録しました。\n`;
function root(t) {
  const value = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "activity-files-")));
  t.after(() => fs.rmSync(value, { recursive: true, force: true }));
  return value;
}
function write(repo, relative, text = content()) {
  const target = path.join(repo, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
}

test("letter carry and ordering follow a..z, aa..az, ba..zz, aaa", () => {
  for (const [from, to] of [["", "a"], ["a", "b"], ["z", "aa"], ["az", "ba"], ["zz", "aaa"]]) {
    assert.equal(nextActivitySuffix(from), to);
  }
  assert.deepEqual(["aa", "b", "z", "a", "aaa", "zz"].sort(compareActivitySuffixes), ["a", "b", "z", "aa", "zz", "aaa"]);
  assert.throws(() => nextActivitySuffix("A"));
});

test("allocation includes current files, deleted Git names, and pending plan paths", (t) => {
  const repo = root(t);
  write(repo, "2026/202611/activities/activity-20261103.md");
  assert.equal(nextActivityPath(repo, DATE, noHistory).path, activityPath(DATE, "a"));
  write(repo, activityPath(DATE, "z"));
  assert.equal(nextActivityPath(repo, DATE, noHistory).path, activityPath(DATE, "aa"));
  const allocation = nextActivityPath(repo, DATE, {
    gitLog: () => `${activityPath(DATE, "az")}\n2026/202611/activities/activity-20261104zz.md\n`,
    reservedPaths: [activityPath(DATE, "ba")],
  });
  assert.equal(allocation.path, activityPath(DATE, "bb"));
  assert.equal(nextActivityPath(repo, "2026-11-04", noHistory).path, activityPath("2026-11-04", "a"));
  assert.match(nextActivityPath(repo, DATE, { gitLog: () => { throw new Error("no history"); } }).warnings[0], /history is unavailable/);
});

test("real local Git history reserves deleted suffixes", (t) => {
  const repo = root(t);
  const git = (...args) => execFileSync("git", args, { cwd: repo, stdio: "pipe" });
  git("init", "-q");
  write(repo, activityPath(DATE, "zz"));
  git("add", ".");
  git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.test", "commit", "-qm", "activity fixture");
  fs.unlinkSync(path.join(repo, activityPath(DATE, "zz")));
  assert.equal(nextActivityPath(repo, DATE).path, activityPath(DATE, "aaa"));
});

test("creation preserves existing files, validates record dates and refuses symlink parents", (t) => {
  const repo = root(t);
  write(repo, activityPath(DATE, "a"), content("既存活動"));
  const result = createActivity({ repoRoot: repo, date: DATE, content: content("別件") }, noHistory);
  assert.equal(result.path, activityPath(DATE, "b"));
  assert.match(fs.readFileSync(path.join(repo, activityPath(DATE, "a")), "utf8"), /既存活動/);
  assert.equal(fs.readFileSync(path.join(repo, result.path), "utf8"), content("別件"));
  assert.throws(() => createActivity({ repoRoot: repo, date: DATE, content: content().replace(DATE, "2026-11-04") }, noHistory), /must agree/);
  assert.throws(() => validateActivityRecord("2026/202610/activities/activity-20261103a.md", content()), /must agree/);
  assert.throws(() => validateActivityRecord("2026/202611/activities/activity-20261103A.md", content()), /Invalid activity path/);
  const other = root(t), outside = root(t);
  fs.symlinkSync(outside, path.join(other, "2026"), "dir");
  assert.throws(() => createActivity({ repoRoot: other, date: DATE, content: content() }, noHistory), { code: "PATH_OUTSIDE_REPO" });
  assert.deepEqual(fs.readdirSync(outside), []);
});

test("a peer taking the chosen name causes a fresh allocation without replacing its content", (t) => {
  const repo = root(t);
  const link = fs.linkSync;
  let first = true;
  t.mock.method(fs, "linkSync", (source, destination) => {
    if (first) {
      first = false;
      fs.writeFileSync(destination, content("Peer"));
    }
    return link(source, destination);
  });
  const result = createActivity({ repoRoot: repo, date: DATE, content: content("Own") }, noHistory);
  assert.equal(result.path, activityPath(DATE, "b"));
  assert.equal(fs.readFileSync(path.join(repo, activityPath(DATE, "a")), "utf8"), content("Peer"));
  assert.equal(fs.readFileSync(path.join(repo, result.path), "utf8"), content("Own"));
  assert.equal(fs.readdirSync(path.dirname(path.join(repo, result.path))).some((name) => name.endsWith(".tmp")), false);
});

test("a collision invisible to filename scanning reserves the rejected candidate", (t) => {
  const repo = root(t);
  write(repo, activityPath(DATE, "a").replace(/\.md$/, ".MD"), content("Peer"));
  const link = fs.linkSync;
  let attempts = 0;
  t.mock.method(fs, "linkSync", (source, destination) => {
    if (++attempts > 3) throw new Error("Repeated an invisible collision");
    if (destination === path.join(repo, activityPath(DATE, "a"))) {
      throw Object.assign(new Error("Case-insensitive name collision"), { code: "EEXIST" });
    }
    return link(source, destination);
  });
  const result = createActivity({ repoRoot: repo, date: DATE, content: content("Own") }, noHistory);
  assert.equal(result.path, activityPath(DATE, "b"));
  assert.equal(attempts, 2);
  assert.equal(fs.readFileSync(path.join(repo, activityPath(DATE, "a").replace(/\.md$/, ".MD")), "utf8"), content("Peer"));
  assert.equal(fs.readFileSync(path.join(repo, result.path), "utf8"), content("Own"));
});

test("continuous collisions stop after 32 attempts and remove the temporary file", (t) => {
  const repo = root(t);
  const attempts = [];
  t.mock.method(fs, "linkSync", (source, destination) => {
    attempts.push(path.basename(destination));
    if (attempts.length > 32) throw new Error("Unbounded retry");
    throw Object.assign(new Error("Peer collision"), { code: "EEXIST" });
  });
  assert.throws(() => createActivity({ repoRoot: repo, date: DATE, content: content() }, noHistory), (error) => {
    assert.equal(error.code, "ACTIVITY_CREATE_CONFLICT");
    assert.match(error.message, /activity-20261103af\.md/);
    return true;
  });
  assert.equal(attempts.length, 32);
  assert.equal(new Set(attempts).size, 32);
  assert.deepEqual(fs.readdirSync(path.join(repo, "2026/202611/activities")), []);
});

test("CLI skips a case variant on a case-insensitive filesystem", (t) => {
  const repo = root(t);
  const variant = activityPath(DATE, "a").replace(/\.md$/, ".MD");
  write(repo, variant, content("Peer"));
  if (!fs.existsSync(path.join(repo, activityPath(DATE, "a")))) return t.skip("Case-sensitive filesystem; invisible collisions are covered separately");
  const draft = path.join(repo, "draft.md");
  fs.writeFileSync(draft, content("Own"));
  const cli = fileURLToPath(new URL("./create-activity.mjs", import.meta.url));
  const output = execFileSync(process.execPath, [cli, "--repo-root", repo, "--date", DATE, "--file", draft], { encoding: "utf8", timeout: 3000 });
  const result = JSON.parse(output);
  assert.equal(result.path, activityPath(DATE, "b"));
  assert.equal(fs.readFileSync(path.join(repo, variant), "utf8"), content("Peer"));
  assert.equal(fs.readFileSync(path.join(repo, result.path), "utf8"), content("Own"));
});

test("parallel CLI creates retain both drafts under distinct names", async (t) => {
  const repo = root(t);
  const cli = fileURLToPath(new URL("./create-activity.mjs", import.meta.url));
  const run = (title) => {
    const draft = path.join(repo, `${title}.md`);
    fs.writeFileSync(draft, content(title));
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [cli, "--repo-root", repo, "--date", DATE, "--file", draft]);
      let out = "", err = "";
      child.stdout.on("data", (data) => out += data);
      child.stderr.on("data", (data) => err += data);
      child.on("error", reject);
      child.on("exit", (code) => code === 0 ? resolve(JSON.parse(out)) : reject(new Error(err)));
    });
  };
  const results = await Promise.all([run("Alpha"), run("Beta")]);
  assert.equal(new Set(results.map((item) => item.path)).size, 2);
  for (let index = 0; index < results.length; index++) {
    assert.equal(fs.readFileSync(path.join(repo, results[index].path), "utf8"), content(["Alpha", "Beta"][index]));
  }
});
