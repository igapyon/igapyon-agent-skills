---
name: igapyon-repo-conventions
description: Use when applying igapyon's repository conventions to a local Git or GitHub repository, including repo-side .gitignore rules, .DS_Store exclusion, workplace/.gitkeep setup, .codex/skills exclusion, Java/Maven .mvn/jvm.config handling, and README documentation of repository operation rules.
---

# igapyon-repo-conventions

This skill helps Codex apply igapyon's standard repository conventions to a local Git repository.

Use it when the user wants to set up, inspect, or document repository-level conventions rather than implement product behavior.

## Core Workflow

1. Inspect the repository before editing.
2. Preserve unrelated user changes.
3. Read [references/repository-rules.md](references/repository-rules.md) before applying concrete conventions.
4. Document repository operation rules in `README.md` when appropriate.
5. Verify the final diff and report any pre-existing unrelated changes.

Prefer existing repository patterns over introducing a new structure.

## Reference Use

Use [references/repository-rules.md](references/repository-rules.md) for the concrete rules covering `.gitignore`, `.DS_Store`, `workplace/`, `.codex/skills/`, Java / Maven `.mvn/jvm.config`, and README documentation.

Use files under [references/template/](references/template/) when creating or updating root convention documents such as `CONTRIBUTING.md`, `CONTRIBUTORS.md`, or `THIRD_PARTY_NOTICES.md`.
Do not leave template placeholders such as `PROJECT_NAME`, `NAME_OR_HANDLE`, or `DEPENDENCY_NAME` in committed files. If required information is unknown, either defer creating the file or create a minimal accurate document without placeholder text.

Use `index.json` when you need to discover the available bundled files, but treat `SKILL.md` and files under `references/` as the source of truth.

Keep this `SKILL.md` lean. Put detailed conventions and examples in `references/` unless they are required to decide whether the skill should run.

## Verification

Before finishing:

- run `git diff -- README.md TODO.md .gitignore .mvn/jvm.config workplace/.gitkeep CONTRIBUTING.md CONTRIBUTORS.md THIRD_PARTY_NOTICES.md`
- run `git status --short`
- mention any unrelated modified files that were already present or not touched

Do not revert unrelated changes.
