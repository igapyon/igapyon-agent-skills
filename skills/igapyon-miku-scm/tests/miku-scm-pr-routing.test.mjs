import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { WORKFLOW_MANIFEST } from "../scripts/miku-scm-workflow-manifest.mjs";

const SKILL_ROOT = new URL("../", import.meta.url);

async function skillText(relative) {
  return readFile(new URL(relative, SKILL_ROOT), "utf8");
}

test("bare recommit implicitly enters PR writing before the rewrite approval gate", async () => {
  const [skill, recommit, prWriting] = await Promise.all([
    skillText("SKILL.md"),
    skillText("references/github-pr-soft-reset-recommit.md"),
    skillText("references/github-pr-writing.md"),
  ]);

  assert.match(skill, /bare `recommit` request as the PR Soft Reset Recommit workflow with\n   an implicit PR-writing request/);
  assert.match(skill, /explicitly says `recommit` to invoke the miku-soft PR soft-reset recommit flow with implicit PR drafting/);
  assert.match(skill, /This routing authorizes preparation only; preserve the explicit\n   approval gate/);
  assert.match(recommit, /bare `recommit` request implicitly includes PR writing/);
  assert.match(recommit, /Do not stop merely to ask the user to request PR writing separately/);
  assert.match(prWriting, /bare `recommit` request implicitly requests PR writing/);
});

test("untargeted PRs prefer the complete branch range at two or more commits", async () => {
  const [writingMode, writingRules, prWriting] = await Promise.all([
    skillText("references/writing-mode.md"),
    skillText("references/github-writing-rules.md"),
    skillText("references/github-pr-writing.md"),
  ]);

  assert.match(writingMode, /branch is two or more commits ahead of that base/);
  assert.match(writingRules, /When `<base>\.\.HEAD` contains two or more commits, use the complete range/);
  assert.match(prWriting, /When the branch is two or more commits ahead, use the complete `<base>\.\.HEAD` range/);
});

test("workflow manifest routes bare recommit to preflight and keeps PR target optional", () => {
  const byId = new Map(WORKFLOW_MANIFEST.map((workflow) => [workflow.id, workflow]));
  const recommit = byId.get("pr.recommit.preflight");
  const writing = byId.get("writing.pr.prepare");

  assert.ok(recommit.triggers.includes("recommit"));
  assert.deepEqual(writing.required_parameters, ["repository"]);
  assert.ok(writing.triggers.includes("recommit向けPR文面準備"));
});
