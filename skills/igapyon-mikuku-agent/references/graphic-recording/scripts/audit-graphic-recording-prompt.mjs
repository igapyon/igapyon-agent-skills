#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const usage = `Usage:
  node audit-graphic-recording-prompt.mjs --run-dir <run-output-dir> [options]

Options:
  --graphic-text <path>   defaults to <run-dir>/graphic-recording-text.md
  --image-prompt <path>   defaults to <run-dir>/image-prompt.md
  --out <path>            defaults to <run-dir>/prompt-audit.md
`;

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--run-dir") {
      args.runDir = argv[++index];
    } else if (arg === "--graphic-text") {
      args.graphicText = argv[++index];
    } else if (arg === "--image-prompt") {
      args.imagePrompt = argv[++index];
    } else if (arg === "--out") {
      args.out = argv[++index];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function normalize(value) {
  return value
    .normalize("NFKC")
    .replace(/[「」『』“”"'`*_]/gu, "")
    .replace(/[。、，,.:：;；!?！？()（）[\]{}]/gu, "")
    .replace(/\s+/gu, "")
    .toLowerCase();
}

function sha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function sectionBody(markdown, heading) {
  const headingPattern = new RegExp(`^##\\s+${heading}\\s*$`, "mu");
  const match = headingPattern.exec(markdown);
  if (!match) return "";
  const start = match.index + match[0].length;
  const next = markdown.slice(start).search(/^##\s+/mu);
  return markdown.slice(start, next < 0 ? undefined : start + next);
}

function bulletValues(markdown, heading) {
  return sectionBody(markdown, heading)
    .split("\n")
    .map((line) => line.match(/^\s*[-*]\s+(.+?)\s*$/u)?.[1]?.trim())
    .filter((value) => value && value !== "該当なし");
}

function fieldValue(markdown, field) {
  const body = sectionBody(markdown, "グラレコ構図案");
  return body
    .split("\n")
    .map((line) => line.match(new RegExp(`^\\s*[-*]\\s*${field}\\s*:\\s*(.*?)\\s*$`, "u"))?.[1])
    .find((value) => value !== undefined)?.trim() ?? "";
}

function addCheck(checks, status, name, detail) {
  checks.push({ status, name, detail });
}

function auditPrompt({ graphicText, imagePrompt }) {
  const checks = [];
  const title = graphicText.match(/^#\s+(.+?)\s*$/mu)?.[1]?.trim() ?? "";
  const keywords = bulletValues(graphicText, "図解キーワード");
  const bubble = fieldValue(graphicText, "吹き出し");
  const promptNormalized = normalize(imagePrompt);
  const sourceNormalized = normalize(graphicText);

  if (!title) {
    addCheck(checks, "error", "source-title", "graphic-recording-text.md に記事全体の題名がありません。");
  } else if (!promptNormalized.includes(normalize(title))) {
    addCheck(checks, "error", "title-preserved", `題名「${title}」が image-prompt.md にありません。`);
  } else {
    addCheck(checks, "pass", "title-preserved", `題名「${title}」を保持しています。`);
  }

  for (const requiredSection of ["主題", "図解キーワード", "関係・流れ・対比", "図解構造", "役割分担・判断軸", "グラレコ構図案", "正確性メモ", "共通スタイル契約", "変更（deviation）"]) {
    const present = graphicText.includes(`## ${requiredSection}`);
    addCheck(checks, present ? "pass" : "error", `source-section-${requiredSection}`, present ? `${requiredSection} を確認しました。` : `graphic-recording-text.md に ${requiredSection} がありません。`);
  }

  for (const requiredField of ["左", "中央", "右", "最も大きく見せる主図", "みくくの表情・視線", "吹き出し"]) {
    const value = fieldValue(graphicText, requiredField);
    addCheck(checks, value ? "pass" : "error", `layout-${requiredField}`, value ? `${requiredField} を保持しています。` : `グラレコ構図案の ${requiredField} がありません。`);
  }

  const promptSections = [
    [/^##\s+Style Contract\s*$/mu, "prompt-style-contract"],
    [/^##\s+Article-specific Design\s*$/mu, "prompt-article-design"],
    [/^##\s+Deviation Record\s*$/mu, "prompt-deviation-record"],
  ];
  for (const [pattern, name] of promptSections) {
    addCheck(checks, pattern.test(imagePrompt) ? "pass" : "error", name, pattern.test(imagePrompt) ? "最終プロンプトの区分があります。" : "Style Contract / Article-specific Design / Deviation Record の区分が不足しています。");
  }

  const structurePresent = /^##\s+図解構造\s*$/mu.test(graphicText);
  const layoutFamilyPresent = /layout-family\s*:/iu.test(graphicText) && /layout-family\s*:/iu.test(imagePrompt);
  const primaryRelationPresent = /primary-relation\s*:/iu.test(graphicText) && /primary-relation\s*:/iu.test(imagePrompt);
  addCheck(checks, structurePresent && layoutFamilyPresent ? "pass" : "error", "layout-family-preservation", structurePresent && layoutFamilyPresent ? "図解構造の layout-family を保持しています。" : "図解構造の layout-family が不足しています。");
  addCheck(checks, structurePresent && primaryRelationPresent ? "pass" : "error", "primary-relation-preservation", structurePresent && primaryRelationPresent ? "図解構造の primary-relation を保持しています。" : "図解構造の primary-relation が不足しています。");

  const styleChecks = [
    [/3\s*:\s*2|3\/2/u, "aspect-ratio", "3:2 の横長比率"],
    [/横長|horizontal/iu, "horizontal-layout", "横長構図"],
    [/ベージュ|暖色|warm|beige/iu, "warm-paper", "暖色・ベージュ紙"],
    [/手描き|hand[- ]drawn|graphic recording/iu, "hand-drawn-style", "手描きグラレコ"],
    [/物を持たせない|do not let mikuku hold|no objects/iu, "no-objects", "みくくの持ち物なし"],
    [/みくく|mikuku/iu, "character-present", "みくくの明示"],
  ];
  for (const [pattern, name, label] of styleChecks) {
    addCheck(checks, pattern.test(imagePrompt) ? "pass" : "error", name, pattern.test(imagePrompt) ? `${label}を確認しました。` : `${label}の指示がありません。`);
  }

  const requiredKeywordCount = Math.min(3, keywords.length);
  const preservedKeywords = keywords.filter((keyword) => promptNormalized.includes(normalize(keyword)));
  if (preservedKeywords.length < requiredKeywordCount) {
    addCheck(checks, "error", "keyword-preservation", `図解キーワードを${requiredKeywordCount}語以上、正確に保持してください（保持: ${preservedKeywords.length}語）。`);
  } else {
    addCheck(checks, "pass", "keyword-preservation", `図解キーワード ${preservedKeywords.length}/${keywords.length} 語を保持しています。`);
  }
  const omittedKeywords = keywords.filter((keyword) => !promptNormalized.includes(normalize(keyword)));
  if (omittedKeywords.length > 0) {
    addCheck(checks, "warn", "keyword-omissions", `未出現のキーワード: ${omittedKeywords.join("、")}`);
  }

  const normalizedBubble = normalize(bubble.replace(/^該当なし.*$/u, ""));
  const bubbleUnavailable = !bubble || /^該当なし/u.test(bubble);
  const bubbleContradiction = /no\s+speech\s+bubble|without\s+(?:a\s+)?speech\s+bubble|吹き出し\s*(?:なし|無し)|吹き出しを?削除|speech\s+bubble.*(?:omit|remove)/iu.test(imagePrompt);
  if (!bubbleUnavailable && normalizedBubble && !promptNormalized.includes(normalizedBubble)) {
    addCheck(checks, "error", "speech-bubble-preservation", "グラレコ構図案の吹き出し文が最終プロンプトにありません。");
  } else if (!bubbleUnavailable) {
    addCheck(checks, "pass", "speech-bubble-preservation", "吹き出し文を保持しています。");
  } else {
    addCheck(checks, "warn", "speech-bubble-source", "吹き出しが該当なしです。理由を Deviation Record に残してください。");
  }
  if (bubbleContradiction && !/^##\s+Deviation Record[\s\S]*?(?:吹き出し|speech bubble)[\s\S]*?(?:理由|reason)/imu.test(imagePrompt)) {
    addCheck(checks, "error", "speech-bubble-contradiction", "吹き出しを外す指示がありますが、理由付きの deviation がありません。");
  } else if (bubbleContradiction) {
    addCheck(checks, "warn", "speech-bubble-contradiction", "吹き出しの変更を deviation として記録しています。");
  }

  const unsafeSizeText = imagePrompt
    .split("\n")
    .filter((line) => !/極端に小さくしない|not\s+(?:make|draw)\s+(?:Mikuku\s+)?tiny|avoid\s+(?:a\s+)?tiny/iu.test(line))
    .join("\n");
  const tinyCharacter = /at\s+most\s+12\s*%|12\s*%\s*以下|tiny\s+Mikuku|Mikuku.*\b(?:tiny|very small)\b|小さな\s*(?:みくく|Mikuku)\s*だけ|みくくを?\s*(?:極端に小さく|登場させない)/iu.test(unsafeSizeText);
  if (tinyCharacter) {
    addCheck(checks, "error", "character-scale-contradiction", "みくくを極端に小さくする、または省く指示があります。deviation が必要です。");
  } else {
    addCheck(checks, "pass", "character-scale-contradiction", "みくくの極端な縮小・省略指示はありません。");
  }

  const status = checks.some((check) => check.status === "error") ? "fail" : checks.some((check) => check.status === "warn") ? "pass-with-warnings" : "pass";
  return { status, checks, sourceHash: sha256(graphicText), promptHash: sha256(imagePrompt), sourceLength: graphicText.length, promptLength: imagePrompt.length };
}

function reportMarkdown({ result, graphicTextPath, imagePromptPath }) {
  const lines = [
    "# Graphic Recording Prompt Audit",
    "",
    `- status: ${result.status}`,
    `- graphic-recording-text: ${graphicTextPath}`,
    `- image-prompt: ${imagePromptPath}`,
    `- source-sha256: ${result.sourceHash}`,
    `- prompt-sha256: ${result.promptHash}`,
    `- source-length: ${result.sourceLength}`,
    `- prompt-length: ${result.promptLength}`,
    "",
    "## Checks",
    "",
  ];
  for (const check of result.checks) {
    lines.push(`- ${check.status.toUpperCase()}: ${check.name} — ${check.detail}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(usage);
    return;
  }
  if (!args.runDir) throw new Error(usage);
  const runDir = path.resolve(args.runDir);
  const graphicTextPath = path.resolve(args.graphicText ?? path.join(runDir, "graphic-recording-text.md"));
  const imagePromptPath = path.resolve(args.imagePrompt ?? path.join(runDir, "image-prompt.md"));
  const outPath = path.resolve(args.out ?? path.join(runDir, "prompt-audit.md"));
  const [graphicText, imagePrompt] = await Promise.all([
    readFile(graphicTextPath, "utf8"),
    readFile(imagePromptPath, "utf8"),
  ]);
  const result = auditPrompt({ graphicText, imagePrompt });
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, reportMarkdown({ result, graphicTextPath, imagePromptPath }), "utf8");
  process.stdout.write(`status: ${result.status}\nreport: ${outPath}\n`);
  if (result.status === "fail") process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}

export { auditPrompt, reportMarkdown };
