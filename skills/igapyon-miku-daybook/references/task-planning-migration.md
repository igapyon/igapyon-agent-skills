# Separate planned tasks and Backlog

Use this guide when adopting `planning_state` in an existing daybook or when the user asks to classify specific tasks as Backlog. This skill source supports the field; no release version is assigned here. Update the skill and the target daybook generator together before changing task records. For field definitions and day-plan behavior, read [records.md](records.md) and [operations.md](operations.md).

## Planning state

`planning_state` controls where an active task appears in planning views. It does not replace task `status` and does not describe completion.

| Value | Meaning | Day-plan location |
| --- | --- | --- |
| `planned` | Planned work | Existing date-based task sections |
| `backlog` | Kept for later planning without placing it in today's date-based work | Separate `Backlog` section |

New tasks write `planning_state: planned` unless the user asks to keep them in Backlog. Existing tasks that omit the field continue to mean `planned`; do not add the field to every old file. A missing date, long date range, low priority, or `todo` status alone is not a reason to assign Backlog.

```yaml
planning_state: planned
planned_start_date: 2026-10-20
planned_end_date: 2026-10-20
planned_dates_status: confirmed
```

```yaml
planning_state: backlog
# planned dates can be omitted while unknown
```

Backlog tasks can retain a complete, partial, or provisional reference period. Do not invent a date for an unknown endpoint. If `planned_dates_status` is present, both endpoints must be present. `due_month`, `planned_week`, and a weekly task's `next_occurrence` remain separate reference fields; they do not move the task into date-based work. A linked occurrence schedule remains visible in the schedule section.

## Change only the requested tasks

1. Check the target daybook's README, Git status, task files, installed skill, and `scripts/day-plan.mjs`. Preserve unrelated changes and any customized behavior.
2. Update the installed skill and the target repository's matching `scripts/day-plan.mjs` and `scripts/generate-day-plan.mjs`. If Issue intake is used, update its helper from the same source too. If notifications are used, make sure the workflow runs the updated generator. Do not add a release version that has not been assigned.
3. Identify the exact tasks the user wants classified. Do not bulk-classify based on dates, status, title, or priority.
4. Add `planning_state: backlog` or `planning_state: planned` to those task files. Keep the ID, filename, creation month, progress status, dates, certainty, deadlines, recurrence, schedules, attachments, and links. Add a short history entry for the change. Do not create another task for a classification change.
5. When moving a task to Backlog, leave any known period as reference information and keep unknown endpoints empty. When moving it back to planned work, use the existing dates when still valid. If a complete planned period is not known, resolve it with the planned-date rules in [operations.md](operations.md#add-a-task), and record the basis of any provisional dates.
6. Generate a representative day-plan into a separate output root, for example:

   ```sh
   node scripts/generate-day-plan.mjs --date YYYY-MM-DD --output-root workplace/task-planning-preview
   ```

   Confirm that planned tasks remain in the appropriate date groups, Backlog appears only in its own section, incomplete Backlog dates are not reported as date-review errors, schedules are unaffected, and source task bytes did not change during generation.
7. Review the task diff and generated preview. Explain that old tasks without the field remain planned, and that only the requested records were classified.

## Request examples

- “録音整理を日付なしのBacklogとして登録して” → create the task with `planning_state: backlog`; leave its planned dates and `planned_dates_status` absent.
- “このtaskをBacklogに移して” → update that task's planning state and short history; preserve its current status and dates.
- “Backlogのこのtaskを10月20日に予定して” → update the same task to `planned` and set the period as directed; do not create a duplicate.
- “日付がないtaskをBacklogにして” → ask which tasks should be classified if the request does not identify them; missing dates by themselves do not define Backlog.

This source change does not itself modify a target daybook, regenerate its canonical day-plans, configure notifications, or publish a skill release.
