import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  canonicalText,
  defaultGit,
  isPathInside,
  normalizeResultPath,
  sha256,
} from "../scripts/github-writer-kernel.mjs";
import {
  WORKFLOW_DEFINITIONS,
  WORKFLOW_MANIFEST_VERSION,
} from "../scripts/github-writer-workflow-manifest.mjs";

test("fixed workflow manifest exposes the supported contract", () => {
  assert.equal(WORKFLOW_MANIFEST_VERSION, "github-writer.workflow-manifest/v3");
  assert.deepEqual(
    WORKFLOW_DEFINITIONS.map((workflow) => workflow.id),
    [
      "pr.evidence",
      "release.evidence",
      "about.evidence",
      "draft.validate-and-save",
      "branch.status",
      "backup.preflight",
      "backup.apply",
      "pr.recommit.preflight",
      "pr.recommit.apply",
      "approval.handoff.list",
      "approval.handoff.apply",
      "approval.handoff.dismiss",
    ],
  );
  for (const workflow of WORKFLOW_DEFINITIONS) {
    assert.equal(workflow.network_access, "none");
    assert.equal(workflow.remote_mutation, false);
    assert.deepEqual(workflow.allowed_executables, ["git"]);
    assert.ok(workflow.allowed_options.length > 0);
    assert.ok(workflow.references.includes("github-cli-prohibition.md"));
    assert.ok(workflow.references.includes("runtime-and-observability.md"));
    assert.ok(workflow.contract_sources.includes("scripts/github-writer-core.mjs"));
    assert.ok(workflow.contract_sources.includes("scripts/github-writer-output.mjs"));
    assert.ok(workflow.contract_sources.includes("scripts/github-writer-observability.mjs"));
    assert.ok(workflow.contract_sources.includes("scripts/github-writer-help.mjs"));
    assert.deepEqual(workflow.runtime_references, []);
    assert.equal(workflow.help_contract.artifact_writes, false);
  }
});

test("Windows path containment handles drive letters, Japanese paths, and UNC shares", () => {
  assert.equal(isPathInside("C:\\repo", "c:\\repo\\資料\\PR.md", "win32"), true);
  assert.equal(isPathInside("C:\\repo", "C:\\repository\\PR.md", "win32"), false);
  assert.equal(
    isPathInside("\\\\server\\share\\repo", "\\\\server\\share\\repo\\資料\\PR.md", "win32"),
    true,
  );
  assert.equal(
    isPathInside("\\\\server\\share\\repo", "\\\\server\\share\\other\\PR.md", "win32"),
    false,
  );
});

test("line endings and result paths are platform-neutral", () => {
  const lf = canonicalText("タイトル\n\n本文\n");
  const crlf = canonicalText("タイトル\r\n\r\n本文\r\n");
  assert.equal(crlf, lf);
  assert.equal(sha256(crlf), sha256(lf));
  assert.equal(normalizeResultPath("workplace\\github-writer\\plans\\計画.json"),
    "workplace/github-writer/plans/計画.json");
});

test("runner process execution avoids command shells", () => {
  const core = readFileSync(
    new URL("../scripts/github-writer-core.mjs", import.meta.url),
    "utf8",
  );
  const kernel = readFileSync(new URL("../scripts/github-writer-kernel.mjs", import.meta.url), "utf8");
  const runner = readFileSync(
    new URL("../scripts/github-writer-run.mjs", import.meta.url),
    "utf8",
  );
  assert.match(core, /spawnSync\("git", args,/);
  assert.match(core, /MAX_GIT_CAPTURE_BYTES = 64 \* 1024 \* 1024/);
  assert.match(core, /shell: false/);
  assert.doesNotMatch(`${core}\n${kernel}\n${runner}`, /\bexec(?:File)?Sync\s*\(/);
  assert.doesNotMatch(`${core}\n${kernel}\n${runner}`, /spawnSync\("(?:sh|bash|cmd|powershell|pwsh)"/);
  assert.ok(kernel.split("\n").length < 80, "compatibility facade should stay small");
  assert.match(kernel, /github-writer-evidence\.mjs/);
  assert.match(kernel, /github-writer-operations\.mjs/);
  assert.match(kernel, /github-writer-output\.mjs/);
  assert.match(runner, /pathToFileURL\(process\.argv\[1\]\)/);
  assert.throws(
    () => defaultGit(process.cwd(), ["push", "origin", "HEAD"]),
    /outside the local allowlist/,
  );
});

test("evidence disables repository-specific diff renderers and bounds output fields", () => {
  const evidence = readFileSync(
    new URL("../scripts/github-writer-evidence.mjs", import.meta.url),
    "utf8",
  );
  assert.match(evidence, /"--no-ext-diff", "--no-textconv", "--no-renames"/);
  assert.match(evidence, /changed_files_truncated/);
  assert.match(evidence, /diff_stat_truncated/);
  assert.match(evidence, /github-writer\.writing-contract\/v1/);
});
