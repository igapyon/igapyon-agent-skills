import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { parseFrontMatter } from "./day-plan.mjs";
import {
  activityPath as canonicalActivityPath,
  assertUniqueRecordPaths,
  listCanonicalRecordFiles,
  parseRecordPath,
  resolveRecordPath,
  validateIsoDate,
} from "./record-paths.mjs";

export const ACTIVITY_FILENAME_PATTERN = /^activity-(\d{8})([a-z]+)?\.md$/;
const FIRST_ACTIVITY_SUFFIX = "aaa";
const PREVIOUS_LABEL = "前回の記録 →";

export function nextActivitySuffix(suffix = "") {
  if (!/^[a-z]*$/.test(suffix)) throw new Error("Activity suffix must contain lowercase a-z only");
  // Legacy short names remain valid, but every new allocation starts at three letters.
  if (suffix.length < FIRST_ACTIVITY_SUFFIX.length) return FIRST_ACTIVITY_SUFFIX;
  const letters = [...suffix];
  let index = letters.length - 1;
  while (index >= 0 && letters[index] === "z") letters[index--] = "a";
  if (index < 0) letters.unshift("a");
  else letters[index] = String.fromCharCode(letters[index].charCodeAt(0) + 1);
  return letters.join("");
}

export function compareActivitySuffixes(left, right) {
  return left.length - right.length || left.localeCompare(right);
}

export function activityPath(date, suffix) {
  return canonicalActivityPath(date, suffix);
}

function parseActivityPath(relativePath) {
  const parsed = parseRecordPath(relativePath);
  if (parsed.type !== "activity") throw new Error(`Invalid activity path: ${relativePath}`);
  return { date: parsed.date, suffix: parsed.suffix };
}

export function validateActivityRecord(relativePath, text) {
  const record = parseActivityPath(relativePath);
  const { frontMatter } = parseFrontMatter(text, relativePath);
  if (frontMatter.type !== "activity" || frontMatter.date !== record.date) {
    throw new Error(`Activity path, type and date must agree: ${relativePath}`);
  }
  return record;
}

export const activityHash = (content) => createHash("sha256").update(content).digest("hex");

export function readActivityInput({ file, stdin }) {
  if (Boolean(file) === Boolean(stdin)) throw new Error("Specify exactly one of --stdin or --file DRAFT.md");
  return fs.readFileSync(stdin ? 0 : file, "utf8");
}

function activityError(code, message, details = {}) {
  return Object.assign(new Error(message), { code, ...details });
}

function activityTarget(repoRoot, relativePath) {
  parseActivityPath(relativePath);
  return resolveRecordPath(repoRoot, relativePath);
}

function readCurrentActivity(repoRoot, relativePath) {
  const destination = activityTarget(repoRoot, relativePath);
  try {
    const stat = fs.lstatSync(destination);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      throw activityError("PATH_OUTSIDE_REPO", "Activity must be a regular file", { path: relativePath });
    }
    const content = fs.readFileSync(destination);
    return { destination, content, sha256: activityHash(content) };
  } catch (error) {
    if (error.code === "ENOENT") {
      throw activityError("ACTIVITY_UPDATE_CONFLICT", "Activity disappeared; reread before updating", { path: relativePath });
    }
    throw error;
  }
}

// Return the exact snapshot whose hash must accompany a later update.
export function readActivity({ repoRoot, path: relativePath }) {
  const current = readCurrentActivity(repoRoot, relativePath);
  const content = current.content.toString("utf8");
  validateActivityRecord(relativePath, content);
  return { path: relativePath, sha256: current.sha256, content };
}

function paragraphBoundary(line) {
  return !line?.trim() || /^ {0,3}#{1,6}(?:[ \t]|$)/.test(line);
}

function isThematicBreak(line) {
  return /^ {0,3}(?:(?:\*[ \t]*){3,}|(?:_[ \t]*){3,}|(?:-[ \t]*){3,})$/.test(line);
}

function startsContainer(line, afterParagraph) {
  if (/^ {0,3}>/.test(line)) return true;
  // An interrupting list needs a nonempty item and any numbering must start at 1.
  return afterParagraph
    ? /^ {0,3}(?:[-+*]|0{0,8}1[.)])[ \t]+\S/.test(line)
    : /^ {0,3}(?:[-+*]|\d{1,9}[.)])(?:[ \t]|$)/.test(line);
}

function startsBlockAfterParagraph(line) {
  // Uninterrupted dashes turn the link line into a heading, so the link is no longer a paragraph.
  return paragraphBoundary(line) || startsContainer(line, true)
    || (isThematicBreak(line) && !/^ {0,3}-+[ \t]*$/.test(line));
}

