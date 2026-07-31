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

When the maintenance target is `igapyon-miku-soft-developer` itself, and the
work concerns reference taxonomy, shared starter policy, GitHub Actions
normalization, or a previous audit decision, read
[../docs/maintenance/README.md](../docs/maintenance/README.md). Keep dated
planning evidence there until an approved rule is promoted into `references/`
or `assets/`.

## No Specific Change Requested

When maintenance mode is active for a known repository but no defect, feature,
or concrete maintenance item was named, do not stop at inspection. Run
Maintenance Opportunity Selection in the
[maintenance adoption workflow](../docs/maintenance/adoption-workflow.md),
choose one bounded slice containing one or more mutually compatible items that
are already approved and locally verifiable, then implement and verify every
included item. Bound the slice by coherence and verification, not by an
arbitrary item count.

If no safe approved mutation is ready, complete a read-only assessment and
identify the exact decision, evidence, or dedicated migration needed next.
Do not invent policy or silently choose a different sibling repository. When
the repository itself was not named, use the current repository only if it is
clearly the active miku-soft target; otherwise identify the target before
editing.

## Maintenance Uplift Check

For every existing miku-soft repository maintenance task, check whether an
already-approved shared improvement fits the requested scope. Follow the
[maintenance adoption workflow](../docs/maintenance/adoption-workflow.md) for
the applicability, verification, recording, and deferral rules.

The check is the default; adopting an improvement is conditional. Do not add
an unrelated public-contract change merely because the repository is already
being edited.

When the user explicitly requests an urgent, minimal, or narrowly scoped
change, or when an uplift would materially delay or increase the risk of the
requested result, the additional uplift pass may be skipped. State the reason
briefly when reporting the work. This skip never removes the required
verification for the requested change itself.

## Change Checklist

1. Identify the owning layer: product core, entrypoint adapter, docs, tests, packaging, or repository operation.
2. Read the relevant basic document selected by [architecture-rules.md](architecture-rules.md).
3. Run the Maintenance Uplift Check; when no change was requested, select a bounded slice of one or more compatible ready opportunities instead of treating the absence of a reported defect as completion.
4. Make the smallest change that preserves the documented boundary.
5. Update README, docs, TODO, tests, or indexes when the change affects them.
6. When the user mentions GitHub Actions, identify whether they mean CI baseline, release asset workflow, or publish workflow before creating or editing workflow files.
7. Run relevant verification for the requested change, when present, and every adopted improvement.
8. Review git diff and status before finishing.

Do not update only one entrypoint when repository evidence shows the requested behavior belongs to shared product semantics.
