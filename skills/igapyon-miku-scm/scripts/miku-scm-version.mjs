#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { collectLocalSnapshot } from "./miku-scm-local-snapshot.mjs";

export const VERSION_RESULT_SCHEMA = "miku-scm.version/v1";
const POLICIES = new Set(["auto", "miku-date-coupled", "content-date", "semver"]);
const LEVELS = new Set(["major", "minor", "patch"]);

export const usage = `Usage:
  node skills/igapyon-miku-scm/scripts/miku-scm-version.mjs [options]

Options:
  --repo <path>
  --version-file <repository-relative-path>       Repeatable, maximum 10
  --coupled-version-file <repository-relative-path>
                                                  Repeatable, maximum 10
  --policy <auto|miku-date-coupled|content-date|semver>
  --timezone <IANA-timezone>                      Required for date increment validation
  --level <major|minor|patch>                     Required for SemVer increment validation
  --validate-increment                            Compute and validate the next version
  --help

The helper is READONLY. It does not edit, stage, commit, tag, push, or publish.`;

function safeRelative(value, option) {
  if (!value || path.isAbsolute(value)) {
    throw new Error(`${option} must be a non-empty repository-relative path`);
  }
  const normalized = path.normalize(value);
  if (normalized === ".." || normalized.startsWith(`..${path.sep}`)) {
    throw new Error(`${option} must stay inside the repository`);
  }
  return normalized;
}

export function parseArgs(argv, cwd = process.cwd()) {
  const options = {
    repo: cwd,
    versionFiles: [],
    coupledVersionFiles: [],
    policy: "auto",
    timezone: "",
    level: "",
    validateIncrement: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repo") options.repo = argv[++index] ?? "";
    else if (arg === "--version-file") {
      options.versionFiles.push(safeRelative(argv[++index] ?? "", "--version-file"));
    } else if (arg === "--coupled-version-file") {
      options.coupledVersionFiles.push(safeRelative(
        argv[++index] ?? "",
        "--coupled-version-file",
      ));
    } else if (arg === "--policy") options.policy = argv[++index] ?? "";
    else if (arg === "--timezone") options.timezone = argv[++index] ?? "";
    else if (arg === "--level") options.level = argv[++index] ?? "";
    else if (arg === "--validate-increment") options.validateIncrement = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!options.repo) throw new Error("--repo requires a path");
  if (!POLICIES.has(options.policy)) throw new Error(`Unsupported --policy: ${options.policy}`);
  if (options.level && !LEVELS.has(options.level)) {
    throw new Error(`Unsupported --level: ${options.level}`);
  }
  if (options.versionFiles.length > 10 || options.coupledVersionFiles.length > 10) {
    throw new Error("At most 10 version files of each kind are allowed");
  }
  if (new Set(options.versionFiles).size !== options.versionFiles.length
    || new Set(options.coupledVersionFiles).size !== options.coupledVersionFiles.length) {
    throw new Error("Duplicate version file options are not allowed");
  }
  return options;
}

function projectPomVersion(content) {
  const project = content.match(/<project\b[\s\S]*?<\/project>/)?.[0] ?? content;
  return project.match(/<version>\s*([^<\s]+)\s*<\/version>/)?.[1] ?? null;
}

function versionValue(file, content) {
  if (path.basename(file) === "package.json") {
    const parsed = JSON.parse(content);
    return typeof parsed.version === "string" ? parsed.version : null;
  }
  if (path.basename(file) === "pom.xml") return projectPomVersion(content);
  const labelled = content.match(/^(?:Version|version):\s*(\S+)\s*$/m);
  if (labelled) return labelled[1];
  const values = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return values.length === 1 ? values[0] : null;
}

function formatCandidates(value) {
  if (!value) return [];
  const candidates = [];
  if (/^1\.\d{8}\.[1-9]\d*$/.test(value)) candidates.push("miku-date-coupled");
  if (/^\d{8}[a-z]+$/.test(value)) candidates.push("content-date");
  if (/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value)) {
    candidates.push("semver");
  }
  return candidates;
}

