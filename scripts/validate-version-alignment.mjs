#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

function requireMatch(value, expression, label, format) {
  const match = String(value).match(expression);
  if (!match) throw new Error(`Invalid ${label} format: ${value}\nExpected format: ${format}`);
  return match;
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

export function assertVersionAlignment({ projectVersion, mikukuText }) {
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

  if (projectDate !== mikukuDate || Number(projectNumber) !== suffixToNumber(mikukuSuffix)) {
    throw new Error(
      `Version mismatch:\n  pom.xml project.version: ${projectVersion}\n  VERSION.md Version:      ${mikukuVersion}`,
    );
  }
  return { projectVersion, mikukuVersion };
}

export function projectVersionFromPom(pomText) {
  const matches = [...String(pomText).matchAll(/^  <version>([^<\r\n]+)<\/version>[\t ]*\r?$/gm)];
  if (matches.length !== 1) throw new Error("Expected exactly one top-level project.version in pom.xml");
  return matches[0][1];
}

export async function validateVersionAlignment(argv, read = readFile) {
  if (argv[0] === "--repo" && argv.length === 2 && argv[1]) {
    const root = path.resolve(argv[1]);
    const files = [
      path.join(root, "pom.xml"),
      path.join(root, "skills/igapyon-mikuku-agent/references/VERSION.md"),
    ];
    const [pom, mikukuText] = await Promise.all(files.map((file) => read(file, "utf8")));
    return assertVersionAlignment({ projectVersion: projectVersionFromPom(pom), mikukuText });
  }

  const [projectVersion, mikukuVersionFile] = argv;
  if (!projectVersion || !mikukuVersionFile || argv.length !== 2) {
    throw new Error("Usage: validate-version-alignment.mjs --repo <repository-root> | <project-version> <mikuku-version-file>");
  }
  const mikukuText = await read(mikukuVersionFile, "utf8");
  return assertVersionAlignment({ projectVersion, mikukuText });
}

async function main(argv = process.argv.slice(2)) {
  const result = await validateVersionAlignment(argv);
  console.log(`Version alignment OK: ${result.projectVersion} / ${result.mikukuVersion}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
