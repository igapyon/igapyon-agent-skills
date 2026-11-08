import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

// Keep operational files local without requiring a tracked .gitignore edit.
export async function ensureOperationalExclusion(root, git) {
  const ignored = git(root, ["check-ignore", "--quiet", "--", "workplace/miku-scm/probe"], { allowFailure: true });
  if (ignored.ok) return [];
  const result = git(root, ["rev-parse", "--git-path", "info/exclude"]);
  const file = path.resolve(root, (result.out ?? result.stdout).trim());
  await mkdir(path.dirname(file), { recursive: true });
  await appendFile(file, "\n# miku-scm local operational files\n/workplace/miku-scm/\n", "utf8");
  return ["Operational files were not ignored; added workplace/miku-scm/ to Git's local info/exclude and continued."];
}

export const ORDINARY_PATHSPEC = ["--", ".", ":(exclude)workplace/miku-scm"];
export function isOperationalPath(value) {
  return value.replaceAll("\\", "/").startsWith("workplace/miku-scm/");
}
