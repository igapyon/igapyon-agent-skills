import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  branchStatus,
  prepareAboutEvidence,
  prepareGitEvidence,
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
  const root = mkdtempSync(path.join(os.tmpdir(), "github-writer-evidence-"));
  t.after(() => rmSync(root, { force: true, recursive: true }));
  git(root, ["init", "-b", "devel"]);
  git(root, ["config", "user.name", "GitHub Writer Test"]);
  git(root, ["config", "user.email", "github-writer@example.invalid"]);
  writeFileSync(path.join(root, ".gitignore"), "workplace/\n", "utf8");
  writeFileSync(path.join(root, "README.md"), "# サンプル\r\n\r\n最初の説明\r\n", "utf8");
  git(root, ["add", "."]);
  git(root, ["commit", "-m", "Initial commit"]);
  const first = git(root, ["rev-parse", "HEAD"]);
  mkdirSync(path.join(root, "資料"));
  writeFileSync(path.join(root, "README.md"), "# サンプル\n\n更新後の説明\n", "utf8");
  writeFileSync(path.join(root, "資料", "概要.md"), "# 概要\r\n\r\n日本語パス\r\n", "utf8");
  git(root, ["add", "."]);
  git(root, ["commit", "-m", "Update Japanese documents"]);
  return { root, first };
}

test("PR and release evidence are bounded structured inputs", (t) => {
  const { root, first } = fixture(t);
  const pr = prepareGitEvidence({ repo: root, mode: "pr", target: "" });
  assert.equal(pr.schema_version, "github-writer.evidence/v1");
  assert.equal(pr.commit_count, 1);
  assert.equal(pr.commits[0].subject, "Update Japanese documents");
  assert.match(pr.patch_excerpt, /更新後の説明/);
  assert.match(pr.evidence_sha256, /^[0-9a-f]{64}$/);
  assert.equal(pr.writing_contract.generation_passes, 1);

  const release = prepareGitEvidence({ repo: root, mode: "release", target: first });
  assert.equal(release.target.resolution, "release-start-through-head");
  assert.equal(release.commit_count, 2);
  assert.match(release.changed_files.join("\n"), /資料\/概要\.md/);
});

test("About evidence and branch status support UTF-8 documents without an upstream", (t) => {
  const { root } = fixture(t);
  const about = prepareAboutEvidence({
    repo: root,
    documents: ["README.md", "資料/概要.md"],
  });
  assert.equal(about.documents.length, 2);
  assert.equal(about.documents[1].path, "資料/概要.md");
  assert.doesNotMatch(about.documents[1].text, /\r/);

  const status = branchStatus({ repo: root });
  assert.equal(status.branch, "devel");
  assert.equal(status.upstream, null);
  assert.equal(status.ahead, null);
  assert.equal(status.behind, null);
  assert.equal(status.dirty, false);
});
