import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { activityPath } from "./activity-files.mjs";

const history = fileURLToPath(new URL("./activity-history.mjs", import.meta.url));
const create = fileURLToPath(new URL("./create-activity.mjs", import.meta.url));
const early = "2026-11-19";
const later = "2026-11-20";
const legacy = "2026/202611/activities/activity-20261119.md";

function workspace(t) {
  const temporary = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "activity-history-")));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  return temporary;
}

function markdown(date, body) {
  return ["---", "type: activity", "date: " + date, "---", "", body, ""].join("\n");
}

function previous(from, to) {
  const href = path.posix.relative(path.posix.dirname(from), to);
  return "前回の記録 → [" + path.posix.basename(to, ".md") + "](" + href + ")";
}

function write(repo, relative, date, body) {
  const target = path.join(repo, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, markdown(date, body));
}

function cli(repo, args, status = 0) {
  const result = spawnSync(process.execPath, [history, ...args, "--repo-root", repo], {
    encoding: "utf8",
    cwd: os.tmpdir(),
  });
  assert.equal(result.status, status, result.stderr || result.stdout);
  return result.stdout ? JSON.parse(result.stdout) : { error: result.stderr };
}

test("list scopes text and dates across both layouts with stable suffix order", (t) => {
  const repo = workspace(t);
  const older = "2026-10-10";
  const zzz = activityPath(early, "zzz");
  const aaaa = activityPath(early, "aaaa");
  const short = legacy.replace(".md", "a.md");
  const child = activityPath(later, "aaa");
  write(repo, legacy, early, "# 調査 A\n\nhttps://example.test/Report");
  write(repo, short, early, "本文だけ");
  write(repo, aaaa, early, "# 実装 X");
  write(repo, zzz, early, "# 調査の別件");
  write(repo, child, later, "# 調査 A の続き");
  write(repo, activityPath(older, "aaa"), older, "# 旧月");
  const paths = (...args) => cli(repo, ["list", ...args]).records.map((record) => record.path);
  assert.deepEqual(paths("--from", early, "--to", later), [child, legacy, short, zzz, aaaa]);
  assert.deepEqual(paths("--date", early, "--query", "調査"), [legacy, zzz]);
  assert.deepEqual(paths("--query", "https://example.test/Report"), [legacy]);
  assert.deepEqual(paths("--query", "https://example.test/report"), []);
  assert.equal(cli(repo, ["list", "--query", "本文だけ"]).records[0].title, "activity-20261119a");
  assert.equal(paths().length, 6);
  assert.match(cli(repo, ["list", "--date", early, "--to", later], 1).error, /cannot be combined/);
  assert.match(cli(repo, ["list", "--from", later, "--to", early], 1).error, /on or before/);
  assert.match(cli(repo, ["list", "--date", "2026-02-30"], 1).error, /valid date/);
  write(repo, legacy.replace(".md", "zzz.md"), early, "# Duplicate");
  assert.match(cli(repo, ["list", "--date", early], 1).error, /DUPLICATE_RECORD.*zzz/);
});

test("list validates placement only within the selected activity dates", (t) => {
  const repo = workspace(t);
  const child = activityPath(later, "aaa");
  const octoberMismatch = "activities/2026/202610/20261001/activity-20261002aaa.md";
  const novemberMismatch = "activities/2026/202611/20261118/activity-20261117aaa.md";
  write(repo, legacy, early, "# 前回");
  write(repo, child, later, "# 指定日の活動");
  write(repo, octoberMismatch, "2026-10-02", "# 別の月の配置ミス");
  write(repo, novemberMismatch, "2026-11-17", "# 同じ月の配置ミス");
  const paths = (...args) => cli(repo, ["list", ...args]).records.map((record) => record.path);
  assert.deepEqual(paths("--date", later), [child]);
  assert.deepEqual(paths("--from", early), [child, legacy]);
  assert.deepEqual(paths("--from", "2026-11-21"), []);
  assert.match(cli(repo, ["list", "--date", "2026-11-18"], 1).error, /activity-20261117aaa/);
  assert.match(cli(repo, ["list", "--to", "2026-10-01"], 1).error, /activity-20261002aaa/);
  assert.match(cli(repo, ["list"], 1).error, /INVALID_RECORD_PATH/);

  const linked = path.join(repo, "2026/202611/activities/activity-20261118a.md");
  fs.symlinkSync(path.join(repo, legacy), linked);
  assert.deepEqual(paths("--date", early), [legacy]);
  fs.unlinkSync(path.join(repo, novemberMismatch));
  assert.match(cli(repo, ["list", "--date", "2026-11-18"], 1).error, /PATH_OUTSIDE_REPO/);
});

