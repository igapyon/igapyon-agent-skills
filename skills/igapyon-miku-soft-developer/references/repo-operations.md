# miku-soft Repository Operations

Use this short repository note only after `igapyon-miku-soft-developer` has been explicitly activated.

`igapyon-repo-conventions` is a prerequisite baseline for this skill. Apply its repository rules for `.gitignore`, `.DS_Store`, `workplace/`, `workplace/.gitkeep`, `.codex/skills/`, Java / Maven `.mvn/jvm.config`, and README documentation of repository operation rules.

This file only records miku-soft-specific additions.

## miku-soft Additions

- For new miku-soft projects, copy the bundled basic documents from [miku-soft-basic/](miku-soft-basic/) into the target repository's `docs/` directory as described in [new-project-workflow.md](new-project-workflow.md).
- Keep miku-soft basic document filenames unchanged when copying them into `docs/`.
- Use README and TODO for the actual project state; avoid restating broad miku-soft theory that already lives in the basic documents.
- Record unresolved miku-soft design, entrypoint, diagnostics, artifact-role, parity, or verification follow-ups in `TODO.md` or project docs.
- Regenerate `index.json` or similar indexes with the target repository's documented command when indexed files change.
