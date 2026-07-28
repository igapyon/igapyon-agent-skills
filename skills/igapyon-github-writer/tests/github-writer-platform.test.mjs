import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  canonicalText,
  isPathInside,
  normalizeResultPath,
  sha256,
} from "../scripts/github-writer-kernel.mjs";
import {
  WORKFLOW_DEFINITIONS,
  WORKFLOW_MANIFEST_VERSION,
} from "../scripts/github-writer-workflow-manifest.mjs";

test("fixed workflow manifest exposes the supported contract", () => {
  assert.equal(WORKFLOW_MANIFEST_VERSION, "github-writer.workflow-manifest/v1");
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
    ],
  );
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
  const kernel = readFileSync(
    new URL("../scripts/github-writer-kernel.mjs", import.meta.url),
    "utf8",
  );
  const runner = readFileSync(
    new URL("../scripts/github-writer-run.mjs", import.meta.url),
    "utf8",
  );
  assert.match(kernel, /spawnSync\("git", args,/);
  assert.match(kernel, /shell: false/);
  assert.doesNotMatch(`${kernel}\n${runner}`, /\bexec(?:File)?Sync\s*\(/);
  assert.doesNotMatch(`${kernel}\n${runner}`, /spawnSync\("(?:sh|bash|cmd|powershell|pwsh)"/);
  assert.match(runner, /pathToFileURL\(process\.argv\[1\]\)/);
});
