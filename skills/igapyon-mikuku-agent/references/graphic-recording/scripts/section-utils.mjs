#!/usr/bin/env node

/**
 * Shared Markdown section and TODO helpers for the graphic-recording workflow.
 * This module deliberately implements only the Markdown subset needed by the
 * workflow; it is not a general Markdown parser.
 */

export const footerSectionTitles = new Set([
  "掲載先情報",
  "Note 掲載用属性情報",
  "Qiita 掲載用属性情報",
  "関連する記事",
  "執筆担当",
  "想定読者",
  "使用ツール",
  "関連リンク",
  "参考",
  "参考リンク",
]);

export function normalizeHeadingTitle(title) {
  return title.replace(/\s+/gu, " ").trim();
}

export function isFooterSectionTitle(title) {
  return footerSectionTitles.has(normalizeHeadingTitle(title));
}

export function stripFrontMatter(markdown) {
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

function fenceAt(line) {
  const match = line.match(/^[ \t]{0,3}(`{3,}|~{3,})(.*)$/u);
  if (!match) {
    return null;
  }
  return {
    marker: match[1][0],
    length: match[1].length,
    rest: match[2],
    closing: match[2].trim() === "",
  };
}

export function extractSections(markdown, { includeFooter = false } = {}) {
  const lines = stripFrontMatter(markdown).split("\n");
  const sections = [];
  let current = null;
  let fence = null;

  for (const line of lines) {
    const candidate = fenceAt(line);
    if (candidate) {
      if (!fence) {
        fence = candidate;
      } else if (
        candidate.marker === fence.marker &&
        candidate.length >= fence.length &&
        candidate.closing
      ) {
        fence = null;
      }
    }

    if (!fence && /^##[ \t]+/u.test(line) && !/^###[ \t]+/u.test(line)) {
      if (current) {
        sections.push(current);
      }
      current = {
        title: normalizeHeadingTitle(
          line.replace(/^##[ \t]+/u, "").replace(/[ \t]+#+[ \t]*$/u, "")
        ),
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
    .filter((section) => includeFooter || !isFooterSectionTitle(section.title));
}

export function sectionHeadingLineIndexes(markdown, { includeFooter = false } = {}) {
  const originalLines = markdown.split("\n");
  const stripped = stripFrontMatter(markdown);
  const prefixLineCount = stripped === markdown
    ? 0
    : originalLines.findIndex((line, index) => index > 0 && line.trim() === originalLines[0]?.trim()) + 1;
  const lines = stripped.split("\n");
  const result = [];
  let fence = null;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const candidate = fenceAt(line);
    if (candidate) {
      if (!fence) fence = candidate;
      else if (candidate.marker === fence.marker && candidate.length >= fence.length && candidate.closing) fence = null;
    }
    if (!fence && /^##[ \t]+/u.test(line) && !/^###[ \t]+/u.test(line)) {
      const title = normalizeHeadingTitle(
        line.replace(/^##[ \t]+/u, "").replace(/[ \t]+#+[ \t]*$/u, "")
      );
      if (includeFooter || !isFooterSectionTitle(title)) {
        result.push({ title, line: i + prefixLineCount });
      }
    }
  }
  return result;
}

export function parseTodo(todo) {
  const sections = new Map();
  for (const line of todo.split("\n")) {
    const match = line.match(
      /^- \[([ xX])\] (\d{3}): (.+?) - (image-\S.*)\s*$/u
    );
    if (!match) continue;
    sections.set(match[2], {
      id: match[2],
      checked: match[1].toLowerCase() === "x",
      title: match[3],
      status: match[4],
      line,
    });
  }
  return sections;
}

export function buildTodo(articlePath, mikukuPrompt, sections) {
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
