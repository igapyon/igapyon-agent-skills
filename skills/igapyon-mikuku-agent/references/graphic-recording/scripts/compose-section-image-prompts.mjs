#!/usr/bin/env node

import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultMikukuPrompt = path.resolve(
  scriptDir,
  "../../../assets/mikuku/mikuku-portrait-short-prompt.md"
);

const usage = `Usage:
  node compose-section-image-prompts.mjs --run-dir <run-output-dir> [--mikuku-prompt <path>] [--section <NNN>] [--overwrite]

Creates:
  <run-output-dir>/sections/<NNN>/image-prompt.md

Inputs:
  <run-output-dir>/sections/<NNN>/section-text.md
  <mikuku-prompt> (default: <skill-dir>/assets/mikuku/mikuku-portrait-short-prompt.md)
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
    } else if (arg === "--mikuku-prompt") {
      args.mikukuPrompt = argv[++i];
    } else if (arg === "--section") {
      args.section = normalizeSection(argv[++i]);
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

async function readTodoTitles(runDir) {
  const todoPath = path.join(runDir, "TODO.md");
  const todoStat = await exists(todoPath);
  if (!todoStat?.isFile()) {
    return new Map();
  }

  const titles = new Map();
  const todo = await readFile(todoPath, "utf8");
  for (const line of todo.split("\n")) {
    const match = line.match(/^- \[[ xX]\] (\d{3}): (.+?) - [a-z0-9-]+/);
    if (match) {
      titles.set(match[1], match[2]);
    }
  }
  return titles;
}

async function discoverSections(runDir, requestedSection) {
  if (requestedSection) {
    return [requestedSection];
  }

  const sectionsDir = path.join(runDir, "sections");
  const sectionsStat = await exists(sectionsDir);
  if (!sectionsStat?.isDirectory()) {
    throw new Error(`Sections directory does not exist: ${sectionsDir}`);
  }

  return (await readdir(sectionsDir)).filter((name) => /^\d{3}$/.test(name)).sort();
}

async function writeNewOrSame(filePath, content, overwrite) {
  try {
    const existing = await readFile(filePath, "utf8");
    if (existing === content) {
      return "unchanged";
    }
    if (!overwrite) {
      return "skipped-existing";
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  await writeFile(filePath, content, "utf8");
  return "written";
}

function buildImagePrompt({ section, title, sectionText, mikukuPromptPath, mikukuPromptText }) {
  return `# Section Graphic Recording Image Prompt

## Source

- section: ${section}
- title: ${title}
- section-text: sections/${section}/section-text.md
- mikuku-prompt: ${mikukuPromptPath}

## Task

Create a horizontal Japanese graphic recording explainer image for this section.
Use only the section summary below as the explanation source. Do not mix in other article sections.

## Section Summary

${sectionText.trim()}

## Mikuku Canonical Character Prompt

${mikukuPromptText.trim()}

## Character Identity Rules

- same character
- do not redesign
- preserve character identity
- canonical character prompt
- keep Mikuku's face shape, eye style, hair style, hair color, twin tails, hair accessories, and gentle bright anime technical-explainer impression

## Visual Direction

- みくくがこのセクションを説明している構図
- セクション見出しを主題にした横長ポスター構図
- 記事内容や説明対象の配置に合わせて、みくくの顔の向きや視線方向を調整してよい
- 手描きグラレコ風
- ホワイトボード解説風
- 図解、矢印、囲み、アイコンを使う
- セクション本文に基づく重要語だけを使う
- みくくの短い吹き出しを入れる
- 日本語ラベルは短く、少数に絞る
- 長文を画像内に入れすぎない
- 明るく清潔で、Note.com や技術記事に合うビジュアル
- 写実寄り、暗い色味、無機質な企業プレゼン風は避ける
- みくくに物を持たせない

## Image Text Policy

- 画像内テキストは section summary の語句を短く整理して使う
- 本文の長い文をそのまま入れない
- 文字が崩れても、元記事や section-text.md は変更しない

## Output Target

Save the generated image as:

\`\`\`text
sections/${section}/graphic-recording.png
\`\`\`
`;
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
  const mikukuPromptPath = path.resolve(args.mikukuPrompt ?? defaultMikukuPrompt);
  const mikukuPromptText = await readFile(mikukuPromptPath, "utf8");
  const titles = await readTodoTitles(runDir);
  const sections = await discoverSections(runDir, args.section);
  const results = [];

  for (const section of sections) {
    const sectionDir = path.join(runDir, "sections", section);
    const sectionTextPath = path.join(sectionDir, "section-text.md");
    const imagePromptPath = path.join(sectionDir, "image-prompt.md");
    const sectionTextStat = await exists(sectionTextPath);

    if (!sectionTextStat?.isFile()) {
      results.push(`${section}: skipped section-text-missing`);
      continue;
    }

    const sectionText = await readFile(sectionTextPath, "utf8");
    const title = titles.get(section) ?? `(section ${section})`;
    const imagePrompt = buildImagePrompt({
      section,
      title,
      sectionText,
      mikukuPromptPath,
      mikukuPromptText,
    });
    const result = await writeNewOrSame(imagePromptPath, imagePrompt, args.overwrite);
    results.push(`${section}: ${result}`);
  }

  process.stdout.write(`${results.join("\n")}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
