import assert from "node:assert/strict";
import test from "node:test";

import { assertVersionAlignment } from "../../../scripts/validate-version-alignment.mjs";

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