test("trace returns the selected lineage in link order and does not alter the records", (t) => {
  const repo = workspace(t);
  const b = activityPath(later, "aaa");
  const c = activityPath(early, "aaa");
  const x = activityPath(early, "aab");
  write(repo, legacy, early, "# 調査 A\n\n残件は旧形式の日付の確認。");
  write(repo, b, later, "# 調査 B\n\n" + previous(b, legacy));
  write(repo, x, early, "# 実装 X");
  write(repo, c, early, "# 調査 C\n\n" + previous(c, b) + "\n\n後から追記。");
  const snapshot = () => [legacy, b, c, x].map((file) => fs.readFileSync(path.join(repo, file), "utf8"));
  const before = snapshot();
  for (const [args, expected, reason] of [
    [[], [legacy, b, c], "no_previous"],
    [["--depth", "1"], [b, c], "depth_limit"],
    [["--depth", "0"], [c], "depth_limit"],
  ]) {
    const result = cli(repo, ["trace", "--path", c, ...args]);
    assert.deepEqual(result.records.map((record) => record.path), expected);
    assert.deepEqual(result.stop, { reason, at: expected[0] });
  }
  assert.deepEqual(snapshot(), before);
  assert.match(cli(repo, ["trace", "--path", c, "--depth=-1"], 1).error, /non-negative/);
  assert.match(cli(repo, ["trace", "--path", c, "--depth", "9007199254740992"], 1).error, /safe integer/);
  assert.match(cli(repo, ["trace", "--path", "../" + c], 1).error, /INVALID_RECORD_PATH/);
});

test("trace distinguishes ignored Markdown examples, broken links, and cycles", (t) => {
  const repo = workspace(t);
  const start = activityPath(later, "aaa");
  const next = activityPath(later, "aab");
  const missing = activityPath(later, "aac");
  const line = previous(start, next);
  const prefix = "# 起点\n\n";
  const run = (status = 0, extra = []) => cli(repo, ["trace", "--path", start, ...extra], status);
  const fence = String.fromCharCode(96).repeat(3);
  const genericExamples = ["~~~~md", "", line, "", "~~~", "", line, "", "~~~~", "",
    fence + "md", "", line, "", fence, "", "> " + line, "", "    " + line,
    "", "[資料](activity-20261120aab.md)"].join("\n");
  write(repo, start, later, prefix + genericExamples);
  assert.equal(run().stop.reason, "no_previous");
  write(repo, start, later, prefix + line + "\n\n" + line);
  assert.equal(run(1).stop.reason, "invalid_link");
  write(repo, start, later, prefix + line);
  write(repo, next, later, "# 途中\n\n" + previous(next, missing));
  assert.deepEqual(run(1).stop, { reason: "missing_target", at: next, target: missing });
  assert.deepEqual(run(1).records.map((record) => record.path), [next, start]);
  assert.equal(run(0, ["--depth", "1"]).stop.reason, "depth_limit");
  write(repo, next, later, "# 途中\n\n" + previous(next, start));
  assert.deepEqual(run(1).stop, { reason: "cycle", at: next, target: start });
  write(repo, start, later, prefix + previous(start, start));
  assert.deepEqual(run(1).stop, { reason: "cycle", at: start, target: start });
  write(repo, start, later, prefix + line);
  fs.writeFileSync(path.join(repo, next), "invalid activity");
  assert.deepEqual(run(1).stop, { reason: "unreadable_target", at: start, target: next });
  fs.unlinkSync(path.join(repo, next));
  fs.symlinkSync(path.join(repo, start), path.join(repo, next));
  assert.deepEqual(run(1).stop, { reason: "invalid_link", at: start, target: next });
  for (const href of ["https://example.test/activity.md", "/activity.md", "../../../../../../activity.md",
    "../../../../tasks/2026/202611/20261120/task-202611-00001-test.md"]) {
    write(repo, start, later, prefix + "前回の記録 → [activity](" + href + ")");
    assert.equal(run(1).stop.reason, "invalid_link");
  }
});

test("trace ignores HTML comments and follows a previous link adjacent to headings", (t) => {
  const repo = workspace(t);
  const start = activityPath(later, "aaa");
  const next = activityPath(later, "aab");
  const line = previous(start, next);
  const hidden = ["  <!--", "", "# Comment title", "", line, "", "-->"].join("\n");
  write(repo, next, later, "# 前回");
  write(repo, start, later, hidden + "\n\n# 起点");
  const trace = () => cli(repo, ["trace", "--path", start]);
  assert.deepEqual(trace(), {
    records: [{ date: later, title: "起点", path: start }],
    stop: { reason: "no_previous", at: start },
  });
  write(repo, start, later, hidden + "\n\n# 起点\n" + line + "\n## 追記\n\n作業の続き。");
  assert.deepEqual(trace().records.map((record) => record.path), [next, start]);
  write(repo, start, later, hidden + "\n" + line + "\n<pre>\n\n" + line + "\n\n</pre>");
  assert.deepEqual(trace().records.map((record) => record.path), [next, start]);
  write(repo, start, later, "# 起点\n\n説明の段落。\n" + line + "\n## 追記");
  assert.equal(trace().stop.reason, "no_previous");
});

