import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { projectRoot, validateSkillIndexPolicy } from "./skill-index-policy.mjs";

const repo = "https://example.test/external-skill.git";
const externalSkill = "external-skill";
const rootName = "index-policy-fixture-1.0";
const indexEntry = (skill) => ({
  skill, indexPath: "index.json", reason: "Fixture consumer", consumer: "Fixture reader", evidence: "Fixture evidence",
});

function fixture(context, { skills = ["retained-skill", "without-index"], adopted = ["retained-skill"], external = "legacy" } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-index-integration-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "scripts"));
  for (const script of ["skill-index-policy.mjs", "generate-skill-indexes.mjs", "check-generated-indexes.mjs", "check-release-archive.mjs", "release-archive-files.mjs", "skill-reference-routes.mjs"]) {
    const source = path.join(projectRoot, "scripts", script);
    if (fs.existsSync(source)) fs.copyFileSync(source, path.join(root, "scripts", script));
  }
  for (const skill of skills) {
    const skillRoot = path.join(root, "skills", skill);
    fs.mkdirSync(path.join(skillRoot, "references"), { recursive: true });
    fs.mkdirSync(path.join(skillRoot, "scripts"), { recursive: true });
    fs.mkdirSync(path.join(skillRoot, "assets"), { recursive: true });
    fs.writeFileSync(path.join(skillRoot, "SKILL.md"), skillText(skill));
    fs.writeFileSync(path.join(skillRoot, "references", "workflow.md"), "# Fixture workflow\n");
    fs.writeFileSync(path.join(skillRoot, "scripts", "helper.mjs"), "export const fixture = true;\n");
    fs.writeFileSync(path.join(skillRoot, "assets", "example.bin"), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00]));
    if (adopted.includes(skill)) fs.writeFileSync(path.join(skillRoot, "index.json"), indexText());
  }
  fs.mkdirSync(path.join(root, "config"));
  const policy = {
    schemaVersion: 1,
    internal: adopted.map(indexEntry),
    external: [{ skill: externalSkill, repo, ref: "v1.0", disposition: external,
      reason: "Fixture source", evidence: "Fixture evidence", ...(external === "legacy" ? { nextAction: "Migrate fixture" } : {}) }],
  };
  fs.writeFileSync(path.join(root, "config", "skill-index-policy.json"), JSON.stringify(policy));
  fs.writeFileSync(path.join(root, "pom.xml"), `<project><artifactId>index-policy-fixture</artifactId><version>1.0</version><properties>
<external.sample.repo>${repo}</external.sample.repo><external.sample.ref>v1.0</external.sample.ref>
<external.sample.skillName>${externalSkill}</external.sample.skillName></properties></project>`);
  return { root, skills, adopted, external, policy };
}

function skillText(name) { return `---\nname: ${name}\ndescription: Fixture skill\n---\n# Fixture\n`; }
function indexText(overrides = {}) { return JSON.stringify({ basePath: ".", files: [{ path: "SKILL.md" }], ...overrides }); }
function listFiles(directory, relative = "") {
  return fs.readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name)).flatMap((entry) => {
    const child = relative ? `${relative}/${entry.name}` : entry.name;
    return entry.isDirectory() ? listFiles(path.join(directory, entry.name), child) : [child];
  });
}

function entriesFor(material) {
  const entries = ["README.md", "INSTALL.md", "LICENSE"].map((name) => ({ name: `${rootName}/${name}`, data: "Fixture\n" }));
  entries.push({ name: `${rootName}/EXTERNAL_SKILLS.lock`, data: `${repo}\tv1.0\t${externalSkill}\n` });
  for (const skill of [...material.skills, externalSkill]) {
    const prefix = `${rootName}/skills/${skill}`;
    if (skill === externalSkill) {
      entries.push({ name: `${prefix}/SKILL.md`, data: skillText(skill) });
      entries.push({ name: `${prefix}/references/workflow.md`, data: "# Fixture workflow\n" });
    } else {
      for (const relative of listFiles(path.join(material.root, "skills", skill))) {
        entries.push({ name: `${prefix}/${relative}`, data: fs.readFileSync(path.join(material.root, "skills", skill, relative)) });
      }
    }
    if (skill === externalSkill && material.external !== "remove") {
      entries.push({ name: `${prefix}/index.json`, data: indexText() });
    }
  }
  return entries;
}

