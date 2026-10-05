#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const allowedRootFiles = new Set([
  "skills",
  "README.md",
  "INSTALL.md",
  "LICENSE",
  "EXTERNAL_SKILLS.lock",
]);
const forbiddenPathParts = new Set([".DS_Store", "node_modules", ".git"]);

function fail(message) {
  throw new Error(message);
}

function runUnzip(args, cwd = projectRoot) {
  const result = spawnSync("unzip", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error) {
    fail("Could not run unzip: " + result.error.message);
  }
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim();
    fail("unzip " + args[0] + " failed" + (detail ? ": " + detail : ""));
  }
  return result.stdout || "";
}

function readProjectMetadata() {
  const pom = fs.readFileSync(path.join(projectRoot, "pom.xml"), "utf8");
  const propertiesStart = pom.indexOf("<properties>");
  const projectHeader = propertiesStart >= 0 ? pom.slice(0, propertiesStart) : pom;
  const artifactId = projectHeader.match(/<artifactId>\s*([^<]+)\s*<\/artifactId>/)?.[1]?.trim();
  const version = projectHeader.match(/<version>\s*([^<]+)\s*<\/version>/)?.[1]?.trim();
  if (!artifactId || !version) {
    fail("Could not read project artifactId/version from pom.xml");
  }

  const externalById = new Map();
  const externalProperty = /<external\.([A-Za-z0-9-]+)\.(repo|ref|skillName)>([^<]*)<\/external\.[^>]+>/g;
  for (const match of pom.matchAll(externalProperty)) {
    const [, id, field, rawValue] = match;
    const values = externalById.get(id) ?? {};
    if (Object.hasOwn(values, field)) {
      fail("Duplicate external property: " + id + "." + field);
    }
    values[field] = rawValue.trim();
    externalById.set(id, values);
  }

  const externalSkills = [];
  for (const [id, values] of externalById) {
    if (!values.repo || !values.ref || !values.skillName) {
      fail("Incomplete external skill properties for " + id);
    }
    externalSkills.push({
      repo: values.repo,
      ref: values.ref,
      skillName: values.skillName,
    });
  }
  if (externalSkills.length === 0) {
    fail("No external skills are configured in pom.xml");
  }

  return { artifactId, version, externalSkills };
}

function listInternalSkills() {
  const skillsRoot = path.join(projectRoot, "skills");
  return fs.readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) =>
      entry.isDirectory() &&
      fs.existsSync(path.join(skillsRoot, entry.name, "SKILL.md"))
    )
    .map((entry) => entry.name)
    .sort();
}

function validateExternalLock(lockText, expectedExternal) {
  const actualLines = lockText.split(/\r?\n/).filter((line) => line.length > 0);
  const actualKeys = new Set();
  const problems = [];
  for (const line of actualLines) {
    const fields = line.split("\t");
    if (fields.length !== 3 || fields.some((field) => field.length === 0)) {
      problems.push("Malformed EXTERNAL_SKILLS.lock row: " + line);
      continue;
    }
    if (actualKeys.has(line)) {
      problems.push("Duplicate EXTERNAL_SKILLS.lock row: " + line);
    }
    actualKeys.add(line);
  }

  const expectedLines = expectedExternal.map(({ repo, ref, skillName }) =>
    [repo, ref, skillName].join("\t")
  );
  const expectedKeys = new Set(expectedLines);
  for (const line of expectedLines) {
    if (!actualKeys.has(line)) {
      problems.push("Missing EXTERNAL_SKILLS.lock row: " + line);
    }
  }
  for (const line of actualKeys) {
    if (!expectedKeys.has(line)) {
      problems.push("Unexpected EXTERNAL_SKILLS.lock row: " + line);
    }
  }
  if (problems.length > 0) {
    fail(problems.join("\n"));
  }
}

function validateIndex(skillName, skillDir) {
  const indexPath = path.join(skillDir, "index.json");
  let index;
  try {
    index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  } catch (error) {
    fail(skillName + "/index.json is not valid JSON: " + error.message);
  }
  if (!index || typeof index !== "object" || !Array.isArray(index.files)) {
    fail(skillName + "/index.json must contain a files array");
  }

  const basePath = typeof index.basePath === "string" ? index.basePath : ".";
  const realSkillDir = fs.realpathSync(skillDir);
  for (const entry of index.files) {
    if (!entry || typeof entry.path !== "string" || entry.path.length === 0) {
      fail(skillName + "/index.json contains a file entry without a path");
    }
    const resolved = path.resolve(skillDir, basePath, entry.path);
    const relative = path.relative(skillDir, resolved);
    if (relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative)) {
      fail(skillName + "/index.json path escapes the skill directory: " + entry.path);
    }
    let realPath;
    try {
      realPath = fs.realpathSync(resolved);
    } catch {
      fail(skillName + "/index.json points to a missing file: " + entry.path);
    }
    const realRelative = path.relative(realSkillDir, realPath);
    if (realRelative === ".." || realRelative.startsWith(".." + path.sep) || path.isAbsolute(realRelative)) {
      fail(skillName + "/index.json path resolves outside the skill directory: " + entry.path);
    }
    if (!fs.statSync(realPath).isFile()) {
      fail(skillName + "/index.json path is not a file: " + entry.path);
    }
  }
}

