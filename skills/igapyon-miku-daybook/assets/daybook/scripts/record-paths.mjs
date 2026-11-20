import fs from "node:fs";
import path from "node:path";

const DATED_ROOTS = new Map([
  ["activities", "activity"],
  ["tasks", "task"],
  ["todos", "todo"],
]);
const RECORD_ROOTS = new Map([
  ["activity", "activities"],
  ["task", "tasks"],
  ["todo", "todos"],
  ["schedule", "schedules"],
  ["day-plan", "day-plans"],
]);

export function validateIsoDate(value, label = "date") {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must be YYYY-MM-DD: ${value ?? ""}`);
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} is not a valid date: ${value}`);
  }
  return value;
}

function pathError(message, relativePath, code = "INVALID_RECORD_PATH") {
  return Object.assign(new Error(`${message}: ${relativePath}`), { code, path: relativePath });
}

function validYearMonth(year, month, relativePath) {
  if (!/^\d{4}$/.test(year) || !/^\d{6}$/.test(month)
    || month.slice(0, 4) !== year || Number(month.slice(4)) < 1 || Number(month.slice(4)) > 12) {
    throw pathError("Record path has an invalid year/month directory", relativePath);
  }
}

function fileIdentity(type, filename, relativePath) {
  if (type === "activity") {
    const match = /^activity-(\d{8})([a-z]*)\.md$/.exec(filename);
    if (!match) throw pathError("Invalid activity filename", relativePath);
    const date = `${match[1].slice(0, 4)}-${match[1].slice(4, 6)}-${match[1].slice(6, 8)}`;
    validateIsoDate(date, `${relativePath}: filename date`);
    return { date, suffix: match[2] ?? "", id: `activity-${match[1]}${match[2] ?? ""}` };
  }
  if (type === "task" || type === "todo") {
    const match = new RegExp(`^${type}-(\\d{6})-(\\d{5})-(.+)\\.md$`).exec(filename);
    if (!match) throw pathError(`Invalid ${type} filename`, relativePath);
    validYearMonth(match[1].slice(0, 4), match[1], relativePath);
    if (Number(match[2]) < 1) throw pathError(`${type} sequence must be positive`, relativePath);
    return { idMonth: match[1], sequence: Number(match[2]), id: `${type}-${match[1]}-${match[2]}` };
  }
  if (type === "schedule") {
    const match = /^schedule-(\d{8})-(.+)\.md$/.exec(filename);
    if (!match) throw pathError("Invalid schedule filename", relativePath);
    const date = `${match[1].slice(0, 4)}-${match[1].slice(4, 6)}-${match[1].slice(6, 8)}`;
    validateIsoDate(date, `${relativePath}: filename date`);
    return { date, id: path.posix.basename(filename, ".md") };
  }
  if (type === "day-plan") {
    const match = /^day-plan-(\d{8})\.md$/.exec(filename);
    if (!match) throw pathError("Invalid day-plan filename", relativePath);
    const date = `${match[1].slice(0, 4)}-${match[1].slice(4, 6)}-${match[1].slice(6, 8)}`;
    validateIsoDate(date, `${relativePath}: filename date`);
    return { date, id: path.posix.basename(filename, ".md") };
  }
  return { id: path.posix.basename(filename, ".md") };
}

