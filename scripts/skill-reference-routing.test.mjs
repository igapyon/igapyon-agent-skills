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
    __PRODUCT_NAME__: "starter-fixture", __SKILL_TITLE__: "Starter fixture", __SKILL_DESCRIPTION__: "Run the fixture product workflows" };
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
  // Exercise the shipped npm entry point with enough files to expose concurrent
  // rebuilds of the same bundle directory.
  for (let i = 0; i < 400; i++) {
    fs.writeFileSync(path.join(root, "skills/starter-fixture/references", `fixture-${i}.md`), "# Fixture\n");
  }
  fs.mkdirSync(path.join(root, "tmp"));
  const environment = { ...process.env, TMPDIR: path.join(root, "tmp") };
  delete environment.NODE_TEST_CONTEXT;
  const result = spawnSync("npm", ["test"], {
    cwd: root, encoding: "utf8", env: environment,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /tests 2/, "both starter checks must actually execute");
  assert.equal(fs.existsSync(path.join(root, "bundle/starter-fixture-skills/skills/starter-fixture/index.json")), false);

  const metadata = JSON.parse(packageText);
  const runtimeRelative = "runtime/starter-fixture-0.0.0.mjs";
  metadata.skillRuntimeArtifacts = [runtimeRelative];
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify(metadata));
  const missing = spawnSync(process.execPath, ["scripts/build-skill-bundle.mjs"], {
    cwd: root, encoding: "utf8", env: environment,
  });
  assert.notEqual(missing.status, 0, "a declared missing runtime must block packaging");
  assert.match(missing.stdout + missing.stderr, /missing or empty required CLI artifact/);

  const runtimePath = path.join(root, "skills/starter-fixture", runtimeRelative);
  fs.mkdirSync(path.dirname(runtimePath), { recursive: true });
  fs.writeFileSync(runtimePath, "");
  const empty = spawnSync(process.execPath, ["scripts/build-skill-bundle.mjs"], {
    cwd: root, encoding: "utf8", env: environment,
  });
  assert.notEqual(empty.status, 0, "an empty declared runtime must block packaging");
  assert.match(empty.stdout + empty.stderr, /missing or empty required CLI artifact/);
  fs.writeFileSync(runtimePath, 'console.log("0.0.0");');

  metadata.skillRuntimeArtifacts = [runtimeRelative, "runtime/starter-fixture-0.0.0.jar"];
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify(metadata));
  const missingBackend = spawnSync(process.execPath, ["scripts/build-skill-bundle.mjs"], {
    cwd: root, encoding: "utf8", env: environment,
  });
  assert.notEqual(missingBackend.status, 0, "a missing declared Java backend must block packaging");
  assert.match(missingBackend.stdout + missingBackend.stderr, /runtime\/starter-fixture-0.0.0.jar/);

  metadata.skillRuntimeArtifacts = [runtimeRelative];
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify(metadata));
  fs.writeFileSync(runtimePath, [
    'import fs from "node:fs";',
    'import path from "node:path";',
    'import { fileURLToPath } from "node:url";',
    'const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");',
    'if (process.argv[2] === "--version") console.log("0.0.0");',
    'else if (process.argv[2] === "--count-lines") {',
    '  const input = fs.readFileSync(path.join(skillRoot, "references", "fixture-input.txt"), "utf8");',
    '  console.log(input.trimEnd().split(/\\r?\\n/).length);',
    '} else process.exit(2);',
    '',
  ].join("\n"));
  const fixtureInput = path.join(root, "skills/starter-fixture/references/fixture-input.txt");
  fs.mkdirSync(path.dirname(fixtureInput), { recursive: true });
  fs.writeFileSync(fixtureInput, "first\nsecond\n");
  const withRuntime = spawnSync("npm", ["test"], {cwd: root, encoding: "utf8", env: environment});
  assert.equal(withRuntime.status, 0, withRuntime.stdout + withRuntime.stderr);

  const zipPath = path.join(root, "bundle", "igapyon-starter-fixture-skills-0.0.0.zip");
  const extractedRoot = path.join(root, "extracted-release-zip");
  fs.mkdirSync(extractedRoot);
  const extracted = spawnSync("unzip", ["-q", zipPath, "-d", extractedRoot], {cwd: root, encoding: "utf8"});
  assert.equal(extracted.status, 0, extracted.stdout + extracted.stderr);
  const installedCli = path.join(extractedRoot, "skills", "starter-fixture", runtimeRelative);
  const operation = spawnSync(process.execPath, [installedCli, "--count-lines"], {cwd: extractedRoot, encoding: "utf8"});
  assert.equal(operation.status, 0, operation.stdout + operation.stderr);
  assert.equal(operation.stdout, "2\n");
  assert.equal(operation.stderr, "");
  // A present but broken CLI must fail the isolated installed-runtime check.
  fs.writeFileSync(runtimePath, "process.exit(7);\n");
  const broken = spawnSync(process.execPath, ["--test", "tests/isolated-bundle-smoke.test.mjs"], {
    cwd: root, encoding: "utf8", env: environment,
  });
  assert.notEqual(broken.status, 0, "a broken installed runtime must fail smoke verification");
});

test("starter release staging treats tag-derived versions as data", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-release-staging-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const workflow = fs.readFileSync(path.join(projectRoot,
    "skills/igapyon-miku-soft-developer/assets/agent-skills/.github/workflows/release-build.yml"), "utf8");
  assert.match(workflow, /name: Setup minimum supported Node\.js for artifact smoke\s+uses: actions\/setup-node@v6\s+with:\s+node-version: 22/);
  assert.match(workflow, /STAGED_ZIP: \$\{\{ steps\.prepare_zip\.outputs\.zip_path \}\}/);
  assert.match(workflow, /run: node scripts\/verify-release-zip\.mjs "\$STAGED_ZIP"/);
  const prepareStep = workflow.split("      - name: Prepare release zip\n")[1]
    .split("      - name: Setup minimum supported Node.js for artifact smoke")[0];
  const script = prepareStep.split("        run: |\n")[1].split("\n")
    .filter((line) => line.startsWith("          ")).map((line) => line.slice(10)).join("\n");
  fs.mkdirSync(path.join(root, "bundle"));
  fs.writeFileSync(path.join(root, "bundle/igapyon-__REPO_NAME__-0.5.0.zip"), "fixture zip bytes");
  function stage(version) {
    // Emulate Actions expression substitution if a template reintroduces it.
    const evaluated = script.replaceAll("${{ steps.release_version.outputs.package_version }}", "0.5.0")
      .replaceAll("${{ steps.release_version.outputs.version }}", version);
    return spawnSync("bash", ["-c", evaluated], {cwd: root, encoding: "utf8",
      env: {...process.env, PACKAGE_VERSION: "0.5.0", RELEASE_VERSION: version,
        GITHUB_OUTPUT: path.join(root, "step-output")}});
  }
  const normal = stage("0.5.0.2");
  assert.equal(normal.status, 0, normal.stdout + normal.stderr);
  assert.equal(fs.readFileSync(path.join(root, "release-assets/igapyon-__REPO_NAME__-0.5.0.2.zip"), "utf8"), "fixture zip bytes");
  const marker = path.join(root, "tag-executed");
  stage(`0.5.0.$(touch\u0024{IFS}${marker})`);
  assert.equal(fs.existsSync(marker), false, "tag-derived shell text must never execute");
});
