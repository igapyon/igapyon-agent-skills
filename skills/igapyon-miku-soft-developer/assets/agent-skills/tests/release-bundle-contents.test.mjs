import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import test from "node:test";

const ROOT = process.cwd();
const repoName = "__REPO_NAME__";
const skillName = "__SKILL_NAME__";
const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(ROOT, "package.json"), "utf8")
);
const zipPath = path.resolve(ROOT, "bundle", "igapyon-" + repoName + "-" + packageJson.version + ".zip");
const verifierPath = path.resolve(ROOT, "scripts", "verify-release-zip.mjs");

test("release zip contains installable files and rejects missing required content", (context) => {
  execFileSync("npm", ["run", "build:bundle:zip"], {
    cwd: ROOT,
    encoding: "utf8"
  });

  assert.equal(fs.existsSync(zipPath), true);
  const entries = inspectReleaseZip(zipPath);
  execFileSync(process.execPath, [verifierPath, zipPath], { cwd: ROOT, encoding: "utf8" });

  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "skill-release-zip-"));
  context.after(() => fs.rmSync(scratch, { recursive: true, force: true }));
  const renamedZip = path.join(scratch, "release-assets-renamed.zip");
  fs.copyFileSync(zipPath, renamedZip);
  assert.deepEqual(inspectReleaseZip(renamedZip), entries);
  execFileSync(process.execPath, [verifierPath, renamedZip], { cwd: ROOT, encoding: "utf8" });

  const corruptedZip = path.join(scratch, "release-assets-corrupted.zip");
  fs.copyFileSync(zipPath, corruptedZip);
  const requiredEntry = packageJson.skillRuntimeArtifacts.length > 0
    ? "skills/" + skillName + "/" + packageJson.skillRuntimeArtifacts[0]
    : "skills/" + skillName + "/SKILL.md";
  execFileSync("zip", ["-d", corruptedZip, requiredEntry], { cwd: ROOT, encoding: "utf8" });
  assert.throws(() => inspectReleaseZip(corruptedZip), /missing zip entry/,
    "the checker must inspect the supplied archive instead of rebuilding a clean one");
  const corruptedSmoke = spawnSync(process.execPath, [verifierPath, corruptedZip], {
    cwd: ROOT,
    encoding: "utf8"
  });
  assert.notEqual(corruptedSmoke.status, 0, corruptedSmoke.stdout + corruptedSmoke.stderr);
  assert.match(corruptedSmoke.stderr, /missing zip entry|invalid release ZIP/);
});

function inspectReleaseZip(targetZipPath) {
  const entries = execFileSync("unzip", ["-Z1", targetZipPath], {
    cwd: ROOT,
    encoding: "utf8"
  }).trim().split(/\n/).filter(Boolean);

  assertIncludes(entries, "skills/" + skillName + "/SKILL.md");
  assertIncludes(entries, "skills/" + skillName + "/references/INDEX.md");
  for (const relative of packageJson.skillRuntimeArtifacts) {
    assertIncludes(entries, "skills/" + skillName + "/" + relative);
  }

  assert.equal(entries.some((entry) => entry.includes(".DS_Store")), false);
  assert.equal(entries.some((entry) => entry.startsWith("tests/")), false);
  assert.equal(entries.some((entry) => entry.startsWith("docs/")), false);
  assert.equal(entries.some((entry) => entry.startsWith("bundle/")), false);
  assert.equal(entries.some((entry) => entry.includes("node_modules/")), false);
  assert.equal(entries.some((entry) => entry.startsWith("workplace/")), false);
  return entries;
}

function assertIncludes(entries, expected) {
  assert.ok(entries.includes(expected), "missing zip entry: " + expected);
}
