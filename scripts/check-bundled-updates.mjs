#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { captureInputs, compareInputHashes } from "./bundled-updates/config.mjs";
import { requestJson, validateCompare, validateRelease } from "./bundled-updates/github.mjs";
import { isExcludedSourcePath } from "./release-archive-files.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const runId = () => new Date().toISOString().replaceAll(":", "-") + "-" + crypto.randomUUID();

export function parseArgs(argv) {
  const result = { repo: projectRoot, format: "human", jobs: 3 };
  const seen = new Set();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help") return { help: true };
    if (!["--repo", "--format", "--jobs"].includes(arg) || seen.has(arg)) throw new Error(`Unknown or repeated option: ${arg}`);
    seen.add(arg);
    const value = argv[++i];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}`);
    if (arg === "--repo") result.repo = path.resolve(value);
    if (arg === "--format") result.format = value;
    if (arg === "--jobs") result.jobs = Number(value);
  }
  if (!new Set(["human", "json"]).has(result.format)) throw new Error("--format must be human or json");
  if (!Number.isInteger(result.jobs) || result.jobs < 1 || result.jobs > 4) throw new Error("--jobs must be 1..4");
  return result;
}

export function execFile(command, args, { cwd, timeout = 45000, maxBytes = 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: false, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
    const stdout = [], stderr = []; let size = 0;
    const timer = setTimeout(() => child.kill("SIGKILL"), timeout);
    child.stdout.on("data", (chunk) => { size += chunk.length; if (size > maxBytes) child.kill("SIGKILL"); else stdout.push(chunk); });
    child.stderr.on("data", (chunk) => { if (stderr.reduce((n, part) => n + part.length, 0) < 65536) stderr.push(chunk); });
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code, signal) => { clearTimeout(timer); if (code !== 0) reject(new Error(`command-failed:${signal ?? code}:${Buffer.concat(stderr).toString("utf8").slice(0, 1000)}`)); else resolve(Buffer.concat(stdout)); });
  });
}

async function mapLimit(items, limit, fn) {
  const output = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const index = next++; output[index] = await fn(items[index]); }
  }));
  return output;
}

function parseGithubUrl(value) {
  const url = new URL(value);
  const parts = url.pathname.replace(/\.git\/?$/, "").split("/").filter(Boolean);
  return { owner: parts[0], repo: parts[1] };
}

function errorRecord(phase, error) {
  return { phase, code: String(error.message).split(":")[0].slice(0, 80), message: String(error.message).slice(0, 300) };
}

function treeRecords(raw, skill) {
  const prefix = `skills/${skill}/`, result = new Map(), invalid = [];
  for (const record of raw.toString("utf8").split("\0").filter(Boolean)) {
    const tab = record.indexOf("\t"), meta = record.slice(0, tab).split(" "), name = record.slice(tab + 1);
    if (!name.startsWith(prefix)) continue;
    const relative = name.slice(prefix.length), [mode, type, oid] = meta;
    if (isExcludedSourcePath(relative)) continue;
    const item = { mode, type, oid };
    result.set(relative, item);
    if (type !== "blob" || !["100644", "100755"].includes(mode)) invalid.push({ path: relative, mode, type });
  }
  return { result, invalid };
}

export async function checkEntry(entry, repoRoot, runDir, deps) {
  const checkedAt = deps.now().toISOString();
  const result = { skill: entry.skill, repo: entry.repo, currentPin: entry.ref, defaultBranch: null, observedHead: null, headObservedAt: checkedAt, pinStatus: "unknown", skillChange: "unknown", evidenceStatus: "partial", release: { status: "not-queried", tag: null, name: null, url: null }, history: { status: "not-queried" }, changes: { distributedFiles: null, skillDefinitionChanged: null }, artifacts: {}, errors: [] };
  const { owner, repo } = parseGithubUrl(entry.repo);
  let head;
  try {
    const output = (await deps.exec("git", ["ls-remote", "--symref", "--exit-code", entry.repo, "HEAD"], { cwd: repoRoot })).toString("utf8").trim().split("\n");
    result.defaultBranch = output.find((line) => line.startsWith("ref: refs/heads/") && line.endsWith("\tHEAD"))?.match(/^ref: refs\/heads\/(.+)\tHEAD$/)?.[1] ?? null;
    head = output.find((line) => /^[0-9a-f]{40}\tHEAD$/.test(line))?.split("\t")[0];
    if (!result.defaultBranch || !head) throw new Error("invalid-ls-remote-response");
    result.observedHead = head; result.pinStatus = head === entry.ref ? "same" : "changed";
  } catch (error) { result.errors.push(errorRecord("head", error)); }

  try {
    const response = await deps.requestJson(`https://api.github.com/repos/${owner}/${repo}/releases/latest`);
    if (response.status === "not-found") {
      result.release = { status: "not-found", tag: null, name: null, url: null };
      result.errors.push({ phase: "release", code: "not-found", message: "No published latest release was found" });
    }
    else { result.release = { status: "ok", ...validateRelease(response.data, owner, repo) }; }
  } catch (error) { result.release = { status: "error", tag: null, name: null, url: null }; result.errors.push(errorRecord("release", error)); }

  if (head && head !== entry.ref) {
    try {
      const response = await deps.requestJson(`https://api.github.com/repos/${owner}/${repo}/compare/${entry.ref}...${head}?per_page=100`);
      if (response.status !== "ok") throw new Error("compare-not-found");
      result.history = { status: "ok", ...validateCompare(response.data, owner, repo, entry.ref, head, Boolean(response.hasNextPage)) };
    } catch (error) { result.history = { status: "error" }; result.errors.push(errorRecord("history", error)); }
    try {
      const bare = path.join(runDir, "tmp", crypto.randomUUID() + ".git"); await fs.mkdir(path.dirname(bare), { recursive: true });
      await deps.exec("git", ["init", "--bare", bare], { cwd: repoRoot });
      await deps.exec("git", ["-C", bare, "fetch", "--no-tags", "--depth=1", entry.repo, entry.ref, head], { cwd: repoRoot });
      for (const sha of [entry.ref, head]) {
        const verified = (await deps.exec("git", ["-C", bare, "rev-parse", "--verify", `${sha}^{commit}`], { cwd: repoRoot })).toString("utf8").trim();
        if (verified !== sha) throw new Error("fetched-object-is-not-expected-commit");
      }
      async function tree(sha) {
        const rootRaw = await deps.exec("git", ["-C", bare, "ls-tree", "-z", sha, `skills/${entry.skill}`], { cwd: repoRoot });
        const rootRecord = rootRaw.toString("utf8").split("\0").filter(Boolean)[0] ?? "";
        let rootInfo = null;
        if (rootRecord) {
          const tab = rootRecord.indexOf("\t"), [mode, type, oid] = rootRecord.slice(0, tab).split(" ");
          rootInfo = { mode, type, oid };
        }
        const raw = await deps.exec("git", ["-C", bare, "ls-tree", "-r", "-z", "--full-tree", sha], { cwd: repoRoot });
        return { ...treeRecords(raw, entry.skill), rootInfo };
      }
      const [beforeTree, afterTree] = await Promise.all([tree(entry.ref), tree(head)]);
      const before = beforeTree.result, after = afterTree.result;
      const names = [...new Set([...before.keys(), ...after.keys()])].sort();
      const changes = names.filter((name) => JSON.stringify(before.get(name)) !== JSON.stringify(after.get(name))).map((name) => ({ path: name, before: before.get(name) ?? null, after: after.get(name) ?? null }));
      const invalidMaterials = [...beforeTree.invalid.map((x) => ({ side: "before", ...x })), ...afterTree.invalid.map((x) => ({ side: "after", ...x }))];
      for (const [side, item] of [["before", beforeTree.rootInfo], ["after", afterTree.rootInfo]]) {
        if (item && !(item.mode === "040000" && item.type === "tree")) invalidMaterials.push({ side, path: ".", mode: item.mode, type: item.type });
        if (!item) invalidMaterials.push({ side, path: ".", mode: null, type: "missing" });
      }
      const skillMd = after.get("SKILL.md");
      if (!skillMd || skillMd.type !== "blob" || !["100644", "100755"].includes(skillMd.mode)) invalidMaterials.push({ side: "after", path: "SKILL.md", mode: skillMd?.mode ?? null, type: skillMd?.type ?? "missing" });
      const dir = path.join(runDir, "evidence", entry.skill); await fs.mkdir(dir, { recursive: true });
      for (const [label, sha, source] of [["before", entry.ref, before], ["after", head, after]]) {
        const blob = source.get("SKILL.md");
        if (blob?.type === "blob" && ["100644", "100755"].includes(blob.mode)) {
          const bytes = await deps.exec("git", ["-C", bare, "show", `${sha}:skills/${entry.skill}/SKILL.md`], { cwd: repoRoot, maxBytes: 512 * 1024 });
          await fs.writeFile(path.join(dir, `SKILL.${label}.md`), bytes, { flag: "wx" });
        }
      }
      const changesPath = path.join(dir, "changes.json");
      await fs.writeFile(changesPath, JSON.stringify({ skill: entry.skill, oldSha: entry.ref, newSha: head, changes, invalidMaterials }, null, 2) + "\n", { flag: "wx" });
      result.artifacts.changes = path.relative(runDir, changesPath);
      result.skillChange = changes.length ? "changed" : "identical"; result.changes.distributedFiles = changes.length;
      result.changes.skillDefinitionChanged = JSON.stringify(before.get("SKILL.md")) !== JSON.stringify(after.get("SKILL.md"));
      if (invalidMaterials.length) { result.errors.push({ phase: "source", code: "invalid-material", message: `${invalidMaterials.length} unsupported material record(s)` }); }
    } catch (error) { result.errors.push(errorRecord("source", error)); }
  } else if (head) {
    result.skillChange = "identical"; result.changes.distributedFiles = 0; result.changes.skillDefinitionChanged = false; result.history = { status: "not-needed" };
  }
  const metadataComplete = result.release.status === "ok";
  const historyComplete = result.history.status === "ok" || result.history.status === "not-needed";
  const sourceError = result.errors.some((error) => error.phase === "source");
  result.evidenceStatus = head && metadataComplete && historyComplete && !sourceError ? "complete" : "partial";
  return result;
}