test("trace follows a previous link before adjacent lists, block quotes, and thematic breaks", (t) => {
  const repo = workspace(t);
  const start = activityPath(later, "aaa");
  const parent = activityPath(later, "aab");
  const link = previous(start, parent);
  const trace = () => cli(repo, ["trace", "--path", start]);
  write(repo, parent, later, "# 前回");
  for (const nextLine of ["- 追記", "+ 追記", "* 追記", "1. 追記", "01) 追記", "   > 引用", ">引用",
    "***", "___", "-- -"]) {
    write(repo, start, later, ["# 起点", "", link, nextLine].join("\n"));
    assert.deepEqual(trace().records.map((record) => record.path), [parent, start], nextLine);
  }
  // These lines continue a paragraph, including unmarked continuations of a quotation or a list item.
  for (const body of [
    link + "\n2. 続く本文",
    link + "\n    - 続く本文",
    link + "\n+  ",
    link + "\n---",
    "> 引用\n" + link,
    "- 項目\n" + link,
  ]) {
    write(repo, start, later, "# 起点\n\n" + body);
    assert.deepEqual(trace().stop, { reason: "no_previous", at: start }, body);
  }
});

test("trace follows a previous link after real Setext headings and thematic breaks", (t) => {
  const repo = workspace(t);
  const parent = activityPath(later, "aaa");
  const child = activityPath(later, "aab");
  const link = previous(child, parent);
  const trace = () => cli(repo, ["trace", "--path", child]);
  write(repo, parent, later, "# 前回");
  for (const block of [
    "調査メモ\n=====",
    "下線式の見出し\n-----",
    "複数行の\n見出し\n=====",
    "見出し A\n=====\n見出し B\n=====",
    "***", "___", "- - -",
  ]) {
    write(repo, child, later, block + "\n" + link);
    assert.deepEqual(trace().records.map((record) => record.path), [parent, child], block);
  }
  write(repo, child, later, "複数行の\n見出し\n=====\n" + link);
  assert.equal(trace().records[1].title, "複数行の 見出し");
  assert.equal(cli(repo, ["list", "--query", "複数行の 見出し"]).records[0].title, "複数行の 見出し");
  for (const block of ["=====", "> 引用\n続き\n=====", "- リスト\n続き\n=====", "    コード\n====="]) {
    write(repo, child, later, block + "\n" + link);
    assert.deepEqual(trace().stop, { reason: "no_previous", at: child }, block);
  }
});

test("create refuses conflicting previous links and keeps a matching one once", (t) => {
  const repo = workspace(t);
  const parent = activityPath(later, "aaa");
  const unrelated = activityPath(later, "aab");
  const child = activityPath(later, "aac");
  write(repo, parent, later, "# 前回 A");
  write(repo, unrelated, later, "# 別件 B");
  const directory = path.dirname(path.join(repo, child));
  const snapshot = () => fs.readdirSync(directory).sort()
    .map((name) => [name, fs.readFileSync(path.join(directory, name), "utf8")]);
  const original = snapshot();
  const createWithPrevious = (previousPath, draft) =>
    spawnSync(process.execPath, [create, "--repo-root", repo, "--date", later, "--stdin", "--previous", previousPath],
      { input: draft, encoding: "utf8", cwd: repo });

  const link = previous(child, parent);
  const drafts = [markdown(later, "# 続き\n\n" + link + "\n- 追記"),
    markdown(later, "続き\n=====\n" + link), markdown(later, "***\n" + link)];
  for (const draft of drafts) {
    const conflict = createWithPrevious(unrelated, draft);
    assert.equal(conflict.status, 1, conflict.stderr || conflict.stdout);
    assert.match(conflict.stderr, /INVALID_PREVIOUS_ACTIVITY/);
    assert.equal(conflict.stdout, "");
    assert.deepEqual(snapshot(), original);
  }

  const draft = drafts[1];
  const match = createWithPrevious(parent, draft);
  assert.equal(match.status, 0, match.stderr);
  assert.equal(JSON.parse(match.stdout).path, child);
  assert.equal(fs.readFileSync(path.join(repo, child), "utf8"), draft);
  assert.deepEqual(cli(repo, ["trace", "--path", child]).records.map((record) => record.path), [parent, child]);
});

test("two simultaneous creates share their previous activity without changing it", async (t) => {
  const repo = workspace(t);
  write(repo, legacy, early, "# 調査 A");
  const before = fs.readFileSync(path.join(repo, legacy), "utf8");
  function make(title) {
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [create, "--repo-root", repo, "--date", later, "--stdin", "--previous", legacy],
        { stdio: ["pipe", "pipe", "pipe"] });
      let stdout = "", stderr = "";
      child.stdout.on("data", (data) => { stdout += data; });
      child.stderr.on("data", (data) => { stderr += data; });
      child.on("error", reject);
      child.on("close", (code) => code === 0 ? resolve(JSON.parse(stdout).path) : reject(new Error(stderr)));
      child.stdin.end(markdown(later, "# " + title));
    });
  }
  const paths = await Promise.all([make("調査の続き"), make("別の検証")]);
  assert.equal(new Set(paths).size, 2);
  for (const file of paths) {
    const saved = fs.readFileSync(path.join(repo, file), "utf8");
    assert.equal(saved.split(previous(file, legacy)).length, 2);
    assert.deepEqual(cli(repo, ["trace", "--path", file]).records.map((r) => r.path), [legacy, file]);
  }
  assert.equal(fs.readFileSync(path.join(repo, legacy), "utf8"), before);
});
