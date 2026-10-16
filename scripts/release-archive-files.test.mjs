import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  assertSkillFilesMatchSource,
  collectArchiveFiles,
  collectSourceFiles,
} from "./release-archive-files.mjs";

function fixture(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "release-archive-files-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = path.join(root, "source");
  const archive = path.join(root, "archive");
  fs.mkdirSync(path.join(source, "references"), { recursive: true });
  fs.writeFileSync(path.join(source, "SKILL.md"), "# Skill\n");
  fs.writeFileSync(path.join(source, "references", "guide.md"), "# Guide\n");
  fs.cpSync(source, archive, { recursive: true });
  return { root, source, archive };
}

test("source and extracted archive match including binary files", (context) => {
  const { source, archive } = fixture(context);
  fs.writeFileSync(path.join(source, "references", "asset.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  fs.copyFileSync(path.join(source, "references", "asset.png"), path.join(archive, "references", "asset.png"));
  assert.deepEqual(assertSkillFilesMatchSource({ skillName: "fixture", sourceSkillDir: source, archiveSkillDir: archive }), { fileCount: 3 });
});

test("source collection skips only release exclusion names at every depth", (context) => {
  const { source } = fixture(context);
  for (const relative of [".DS_Store", "node_modules/dependency/file.js", ".git/config", "references/.DS_Store", "references/node_modules/local.bin", "references/.git/metadata"]) {
    const file = path.join(source, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "excluded\n");
  }
  for (const relative of [".gitignore", "node_modules-guide.md", "my.git", "references/valid.json", "scripts/tool.mjs", "runtime/tool.jar"]) {
    const file = path.join(source, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from([0, 1, 2]));
  }
  const files = collectSourceFiles(source);
  for (const relative of [".DS_Store", "node_modules/dependency/file.js", ".git/config", "references/.DS_Store", "references/node_modules/local.bin", "references/.git/metadata"]) {
    assert.equal(files.has(relative), false, `${relative} should be excluded`);
  }
  for (const relative of [".gitignore", "node_modules-guide.md", "my.git", "references/valid.json", "scripts/tool.mjs", "runtime/tool.jar"]) {
    assert.equal(files.has(relative), true, `${relative} should be retained`);
  }
});

test("empty directory differences do not change the file set", (context) => {
  const { source, archive } = fixture(context);
  fs.mkdirSync(path.join(source, "empty-source"));
  fs.mkdirSync(path.join(archive, "empty-archive"));
  assert.doesNotThrow(() => assertSkillFilesMatchSource({ skillName: "fixture", sourceSkillDir: source, archiveSkillDir: archive }));
});

test("archive enumeration does not hide release exclusion names", (context) => {
  const { archive } = fixture(context);
  fs.mkdirSync(path.join(archive, "node_modules"));
  fs.writeFileSync(path.join(archive, ".DS_Store"), "extra");
  const files = collectArchiveFiles(archive);
  assert.equal(files.has("node_modules"), false);
  assert.equal(files.has(".DS_Store"), true);
});

test("missing files and unexpected files are reported together in sorted order", (context) => {
  const { source, archive } = fixture(context);
  fs.rmSync(path.join(archive, "references/guide.md"));
  fs.writeFileSync(path.join(archive, "z-extra.md"), "extra\n");
  fs.writeFileSync(path.join(archive, "a-extra.md"), "extra\n");
  assert.throws(() => assertSkillFilesMatchSource({ skillName: "fixture", sourceSkillDir: source, archiveSkillDir: archive }),
    /fixture: release files differ from source\nmissing: references\/guide\.md\nunexpected: a-extra\.md, z-extra\.md/);
});

test("same-path content changes and empty replacements are detected", (context) => {
  const { source, archive } = fixture(context);
  fs.writeFileSync(path.join(archive, "references/guide.md"), "# Other\n");
  assert.throws(() => assertSkillFilesMatchSource({ skillName: "fixture", sourceSkillDir: source, archiveSkillDir: archive }),
    /content differs from source.*references\/guide\.md/s);
  fs.writeFileSync(path.join(archive, "references/guide.md"), "");
  assert.throws(() => assertSkillFilesMatchSource({ skillName: "fixture", sourceSkillDir: source, archiveSkillDir: archive }),
    /content differs from source.*references\/guide\.md/s);
});

test("source and archive symlinks are rejected without following them", (context) => {
  const { root, source, archive } = fixture(context);
  const outside = path.join(root, "outside.txt");
  fs.writeFileSync(outside, "outside\n");
  fs.symlinkSync(outside, path.join(source, "references", "source-link.md"));
  assert.throws(() => collectSourceFiles(source), /references\/source-link\.md: symbolic links/);
  fs.rmSync(path.join(source, "references", "source-link.md"));
  fs.symlinkSync(outside, path.join(archive, "references", "archive-link.md"));
  assert.throws(() => collectArchiveFiles(archive), /references\/archive-link\.md: symbolic links/);
});

test("non-directory roots are rejected", (context) => {
  const { root, source } = fixture(context);
  assert.throws(() => collectSourceFiles(path.join(root, "missing")), /skill root is unavailable/);
  assert.throws(() => collectSourceFiles(path.join(source, "SKILL.md")), /skill root is not a regular directory/);
});
