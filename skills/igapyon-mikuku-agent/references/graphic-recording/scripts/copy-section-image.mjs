#!/usr/bin/env node

import { copyFile, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const usage = `Usage:
  node copy-section-image.mjs --run-dir <run-output-dir> --section <NNN> --src <image-path> [--overwrite]

Copies:
  <image-path> -> <run-output-dir>/sections/<NNN>/graphic-recording.png

Also updates TODO.md for the section to image-generated.
`;

function parseArgs(argv) {
  const args = { overwrite: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--overwrite") {
      args.overwrite = true;
    } else if (arg === "--run-dir") {
      args.runDir = argv[++i];
    } else if (arg === "--section") {
      args.section = argv[++i];
    } else if (arg === "--src") {
      args.src = argv[++i];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function normalizeSection(section) {
  if (!/^\d+$/.test(section ?? "")) {
    throw new Error("--section must be a numeric section id such as 002.");
  }
  return section.padStart(3, "0");
}

async function assertExists(filePath, label) {
  try {
    return await stat(filePath);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`${label} does not exist: ${filePath}`);
    }
    throw error;
  }
}

function updateTodo(todo, section) {
  const lines = todo.split("\n");
  let updated = false;
  const next = lines.map((line) => {
    const match = line.match(new RegExp(`^- \\[[ xX]\\] ${section}: (.+?) - ([a-z0-9-]+)\\s*$`));
    if (!match) {
      return line;
    }
    updated = true;
    return `- [x] ${section}: ${match[1]} - image-generated`;
  });

  if (!updated) {
    throw new Error(`TODO.md does not contain a section line for ${section}.`);
  }

  return next.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(usage);
    return;
  }
  if (!args.runDir || !args.section || !args.src) {
    throw new Error(usage);
  }

  const runDir = path.resolve(args.runDir);
  const section = normalizeSection(args.section);
  const src = path.resolve(args.src);
  const sectionDir = path.join(runDir, "sections", section);
  const dest = path.join(sectionDir, "graphic-recording.png");
  const todoPath = path.join(runDir, "TODO.md");

  const sectionStat = await assertExists(sectionDir, "Section directory");
  if (!sectionStat.isDirectory()) {
    throw new Error(`Section path is not a directory: ${sectionDir}`);
  }
  const srcStat = await assertExists(src, "Source image");
  if (!srcStat.isFile()) {
    throw new Error(`Source image path is not a file: ${src}`);
  }
  try {
    await stat(dest);
    if (!args.overwrite) {
      throw new Error(`Destination already exists. Use --overwrite to replace it: ${dest}`);
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  const todo = await readFile(todoPath, "utf8");
  const nextTodo = updateTodo(todo, section);

  await copyFile(src, dest);
  await writeFile(todoPath, nextTodo, "utf8");

  process.stdout.write(`Copied ${src} -> ${dest}\nUpdated ${todoPath}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
