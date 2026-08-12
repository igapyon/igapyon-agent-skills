import path from "node:path";

// Result and handoff paths are serialized contracts, not host-native paths.
// Keep them portable so the same reviewed value is valid on macOS and Windows.
export function normalizeOperationalPath(value) {
  return String(value).replaceAll("\\", "/");
}

export function relativeOperationalPath(from, to, pathApi = path) {
  return normalizeOperationalPath(pathApi.relative(from, to));
}