function outputShape(runDir, startedAt, results, inputInfo, errors = []) {
  const changed = results.filter((item) => item.pinStatus === "changed");
  const incomplete = results.filter((item) => item.evidenceStatus !== "complete");
  const inputChanged = Boolean(inputInfo.inputChanged);
  return { schemaVersion: "igapyon-agent-skills.bundled-update-check/v1", runId: path.basename(runDir), startedAt, finishedAt: new Date().toISOString(), completion: incomplete.length || inputChanged || errors.length ? "partial" : "complete", inputChanged, inputHashes: inputInfo.hashes, inputs: "inputs.json", errors, updatesAvailable: changed.length > 0, allPinsMatch: results.every((item) => item.pinStatus === "same"), counts: { total: results.length, same: results.filter((item) => item.pinStatus === "same").length, changed: changed.length, unknown: results.filter((item) => item.pinStatus === "unknown").length, incomplete: incomplete.length }, entries: results };
}

async function saveRun(runDir, output, format, stdout) {
  const resultPath = path.join(runDir, "result.json"), summaryPath = path.join(runDir, "summary.md");
  await fs.writeFile(resultPath, JSON.stringify(output, null, 2) + "\n");
  const summary = [`External Skills: ${output.counts.total} / same ${output.counts.same} / updates ${output.counts.changed} / incomplete ${output.counts.incomplete}`, `Input changed: ${output.inputChanged}${output.errors.length ? ` (${output.errors.map((e) => e.message).join("; ")})` : ""}`, "Pin updates and packaging were not applied.", ...output.entries.filter((item) => item.pinStatus !== "same" || item.evidenceStatus !== "complete").map((item) => `- ${item.skill}: ${item.currentPin.slice(0, 12)} → ${(item.observedHead ?? "unknown").slice(0, 12)} / ${item.skillChange} / ${item.evidenceStatus}`), `Result: ${resultPath}`].join("\n") + "\n";
  await fs.writeFile(summaryPath, summary);
  stdout(format === "json" ? JSON.stringify({ runId: output.runId, completion: output.completion, inputChanged: output.inputChanged, counts: output.counts, resultPath, summaryPath }) + "\n" : summary);
  return output.completion === "complete" ? 0 : 2;
}

