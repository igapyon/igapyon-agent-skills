import fs from "node:fs";
import path from "node:path";

// These are representative source routes, not model-behavior or token-cost measurements.
export const representativeRoutes = [
  ["igapyon-agent-state-management", "resume state", ["references/markdown-state-files.md"]],
  ["igapyon-companion-musicpost-writer", "polish a music post", ["references/style-guide.md"]],
  ["igapyon-companion-techpost-writer", "polish a technical post", ["references/style-guide.md"]],
  ["igapyon-diary-writer", "write a diary entry", ["references/workflow.md"]],
  ["igapyon-ffmpeg-helper", "locate H4essential inputs", ["references/process/h4essential-input-discovery.md"]],
  ["igapyon-github-writer", "draft PR text", ["references/pr-writing.md"]],
  ["igapyon-miku-daybook", "add a task", ["references/records.md", "references/operations.md"]],
  ["igapyon-miku-scm", "read SCM operation contracts", ["references/workflow-contracts.md"]],
  ["igapyon-miku-soft-developer", "create an Agent Skill", ["references/40-agent-skills-workflow.md"]],
  ["igapyon-mikuku-agent", "look up version, representative image, and article rules", ["references/VERSION.md", "assets/mikuku/mikuku01.png", "references/article-writing.md"]],
  ["igapyon-note-writer", "convert a Note table to an image", ["references/note-markdown-table-images.md"]],
  ["igapyon-repo-conventions", "apply repository rules", ["references/repository-rules.md"]],
  ["igapyon-reviewer", "review an Agent Skill", ["references/20-targets/agent-skill/agent-skill-review.md"]],
  ["igapyon-skill-compactor", "compact a skill", ["references/agent-skill/compaction-workflow.md"]],
];

export function reachableFiles(skillRoot) {
  const pending = ["SKILL.md"], reached = new Set();
  while (pending.length) {
    const relative = pending.shift();
    if (reached.has(relative)) continue;
    const absolute = path.join(skillRoot, relative);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) continue;
    reached.add(relative);
    if (!relative.endsWith(".md")) continue;
    const text = fs.readFileSync(absolute, "utf8");
    const destinations = [
      ...[...text.matchAll(/\[[^\]\n]*\]\(([^)\n]+)\)/g)].map((match) => match[1]),
      ...[...text.matchAll(/`([^`\s]+\.(?:md|json|png))`/g)].map((match) => match[1]),
    ];
    for (const destination of destinations) {
      if (/^(?:[a-z]+:|#|\/)/i.test(destination)) continue;
      const target = path.resolve(path.dirname(absolute), destination.split("#")[0]);
      const local = path.relative(skillRoot, target);
      if (local.startsWith("..") || path.isAbsolute(local) || local === "index.json") continue;
      pending.push(local);
    }
  }
  return reached;
}

export function assertRepresentativeRoutes({ skillName, skillDir }) {
  const route = representativeRoutes.find(([name]) => name === skillName);
  if (!route) return { checked: false, targetCount: 0 };

  const reached = reachableFiles(skillDir);
  const [, , targets] = route;
  for (const target of targets) {
    if (!reached.has(target)) {
      throw new Error(`${skillName}: representative route is not reachable from SKILL.md: ${target}`);
    }
    let stat;
    try {
      stat = fs.statSync(path.join(skillDir, target));
    } catch {
      throw new Error(`${skillName}: representative target is missing: ${target}`);
    }
    if (!stat.isFile() || stat.size === 0) {
      throw new Error(`${skillName}: representative target is not a non-empty file: ${target}`);
    }
  }
  return { checked: true, targetCount: targets.length };
}