function* proseLines(body) {
  const lines = body.split(/\r?\n/);
  let fence = "";
  let htmlEnd = null;
  for (const [index, line] of lines.entries()) {
    const marker = /^ {0,3}(\x60{3,}|~{3,})(.*)$/.exec(line);
    if (fence) {
      if (marker && marker[1].startsWith(fence) && !marker[2].trim()) fence = "";
      continue;
    }
    if (htmlEnd) {
      if (htmlEnd.test(line)) htmlEnd = null;
      continue;
    }
    const htmlStart = /^ {0,3}(?:<!--|<(pre|script|style|textarea)(?=[ \t>]|$))/i.exec(line);
    if (htmlStart) {
      const close = htmlStart[1] ? new RegExp("</" + htmlStart[1] + ">", "i") : /-->/;
      if (!close.test(line.slice(htmlStart[0].length))) htmlEnd = close;
      continue;
    }
    if (marker && (marker[1][0] === "~" || !marker[2].includes("\x60"))) {
      fence = marker[1];
      continue;
    }
    yield { line, index };
  }
}

function* activityLines(body) {
  let previousIndex = -2;
  let paragraph = [];
  let inContainer = false;
  for (const { line, index } of proseLines(body)) {
    if (index !== previousIndex + 1) {
      paragraph = [];
      inContainer = false;
    }
    previousIndex = index;
    const underline = /^ {0,3}(=+|-+)[ \t]*$/.exec(line);
    const setext = Boolean(underline && paragraph.length);
    const atxTitle = /^ {0,3}#[ \t]+(.+)$/.exec(line)?.[1].trim();
    const title = setext && underline[1][0] === "=" ? paragraph.join(" ") : atxTitle;
    const endsBlock = setext || paragraphBoundary(line) || isThematicBreak(line);
    if (endsBlock) {
      paragraph = [];
      inContainer = false;
    } else if (startsContainer(line, paragraph.length > 0)) {
      paragraph = [];
      inContainer = true;
    } else if (!inContainer && (paragraph.length || /^ {0,3}\S/.test(line))) {
      paragraph.push(line.trim());
    }
    yield { line, index, endsBlock, title };
  }
}

export function activityTitle(body, relativePath) {
  for (const { title } of activityLines(body)) {
    if (title) return title;
  }
  return path.posix.basename(relativePath, ".md");
}

export function previousActivityPath(body, relativePath) {
  const prose = [...activityLines(body)];
  const declarations = prose.filter(({ line, index }, offset) => {
    if (!line.startsWith(PREVIOUS_LABEL)) return false;
    const before = prose[offset - 1];
    const after = prose[offset + 1];
    return (before?.index !== index - 1 || before.endsBlock)
      && (after?.index !== index + 1 || startsBlockAfterParagraph(after.line));
  });
  if (!declarations.length) return null;
  const invalidLink = (message, target) =>
    activityError("INVALID_PREVIOUS_ACTIVITY", message, { path: relativePath, target });
  if (declarations.length > 1) throw invalidLink("Activity has multiple previous-record links");

  const link = /^前回の記録 → \[([^\]]+)\]\(([^)]+)\)[ \t]*$/.exec(declarations[0].line);
  if (!link) throw invalidLink("Invalid previous-record link");
  const [, label, href] = link;
  if (!/^[a-zA-Z0-9._/-]+$/.test(href) || path.posix.isAbsolute(href)) {
    throw invalidLink("Previous-record link must use a relative Markdown path", href);
  }
  const target = path.posix.join(path.posix.dirname(relativePath), href);
  try { parseActivityPath(target); }
  catch { throw invalidLink("Previous-record link must resolve to a daybook activity", target); }
  if (label !== path.posix.basename(target, ".md")) {
    throw invalidLink("Previous-record label must match the activity filename", target);
  }
  return target;
}

function addPreviousActivity({ repoRoot, relativePath, previous, content }) {
  readActivity({ repoRoot, path: previous });
  const existing = previousActivityPath(parseFrontMatter(content).body, relativePath);
  if (existing === previous) return content;
  if (existing) {
    throw activityError("INVALID_PREVIOUS_ACTIVITY", "Draft already links to a different previous activity");
  }
  const label = path.posix.basename(previous, ".md");
  const href = path.posix.relative(path.posix.dirname(relativePath), previous);
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const updated = content.replace(/(?:\r?\n[ \t]*)*$/, "")
    + newline.repeat(2) + PREVIOUS_LABEL + " [" + label + "](" + href + ")" + newline;
  if (previousActivityPath(parseFrontMatter(updated).body, relativePath) !== previous) {
    throw activityError("INVALID_PREVIOUS_ACTIVITY", "Could not place the previous-record link outside a code block or raw HTML");
  }
  return updated;
}

