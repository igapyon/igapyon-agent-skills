import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("./sync-codex-skill.sh", import.meta.url));

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

test("skill sync excludes bundled node_modules from copy and check while preserving installed dependencies", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sync-codex-skill-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const project = path.join(root, "project");
  const script = path.join(project, "scripts/sync-codex-skill.sh");
  const source = path.join(project, "skills/igapyon-miku-daybook");
  const codexHome = path.join(root, "codex home");
  const destination = path.join(codexHome, "skills/igapyon-miku-daybook");
  const otherSkill = path.join(codexHome, "skills/another-skill");
  fs.mkdirSync(path.dirname(script), { recursive: true });
  fs.copyFileSync(SCRIPT, script);
  write(path.join(source, "SKILL.md"), "---\nname: igapyon-miku-daybook\n---\nsource\n");
  write(path.join(source, "references/records.md"), "version one\n");
  write(path.join(source, "assets/daybook/node_modules/source-only/package.json"), "{}\n");
  write(path.join(destination, "assets/daybook/node_modules/installed-dependency/package.json"), "{\"kept\":true}\n");
  write(path.join(destination, "stale.md"), "remove on sync\n");
  write(path.join(otherSkill, "SKILL.md"), "leave untouched\n");

  const run = (args) => spawnSync("sh", [script, ...args, "igapyon-miku-daybook"], {
    encoding: "utf8",
    env: { ...process.env, CODEX_HOME: codexHome },
  });
  const synced = run([]);
  assert.equal(synced.status, 0, synced.stderr);
  assert.equal(fs.readFileSync(path.join(destination, "references/records.md"), "utf8"), "version one\n");
  assert.equal(fs.existsSync(path.join(destination, "assets/daybook/node_modules/source-only")), false);
  assert.equal(fs.existsSync(path.join(destination, "assets/daybook/node_modules/installed-dependency/package.json")), true);
  assert.equal(fs.existsSync(path.join(destination, "stale.md")), false);
  assert.equal(fs.readFileSync(path.join(otherSkill, "SKILL.md"), "utf8"), "leave untouched\n");

  write(path.join(source, "references/records.md"), "version two after editing\n");
  const outOfSync = run(["--check"]);
  assert.notEqual(outOfSync.status, 0);
  assert.match(outOfSync.stderr, /references\/records\.md/);
  assert.doesNotMatch(outOfSync.stderr, /node_modules/);

  const resynced = run([]);
  assert.equal(resynced.status, 0, resynced.stderr);
  const checked = run(["--check"]);
  assert.equal(checked.status, 0, checked.stderr);
  assert.match(checked.stdout, /in sync/);
  assert.equal(fs.readFileSync(path.join(destination, "assets/daybook/node_modules/installed-dependency/package.json"), "utf8"), "{\"kept\":true}\n");
});
