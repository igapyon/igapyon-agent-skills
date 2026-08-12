import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  WRITING_EVIDENCE_SCHEMA_VERSION,
  canonicalGitHubRepository,
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

function issueGit(remoteUrl = "https://github.com/a/b.git") {
  const base = fakeGit();
  return (cwd, args, options = {}) => {
    if (args.join(" ") === "remote get-url origin") {
      return { ok: true, out: remoteUrl, err: "" };
    }
    return base(cwd, args, options);
  };
}

function issuePayload(body = "Current body") {
  return {
    number: 7,
    state: "OPEN",
    title: "Current title",
    body,
    url: "https://github.com/a/b/issues/7",
    updatedAt: "2026-07-25T00:00:00Z",
    labels: [{ name: "bug" }],
    comments: [{ body: "Clarification", author: { login: "reviewer" } }],
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
  assert.equal(WRITING_EVIDENCE_SCHEMA_VERSION, "miku-scm.writing-evidence/v2");
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
  assert.equal(
    parseWritingPrepareArgs("issue", ["--github-repo", "a/b"], "/tmp/repository")
      .issueOperation,
    "create",
  );
  assert.throws(
    () => parseWritingPrepareArgs(
      "issue",
      ["--github-repo", "a/b", "--operation", "create", "--issue", "7"],
      "/tmp/repository",
    ),
    /create does not accept --issue/,
  );
  for (const operation of ["update", "comment"]) {
    assert.throws(
      () => parseWritingPrepareArgs(
        "issue",
        ["--github-repo", "a/b", "--operation", operation],
        "/tmp/repository",
      ),
      new RegExp(`${operation} requires --issue`),
    );
  }
  assert.throws(
    () => parseWritingPrepareArgs(
      "issue",
      ["--github-repo", "a/b", "--operation", "close"],
      "/tmp/repository",
    ),
    /must be create, update, or comment/,
  );
  assert.throws(
    () => parseWritingPrepareArgs("pr", ["--operation", "create"], "/tmp/repository"),
    /only valid for writing.issue.prepare/,
  );
});

test("GitHub repository resolution accepts exact GitHub remote forms only", () => {
  assert.equal(canonicalGitHubRepository("https://github.com/a/b.git"), "a/b");
  assert.equal(canonicalGitHubRepository("git@github.com:a/b.git"), "a/b");
  assert.equal(canonicalGitHubRepository("ssh://git@github.com/a/b.git"), "a/b");
  assert.equal(canonicalGitHubRepository("https://example.com/a/b.git"), null);
  assert.equal(canonicalGitHubRepository("https://github.com/a/b/extra"), null);
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
          { name: "long", description: "x".repeat(600), color: "ffffff" },
          { name: "private", description: "token=must-not-leak", color: "000000" },
        ]),
        args,
      }),
      now: () => new Date("2026-07-28T12:30:00Z"),
    },
  );

  assert.equal(result.github_evidence.mode, "labels");
  assert.equal(result.github_evidence.labels[0].name, "enhancement");
  assert.equal(result.github_evidence.labels[1].description_truncated, true);
  assert.doesNotMatch(result.github_evidence.labels[2].description, /must-not-leak/);
  assert.equal(result.github_evidence_truncated, true);
  assert.equal(result.writing_contract.generation_passes, 1);
  assert.equal(result.issue_operation, "create");
  assert.equal(result.github_repository_source, "explicit");
  assert.equal(
    result.suggested_draft_path,
    "workplace/miku-scm/new-issues/issue-new-202607282130.md",
  );
  assert.deepEqual(result.next_preflight, {
    workflow: "github.issue.create.preflight",
    repository: "a/b",
    issue: null,
    draft: "workplace/miku-scm/new-issues/issue-new-202607282130.md",
    reviewed_optional_flags: ["--label", "--parent"],
  });
});

test("Issue update resolves GitHub origin and prepares one fixed update handoff route", async () => {
  const calls = [];
  const result = await prepareWritingEvidence(
    parseWritingPrepareArgs(
      "issue",
      ["--operation", "update", "--issue", "7"],
      "/tmp/repository",
    ),
    {
      git: issueGit(),
      readFile: async () => {
        const error = new Error("missing");
        error.code = "ENOENT";
        throw error;
      },
      gh: (args) => {
        calls.push(args);
        const stdout = args[0] === "issue"
          ? JSON.stringify(issuePayload())
          : JSON.stringify([{ name: "enhancement", description: "Improvement", color: "a2eeef" }]);
        return { ok: true, status: 0, stderr: "", stdout, args };
      },
      now: () => new Date("2026-07-28T12:30:00Z"),
    },
  );

  assert.equal(result.github_repository, "a/b");
  assert.equal(result.github_repository_source, "origin");
  assert.equal(result.issue_operation, "update");
  assert.equal(result.github_evidence.issue.number, 7);
  assert.equal(result.github_evidence.repository_labels[0].name, "enhancement");
  assert.equal(calls.length, 2);
  assert.equal(
    result.suggested_draft_path,
    "workplace/miku-scm/issue-updates/issue-7-update-202607282130.md",
  );
  assert.equal(result.next_preflight.workflow, "github.issue.update.preflight");
  assert.deepEqual(result.next_preflight.reviewed_optional_flags, ["--add-label", "--remove-label"]);
  assert.match(result.writing_contract.output, /proposed Issue title/);
});

test("Issue comment uses body-only writing and bounds remote prose", async () => {
  const secret = "token=must-not-leak";
  const body = `${secret}\n${"x".repeat(50_000)}`;
  const result = await prepareWritingEvidence(
    parseWritingPrepareArgs(
      "issue",
      ["--github-repo", "a/b", "--operation", "comment", "--issue", "7"],
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
        stdout: JSON.stringify(issuePayload(body)),
        args,
      }),
      now: () => new Date("2026-07-28T12:30:00Z"),
    },
  );

  assert.equal(result.issue_operation, "comment");
  assert.equal(result.github_evidence.issue.body_truncated, true);
  assert.equal(result.github_evidence_truncated, true);
  assert.doesNotMatch(result.github_evidence.issue.body, /must-not-leak/);
  assert.match(result.writing_contract.output, /without a title line/);
  assert.equal(
    result.suggested_draft_path,
    "workplace/miku-scm/issue-comments/issue-7-comment-202607282130.md",
  );
  assert.deepEqual(result.next_preflight, {
    workflow: "github.issue.comment.preflight",
    repository: "a/b",
    issue: 7,
    draft: "workplace/miku-scm/issue-comments/issue-7-comment-202607282130.md",
    reviewed_optional_flags: [],
  });
});

test("Issue repository fallback stops before GitHub access for a non-GitHub origin", async () => {
  let ghInvoked = false;
  await assert.rejects(
    prepareWritingEvidence(
      parseWritingPrepareArgs("issue", ["--operation", "create"], "/tmp/repository"),
      {
        git: issueGit("https://example.com/a/b.git"),
        readFile: async () => {
          const error = new Error("missing");
          error.code = "ENOENT";
          throw error;
        },
        gh: () => { ghInvoked = true; },
      },
    ),
    /GitHub repository is unresolved/,
  );
  assert.equal(ghInvoked, false);
});
