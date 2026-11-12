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

  assert.match(skill, /\| bare `recommit` \| PR text drafting and preflight; keep the local history rewrite gate \|/);
  assert.match(skill, /explicitly says `recommit` or `draft recommit push` to invoke the miku-soft PR-text drafting/);
  assert.match(skill, /It does not by itself authorize the local history rewrite/);
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

  assert.match(recommitPush, /one\s+READONLY recommit preflight first/);
  assert.match(recommitPush, /When the missing draft is the only blocker/);
  assert.match(recommitPush, /exactly `<resolved-base>\.\.HEAD`/);
  assert.match(recommitPush, /saves the returned `suggested_draft_path`, and immediately runs/);
  assert.match(skill, /Exact `draft recommit push`[\s\S]*?runs the fixed preflight/);
  assert.match(skill, /Bare `recommit` means PR writing and preflight/);
  assert.match(recommitPush, /Any other preflight\n+blocker stops the entire route before writing, backup, reset, or push/);
  assert.match(writingMode, /exact `miku-scm draft recommit push` request/);
  assert.match(writingMode, /older `miku-scm pr recommit push` spelling is a/);
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
  const recommitPush = byId.get("pr.recommit.push");
  const writing = byId.get("writing.pr.prepare");

  assert.ok(recommit.triggers.includes("recommit"));
  assert.ok(recommitPush.triggers.includes("miku-scm draft recommit push"));
  assert.ok(recommitPush.triggers.includes("draft recommit push"));
  assert.ok(recommitPush.triggers.includes("miku-scm pr recommit push"));
  assert.deepEqual(writing.required_parameters, ["repository"]);
  assert.ok(writing.triggers.includes("recommit向けPR文面準備"));
});