export function parseRecordPath(value) {
  if (typeof value !== "string" || !value || value.includes("\\") || path.posix.isAbsolute(value)
    || path.posix.normalize(value) !== value || value.split("/").some((part) => !part || part === "." || part === "..")) {
    throw pathError("Record path must be a normalized repository-relative path", value);
  }
  const parts = value.split("/");
  let type;
  let layout;
  let year;
  let month;
  let directoryDate = null;
  let filename;

  if (DATED_ROOTS.has(parts[0]) && parts.length === 5) {
    type = DATED_ROOTS.get(parts[0]);
    layout = "current";
    [, year, month, directoryDate, filename] = parts;
    validYearMonth(year, month, value);
    if (!/^\d{8}$/.test(directoryDate)) throw pathError("Record path has an invalid day directory", value);
    const date = `${directoryDate.slice(0, 4)}-${directoryDate.slice(4, 6)}-${directoryDate.slice(6, 8)}`;
    validateIsoDate(date, `${value}: directory date`);
    if (directoryDate.slice(0, 6) !== month) throw pathError("Record path day must agree with its year/month", value);
  } else if (/^\d{4}$/.test(parts[0]) && parts.length === 4 && ["activities", "tasks", "todos", "schedules"].includes(parts[2])) {
    [year, month, , filename] = parts;
    const legacyKind = parts[2];
    type = legacyKind === "activities" ? "activity" : legacyKind === "tasks" ? "task"
      : legacyKind === "todos" ? "todo" : "schedule";
    layout = "legacy";
    validYearMonth(year, month, value);
  } else if (parts[0] === "schedules" && parts.length === 4) {
    [, year, month, filename] = parts;
    type = "schedule";
    layout = "current";
    validYearMonth(year, month, value);
  } else if (parts[0] === "day-plans" && parts.length === 4) {
    [, year, month, filename] = parts;
    type = "day-plan";
    layout = "current";
    validYearMonth(year, month, value);
  } else if (/^\d{4}$/.test(parts[0]) && parts.length === 4 && parts[2] === "day-plan") {
    [year, month, , filename] = parts;
    type = "day-plan";
    layout = "legacy";
    validYearMonth(year, month, value);
  } else if (parts[0] === "attachments" && parts.length === 5) {
    [, year, month, , filename] = parts;
    type = "attachment";
    layout = "current";
    validYearMonth(year, month, value);
    return { type, layout, relativePath: value, year, month, id: path.posix.basename(filename, ".md"), filename };
  } else if (/^\d{4}$/.test(parts[0]) && parts.length === 5 && parts[2] === "attachments") {
    [year, month, , , filename] = parts;
    type = "attachment";
    layout = "legacy";
    validYearMonth(year, month, value);
    return { type, layout, relativePath: value, year, month, id: path.posix.basename(filename, ".md"), filename };
  } else {
    throw pathError("Record path is outside canonical record directories", value);
  }

  const identity = fileIdentity(type, filename, value);
  const date = identity.date ?? (directoryDate
    ? `${directoryDate.slice(0, 4)}-${directoryDate.slice(4, 6)}-${directoryDate.slice(6, 8)}` : null);
  if (type === "activity" && directoryDate && identity.date.replaceAll("-", "") !== directoryDate) {
    throw pathError("Activity filename date must agree with its directory", value);
  }
  if (type === "activity" && layout === "legacy"
    && identity.date.replaceAll("-", "").slice(0, 6) !== month) {
    throw pathError("Activity filename date must agree with its legacy year/month directory", value);
  }
  if (type === "schedule" && date.replaceAll("-", "").slice(0, 6) !== month) {
    throw pathError("Schedule filename date must agree with its year/month directory", value);
  }
  if (type === "day-plan" && date.replaceAll("-", "").slice(0, 6) !== month) {
    throw pathError("Day-plan filename date must agree with its year/month directory", value);
  }
  if (layout === "legacy" && (type === "task" || type === "todo") && identity.idMonth !== month) {
    throw pathError(`${type} ID month must agree with its legacy directory`, value);
  }
  return { type, layout, relativePath: value, year, month, date, directoryDate, filename, ...identity };
}

export function activityPath(date, suffix) {
  validateIsoDate(date);
  if (typeof suffix !== "string" || !/^[a-z]{3,}$/.test(suffix)) {
    throw new Error("New activity suffix must contain at least three lowercase letters");
  }
  const compactDate = date.replaceAll("-", "");
  return `activities/${date.slice(0, 4)}/${compactDate.slice(0, 6)}/${compactDate}/activity-${compactDate}${suffix}.md`;
}

export function taskPath(date, id, key) {
  validateIsoDate(date);
  const idMatch = typeof id === "string" ? /^task-(\d{6})-(\d{5})$/.exec(id) : null;
  if (!idMatch || Number(idMatch[2]) < 1 || typeof key !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(key)) {
    throw new Error("Task path requires a canonical task ID and key");
  }
  const compactDate = date.replaceAll("-", "");
  if (!id.startsWith(`task-${compactDate.slice(0, 6)}-`)) {
    throw new Error("New task ID month must agree with its creation date");
  }
  return `tasks/${date.slice(0, 4)}/${compactDate.slice(0, 6)}/${compactDate}/${id}-${key}.md`;
}

export function todoPath(date, id, key) {
  validateIsoDate(date);
  const idMatch = typeof id === "string" ? /^todo-(\d{6})-(\d{5})$/.exec(id) : null;
  if (!idMatch || Number(idMatch[2]) < 1 || typeof key !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(key)) {
    throw new Error("Todo path requires a canonical todo ID and key");
  }
  const compactDate = date.replaceAll("-", "");
  if (!id.startsWith(`todo-${compactDate.slice(0, 6)}-`)) {
    throw new Error("New todo ID month must agree with its creation date");
  }
  return `todos/${date.slice(0, 4)}/${compactDate.slice(0, 6)}/${compactDate}/${id}-${key}.md`;
}

