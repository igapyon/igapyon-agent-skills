import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { readNormalizedText } from "./miku-scm-test-text.mjs";

const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("current Issue status guidance reads Open Issues once by default", async () => {
  const [skill, helper] = await Promise.all([
    readNormalizedText(path.join(SKILL_ROOT, "SKILL.md")),
    readNormalizedText(path.join(SKILL_ROOT, "scripts", "github-issue-read.mjs")),
  ]);

  assert.match(skill, /For current Issue status, read the default Open set once/);
  assert.match(skill, /Read closed\/all only\n  when explicitly needed for history or completion metrics/);
  assert.match(helper, /--list\s+List Issues \(default state: open\)/);
});
