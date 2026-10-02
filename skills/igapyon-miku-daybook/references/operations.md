# Daybook operations

Read this reference for an add, update, list, activity, schedule, or day-plan request. Use the target repository's README and current files as the final local contract.

## Add a task

1. Search all `YYYY/YYYYMM/tasks/task-*.md` files and recent Git history for the intended task or its ID.
2. If it is a concrete action, choose the month of creation and assign the next unused five-digit number in that month. Do not reuse a deleted number or close a gap.
3. Write front matter with `type`, full `id`, `status: todo`, `created`, and `priority` as an integer from `1` to `9`. Use `5` if the user does not specify a priority; do not infer it from the due date. Add only known `planned_date`, `planned_action`, `planned_week`, `due`, or `due_month` values.
4. Add a Japanese title, concise content, checklist, and history entry. Store supplied email or source links under a related section.
5. Use one task for work the user explicitly asks to combine; put the components in a checklist.

“TODO” is a useful input phrase, not a file type. Create a task for concrete expense claims, applications, renewals, confirmations, payments, or work items. Keep a planning idea in the repository TODO only while it lacks an actionable unit.

## Update a task

Identify the file by full ID first. If only a short number is supplied, search the creation month, title, and links before editing. Preserve the ID, creation date, filename, directory, and unrelated user changes. Mark completion with `status: done` and cancellation with `status: cancelled`; keep the task file in its creation-month directory instead of moving it to an archive or closed folder.

Update all representations that the request affects:

- status and the one checked state in the body;
- `priority` when the user changes the task's importance;
- `planned_date` and `planned_action` for a deliberate work date;
- `due` for an exact deadline;
- `due_month` for a month-only deadline;
- body and history for time modifiers, milestones, or uncertainty.

Separate “start on 9/14” from “due on 9/18”. Separate “draft sent” from “presentation complete”. If the user supplies an implementation target and a final migration deadline, retain both with explicit labels.

## Store an attachment

When a supplied local file is intended as supporting material for a daybook record, store it under the same month's `attachments/` directory as that record, inside a record-key folder: the full task ID for a task, or the schedule/activity filename stem for those records. Preserve the supplied filename when possible; if a same-name file already exists, do not overwrite it. Add a relative link to the file from the record and verify the target. Keep one copy when multiple records refer to the same file, and link to that copy. Do not create empty attachment directories or copy files into generated day-plans.

## Maintain a weekly recurring task

Use this rolling schedule only when the user explicitly identifies a task as weekly recurring. Keep one active task as the rule and one schedule file per occurrence. Set `recurrence: weekly`, put the human-readable rule in the task body, and store the next date in `next_occurrence`. Keep `planned_date` for its usual intended start-date meaning. When registering the routine, create a schedule for its first known occurrence and link the task and schedule to each other. Ask for a first date or required schedule details when they are unknown; do not guess. For an existing task, add the recurrence fields only when its weekly rule is explicit; repeated dates alone are not enough to infer a recurrence. For a legacy weekly task without the fields, use an explicitly identified next date or a clearly linked upcoming schedule to initialize `next_occurrence`. If only `planned_date` could be the old recurrence date and its meaning is unclear, ask before migrating it.

During any writable daybook record request, first apply the user's requested status or cancellation changes so a task explicitly ended by the request is not rolled forward. Then inspect active tasks (`status: todo` or `in_progress`) for an explicit weekly rule whose recurrence fields are missing. Initialize a legacy task only from an explicitly identified next date or a clearly linked upcoming schedule; if neither is clear, leave it unchanged and report what date is needed. Do not infer a recurrence from repeated schedule dates alone.

Next, inspect all active weekly tasks whose `next_occurrence` is today or earlier in Asia/Tokyo. This is the only rollover trigger; no background process is implied. For each eligible task:

1. Starting at `next_occurrence`, add seven-day intervals until the candidate date is after today's Asia/Tokyo date. This preserves the weekday. Do not create records for missed past occurrences; note skipped dates in the task history.
2. Search all schedules for that candidate date and the same event, comparing the event title and stable details such as time or place. Reuse and link a matching `scheduled` schedule, including adding a missing task link when the match is clear. A date match alone is insufficient. If the matching occurrence is `cancelled`, keep that schedule as history, add its date to the skipped dates, advance the candidate by seven days, and repeat the search; do not recreate the cancelled occurrence or carry cancellation to later dates. If there are conflicting or ambiguous schedules, leave this task unchanged and report the conflict.
3. If no matching schedule exists, create one using only stable event details already recorded in the task or prior schedule. If essential details are unknown, leave this task unchanged and ask for them.
4. Link the task to the next non-cancelled occurrence schedule and the schedule back to the task. Set `next_occurrence` to that candidate date and append a history entry, including missed or cancelled skipped dates. Keep the recurring task active. Cancelling one occurrence does not end the recurring task; do not copy that cancellation to later occurrences.

