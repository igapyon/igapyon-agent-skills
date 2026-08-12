import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const runner = fileURLToPath(new URL("../scripts/github-writer-run.mjs", import.meta.url));

function git(root, args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8", shell: false, windowsHide: true });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

function invoke(args) {
  return spawnSync(process.execPath, [runner, "--format", "json", ...args], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
}

function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), "github-writer-handoff-"));
  t.after(() => rmSync(root, { force: true, recursive: true }));
  git(root, ["init", "-b", "feature/handoff"]);
  git(root, ["config", "user.name", "GitHub Writer Test"]);
  git(root, ["config", "user.email", "github-writer@example.invalid"]);
  writeFileSync(path.join(root, ".gitignore"), "workplace/\n", "utf8");
  writeFileSync(path.join(root, "README.md"), "base\n", "utf8");
  git(root, ["add", "."]);
  git(root, ["commit", "-m", "Base"]);
  writeFileSync(path.join(root, "README.md"), "changed\n", "utf8");
  git(root, ["add", "."]);
  git(root, ["commit", "-m", "Change"]);
  return root;
}

function unignoredFixture(t) {
  const root = fixture(t);
  writeFileSync(path.join(root, ".gitignore"), "", "utf8");
  git(root, ["add", ".gitignore"]);
  git(root, ["commit", "-m", "Do not ignore runner output"]);
  return root;
}

test("backup preflight creates one immutable handoff consumed without rebuilding plan arguments", (t) => {
  const root = fixture(t);
  const preflight = invoke(["backup.preflight", "--repo", root, "--backup-name", "backup/handoff-test"]);
  assert.equal(preflight.status, 0, preflight.stderr);
  const planned = JSON.parse(preflight.stdout);
  assert.equal(planned.result.approval_handoff.state, "pending");
  const id = planned.result.approval_handoff.id;
  assert.match(id, /^[0-9a-f]{64}$/);
  assert.equal(existsSync(path.join(root, planned.result.approval_handoff.path)), true);

  const listed = invoke(["approval.handoff.list", "--repo", root]);
  assert.equal(listed.status, 0, listed.stderr);
  assert.deepEqual(JSON.parse(listed.stdout).result.pending.map((entry) => entry.id), [id]);

  const applied = invoke(["approval.handoff.apply", "--repo", root, "--apply"]);
  assert.equal(applied.status, 0, applied.stderr);
  const appliedEnvelope = JSON.parse(applied.stdout);
  assert.equal(appliedEnvelope.result.handoff.state, "applied");
  assert.equal(git(root, ["rev-parse", "backup/handoff-test"]), git(root, ["rev-parse", "HEAD"]));
  const handoff = JSON.parse(readFileSync(path.join(root, planned.result.approval_handoff.path), "utf8"));
  assert.equal(handoff.state, "applied");

  const retry = invoke(["approval.handoff.apply", "--repo", root, "--handoff", id, "--apply"]);
  assert.equal(retry.status, 1);
  assert.match(JSON.parse(retry.stdout).error.message, /not pending/);
});

test("handoff routing requires exactly one pending handoff and accepts only a full selected ID", (t) => {
  const root = fixture(t);
  for (const name of ["backup/handoff-one", "backup/handoff-two"]) {
    const result = invoke(["backup.preflight", "--repo", root, "--backup-name", name]);
    assert.equal(result.status, 0, result.stderr);
  }
  const listed = JSON.parse(invoke(["approval.handoff.list", "--repo", root]).stdout);
  assert.equal(listed.result.pending.length, 2);
  const implicit = invoke(["approval.handoff.apply", "--repo", root, "--apply"]);
  assert.equal(implicit.status, 1);
  assert.match(JSON.parse(implicit.stdout).error.message, /Exactly one pending/);

  const abbreviated = invoke([
    "approval.handoff.dismiss", "--repo", root, "--handoff", listed.result.pending[0].id.slice(0, 12), "--apply",
  ]);
  assert.equal(abbreviated.status, 1);
  assert.match(JSON.parse(abbreviated.stdout).error.message, /full SHA-256/);

  const dismissed = invoke([
    "approval.handoff.dismiss", "--repo", root, "--handoff", listed.result.pending[0].id, "--apply",
  ]);
  assert.equal(dismissed.status, 0, dismissed.stderr);
  assert.equal(JSON.parse(dismissed.stdout).result.handoff.state, "dismissed");
});

test("runner-owned untracked operational records do not invalidate a sealed handoff", (t) => {
  const root = unignoredFixture(t);
  const preflight = JSON.parse(invoke([
    "backup.preflight", "--repo", root, "--backup-name", "backup/unignored-operational-output",
  ]).stdout);
  assert.equal(preflight.status, "success");
  const applied = invoke(["approval.handoff.apply", "--repo", root, "--apply"]);
  assert.equal(applied.status, 0, applied.stderr);
  assert.equal(JSON.parse(applied.stdout).result.handoff.state, "applied");
});

test("handoff contract drift stops before local Git mutation", (t) => {
  const root = fixture(t);
  const preflight = JSON.parse(invoke([
    "backup.preflight", "--repo", root, "--backup-name", "backup/contract-drift",
  ]).stdout);
  const handoffPath = path.join(root, preflight.result.approval_handoff.path);
  const handoff = JSON.parse(readFileSync(handoffPath, "utf8"));
  handoff.contract_pair_sha256 = "0".repeat(64);
  writeFileSync(handoffPath, `${JSON.stringify(handoff, null, 2)}\n`, "utf8");

  const applied = invoke(["approval.handoff.apply", "--repo", root, "--apply"]);
  assert.equal(applied.status, 1);
  assert.match(JSON.parse(applied.stdout).error.message, /contract changed/);
  assert.equal(git(root, ["branch", "--list", "backup/contract-drift"]), "");
  assert.equal(JSON.parse(readFileSync(handoffPath, "utf8")).state, "pending");
});

test("handoff plan digest drift becomes a conflict without creating its backup", (t) => {
  const root = fixture(t);
  const preflight = JSON.parse(invoke([
    "backup.preflight", "--repo", root, "--backup-name", "backup/plan-digest-drift",
  ]).stdout);
  const planPath = path.join(root, preflight.result.plan_path);
  writeFileSync(planPath, `${readFileSync(planPath, "utf8").trimEnd()}\nchanged\n`, "utf8");

  const applied = invoke(["approval.handoff.apply", "--repo", root, "--apply"]);
  assert.equal(applied.status, 1);
  assert.match(JSON.parse(applied.stdout).error.message, /Plan SHA-256 changed/);
  assert.equal(git(root, ["branch", "--list", "backup/plan-digest-drift"]), "");
  const handoff = JSON.parse(readFileSync(path.join(root, preflight.result.approval_handoff.path), "utf8"));
  assert.equal(handoff.state, "conflict");
});
