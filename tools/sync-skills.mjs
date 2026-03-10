import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();

const sourceDir = path.join(rootDir, ".claude", "skills");
const targetDirs = [
  path.join(rootDir, ".github", "skills")
  // path.join(rootDir, ".codex", "skills")
];

async function pathExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function listSkillDirectories(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function validateSkillDirectory(skillDirName) {
  const skillDir = path.join(sourceDir, skillDirName);
  const skillFile = path.join(skillDir, "SKILL.md");

  if (!(await pathExists(skillFile))) {
    throw new Error(
      `Missing SKILL.md in source skill directory: ${path.relative(rootDir, skillDir)}`
    );
  }
}

async function prepareTargetDir(targetDir) {
  await rm(targetDir, { recursive: true, force: true });
  await mkdir(targetDir, { recursive: true });
}

async function syncToTarget(targetDir, skillDirs) {
  await prepareTargetDir(targetDir);

  for (const skillDirName of skillDirs) {
    const src = path.join(sourceDir, skillDirName);
    const dest = path.join(targetDir, skillDirName);

    await cp(src, dest, { recursive: true });
  }
}

async function main() {
  if (!(await pathExists(sourceDir))) {
    throw new Error(
      `Source skills directory does not exist: ${path.relative(rootDir, sourceDir)}`
    );
  }

  const skillDirs = await listSkillDirectories(sourceDir);

  if (skillDirs.length === 0) {
    console.log("No skills found in .claude/skills");
    return;
  }

  for (const skillDirName of skillDirs) {
    await validateSkillDirectory(skillDirName);
  }

  for (const targetDir of targetDirs) {
    await syncToTarget(targetDir, skillDirs);
    console.log(
      `Synced ${skillDirs.length} skill(s) to ${path.relative(rootDir, targetDir)}`
    );
  }

  console.log("Skill sync completed.");
}

main().catch((error) => {
  console.error("Skill sync failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
