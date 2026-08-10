import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const SKILL_ROOT = new URL("../", import.meta.url);

test("known work titles are passed to work.commit instead of using the generic fallback", async () => {
  const skill = await readFile(new URL("SKILL.md", SKILL_ROOT), "utf8");

  assert.match(skill, /current user request or current TODO heading identifies the work, pass that\n   concise one-line title with `--message`/);
  assert.match(skill, /do not use the generic fallback/);
  assert.match(skill, /version-only change so the runner selects its deterministic version title/);
});

test("human output format remains a runner-global option before the workflow ID", async () => {
  const skill = await readFile(new URL("SKILL.md", SKILL_ROOT), "utf8");

  assert.match(
    skill,
    /miku-scm-run\.mjs --format human <workflow-id>\n   \[workflow options\]/,
  );
  assert.match(skill, /Never place `--format` after the workflow ID/);
});
