import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { checkEntry, collectBundledUpdates } from "./check-bundled-updates.mjs";
import { requestJson, validateCompare, validateRelease } from "./bundled-updates/github.mjs";
import { captureInputs } from "./bundled-updates/config.mjs";

const shaA = "a".repeat(40), shaB = "b".repeat(40);

function fakeResponse(chunks, { status = 200, headers = {} } = {}) {
  let index = 0, cancelled = false, released = false;
  const response = {
    status, ok: status >= 200 && status < 300,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    body: { getReader: () => ({
      async read() { return index < chunks.length ? { done: false, value: Buffer.from(chunks[index++]) } : { done: true }; },
      async cancel() { cancelled = true; }, releaseLock() { released = true; },
    }) },
  };
  return { response, state: () => ({ cancelled, released, index }) };
}

test("bounded JSON reader accepts exact limit and cancels an oversized stream", async () => {
  const exact = fakeResponse(["{", "}"]);
  assert.deepEqual((await requestJson("https://example.test", { fetchImpl: async () => exact.response, maxBytes: 2 })).data, {});
  assert.equal(exact.state().released, true);
  const oversized = fakeResponse(["{}", " x", "ignored"]);
  await assert.rejects(requestJson("https://example.test", { fetchImpl: async () => oversized.response, maxBytes: 3 }), /response-too-large/);
  assert.equal(oversized.state().cancelled, true);
  assert.equal(oversized.state().index, 2);
});

test("metadata validators enforce repository identity and accept nullable release text", () => {
  const release = { id: 7, tag_name: "v1.0", draft: false, prerelease: false, url: "https://api.github.com/repos/acme/tool/releases/7", html_url: "https://github.com/acme/tool/releases/tag/v1.0", created_at: "2025-01-01T00:00:00Z", published_at: "2025-01-01T00:00:00Z", name: null, body: null, extra: true };
  assert.equal(validateRelease(release, "acme", "tool").name, null);
  assert.throws(() => validateRelease({ ...release, html_url: "https://github.com/acme-tool-other/releases/tag/v1.0" }, "acme", "tool"), /invalid-release-response/);
  const compare = { url: "https://api.github.com/repos/acme/tool/compare/" + shaA + "..." + shaB, html_url: "https://github.com/acme/tool/compare/" + shaA + "..." + shaB, base_commit: { sha: shaA }, status: "ahead", ahead_by: 1, behind_by: 0, total_commits: 0, commits: [] };
  assert.equal(validateCompare(compare, "acme", "tool", shaA, shaB).complete, true);
  assert.throws(() => validateCompare({ ...compare, base_commit: { sha: shaB } }, "acme", "tool", shaA, shaB), /invalid-compare-response/);
});

test("collector preserves changed pin and records failures after HEAD is known", async () => {
  const root = path.resolve(new URL("..", import.meta.url).pathname);
  const snapshot = await captureInputs(root), entry = snapshot.entries[0];
  const outputChunks = [];
  const deps = {
    async exec(_command, args) {
      if (args[0] === "rev-parse" && args[1] === "--show-toplevel") return Buffer.from(root);
      if (args[0] === "branch") return Buffer.from("test\n");
      if (args[0] === "rev-parse") return Buffer.from(shaA + "\n");
      if (args[0] === "status") return Buffer.from("");
      if (args[0] === "ls-remote") return Buffer.from(`ref: refs/heads/main\tHEAD\n${shaB}\tHEAD\n`);
      if (args[0] === "init") return Buffer.from("");
      if (args[0] === "-C" && args[1]?.endsWith(".git") && args[2] === "fetch") throw new Error("fixture-fetch-failed");
      throw new Error(`unexpected git invocation: ${args.join(" ")}`);
    },
    async requestJson() { throw new Error("fixture-api-failed"); },
  };
  const run = await collectBundledUpdates({ repo: root, jobs: 1, format: "json", stdout: (text) => outputChunks.push(text), deps });
  assert.equal(run.exitCode, 2);
  assert.equal(run.output.counts.changed, snapshot.entries.length);
  const item = run.output.entries.find((result) => result.skill === entry.skill);
  assert.equal(item.pinStatus, "changed");
  assert.equal(item.observedHead, shaB);
  assert.equal(item.evidenceStatus, "partial");
  assert.ok(item.errors.some((error) => error.phase === "release"));
  const stored = JSON.parse(await fs.readFile(path.join(run.runDir, "result.json"), "utf8"));
  assert.equal(stored.updatesAvailable, true);
  assert.equal(JSON.parse(outputChunks[0]).counts.changed, snapshot.entries.length);
});