// Small stored ZIPs let fault cases include duplicate names and unsafe paths
// without creating those paths in the filesystem or adding a ZIP dependency.
function writeZip(file, entries) {
  let offset = 0;
  const local = [], central = [];
  for (const entry of entries) {
    const name = Buffer.from(entry.name), data = Buffer.from(entry.data);
    let crc = 0xffffffff;
    for (const byte of data) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0); header.writeUInt16LE(20, 4);
    header.writeUInt32LE(crc, 14); header.writeUInt32LE(data.length, 18); header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(name.length, 26);
    local.push(header, name, data);
    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50, 0); record.writeUInt16LE(0x0314, 4); record.writeUInt16LE(20, 6);
    record.writeUInt32LE(crc, 16); record.writeUInt32LE(data.length, 20); record.writeUInt32LE(data.length, 24);
    record.writeUInt16LE(name.length, 28); record.writeUInt32LE(((entry.mode ?? 0o100644) << 16) >>> 0, 38);
    record.writeUInt32LE(offset, 42); central.push(record, name);
    offset += header.length + name.length + data.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  fs.writeFileSync(file, Buffer.concat([...local, directory, end]));
}

function runArchive(material, entries) {
  const archive = path.join(material.root, "fixture.zip");
  writeZip(archive, entries);
  return spawnSync(process.execPath, [path.join(material.root, "scripts", "check-release-archive.mjs"), archive], { encoding: "utf8" });
}
function runScript(material, script, options = {}) {
  return spawnSync(process.execPath, [path.join(material.root, "scripts", script)], { cwd: material.root, encoding: "utf8", ...options });
}
function replace(entries, suffix, data) { entries.find((entry) => entry.name.endsWith(suffix)).data = data; }
function remove(entries, suffix) {
  const index = entries.findIndex((entry) => entry.name.endsWith(suffix));
  assert.notEqual(index, -1, `fixture lacks ZIP entry ${suffix}`);
  entries.splice(index, 1);
}

for (const external of ["remove", "retain", "legacy"]) {
  test(`real ZIP accepts index-free skills and external ${external} policy`, (context) => {
    const material = fixture(context, { external });
    const result = runArchive(material, entriesFor(material));
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /internal=2, external=1, total=3/);
  });
}

function mikukuFixture(context) {
  const material = fixture(context, { skills: ["igapyon-mikuku-agent"], adopted: [] });
  const skillRoot = path.join(material.root, "skills", "igapyon-mikuku-agent");
  fs.writeFileSync(path.join(skillRoot, "SKILL.md"), [
    "---", "name: igapyon-mikuku-agent", "description: Fixture skill", "---", "",
    "[Version](references/VERSION.md)", "[Representative image](assets/mikuku/mikuku01.png)",
    "[Article rules](references/article-writing.md)", ""
  ].join("\n"));
  fs.mkdirSync(path.join(skillRoot, "assets", "mikuku"), { recursive: true });
  fs.writeFileSync(path.join(skillRoot, "assets", "mikuku", "mikuku01.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00]));
  fs.writeFileSync(path.join(skillRoot, "references", "VERSION.md"), "Version: 20261011a\n");
  fs.writeFileSync(path.join(skillRoot, "references", "article-writing.md"), "# Article writing\n");
  return { material, entries: entriesFor(material), skillRoot };
}

test("Mikuku routes pass when checked in the extracted archive", (context) => {
  const { material, entries } = mikukuFixture(context);
  const result = runArchive(material, entries);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /representative-routes=1/);
});

for (const [label, pathInSkill] of [
  ["VERSION.md", "references/VERSION.md"],
  ["representative image", "assets/mikuku/mikuku01.png"],
  ["article helper", "references/article-writing.md"],
]) {
  test(`real ZIP rejects a missing Mikuku ${label}`, (context) => {
    const { material, entries } = mikukuFixture(context);
    remove(entries, `/skills/igapyon-mikuku-agent/${pathInSkill}`);
    const result = runArchive(material, entries);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, new RegExp(`igapyon-mikuku-agent.*missing.*${pathInSkill.replaceAll(".", "\\.")}`, "s"));
  });
}

