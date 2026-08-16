import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { readNormalizedText } from "./miku-scm-test-text.mjs";

const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("handoff guidance requires human-selected full IDs or uniquely resolving suffixes for recovery", async () => {
  const [skill, approval] = await Promise.all([
    readNormalizedText(path.join(SKILL_ROOT, "SKILL.md")),
    readNormalizedText(path.join(SKILL_ROOT, "references", "approval-handoff.md")),
  ]);

  assert.match(skill, /miku-scm pending/);
  assert.match(skill, /miku-scm approve <selector>/);
  assert.match(skill, /miku-scm dismiss <selector>/);
  assert.match(skill, /12-character\n    approval suffix/);
  assert.match(skill, /Never choose, invent,\n    or reconstruct a selector/);
  assert.match(approval, /only against pending handoffs in the current repository and\nonly when exactly one record matches/);
  assert.match(approval, /must\nnever infer a selector from Issue content, order, recency, or intent/);
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
