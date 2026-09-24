# Daybook operations

Read this reference for an add, update, list, activity, schedule, or day-plan request. Use the target repository's README and current files as the final local contract.

## Add a task

1. Search all `YYYY/YYYYMM/tasks/task-*.md` files and recent Git history for the intended task or its ID.
2. If it is a concrete action, choose the month of creation and assign the next unused five-digit number in that month. Do not reuse a deleted number or close a gap.
3. Write front matter with `type`, full `id`, `status: todo`, `created`, and only known `planned_date`, `planned_action`, `planned_week`, `due`, or `due_month` values.
4. Add a Japanese title, concise content, checklist, and history entry. Store supplied email or source links under a related section.
5. Use one task for work the user explicitly asks to combine; put the components in a checklist.

“TODO” is a useful input phrase, not a file type. Create a task for concrete expense claims, applications, renewals, confirmations, payments, or work items. Keep a planning idea in the repository TODO only while it lacks an actionable unit.

## Update a task

Identify the file by full ID first. If only a short number is supplied, search the creation month, title, and links before editing. Preserve the ID, creation date, filename, and unrelated user changes.

Update all representations that the request affects:

- status and the one checked state in the body;
- `planned_date` and `planned_action` for a deliberate work date;
- `due` for an exact deadline;
- `due_month` for a month-only deadline;
- body and history for time modifiers, milestones, or uncertainty.

Separate “start on 9/14” from “due on 9/18”. Separate “draft sent” from “presentation complete”. If the user supplies an implementation target and a final migration deadline, retain both with explicit labels.

## Maintain a weekly recurring task

Use this rolling schedule only when the user explicitly identifies a task as weekly recurring. Keep one active task as the rule and one schedule file per occurrence. Set `recurrence: weekly`, put the human-readable rule in the task body, and store the next date in `next_occurrence`. Keep `planned_date` for its usual intended start-date meaning. When registering the routine, create a schedule for its first known occurrence and link the task and schedule to each other. Ask for a first date or required schedule details when they are unknown; do not guess. For an existing task, add the recurrence fields only when its weekly rule is explicit; repeated dates alone are not enough to infer a recurrence. For a legacy weekly task without the fields, use an explicitly identified next date or a clearly linked upcoming schedule to initialize `next_occurrence`. If only `planned_date` could be the old recurrence date and its meaning is unclear, ask before migrating it.

During any writable daybook record request, first apply the user's requested status or cancellation changes so a task explicitly ended by the request is not rolled forward. Then inspect active tasks (`status: todo` or `in_progress`) for an explicit weekly rule whose recurrence fields are missing. Initialize a legacy task only from an explicitly identified next date or a clearly linked upcoming schedule; if neither is clear, leave it unchanged and report what date is needed. Do not infer a recurrence from repeated schedule dates alone.

Next, inspect all active weekly tasks whose `next_occurrence` is today or earlier in Asia/Tokyo. This is the only rollover trigger; no background process is implied. For each eligible task:

1. Starting at `next_occurrence`, add seven-day intervals until the candidate date is after today's Asia/Tokyo date. This preserves the weekday. Do not create records for missed past occurrences; note skipped dates in the task history.
2. Search all schedules for that candidate date and the same event, comparing the event title and stable details such as time or place. Reuse and link a matching schedule, including adding a missing task link when the match is clear. A date match alone is insufficient. If there are conflicting or ambiguous schedules, leave this task unchanged and report the conflict.
3. If no matching schedule exists, create one using only stable event details already recorded in the task or prior schedule. If essential details are unknown, leave this task unchanged and ask for them.
4. Link the task to the next occurrence schedule and the schedule back to the task. Set `next_occurrence` to the candidate date and append a history entry, including any skipped dates. Keep the recurring task active. Cancelling one occurrence does not end the recurring task; do not copy that cancellation to later occurrences.

Apply this to all eligible weekly tasks during the writable operation, and report these additional record changes with the requested edit. A read-only task list, explanation, or day-plan generation may report that a rollover is due but must not change records. Day-plans remain derived snapshots, and this skill does not run in the background.

Expected date results (Asia/Tokyo):

| `next_occurrence` | Today | Next date to schedule | Skipped dates |
| --- | --- | --- | --- |
| 2026-09-20 | 2026-09-20 | 2026-09-27 | none |
| 2026-09-20 | 2026-09-24 | 2026-09-27 | none |
| 2026-09-20 | 2026-09-28 | 2026-10-04 | 2026-09-27 |

## Add or update a schedule

1. Resolve the event date, start/end times, doors time, place, participation status, and source URL.
2. Store the event in the month in which it occurs.
3. Use a separate file for every unrelated event, including two events on one day.
4. If a date or participation decision changes, update the schedule body and links to related tasks together. Do not keep a cancelled dummy schedule as if it were active.

Do not infer attendance, ticket purchase, registration, or a rehearsal role from a general event description. Preserve distinctions such as “ticket purchased” versus “reception not yet registered”.

## Add an activity

Use the Asia/Tokyo calendar date unless the user gives another date. Create the day's `activities/activity-YYYYMMDD.md` if it does not exist; otherwise append under `## やったこと` or the existing equivalent section. Keep a single coherent event together when its place, activity, and instrument belong to one event. For example, an afternoon ensemble at a named venue while playing violin is one activity item.

When the user says work was done, record the fact. Do not mark the related task `done` unless completion was explicitly stated or the task's full checklist and completion condition are unambiguous.

## Task list

Search every year/month `tasks/` directory. By default include active and unfinished tasks and show:

```text
ID / Status / Start / Due / Title
```

`Start` comes from `planned_date`; `Due` comes from `due`, then `due_month`; missing values are `—`. For a weekly task, add `Next` from `next_occurrence` without changing the meaning of `Start`. Include the full `task-YYYYMM-NNNNN` ID so identical short numbers cannot be confused. Include completed or cancelled tasks only when requested.

Do not edit files for a list request. If a list reveals a missing deadline, report it separately and wait for an update request.

## Generate a day-plan

Use the existing daybook script from the repository root:

```sh
npm ci
node scripts/generate-day-plan.mjs --date YYYY-MM-DD --output-root workplace/generated
```

The current implementation selects the target date through target date plus six days. It shows active tasks with:

- `planned_date == target` as today's work;
- `target <= due <= target+6` as near deadlines;
- later `planned_date` in the window as upcoming work;
- schedules dated in the window as upcoming schedules;
- `planned_week` periods that overlap the window as planned weeks.

It excludes `done` and `cancelled` tasks and does not turn `due_month` into a guessed date. Treat the generated output as a snapshot. Do not overwrite an existing hand-written `day-plan/` file unless explicitly asked to replace it.

After generation, inspect the output for expected inclusions and exclusions, and report its path. Use the existing tests for code behavior; do not add a second generator in the skill.

## Finish the operation

Run `git diff --check`, inspect changed paths, and verify links and front matter. For a read-only list or explanation, do not modify the repository. For a record update, report the file path and material change. Leave commit, push, PR, merge, Issue comments, and email actions to explicit requests and their appropriate workflows.