Apply this to all eligible weekly tasks during the writable operation, and report these additional record changes with the requested edit. A read-only task list, explanation, or day-plan generation may report that a rollover is due but must not change records. Day-plans remain derived snapshots, and this skill does not run in the background.

Expected date results (Asia/Tokyo):

| `next_occurrence` | Today | Next date to schedule | Skipped dates |
| --- | --- | --- | --- |
| 2026-09-20 | 2026-09-20 | 2026-09-27 | none |
| 2026-09-20 | 2026-09-24 | 2026-09-27 | none |
| 2026-09-20 | 2026-09-28 | 2026-10-04 | 2026-09-27 |

## Add or update a schedule

1. Resolve the event date, start/end times, doors time, place, participation status, and source URL. New schedules use `status: scheduled`; set `status: cancelled` only when the event itself will not happen. Keep the user's participation decision separate.
2. Store the event in the month in which it occurs.
3. Use a separate file for every unrelated event, including two events on one day.
4. If a date or participation decision changes, update the schedule body and links to related tasks together. When the event is cancelled, keep the schedule record with `status: cancelled`; do not present it as an active event or delete it as a dummy. For a rescheduled event, retain the cancelled occurrence as history and create or update the schedule for the new date with `status: scheduled`.

Do not infer attendance, ticket purchase, registration, or a rehearsal role from a general event description. Preserve distinctions such as “ticket purchased” versus “reception not yet registered”.

## Add an activity

Use the Asia/Tokyo calendar date unless the user gives another date. Create the day's `activities/activity-YYYYMMDD.md` if it does not exist; otherwise append under `## やったこと` or the existing equivalent section. Keep a single coherent event together when its place, activity, and instrument belong to one event. For example, an afternoon ensemble at a named venue while playing violin is one activity item.

When the user says work was done, record the fact. Do not mark the related task `done` unless completion was explicitly stated or the task's full checklist and completion condition are unambiguous.

## Task list

Search every year/month `tasks/` directory. By default include active and unfinished tasks and show:

```text
ID / Priority / Status / Start / Due / Title
```

`Priority` comes from `priority`, or is `5` when omitted. Sort by ascending priority, then deadline (`due`, or `due_month` when `due` is absent; missing deadlines last), then `planned_date` (missing dates last), then full task ID ascending. `Start` comes from `planned_date`; `Due` comes from `due`, then `due_month`; missing values are `—`. For a weekly task, add `Next` from `next_occurrence` without changing the meaning of `Start` or using it as a sort key. Include the full `task-YYYYMM-NNNNN` ID so identical short numbers cannot be confused. Include completed or cancelled tasks only when requested.

Do not edit files for a list request. If a list reveals a missing deadline, report it separately and wait for an update request.

## Generate a day-plan

Use the existing daybook script from the repository root:

```sh
npm ci
node scripts/generate-day-plan.mjs --date YYYY-MM-DD
```

By default, the generator writes to the canonical path under the target repository root: `YYYY/YYYYMM/day-plan/day-plan-YYYYMMDD.md`. The date defaults to today in Asia/Tokyo when `--date` is omitted. Use `--output-root` only when a separate output directory is explicitly needed, such as the notification workflow's staging directory.

The current implementation selects active tasks from all canonical year/month `tasks/` directories and schedules from canonical year/month `schedules/` directories. It ignores other Markdown files, nested folders, backups, and attachment contents. It checks that task IDs and filenames match their creation-month directory, and checks any supplied `created` month against that directory. Schedule filenames, front matter dates, and event-month directories must agree. Path or schema mismatches stop generation with the offending file path.

It shows active tasks with:

- `planned_date == target` as today's work;
- `due < target` in the overdue section;
- `target <= due <= target+6` as near deadlines;
- later `planned_date` in the window as upcoming work;
- schedules dated in the window as upcoming schedules;
- `planned_week` periods that overlap the window as planned weeks.

It excludes `done` and `cancelled` tasks and does not turn `due_month` into a guessed date. It includes schedules with the scalar string `status: scheduled` and legacy schedules with no status, and omits schedules with the scalar string `status: cancelled`. Invalid explicit schedule statuses fail generation. Treat the generated output as a snapshot: generation overwrites the canonical file for that date. Keep lasting notes in the source task or schedule instead of editing the generated day-plan.

Display each task's priority in the generated day-plan, treating an omitted legacy value as `5`. Sort today's tasks by ascending priority, then task ID. In deadline, planned-date, and planned-week sections, sort by the section's date first, then ascending priority, then task ID. Priority changes ordering only; it does not change which tasks are selected for the plan. The generator rejects a present priority that is not an integer from `1` to `9`.

After generation, inspect the output for expected inclusions and exclusions, and report its path. Use the existing tests for code behavior; do not add a second generator in the skill.

## Finish the operation

Run `git diff --check`, inspect changed paths, and verify links and front matter. For a read-only list or explanation, do not modify the repository. For a record update, report the file path and material change. Leave commit, push, PR, merge, Issue comments, and email actions to explicit requests and their appropriate workflows.
