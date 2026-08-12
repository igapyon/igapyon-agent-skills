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
  defaultGit,
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
  assert.equal(pr.target.resolution, "default-latest-single-commit-base-unresolved");
  assert.equal(pr.commits[0].subject, "Update Japanese documents");
  assert.match(pr.patch_excerpt, /更新後の説明/);
  assert.match(pr.evidence_sha256, /^[0-9a-f]{64}$/);
  assert.equal(pr.writing_contract.generation_passes, 1);

  const release = prepareGitEvidence({ repo: root, mode: "release", target: first });
  assert.equal(release.target.resolution, "release-start-through-head");
  assert.equal(release.commit_count, 2);
  assert.match(release.changed_files.join("\n"), /資料\/概要\.md/);
});

test("default PR evidence expands to the complete branch range only when two commits are ahead", (t) => {
  const { root, first } = fixture(t);
  git(root, ["update-ref", "refs/remotes/origin/devel", first]);
  const one = prepareGitEvidence({ repo: root, mode: "pr", target: "" });
  assert.equal(one.target.resolution, "default-branch-single-commit");
  assert.equal(one.target.base, "origin/devel");
  assert.equal(one.target.ahead_commit_count, 1);
  assert.equal(one.commit_count, 1);

  writeFileSync(path.join(root, "third.md"), "third\n", "utf8");
  git(root, ["add", "third.md"]);
  git(root, ["commit", "-m", "Third change"]);
  const multiple = prepareGitEvidence({ repo: root, mode: "pr", target: "" });
  assert.equal(multiple.target.resolution, "default-branch-multi-commit-range");
  assert.equal(multiple.target.recommit_recommended, true);
  assert.equal(multiple.target.ahead_commit_count, 2);
  assert.equal(multiple.commit_count, 2);
  assert.deepEqual(multiple.commits.map((entry) => entry.subject), [
    "Third change",
    "Update Japanese documents",
  ]);

  const explicit = prepareGitEvidence({ repo: root, mode: "pr", target: "HEAD" });
  assert.equal(explicit.target.resolution, "single-commit");
  assert.equal(explicit.commit_count, 1);

  const explicitRange = prepareGitEvidence({ repo: root, mode: "pr", target: `${first}..HEAD` });
  assert.equal(explicitRange.target.resolution, "explicit-range");
  assert.equal(explicitRange.commit_count, 2);
});

test("default PR target rejects empty and unrelated local base references while excluding matching upstream", (t) => {
  const { root, first } = fixture(t);
  git(root, ["update-ref", "refs/remotes/origin/devel", first]);
  git(root, ["config", "branch.devel.remote", "origin"]);
  git(root, ["config", "branch.devel.merge", "refs/heads/devel"]);
  const matchingUpstream = prepareGitEvidence({ repo: root, mode: "pr", target: "" });
  assert.equal(matchingUpstream.target.base_source, "local-origin-devel");

  git(root, ["update-ref", "refs/remotes/origin/devel", "HEAD"]);
  assert.throws(
    () => prepareGitEvidence({ repo: root, mode: "pr", target: "" }),
    /No commits are available for a PR/,
  );

  git(root, ["checkout", "--orphan", "unrelated"]);
  git(root, ["rm", "-rf", "."]);
  writeFileSync(path.join(root, "unrelated.txt"), "unrelated\n", "utf8");
  git(root, ["add", "."]);
  git(root, ["commit", "-m", "Unrelated root"]);
  const unrelated = git(root, ["rev-parse", "HEAD"]);
  git(root, ["checkout", "devel"]);
  git(root, ["update-ref", "refs/remotes/origin/devel", unrelated]);
  assert.throws(
    () => prepareGitEvidence({ repo: root, mode: "pr", target: "" }),
    /not an ancestor of HEAD/,
  );
});

test("PR evidence accepts a diff beyond the legacy 1 MiB process buffer and returns a bounded excerpt", (t) => {
  const { root } = fixture(t);
  writeFileSync(path.join(root, "large-diff.txt"), "x".repeat(25 * 1024 * 1024), "utf8");
  git(root, ["add", "large-diff.txt"]);
  git(root, ["commit", "-m", "Large local diff fixture"]);

  const evidence = prepareGitEvidence({ repo: root, mode: "pr", target: "HEAD" });
  assert.equal(evidence.commit_count, 1);
  assert.equal(evidence.patch_truncated, true);
  assert.ok(evidence.patch_excerpt.length < 130_000);
  assert.equal(evidence.changed_files_truncated, false);
  assert.throws(
    () => defaultGit(root, ["diff", "--exit-code", "HEAD^", "HEAD"]),
    (error) => {
      assert.match(error.message, /stdout_bytes=262/);
      assert.match(error.message, /stdout_sha256=[0-9a-f]{64}/);
      assert.ok(error.message.length < 6_000);
      assert.doesNotMatch(error.message, /x{100}/);
      return true;
    },
  );
});

test("repository textconv failure cannot affect bounded evidence", (t) => {
  const { root } = fixture(t);
  writeFileSync(path.join(root, ".gitattributes"), "*.converted diff=broken\n", "utf8");
  writeFileSync(path.join(root, "sample.converted"), "changed by internal diff only\n", "utf8");
  git(root, ["add", ".gitattributes", "sample.converted"]);
  git(root, ["commit", "-m", "Text conversion fixture"]);
  git(root, ["config", "diff.broken.textconv", "git --no-such-command"]);

  const external = spawnSync("git", ["diff", "HEAD^", "HEAD"], {
    cwd: root,
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  assert.notEqual(external.status, 0, "fixture must prove textconv would fail without runner flags");
  const evidence = prepareGitEvidence({ repo: root, mode: "pr", target: "HEAD" });
  assert.equal(evidence.commit_count, 1);
  assert.match(evidence.patch_excerpt, /changed by internal diff only/);
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
