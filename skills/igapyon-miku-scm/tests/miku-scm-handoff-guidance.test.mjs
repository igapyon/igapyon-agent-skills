import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { readNormalizedText } from "./miku-scm-test-text.mjs";

const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("handoff guidance requires a complete current review and exact approve", async () => {
  const [skill, approval] = await Promise.all([
    readNormalizedText(path.join(SKILL_ROOT, "SKILL.md")),
    readNormalizedText(path.join(SKILL_ROOT, "references", "approval-handoff.md")),
  ]);

  assert.match(skill, /github\.issue\.handoff\.review/);
  assert.match(skill, /exactly `approve` or `miku-scm approve`/);
  assert.match(skill, /Do not select from global pending/);
  assert.match(skill, /Safe resume is allowed only when the same conversation/);
  assert.doesNotMatch(skill, /legacy `miku-scm 承認` input remains accepted/);
  assert.match(approval, /Show the full review, including full text and metadata/);
  assert.match(approval, /message is approval only if its trimmed full text is exactly/);
  assert.match(approval, /--expected-review-sha256/);
  assert.match(approval, /selected records exclusively/);
  assert.match(approval, /reader compares the full title, body, state, labels, and comment URLs\/bodies/);
  assert.match(approval, /outcome is uncertain is never retried automatically/);
  assert.match(approval, /list\s+is a recovery summary and does not authorize an operation/);
  assert.match(approval, /changes only the local pending\nhandoff to `dismissed`/);
});
