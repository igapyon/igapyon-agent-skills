import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { parseFrontMatter, validateIsoDate } from "./day-plan.mjs";

export const ACTIVITY_FILENAME_PATTERN = /^activity-(\d{8})([a-z]+)?\.md$/;

export function nextActivitySuffix(suffix = "") {
  if (!/^[a-z]*$/.test(suffix)) throw new Error("Activity suffix must contain lowercase a-z only");
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
  validateIsoDate(date);
  if (!/^[a-z]+$/.test(suffix)) throw new Error("New activity requires a lowercase letter suffix");
  return `${date.slice(0, 4)}/${date.slice(0, 7).replace("-", "")}/activities/activity-${date.replaceAll("-", "")}${suffix}.md`;
}

export function validateActivityRecord(relativePath, text) {
  const match = /^(\d{4})\/(\d{6})\/activities\/activity-(\d{8})([a-z]+)?\.md$/.exec(relativePath);
  if (!match) throw new Error(`Invalid activity path: ${relativePath}`);
  const date = `${match[3].slice(0, 4)}-${match[3].slice(4, 6)}-${match[3].slice(6, 8)}`;
  validateIsoDate(date, relativePath);
  const { frontMatter } = parseFrontMatter(text, relativePath);
  if (match[1] !== match[2].slice(0, 4) || match[2] !== match[3].slice(0, 6)
    || frontMatter.type !== "activity" || frontMatter.date !== date) {
    throw new Error(`Activity path, type and date must agree: ${relativePath}`);
  }
  return { date, suffix: match[4] ?? "" };
}

// Check every parent, including before reading the directory or creating a file.
function activityDirectory(repoRoot, date, create = false) {
  let current = fs.realpathSync(repoRoot);
  for (const part of [date.slice(0, 4), date.slice(0, 7).replace("-", ""), "activities"]) {
    current = path.join(current, part);
    if (create) {
      try { fs.mkdirSync(current); } catch (error) { if (error.code !== "EEXIST") throw error; }
    }
    try {
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        const error = new Error(`Activity parent must be a real directory: ${current}`);
        error.code = "PATH_OUTSIDE_REPO";
        throw error;
      }
    } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  return current;
}

export function nextActivityPath(repoRoot, date, { reservedPaths = [], gitLog } = {}) {
  validateIsoDate(date);
  const directory = activityDirectory(repoRoot, date);
  const prefix = `${date.slice(0, 4)}/${date.slice(0, 7).replace("-", "")}/activities/`;
  const usedPaths = [...reservedPaths];
  if (fs.existsSync(directory)) usedPaths.push(...fs.readdirSync(directory).map((name) => prefix + name));
  const warnings = [];
  try {
    const history = gitLog ? gitLog(repoRoot, date) : execFileSync("git", [
      "log", "--all", "--format=", "--name-only", "--", prefix,
    ], { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    usedPaths.push(...String(history).split(/\r?\n/));
  } catch {
    warnings.push("Activity naming: local Git history is unavailable; allocation uses current files and reserved paths only.");
  }
  let maximum = "";
  for (const usedPath of usedPaths) {
    if (!usedPath.startsWith(prefix)) continue;
    const match = ACTIVITY_FILENAME_PATTERN.exec(usedPath.slice(prefix.length));
    if (match?.[1] === date.replaceAll("-", "") && match[2]
      && compareActivitySuffixes(match[2], maximum) > 0) maximum = match[2];
  }
  return { path: activityPath(date, nextActivitySuffix(maximum)), warnings };
}

export function createActivity({ repoRoot, date, content }, dependencies = {}) {
  validateIsoDate(date);
  validateActivityRecord(activityPath(date, "a"), content);
  const directory = activityDirectory(repoRoot, date, true);
  const temporary = path.join(directory, `.activity-${randomUUID()}.tmp`);
  const fd = fs.openSync(temporary, "wx", 0o600);
  try {
    try { fs.writeFileSync(fd, content, "utf8"); fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
    // Publish complete Markdown at once. link is exclusive: a peer's file is never replaced.
    for (;;) {
      const allocation = nextActivityPath(repoRoot, date, dependencies);
      const destination = path.join(repoRoot, ...allocation.path.split("/"));
      try { fs.linkSync(temporary, destination); }
      catch (error) { if (error.code === "EEXIST") continue; throw error; }
      return allocation;
    }
  } finally { fs.unlinkSync(temporary); }
}
