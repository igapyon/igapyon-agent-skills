import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
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

function parseActivityPath(relativePath) {
  const match = /^(\d{4})\/(\d{6})\/activities\/activity-(\d{8})([a-z]+)?\.md$/.exec(relativePath);
  if (!match) throw new Error(`Invalid activity path: ${relativePath}`);
  const date = `${match[3].slice(0, 4)}-${match[3].slice(4, 6)}-${match[3].slice(6, 8)}`;
  validateIsoDate(date, relativePath);
  if (match[1] !== match[2].slice(0, 4) || match[2] !== match[3].slice(0, 6)) {
    throw new Error(`Activity path and date must agree: ${relativePath}`);
  }
  return { date, suffix: match[4] ?? "" };
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
  const { date } = parseActivityPath(relativePath);
  return path.join(activityDirectory(repoRoot, date), path.basename(relativePath));
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
