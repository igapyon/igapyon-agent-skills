import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { projectRoot } from "./skill-index-policy.mjs";
import { assertRepresentativeRoutes, representativeRoutes } from "./skill-reference-routes.mjs";

// These check source reachability in an isolated install, not model behavior,
// article-selection quality, or token/time improvements.
for (const [skill, task, expected] of representativeRoutes) {
  test(`${skill}: index-free isolated routing for ${task}`, (context) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-reference-route-"));
    context.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const installed = path.join(root, skill);
    fs.cpSync(path.join(projectRoot, "skills", skill), installed, { recursive: true });
    assert.equal(fs.existsSync(path.join(installed, "index.json")), false);
    const reached = assertRepresentativeRoutes({ skillName: skill, skillDir: installed });
    assert.deepEqual(reached, { checked: true, targetCount: expected.length });
    for (const target of expected) {
      assert.ok(fs.existsSync(path.join(installed, target)), `required source is missing: ${target}`);
      assert.ok(fs.statSync(path.join(installed, target)).size > 0, `required source is empty: ${target}`);
    }
  });
}

test("an instantiated index-free starter passes the bundled release and install tests", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-index-free-starter-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const starter = path.join(projectRoot, "skills/igapyon-miku-soft-developer/assets/agent-skills");
  const replacements = { __REPO_NAME__: "starter-fixture-skills", __SKILL_NAME__: "starter-fixture", __VERSION__: "0.0.0",
    __PRODUCT_NAME__: "starter-fixture", __SKILL_TITLE__: "Starter fixture", __SKILL_DESCRIPTION__: "A fixture skill" };
  function materialize(source, destination) {
    fs.mkdirSync(destination, { recursive: true });
    for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
      const sourcePath = path.join(source, entry.name), target = path.join(destination, entry.name.replace(/\.template$/, ""));
      if (entry.isDirectory()) materialize(sourcePath, target);
      else {
        let content = fs.readFileSync(sourcePath, "utf8");
        for (const [token, value] of Object.entries(replacements)) content = content.replaceAll(token, value);
        fs.writeFileSync(target, content);
      }
    }
  }
  for (const directory of ["scripts", "tests"]) materialize(path.join(starter, directory), path.join(root, directory));
  materialize(path.join(starter, "templates/skill"), path.join(root, "skills/starter-fixture"));
  let packageText = fs.readFileSync(path.join(starter, "package.json"), "utf8");
  for (const [token, value] of Object.entries(replacements)) packageText = packageText.replaceAll(token, value);
  fs.writeFileSync(path.join(root, "package.json"), packageText);
  fs.mkdirSync(path.join(root, "tmp"));
  const environment = { ...process.env, TMPDIR: path.join(root, "tmp") };
  delete environment.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, ["--test", "--test-concurrency=1", "tests/release-bundle-contents.test.mjs", "tests/isolated-bundle-smoke.test.mjs"], {
    cwd: root, encoding: "utf8", env: environment,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /tests 2/, "both starter checks must actually execute");
  assert.equal(fs.existsSync(path.join(root, "bundle/starter-fixture-skills/skills/starter-fixture/index.json")), false);
});
