import assert from "node:assert/strict";
import test from "node:test";

import { assertVersionAlignment, projectVersionFromPom, validateVersionAlignment } from "../../../scripts/validate-version-alignment.mjs";

const aligned = {
  projectVersion: "1.20260812.10",
  mikukuText: "# Version\n\nVersion: 20260812j\n",
  runnerText: 'export const PRODUCT_VERSION = "1.20260812.10";\n',
};

test("repository version validation includes the installed miku-scm runner version", () => {
  assert.deepEqual(assertVersionAlignment(aligned), {
    projectVersion: "1.20260812.10",
    mikukuVersion: "20260812j",
    runnerVersion: "1.20260812.10",
  });
});

test("repository version validation rejects a stale miku-scm runner version", () => {
  assert.throws(
    () => assertVersionAlignment({
      ...aligned,
      runnerText: 'export const PRODUCT_VERSION = "1.20260812.9";\n',
    }),
    /miku-scm PRODUCT_VERSION:\s+1\.20260812\.9/,
  );
});

test("repository version validation includes the github-writer runner version", () => {
  assert.deepEqual(assertVersionAlignment({
    ...aligned,
    githubWriterText: 'export const PRODUCT_VERSION = "1.20260812.10";\n',
  }), {
    projectVersion: "1.20260812.10",
    mikukuVersion: "20260812j",
    runnerVersion: "1.20260812.10",
    githubWriterVersion: "1.20260812.10",
  });
});

test("repository version validation rejects a stale github-writer runner version", () => {
  assert.throws(
    () => assertVersionAlignment({
      ...aligned,
      githubWriterText: 'export const PRODUCT_VERSION = "1.20260812.9";\n',
    }),
    /github-writer PRODUCT_VERSION:\s+1\.20260812\.9/,
  );
});

test("repository version validation reads all four canonical sources from --repo", async () => {
  const root = "/synthetic/repository";
  const texts = new Map([
    [`${root}/pom.xml`, "<project>\n  <version>1.20260812.10</version>\n  <build><version>9.0</version></build>\n</project>\n"],
    [`${root}/skills/igapyon-mikuku-agent/references/VERSION.md`, "Version: 20260812j\n"],
    [`${root}/skills/igapyon-miku-scm/scripts/miku-scm-run.mjs`, 'export const PRODUCT_VERSION = "1.20260812.10";\n'],
    [`${root}/skills/igapyon-github-writer/scripts/github-writer-workflow-manifest.mjs`, 'export const PRODUCT_VERSION = "1.20260812.10";\n'],
  ]);
  const reads = [];
  const result = await validateVersionAlignment(["--repo", root], async (file) => {
    reads.push(file);
    return texts.get(file);
  });
  assert.equal(projectVersionFromPom(texts.get(`${root}/pom.xml`)), "1.20260812.10");
  assert.equal(reads.length, 4);
  assert.equal(result.githubWriterVersion, "1.20260812.10");
});
