#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  assertInternalIndexFiles,
  projectRoot,
  readSkillIndexPolicy,
} from "./skill-index-policy.mjs";

const policy = readSkillIndexPolicy(projectRoot);
const adopted = assertInternalIndexFiles(projectRoot, policy, { allowMissingRetained: true });
if (adopted.size === 0) {
  process.stdout.write("No internal skill indexes are adopted; generation skipped.\n");
  process.exit(0);
}

const generator = path.join(projectRoot, "lib", "miku-indexgen-1.6.2.jar");
for (const skill of adopted) {
  const inputDirectory = path.join(projectRoot, "skills", skill);
  const result = spawnSync("java", ["-jar", generator, "--input-directory", inputDirectory], {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: "inherit",
  });
  if (result.error) throw new Error(`Could not run miku-indexgen for ${skill}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`miku-indexgen failed for ${skill} with status ${result.status}`);
}