export function schedulePath(date, filename) {
  validateIsoDate(date);
  if (typeof filename !== "string" || !/^schedule-\d{8}-.+\.md$/.test(filename)) {
    throw new Error("Schedule path requires a canonical schedule filename");
  }
  const compactDate = date.replaceAll("-", "");
  if (!filename.startsWith(`schedule-${compactDate}-`)) throw new Error("Schedule filename date must match date");
  return `schedules/${date.slice(0, 4)}/${compactDate.slice(0, 6)}/${filename}`;
}

export function dayPlanPath(date) {
  validateIsoDate(date);
  const compactDate = date.replaceAll("-", "");
  return `day-plans/${date.slice(0, 4)}/${compactDate.slice(0, 6)}/day-plan-${compactDate}.md`;
}

function realDirectory(parent, name, relativePath) {
  const candidate = path.join(parent, name);
  try {
    const stat = fs.lstatSync(candidate);
    if (stat.isSymbolicLink()) throw pathError("Canonical record directories must not be symlinks", relativePath, "PATH_OUTSIDE_REPO");
    if (!stat.isDirectory()) return null;
    return candidate;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function directoryEntries(directory, relativePath, includeName) {
  return fs.readdirSync(directory, { withFileTypes: true }).filter((entry) => {
    if (includeName && !includeName(entry.name)) return false;
    if (!entry.isSymbolicLink()) return entry.isDirectory();
    throw pathError("Canonical record directories must not be symlinks", `${relativePath}/${entry.name}`, "PATH_OUTSIDE_REPO");
  });
}

function validMonthDirectory(year, name) {
  return /^\d{6}$/.test(name) && name.slice(0, 4) === year
    && Number(name.slice(4)) >= 1 && Number(name.slice(4)) <= 12;
}

function recordFileNames(type, directory, relativeDirectory, includeName) {
  return fs.readdirSync(directory, { withFileTypes: true }).filter((entry) => {
    if (includeName && !includeName(entry.name)) return false;
    if (entry.isSymbolicLink()) throw pathError("Canonical record files must not be symlinks", `${relativeDirectory}/${entry.name}`, "PATH_OUTSIDE_REPO");
    if (!entry.isFile()) return false;
    const patterns = {
      activity: /^activity-\d{8}[a-z]*\.md$/,
      task: /^task-\d{6}-\d{5}-.+\.md$/,
      todo: /^todo-\d{6}-\d{5}-.+\.md$/,
      schedule: /^schedule-\d{8}-.+\.md$/,
      "day-plan": /^day-plan-\d{8}\.md$/,
    };
    return patterns[type].test(entry.name);
  }).map((entry) => entry.name);
}

export function listCanonicalRecordFiles(repoRoot, requestedTypes = [...RECORD_ROOTS.keys()], { activityRange } = {}) {
  const root = path.resolve(repoRoot);
  if (!fs.existsSync(root)) return [];
  const rootStat = fs.lstatSync(root);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) throw new Error("Repository root must be a real directory");
  const types = new Set(requestedTypes);
  const files = [];
  const from = activityRange?.from?.replaceAll("-", "");
  const to = activityRange?.to?.replaceAll("-", "");
  const scoped = Boolean(from || to);
  function withinRange(stamp) {
    return (!from || stamp >= from.slice(0, stamp.length)) && (!to || stamp <= to.slice(0, stamp.length));
  }
  const directoryScope = (length) => (name) => name.length === length && /^\d+$/.test(name) && withinRange(name);
  // Current activities are grouped by day. Legacy activities share a monthly directory.
  const legacyFileScope = scoped ? (name) => {
    const match = /^activity-(\d{8})[a-z]*\.md$/.exec(name);
    return Boolean(match && withinRange(match[1]));
  } : undefined;
  const addDirectory = (directory, relativeDirectory, expectedType, includeName) => {
    if (!directory) return;
    for (const filename of recordFileNames(expectedType, directory, relativeDirectory, includeName)) {
      const relativePath = `${relativeDirectory}/${filename}`;
      const parsed = parseRecordPath(relativePath);
      if (parsed.type !== expectedType) throw pathError("Record path type does not match directory", relativePath);
      files.push(parsed);
    }
  };

  for (const type of types) {
    if (!RECORD_ROOTS.has(type)) continue;
    const rootName = RECORD_ROOTS.get(type);
    if (["activity", "task", "todo"].includes(type)) {
      const currentRoot = realDirectory(root, rootName, rootName);
      if (currentRoot) {
        const scope = scoped && type === "activity";
        for (const yearEntry of directoryEntries(currentRoot, rootName, scope ? directoryScope(4) : undefined)) {
          if (!/^\d{4}$/.test(yearEntry.name)) continue;
          const yearPath = path.join(currentRoot, yearEntry.name);
          for (const monthEntry of directoryEntries(yearPath, `${rootName}/${yearEntry.name}`, scope ? directoryScope(6) : undefined)) {
            if (!validMonthDirectory(yearEntry.name, monthEntry.name)) continue;
            const monthPath = path.join(yearPath, monthEntry.name);
            const monthDirectory = `${rootName}/${yearEntry.name}/${monthEntry.name}`;
            for (const dayEntry of directoryEntries(monthPath, monthDirectory, scope ? directoryScope(8) : undefined)) {
              if (!/^\d{8}$/.test(dayEntry.name)) continue;
              const relativeDirectory = `${rootName}/${yearEntry.name}/${monthEntry.name}/${dayEntry.name}`;
              const date = `${dayEntry.name.slice(0, 4)}-${dayEntry.name.slice(4, 6)}-${dayEntry.name.slice(6, 8)}`;
              validateIsoDate(date, `${relativeDirectory}: directory date`);
              if (dayEntry.name.slice(0, 6) !== monthEntry.name) throw pathError("Record day directory must agree with year/month", relativeDirectory);
              addDirectory(path.join(monthPath, dayEntry.name), relativeDirectory, type);
            }
          }
        }
      }
    } else {
      const currentRoot = realDirectory(root, rootName, rootName);
      if (currentRoot) {
        for (const yearEntry of directoryEntries(currentRoot, rootName)) {
          if (!/^\d{4}$/.test(yearEntry.name)) continue;
          const yearPath = path.join(currentRoot, yearEntry.name);
          for (const monthEntry of directoryEntries(yearPath, `${rootName}/${yearEntry.name}`)) {
            if (!validMonthDirectory(yearEntry.name, monthEntry.name)) continue;
            const relativeDirectory = `${rootName}/${yearEntry.name}/${monthEntry.name}`;
            addDirectory(path.join(yearPath, monthEntry.name), relativeDirectory, type);
          }
        }
      }
    }
  }

  const legacyScope = scoped && types.size === 1 && types.has("activity");
  for (const yearEntry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!yearEntry.isDirectory() || !/^\d{4}$/.test(yearEntry.name)) continue;
    if (legacyScope && !withinRange(yearEntry.name)) continue;
    const yearPath = path.join(root, yearEntry.name);
    for (const monthEntry of directoryEntries(yearPath, yearEntry.name, legacyScope ? directoryScope(6) : undefined)) {
      if (!validMonthDirectory(yearEntry.name, monthEntry.name)) continue;
      const monthPath = path.join(yearPath, monthEntry.name);
      for (const type of types) {
        if (!RECORD_ROOTS.has(type)) continue;
        const legacyName = type === "day-plan" ? "day-plan" : RECORD_ROOTS.get(type);
        const relativeDirectory = `${yearEntry.name}/${monthEntry.name}/${legacyName}`;
        if (scoped && type === "activity" && !withinRange(monthEntry.name)) continue;
        addDirectory(realDirectory(monthPath, legacyName, relativeDirectory), relativeDirectory, type,
          type === "activity" ? legacyFileScope : undefined);
      }
    }
  }

  return files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

export function assertUniqueRecordPaths(records, code = "DUPLICATE_RECORD") {
  const byIdentity = new Map();
  for (const record of records) {
    const parsed = record.type ? record : parseRecordPath(record.relativePath);
    const key = `${parsed.type}\0${parsed.id}`;
    const paths = byIdentity.get(key) ?? [];
    paths.push(parsed.relativePath);
    byIdentity.set(key, paths);
  }
  const duplicate = [...byIdentity.entries()].find(([, paths]) => paths.length > 1);
  if (duplicate) {
    const [identity, paths] = duplicate;
    const [type, id] = identity.split("\0");
    throw Object.assign(new Error(`Duplicate ${type} identity ${id} appears at: ${paths.join(", ")}`), { code, paths, id, type });
  }
}

export function resolveRecordPath(repoRoot, relativePath, { createParents = false } = {}) {
  parseRecordPath(relativePath);
  const root = fs.realpathSync(repoRoot);
  const parts = relativePath.split("/");
  let current = root;
  for (const part of parts.slice(0, -1)) {
    current = path.join(current, part);
    if (createParents) {
      try { fs.mkdirSync(current); } catch (error) { if (error.code !== "EEXIST") throw error; }
    }
    try {
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        throw pathError("Record parent must be a real directory", relativePath, "PATH_OUTSIDE_REPO");
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return path.join(root, ...parts);
}
