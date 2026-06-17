#!/usr/bin/env node

import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const usage = `Usage:
  node restore-generated-image-from-session.mjs --session-jsonl <session.jsonl> --out <image-path> [--overwrite]

Restores:
  latest image_generation_end.payload.result PNG base64 -> <image-path>
`;

function parseArgs(argv) {
  const args = { overwrite: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--overwrite") {
      args.overwrite = true;
    } else if (arg === "--session-jsonl") {
      args.sessionJsonl = argv[++i];
    } else if (arg === "--out") {
      args.out = argv[++i];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

async function assertFile(filePath, label) {
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      throw new Error(`${label} is not a file: ${filePath}`);
    }
    return fileStat;
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`${label} does not exist: ${filePath}`);
    }
    throw error;
  }
}

async function assertParentDirectory(filePath) {
  const parentDir = path.dirname(filePath);
  try {
    const parentStat = await stat(parentDir);
    if (!parentStat.isDirectory()) {
      throw new Error(`Output parent path is not a directory: ${parentDir}`);
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`Output parent directory does not exist: ${parentDir}`);
    }
    throw error;
  }
}

async function assertWritableDestination(filePath, overwrite) {
  try {
    const outputStat = await stat(filePath);
    if (!outputStat.isFile()) {
      throw new Error(`Output path exists but is not a file: ${filePath}`);
    }
    if (!overwrite) {
      throw new Error(`Output already exists. Use --overwrite to replace it: ${filePath}`);
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

function stripDataUrlPrefix(value) {
  const match = value.match(/^data:image\/png;base64,(.+)$/s);
  return match ? match[1] : value;
}

function decodePngBase64(value) {
  const normalized = stripDataUrlPrefix(value.trim()).replace(/\s+/g, "");
  if (!normalized) {
    throw new Error("Latest image_generation_end.payload.result is empty.");
  }
  const image = Buffer.from(normalized, "base64");
  if (image.length < pngSignature.length || !image.subarray(0, pngSignature.length).equals(pngSignature)) {
    throw new Error("Decoded payload is not a PNG image.");
  }
  return image;
}

function findLatestImageResult(jsonlText) {
  let latest = null;
  let latestLineNumber = 0;
  const lines = jsonlText.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) {
      continue;
    }

    let record;
    try {
      record = JSON.parse(line);
    } catch (error) {
      throw new Error(`Invalid JSON on line ${i + 1}: ${error.message}`);
    }

    if (
      record?.type === "event_msg" &&
      record?.payload?.type === "image_generation_end" &&
      typeof record?.payload?.result === "string" &&
      record.payload.result.trim() !== ""
    ) {
      latest = record.payload.result;
      latestLineNumber = i + 1;
    }
  }

  if (!latest) {
    throw new Error("No image_generation_end.payload.result found in session JSONL.");
  }

  return { result: latest, lineNumber: latestLineNumber };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(usage);
    return;
  }
  if (!args.sessionJsonl || !args.out) {
    throw new Error(usage);
  }

  const sessionJsonl = path.resolve(args.sessionJsonl);
  const out = path.resolve(args.out);

  await assertFile(sessionJsonl, "Session JSONL");
  await assertParentDirectory(out);
  await assertWritableDestination(out, args.overwrite);

  const jsonlText = await readFile(sessionJsonl, "utf8");
  const { result, lineNumber } = findLatestImageResult(jsonlText);
  const image = decodePngBase64(result);

  await writeFile(out, image);

  process.stdout.write(`Restored image_generation_end payload from line ${lineNumber} -> ${out}\n`);
  process.stdout.write(`Wrote ${image.length} bytes\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