test("real ZIP rejects a reference omitted from both staged files and archive", (context) => {
  const { material, entries, skillRoot } = mikukuFixture(context);
  const stagedSkillRoot = path.join(material.root, "target/release-staging/skills/igapyon-mikuku-agent");
  fs.mkdirSync(path.dirname(stagedSkillRoot), { recursive: true });
  fs.cpSync(skillRoot, stagedSkillRoot, { recursive: true });
  const relative = "references/VERSION.md";
  fs.rmSync(path.join(stagedSkillRoot, relative));
  remove(entries, `/skills/igapyon-mikuku-agent/${relative}`);
  assert.equal(fs.existsSync(path.join(skillRoot, relative)), true);
  const result = runArchive(material, entries);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /references\/VERSION\.md/);
});

test("real ZIP rejects changed content at a retained source path", (context) => {
  const { material, entries } = mikukuFixture(context);
  const entry = entries.find((candidate) => candidate.name.endsWith("/references/article-writing.md"));
  entry.data = "# Article writinx\n";
  const result = runArchive(material, entries);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /changed.*references\/article-writing\.md/s);
});

test("real ZIP rejects an unexpected internal file", (context) => {
  const { material, entries } = mikukuFixture(context);
  entries.push({ name: `${rootName}/skills/igapyon-mikuku-agent/references/extra.md`, data: "# Extra\n" });
  const result = runArchive(material, entries);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /unexpected: references\/extra\.md/);
});

test("real ZIP rejects a directory in place of a source file", (context) => {
  const { material, entries } = mikukuFixture(context);
  remove(entries, "/skills/igapyon-mikuku-agent/scripts/helper.mjs");
  entries.push({ name: `${rootName}/skills/igapyon-mikuku-agent/scripts/helper.mjs/child.txt`, data: "child\n" });
  const result = runArchive(material, entries);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /missing: scripts\/helper\.mjs/);
});

test("real ZIP rejects a symlink substituted for an unindexed helper", (context) => {
  const { material, entries } = mikukuFixture(context);
  remove(entries, "/skills/igapyon-mikuku-agent/scripts/helper.mjs");
  entries.push({
    name: `${rootName}/skills/igapyon-mikuku-agent/scripts/helper.mjs`,
    data: "../../../../outside.txt",
    mode: 0o120777,
  });
  const result = runArchive(material, entries);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /scripts\/helper\.mjs: symbolic links/);
});

test("real ZIP rejects a representative target missing from source and archive", (context) => {
  const { material, entries, skillRoot } = mikukuFixture(context);
  fs.rmSync(path.join(skillRoot, "references/VERSION.md"));
  remove(entries, "/skills/igapyon-mikuku-agent/references/VERSION.md");
  const result = runArchive(material, entries);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /representative.*VERSION\.md|VERSION\.md.*representative/i);
});

test("real ZIP rejects a representative target unlinked in both source and archive", (context) => {
  const { material, entries, skillRoot } = mikukuFixture(context);
  const source = fs.readFileSync(path.join(skillRoot, "SKILL.md"), "utf8");
  fs.writeFileSync(path.join(skillRoot, "SKILL.md"), source.replace("[Version](references/VERSION.md)", "Version instructions are maintained separately."));
  const entry = entries.find((candidate) => candidate.name.endsWith("/SKILL.md") && candidate.name.includes("igapyon-mikuku-agent"));
  entry.data = fs.readFileSync(path.join(skillRoot, "SKILL.md"));
  const result = runArchive(material, entries);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /references\/VERSION\.md/);
});

