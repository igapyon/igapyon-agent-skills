import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";

const ROOT = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const zipPath = path.resolve(ROOT, "bundle", "igapyon-" + packageJson.name + "-" + packageJson.version + ".zip");
const verifierPath = path.join(ROOT, "scripts", "verify-release-zip.mjs");

test("staged release ZIP passes isolated artifact verification", () => {
  execFileSync("npm", ["run", "build:bundle:zip"], {
    cwd: ROOT,
    encoding: "utf8"
  });

  execFileSync(process.execPath, [verifierPath, zipPath], {
    cwd: ROOT,
    encoding: "utf8"
  });
});
