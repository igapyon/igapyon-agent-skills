import assert from "node:assert/strict";
import test from "node:test";

import { WORKFLOW_MANIFEST } from "../scripts/miku-scm-workflow-manifest.mjs";
import { readNormalizedText } from "./miku-scm-test-text.mjs";

const SKILL_ROOT = new URL("../", import.meta.url);

async function skillText(relative) {
  return readNormalizedText(new URL(relative, SKILL_ROOT));
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

test("exact recommit push writes only for the sole missing-draft blocker then applies once", async () => {
  const [skill, recommitPush, writingMode] = await Promise.all([
    skillText("SKILL.md"),
    skillText("references/github-pr-recommit-push.md"),
    skillText("references/writing-mode.md"),
  ]);

  assert.match(skill, /one READONLY `pr\.recommit\.preflight`/);
  assert.match(skill, /any blocker other than\n   `PR draft is unresolved or missing`/);
  assert.match(skill, /`writing\.pr\.prepare --target <resolved-base>\.\.HEAD` once/);
  assert.match(skill, /returned `suggested_draft_path`/);
  assert.match(skill, /same user turn/);
  assert.match(skill, /Do not route bare `recommit` or\n   `pr recommit` to it/);
  assert.match(recommitPush, /Any other preflight\n+blocker stops the entire route before writing, backup, reset, or push/);
  assert.match(writingMode, /exact `miku-scm pr recommit push` request/);
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
