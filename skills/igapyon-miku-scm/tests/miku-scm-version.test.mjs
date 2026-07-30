import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  inspectVersion,
  numberToSuffix,
  parseArgs,
} from "../scripts/miku-scm-version.mjs";

async function workspace(t, files) {
  const root = await mkdtemp(path.join(os.tmpdir(), "miku-scm-version-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await Promise.all(Object.entries(files).map(([file, content]) => (
    writeFile(path.join(root, file), content, "utf8")
  )));
  return root;
}

function dependencies(root, date = "2026-07-27T12:00:00Z") {
  return {
    now: () => new Date(date),
    collectSnapshot: async () => ({
      root,
      branch: "devel-tiga0727weg",
      head: "a".repeat(40),
      dirty: false,
    }),
  };
}

test("version parser rejects unknown policy, escaping paths, and duplicate sources", () => {
  assert.throws(() => parseArgs(["--policy", "guess"]), /Unsupported --policy/);
  assert.throws(() => parseArgs(["--version-file", "../VERSION.md"]), /inside the repository/);
  assert.throws(
    () => parseArgs(["--version-file", "pom.xml", "--version-file", "pom.xml"]),
    /Duplicate/,
  );
});

test("alphabetic version suffix continues after z", () => {
  assert.equal(numberToSuffix(1), "a");
  assert.equal(numberToSuffix(26), "z");
  assert.equal(numberToSuffix(27), "aa");
  assert.equal(numberToSuffix(28), "ab");
});

test("miku date validation checks coupling and computes the same-day candidate", async (t) => {
  const root = await workspace(t, {
    "pom.xml": "<project><version>1.20260727.4</version></project>\n",
    "VERSION.md": "# Version\n\nVersion: 20260727d\n",
  });
  const result = await inspectVersion(parseArgs([
    "--repo", root,
    "--version-file", "pom.xml",
    "--coupled-version-file", "VERSION.md",
    "--policy", "miku-date-coupled",
    "--timezone", "Asia/Tokyo",
    "--validate-increment",
  ]), dependencies(root));
  assert.equal(result.status, "validated");
  assert.equal(result.alignment, "aligned");
  assert.equal(result.proposed.authoritative, "1.20260727.5");
  assert.equal(result.proposed.coupled, "20260727e");
  assert.equal(result.mutation_invoked, false);
});

test("date validation resets the sequence on a new maintenance date", async (t) => {
  const root = await workspace(t, {
    "pom.xml": "<project><version>1.20260727.26</version></project>\n",
    "VERSION.md": "Version: 20260727z\n",
  });
  const result = await inspectVersion(parseArgs([
    "--repo", root,
    "--version-file", "pom.xml",
    "--coupled-version-file", "VERSION.md",
    "--policy", "miku-date-coupled",
    "--timezone", "Asia/Tokyo",
    "--validate-increment",
  ]), dependencies(root, "2026-07-28T02:00:00Z"));
  assert.equal(result.proposed.authoritative, "1.20260728.1");
  assert.equal(result.proposed.coupled, "20260728a");
});

test("content date and SemVer candidates follow their explicit policies", async (t) => {
  const contentRoot = await workspace(t, { "VERSION.md": "20260727z\n" });
  const content = await inspectVersion(parseArgs([
    "--repo", contentRoot,
    "--version-file", "VERSION.md",
    "--policy", "content-date",
    "--timezone", "Asia/Tokyo",
    "--validate-increment",
  ]), dependencies(contentRoot));
  assert.equal(content.proposed.authoritative, "20260727aa");

  const semverRoot = await workspace(t, { "package.json": "{\"version\":\"1.2.3\"}\n" });
  const semver = await inspectVersion(parseArgs([
    "--repo", semverRoot,
    "--version-file", "package.json",
    "--policy", "semver",
    "--level", "minor",
    "--validate-increment",
  ]), dependencies(semverRoot));
  assert.equal(semver.proposed.authoritative, "1.3.0");
  assert.equal(semver.timezone, null);
});

test("status may report format candidates but does not infer repository policy", async (t) => {
  const root = await workspace(t, {
    "package.json": "{\"name\":\"fixture\",\"version\":\"2.3.4\"}\n",
  });
  const result = await inspectVersion(parseArgs(["--repo", root]), dependencies(root));
  assert.equal(result.status, "inspected");
  assert.equal(result.policy, "auto");
  assert.equal(result.policy_explicit, false);
  assert.equal(result.policy_resolved, false);
  assert.deepEqual(result.authoritative[0].format_candidates, ["semver"]);
  assert.equal(result.proposed, null);
});

test("increment validation refuses ambiguous policy or missing policy inputs", async (t) => {
  const root = await workspace(t, { "package.json": "{\"version\":\"1.2.3\"}\n" });
  await assert.rejects(
    () => inspectVersion(parseArgs([
      "--repo", root,
      "--version-file", "package.json",
      "--validate-increment",
    ]), dependencies(root)),
    /explicit --policy/,
  );
  await assert.rejects(
    () => inspectVersion(parseArgs([
      "--repo", root,
      "--version-file", "package.json",
      "--policy", "semver",
      "--validate-increment",
    ]), dependencies(root)),
    /requires --level/,
  );
});

test("status exposes explicit policy mismatch without guessing", async (t) => {
  const root = await workspace(t, {
    "package.json": "{\"version\":\"2.3.4\"}\n",
  });
  const result = await inspectVersion(parseArgs([
    "--repo", root,
    "--version-file", "package.json",
    "--policy", "content-date",
  ]), dependencies(root));
  assert.equal(result.status, "unresolved");
  assert.equal(result.policy_explicit, true);
  assert.equal(result.policy_matches_source, false);
  assert.equal(result.policy_resolved, false);
});

test("date validation refuses a backwards maintenance date", async (t) => {
  const root = await workspace(t, { "VERSION.md": "20260728a\n" });
  await assert.rejects(
    () => inspectVersion(parseArgs([
      "--repo", root,
      "--version-file", "VERSION.md",
      "--policy", "content-date",
      "--timezone", "Asia/Tokyo",
      "--validate-increment",
    ]), dependencies(root, "2026-07-27T02:00:00Z")),
    /precedes current version date/,
  );
});

test("coupled validation stops on a missing or mismatched coupled source", async (t) => {
  const root = await workspace(t, {
    "pom.xml": "<project><version>1.20260727.4</version></project>\n",
    "VERSION.md": "Version: 20260727c\n",
  });
  await assert.rejects(
    () => inspectVersion(parseArgs([
      "--repo", root,
      "--version-file", "pom.xml",
      "--policy", "miku-date-coupled",
      "--timezone", "Asia/Tokyo",
      "--validate-increment",
    ]), dependencies(root)),
    /requires a coupled version source/,
  );
  await assert.rejects(
    () => inspectVersion(parseArgs([
      "--repo", root,
      "--version-file", "pom.xml",
      "--coupled-version-file", "VERSION.md",
      "--policy", "miku-date-coupled",
      "--timezone", "Asia/Tokyo",
      "--validate-increment",
    ]), dependencies(root)),
    /mismatched/,
  );
});
