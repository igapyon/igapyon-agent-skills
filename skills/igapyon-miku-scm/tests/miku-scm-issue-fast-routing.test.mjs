import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const SKILL_ROOT = new URL("../", import.meta.url);

async function skillText(relative) {
  return readFile(new URL(relative, SKILL_ROOT), "utf8");
}

test("MFWA terminology names the architecture and its contract bundle", async () => {
  const [skill, design, runner] = await Promise.all([
    skillText("SKILL.md"),
    skillText("docs/miku-fixed-workflow-architecture.md"),
    skillText("references/deterministic-workflow-runner.md"),
  ]);

  for (const content of [skill, design, runner]) {
    assert.match(content, /Miku Fixed Workflow Architecture/);
  }
  assert.match(design, /Miku Fixed Workflow Architecture（MFWA）/);
  assert.match(design, /Miku Fixed Workflow/);
  assert.match(design, /Miku Fixed Runner/);
  assert.match(design, /Miku Workflow Contract Bundle/);
  assert.match(design, /Miku Approval Handoff/);
});

test("Issue writing routes prepare, one draft, and preflight in the same turn", async () => {
  const [skill, writing, handoff] = await Promise.all([
    skillText("SKILL.md"),
    skillText("references/writing-mode.md"),
    skillText("references/github-issue-rewrite-handoff.md"),
  ]);

  assert.match(skill, /`miku-scm issue create`/);
  assert.match(skill, /`miku-scm issue update <number>`/);
  assert.match(skill, /`miku-scm issue comment <number>`/);
  assert.match(skill, /Draft exactly once/);
  assert.match(skill, /`next_preflight\.workflow`/);
  assert.match(skill, /same user turn/);
  assert.match(skill, /Writing and preflight do not authorize mutation/);
  assert.match(writing, /`--operation create` is the compatibility/);
  assert.match(writing, /`update` and `comment` require one exact Issue/);
  assert.match(writing, /`next_preflight` descriptor/);
  assert.match(handoff, /same-turn preparation through the matching preflight/);
});

test("Issue label and close skip writing but retain approval handoff", async () => {
  const skill = await skillText("SKILL.md");

  assert.match(skill, /`miku-scm issue label <number>`/);
  assert.match(skill, /`miku-scm issue close <number>`/);
  assert.match(skill, /directly to their fixed preflight/);
  assert.match(skill, /do not invoke Writing mode/);
  assert.match(skill, /approval-handoff commands in items 10–12/);
});
