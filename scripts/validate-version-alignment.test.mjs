import assert from "node:assert/strict";
import test from "node:test";

import {
  assertVersionAlignment,
  projectVersionFromPom,
  validateVersionAlignment,
} from "./validate-version-alignment.mjs";

const aligned = {
  projectVersion: "1.20261112.4",
  mikukuText: "# Version\n\nVersion: 20261112d\n",
};

test("repository version alignment compares pom.xml with the Mikuku VERSION source", () => {
  assert.deepEqual(assertVersionAlignment(aligned), {
    projectVersion: "1.20261112.4",
    mikukuVersion: "20261112d",
  });
});

test("repository version alignment rejects a date or suffix mismatch", () => {
  assert.throws(
    () => assertVersionAlignment({ ...aligned, mikukuText: "Version: 20261112c\n" }),
    /Version mismatch:/,
  );
  assert.throws(
    () => assertVersionAlignment({ ...aligned, projectVersion: "1.20261113.4" }),
    /Version mismatch:/,
  );
});

test("projectVersionFromPom reads only one top-level version", () => {
  assert.equal(projectVersionFromPom(
    "<project>\n  <version>1.20261112.4</version>\n  <dependency><version>9</version></dependency>\n</project>\n",
  ), "1.20261112.4");
  assert.throws(() => projectVersionFromPom("<project/>"), /exactly one/);
  assert.throws(() => projectVersionFromPom(
    "  <version>1.20261112.4</version>\n  <version>1.20261112.5</version>\n",
  ), /exactly one/);
});

test("--repo validation reads only pom.xml and the Mikuku VERSION source", async () => {
  const root = "/synthetic/repository";
  const texts = new Map([
    [`${root}/pom.xml`, "<project>\n  <version>1.20261112.4</version>\n</project>\n"],
    [`${root}/skills/igapyon-mikuku-agent/references/VERSION.md`, "Version: 20261112d\n"],
  ]);
  const reads = [];
  const result = await validateVersionAlignment(["--repo", root], async (file) => {
    reads.push(file);
    return texts.get(file);
  });
  assert.deepEqual(result, { projectVersion: "1.20261112.4", mikukuVersion: "20261112d" });
  assert.deepEqual(reads.sort(), [...texts.keys()].sort());
});

test("direct validation reads the supplied Mikuku VERSION file", async () => {
  const reads = [];
  const result = await validateVersionAlignment(["1.20261112.4", "/synthetic/VERSION.md"], async (file) => {
    reads.push(file);
    return "Version: 20261112d\n";
  });
  assert.deepEqual(result, { projectVersion: "1.20261112.4", mikukuVersion: "20261112d" });
  assert.deepEqual(reads, ["/synthetic/VERSION.md"]);
});
