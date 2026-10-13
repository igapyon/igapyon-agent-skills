import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = fileURLToPath(new URL("..", import.meta.url));

export function listInternalSkills(root = projectRoot) {
  const skillsRoot = path.join(root, "skills");
  return fs.readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() &&
      fs.existsSync(path.join(skillsRoot, entry.name, "SKILL.md")))
    .map((entry) => entry.name)
    .sort();
}

export function readExternalSkillPins(root = projectRoot) {
  const pom = fs.readFileSync(path.join(root, "pom.xml"), "utf8");
  const externalById = new Map();
  const propertyPattern = /<external\.([A-Za-z0-9-]+)\.(repo|ref|skillName)>([^<]*)<\/external\.[^>]+>/g;
  for (const match of pom.matchAll(propertyPattern)) {
    const [, id, field, rawValue] = match;
    const values = externalById.get(id) ?? {};
    if (Object.hasOwn(values, field)) {
      throw new Error(`Duplicate external property: ${id}.${field}`);
    }
    values[field] = rawValue.trim();
    externalById.set(id, values);
  }
  return [...externalById.entries()].map(([id, values]) => {
    if (!values.repo || !values.ref || !values.skillName) {
      throw new Error(`Incomplete external skill properties for ${id}`);
    }
    return { repo: values.repo, ref: values.ref, skill: values.skillName };
  }).sort((left, right) => left.skill.localeCompare(right.skill));
}

export function readSkillIndexPolicy(root = projectRoot) {
  const policyPath = path.join(root, "config", "skill-index-policy.json");
  let policy;
  try {
    policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read ${path.relative(root, policyPath)}: ${error.message}`);
  }
  return validateSkillIndexPolicy(policy, {
    root,
    internalSkills: listInternalSkills(root),
    externalSkills: readExternalSkillPins(root),
  });
}

export function validateSkillIndexPolicy(policy, {
  root = projectRoot,
  internalSkills = listInternalSkills(root),
  externalSkills = readExternalSkillPins(root),
} = {}) {
  const requireKeys = (value, allowed, label) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`${label} must be an object`);
    }
    for (const key of Object.keys(value)) {
      if (!allowed.includes(key)) throw new Error(`${label} has unknown key: ${key}`);
    }
  };
  const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;

  requireKeys(policy, ["schemaVersion", "internal", "external"], "skill-index-policy.json");
  if (policy.schemaVersion !== 1 || !Array.isArray(policy.internal) || !Array.isArray(policy.external)) {
    throw new Error("skill-index-policy.json must use schemaVersion 1 and contain internal/external arrays");
  }

  const internalNames = new Set(internalSkills);
  const declaredInternal = new Set();
  for (const entry of policy.internal) {
    requireKeys(entry, ["skill", "indexPath", "reason", "consumer", "evidence"], "internal index entry");
    if (!nonEmpty(entry.skill) || !internalNames.has(entry.skill)) {
      throw new Error(`Unknown internal skill in index policy: ${entry.skill}`);
    }
    if (declaredInternal.has(entry.skill)) throw new Error(`Duplicate internal index policy entry: ${entry.skill}`);
    declaredInternal.add(entry.skill);
    if (entry.indexPath !== "index.json") throw new Error(`${entry.skill}: indexPath must be index.json`);
    for (const field of ["reason", "consumer", "evidence"]) {
      if (!nonEmpty(entry[field])) throw new Error(`${entry.skill}: ${field} must be non-empty`);
    }
  }

  const expectedExternal = new Map(externalSkills.map((entry) => [entry.skill, entry]));
  if (expectedExternal.size !== externalSkills.length) {
    throw new Error("pom.xml contains duplicate external skill names");
  }
  const declaredExternal = new Set();
  for (const entry of policy.external) {
    requireKeys(entry, ["repo", "ref", "skill", "disposition", "reason", "evidence", "nextAction"], "external index entry");
    if (!nonEmpty(entry.skill) || !expectedExternal.has(entry.skill)) {
      throw new Error(`Unknown external skill in index policy: ${entry.skill}`);
    }
    if (declaredExternal.has(entry.skill)) throw new Error(`Duplicate external index policy entry: ${entry.skill}`);
    declaredExternal.add(entry.skill);
    const expected = expectedExternal.get(entry.skill);
    if (entry.repo !== expected.repo || entry.ref !== expected.ref) {
      throw new Error(`${entry.skill}: index policy repo/ref does not match pom.xml pin`);
    }
    if (!["remove", "retain", "legacy"].includes(entry.disposition)) {
      throw new Error(`${entry.skill}: invalid index disposition ${entry.disposition}`);
    }
    if (!nonEmpty(entry.reason) || !nonEmpty(entry.evidence)) {
      throw new Error(`${entry.skill}: reason and evidence must be non-empty`);
    }
    if (entry.disposition === "legacy" && !nonEmpty(entry.nextAction)) {
      throw new Error(`${entry.skill}: legacy entry requires nextAction`);
    }
  }
  for (const skill of expectedExternal.keys()) {
    if (!declaredExternal.has(skill)) throw new Error(`Missing external index policy entry: ${skill}`);
  }
  return policy;
}

export function assertInternalIndexFiles(root = projectRoot, policy = readSkillIndexPolicy(root), {
  allowMissingRetained = false,
} = {}) {
  const adopted = new Set(policy.internal.map((entry) => entry.skill));
  for (const skill of listInternalSkills(root)) {
    const indexPath = path.join(root, "skills", skill, "index.json");
    assertIndexPresence(skill, path.dirname(indexPath), adopted.has(skill), {
      allowMissingAdopted: allowMissingRetained,
    });
  }
  return adopted;
}

export function assertIndexPresence(skill, skillDir, adopted, { allowMissingAdopted = false } = {}) {
  const indexPath = path.join(skillDir, "index.json");
  let stat;
  try {
    stat = fs.lstatSync(indexPath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (!stat && adopted && !allowMissingAdopted) {
    throw new Error(`${skill}/index.json is adopted but missing`);
  }
  if (stat && !stat.isFile()) {
    throw new Error(`${skill}/index.json exists but is not a regular file`);
  }
  if (stat && !adopted) {
    throw new Error(`${skill}/index.json exists but is not declared as adopted`);
  }
  return Boolean(stat);
}
