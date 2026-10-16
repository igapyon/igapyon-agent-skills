import assert from "node:assert/strict";
import test from "node:test";

import { readNormalizedText } from "./miku-scm-test-text.mjs";

const SKILL_ROOT = new URL("../", import.meta.url);

async function skillText() {
  return readNormalizedText(new URL("SKILL.md", SKILL_ROOT));
}

test("known work titles are passed to work.commit instead of using the generic fallback", async () => {
  const skill = await skillText();

  assert.match(skill, /current user request or current TODO heading identifies the work, pass that\n   concise one-line title with `--message`/);
  assert.match(skill, /do not use the generic fallback/);
  assert.match(skill, /version-only change so the runner selects its deterministic version title/);
});

test("human output format remains a runner-global option before the workflow ID", async () => {
  const skill = await skillText();

  assert.match(
    skill,
    /miku-scm-run\.mjs --format human <workflow-id>\n   \[workflow options\]/,
  );
  assert.match(skill, /Never place `--format` after the workflow ID/);
});
