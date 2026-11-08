import { createHash } from "node:crypto";
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { jstTimestamp } from "./miku-scm-jst-time.mjs";
import { relativeOperationalPath } from "./miku-scm-operational-path.mjs";

export function normalizedDraftText(content) {
  return content.replace(/\r\n?/g, "\n");
}

export async function resolveIssueDraft(options, directoryName, pattern, prefix, issueNumber = null) {
  const root = await realpath(path.resolve(options.root));
  const source = await realpath(path.resolve(root, options.draft));
  const content = await readFile(source, "utf8");
  const digest = createHash("sha256").update(content).digest("hex");
  const directory = path.join(root, "workplace", "miku-scm", directoryName);
  const relative = path.relative(directory, source);
  const match = !relative.includes(path.sep) && pattern.exec(relative);
  const conventional = match && (issueNumber === null || Number(match[1]) === issueNumber);
  let draft = source;
  const warnings = [];
  if (content.includes("\r")) warnings.push("CRLF/CR line endings detected; using LF for submitted text and retaining the source bytes.");
  if (!conventional) {
    await mkdir(directory, { recursive: true });
    const actualDirectory = await realpath(directory);
    if (path.relative(root, actualDirectory).startsWith("..")) throw new Error("Internal draft directory escapes the repository");
    draft = path.join(actualDirectory, `${prefix}-${jstTimestamp(new Date())}-${BigInt(`0x${digest.slice(0, 12)}`)}.md`);
    try { await writeFile(draft, content, { encoding: "utf8", flag: "wx", mode: 0o600 }); }
    catch (error) {
      if (error.code !== "EEXIST" || await readFile(draft, "utf8") !== content) throw error;
    }
    warnings.push("Draft location or name differs from the convention; imported a working copy and retained the source.");
  }
  const text = normalizedDraftText(content);
  const normalizedDigest = createHash("sha256").update(text).digest("hex");
  return { root, draft, relativeDraft: relativeOperationalPath(root, draft), content, text, digest, normalizedDigest, warnings };
}
