#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

function requireMatch(value, expression, label, format) {
  const match = String(value).match(expression);
  if (!match) throw new Error(`Invalid ${label} format: ${value}\nExpected format: ${format}`);
  return match;
}

function productVersion(runnerText, label) {
  const [, version] = requireMatch(
    runnerText,
    /export const PRODUCT_VERSION = "([^"]+)";/,
    label,
    'export const PRODUCT_VERSION = "<project version>";',
  );
  return version;
}

function suffixToNumber(suffix) {
  let number = 0;
  for (const character of suffix) {
    const value = character.charCodeAt(0) - 96;
    if (value < 1 || value > 26) throw new Error(`Invalid mikuku version suffix: ${suffix}`);
    number = number * 26 + value;
  }
  return number;
}

export function assertVersionAlignment({ projectVersion, mikukuText, runnerText, githubWriterText }) {
  const [, projectDate, projectNumber] = requireMatch(
    projectVersion,
    /^1\.(\d{8})\.([1-9]\d*)$/,
    "project version",
    "1.YYYYMMDD.N",
  );
  const [, mikukuVersion] = requireMatch(
    mikukuText,
    /^Version:\s*(\S+)\s*$/m,
    "mikuku version source",
    "a line beginning with Version:",
  );
  const [, mikukuDate, mikukuSuffix] = requireMatch(
    mikukuVersion,
    /^(\d{8})([a-z][a-z]*)$/,
    "mikuku version",
    "YYYYMMDDx",
  );
  const runnerVersion = productVersion(runnerText, "miku-scm runner PRODUCT_VERSION");

  if (projectDate !== mikukuDate || Number(projectNumber) !== suffixToNumber(mikukuSuffix)) {
    throw new Error(
      `Version mismatch:\n  pom.xml project.version: ${projectVersion}\n  VERSION.md Version:      ${mikukuVersion}`,
    );
  }
  if (runnerVersion !== projectVersion) {
    throw new Error(
      `Version mismatch:\n  pom.xml project.version:          ${projectVersion}\n  miku-scm PRODUCT_VERSION:          ${runnerVersion}`,
    );
  }
  const result = { projectVersion, mikukuVersion, runnerVersion };
  if (githubWriterText !== undefined) {
    const githubWriterVersion = productVersion(
      githubWriterText,
      "github-writer runner PRODUCT_VERSION",
    );
    if (githubWriterVersion !== projectVersion) {
      throw new Error(
        `Version mismatch:\n  pom.xml project.version:          ${projectVersion}\n  github-writer PRODUCT_VERSION:     ${githubWriterVersion}`,
      );
    }
    result.githubWriterVersion = githubWriterVersion;
  }
  return result;
}

export async function validateVersionAlignment(argv, read = readFile) {
  const [projectVersion, mikukuVersionFile, runnerFile, githubWriterFile] = argv;
  if (!projectVersion || !mikukuVersionFile || !runnerFile || (argv.length !== 3 && argv.length !== 4)) {
    throw new Error("Usage: validate-version-alignment.mjs <project-version> <mikuku-version-file> <runner-file> [github-writer-runner-file]");
  }
  const [mikukuText, runnerText, githubWriterText] = await Promise.all([
    read(mikukuVersionFile, "utf8"),
    read(runnerFile, "utf8"),
    githubWriterFile ? read(githubWriterFile, "utf8") : Promise.resolve(undefined),
  ]);
  return assertVersionAlignment({ projectVersion, mikukuText, runnerText, githubWriterText });
}

async function main(argv = process.argv.slice(2)) {
  const result = await validateVersionAlignment(argv);
  const githubWriter = result.githubWriterVersion ? ` / github-writer ${result.githubWriterVersion}` : "";
  console.log(`Version alignment OK: ${result.projectVersion} / ${result.mikukuVersion} / miku-scm ${result.runnerVersion}${githubWriter}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
