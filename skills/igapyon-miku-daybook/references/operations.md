# Daybook operations

Read this reference for an add, update, list, activity, schedule, or day-plan request. Use the target repository's README and current files as the final local contract.

## Add a task

1. Search all `YYYY/YYYYMM/tasks/task-*.md` files and recent Git history for the intended task or its ID.
2. If it is a concrete action, choose the month of creation and assign the next unused five-digit number in that month. Do not reuse a deleted number or close a gap.
3. Write front matter with `type`, full `id`, `status: todo`, `created`, `priority`, both planned endpoints, and `planned_dates_status`. Priority is an integer from `1` to `9`, using `5` when unspecified. Use user-provided dates when known. Set the status to `confirmed` only when both endpoints are explicit or the user confirms the complete period. For a one-day task, set both planned dates to the same date; if either value was assumed, mark the result `provisional`. If neither date is specified, provisionally use today's Asia/Tokyo date for both. If only a start is supplied, provisionally set the end to that date; if only an end is supplied, set the start to the earlier of today and that end date. Never replace an explicitly supplied date. Record the complete provisional period and its basis in the body/history and mention it in the response. Do not put a made-up date into an external-deadline field. An unbounded weekly recurring rule is exempt from the planned-period and status fields; use its `next_occurrence` and dated schedules.
4. Add a Japanese title, concise content, checklist, and history entry. Store supplied email or source links under a related section.
5. Use one task for work the user explicitly asks to combine; put the components in a checklist.

“TODO” is a useful input phrase, not a file type. Create a task for concrete expense claims, applications, renewals, confirmations, payments, or work items. Keep a planning idea in the repository TODO only while it lacks an actionable unit.

## Update a task

Identify the file by full ID first. If only a short number is supplied, search the creation month, title, and links before editing. Preserve the ID, creation date, filename, directory, and unrelated user changes. Mark completion with `status: done` and cancellation with `status: cancelled`; keep the task file in its creation-month directory instead of moving it to an archive or closed folder.

Update all representations that the request affects:

- status and the one checked state in the body;
- `priority` when the user changes the task's importance;
- `planned_start_date` and `planned_end_date` for the inclusive planned work period;
- `planned_dates_status` when both endpoints have been confirmed, or when a date assumption makes the period provisional;
- `planned_action` for the work planned within that period;
- `due_month` for a month-only external deadline, without guessing the day;
- body and history for time modifiers, milestones, or uncertainty.

Separate a task's planned work period from its actual completion and any firm external deadline. Separate “draft sent” from “presentation complete”. If the user supplies an implementation target and a final migration deadline, retain both with explicit labels.

When the user changes only one endpoint, keep or set `planned_dates_status: provisional` unless the user confirms the full resulting period. When the user confirms the current complete range without changing dates, update the status to `confirmed` and add a history entry. Do not bulk-add this field to existing records. Never put it on an unbounded weekly recurring rule.

## Store an attachment

When a supplied local file is intended as supporting material for a daybook record, store it under the same month's `attachments/` directory as that record, inside a record-key folder: the full task ID for a task, or the schedule/activity filename stem for those records. Preserve the supplied filename when possible; if a same-name file already exists, do not overwrite it. Add a relative link to the file from the record and verify the target. Keep one copy when multiple records refer to the same file, and link to that copy. Do not create empty attachment directories or copy files into generated day-plans.

## Register a weekly recurring task

Use this model only when the user explicitly registers or changes a task as weekly recurring. Keep one active task as the rule and one schedule file per dated occurrence. Set `recurrence: weekly`, put the human-readable rule in the task body, and store the next date in `next_occurrence`. An unbounded recurring rule does not need a planned period. When registering a routine, create and link its first schedule when its date and required details are known; ask only for missing information needed for that registration. For an existing task, add or change recurrence fields only when the user requests that change. Repeated schedule dates alone are not enough to infer a recurrence.

## Explicitly roll over weekly recurring tasks

Rollover is a separate operation. Run it only when the user explicitly asks to roll over or maintain weekly occurrences. Process only the named tasks; process all active weekly tasks only when the user explicitly requests the complete set. A weekly task's existence, a past `next_occurrence`, another record-writing request, or a day-plan request does not authorize a rollover or an extra weekly-task scan.

For an explicitly requested rollover, first apply the user's requested status or cancellation changes within scope so a task explicitly ended by the request is not rolled forward. Then consider only active tasks (`status: todo` or `in_progress`) in the requested scope. Initialize missing recurrence fields only for an explicitly identified weekly task in that scope, using an explicitly identified next date or a clearly linked upcoming schedule. If neither is clear, leave that task unchanged and ask only for the information needed to maintain it. Do not infer a recurrence from repeated schedule dates alone. If an old `planned_date` could mean the next recurrence date, read [task-date-migration.md](task-date-migration.md) and resolve its meaning for that selected task before converting it.

For each in-scope active weekly task whose `next_occurrence` is today or earlier in Asia/Tokyo:

1. Starting at `next_occurrence`, add seven-day intervals until the candidate date is after today's Asia/Tokyo date. This preserves the weekday. Do not create records for missed past occurrences; note skipped dates in the task history.
2. Search all schedules for that candidate date and the same event, comparing the event title and stable details such as time or place. Reuse and link a matching `scheduled` schedule, including adding a missing task link when the match is clear. A date match alone is insufficient. If the matching occurrence is `cancelled`, keep that schedule as history, add its date to the skipped dates, advance the candidate by seven days, and repeat the search; do not recreate the cancelled occurrence or carry cancellation to later dates. If there are conflicting or ambiguous schedules, leave this task unchanged and report the conflict.
3. If no matching schedule exists, create one using only stable event details already recorded in the task or prior schedule. If essential details are unknown, leave this task unchanged and ask for them.
4. Link the task to the next non-cancelled occurrence schedule and the schedule back to the task. Set `next_occurrence` to that candidate date and append a history entry, including missed or cancelled skipped dates. Keep the recurring task active. Cancelling one occurrence does not end the recurring task; do not copy that cancellation to later occurrences.

