#!/usr/bin/env node

import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { validatePngBuffer } from "./png-validation.mjs";
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

function imageLink(line) {
  const match = line.match(/^\s*!\[[^\]]*\]\(<?([^\s)>]+)>?(?:\s+["'][^)]*["'])?\)\s*$/u);
  return match?.[1] ?? null;
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
    return { line: i, path: imageLink(lines[i]) };
  }
  return { line: -1, path: null };
}

function selectedWholeStatus(runDir) {
  const candidates = [path.join(runDir, "image-generation-report.md"), path.join(runDir, "run-state.md")];
  return Promise.all(candidates.map(async (filePath) => {
    const file = await exists(filePath);
    return file ? readFile(filePath, "utf8") : "";
  })).then((texts) => texts.some((text) =>
    /status:\s*image-checked\b/u.test(text) ||
    (/whole-article-selected:\s*\S/u.test(text) && /current-status:\s*image-checked\b/u.test(text))
  ));
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
    generated.push({ id, title: sourceSections[0].title, source: sourceSections[0].content, imagePath });
  }
  return generated;
}

function chooseImagePath(lines, headingLine, fallbackName) {
  const existing = imageAfterHeading(lines, headingLine);
  if (existing.path && isSafeLocalImagePath(existing.path)) {
    return { target: existing.path, replaceLine: existing.line };
  }
  return { target: `images/${fallbackName}`, replaceLine: -1 };
}

function isSafeLocalImagePath(value) {
  if (!value || /[?#]/u.test(value) || /^(?:[a-z]+:|\/)/iu.test(value)) return false;
  const clean = value.split(/[?#]/u, 1)[0];
  const normalized = path.posix.normalize(clean.replaceAll("\\", "/"));
  return normalized === clean.replaceAll("\\", "/") && !normalized.startsWith("../") && normalized !== "..";
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
  const article = await readFile(articlePath, "utf8");
  const articleDir = path.dirname(articlePath);
  const lines = article.split("\n");
  const articleSections = extractSections(article);
  const headingLines = sectionHeadingLineIndexes(article);
  const placements = [];

  if (args.mode === "whole-article" || args.mode === "both") {
    const wholePath = path.join(runDir, "graphic-recording.png");
    if (!(await exists(wholePath))) throw new Error(`Representative image is missing: ${wholePath}`);
    if (!(await selectedWholeStatus(runDir))) {
      throw new Error("Representative image is not marked image-checked in the run record.");
    }
    validatePngBuffer(await readFile(wholePath));
    const h1 = firstH1Line(lines);
    if (h1 < 0) throw new Error("Article has no H1 title for representative image placement.");
    const selected = chooseImagePath(lines, h1, "000.png");
    placements.push({ kind: "whole-article", title: "article representative", source: wholePath, target: selected.target, replaceLine: selected.replaceLine, line: selected.replaceLine >= 0 ? selected.replaceLine : h1 + 1 });
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
      const selected = chooseImagePath(lines, heading.line, fallbackName);
      placements.push({ kind: `section-${item.id}`, title: item.title, source: item.imagePath, target: selected.target, replaceLine: selected.replaceLine, line: selected.replaceLine >= 0 ? selected.replaceLine : heading.line + 1 });
    }
  }

  const planPath = path.join(runDir, "article-image-placement-plan.md");
  await writeFile(planPath, makePlan({ article: articlePath, runDir, placements, dryRun: !args.apply }), "utf8");
  if (!args.apply) {
    process.stdout.write(`Plan written: ${planPath}\n`);
    return;
  }

  const resolvedPlacements = placements.map((placement) => {
    if (!isSafeLocalImagePath(placement.target)) {
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
    if (existing && !args.overwrite) {
      throw new Error(`Destination exists; use --overwrite to replace it: ${placement.destination}`);
    }
  }

  const nextLines = [...lines];
  const ordered = [...resolvedPlacements].sort((a, b) => b.line - a.line);
  for (const placement of ordered) {
    await mkdir(path.dirname(placement.destination), { recursive: true });
    await copyFile(placement.source, placement.destination);
    const link = `![${placement.title}](${placement.target.replaceAll(path.sep, "/")})`;
    if (placement.replaceLine >= 0) nextLines[placement.replaceLine] = link;
    else nextLines.splice(placement.line, 0, "", link, "");
  }
  await writeFile(articlePath, nextLines.join("\n"), "utf8");
  process.stdout.write(`Applied ${placements.length} image placement(s).\nPlan written: ${planPath}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
