#!/usr/bin/env node

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildTodo, extractSections, parseTodo } from "./section-utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultMikukuPrompt = path.resolve(
  scriptDir,
  "../../../assets/mikuku/mikuku-portrait-short-prompt.md"
);

const usage = `Usage:
  node split-article-sections.mjs --article <article.md> --out <run-output-dir> [--mikuku-prompt <path>]

Creates or resumes section-source.md files and TODO.md. Existing section
states are preserved. If an existing section changes or moves, use a new run
directory instead of overwriting the old one.
`;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--article") args.article = argv[++i];
    else if (arg === "--out") args.out = argv[++i];
    else if (arg === "--mikuku-prompt") args.mikukuPrompt = argv[++i];
    else if (arg === "--force") {
      throw new Error("--force is no longer supported for an existing run; use a new run directory.");
    } else throw new Error(`Unknown argument: ${arg}`);
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

async function writeIfMissing(filePath, content) {
  const existing = await exists(filePath);
  if (existing) {
    const current = await readFile(filePath, "utf8");
    if (current !== content) {
      throw new Error(
        `Existing section source differs; start a new run directory: ${filePath}`
      );
    }
    return;
  }
  await writeFile(filePath, content, "utf8");
}

function mergeTodo(existingTodoText, sections) {
  const existing = [...parseTodo(existingTodoText).values()].sort((a, b) =>
    a.id.localeCompare(b.id)
  );
  if (existing.length > sections.length) {
    throw new Error(
      "Existing run has removed or reordered sections; start a new run directory."
    );
  }

  for (let i = 0; i < existing.length; i += 1) {
    if (existing[i].title !== sections[i].title) {
      throw new Error(
        `Existing section ${existing[i].id} changed from "${existing[i].title}" to "${sections[i].title}"; start a new run directory.`
      );
    }
  }
  if (existing.length === sections.length) return existingTodoText;

  const lines = existingTodoText.split("\n");
  const sectionLineIndexes = [];
  lines.forEach((line, index) => {
    if (/^- \[[ xX]\] \d{3}: /u.test(line)) sectionLineIndexes.push(index);
  });
  const insertion = [];
  for (let i = existing.length; i < sections.length; i += 1) {
    const number = String(i + 1).padStart(3, "0");
    insertion.push(`- [ ] ${number}: ${sections[i].title} - image-pending`);
  }
  const lastSectionLine = sectionLineIndexes.at(-1);
  if (lastSectionLine === undefined) {
    const outputHeading = lines.findIndex((line) => line.trim() === "## 出力ルール");
    if (existing.length === 0 && outputHeading >= 0) {
      lines.splice(outputHeading, 0, ...insertion, "");
      return lines.join("\n");
    }
    throw new Error("Existing TODO.md has no section status lines; start a new run directory.");
  }
  lines.splice(lastSectionLine + 1, 0, ...insertion);
  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(usage);
    return;
  }
  if (!args.article || !args.out) throw new Error(usage);

  const articlePath = path.resolve(args.article);
  const outDir = path.resolve(args.out);
  const mikukuPrompt = path.resolve(args.mikukuPrompt ?? defaultMikukuPrompt);
  const markdown = await readFile(articlePath, "utf8");
  const sections = extractSections(markdown);
  const todoPath = path.join(outDir, "TODO.md");
  const existingTodo = await exists(todoPath);

  await mkdir(path.join(outDir, "sections"), { recursive: true });
  for (let i = 0; i < sections.length; i += 1) {
    const number = String(i + 1).padStart(3, "0");
    const sectionDir = path.join(outDir, "sections", number);
    await mkdir(sectionDir, { recursive: true });
    await writeIfMissing(path.join(sectionDir, "section-source.md"), sections[i].content);
  }

  if (!existingTodo) {
    await writeFile(todoPath, buildTodo(articlePath, mikukuPrompt, sections), "utf8");
  } else {
    const oldTodo = await readFile(todoPath, "utf8");
    const nextTodo = mergeTodo(oldTodo, sections);
    if (nextTodo !== oldTodo) await writeFile(todoPath, nextTodo, "utf8");
  }

  process.stdout.write(`Prepared ${sections.length} section source file(s) under ${outDir}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
