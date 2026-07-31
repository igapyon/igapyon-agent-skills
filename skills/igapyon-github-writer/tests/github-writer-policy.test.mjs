import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

import { generate } from "../scripts/github-writer-workflow-contracts.mjs";

const skillDirectory = new URL("../", import.meta.url);

function runtimeSources(directory = skillDirectory, prefix = "") {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const name = `${prefix}${entry.name}`;
    if (entry.isDirectory()) return runtimeSources(new URL(`${entry.name}/`, directory), `${name}/`);
    if (!entry.isFile() || !entry.name.endsWith(".mjs")) return [];
    return [{ name, text: readFileSync(new URL(entry.name, directory), "utf8") }];
  });
}

test("runtime command surface prohibits gh, shells, network clients, and remote Git verbs", () => {
  const sources = runtimeSources();
  const combined = sources.map(({ name, text }) => `// ${name}\n${text}`).join("\n");
  assert.doesNotMatch(combined, /\bspawnSync\(\s*["']gh["']/);
  assert.doesNotMatch(combined, /\bspawnSync\(\s*["'](?:sh|bash|cmd|powershell|pwsh|curl|wget)["']/);
  assert.doesNotMatch(combined, /\b(?:exec|execSync|execFile|execFileSync)\s*\(/);

  const processTargets = [...combined.matchAll(/\bspawnSync\(\s*([^,\n]+)/g)]
    .map((match) => match[1].trim());
  assert.deepEqual([...new Set(processTargets)].sort(), ["\"git\"", "process.execPath"]);

  const core = sources.find(({ name }) => name === "scripts/github-writer-core.mjs").text;
  assert.doesNotMatch(core, /git\([^\n]*\[\s*["'](?:fetch|pull|push)["']/);
});

test("generated workflow contract lock has no drift", () => {
  assert.equal(generate({ check: true }).length, 9);
});
