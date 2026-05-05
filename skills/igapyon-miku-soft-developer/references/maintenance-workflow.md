# Existing miku-soft Maintenance Workflow

Use this short workflow only after `igapyon-miku-soft-developer` has been explicitly activated.

Detailed maintenance principles live under [miku-soft-basic/](miku-soft-basic/). Keep this file as the inspection and execution order.

## First Reads

Inspect durable repository context before planning edits:

1. `README.md`
2. `TODO.md` if present
3. relevant files under `docs/`
4. relevant generated indexes if present
5. relevant `workplace/` files only when repository instructions point there

Then inspect git status.

## Change Checklist

1. Identify the owning layer: product core, entrypoint adapter, docs, tests, packaging, or repository operation.
2. Read the relevant basic document selected by [architecture-rules.md](architecture-rules.md).
3. Make the smallest change that preserves the documented boundary.
4. Update README, docs, TODO, tests, or indexes when the change affects them.
5. Run relevant verification.
6. Review git diff and status before finishing.

Do not update only one entrypoint when repository evidence shows the requested behavior belongs to shared product semantics.
