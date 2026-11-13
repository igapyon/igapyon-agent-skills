import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { listInternalSkills, parseExternalSkillPins, parseSkillIndexPolicy } from "../skill-index-policy.mjs";

const inputs = ["pom.xml", "config/skill-index-policy.json"];
const hash = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

export async function captureInputs(root) {
  const files = {};
  for (const relative of inputs) files[relative] = await fs.readFile(path.join(root, relative));
  const externalSkills = parseExternalSkillPins(files["pom.xml"].toString("utf8"));
  const policy = parseSkillIndexPolicy(files["config/skill-index-policy.json"].toString("utf8"), {
    root, externalSkills, internalSkills: listInternalSkills(root),
  });
  if (!externalSkills.length) throw new Error("no external Skills configured");
  if (policy.external.length !== externalSkills.length) throw new Error("external skill index policy mismatch");
  for (const entry of externalSkills) {
    if (!/^[0-9a-f]{40}$/.test(entry.ref)) throw new Error(`${entry.skill}: pin-is-not-a-lowercase-40-character-SHA`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.skill) || entry.skill.length > 64) throw new Error(`${entry.skill}: invalid-skill-name`);
    const url = new URL(entry.repo);
    if (url.protocol !== "https:" || url.hostname !== "github.com" || url.username || url.password || url.search || url.hash || !/^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?\/?$/.test(url.pathname)) throw new Error(`${entry.skill}: unsupported-repository-url`);
  }
  return { files, entries: externalSkills, hashes: Object.fromEntries(inputs.map((name) => [name, hash(files[name])])) };
}

export async function compareInputHashes(root, captured) {
  const files = [];
  let stable = true;
  for (const relative of inputs) {
    try {
      const bytes = await fs.readFile(path.join(root, relative));
      const sha256 = hash(bytes);
      if (sha256 !== captured.hashes[relative]) stable = false;
      files.push({ path: relative, sha256, readStatus: "ok" });
    } catch (error) {
      stable = false;
      files.push({ path: relative, sha256: null, readStatus: error.code ?? "read-error" });
    }
  }
  return { checkedAt: new Date().toISOString(), stable, files };
}
