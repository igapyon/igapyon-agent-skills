#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { readArticleContext, readJsonIfExists, sha256, verifyWholeSource } from "./article-provenance.mjs";
import { validatePngBuffer } from "./png-validation.mjs";

const usage = "Usage: node record-whole-article.mjs --run-dir <dir> --article <article.md> --stage source|checked\n";
async function main() {
  const args = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--help") { process.stdout.write(usage); return; }
    if (!["--run-dir", "--article", "--stage"].includes(argv[i]) || !argv[i + 1] || argv[i + 1].startsWith("--")) throw new Error(usage);
    args[argv[i].slice(2)] = argv[++i];
  }
  if (!args.article || !args["run-dir"] || !["source", "checked"].includes(args.stage)) throw new Error(usage);
  const runDir = path.resolve(args["run-dir"]);
  const context = await readArticleContext(path.resolve(args.article));
  const sourcePath = path.join(runDir, "whole-article-source.json");
  if (args.stage === "source") {
    const previous = await readJsonIfExists(sourcePath);
    if (previous) {
      await verifyWholeSource(runDir, context);
    } else {
      // Never retrofit a source identity onto an already generated image.
      try {
        await readFile(path.join(runDir, "graphic-recording.png"));
        throw new Error("Image already exists; capture source in a new run before generation.");
      } catch (error) { if (error.code !== "ENOENT") throw error; }
      await mkdir(runDir, { recursive: true });
      await writeFile(sourcePath, JSON.stringify({ version: 1, articlePath: context.articlePath, articleSha256: sha256(context.source) }, null, 2) + "\n", { flag: "wx" });
    }
    process.stdout.write(`Source recorded: ${sourcePath}\n`);
  } else {
    const source = await verifyWholeSource(runDir, context);
    const image = await readFile(path.join(runDir, "graphic-recording.png"));
    validatePngBuffer(image);
    const checkedPath = path.join(runDir, "whole-article-checked.json");
    await writeFile(checkedPath, JSON.stringify({ ...source, imageSha256: sha256(image), status: "image-checked" }, null, 2) + "\n");
    process.stdout.write(`Inspection recorded (caller must have visually reviewed this image): ${checkedPath}\n`);
  }
}
main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
