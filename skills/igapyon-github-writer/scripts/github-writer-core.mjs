import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

export const MAX_DOCUMENT_CHARS = 40_000;
export const MAX_GIT_CAPTURE_BYTES = 64 * 1024 * 1024;
export const MAX_GIT_DIAGNOSTIC_CHARS = 4_096;
export const TARGET_PATTERN = /^[^\s\u0000-\u001f\u007f]{1,240}$/;
export const BRANCH_PATTERN = /^[A-Za-z0-9._/-]{1,240}$/;

const LOCAL_GIT_COMMANDS = new Set([
  "branch",
  "check-ref-format",
  "commit",
  "diff",
  "hash-object",
  "log",
  "merge-base",
  "reset",
  "rev-list",
  "rev-parse",
  "show-ref",
  "status",
  "symbolic-ref",
  "tag",
]);

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function canonicalText(value) {
  return String(value).replace(/\r\n?/g, "\n");
}

export function normalizeResultPath(value) {
  return String(value).replaceAll("\\", "/");
}

export function isPathInside(root, candidate, platform = process.platform) {
  const pathApi = platform === "win32" ? path.win32 : path.posix;
  const normalizeCase = (value) => (
    platform === "win32" ? value.toLowerCase() : value
  );
  const relative = pathApi.relative(
    normalizeCase(pathApi.resolve(root)),
    normalizeCase(pathApi.resolve(candidate)),
  );
  return relative === "" || (
    relative !== ".."
    && !relative.startsWith(`..${pathApi.sep}`)
    && !pathApi.isAbsolute(relative)
  );
}

function redactSensitiveLines(value) {
  return canonicalText(value).split("\n").map((line) => (
    /(?:token|password|secret|api[_-]?key|authorization)\s*[:=]/i.test(line)
      ? "[redacted-sensitive-line]"
      : line
  )).join("\n");
}

export function boundedText(value, limit) {
  const redacted = redactSensitiveLines(value);
  if (redacted.length <= limit) return { text: redacted, truncated: false };
  return {
    text: `${redacted.slice(0, limit)}\n[truncated]\n`,
    truncated: true,
  };
}

export function boundedLines(value, { maxChars, maxLines }) {
  const canonical = canonicalText(value);
  const lines = canonical.split("\n");
  const accepted = [];
  let chars = 0;
  for (const line of lines) {
    if (!line && lines.length > 1 && accepted.length === lines.length - 1) continue;
    const next = `${line}\n`;
    if (accepted.length >= maxLines || chars + next.length > maxChars) {
      return { lines: accepted, text: accepted.join("\n"), truncated: true };
    }
    accepted.push(line);
    chars += next.length;
  }
  return { lines: accepted.filter((line, index, all) => !(index === all.length - 1 && line === "")), text: canonical.trimEnd(), truncated: false };
}

export function formatJst(now, withSeparators = false) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  if (withSeparators) {
    return `${values.year}-${values.month}-${values.day}-${values.hour}${values.minute}`;
  }
  return `${values.year}${values.month}${values.day}${values.hour}${values.minute}`;
}

export function branchSlug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function defaultGit(cwd, args, { allowFailure = false, input = undefined } = {}) {
  const commandIndex = args[0] === "-c" ? 2 : 0;
  const command = args[commandIndex];
  if (!LOCAL_GIT_COMMANDS.has(command)) {
    throw new Error(`Git command is outside the local allowlist: ${command || "missing"}`);
  }
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    input,
    maxBuffer: MAX_GIT_CAPTURE_BYTES,
    shell: false,
    windowsHide: true,
  });
  if (result.status !== 0 && !allowFailure) {
    const stdout = canonicalText(result.stdout || "");
    const stderr = boundedText(result.stderr || result.error?.message || "", MAX_GIT_DIAGNOSTIC_CHARS).text.trim();
    const commandName = command || args[0] || "missing";
    throw new Error(
      `git ${commandName} failed: exit_code=${result.status ?? "null"}; signal=${result.signal ?? "none"}; `
      + `spawn_error=${result.error?.code ?? "none"}; stdout_bytes=${Buffer.byteLength(stdout, "utf8")}; `
      + `stdout_sha256=${sha256(stdout)}; stderr=${stderr || "none"}`,
    );
  }
  return {
    ok: result.status === 0,
    status: result.status,
    out: canonicalText(result.stdout || "").trimEnd(),
    err: canonicalText(result.stderr || "").trimEnd(),
  };
}

function isRunnerOperationalUntracked(record) {
  if (!record.startsWith("?? ")) return false;
  const candidate = normalizeResultPath(record.slice(3));
  return candidate.startsWith("workplace/github-writer/")
    || candidate.startsWith("temp/github-writer/");
}

function repositoryStatus(root, git) {
  const raw = git(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]).out;
  return raw.split("\0")
    .filter(Boolean)
    .filter((record) => !isRunnerOperationalUntracked(record))
    .join("\0");
}

export function repositoryRoot(repo, git = defaultGit) {
  return realpathSync(git(repo, ["rev-parse", "--show-toplevel"]).out);
}

export function repositoryIdentity(repo, git = defaultGit) {
  const root = repositoryRoot(repo, git);
  const branch = git(root, ["branch", "--show-current"], { allowFailure: true }).out;
  const head = git(root, ["rev-parse", "HEAD"]).out;
  const status = repositoryStatus(root, git);
  return {
    root,
    repository: path.basename(root),
    branch,
    head,
    dirty: Boolean(status),
    status_porcelain: status,
  };
}

export function safeRelativeExisting(root, requested, kind) {
  const absolute = realpathSync(path.resolve(root, requested));
  if (!isPathInside(root, absolute)) throw new Error(`${kind} escapes repository`);
  return {
    absolute,
    relative: normalizeResultPath(path.relative(root, absolute)),
  };
}

export function operationalBase(root) {
  const workplace = path.join(root, "workplace");
  const temp = path.join(root, "temp");
  if (existsSync(workplace)) return path.join(workplace, "github-writer");
  if (existsSync(temp)) return path.join(temp, "github-writer");
  return path.join(workplace, "github-writer");
}

export function uniqueFile(directory, basename) {
  const parsed = path.parse(basename);
  let candidate = path.join(directory, basename);
  if (!existsSync(candidate)) return candidate;
  for (let index = 2; index < 100; index += 1) {
    candidate = path.join(directory, `${parsed.name}-${index}${parsed.ext}`);
    if (!existsSync(candidate)) return candidate;
  }
  throw new Error(`Could not resolve an unused file name: ${basename}`);
}

export function writeFileAtomic(file, content) {
  if (existsSync(file)) throw new Error(`Refusing to overwrite existing file: ${path.basename(file)}`);
  mkdirSync(path.dirname(file), { recursive: true });
  const temporary = path.join(
    path.dirname(file),
    `.${path.basename(file)}.${process.pid}.${randomUUID()}.tmp`,
  );
  writeFileSync(temporary, content, { encoding: "utf8", flag: "wx", mode: 0o600 });
  renameSync(temporary, file);
}

export function replaceFileAtomic(file, content) {
  mkdirSync(path.dirname(file), { recursive: true });
  const temporary = path.join(
    path.dirname(file),
    `.${path.basename(file)}.${process.pid}.${randomUUID()}.tmp`,
  );
  writeFileSync(temporary, content, { encoding: "utf8", flag: "wx", mode: 0o600 });
  renameSync(temporary, file);
}
