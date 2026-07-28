import assert from "node:assert/strict";
import test from "node:test";

import {
  WRITING_EVIDENCE_SCHEMA_VERSION,
  parseWritingPrepareArgs,
  prepareWritingEvidence,
} from "../scripts/miku-scm-writing-prepare.mjs";

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
      [`diff --stat --no-renames ${"a".repeat(40)}..${"b".repeat(40)} --`, " README.md | 2 ++"],
      [`diff --name-status --no-renames ${"a".repeat(40)}..${"b".repeat(40)} --`, "M\tREADME.md"],
      [`diff --no-ext-diff --no-renames --unified=1 ${"a".repeat(40)}..${"b".repeat(40)} --`, "+token=should-redact\n+safe=true"],
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

test("PR prepare resolves the latest commit and returns bounded structured evidence", async () => {
  const result = await prepareWritingEvidence(
    parseWritingPrepareArgs("pr", [], "/tmp/repository"),
    {
      git: fakeGit(),
      now: () => new Date("2026-07-28T12:30:00Z"),
    },
  );

  assert.equal(result.schema_version, WRITING_EVIDENCE_SCHEMA_VERSION);
  assert.equal(result.target.resolution, "default-latest-single-commit");
  assert.equal(result.commit_count, 1);
  assert.deepEqual(result.changed_files, ["M\tREADME.md"]);
  assert.match(result.patch_excerpt, /\[redacted-sensitive-line\]/);
  assert.doesNotMatch(result.patch_excerpt, /should-redact/);
  assert.equal(result.writing_contract.generation_passes, 1);
  assert.match(result.suggested_draft_path, /pr-devel-writing-202607282130\.md$/);
  assert.match(result.evidence_sha256, /^[0-9a-f]{64}$/);
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
