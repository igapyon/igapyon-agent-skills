#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { activityTitle, compareActivitySuffixes, previousActivityPath, readActivity } from "./activity-files.mjs";
import { parseFrontMatter } from "./day-plan.mjs";
import { assertUniqueRecordPaths, listCanonicalRecordFiles, validateIsoDate } from "./record-paths.mjs";

const usage = "Usage: node scripts/activity-history.mjs list [--date YYYY-MM-DD | [--from YYYY-MM-DD] [--to YYYY-MM-DD]] [--query TEXT] [--repo-root DIRECTORY]\n"
  + "       node scripts/activity-history.mjs trace --path ACTIVITY.md [--depth N] [--repo-root DIRECTORY]";

function loadActivity(repoRoot, relativePath) {
  const { content } = readActivity({ repoRoot, path: relativePath });
  const { frontMatter, body } = parseFrontMatter(content, relativePath);
  return { record: { date: frontMatter.date, title: activityTitle(body, relativePath), path: relativePath }, body };
}

function listActivities(repoRoot, { date, from, to, query }) {
  if (date !== undefined && (from !== undefined || to !== undefined)) {
    throw new Error("--date cannot be combined with --from or --to");
  }
  for (const [flag, value] of Object.entries({ date, from, to })) {
    if (value !== undefined) validateIsoDate(value, "--" + flag);
  }
  if (from && to && from > to) throw new Error("--from must be on or before --to");
  const candidates = listCanonicalRecordFiles(repoRoot, ["activity"], {
    activityRange: { from: date ?? from, to: date ?? to },
  });
  assertUniqueRecordPaths(candidates);
  candidates.sort((left, right) => right.date.localeCompare(left.date) || compareActivitySuffixes(left.suffix, right.suffix));
  const records = [];
  for (const { relativePath } of candidates) {
    const { record, body } = loadActivity(repoRoot, relativePath);
    if (!query || record.title.includes(query) || body.includes(query)) records.push(record);
  }
  return { records };
}

function traceActivities(repoRoot, relativePath, depth) {
  let current = loadActivity(repoRoot, relativePath);
  const records = [current.record];
  const visited = new Set([relativePath]);
  function result(reason, target) {
    const stop = { reason, at: current.record.path };
    if (target !== undefined) stop.target = target;
    return { records: records.reverse(), stop };
  }
  for (let followed = 0; followed < depth; followed++) {
    let previous;
    try {
      previous = previousActivityPath(current.body, current.record.path);
    } catch (error) {
      if (error.code !== "INVALID_PREVIOUS_ACTIVITY") throw error;
      return result("invalid_link", error.target);
    }
    if (!previous) return result("no_previous");
    if (visited.has(previous)) return result("cycle", previous);
    try {
      current = loadActivity(repoRoot, previous);
    } catch (error) {
      if (error.code === "ACTIVITY_UPDATE_CONFLICT") return result("missing_target", previous);
      if (error.code === "PATH_OUTSIDE_REPO") return result("invalid_link", previous);
      return result("unreadable_target", previous);
    }
    visited.add(previous);
    records.push(current.record);
  }
  return result("depth_limit");
}

export function main(args = process.argv.slice(2)) {
  const [operation, ...flags] = args;
  if (operation === "--help") {
    console.log(usage);
    return 0;
  }
  if (operation !== "list" && operation !== "trace") throw new Error(usage);
  const allowed = operation === "list" ? ["date", "from", "to", "query"] : ["path", "depth"];
  const options = Object.fromEntries([...allowed, "repo-root"].map((key) => [key, { type: "string" }]));
  options.help = { type: "boolean" };
  const { values, tokens } = parseArgs({ args: flags, options, tokens: true });
  if (values.help) {
    console.log(usage);
    return 0;
  }
  const seen = new Set();
  for (const { name } of tokens) {
    if (seen.has(name)) throw new Error("Duplicate option: --" + name);
    seen.add(name);
  }
  const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const repoRoot = fs.realpathSync(values["repo-root"] ?? defaultRoot);
  if (operation === "list") {
    console.log(JSON.stringify(listActivities(repoRoot, values)));
    return 0;
  }
  if (!values.path) throw new Error("trace requires --path ACTIVITY.md");
  const rawDepth = values.depth ?? "5";
  const depth = Number(rawDepth);
  if (!/^\d+$/.test(rawDepth) || !Number.isSafeInteger(depth)) {
    throw new Error("--depth must be a non-negative safe integer");
  }
  const result = traceActivities(repoRoot, values.path, depth);
  console.log(JSON.stringify(result));
  return ["no_previous", "depth_limit"].includes(result.stop.reason) ? 0 : 1;
}

if (process.argv[1] && fs.existsSync(process.argv[1])
  && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(error.code ? error.code + ": " + error.message : error.message);
    process.exitCode = 1;
  }
}