export async function collectBundledUpdates({ repo, jobs = 3, format = "human", stdout = (text) => process.stdout.write(text), deps = {} }) {
  const dependencies = { exec: deps.exec ?? execFile, requestJson: deps.requestJson ?? ((url) => requestJson(url, { fetchImpl: deps.fetchImpl ?? fetch })), now: deps.now ?? (() => new Date()) };
  const root = await fs.realpath(repo);
  const gitRoot = (await dependencies.exec("git", ["rev-parse", "--show-toplevel"], { cwd: root })).toString("utf8").trim();
  if (await fs.realpath(gitRoot) !== root) throw new Error("--repo must be the Git root");
  const captured = await captureInputs(root);
  const stamp = runId(), runDir = path.join(root, "workplace", "bundled-updates", "runs", stamp);
  await fs.mkdir(runDir, { recursive: true });
  const branch = (await dependencies.exec("git", ["branch", "--show-current"], { cwd: root })).toString("utf8").trim();
  const head = (await dependencies.exec("git", ["rev-parse", "HEAD"], { cwd: root })).toString("utf8").trim();
  const dirty = Boolean((await dependencies.exec("git", ["status", "--porcelain"], { cwd: root })).toString("utf8").trim());
  const inputDoc = { schemaVersion: "igapyon-agent-skills.bundled-update-inputs/v1", repoRoot: root, branch, head, dirty, capturedAt: dependencies.now().toISOString(), files: Object.entries(captured.files).map(([name, bytes]) => ({ path: name, sha256: captured.hashes[name], byteLength: bytes.length })), entries: captured.entries, beforeDispatch: null, afterCollection: null };
  const before = await compareInputHashes(root, captured); inputDoc.beforeDispatch = before; await fs.writeFile(path.join(runDir, "inputs.json"), JSON.stringify(inputDoc, null, 2) + "\n");
  const startedAt = dependencies.now().toISOString();
  if (!before.stable) {
    const results = captured.entries.map((entry) => ({ skill: entry.skill, repo: entry.repo, currentPin: entry.ref, defaultBranch: null, observedHead: null, headObservedAt: null, pinStatus: "unknown", skillChange: "unknown", evidenceStatus: "partial", release: { status: "not-queried" }, history: { status: "not-queried" }, changes: {}, artifacts: {}, errors: [{ phase: "inputs", code: "changed-before-dispatch", message: "Configuration changed before remote dispatch" }] }));
    const output = outputShape(runDir, startedAt, results, { hashes: captured.hashes, inputChanged: true }, [{ phase: "inputs", code: "changed-before-dispatch", message: "Configuration changed before remote dispatch" }]);
    return { exitCode: await saveRun(runDir, output, format, stdout), output, runDir };
  }
  let results;
  try { results = await mapLimit(captured.entries, jobs, (entry) => checkEntry(entry, root, runDir, dependencies)); }
  catch (error) { results = captured.entries.map((entry) => ({ skill: entry.skill, repo: entry.repo, currentPin: entry.ref, pinStatus: "unknown", skillChange: "unknown", evidenceStatus: "error", errors: [errorRecord("worker", error)] })); }
  const after = await compareInputHashes(root, captured); inputDoc.afterCollection = after; await fs.writeFile(path.join(runDir, "inputs.json"), JSON.stringify(inputDoc, null, 2) + "\n");
  const runErrors = after.stable ? [] : [{ phase: "inputs", code: "changed-during-run", message: "Configuration changed during collection; results describe captured inputs" }];
  const output = outputShape(runDir, startedAt, results, { hashes: captured.hashes, inputChanged: !after.stable }, runErrors);
  return { exitCode: await saveRun(runDir, output, format, stdout), output, runDir };
}

export async function runCli(argv, { collect = collectBundledUpdates, stdout = (text) => process.stdout.write(text), stderr = (text) => process.stderr.write(text) } = {}) {
  try {
    const options = parseArgs(argv);
    if (options.help) { stdout("Usage: node scripts/check-bundled-updates.mjs [--repo <path>] [--format human|json] [--jobs 1..4]\n"); return 0; }
    return (await collect({ ...options, stdout })).exitCode;
  } catch (error) { stderr(`${String(error.message).slice(0, 1000)}\n`); return 1; }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) process.exitCode = await runCli(process.argv.slice(2));
