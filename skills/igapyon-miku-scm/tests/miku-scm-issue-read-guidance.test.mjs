import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { readNormalizedText } from "./miku-scm-test-text.mjs";

const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("current Issue status guidance reads Open Issues once by default", async () => {
  const skill = await readNormalizedText(path.join(SKILL_ROOT, "SKILL.md"));

  assert.match(skill, /current Issue status, backlog, or progress request/);
  assert.match(skill, /github\.issue\.read --list.*default Open state/s);
  assert.match(skill, /Do not add a\n   second `--state all` read merely to calculate an Open\/Closed breakdown/);
  assert.match(skill, /only when the user explicitly needs\n   closed or historical Issues, completion metrics, or comparison with a\n   closed Issue/);
});
