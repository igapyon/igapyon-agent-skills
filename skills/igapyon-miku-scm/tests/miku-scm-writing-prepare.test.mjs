import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  WRITING_EVIDENCE_SCHEMA_VERSION,
  parseWritingPrepareArgs,
  prepareWritingEvidence,
} from "../scripts/miku-scm-writing-prepare.mjs";

function git(cwd, ...args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

async function repository(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "miku-scm-writing-prepare-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  git(root, "init");
  git(root, "config", "user.name", "Test User");
  git(root, "config", "user.email", "test@example.invalid");
  await writeFile(path.join(root, "README.md"), "base\n", "utf8");
  git(root, "add", "README.md");
  git(root, "commit", "-m", "base");
  git(root, "branch", "-M", "devel-writing");
  return root;
}

function fakeGit() {
  return (_cwd, args, options = {}) => {
    const command = args.join(" ");
    const values = new Map([
      ["rev-parse --show-toplevel", "/tmp/repository"],
      ["branch --show-current", "devel-writing"],
      ["rev-parse HEAD", "b".repeat(40)],
      [`rev-parse --verify ${"b".repeat(40)}^{commit}`, "b".repeat(40)],
      [`rev-parse --verify ${"b".repeat(40)}^`, "a".repeat(40)],
      [`show -s --format=%H%x09%s ${"b".repeat(40)} --`, `${"b".repeat(40)}\tAdd writing evidence`],
      [`diff --stat --no-renames --no-textconv ${"a".repeat(40)}..${"b".repeat(40)} --`, " README.md | 2 ++"],
      [`diff --name-status --no-renames --no-textconv ${"a".repeat(40)}..${"b".repeat(40)} --`, "M\tREADME.md"],
      [`diff --no-ext-diff --no-renames --no-textconv --unified=1 ${"a".repeat(40)}..${"b".repeat(40)} --`, "+token=should-redact\n+safe=true"],
    ]);
    if (values.has(command)) return { ok: true, out: values.get(command), err: "" };
    if (options.allowFailure) return { ok: false, out: "", err: "" };
    throw new Error(`Unexpected git command: ${command}`);
  };
}

function multiCommitPrGit() {
  const base = "a".repeat(40);
  const middle = "b".repeat(40);
  const head = "c".repeat(40);
  const range = `${base}..${head}`;
  return (_cwd, args, options = {}) => {
    const command = args.join(" ");
    const values = new Map([
      ["rev-parse --show-toplevel", "/tmp/repository"],
      ["branch --show-current", "devel-tiga0804xaa"],
      ["rev-parse HEAD", head],
      ["rev-parse --abbrev-ref --symbolic-full-name @{u}", "origin/devel"],
      ["rev-parse --verify origin/devel^{commit}", base],
      [`merge-base --is-ancestor ${base} ${head}`, ""],
      [`rev-list --count ${range}`, "2"],
      [`log --max-count=201 --format=%H%x09%s ${range} --`, `${head}\tSecond change\n${middle}\tFirst change`],
      [`diff --stat --no-renames --no-textconv ${range} --`, " src/main.mjs | 4 ++++"],
      [`diff --name-status --no-renames --no-textconv ${range} --`, "M\tsrc/main.mjs"],
      [`diff --no-ext-diff --no-renames --no-textconv --unified=1 ${range} --`, "+first\n+second"],
    ]);
    if (values.has(command)) return { ok: true, out: values.get(command), err: "" };
    if (options.allowFailure) return { ok: false, out: "", err: "" };
    throw new Error(`Unexpected git command: ${command}`);
  };
}

function singleCommitPrGit() {
  const base = "a".repeat(40);
  const head = "b".repeat(40);
  const range = `${base}..${head}`;
  return (_cwd, args, options = {}) => {
    const command = args.join(" ");
    const values = new Map([
      ["rev-parse --show-toplevel", "/tmp/repository"],
      ["branch --show-current", "devel-tiga0804xab"],
      ["rev-parse HEAD", head],
      ["rev-parse --abbrev-ref --symbolic-full-name @{u}", "origin/devel"],
      ["rev-parse --verify origin/devel^{commit}", base],
      [`merge-base --is-ancestor ${base} ${head}`, ""],
      [`rev-list --count ${range}`, "1"],
      [`rev-parse --verify ${head}^{commit}`, head],
      [`rev-parse --verify ${head}^`, base],
      [`show -s --format=%H%x09%s ${head} --`, `${head}\tOnly change`],
      [`diff --stat --no-renames --no-textconv ${range} --`, " README.md | 1 +"],
      [`diff --name-status --no-renames --no-textconv ${range} --`, "M\tREADME.md"],
      [`diff --no-ext-diff --no-renames --no-textconv --unified=1 ${range} --`, "+only"],
    ]);
    if (values.has(command)) return { ok: true, out: values.get(command), err: "" };
    if (options.allowFailure) return { ok: false, out: "", err: "" };
    throw new Error(`Unexpected git command: ${command}`);
  };
}

test("writing prepare parsers keep modes and options separate", () => {
  assert.equal(parseWritingPrepareArgs("pr", [], "/tmp/repository").mode, "pr");
  assert.throws(
    () => parseWritingPrepareArgs("release", [], "/tmp/repository"),
    /requires --target/,
  );
  assert.throws(
    () => parseWritingPrepareArgs("about", ["--target", "HEAD"], "/tmp/repository"),
    /does not accept --target/,
  );
  assert.throws(
    () => parseWritingPrepareArgs("issue", ["--github-repo", "invalid"], "/tmp/repository"),
    /owner\/repository/,
  );
});

test("PR prepare falls back to the latest commit when a branch base is unavailable", async () => {
  const result = await prepareWritingEvidence(
    parseWritingPrepareArgs("pr", [], "/tmp/repository"),
    {
      git: fakeGit(),
      now: () => new Date("2026-07-28T12:30:00Z"),
    },
  );

  assert.equal(result.schema_version, WRITING_EVIDENCE_SCHEMA_VERSION);
  assert.equal(result.target.resolution, "default-latest-single-commit-base-unresolved");
  assert.equal(result.commit_count, 1);
  assert.deepEqual(result.changed_files, ["M\tREADME.md"]);
  assert.match(result.patch_excerpt, /\[redacted-sensitive-line\]/);
  assert.doesNotMatch(result.patch_excerpt, /should-redact/);
  assert.equal(result.writing_contract.generation_passes, 1);
  assert.match(result.suggested_draft_path, /pr-devel-writing-202607282130\.md$/);
  assert.match(result.evidence_sha256, /^[0-9a-f]{64}$/);
});

test("PR prepare defaults to the complete branch range when two or more commits are ahead", async () => {
  const result = await prepareWritingEvidence(
    parseWritingPrepareArgs("pr", [], "/tmp/repository"),
    {
      git: multiCommitPrGit(),
      now: () => new Date("2026-08-04T00:30:00+09:00"),
    },
  );

  assert.equal(result.target.resolution, "default-branch-multi-commit-range");
  assert.equal(result.target.base, "origin/devel");
  assert.equal(result.target.base_source, "current branch upstream");
  assert.equal(result.target.base_commit, "a".repeat(40));
  assert.equal(result.target.ahead_commit_count, 2);
  assert.equal(result.target.recommit_recommended, true);
  assert.equal(result.target.single_commit, false);
  assert.equal(result.commit_count, 2);
  assert.deepEqual(result.commits.map((commit) => commit.subject), ["Second change", "First change"]);
  assert.deepEqual(result.changed_files, ["M\tsrc/main.mjs"]);
});

test("PR prepare keeps an exactly one-commit branch as a single-commit PR", async () => {
  const result = await prepareWritingEvidence(
    parseWritingPrepareArgs("pr", [], "/tmp/repository"),
    { git: singleCommitPrGit() },
  );

  assert.equal(result.target.resolution, "default-branch-single-commit");
  assert.equal(result.target.ahead_commit_count, 1);
  assert.equal(result.target.recommit_recommended, false);
  assert.equal(result.target.single_commit, true);
  assert.equal(result.commit_count, 1);
  assert.equal(result.commits[0].subject, "Only change");
});

test("PR prepare bounds a patch larger than the former 16 MiB Git buffer", async (t) => {
  const root = await repository(t);
  const content = "0123456789abcdef\n".repeat(1_100_000);
  assert.ok(Buffer.byteLength(content, "utf8") > 16 * 1024 * 1024);
  await writeFile(path.join(root, "large-diff.txt"), content, "utf8");
  git(root, "add", "large-diff.txt");
  git(root, "commit", "-m", "large diff");

  const result = await prepareWritingEvidence(
    parseWritingPrepareArgs("pr", ["--target", "HEAD^..HEAD"], root),
  );

  assert.equal(result.commit_count, 1);
  assert.deepEqual(result.changed_files, ["A\tlarge-diff.txt"]);
  assert.equal(result.patch_truncated, true);
  assert.match(result.patch_excerpt, /\[truncated\]\n$/);
});

test("Issue prepare retrieves exact existing labels through the fixed reader", async () => {
  const result = await prepareWritingEvidence(
    parseWritingPrepareArgs(
      "issue",
      ["--github-repo", "a/b"],
      "/tmp/repository",
    ),
    {
      git: fakeGit(),
      readFile: async () => {
        const error = new Error("missing");
        error.code = "ENOENT";
        throw error;
      },
      gh: (args) => ({
        ok: true,
        status: 0,
        stderr: "",
        stdout: JSON.stringify([
          { name: "enhancement", description: "New feature", color: "a2eeef" },
        ]),
        args,
      }),
      now: () => new Date("2026-07-28T12:30:00Z"),
    },
  );

  assert.equal(result.github_evidence.mode, "labels");
  assert.equal(result.github_evidence.labels[0].name, "enhancement");
  assert.equal(result.writing_contract.generation_passes, 1);
});
