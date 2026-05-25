#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const usage = `Usage:
  node split-article-sections.mjs --article <article.md> --out <run-output-dir> [--mikuku-prompt <path>] [--force]

Creates:
  <run-output-dir>/TODO.md
  <run-output-dir>/sections/001/section-source.md
  <run-output-dir>/sections/002/section-source.md
  ...
`;

function parseArgs(argv) {
  const args = { force: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--force") {
      args.force = true;
    } else if (arg === "--article") {
      args.article = argv[++i];
    } else if (arg === "--out") {
      args.out = argv[++i];
    } else if (arg === "--mikuku-prompt") {
      args.mikukuPrompt = argv[++i];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function stripFrontMatter(markdown) {
  const lines = markdown.split("\n");
  const first = lines[0]?.trim();
  if (first !== "---" && first !== "+++") {
    return markdown;
  }

  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === first) {
      return lines.slice(i + 1).join("\n");
    }
  }
  return markdown;
}

function cleanHeadingTitle(line) {
  return line
    .replace(/^##[ \t]+/, "")
    .replace(/[ \t]+#+[ \t]*$/, "")
    .trim();
}

function extractSections(markdown) {
  const lines = stripFrontMatter(markdown).split("\n");
  const sections = [];
  let current = null;
  let inFence = false;
  let fenceMarker = null;

  for (const line of lines) {
    const fenceMatch = line.match(/^[ \t]{0,3}(```+|~~~+)/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (!inFence) {
        inFence = true;
        fenceMarker = marker;
      } else if (marker === fenceMarker) {
        inFence = false;
        fenceMarker = null;
      }
    }

    if (!inFence && /^##[ \t]+/.test(line) && !/^###[ \t]+/.test(line)) {
      if (current) {
        sections.push(current);
      }
      current = {
        title: cleanHeadingTitle(line),
        lines: [line],
      };
      continue;
    }

    if (current) {
      current.lines.push(line);
    }
  }

  if (current) {
    sections.push(current);
  }

  return sections
    .map((section) => ({
      title: section.title,
      content: section.lines.join("\n").replace(/\s+$/u, "") + "\n",
    }))
    .filter((section) => !isPublicMetadataSection(section.title));
}

function isPublicMetadataSection(title) {
  const normalized = title.replace(/\s+/gu, " ").trim();
  return new Set([
    "掲載先情報",
    "Note 掲載用属性情報",
    "Qiita 掲載用属性情報",
    "執筆担当",
    "想定読者",
    "使用ツール",
    "関連リンク",
  ]).has(normalized);
}

async function writeNewOrSame(filePath, content, force) {
  try {
    const existing = await readFile(filePath, "utf8");
    if (existing === content) {
      return "unchanged";
    }
    if (!force) {
      throw new Error(`Refusing to overwrite existing file with different content: ${filePath}`);
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  await writeFile(filePath, content, "utf8");
  return "written";
}

function buildTodo(articlePath, mikukuPrompt, sections) {
  const lines = [
    "# 見出し単位グラレコ画像 TODO",
    "",
    `記事: ${articlePath}`,
    `みくく描画プロンプト: ${mikukuPrompt}`,
    "",
    "## 進行状況",
    "",
  ];

  for (let i = 0; i < sections.length; i += 1) {
    const number = String(i + 1).padStart(3, "0");
    lines.push(`- [ ] ${number}: ${sections[i].title} - image-pending`);
  }

  lines.push(
    "",
    "## 出力ルール",
    "",
    "- 各セクションは `sections/<番号>/` に保存する",
    "- `section-source.md` は元記事から切り出した読み取りコピーとして扱う",
    "- 各セクションの基本ファイルは `section-source.md`、`section-text.md`、`image-prompt.md`、`graphic-recording.png` の4つ",
    "- 画像生成は別手順で実行し、成功したら TODO を `image-generated` に更新する",
    ""
  );

  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(usage);
    return;
  }
  if (!args.article || !args.out) {
    throw new Error(usage);
  }

  const articlePath = path.resolve(args.article);
  const outDir = path.resolve(args.out);
  const markdown = await readFile(articlePath, "utf8");
  const sections = extractSections(markdown);
  if (sections.length === 0) {
    throw new Error("No level-2 Markdown headings were found.");
  }

  await mkdir(path.join(outDir, "sections"), { recursive: true });

  for (let i = 0; i < sections.length; i += 1) {
    const number = String(i + 1).padStart(3, "0");
    const sectionDir = path.join(outDir, "sections", number);
    await mkdir(sectionDir, { recursive: true });
    await writeNewOrSame(
      path.join(sectionDir, "section-source.md"),
      sections[i].content,
      args.force
    );
  }

  const mikukuPrompt =
    args.mikukuPrompt ??
    "/Users/igapyon/Documents/git/igapyon-agent-skills/skills/igapyon-mikuku-agent/assets/mikuku/mikuku-portrait-short-prompt.md";
  await writeNewOrSame(
    path.join(outDir, "TODO.md"),
    buildTodo(articlePath, mikukuPrompt, sections),
    args.force
  );

  process.stdout.write(`Created ${sections.length} section source file(s) under ${outDir}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
