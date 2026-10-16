import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  backupApply,
  backupPreflight,
  defaultGit,
  recommitApply,
  recommitPreflight,
  sha256,
} from "../scripts/github-writer-kernel.mjs";

function git(root, args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), "github-writer-operation-"));
  t.after(() => rmSync(root, { force: true, recursive: true }));
  git(root, ["init", "-b", "feature/日本語"]);
  git(root, ["config", "user.name", "GitHub Writer Test"]);
  git(root, ["config", "user.email", "github-writer@example.invalid"]);
  writeFileSync(path.join(root, ".gitignore"), "workplace/\n", "utf8");
  writeFileSync(path.join(root, "README.md"), "# Test\n", "utf8");
  git(root, ["add", "."]);
  git(root, ["commit", "-m", "Base"]);
  const base = git(root, ["rev-parse", "HEAD"]);
  writeFileSync(path.join(root, "README.md"), "# Test\n\nFirst change\n", "utf8");
  git(root, ["add", "."]);
  git(root, ["commit", "-m", "First change"]);
  writeFileSync(path.join(root, "README.md"), "# Test\n\nFirst change\nSecond change\n", "utf8");
  git(root, ["add", "."]);
  git(root, ["commit", "-m", "Second change"]);
  return { root, base };
}

test("backup requires a sealed preflight plan and refuses a retry", (t) => {
  const { root } = fixture(t);
  const now = new Date("2026-07-29T01:02:00.000Z");
  const plan = backupPreflight({ repo: root, backupName: "" }, { now: () => now });
  assert.match(plan.plan_sha256, /^[0-9a-f]{64}$/);
  assert.equal(plan.backup_branch, "backup/2026-07-29-1002");

  const applied = backupApply({
    repo: root,
    plan: plan.plan_path,
    expectedPlanSha256: plan.plan_sha256,
  });
  assert.equal(git(root, ["rev-parse", applied.backup_branch]), applied.target);
  assert.equal(existsSync(path.join(root, applied.attempt_record)), true);

  assert.throws(() => backupApply({
    repo: root,
    plan: plan.plan_path,
    expectedPlanSha256: plan.plan_sha256,
  }), /already has an attempt/);
});

test("apply rejects a plan sealed to another workflow contract", (t) => {
  const { root } = fixture(t);
  const plan = backupPreflight({ repo: root, backupName: "" }, {
    now: () => new Date("2026-07-29T01:02:00.000Z"),
  });
  const planFile = path.join(root, plan.plan_path);
  const changed = JSON.parse(readFileSync(planFile, "utf8"));
  changed.contract_pair_sha256 = "0".repeat(64);
  const changedText = `${JSON.stringify(changed, null, 2)}\n`;
  writeFileSync(planFile, changedText, "utf8");

  assert.throws(() => backupApply({
    repo: root,
    plan: plan.plan_path,
    expectedPlanSha256: sha256(changedText),
  }), /workflow contract changed/);
});

test("recommit verifies draft digest, creates backup, and collapses commits", (t) => {
  const { root, base } = fixture(t);
  const draft = path.join(root, "PR_DRAFT.md");
  writeFileSync(
    draft,
    "feat: deterministic GitHub Writer runner\r\n\r\nAdd structured evidence and Windows support.\r\n",
    "utf8",
  );
  git(root, ["add", "PR_DRAFT.md"]);
  git(root, ["commit", "-m", "Add PR draft"]);
  const previousHead = git(root, ["rev-parse", "HEAD"]);
  const plan = recommitPreflight({
    repo: root,
    base,
    prDraft: "PR_DRAFT.md",
  }, {
    now: () => new Date("2026-07-29T02:03:00.000Z"),
  });
  assert.equal(plan.commits_to_collapse, 3);

  const applied = recommitApply({
    repo: root,
    plan: plan.plan_path,
    expectedPlanSha256: plan.plan_sha256,
  });
  assert.equal(applied.previous_head, previousHead);
  assert.equal(git(root, ["rev-parse", `${applied.new_head}^`]), base);
  assert.equal(git(root, ["rev-parse", applied.backup_branch]), previousHead);
  assert.equal(git(root, ["status", "--porcelain"]), "");
  assert.equal(git(root, ["log", "-1", "--format=%s"]), "feat: deterministic GitHub Writer runner");
  assert.match(readFileSync(path.join(root, applied.attempt_record), "utf8"), /"status": "success"/);
});

test("recommit stops before reset when the backup no longer resolves to the reviewed HEAD", (t) => {
  const { root, base } = fixture(t);
  const draft = path.join(root, "PR_DRAFT.md");
  writeFileSync(draft, "feat: backup integrity\n\nVerify backup before reset.\n", "utf8");
  git(root, ["add", "PR_DRAFT.md"]);
  git(root, ["commit", "-m", "Add draft"]);
  const before = git(root, ["rev-parse", "HEAD"]);
  const plan = recommitPreflight({ repo: root, base, prDraft: "PR_DRAFT.md" });
  let resetCalled = false;
  const injectedGit = (cwd, args, options) => {
    if (args[0] === "reset") resetCalled = true;
    if (args[0] === "rev-parse" && args[2] === `refs/heads/${plan.backup_branch}^{commit}`) {
      return { ok: true, out: "0".repeat(40), err: "", status: 0 };
    }
    return defaultGit(cwd, args, options);
  };
  assert.throws(() => recommitApply({
    repo: root,
    plan: plan.plan_path,
    expectedPlanSha256: plan.plan_sha256,
  }, { git: injectedGit }), /Backup branch does not point/);
  assert.equal(resetCalled, false);
  assert.equal(git(root, ["rev-parse", "HEAD"]), before);
  assert.equal(git(root, ["status", "--porcelain"]), "");
  assert.equal(git(root, ["rev-parse", plan.backup_branch]), before);
});

test("recommit refuses a frozen -done branch before creating a plan or mutation", (t) => {
  const { root, base } = fixture(t);
  const draft = path.join(root, "PR_DRAFT.md");
  writeFileSync(draft, "feat: frozen guard\n\nStop safely.\n", "utf8");
  git(root, ["add", "PR_DRAFT.md"]);
  git(root, ["commit", "-m", "Add draft"]);
  git(root, ["branch", "-m", "feature/日本語-done"]);
  const before = git(root, ["rev-parse", "HEAD"]);
  assert.throws(
    () => recommitPreflight({ repo: root, base, prDraft: "PR_DRAFT.md" }),
    /frozen branch/,
  );
  assert.equal(git(root, ["rev-parse", "HEAD"]), before);
  assert.equal(git(root, ["branch", "--list", "backup/*"]), "");
});

test("recommit apply refuses a branch frozen after preflight before backup or reset", (t) => {
  const { root, base } = fixture(t);
  const draft = path.join(root, "PR_DRAFT.md");
  writeFileSync(draft, "feat: frozen apply guard\n\nStop before mutation.\n", "utf8");
  git(root, ["add", "PR_DRAFT.md"]);
  git(root, ["commit", "-m", "Add draft"]);
  const plan = recommitPreflight({ repo: root, base, prDraft: "PR_DRAFT.md" });
  const before = git(root, ["rev-parse", "HEAD"]);
  git(root, ["branch", "-m", "feature/日本語-done"]);

  assert.throws(() => recommitApply({
    repo: root,
    plan: plan.plan_path,
    expectedPlanSha256: plan.plan_sha256,
  }), /frozen branch/);
  assert.equal(git(root, ["rev-parse", "HEAD"]), before);
  assert.equal(git(root, ["branch", "--list", plan.backup_branch]), "");
});
