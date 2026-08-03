import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("current Issue status guidance reads Open Issues once by default", async () => {
  const skill = await readFile(path.join(SKILL_ROOT, "SKILL.md"), "utf8");

  assert.match(skill, /current Issue status, backlog, or progress request/);
  assert.match(skill, /github\.issue\.read --list.*default Open state/s);
  assert.match(skill, /Do not add a\n   second `--state all` read merely to calculate an Open\/Closed breakdown/);
  assert.match(skill, /only when the user explicitly needs\n   closed or historical Issues, completion metrics, or comparison with a\n   closed Issue/);
});
