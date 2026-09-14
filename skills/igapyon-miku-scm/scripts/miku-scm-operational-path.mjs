import path from "node:path";

// Result and handoff paths are serialized contracts, not host-native paths.
// Keep them portable so the same reviewed value is valid on macOS and Windows.
export function normalizeOperationalPath(value) {
  return String(value).replaceAll("\\", "/");
}

export function isPathWithin(root, target, pathApi = path) {
  const relative = pathApi.relative(root, target);
  return relative === ""
    || (!pathApi.isAbsolute(relative)
      && relative !== ".."
      && !relative.startsWith(`..${pathApi.sep}`));
}

export function assertPathWithin(root, target, pathApi = path) {
  if (!isPathWithin(root, target, pathApi)) throw new Error("Path must stay inside the repository");
  return target;
}

export function relativeOperationalPath(from, to, pathApi = path) {
  return normalizeOperationalPath(pathApi.relative(from, to));
}
