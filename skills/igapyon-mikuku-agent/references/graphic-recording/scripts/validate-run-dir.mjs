#!/usr/bin/env node

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const expectedFiles = [
  "section-source.md",
  "section-text.md",
  "image-prompt.md",
  "graphic-recording.png",
];

const usage = `Usage:
  node validate-run-dir.mjs --run-dir <run-output-dir>

Checks:
  TODO.md
  sections/<NNN>/
  section-source.md, section-text.md, image-prompt.md, graphic-recording.png
`;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--run-dir") {
      args.runDir = argv[++i];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

async function exists(filePath) {
  try {
    return await stat(filePath);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function parseTodo(todo) {
  const sections = new Map();
  for (const line of todo.split("\n")) {
    const match = line.match(/^- \[([ xX])\] (\d{3}): (.+) - (image-\S.*)\s*$/);
    if (match) {
      sections.set(match[2], {
        checked: match[1].toLowerCase() === "x",
        title: match[3],
        status: match[4],
      });
    }
  }
  return sections;
}

function formatMark(value) {
  return value ? "ok" : "missing";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(usage);
    return;
  }
  if (!args.runDir) {
    throw new Error(usage);
  }

  const runDir = path.resolve(args.runDir);
  const todoPath = path.join(runDir, "TODO.md");
  const sectionsDir = path.join(runDir, "sections");
  const todoStat = await exists(todoPath);
  const sectionsStat = await exists(sectionsDir);
  const warnings = [];
  let exitCode = 0;

  if (!todoStat?.isFile()) {
    warnings.push(`missing TODO.md: ${todoPath}`);
    exitCode = 1;
  }
  if (!sectionsStat?.isDirectory()) {
    warnings.push(`missing sections directory: ${sectionsDir}`);
    exitCode = 1;
  }

  const todoSections = todoStat?.isFile()
    ? parseTodo(await readFile(todoPath, "utf8"))
    : new Map();
  const sectionNames = sectionsStat?.isDirectory()
    ? (await readdir(sectionsDir)).filter((name) => /^\d{3}$/.test(name)).sort()
    : [];
  const allSectionIds = [...new Set([...todoSections.keys(), ...sectionNames])].sort();

  process.stdout.write(`# Graphic Recording Run Directory Check\n\n`);
  process.stdout.write(`run-dir: ${runDir}\n\n`);
  process.stdout.write(
    "| section | TODO status | section-source.md | section-text.md | image-prompt.md | graphic-recording.png |\n"
  );
  process.stdout.write("| --- | --- | --- | --- | --- | --- |\n");

  let previous = 0;
  for (const section of allSectionIds) {
    const n = Number(section);
    if (previous !== 0 && n !== previous + 1) {
      warnings.push(`section numbering gap before ${section}`);
      exitCode = 1;
    }
    previous = n;

    const todo = todoSections.get(section);
    const sectionDir = path.join(sectionsDir, section);
    const sectionStat = await exists(sectionDir);
    if (!todo) {
      warnings.push(`section ${section} exists on disk but is missing from TODO.md`);
      exitCode = 1;
    }
    if (!sectionStat?.isDirectory()) {
      warnings.push(`section ${section} is listed in TODO.md but directory is missing`);
      exitCode = 1;
    }

    const marks = [];
    for (const fileName of expectedFiles) {
      const fileStat = await exists(path.join(sectionDir, fileName));
      const ok = Boolean(fileStat?.isFile());
      marks.push(ok);
      if (fileName === "section-source.md" && !ok) {
        warnings.push(`section ${section} is missing section-source.md`);
        exitCode = 1;
      }
      if (todo?.status === "image-generated" && fileName === "graphic-recording.png" && !ok) {
        warnings.push(`section ${section} is image-generated in TODO.md but image is missing`);
        exitCode = 1;
      }
      if (todo?.status !== "image-generated" && fileName === "graphic-recording.png" && ok) {
        warnings.push(`section ${section} has graphic-recording.png but TODO status is ${todo?.status}`);
      }
    }

    process.stdout.write(
      `| ${section} | ${todo?.status ?? "missing"} | ${marks.map(formatMark).join(" | ")} |\n`
    );
  }

  if (warnings.length > 0) {
    process.stdout.write("\n## Warnings\n\n");
    for (const warning of warnings) {
      process.stdout.write(`- ${warning}\n`);
    }
  }

  process.exitCode = exitCode;
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