function suffixToNumber(suffix) {
  let value = 0;
  for (const character of suffix) {
    const digit = character.charCodeAt(0) - 96;
    if (digit < 1 || digit > 26) throw new Error(`Invalid alphabetic suffix: ${suffix}`);
    value = value * 26 + digit;
    if (!Number.isSafeInteger(value)) {
      throw new Error(`Alphabetic suffix exceeds safe integer range: ${suffix}`);
    }
  }
  return value;
}

export function numberToSuffix(number) {
  if (!Number.isSafeInteger(number) || number < 1) {
    throw new Error("Alphabetic suffix number must be a positive safe integer");
  }
  let value = number;
  let suffix = "";
  while (value > 0) {
    value -= 1;
    suffix = String.fromCharCode(97 + (value % 26)) + suffix;
    value = Math.floor(value / 26);
  }
  return suffix;
}

function localDate(now, timezone) {
  let formatter;
  try {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    throw new Error(`Invalid IANA timezone: ${timezone}`);
  }
  const parts = Object.fromEntries(
    formatter.formatToParts(now).map((part) => [part.type, part.value]),
  );
  return `${parts.year}${parts.month}${parts.day}`;
}

function requireDateId(value) {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!match) throw new Error(`Invalid version date: ${value}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day) {
    throw new Error(`Invalid version date: ${value}`);
  }
}

function incrementMikuDate(value, date) {
  const match = value.match(/^1\.(\d{8})\.([1-9]\d*)$/);
  if (!match) throw new Error(`Expected miku date version 1.YYYYMMDD.N: ${value}`);
  requireDateId(match[1]);
  if (date < match[1]) throw new Error(`Maintenance date precedes current version date: ${date}`);
  const sequence = match[1] === date ? Number(match[2]) + 1 : 1;
  if (!Number.isSafeInteger(sequence)) throw new Error("Version sequence exceeds safe integer range");
  return {
    authoritative: `1.${date}.${sequence}`,
    coupled: `${date}${numberToSuffix(sequence)}`,
    date,
    sequence,
  };
}

function incrementContentDate(value, date) {
  const match = value.match(/^(\d{8})([a-z]+)$/);
  if (!match) throw new Error(`Expected content date version YYYYMMDD<suffix>: ${value}`);
  requireDateId(match[1]);
  if (date < match[1]) throw new Error(`Maintenance date precedes current version date: ${date}`);
  const sequence = match[1] === date ? suffixToNumber(match[2]) + 1 : 1;
  return {
    authoritative: `${date}${numberToSuffix(sequence)}`,
    coupled: null,
    date,
    sequence,
  };
}

function incrementSemver(value, level) {
  const match = value.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error("SemVer validation currently requires a stable MAJOR.MINOR.PATCH value");
  }
  let [, major, minor, patchValue] = match.map(Number);
  if (![major, minor, patchValue].every(Number.isSafeInteger)) {
    throw new Error("SemVer component exceeds safe integer range");
  }
  if (level === "major") {
    major += 1;
    minor = 0;
    patchValue = 0;
  } else if (level === "minor") {
    minor += 1;
    patchValue = 0;
  } else {
    patchValue += 1;
  }
  return {
    authoritative: `${major}.${minor}.${patchValue}`,
    coupled: null,
    date: null,
    sequence: null,
  };
}

async function safeRead(root, relative, read = readFile) {
  const rootReal = await realpath(root);
  const absolute = path.resolve(root, relative);
  const prefix = `${path.resolve(root)}${path.sep}`;
  if (!absolute.startsWith(prefix)) throw new Error(`Version path escapes repository: ${relative}`);
  let fileReal;
  try {
    fileReal = await realpath(absolute);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
  if (!fileReal.startsWith(`${rootReal}${path.sep}`)) {
    throw new Error(`Version path resolves outside repository: ${relative}`);
  }
  return read(absolute, "utf8");
}

async function discoverFiles(root, read) {
  const discovered = [];
  for (const file of ["package.json", "pom.xml", "VERSION.md"]) {
    const content = await safeRead(root, file, read);
    if (content !== null && versionValue(file, content)) discovered.push(file);
  }
  return discovered;
}

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export async function inspectVersion(options, dependencies = {}) {
  const snapshot = await (dependencies.collectSnapshot ?? collectLocalSnapshot)({
    repo: options.repo,
    versionFiles: [],
  }, dependencies.snapshotDependencies);
  const root = snapshot.root;
  const read = dependencies.readFile ?? readFile;
  const versionFiles = options.versionFiles.length > 0
    ? options.versionFiles
    : await discoverFiles(root, read);
  if (versionFiles.length === 0) throw new Error("No authoritative version source was resolved");

  const readSource = async (file, role) => {
    const content = await safeRead(root, file, read);
    if (content === null) throw new Error(`Version source is missing: ${file}`);
    const value = versionValue(file, content);
    if (!value) throw new Error(`Version value is unresolved: ${file}`);
    return { path: file, role, value, format_candidates: formatCandidates(value) };
  };
  const authoritative = await Promise.all(
    versionFiles.map((file) => readSource(file, "authoritative")),
  );
  const coupled = await Promise.all(
    options.coupledVersionFiles.map((file) => readSource(file, "coupled")),
  );
  const primary = authoritative[0];
  const policyMatchesSource = options.policy === "auto"
    ? null
    : primary.format_candidates.includes(options.policy);

  let alignment = "not-configured";
  if (options.policy === "miku-date-coupled" && coupled.length > 0) {
    const project = primary.value.match(/^1\.(\d{8})\.([1-9]\d*)$/);
    const expected = project ? `${project[1]}${numberToSuffix(Number(project[2]))}` : null;
    alignment = expected && coupled.every((source) => source.value === expected)
      ? "aligned"
      : "mismatch";
  } else if (authoritative.length > 1) {
    alignment = authoritative.every((source) => source.value === primary.value)
      ? "aligned"
      : "mismatch";
  }

  let proposed = null;
  if (options.validateIncrement) {
    if (options.policy === "auto") {
      throw new Error("Increment validation requires explicit --policy");
    }
    if (authoritative.length !== 1) {
      throw new Error("Increment validation requires exactly one authoritative version source");
    }
    if (options.policy === "miku-date-coupled") {
      if (coupled.length === 0) {
        throw new Error("miku-date-coupled validation requires a coupled version source");
      }
      if (alignment !== "aligned") {
        throw new Error("Cannot validate increment while coupled version sources are mismatched");
      }
    } else if (coupled.length > 0) {
      throw new Error(`${options.policy} validation rejects coupled version sources`);
    }
    if (options.policy === "semver") {
      if (!options.level) throw new Error("SemVer increment validation requires --level");
      if (options.timezone) throw new Error("SemVer increment validation rejects --timezone");
      proposed = incrementSemver(primary.value, options.level);
    } else {
      if (!options.timezone) throw new Error("Date-based increment validation requires --timezone");
      if (options.level) throw new Error("Date-based increment validation rejects --level");
      const date = localDate(dependencies.now ? dependencies.now() : new Date(), options.timezone);
      proposed = options.policy === "miku-date-coupled"
        ? incrementMikuDate(primary.value, date)
        : incrementContentDate(primary.value, date);
    }
  } else if (options.level || options.timezone) {
    throw new Error("--level and --timezone are accepted only with --validate-increment");
  }

  const core = {
    repository: path.basename(root),
    root,
    branch: snapshot.branch,
    head: snapshot.head,
    dirty: snapshot.dirty,
    policy: options.policy,
    policy_explicit: options.policy !== "auto",
    policy_matches_source: policyMatchesSource,
    policy_resolved: options.policy !== "auto" && policyMatchesSource,
    timezone: options.timezone || null,
    level: options.level || null,
    authoritative,
    coupled,
    alignment,
    proposed,
  };
  return {
    schema_version: VERSION_RESULT_SCHEMA,
    status: options.validateIncrement
      ? "validated"
      : policyMatchesSource === false
        ? "unresolved"
        : alignment === "mismatch" ? "conflict" : "inspected",
    readonly: true,
    mutation_invoked: false,
    identity_sha256: digest(core),
    ...core,
  };
}

export async function main(argv = process.argv.slice(2), dependencies = {}) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(usage);
    return;
  }
  console.log(JSON.stringify(await inspectVersion(options, dependencies), null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