export function updateActivity({ repoRoot, path: relativePath, expectedSha256, content }) {
  parseActivityPath(relativePath);
  if (typeof expectedSha256 !== "string" || !/^[a-f0-9]{64}$/.test(expectedSha256)) {
    throw new Error("--expected-sha256 must be the SHA-256 returned with the original activity snapshot");
  }
  validateActivityRecord(relativePath, content);
  // Reread immediately before saving. This detects intervening edits, not simultaneous writes.
  const current = readCurrentActivity(repoRoot, relativePath);
  if (current.sha256 !== expectedSha256) {
    throw activityError("ACTIVITY_UPDATE_CONFLICT", "Activity changed; reread and reconsider the update", { path: relativePath });
  }
  fs.writeFileSync(current.destination, content, "utf8");
  return { path: relativePath, sha256: activityHash(content) };
}

function activityDirectory(repoRoot, date, create = false) {
  const candidate = canonicalActivityPath(date, FIRST_ACTIVITY_SUFFIX);
  return path.dirname(resolveRecordPath(repoRoot, candidate, { createParents: create }));
}

export function nextActivityPath(repoRoot, date, { reservedPaths = [], gitLog } = {}) {
  validateIsoDate(date);
  const records = listCanonicalRecordFiles(repoRoot, ["activity"]);
  assertUniqueRecordPaths(records);
  const usedPaths = [...reservedPaths, ...records.map((entry) => entry.relativePath)];
  const warnings = [];
  try {
    const compactDate = date.replaceAll("-", "");
    const year = date.slice(0, 4);
    const month = compactDate.slice(0, 6);
    const currentPathspec = `:(glob)activities/${year}/${month}/${compactDate}/activity-${compactDate}*.md`;
    const legacyPathspec = `:(glob)${year}/${month}/activities/activity-${compactDate}*.md`;
    const history = gitLog ? gitLog(repoRoot, date) : execFileSync("git", [
      "log", "--all", "--format=", "--name-only", "--", currentPathspec, legacyPathspec,
    ], { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    usedPaths.push(...String(history).split(/\r?\n/));
  } catch {
    warnings.push("Activity naming: local Git history is unavailable; allocation uses current files and reserved paths only.");
  }
  let maximum = "";
  for (const usedPath of usedPaths) {
    try {
      const parsed = parseRecordPath(usedPath);
      if (parsed.type === "activity" && parsed.date === date && parsed.suffix
        && compareActivitySuffixes(parsed.suffix, maximum) > 0) maximum = parsed.suffix;
    } catch { /* Noncanonical history lines are not activity reservations. */ }
  }
  return { path: activityPath(date, nextActivitySuffix(maximum)), warnings };
}

export function createActivity({ repoRoot, date, content, previous }, dependencies = {}) {
  validateIsoDate(date);
  const samplePath = activityPath(date, FIRST_ACTIVITY_SUFFIX);
  validateActivityRecord(samplePath, content);
  // Every collision retry uses the same directory, so its relative link is identical.
  if (previous !== undefined) {
    content = addPreviousActivity({ repoRoot, relativePath: samplePath, previous, content });
  }
  const reservedPaths = new Set(dependencies.reservedPaths ?? []);
  const directory = activityDirectory(repoRoot, date, true);
  const temporary = path.join(directory, `.activity-${randomUUID()}.tmp`);
  const fd = fs.openSync(temporary, "wx", 0o600);
  try {
    try { fs.writeFileSync(fd, content, "utf8"); fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
    // Publish complete Markdown at once. link is exclusive: a peer's file is never replaced.
    for (let attempt = 0; attempt < 32; attempt++) {
      const allocation = nextActivityPath(repoRoot, date, { ...dependencies, reservedPaths });
      const destination = path.join(repoRoot, ...allocation.path.split("/"));
      try { fs.linkSync(temporary, destination); }
      catch (error) {
        if (error.code !== "EEXIST") throw error;
        // A case variant may collide even though canonical filename scanning ignores it.
        reservedPaths.add(allocation.path);
        if (attempt === 31) {
          throw Object.assign(new Error(`Activity creation stopped after 32 name collisions; last candidate: ${allocation.path}`), {
            code: "ACTIVITY_CREATE_CONFLICT", path: allocation.path,
          });
        }
        continue;
      }
      return allocation;
    }
  } finally { fs.unlinkSync(temporary); }
}
