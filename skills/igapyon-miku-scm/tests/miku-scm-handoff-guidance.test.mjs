import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("handoff guidance requires exact human-selected IDs for recovery", async () => {
  const [skill, approval] = await Promise.all([
    readFile(path.join(SKILL_ROOT, "SKILL.md"), "utf8"),
    readFile(path.join(SKILL_ROOT, "references", "approval-handoff.md"), "utf8"),
  ]);

  assert.match(skill, /miku-scm pending/);
  assert.match(skill, /miku-scm approve <id>/);
  assert.match(skill, /miku-scm dismiss <id>/);
  assert.match(skill, /miku-scm approve batch <id> <id> \[\.\.\.\]/);
  assert.match(skill, /Never choose,\n    abbreviate, or reconstruct the ID/);
  assert.match(approval, /must never infer the ID from Issue\ncontent, order, recency, or intent/);
  assert.match(approval, /Dismissal changes only the local approval handoff record/);
  assert.match(approval, /applies one handoff at a\ntime in the supplied order/);
  assert.match(approval, /later selected handoff mutates the same existing Issue/);
  assert.match(approval, /without creating\nanother approval handoff/);
  assert.match(approval, /current-body SHA-256 only after an earlier content update/);
  assert.match(approval, /workflow\ncontract digest, and all other options must remain equivalent/);
  assert.match(approval, /changes it to `conflict`/);
  assert.match(approval, /READONLY failure records the later handoff as\n`not-applied`, not `conflict`/);
  assert.match(approval, /stops\nthe batch before all later handoffs/);
});