const adoptedIndex = "/retained-skill/index.json";
const faults = [
  ["missing adopted index", (e) => e.splice(e.findIndex((v) => v.name.endsWith(adoptedIndex)), 1), /adopted but missing/],
  ["undeclared internal index", (e) => e.push({ name: `${rootName}/skills/without-index/index.json`, data: indexText() }), /not declared as adopted/],
  ["malformed index JSON", (e) => replace(e, adoptedIndex, "{"), /not valid JSON/],
  ["invalid files array", (e) => replace(e, adoptedIndex, indexText({ files: {} })), /files array/],
  ["invalid basePath type", (e) => replace(e, adoptedIndex, indexText({ basePath: 42 })), /basePath/],
  ["index missing target", (e) => replace(e, adoptedIndex, indexText({ files: [{ path: "missing.md" }] })), /missing file/],
  ["index directory target", (e) => replace(e, adoptedIndex, indexText({ files: [{ path: "references" }] })), /not a file/],
  ["index parent traversal", (e) => replace(e, adoptedIndex, indexText({ files: [{ path: "../../README.md" }] })), /escapes|unsafe/],
  ["index absolute path", (e) => replace(e, adoptedIndex, indexText({ files: [{ path: "/outside.md" }] })), /escapes|unsafe/],
  ["index basePath traversal", (e) => replace(e, adoptedIndex, indexText({ basePath: "../..", files: [{ path: "README.md" }] })), /escapes|unsafe/],
  ["index symlink escape", (e) => {
    replace(e, adoptedIndex, indexText({ files: [{ path: "alias.md" }] }));
    e.push({ name: `${rootName}/skills/retained-skill/alias.md`, data: "../../README.md", mode: 0o120777 });
  }, /resolves outside/],
  ["missing SKILL.md", (e) => e.splice(e.findIndex((v) => v.name.endsWith("/without-index/SKILL.md")), 1), /missing SKILL.md/],
  ["mismatched skill name", (e) => replace(e, "/without-index/SKILL.md", skillText("wrong-skill")), /name does not match/],
  ["ZIP traversal", (e) => e.push({ name: `${rootName}/../outside.md`, data: "Unsafe" }), /Unsafe ZIP entry/],
  ["duplicate ZIP entry", (e) => e.push({ ...e[0] }), /Duplicate ZIP entry/],
  ["external lock mismatch", (e) => replace(e, "/EXTERNAL_SKILLS.lock", `${repo}\tv2.0\t${externalSkill}\n`), /EXTERNAL_SKILLS.lock row/],
];
for (const [label, mutate, message] of faults) {
  test(`real ZIP rejects ${label}`, (context) => {
    const material = fixture(context), entries = entriesFor(material);
    mutate(entries);
    const result = runArchive(material, entries);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, message);
  });
}

test("external remove rejects an inventory supplied by an old source", (context) => {
  const material = fixture(context, { external: "remove" }), entries = entriesFor(material);
  entries.push({ name: `${rootName}/skills/${externalSkill}/index.json`, data: indexText() });
  const result = runArchive(material, entries);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /not declared as adopted/);
});
test("external legacy requires its pinned index", (context) => {
  const material = fixture(context), entries = entriesFor(material)
    .filter((entry) => !entry.name.endsWith(`/${externalSkill}/index.json`));
  const result = runArchive(material, entries);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /adopted but missing/);
});

