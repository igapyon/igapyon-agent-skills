import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { extractSections } from "./section-utils.mjs";
import { validatePngBuffer } from "./png-validation.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const splitScript = path.join(scriptDir, "split-article-sections.mjs");
const copyScript = path.join(scriptDir, "copy-section-image.mjs");
const validateScript = path.join(scriptDir, "validate-run-dir.mjs");
const applyScript = path.join(scriptDir, "apply-generated-images-to-article.mjs");

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function onePixelPng() {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const scanline = Buffer.from([0, 0x32, 0x64, 0xc8, 0xff]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(scanline)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function run(script, args, options = {}) {
  return execFileSync(process.execPath, [script, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
}

test("extractSections ignores nested fenced headings and footer sections", () => {
  const markdown = [
    "---",
    "title: test",
    "---",
    "# Test",
    "## One",
    "body",
    "```markdown",
    "## not a section",
    "```",
    "~~~text",
    "## also not a section",
    "~~~",
    "## Two",
    "more",
    "## 参考リンク",
    "- [reference](https://example.test)",
    "",
  ].join("\n");

  const sections = extractSections(markdown);
  assert.deepEqual(sections.map((section) => section.title), ["One", "Two"]);
  assert.match(sections[0].content, /## not a section/u);
});

test("split rerun preserves progress and refuses changed existing sections", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "mikuku-split-"));
  const article = path.join(root, "article.md");
  const runDir = path.join(root, "run");
  const first = "# Test\n\n## One\nfirst\n\n## Two\nsecond\n";
  await writeFile(article, first);
  run(splitScript, ["--article", article, "--out", runDir]);

  const todoPath = path.join(runDir, "TODO.md");
  const todo = await readFile(todoPath, "utf8");
  await writeFile(
    todoPath,
    todo
      .replace("001: One - image-pending", "001: One - image-checked")
      .replace("002: Two - image-pending", "002: Two - image-pending: image-tool-unavailable"),
  );
  await writeFile(article, `${first}\n## Three\nthird\n`);
  run(splitScript, ["--article", article, "--out", runDir]);

  const resumedTodo = await readFile(todoPath, "utf8");
  assert.match(resumedTodo, /001: One - image-checked/u);
  assert.match(resumedTodo, /002: Two - image-pending: image-tool-unavailable/u);
  assert.match(resumedTodo, /003: Three - image-pending/u);
  assert.equal(await readFile(path.join(runDir, "sections/001/section-source.md"), "utf8"), "## One\nfirst\n");

  await writeFile(article, "# Test\n\n## One\nchanged\n\n## Two\nsecond\n\n## Three\nthird\n");
  assert.throws(
    () => run(splitScript, ["--article", article, "--out", runDir]),
    /Existing section source differs|changed/u,
  );
});

test("split reports and resumes an initially empty article body", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "mikuku-empty-"));
  const article = path.join(root, "article.md");
  const runDir = path.join(root, "run");
  await writeFile(article, "# Test\n\n## 参考リンク\n- [reference](https://example.test)\n");
  run(splitScript, ["--article", article, "--out", runDir]);
  assert.doesNotMatch(await readFile(path.join(runDir, "TODO.md"), "utf8"), /\d{3}: /u);

  await writeFile(article, "# Test\n\n## One\nbody\n\n## 参考リンク\n- [reference](https://example.test)\n");
  run(splitScript, ["--article", article, "--out", runDir]);
  assert.match(await readFile(path.join(runDir, "TODO.md"), "utf8"), /001: One - image-pending/u);
});

test("PNG validation rejects a signature-only file and accepts a complete PNG", () => {
  const valid = onePixelPng();
  assert.deepEqual(validatePngBuffer(valid), { width: 1, height: 1, colorType: 6, bitDepth: 8 });
  assert.throws(() => validatePngBuffer(valid.subarray(0, 8)), /Invalid PNG/u);
  const corrupt = Buffer.from(valid);
  corrupt[corrupt.length - 8] ^= 0xff;
  assert.throws(() => validatePngBuffer(corrupt), /CRC|decompressed/u);
  assert.throws(() => validatePngBuffer(valid.subarray(0, -3)), /Invalid PNG/u);
});

