import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { findDrafts } from "../scripts/pr-soft-reset-recommit-preflight.mjs";

test("PR draft resolution prefers pr-drafts over legacy root files", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "miku-scm-pr-draft-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const standard = path.join(root, "workplace", "miku-scm", "pr-drafts");
  const legacy = path.join(root, "workplace", "miku-scm");
  await mkdir(standard, { recursive: true });

  const branch = "devel-tiga0722qaa";
  const standardName = `pr-${branch}-202607220900.md`;
  const legacyName = `pr-${branch}-202607221000.md`;
  await writeFile(path.join(standard, standardName), "standard\n", "utf8");
  await writeFile(path.join(legacy, legacyName), "legacy\n", "utf8");

  const result = findDrafts(root, branch);
  assert.equal(result.slug, branch);
  assert.equal(result.drafts.length, 2);
  assert.equal(result.drafts[0].rel, `workplace/miku-scm/pr-drafts/${standardName}`);
  assert.equal(result.drafts[0].priority, 0);
  assert.equal(result.drafts[1].rel, `workplace/miku-scm/${legacyName}`);
  assert.equal(result.drafts[1].priority, 1);
});

test("PR draft resolution chooses the newest timestamp inside pr-drafts", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "miku-scm-pr-draft-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const standard = path.join(root, "workplace", "miku-scm", "pr-drafts");
  await mkdir(standard, { recursive: true });

  const branch = "devel-tiga0722qaa";
  const older = `pr-${branch}-202607220900.md`;
  const newer = `pr-${branch}-202607221000.md`;
  await writeFile(path.join(standard, older), "older\n", "utf8");
  await writeFile(path.join(standard, newer), "newer\n", "utf8");

  const result = findDrafts(root, branch);
  assert.equal(result.drafts[0].rel, `workplace/miku-scm/pr-drafts/${newer}`);
  assert.equal(result.drafts[1].rel, `workplace/miku-scm/pr-drafts/${older}`);
});
