#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  assertInternalIndexFiles,
  projectRoot,
  readSkillIndexPolicy,
} from "./skill-index-policy.mjs";

const policy = readSkillIndexPolicy(projectRoot);
const adopted = assertInternalIndexFiles(projectRoot, policy);
const paths = [...adopted].map((skill) => `skills/${skill}/index.json`);
if (paths.length === 0) {
  process.stdout.write("No internal skill indexes are adopted.\n");
  process.exit(0);
}

const status = spawnSync("git", ["status", "--short", "--untracked-files=all", "--", ...paths], {
  cwd: projectRoot,
  encoding: "utf8",
});
if (status.error) throw new Error(`Could not run git status: ${status.error.message}`);
if (status.status !== 0) throw new Error(`git status failed with status ${status.status}`);
if (status.stdout.trim()) {
  process.stderr.write("Adopted generated-index drift detected. Regenerate the declared index with mvn generate-resources.\n");
  for (const args of [["diff", "--", ...paths], ["diff", "--cached", "--", ...paths]]) {
    const diff = spawnSync("git", args, { cwd: projectRoot, encoding: "utf8" });
    if (diff.stdout) process.stderr.write(diff.stdout);
  }
  process.stderr.write(status.stdout);
  process.exit(1);
}
process.stdout.write("Adopted generated indexes match the committed files; undeclared skill-root indexes are absent.\n");