test("zero adopted indexes skips generation even when Java is unavailable", (context) => {
  const material = fixture(context, { adopted: [] });
  const result = runScript(material, "generate-skill-indexes.mjs", { env: { ...process.env, PATH: material.root } });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /generation skipped/);
  for (const skill of material.skills) assert.equal(fs.existsSync(path.join(material.root, "skills", skill, "index.json")), false);
});
test("multiple adopted indexes are generated without touching an unadopted skill", (context) => {
  const material = fixture(context, { skills: ["first-skill", "second-skill", "without-index"], adopted: ["first-skill", "second-skill"] });
  fs.mkdirSync(path.join(material.root, "lib"));
  fs.copyFileSync(path.join(projectRoot, "lib", "miku-indexgen-1.6.2.jar"), path.join(material.root, "lib", "miku-indexgen-1.6.2.jar"));
  const result = runScript(material, "generate-skill-indexes.mjs");
  assert.equal(result.status, 0, result.stderr);
  for (const skill of material.adopted) {
    const index = JSON.parse(fs.readFileSync(path.join(material.root, "skills", skill, "index.json"), "utf8"));
    assert.ok(index.files.some((entry) => entry.path === "SKILL.md"));
  }
  assert.equal(fs.existsSync(path.join(material.root, "skills", "without-index", "index.json")), false);
});

test("generated check accepts removed inventories and rejects retained index drift", (context) => {
  const material = fixture(context);
  const retained = path.join(material.root, "skills", "retained-skill", "index.json");
  const removed = path.join(material.root, "skills", "without-index", "index.json");
  fs.writeFileSync(retained, indexText()); fs.writeFileSync(removed, indexText());
  for (const args of [["init", "-q"], ["add", "."], ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.test", "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", "commit", "-qm", "Fixture baseline"]]) {
    const result = spawnSync("git", args, { cwd: material.root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  }
  fs.rmSync(removed);
  assert.equal(runScript(material, "check-generated-indexes.mjs").status, 0);
  fs.writeFileSync(retained, indexText({ files: [] }));
  const result = runScript(material, "check-generated-indexes.mjs");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /drift detected/);
});

const invalidPolicies = [
  ["unknown schema", (p) => { p.schemaVersion = 2; }],
  ["unknown root key", (p) => { p.unknown = true; }],
  ["unknown internal key", (p) => { p.internal[0].unknown = true; }],
  ["unknown internal skill", (p) => { p.internal[0].skill = "unknown-skill"; }],
  ["duplicate internal declaration", (p) => p.internal.push({ ...p.internal[0] })],
  ["unsafe indexPath", (p) => { p.internal[0].indexPath = "../index.json"; }],
  ["empty adoption reason", (p) => { p.internal[0].reason = " "; }],
  ["missing external declaration", (p) => { p.external = []; }],
  ["unknown external key", (p) => { p.external[0].unknown = true; }],
  ["unknown external skill", (p) => { p.external[0].skill = "unknown-skill"; }],
  ["duplicate external declaration", (p) => p.external.push({ ...p.external[0] })],
  ["mismatched external ref", (p) => { p.external[0].ref = "v2.0"; }],
  ["unknown external disposition", (p) => { p.external[0].disposition = "pending"; }],
  ["legacy without nextAction", (p) => { delete p.external[0].nextAction; }],
];
for (const [label, mutate] of invalidPolicies) {
  test(`policy rejects ${label} before generation`, (context) => {
    const material = fixture(context), policy = structuredClone(material.policy);
    mutate(policy);
    assert.throws(() => validateSkillIndexPolicy(policy, { internalSkills: material.skills,
      externalSkills: [{ repo, ref: "v1.0", skill: externalSkill }] }));
    fs.writeFileSync(path.join(material.root, "config", "skill-index-policy.json"), JSON.stringify(policy));
    const result = runScript(material, "generate-skill-indexes.mjs", { env: { ...process.env, PATH: material.root } });
    assert.equal(result.status, 1);
    assert.doesNotMatch(result.stderr, /Could not run miku-indexgen/);
  });
}
