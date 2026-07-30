import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  collectLocalSnapshot,
  parseLocalSnapshotArgs,
  parsePorcelainV2,
  parseWorktrees,
} from "../scripts/miku-scm-local-snapshot.mjs";

test("porcelain-v2 parser combines branch and dirty state", () => {
  const parsed = parsePorcelainV2([
    "# branch.oid abcdef",
    "# branch.head devel",
    "# branch.upstream origin/devel",
    "# branch.ab +2 -1",
    "1 M. N... 100644 100644 100644 a b file.txt",
    "1 .M N... 100644 100644 100644 a b other.txt",
    "? new.txt",
  ].join("\0"));
  assert.equal(parsed.head, "abcdef");
  assert.equal(parsed.branch, "devel");
  assert.equal(parsed.ahead, 2);
  assert.equal(parsed.behind, 1);
  assert.equal(parsed.staged, 1);
  assert.equal(parsed.unstaged, 1);
  assert.equal(parsed.untracked, 1);
  assert.equal(parsed.dirty, true);
});

test("worktree parser records branch ownership and detached worktrees", () => {
  const parsed = parseWorktrees([
    "worktree /repo",
    "HEAD abc",
    "branch refs/heads/devel",
    "",
    "worktree /tmp/other",
    "HEAD def",
    "detached",
    "",
  ].join("\n"));
  assert.equal(parsed[0].branch, "devel");
  assert.equal(parsed[1].detached, true);
});

test("snapshot uses three fixed Git reads and direct version reads", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "miku-scm-snapshot-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, "pom.xml"), "<project><version>1.2.3</version></project>\n", "utf8");
  const calls = [];
  const outputs = new Map([
    ["rev-parse --show-toplevel", `${root}\n`],
    ["status --porcelain=v2 --branch -z --untracked-files=normal",
      "# branch.oid abcdef\0# branch.head devel\0# branch.upstream origin/devel\0# branch.ab +0 -0\0"],
    ["worktree list --porcelain", `worktree ${root}\nHEAD abcdef\nbranch refs/heads/devel\n`],
  ]);
  const result = await collectLocalSnapshot(parseLocalSnapshotArgs(["--repo", root]), {
    now: () => new Date("2026-07-27T16:00:00Z"),
    git: (cwd, args) => {
      calls.push({ cwd, args });
      return outputs.get(args.join(" "));
    },
  });
  assert.equal(calls.length, 3);
  assert.equal(result.subprocess_count, 3);
  assert.equal(result.versions[0].value, "1.2.3");
  assert.equal(result.dirty, false);
  assert.match(result.identity_sha256, /^[0-9a-f]{64}$/);
  assert.ok(result.mutation_revalidation_fields.includes("head"));
});

test("snapshot arguments reject escaping version paths", () => {
  assert.throws(() => parseLocalSnapshotArgs(["--version-file", "../VERSION"]), /safe repository-relative/);
  assert.deepEqual(parseLocalSnapshotArgs(["--version-file", "VERSION.md"]).versionFiles, ["VERSION.md"]);
});