test("collector detects configuration bytes changed during collection", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bundled-update-input-"));
  try {
    await fs.mkdir(path.join(root, "config"), { recursive: true }); await fs.mkdir(path.join(root, "skills"));
    const pomPath = path.join(root, "pom.xml");
    const pom = `<properties><external.fixture.repo>https://github.com/acme/tool</external.fixture.repo><external.fixture.ref>${shaA}</external.fixture.ref><external.fixture.skillName>fixture-skill</external.fixture.skillName></properties>`;
    await fs.writeFile(pomPath, pom);
    await fs.writeFile(path.join(root, "config/skill-index-policy.json"), JSON.stringify({ schemaVersion: 1, internal: [], external: [{ repo: "https://github.com/acme/tool", ref: shaA, skill: "fixture-skill", disposition: "retain", reason: "test", evidence: "fixture" }] }));
    const calls = [];
    const deps = {
      async exec(_command, args) {
        calls.push(args);
        if (args[0] === "rev-parse" && args[1] === "--show-toplevel") return Buffer.from(root);
        if (args[0] === "branch") return Buffer.from("fixture\n");
        if (args[0] === "rev-parse") return Buffer.from(shaA + "\n");
        if (args[0] === "status") return Buffer.from("");
        if (args[0] === "ls-remote") { await fs.writeFile(pomPath, pom + "\n"); return Buffer.from(`ref: refs/heads/main\tHEAD\n${shaA}\tHEAD\n`); }
        throw new Error(`unexpected git invocation: ${args.join(" ")}`);
      },
      async requestJson() { throw new Error("offline-fixture"); },
    };
    const run = await collectBundledUpdates({ repo: root, jobs: 1, deps, stdout: () => {} });
    assert.equal(run.exitCode, 2);
    assert.equal(run.output.inputChanged, true);
    assert.equal(run.output.counts.same, 1);
    assert.equal(run.output.completion, "partial");
    const inputs = JSON.parse(await fs.readFile(path.join(run.runDir, "inputs.json"), "utf8"));
    assert.equal(inputs.afterCollection.stable, false);
    assert.equal(inputs.entries[0].skill, "fixture-skill");
    assert.ok(calls.some((args) => args[0] === "ls-remote"));
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("HEAD failure remains unknown while independently collected release evidence is retained", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "bundled-update-entry-"));
  const release = { id: 7, tag_name: "v1.0", draft: false, prerelease: false, url: "https://api.github.com/repos/acme/tool/releases/7", html_url: "https://github.com/acme/tool/releases/tag/v1.0", created_at: "2025-01-01T00:00:00Z", published_at: "2025-01-01T00:00:00Z", name: null, body: null };
  try {
    const result = await checkEntry({ skill: "fixture-skill", repo: "https://github.com/acme/tool", ref: shaA }, temp, temp, {
      now: () => new Date("2026-01-01T00:00:00Z"), async exec() { throw new Error("head-unavailable"); }, async requestJson() { return { status: "ok", data: release }; },
    });
    assert.equal(result.pinStatus, "unknown"); assert.equal(result.release.status, "ok"); assert.equal(result.evidenceStatus, "partial");
  } finally { await fs.rm(temp, { recursive: true, force: true }); }
});

test("tree inspection keeps file changes and reports selected symlink material", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "bundled-update-tree-"));
  const pin = shaA, head = shaB;
  const blob = "c".repeat(40);
  try {
    const result = await checkEntry({ skill: "fixture-skill", repo: "https://github.com/acme/tool", ref: pin }, temp, temp, {
      now: () => new Date("2026-01-01T00:00:00Z"),
      async requestJson(url) {
        if (url.endsWith("/releases/latest")) throw new Error("release-offline");
        throw new Error("compare-offline");
      },
      async exec(_command, args) {
        if (args[0] === "ls-remote") return Buffer.from(`ref: refs/heads/main\tHEAD\n${head}\tHEAD\n`);
        if (args[0] === "init") return Buffer.from("");
        if (args[0] === "-C" && args[2] === "fetch") return Buffer.from("");
        if (args[0] === "-C" && args[2] === "rev-parse") return Buffer.from(`${args[4].startsWith(pin) ? pin : head}\n`);
        if (args[0] === "-C" && args[2] === "ls-tree" && args.includes("--full-tree")) {
          const side = args.includes(pin) ? pin : head;
          const records = `100644 blob ${blob}\tskills/fixture-skill/SKILL.md\0` +
            (side === head ? `120000 blob ${"d".repeat(40)}\tskills/fixture-skill/assets/alias\0` : "");
          return Buffer.from(records);
        }
        if (args[0] === "-C" && args[2] === "ls-tree") return Buffer.from(`040000 tree ${"e".repeat(40)}\tskills/fixture-skill\0`);
        if (args[0] === "-C" && args[2] === "show") return Buffer.from("# Fixture\n");
        throw new Error(`unexpected git invocation: ${args.join(" ")}`);
      },
    });
    assert.equal(result.pinStatus, "changed");
    assert.equal(result.skillChange, "changed");
    assert.equal(result.evidenceStatus, "partial");
    const changeDoc = JSON.parse(await fs.readFile(path.join(temp, result.artifacts.changes), "utf8"));
    assert.ok(changeDoc.invalidMaterials.some((item) => item.path === "assets/alias" && item.mode === "120000" && item.side === "after"));
  } finally { await fs.rm(temp, { recursive: true, force: true }); }
});
