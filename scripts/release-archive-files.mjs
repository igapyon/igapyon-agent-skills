import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const sourceExclusions = new Set([".DS_Store", "node_modules", ".git"]);

export function collectSourceFiles(sourceSkillDir) {
  return collectFiles(sourceSkillDir, { excludeSourcePaths: true });
}

export function collectArchiveFiles(archiveSkillDir) {
  return collectFiles(archiveSkillDir, { excludeSourcePaths: false });
}

export function assertSkillFilesMatchSource({ skillName, sourceSkillDir, archiveSkillDir }) {
  let expected;
  let actual;
  try {
    expected = collectSourceFiles(sourceSkillDir);
  } catch (error) {
    throw new Error(`${skillName}: cannot enumerate source files: ${error.message}`);
  }
  try {
    actual = collectArchiveFiles(archiveSkillDir);
  } catch (error) {
    throw new Error(`${skillName}: cannot enumerate archive files: ${error.message}`);
  }

  const expectedPaths = new Set(expected.keys());
  const actualPaths = new Set(actual.keys());
  const missing = [...expectedPaths].filter((relative) => !actualPaths.has(relative)).sort();
  const unexpected = [...actualPaths].filter((relative) => !expectedPaths.has(relative)).sort();
  if (missing.length || unexpected.length) {
    const details = [];
    if (missing.length) details.push(`missing: ${missing.join(", ")}`);
    if (unexpected.length) details.push(`unexpected: ${unexpected.join(", ")}`);
    throw new Error(`${skillName}: release files differ from source\n${details.join("\n")}`);
  }

  const changed = [...expectedPaths].filter((relative) => {
    const source = expected.get(relative);
    const archived = actual.get(relative);
    return source.size !== archived.size || source.sha256 !== archived.sha256;
  }).sort();
  if (changed.length) {
    throw new Error(`${skillName}: release file content differs from source\nchanged: ${changed.join(", ")}`);
  }
  return { fileCount: expected.size };
}

function collectFiles(root, { excludeSourcePaths }) {
  let rootStat;
  try {
    rootStat = fs.lstatSync(root);
  } catch (error) {
    throw new Error(`skill root is unavailable: ${error.message}`);
  }
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw new Error("skill root is not a regular directory");
  }

  const files = new Map();
  function visit(directory, relativeDirectory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
    for (const entry of entries) {
      if (excludeSourcePaths && sourceExclusions.has(entry.name)) continue;
      const relative = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      const absolute = path.join(directory, entry.name);
      const stat = fs.lstatSync(absolute);
      if (stat.isSymbolicLink()) {
        throw new Error(`${relative}: symbolic links are not release files`);
      }
      if (stat.isDirectory()) {
        visit(absolute, relative);
      } else if (stat.isFile()) {
        const content = fs.readFileSync(absolute);
        files.set(relative, {
          size: content.length,
          sha256: crypto.createHash("sha256").update(content).digest("hex"),
        });
      } else {
        throw new Error(`${relative}: not a regular file or directory`);
      }
    }
  }

  visit(root, "");
  return files;
}
