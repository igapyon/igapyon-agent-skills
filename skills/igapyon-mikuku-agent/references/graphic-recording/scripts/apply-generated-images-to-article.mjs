#!/usr/bin/env node

import {
  mkdir,
  readdir,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { validatePngBuffer } from "./png-validation.mjs";
import { readArticleContext, readJsonIfExists, safeImagePath, sha256, verifyWholeSource } from "./article-provenance.mjs";
import {
  extractSections,
  parseTodo,
  sectionHeadingLineIndexes,
} from "./section-utils.mjs";

const usage = `Usage:
  node apply-generated-images-to-article.mjs --run-dir <run-dir> --article <article.md>
    [--mode whole-article|sections|both|whole-article-then-sections] [--section <NNN> ...] [--apply] [--overwrite]

Default is a dry-run. It writes <run-dir>/article-image-placement-plan.md and
does not change the article or copy images. --apply is required for mutation.
`;

function parseArgs(argv) {
  const args = { mode: "whole-article", sections: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--run-dir") args.runDir = argv[++i];
    else if (arg === "--article") args.article = argv[++i];
    else if (arg === "--mode") args.mode = argv[++i];
    else if (arg === "--section") args.sections.push(String(argv[++i]).padStart(3, "0"));
    else if (arg === "--apply") args.apply = true;
    else if (arg === "--overwrite") args.overwrite = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (args.mode === "whole-article-then-sections") args.mode = "both";
  if (!['whole-article', 'sections', 'both'].includes(args.mode)) {
    throw new Error("--mode must be whole-article, sections, or both.");
  }
  return args;
}

async function exists(filePath) {
  try {
    return await stat(filePath);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function normalizeContent(value) {
  return value.replace(/\r\n/gu, "\n").replace(/\s+$/u, "");
}

function firstH1Line(lines) {
  let fence = null;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const fenceMatch = line.match(/^[ \t]{0,3}(`{3,}|~{3,})/u);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      const length = fenceMatch[1].length;
      if (!fence) fence = { marker, length };
      else if (marker === fence.marker && length >= fence.length) fence = null;
    }
    if (!fence && /^#[ \t]+/u.test(line)) return i;
  }
  return -1;
}

function imageAfterHeading(lines, headingLine) {
  for (let i = headingLine + 1; i < Math.min(lines.length, headingLine + 5); i += 1) {
    if (!lines[i].trim()) continue;
    return i;
  }
  return -1;
}

async function checkedWholeImage(runDir, context) {
  const source = await verifyWholeSource(runDir, context);
  const checked = await readJsonIfExists(path.join(runDir, "whole-article-checked.json"));
  const image = await readFile(path.join(runDir, "graphic-recording.png"));
  if (!checked || checked.version !== 1 || checked.status !== "image-checked"
    || checked.articlePath !== source.articlePath || checked.articleSha256 !== source.articleSha256
    || checked.imageSha256 !== sha256(image)) {
    throw new Error("Representative image has no matching inspection record; inspect the saved image and record --stage checked.");
  }
  validatePngBuffer(image);
  return image;
}

async function readGeneratedSections(runDir, requestedIds) {
  const todoPath = path.join(runDir, "TODO.md");
  const todoText = await readFile(todoPath, "utf8");
  const todo = parseTodo(todoText);
  const sectionsDir = path.join(runDir, "sections");
  const dirs = requestedIds.length > 0
    ? [...new Set(requestedIds)]
    : (await readdir(sectionsDir)).filter((name) => /^\d{3}$/u.test(name)).sort();
  const generated = [];
  for (const id of dirs) {
    const entry = todo.get(id);
    if (!entry) throw new Error(`TODO.md has no section ${id}.`);
    if (entry.status !== "image-checked") {
      throw new Error(`Section ${id} is ${entry.status}; image-checked is required before article publication.`);
    }
    const sourcePath = path.join(sectionsDir, id, "section-source.md");
    const imagePath = path.join(sectionsDir, id, "graphic-recording.png");
    const source = await readFile(sourcePath, "utf8");
    const sourceSections = extractSections(source, { includeFooter: true });
    if (sourceSections.length !== 1) throw new Error(`Section source ${id} is not a single section.`);
    const image = await readFile(imagePath);
    validatePngBuffer(image);
    generated.push({ id, title: sourceSections[0].title, source: sourceSections[0].content, imagePath, image });
  }
  return generated;
}

function chooseImagePath(lines, headingLine, fallbackName, owned, kind) {
  const existingLine = imageAfterHeading(lines, headingLine);
  const owner = owned.find((item) => item.kind === kind && item.link === lines[existingLine]);
  if (owner) {
    return { target: owner.target, replaceLine: existingLine };
  }
  return { target: `images/${fallbackName}`, replaceLine: -1 };
}

function makePlan({ article, runDir, placements, dryRun }) {
  const lines = [
    "# Article Image Placement Plan",
    "",
    `article: ${article}`,
    `run-dir: ${runDir}`,
    `mode: ${dryRun ? "dry-run" : "apply"}`,
    "",
    "## Placements",
    "",
  ];
  for (const placement of placements) {
    lines.push(`- ${placement.kind}: ${placement.title}`);
    lines.push(`  - source: ${placement.source}`);
    lines.push(`  - destination: ${placement.target}`);
    lines.push(`  - action: ${placement.replaceLine >= 0 ? "replace-existing-link" : "insert-after-heading"}`);
  }
  if (placements.length === 0) lines.push("- no image placements");
  lines.push("");
  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(usage); return; }
  if (!args.runDir || !args.article) throw new Error(usage);
  const runDir = path.resolve(args.runDir);
  const articlePath = path.resolve(args.article);
  const context = await readArticleContext(articlePath);
  const { article, manifest } = context;
  const articleDir = path.dirname(articlePath);
  const lines = article.split("\n");
  const articleSections = extractSections(context.source);
  const headingLines = sectionHeadingLineIndexes(article);
  const placements = [];

  if (args.mode === "whole-article" || args.mode === "both") {
    const wholePath = path.join(runDir, "graphic-recording.png");
    if (!(await exists(wholePath))) throw new Error(`Representative image is missing: ${wholePath}`);
    const image = await checkedWholeImage(runDir, context);
    const h1 = firstH1Line(lines);
    if (h1 < 0) throw new Error("Article has no H1 title for representative image placement.");
    const selected = chooseImagePath(lines, h1, "000.png", manifest.placements, "whole-article");
    placements.push({ kind: "whole-article", title: "article representative", source: wholePath, image, target: selected.target, replaceLine: selected.replaceLine, line: selected.replaceLine >= 0 ? selected.replaceLine : h1 + 1 });
  }

  if (args.mode === "sections" || args.mode === "both") {
    const generated = await readGeneratedSections(runDir, args.sections);
    const usedSectionIndexes = new Set();
    for (const item of generated) {
      const index = articleSections.findIndex((section, sectionIndex) =>
        !usedSectionIndexes.has(sectionIndex) &&
        section.title === item.title && normalizeContent(section.content) === normalizeContent(item.source)
      );
      if (index < 0) throw new Error(`Section ${item.id} does not match the current article: ${item.title}`);
      usedSectionIndexes.add(index);
      const heading = headingLines[index];
      if (!heading) throw new Error(`Could not locate heading for section ${item.id}: ${item.title}`);
      const fallbackName = `${String(index + 1).padStart(3, "0")}.png`;
      const selected = chooseImagePath(lines, heading.line, fallbackName, manifest.placements, `section-${item.id}`);
      placements.push({ kind: `section-${item.id}`, title: item.title, source: item.imagePath, image: item.image, target: selected.target, replaceLine: selected.replaceLine, line: selected.replaceLine >= 0 ? selected.replaceLine : heading.line + 1 });
    }
  }

  const resolvedPlacements = placements.map((placement) => {
    if (!safeImagePath(placement.target)) {
      throw new Error(`Refusing unsafe local image target: ${placement.target}`);
    }
    return {
      ...placement,
      destination: path.resolve(articleDir, placement.target),
    };
  });
  const destinations = new Set();
  for (const placement of resolvedPlacements) {
    if (destinations.has(placement.destination)) {
      throw new Error(`Multiple placements target the same image: ${placement.destination}`);
    }
    destinations.add(placement.destination);
    const existing = await exists(placement.destination);
    const owner = manifest.placements.find((item) => item.target === placement.target);
    if (existing && (!owner || placement.replaceLine < 0 || owner.sha256 !== sha256(await readFile(placement.destination)))) {
      throw new Error(`Refusing to replace an unmanaged or externally changed image: ${placement.destination}`);
    }
    if (existing && !args.overwrite) {
      throw new Error(`Destination exists; use --overwrite to replace it: ${placement.destination}`);
    }
  }

  const planPath = path.join(runDir, "article-image-placement-plan.md");
  await writeFile(planPath, makePlan({ article: articlePath, runDir, placements, dryRun: !args.apply }), "utf8");
  if (!args.apply) {
    process.stdout.write(`Plan written: ${planPath}\n`);
    return;
  }
  if (await readFile(articlePath, "utf8") !== article) throw new Error("Article changed during planning; retry from a fresh dry-run.");

  const nextLines = [...lines];
  const ordered = [...resolvedPlacements].sort((a, b) => b.line - a.line);
  for (const placement of ordered) {
    await mkdir(path.dirname(placement.destination), { recursive: true });
    await writeFile(placement.destination, placement.image, { flag: args.overwrite ? "w" : "wx" });
    const alt = placement.title.replaceAll("\\", "\\\\").replaceAll("[", "\\[").replaceAll("]", "\\]");
    const link = `![${alt}](${placement.target})`;
    if (placement.replaceLine >= 0) nextLines[placement.replaceLine] = link;
    else nextLines.splice(placement.line, 0, "", link, "");
    const previous = manifest.placements.find((item) => item.target === placement.target);
    const terminal = placement.replaceLine >= 0 ? Boolean(previous?.terminal) : placement.line === lines.length;
    manifest.placements = manifest.placements.filter((item) => item.target !== placement.target);
    manifest.placements.push({ kind: placement.kind, target: placement.target, link, sha256: sha256(placement.image), terminal });
  }
  await writeFile(articlePath, nextLines.join("\n"), "utf8");
  await writeFile(context.manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  process.stdout.write(`Applied ${placements.length} image placement(s).\nPlan written: ${planPath}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
