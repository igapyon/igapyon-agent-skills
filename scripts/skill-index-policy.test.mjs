import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  assertInternalIndexFiles,
  assertIndexPresence,
  projectRoot,
  readExternalSkillPins,
  readSkillIndexPolicy,
  validateSkillIndexPolicy,
} from "./skill-index-policy.mjs";

test("declared internal index policy matches all current external pins", () => {
  const policy = readSkillIndexPolicy(projectRoot);
  assert.equal(policy.schemaVersion, 1);
  assert.deepEqual(policy.internal.map((entry) => entry.skill), ["igapyon-qiita-writer"]);
  assert.equal(policy.external.length, readExternalSkillPins(projectRoot).length);
});

test("external pin changes require a matching policy entry", () => {
  const policy = structuredClone(readSkillIndexPolicy(projectRoot));
  policy.external[0].ref = "v0.0.0";
  assert.throws(() => validateSkillIndexPolicy(policy, {
    root: projectRoot,
    externalSkills: readExternalSkillPins(projectRoot),
  }), /repo\/ref does not match pom.xml pin/);
});

test("undeclared internal root indexes are rejected", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-index-policy-"));
  try {
    fs.mkdirSync(path.join(root, "skills", "sample-skill"), { recursive: true });
    fs.writeFileSync(path.join(root, "skills", "sample-skill", "SKILL.md"), "---\nname: sample-skill\n---\n");
    fs.writeFileSync(path.join(root, "skills", "sample-skill", "index.json"), "{}");
    assert.throws(() => assertInternalIndexFiles(root, { internal: [] }), /exists but is not declared as adopted/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("adopted internal indexes must exist after generation", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-index-policy-"));
  try {
    fs.mkdirSync(path.join(root, "skills", "sample-skill"), { recursive: true });
    fs.writeFileSync(path.join(root, "skills", "sample-skill", "SKILL.md"), "---\nname: sample-skill\n---\n");
    const policy = { internal: [{ skill: "sample-skill" }] };
    assert.throws(() => assertInternalIndexFiles(root, policy), /is adopted but missing/);
    assert.deepEqual([...assertInternalIndexFiles(root, policy, { allowMissingRetained: true })], ["sample-skill"]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("archive index presence follows the declared adoption state", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-index-archive-"));
  try {
    fs.mkdirSync(path.join(root, "without-index"));
    fs.mkdirSync(path.join(root, "with-index"));
    fs.writeFileSync(path.join(root, "with-index", "index.json"), "{}");
    assert.equal(assertIndexPresence("without-index", path.join(root, "without-index"), false), false);
    assert.equal(assertIndexPresence("with-index", path.join(root, "with-index"), true), true);
    assert.throws(() => assertIndexPresence("missing-adopted", path.join(root, "without-index"), true), /adopted but missing/);
    assert.throws(() => assertIndexPresence("unexpected", path.join(root, "with-index"), false), /not declared as adopted/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
