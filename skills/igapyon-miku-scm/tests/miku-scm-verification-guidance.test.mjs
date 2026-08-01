import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function guidance(relative) {
  return readFile(path.join(SKILL_ROOT, relative), "utf8");
}

test("verification guidance scopes self-tests to miku-scm source maintenance", async () => {
  const [skill, suites, recommit, publication] = await Promise.all([
    guidance("SKILL.md"),
    guidance("references/runtime-and-test-suites.md"),
    guidance("references/github-pr-soft-reset-recommit.md"),
    guidance("references/github-post-recommit-publish.md"),
  ]);

  assert.match(skill, /Separate target-repository verification from miku-scm source verification/);
  assert.match(skill, /do not run miku-scm's own\nfast or full suite, or its workflow-contract drift check/);
  assert.match(skill, /When changing miku-scm itself/);
  assert.match(suites, /validate miku-scm while developing it from its\nsource repository/);
  assert.match(suites, /not completion checks for an ordinary miku-scm\noperation against another repository/);
  assert.match(recommit, /Do not\nrun miku-scm's source test suite or contract drift check merely because this\nworkflow completed/);
  assert.match(publication, /not a post-recommit or post-publication completion step for\na target repository/);
});