function validateSkill(skillName, skillRoot) {
  const skillDir = path.join(skillRoot, skillName);
  const skillFile = path.join(skillDir, "SKILL.md");
  const indexFile = path.join(skillDir, "index.json");
  for (const required of [skillFile, indexFile]) {
    if (!fs.existsSync(required) || !fs.statSync(required).isFile()) {
      fail(skillName + " is missing " + path.basename(required));
    }
  }

  const skillText = fs.readFileSync(skillFile, "utf8");
  const frontMatter = skillText.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  const nameLine = frontMatter?.[1]?.match(/^name:\s*["']?([a-z0-9-]+)["']?\s*$/m);
  if (!nameLine || nameLine[1] !== skillName) {
    fail(skillName + "/SKILL.md name does not match its directory");
  }
  validateIndex(skillName, skillDir);
}

function validateArchive(archivePath) {
  const { artifactId, version, externalSkills } = readProjectMetadata();
  const expectedRoot = artifactId + "-" + version;
  const listing = runUnzip(["-Z1", archivePath]);
  const entries = listing.split(/\r?\n/).filter((entry) => entry.length > 0);
  if (entries.length === 0) {
    fail("ZIP archive is empty");
  }

  const duplicateEntries = new Set();
  const roots = new Set();
  const rootChildren = new Set();
  const archiveSkillNames = new Set();
  const forbiddenEntries = [];
  for (const entry of entries) {
    if (entry.startsWith("/") || entry.includes("\\")) {
      fail("Unsafe ZIP entry path: " + entry);
    }
    const parts = entry.split("/");
    while (parts.at(-1) === "") parts.pop();
    if (parts.length === 0 || parts.some((part) => part === "." || part === "..")) {
      fail("Unsafe ZIP entry path: " + entry);
    }
    roots.add(parts[0]);
    if (parts[0] !== expectedRoot) {
      fail("Unexpected ZIP root path: " + parts[0]);
    }
    if (parts.length > 1) {
      rootChildren.add(parts[1]);
    }
    if (parts[0] === expectedRoot && parts[1] === "skills" && parts.length >= 3) {
      archiveSkillNames.add(parts[2]);
    }
    if (parts.some((part) => forbiddenPathParts.has(part))) {
      forbiddenEntries.push(entry);
    }
    if (duplicateEntries.has(entry)) {
      fail("Duplicate ZIP entry: " + entry);
    }
    duplicateEntries.add(entry);
  }
  if (roots.size !== 1 || !roots.has(expectedRoot)) {
    fail("ZIP must contain exactly one root directory named " + expectedRoot);
  }
  if (forbiddenEntries.length > 0) {
    fail("Forbidden files or directories are present:\n" + forbiddenEntries.join("\n"));
  }

  const actualRootChildren = [...rootChildren].sort();
  const expectedRootChildren = [...allowedRootFiles].sort();
  if (actualRootChildren.join("\n") !== expectedRootChildren.join("\n")) {
    fail(
      "Unexpected root contents. Expected: " + expectedRootChildren.join(", ") +
      "; found: " + actualRootChildren.join(", ")
    );
  }

  const internalSkills = listInternalSkills();
  const internalNames = new Set(internalSkills);
  const externalNames = new Set();
  const expectedNames = new Set(internalSkills);
  const problems = [];
  for (const external of externalSkills) {
    if (internalNames.has(external.skillName) || externalNames.has(external.skillName)) {
      problems.push("Duplicate configured skill name: " + external.skillName);
    }
    externalNames.add(external.skillName);
    expectedNames.add(external.skillName);
  }
  for (const skillName of expectedNames) {
    if (!archiveSkillNames.has(skillName)) {
      problems.push("Missing skill directory: " + skillName);
    }
  }
  for (const skillName of archiveSkillNames) {
    if (!expectedNames.has(skillName)) {
      problems.push("Unexpected skill directory: " + skillName);
    }
  }
  if (problems.length > 0) {
    fail(problems.join("\n"));
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "check-release-archive-"));
  try {
    runUnzip(["-q", archivePath, "-d", tempDir]);
    const archiveRoot = path.join(tempDir, expectedRoot);
    for (const requiredFile of ["README.md", "INSTALL.md", "LICENSE", "EXTERNAL_SKILLS.lock"]) {
      const requiredPath = path.join(archiveRoot, requiredFile);
      if (!fs.existsSync(requiredPath) || !fs.statSync(requiredPath).isFile()) {
        fail("Release root is missing required file: " + requiredFile);
      }
    }
    const skillRoot = path.join(archiveRoot, "skills");
    if (!fs.existsSync(skillRoot) || !fs.statSync(skillRoot).isDirectory()) {
      fail("Release root is missing skills directory");
    }
    const lockPath = path.join(archiveRoot, "EXTERNAL_SKILLS.lock");
    validateExternalLock(fs.readFileSync(lockPath, "utf8"), externalSkills);

    for (const skillName of expectedNames) {
      validateSkill(skillName, skillRoot);
    }

    console.log(
      "Release archive is valid: " + path.basename(archivePath) +
      " (internal=" + internalSkills.length +
      ", external=" + externalSkills.length +
      ", total=" + expectedNames.size + ")"
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error("Usage: node scripts/check-release-archive.mjs <archive.zip>");
    process.exitCode = 2;
    return;
  }

  const archivePath = path.resolve(process.cwd(), args[0]);
  if (!fs.existsSync(archivePath) || !fs.statSync(archivePath).isFile()) {
    console.error("Release archive not found: " + archivePath);
    process.exitCode = 2;
    return;
  }

  try {
    runUnzip(["-tqq", archivePath]);
    validateArchive(archivePath);
  } catch (error) {
    console.error("Release archive check failed: " + error.message);
    process.exitCode = 1;
  }
}

main();
