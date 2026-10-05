# Migrate task dates to a planned period

Use this guide when an existing daybook changes task date keys or when you copy this version of the daybook skill and generator into a daybook repository. This source tree implements the new keys as of 2026-10-05. No release version is assigned here; migrate only after the installed skill and the target repository's `scripts/day-plan.mjs` both include this change.

The task's planned work period is inclusive. A one-day task uses the same start and end date. `planned_end_date` means the date by which the planned work is expected to finish; it does not mean that the task is actually complete. Record completion with `status: done` and `completed`. Preserve any separate firm deadline, time, source, or milestone in the task body/history.

## Field mapping

| Existing key or information | New handling |
| --- | --- |
| `planned_date` | Rename to `planned_start_date` after confirming it represents the planned work start. |
| `due` | Candidate for `planned_end_date`. Confirm the meaning; preserve any firm external deadline and its source/modifiers in the body/history. |
| `due_month` | Keep unchanged as month-only deadline information. Do not invent a day or use it as `planned_end_date`. |
| `planned_week` | Keep the week information. Resolve it alongside the planned dates if the period is known; do not silently expand it to exact dates. |
| `due_date` | This is not the old key used by this skill. The old task keys are `planned_date` and `due`. |

For example, when the old dates represented the planned work interval:

```yaml
# before
planned_date: 2026-10-05
due: 2026-10-09
```

```yaml
# after
planned_start_date: 2026-10-05
planned_end_date: 2026-10-09
```

The bundled generator reads old keys as aliases while migration is in progress. If an old key and its corresponding new key are both present with the same value, it can read the record. If the values differ, generation stops and names the conflicting keys. This compatibility does not rewrite task files. New tasks must use the new keys.

## Migration steps

1. Update the installed daybook skill and copy the matching bundled `scripts/day-plan.mjs` and `scripts/generate-day-plan.mjs` into the target daybook repository. Confirm the target has the `yaml` dependency used by the scripts. An older generator may not understand the new keys.
2. Check the target repository's README and Git status. Back up the task records or create a separate branch before editing. Do not overwrite unrelated local changes.
3. Review every `YYYY/YYYYMM/tasks/task-*.md`, including `done` and `cancelled` records. Classify each as a clear key rename, missing date, unclear meaning, or recurring rule. Keep each task's ID, file name, creation month, status, `completed`, links, attachments, and body history.
4. Edit task front matter record by record. Rename the relevant keys; do not run a repository-wide text replacement. If both old and new keys exist, compare their values. Stop and resolve a mismatch instead of choosing one silently. Validate that both dates are real `YYYY-MM-DD` dates and that `planned_start_date <= planned_end_date`.
5. Resolve incomplete ordinary task periods explicitly. Keep every date the user or record clearly specifies. If a date must be provisionally supplied, use the daybook's Asia/Tokyo rules: with neither date known, use today for both; with only a start known, use that date for the provisional end; with only an end known, use the earlier of today and the end for the provisional start. Record the provisional field, value, and basis in the task body/history. Do not infer missing historical dates silently.
6. Preserve `due_month` and `planned_week`. If a precise period is not known, leave the coarse information in place and flag the task for date review rather than guessing. For a weekly recurring rule with no natural finish, do not invent a planned end date; its `next_occurrence` and dated schedules represent individual instances. A weekly task with an explicitly finite planned period still needs both dates.
7. Review the diff for date meaning and preserved metadata. Then generate a representative day-plan into a separate output root so canonical snapshots are not overwritten:

   ```sh
   node scripts/generate-day-plan.mjs --date YYYY-MM-DD --output-root workplace/task-date-migration-preview
   ```

   Replace `YYYY-MM-DD` with a date that exercises migrated records. Check that a task appears while the target date is inside its period, upcoming start/end and overdue sections are appropriate, incomplete periods appear under `日程要確認`, and source task files are unchanged by generation. This check does not require posting an Issue comment or dispatching a workflow.
8. Once all records are migrated and reviewed, remove the old `planned_date` and `due` keys. Keep their history and any separate deadline meaning in the task body. You may migrate incrementally while both generator keys remain supported, provided duplicate old/new values agree.

There is no automatic data migration command in this bundle. The alias reader supports a staged transition; the daybook owner edits their own task records. Ask the daybook skill to help classify or update records when review of many tasks is useful, and approve the resulting per-record changes before applying them.
