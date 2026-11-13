import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";

export const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function safeImagePath(value) {
  return typeof value === "string" && /^images\/[^\s?#<>\\]+\.png$/u.test(value)
    && path.posix.normalize(value) === value;
}

export async function readJsonIfExists(file) {
  try { return JSON.parse(await readFile(file, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

// Only exact blocks installed by this helper are excluded from source comparison.
// Unmanaged illustrations, whitespace and all other article content remain input.
export async function readArticleContext(articlePath) {
  const article = await readFile(articlePath, "utf8");
  const manifestPath = `${articlePath}.graphic-recording.json`;
  const manifest = await readJsonIfExists(manifestPath) ?? { version: 1, placements: [] };
  if (manifest.version !== 1 || !Array.isArray(manifest.placements)) {
    throw new Error(`Invalid image ownership record: ${manifestPath}`);
  }
  let source = article;
  const targets = new Set();
  for (const item of manifest.placements) {
    if (!safeImagePath(item.target) || targets.has(item.target)
      || typeof item.kind !== "string" || !/^[a-f0-9]{64}$/u.test(item.sha256)
      || typeof item.link !== "string" || item.link.includes("\n")
      || !item.link.startsWith("![") || !item.link.endsWith(`](${item.target})`)) {
      throw new Error(`Invalid image ownership entry: ${manifestPath}`);
    }
    targets.add(item.target);
    const block = `\n\n${item.link}\n${item.terminal ? "" : "\n"}`;
    const start = source.indexOf(block);
    if (start < 0 || source.indexOf(block, start + 1) >= 0) {
      throw new Error(`Managed image block changed or duplicated; reconcile the article and ownership record: ${item.target}`);
    }
    source = source.slice(0, start) + (item.terminal ? "" : "\n") + source.slice(start + block.length);
  }
  return { article, source, manifest, manifestPath, articlePath: await realpath(articlePath) };
}

export async function verifyWholeSource(runDir, context) {
  const record = await readJsonIfExists(path.join(runDir, "whole-article-source.json"));
  if (!record || record.version !== 1 || record.articlePath !== context.articlePath
    || record.articleSha256 !== sha256(context.source)) {
    throw new Error("Whole-article source does not match this article; use a new run and capture its source before generation.");
  }
  return record;
}
