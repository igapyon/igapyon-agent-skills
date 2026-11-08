#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoName = "__REPO_NAME__";
const skillName = "__SKILL_NAME__";
const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));

try {
  main();
} catch (error) {
  process.stderr.write(`[verify-release-zip] ${error.message}\n`);
  process.exitCode = 1;
}

function main() {
  const suppliedPath = process.argv[2];
  if (!suppliedPath || process.argv.length !== 3) {
    throw new Error("usage: node scripts/verify-release-zip.mjs <staged-release.zip>");
  }

  const zipPath = path.resolve(process.cwd(), suppliedPath);
  if (!fs.existsSync(zipPath) || !fs.statSync(zipPath).isFile() || fs.statSync(zipPath).size === 0) {
    throw new Error(`release ZIP is missing, not a file, or empty: ${zipPath}`);
  }

  const artifacts = validateArtifactDeclarations();
  try {
    execFileSync("unzip", ["-tqq", zipPath], { cwd: repoRoot, encoding: "utf8" });
  } catch (error) {
    throw new Error(`invalid release ZIP: ${zipPath}`, { cause: error });
  }

  const entries = listEntries(zipPath);
  validateEntries(entries, artifacts);

  const extractionRoot = fs.mkdtempSync(path.join(os.tmpdir(), `${repoName}-release-smoke-`));
  try {
    execFileSync("unzip", ["-q", zipPath, "-d", extractionRoot], {
      cwd: extractionRoot,
      encoding: "utf8"
    });

    const skillRoot = path.join(extractionRoot, "skills", skillName);
    for (const required of ["SKILL.md", "references/INDEX.md"]) {
      const requiredPath = path.join(skillRoot, required);
      if (!fs.existsSync(requiredPath) || !fs.statSync(requiredPath).isFile()) {
        throw new Error(`required file was not extracted from release ZIP: skills/${skillName}/${required}`);
      }
    }

    for (const relative of artifacts) {
      const artifact = path.join(skillRoot, relative);
      if (!fs.existsSync(artifact) || !fs.statSync(artifact).isFile() || fs.statSync(artifact).size === 0) {
        throw new Error(`required CLI artifact is missing or empty in extracted release ZIP: ${relative}`);
      }
      const isJar = relative.endsWith(".jar");
      const command = isJar ? "java" : process.execPath;
      const args = isJar ? ["-jar", artifact, "--version"] : [artifact, "--version"];
      try {
        execFileSync(command, args, {
          cwd: extractionRoot,
          encoding: "utf8",
          timeout: 30000
        });
      } catch (error) {
        throw new Error(`required CLI failed its --version check from the staged ZIP: ${relative}`, { cause: error });
      }
    }
  } finally {
    fs.rmSync(extractionRoot, { recursive: true, force: true });
  }

  process.stdout.write(`[verify-release-zip] verified ${path.basename(zipPath)} with Node.js ${process.versions.node}\n`);
}

function validateArtifactDeclarations() {
  if (!Array.isArray(packageJson.skillRuntimeArtifacts)) {
    throw new Error("package.json skillRuntimeArtifacts must be an array");
  }

  for (const relative of packageJson.skillRuntimeArtifacts) {
    if (typeof relative !== "string" || !relative.startsWith("runtime/") ||
        relative.includes("\\") || relative.split("/").some((part) => !part || part === "." || part === "..") ||
        !/\.(?:mjs|jar)$/.test(relative)) {
      throw new Error(`invalid required CLI artifact path in package.json: ${relative}`);
    }
  }
  return packageJson.skillRuntimeArtifacts;
}

function listEntries(zipPath) {
  const output = execFileSync("unzip", ["-Z1", zipPath], { cwd: repoRoot, encoding: "utf8" });
  return output.split(/\r?\n/).filter(Boolean);
}

function validateEntries(entries, artifacts) {
  const required = [
    `skills/${skillName}/SKILL.md`,
    `skills/${skillName}/references/INDEX.md`,
    ...artifacts.map((relative) => `skills/${skillName}/${relative}`)
  ];
  for (const entry of required) {
    if (!entries.includes(entry)) throw new Error(`missing zip entry: ${entry}`);
  }

  for (const entry of entries) {
    const pathParts = entry.replace(/\/$/, "").split("/");
    if (entry.includes("\\") || path.posix.isAbsolute(entry) || /^[A-Za-z]:/.test(pathParts[0]) ||
        pathParts.some((part) => !part || part === "." || part === "..")) {
      throw new Error(`unsafe path in release ZIP: ${entry}`);
    }
    if (pathParts.includes(".DS_Store") || pathParts.includes("node_modules") ||
        ["tests", "docs", "bundle", "workplace"].includes(pathParts[0])) {
      throw new Error(`forbidden entry in release ZIP: ${entry}`);
    }
  }
}
