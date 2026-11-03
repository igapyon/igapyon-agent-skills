#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const TIMESTAMP_RECORD_SCHEMA = "igapyon-agent-skills.release-archive-timestamp/v1";

export function parseOutputTimestamp(value) {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})T00:00:00Z$/);
  if (!match) {
    throw new Error("Release output timestamp must be an ISO UTC midnight: YYYY-MM-DDT00:00:00Z");
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (year < 1980 || year > 2107) {
    throw new Error("Release output timestamp year must be in the ZIP DOS date range 1980..2107");
  }

  const timestampMs = Date.UTC(year, month - 1, day);
  const date = new Date(timestampMs);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    throw new Error("Release output timestamp must contain a valid calendar date");
  }

  return {
    value: `${yearText}-${monthText}-${dayText}T00:00:00Z`,
    date: `${yearText}-${monthText}-${dayText}`,
    epoch_seconds: timestampMs / 1000,
  };
}

export function createTimestampRecord(value, projectVersion) {
  if (!projectVersion || !/^[A-Za-z0-9][A-Za-z0-9._+-]*$/.test(projectVersion)) {
    throw new Error("Project version is missing or invalid");
  }
  const timestamp = parseOutputTimestamp(value);
  return {
    schema_version: TIMESTAMP_RECORD_SCHEMA,
    project_version: projectVersion,
    output_timestamp: timestamp.value,
    output_timestamp_epoch_seconds: timestamp.epoch_seconds,
  };
}

async function main(argv = process.argv.slice(2)) {
  if (argv.length !== 2) {
    throw new Error("Usage: record-release-archive-timestamp.mjs <output-timestamp> <project-version>");
  }
  const [value, projectVersion] = argv;
  const record = createTimestampRecord(value, projectVersion);
  const root = fileURLToPath(new URL("..", import.meta.url));
  const target = path.join(root, "target");
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(
    path.join(target, "release-archive-timestamp.json"),
    `${JSON.stringify(record, null, 2)}\n`,
    { encoding: "utf8", flag: "w" },
  );
  process.stdout.write(`Release archive timestamp: ${record.output_timestamp}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
