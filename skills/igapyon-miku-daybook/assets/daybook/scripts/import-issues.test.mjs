import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "import-issues.mjs");

function makeRoot(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "daybook-import-cli-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function run(root, args, env = process.env) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd: root, env, encoding: "utf8" });
}

function fixtureFiles(root) {
  const directory = path.join(root, "workplace/issue-import/run-cli");
  fs.mkdirSync(directory, { recursive: true });
  const issue = {
    number: 42,
    url: "https://github.com/acme/daybook/issues/42",
    title: "Activity",
    body: "Yesterday we rehearsed.",
    state: "closed",
    is_pull_request: false,
    created_at: null,
    updated_at: "2026-10-05T12:00:00Z",
    comments_scope: "helper-returned",
    comments: [],
  };
  const source = {
    schema_version: 1,
    repo: "acme/daybook",
    import_date: "2026-10-06",
    receipt_author_logins: ["maintainer"],
    excluded_issue_numbers: [3],
    issues: [issue],
  };
  const manifest = {
    schema_version: 1,
    issues: [{
      number: 42,
      decision: "import",
      records: [{
        key: "rehearsal",
        type: "activity",
        action: "create",
        title: "合奏に参加した",
        content: "午後、合奏に参加してバイオリンを弾いた。",
        date: "2026-10-05",
        date_evidence: { issue_body: "Yesterday we rehearsed." },
      }],
    }],
  };
  fs.writeFileSync(path.join(directory, "source.json"), `${JSON.stringify(source, null, 2)}\n`);
  fs.writeFileSync(path.join(directory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return { directory, source };
}

test("--help is local and capability detection returns disabled when gh is absent", (t) => {
  const root = makeRoot(t);
  const help = run(root, ["--help"]);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Remote Issue reads/);
  const before = fs.readdirSync(root);
  const capabilities = run(root, ["capabilities"], { ...process.env, PATH: "" });
  assert.equal(capabilities.status, 0);
  const parsed = JSON.parse(capabilities.stdout);
  assert.equal(parsed.reason, "GH_NOT_FOUND");
  assert.equal(parsed.issue_reception, "disabled");
  assert.deepEqual(fs.readdirSync(root), before);
});

test("CLI prepare and apply create only the planned local activity and run artifacts", (t) => {
  const root = makeRoot(t);
  const { directory } = fixtureFiles(root);
  const rel = (name) => path.relative(root, path.join(directory, name));
  const prepare = run(root, [
    "prepare", "--repo-root", root,
    "--source", rel("source.json"), "--manifest", rel("manifest.json"),
    "--out-dir", path.relative(root, directory),
  ]);
  assert.equal(prepare.status, 0, prepare.stderr);
  const prepared = JSON.parse(prepare.stdout);
  assert.match(prepared.plan_id, /^[a-f0-9]{64}$/);
  assert.equal(prepared.writes, 1);
  assert.equal(fs.existsSync(path.join(root, "2026/202610/activities/activity-20261005.md")), false);
  assert.equal(fs.existsSync(path.join(directory, "preview.md")), true);
  const apply = run(root, [
    "apply", "--repo-root", root, "--plan", rel("plan.json"),
    "--refresh-source", rel("source.json"), "--result", rel("result.json"),
  ]);
  assert.equal(apply.status, 0, apply.stderr);
  const result = JSON.parse(fs.readFileSync(path.join(directory, "result.json"), "utf8"));
  assert.equal(result.status, "local-written");
  assert.equal(result.issues[0].comment.status, "pending");
  assert.match(fs.readFileSync(path.join(root, "2026/202610/activities/activity-20261005.md"), "utf8"), /合奏に参加した/);
  assert.equal(fs.existsSync(path.join(directory, "comment-42.md")), true);
  assert.equal(fs.existsSync(path.join(root, "workplace/issue-import.lock")), false);
});

test("unknown arguments and malformed issue numbers fail with concise JSON errors", (t) => {
  const root = makeRoot(t);
  const unknown = run(root, ["prepare", "--mystery"]);
  assert.equal(unknown.status, 2);
  assert.match(unknown.stderr, /INVALID_ARGUMENT/);
  const suffix = run(root, ["comment-result", "--result", "workplace/issue-import/run/result.json", "--issue", "42x", "--status", "posted"]);
  assert.equal(suffix.status, 2);
  assert.match(suffix.stderr, /positive integer/);
  assert.doesNotMatch(suffix.stderr, /at .*import-issues/);
});

