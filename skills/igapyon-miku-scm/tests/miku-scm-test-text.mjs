import { readFile } from "node:fs/promises";

export function normalizeTextLineEndings(value) {
  return String(value).replace(/\r\n?/g, "\n");
}

export async function readNormalizedText(pathOrUrl) {
  return normalizeTextLineEndings(await readFile(pathOrUrl, "utf8"));
}
