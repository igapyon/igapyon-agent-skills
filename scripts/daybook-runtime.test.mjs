import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { checkDaybookRuntime } from "./check-daybook-runtime.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const bundleRoot = path.join(projectRoot, "skills/igapyon-miku-daybook/assets/daybook");

test("daybook CLIs run from an isolated bundle with Node.js and bundled files only", () => {
  assert.deepEqual(checkDaybookRuntime(bundleRoot), {
    checked: true,
    packageInstall: false,
    cliHelpCount: 5,
    activityInputModes: ["stdin", "file"],
    noGitActivityCreation: true,
    copiedYamlShadow: true,
    aliasedCliExecution: true,
  });
});
