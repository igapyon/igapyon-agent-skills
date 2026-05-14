# miku-soft Repository Operations

Use this short repository note only after `igapyon-miku-soft-developer` has been explicitly activated.

`igapyon-repo-conventions` is a prerequisite baseline for this skill. Apply its repository rules for `.gitignore`, `.DS_Store`, `workplace/`, `workplace/.gitkeep`, `.codex/skills/`, Java / Maven `.mvn/jvm.config`, and README documentation of repository operation rules.

This file only records miku-soft-specific additions.

## miku-soft Additions

- GitHub operations are a human responsibility. Do not create GitHub repositories, push branches or tags, open pull requests, publish releases, or upload release assets as part of this skill workflow. The agent may prepare local files, inspect local git state, and draft GitHub-facing text or instructions when asked.
- For new miku-soft projects, create `docs/miku-soft-reference.md` as the project-local entry point to the shared references, as described in [new-project-workflow.md](new-project-workflow.md).
- Do not copy bundled miku-soft basic documents into each project repository. Keep the shared basic documents in `igapyon-miku-soft-developer`.
- Include the shared skill's GitHub location in `docs/miku-soft-reference.md`: <https://github.com/igapyon/igapyon-agent-skills/tree/devel/skills/igapyon-miku-soft-developer>.
- Record the checked miku-soft reference date, skill commit, and main workflow used in project-specific development or worklog documents.
- Use README and TODO for the actual project state; avoid restating broad miku-soft theory that already lives in the basic documents.
- Record unresolved miku-soft design, entrypoint, diagnostics, artifact-role, parity, or verification follow-ups in `TODO.md` or project docs.
- Regenerate `index.json` or similar indexes with the target repository's documented command when indexed files change.
