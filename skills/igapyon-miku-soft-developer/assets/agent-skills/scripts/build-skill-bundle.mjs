#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const repoName = "__REPO_NAME__";
const skillName = "__SKILL_NAME__";
const bundleRoot = path.resolve(repoRoot, "bundle", repoName);
const sourceSkillRoot = path.resolve(repoRoot, "skills", skillName);
const bundleSkillRoot = path.resolve(bundleRoot, "skills", skillName);

main();

function main() {
  ensureSourceExists(sourceSkillRoot, `skills/${skillName}`);
  const { skillRuntimeArtifacts } = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  if (!Array.isArray(skillRuntimeArtifacts)) {
    throw new Error("package.json skillRuntimeArtifacts must list required CLI artifact paths; use [] only when none are required");
  }
  for (const relative of skillRuntimeArtifacts) {
    if (typeof relative !== "string" || !relative.startsWith("runtime/") ||
        relative.includes("\\") || relative.split("/").some((part) => !part || part === "." || part === "..") ||
        !/\.(?:mjs|jar)$/.test(relative)) {
      throw new Error(`invalid required CLI artifact path: ${relative}`);
    }
    const artifact = path.join(sourceSkillRoot, relative);
    if (!fs.existsSync(artifact) || !fs.statSync(artifact).isFile() || fs.statSync(artifact).size === 0) {
      throw new Error(`missing or empty required CLI artifact: ${relative}`);
    }
  }

  fs.rmSync(bundleRoot, {
    recursive: true,
    force: true,
    maxRetries: 3,
    retryDelay: 100
  });
  fs.mkdirSync(path.dirname(bundleSkillRoot), { recursive: true });

  fs.cpSync(sourceSkillRoot, bundleSkillRoot, {
    recursive: true,
    filter: shouldCopyBundleEntry
  });

  process.stdout.write([
    `[build:bundle] generated bundle/${repoName}`,
    "[build:bundle] copy this directory's contents under your skill home root",
    "[build:bundle] included:",
    `  - skills/${skillName}`
  ].join("\n"));
  process.stdout.write("\n");
}

function ensureSourceExists(targetPath, label) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`missing source directory: ${label}`);
  }
}

function shouldCopyBundleEntry(sourcePath) {
  const name = path.basename(sourcePath);
  if (name === ".DS_Store") {
    return false;
  }
  if (name === "tmp" || name === "output" || name === "state") {
    const relativePath = path.relative(sourceSkillRoot, sourcePath);
    return relativePath.split(path.sep).length > 1;
  }
  return true;
}
