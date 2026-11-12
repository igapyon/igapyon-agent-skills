import assert from "node:assert/strict";
import test from "node:test";

import { readNormalizedText } from "./miku-scm-test-text.mjs";

const SKILL_ROOT = new URL("../", import.meta.url);

async function text(relative) {
  return readNormalizedText(new URL(relative, SKILL_ROOT));
}

test("known work titles are passed to work.commit instead of using the generic fallback", async () => {
  const [skill, workCommit] = await Promise.all([text("SKILL.md"), text("references/work-commit.md")]);

  assert.match(skill, /uses the current request\/TODO as a concise commit\n  title when available/);
  assert.match(workCommit, /generic fallback is allowed only when no concrete task title is available/);
  assert.match(workCommit, /a version-only change uses the deterministic version-specific title/);
});

test("human output format remains a runner-global option before the workflow ID", async () => {
  const skill = await text("SKILL.md");

  assert.match(
    skill,
    /miku-scm-run\.mjs --format <json\|human>\n<workflow-id> <fixed-options>/,
  );
  assert.match(skill, /`--format` is global and must precede the ID/);
});