test("copy and run validation require structurally valid images", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "mikuku-png-"));
  const runDir = path.join(root, "run");
  const sectionDir = path.join(runDir, "sections/001");
  await mkdir(sectionDir, { recursive: true });
  await writeFile(path.join(root, "article.md"), "# Test\n\n## One\nbody\n");
  await writeFile(path.join(runDir, "TODO.md"), "# TODO\n\n- [ ] 001: One - image-pending\n");
  await writeFile(path.join(sectionDir, "section-source.md"), "## One\nbody\n");
  await writeFile(path.join(sectionDir, "section-text.md"), "text\n");
  await writeFile(path.join(sectionDir, "image-prompt.md"), "prompt\n");
  const invalid = path.join(root, "invalid.png");
  await writeFile(invalid, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  assert.throws(
    () => run(copyScript, ["--run-dir", runDir, "--section", "001", "--src", invalid]),
    /Invalid PNG/u,
  );

  const valid = path.join(root, "valid.png");
  await writeFile(valid, onePixelPng());
  run(copyScript, ["--run-dir", runDir, "--section", "001", "--src", valid]);
  const todo = await readFile(path.join(runDir, "TODO.md"), "utf8");
  assert.match(todo, /001: One - image-generated/u);

  await writeFile(path.join(runDir, "TODO.md"), todo.replace("image-generated", "image-checked"));
  await (await import("node:fs/promises")).unlink(path.join(sectionDir, "graphic-recording.png"));
  assert.throws(
    () => run(validateScript, ["--run-dir", runDir]),
    (error) => error.status === 1 && String(error.stdout).includes("graphic-recording.png is missing"),
  );
});

test("article image application is dry-run first and matches current section text", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "mikuku-apply-"));
  const runDir = path.join(root, "run");
  const sectionDir = path.join(runDir, "sections/001");
  const article = path.join(root, "article.md");
  await mkdir(sectionDir, { recursive: true });
  await writeFile(article, [
    "---",
    "title: Test",
    "---",
    "# Test",
    "",
    "## One",
    "body",
    "",
    "## 参考リンク",
    "- [reference](https://example.test)",
    "",
  ].join("\n"));
  await writeFile(path.join(runDir, "TODO.md"), "# TODO\n\n- [x] 001: One - image-checked\n");
  await writeFile(path.join(sectionDir, "section-source.md"), "## One\nbody\n");
  await writeFile(path.join(sectionDir, "graphic-recording.png"), onePixelPng());

  const before = await readFile(article, "utf8");
  run(applyScript, ["--run-dir", runDir, "--article", article, "--mode", "sections"]);
  assert.equal(await readFile(article, "utf8"), before);
  assert.match(await readFile(path.join(runDir, "article-image-placement-plan.md"), "utf8"), /insert-after-heading/u);

  run(applyScript, ["--run-dir", runDir, "--article", article, "--mode", "sections", "--apply"]);
  const after = await readFile(article, "utf8");
  assert.match(after, /!\[One\]\(images\/001\.png\)/u);
  assert.ok((await stat(path.join(root, "images/001.png"))).isFile());
  assert.match(after, /## 参考リンク\n- \[reference\]/u);

  await writeFile(path.join(sectionDir, "section-source.md"), "## One\nchanged after generation\n");
  assert.throws(
    () => run(applyScript, ["--run-dir", runDir, "--article", article, "--mode", "sections"]),
    /does not match the current article/u,
  );
});

test("whole-article mode uses the direct representative image and its checked status", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "mikuku-whole-"));
  const runDir = path.join(root, "run");
  const article = path.join(root, "article.md");
  await mkdir(runDir, { recursive: true });
  await writeFile(article, "# Test\n\nintro\n");
  await writeFile(path.join(runDir, "graphic-recording.png"), onePixelPng());
  await writeFile(path.join(runDir, "image-generation-report.md"), "- status: image-checked\n");

  run(applyScript, ["--run-dir", runDir, "--article", article, "--mode", "whole-article", "--apply"]);
  const result = await readFile(article, "utf8");
  assert.match(result, /# Test\n\n!\[article representative\]\(images\/000\.png\)/u);
  assert.ok((await stat(path.join(root, "images/000.png"))).isFile());
});