Report the rollover changes with the explicit maintenance request. Ordinary record edits, including edits to a weekly task's unrelated fields, do not run this procedure. A read-only task list or explanation answers the requested question without an additional rollover audit. Day-plan generation reads records to produce its requested snapshot but does not modify source task or schedule records or trigger weekly maintenance. This skill does not run in the background.

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
ID / Priority / Status / Planned start / Planned end / Title
```

`Priority` comes from `priority`, or is `5` when omitted. Sort confirmed or legacy dated tasks by ascending priority, planned end, planned start, then full task ID. Put `provisional` tasks and tasks with an incomplete period in `日程要確認` after them, sorted by priority and ID. `Planned start` and `Planned end` come from `planned_start_date` and `planned_end_date`; display `—` for a missing value. `due_month` remains separate month-only deadline information and does not fill `Planned end`. For a weekly task, add `Next` from `next_occurrence` without changing the meaning of the planned period or using it as a sort key. Include the full `task-YYYYMM-NNNNN` ID so identical short numbers cannot be confused. Include completed or cancelled tasks only when requested.

Do not edit files for a list request. Report provisional and incomplete periods as needing date review, then wait for an update request.

## Explicitly import GitHub Issues

Issue intake is not part of an ordinary record update or Issue read. Use [issue-import.md](issue-import.md) only when the user explicitly requests that named Issue(s), or a clearly specified repository backlog, be imported into this daybook. At that entry point, run `node scripts/import-issues.mjs capabilities`. If `gh` is missing, report Issue intake, comment posting, and intake close as disabled; continue ordinary daybook work normally.

The Agent reads Issues and comments through the existing miku-scm `github.issue.read` workflow, interprets their meaning, writes the local source and manifest fixtures, and asks the local CLI to prepare and apply only the reviewed record changes. The CLI has no network or LLM behavior. Do not treat a failed read as an empty comment list, do not claim the helper returned full comment history, exclude Daily Briefing Issue #3, and reject Pull Requests.

After local apply, use the existing miku-scm Issue-comment workflow to prepare and show the exact result comment, obtain its required approval, post once, and verify it. Only after that verification, use the existing miku-scm close workflow with reason `completed`, its required approval, and verification. Record each remote outcome with `comment-result` or `close-result`. The close completes the intake request; it does not complete a daybook task. Do not commit, push, or open a PR as part of this flow. A needs-info, already-imported, excluded, or failed Issue does not receive an import comment or close.

## Generate a day-plan

Use the existing daybook script from the repository root:

```sh
npm ci
node scripts/generate-day-plan.mjs --date YYYY-MM-DD
```

By default, the generator writes to the canonical path under the target repository root: `YYYY/YYYYMM/day-plan/day-plan-YYYYMMDD.md`. The date defaults to today in Asia/Tokyo when `--date` is omitted. Use `--output-root` only when a separate output directory is explicitly needed, such as the notification workflow's staging directory.

The current implementation selects active tasks from all canonical year/month `tasks/` directories and schedules from canonical year/month `schedules/` directories. It ignores other Markdown files, nested folders, backups, and attachment contents. It checks that task IDs and filenames match their creation-month directory, and checks any supplied `created` month against that directory. Schedule filenames, front matter dates, and event-month directories must agree. Path or schema mismatches stop generation with the offending file path.

It shows active tasks with:

- `planned_start_date <= target <= planned_end_date` as today's planned work, including work periods already in progress;
- `planned_end_date < target` in the planned-period-overrun section;
- `target <= planned_end_date <= target+6` as planned periods ending soon;
- `target < planned_start_date <= target+6` as upcoming work starts;
- active ordinary tasks missing either period date in the date-review section;
- active tasks with `planned_dates_status: provisional` in the date-review section, showing the provisional range;
- schedules dated in the window as upcoming schedules;
- `planned_week` periods that overlap the window as planned weeks.

It excludes `done` and `cancelled` tasks and does not turn `due_month` into a guessed date. Provisional tasks appear only in date review, including when their provisional period contains the target day, and are omitted from date-specific task sections and `planned_week`. An unbounded weekly recurring rule without a planned period is not flagged for date review; its dated schedules represent individual occurrences. It includes schedules with the scalar string `status: scheduled` and legacy schedules with no status, and omits schedules with the scalar string `status: cancelled`. Invalid explicit schedule statuses fail generation. Treat the generated output as a snapshot: generation overwrites the canonical file for that date. Keep lasting notes in the source task or schedule instead of editing the generated day-plan.

Display each task's priority and planned period in the generated day-plan, treating an omitted legacy priority as `5`. Sort today's tasks by ascending priority, then task ID. In planned-end, planned-start, and planned-week sections, sort by the section's date first, then ascending priority, then task ID. Priority changes ordering only; it does not change which tasks are selected for the plan. The generator rejects a present priority that is not an integer from `1` to `9`.

After generation, inspect the output for expected inclusions and exclusions, and report its path. Use the existing tests for code behavior; do not add a second generator in the skill.

## Finish the operation

Run `git diff --check`, inspect changed paths, and verify links and front matter. For a read-only list or explanation, do not modify the repository. For a record update, report the file path and material change. Leave commit, push, PR, merge, Issue comments, and email actions to explicit requests and their appropriate workflows.
