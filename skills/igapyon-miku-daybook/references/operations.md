# Daybook operations

Read this reference for an add, update, list, activity, schedule, or day-plan request. For a waypoint request, read [waypoints.md](waypoints.md). Use the target repository's README and current files as the final local contract.

## Task and activity responsibilities

Use activities as the primary record of daily work, investigations, observations, and reflections, including unfinished or inconclusive work. If the activity/task choice is unclear and there is no clear intent to register future work or edit a task, choose an activity without a classification question. A concrete action mentioned in a report of work, or the existence of a related task, does not by itself request a task edit.

Keep detailed attempts, observations, unsuccessful trials, options considered, and decision reasons in dated activities. Keep a task focused on its current purpose, latest conclusion or adopted approach, status, unresolved issues, and next actions, with a brief dated history for material changes. Avoid copying the same detailed account into both record types.

When task editing is in scope and consolidation is needed, review the relevant activities across dates and summarize the current conclusions, state, unresolved issues, and next actions in the task. Link to the supporting activities for the detailed accounts, and preserve those activities in place. Recording an activity does not trigger automatic task consolidation or synchronization.

When both task and activity updates are in scope and a later decision changes the approach, update the task's current summary and record the new decision and reasons in the corresponding activity. Preserve earlier activities as accounts of what was tried and understood at the time. Correct factual errors explicitly so the correction remains distinguishable from a later change of approach. Use full task IDs and relative links to connect related records; when both records are being updated, link the task's brief history to the activity and the activity back to the task.

This division is implemented through the Agent's Markdown editing instructions and the existing record paths and links. The day-plan generator reads task and schedule fields to produce its snapshot; it does not reconstruct task state from activity prose. Apply the division within the requested recordkeeping scope; it does not start background logging or add an activity to every task-only edit.

## Task completion and scope

Decide separately whether a task edit is within the request and whether the task is complete. Both conditions are required before changing a task to `done`:

1. **Scope:** the user's current request and conversation clearly include updating that task. An explicit request to update a task is sufficient scope; no special phrase is required.
2. **Completion evidence:** the user explicitly says the task is complete, or the reported result clearly satisfies every completion condition already recorded for that task.

Apply only the record types the request covers. “Record this in activities” updates the activity only; it does not add a task edit. A task-only update does not add an activity automatically. If both are requested, update each and link them. When the task update is in scope but completion evidence is incomplete, record the supported progress and remaining condition, and keep the task active. If the task or the applicable completion condition is unclear, ask only about that ambiguity. When the task update is in scope and the evidence establishes completion, mark it done without an extra approval step.

An activity report, a closed GitHub Issue, or a planned date that has passed is not by itself completion evidence. Do not infer completion from a partially checked checklist. For a weekly recurring task, completing one occurrence does not complete the recurring rule and does not trigger rollover.

When completion is established, keep `status: done` and the body's single checked state aligned. Set `completed` to the actual completion date when it is known; do not substitute `planned_end_date` or the date of a later report. Preserve a correct existing `completed` date. If the date is unknown and the target record's schema requires it, ask rather than guessing. Keep the task ID, filename, and creation-month directory unchanged. Preserve earlier activities as historical records; distinguish a later decision from a factual correction.

Examples:

- “今日、参加費を振り込んだ。activities に記録して” → add the activity only; leave the task unchanged.
- “振込が済んだので、この task の状態と今日の活動を更新して” → update both and link them. If payment is its only completion condition, mark the task done; if receipt confirmation is also required, keep it active and note what remains.
- “task-202610-00001 を完了にして。今日振り込んだ” → update that task as done, align its checked state and actual completion date, and do not create an activity unless requested.

## Add a task

1. Search all `YYYY/YYYYMM/tasks/task-*.md` files and recent Git history for the intended task or its ID.
2. If it is a concrete action, choose the month of creation and assign the next unused five-digit number in that month. Do not reuse a deleted number or close a gap.
3. Write front matter with `type`, full `id`, `status: todo`, `planning_state`, `created`, and `priority`. Use `planning_state: planned` by default; use `backlog` only when the user asks to defer scheduling or otherwise makes that intent clear. Do not infer Backlog from missing dates, low priority, a long period, or `todo` status. A Backlog task may omit either or both planned endpoints; do not add a provisional date to fill a missing endpoint. If Backlog dates are supplied, preserve them as references and validate their format and order. For a planned task, include both planned endpoints and `planned_dates_status`. Priority is an integer from `1` to `9`, using `5` when unspecified. Use user-provided dates when known. Set the status to `confirmed` only when both endpoints are explicit or the user confirms the complete period. For a one-day task, set both planned dates to the same date; if either value was assumed, mark the result `provisional`. If planned dates are unspecified, provisionally use today's Asia/Tokyo date for both. If only a start is supplied, provisionally set the end to that date; if only an end is supplied, set the start to the earlier of today and that end date. Never replace an explicitly supplied date. Record the complete provisional period and its basis in the body/history and mention it in the response. Do not put a made-up date into an external-deadline field. An unbounded weekly recurring rule is exempt from the planned-period and status fields; use its `next_occurrence` and dated schedules.
4. Add a Japanese title, concise content, checklist, and history entry. Store supplied email or source links under a related section.
5. Use one task for work the user explicitly asks to combine; put the components in a checklist.

“TODO” is a useful input phrase, not a file type. For a request to register future work, create a task for concrete expense claims, applications, renewals, confirmations, payments, or work items. Keep a planning idea in the repository TODO only while it lacks an actionable unit.

## Update a task

Identify the file by its full `task-id` first. If only a short number is supplied, search the creation month, title, and links before editing. Preserve the task-id, creation date, filename, directory, and unrelated user changes. Mark completion with `status: done` and cancellation with `status: cancelled`; keep the task file in its creation-month directory instead of moving it to an archive or closed folder.

Update all representations that the request affects:

- status and the one checked state in the body;
- `priority` when the user changes the task's importance;
- `planning_state` when the user explicitly moves the task between planned work and Backlog;
- `planned_start_date` and `planned_end_date` for the inclusive planned work period;
- `planned_dates_status` when both endpoints have been confirmed, or when a date assumption makes the period provisional;
- `planned_action` for the work planned within that period;
- `due_month` for a month-only external deadline, without guessing the day;
- body and history for time modifiers, milestones, or uncertainty.

Separate a task's planned work period from its actual completion and any firm external deadline. Separate “draft sent” from “presentation complete”. If the user supplies an implementation target and a final migration deadline, retain both with explicit labels.

Changing `planning_state` does not change `status`, task identity, dates, deadlines, weekly schedules, or recurrence. When moving a task to Backlog, preserve existing dates and their confirmed/provisional status; add a short history entry. When moving it back to `planned`, keep any valid dates and status. If a complete work period is still unknown, use the planned-task provisional-date rules above and record their basis. Do not create another task for a classification change.

When the user changes only one endpoint, keep or set `planned_dates_status: provisional` unless the user confirms the full resulting period. When the user confirms the current complete range without changing dates, update the status to `confirmed` and add a history entry. Do not bulk-add this field to existing records. Never put it on an unbounded weekly recurring rule.

## Store an attachment

Before retaining a supplied file, follow [attachments.md](attachments.md). Put necessary facts in the record when enough; keep a separate attachment as UTF-8 text by default. Prefer managing original binaries elsewhere and linking to a stable reference. Keeping a binary in Git is an extremely rare exception requiring an explicit request for that specific file and a clear reason it cannot reasonably be managed elsewhere or represented as text. Do not treat “attach this” as permission to store a binary.

Keep source copies and conversion intermediates in a verified Git-ignored `workplace/` path or outside the repository. Place only the final necessary text in `attachments/`. For a retained task attachment, use `attachments/<task-id>/`, where `task-id` is its existing front matter `id` (`task-YYYYMM-NNNNN`). For an activity or schedule, use its filename without `.md` as the folder name: `attachments/activity-YYYYMMDD/` or `attachments/schedule-YYYYMMDD-name/`. Preserve a useful supplied filename when possible; if a same-name file exists, do not overwrite it. Add a relative link and verify the target. Keep one copy of shared text, create directories only when needed, and do not copy attachments into generated day-plans.

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

For work or investigation, include the purpose, approaches tried and changed, observations and results, conclusions and their reasons, remaining questions, and next actions when known. Ground the account in reported work, the conversation, and visible results; do not invent attempts, outcomes, alternatives, or motivations. Recording an inconclusive investigation is valid. Keep trial-and-error history in the same activity item while it remains readable; move lengthy supporting detail to a linked text document only when it obscures the account, following [attachments.md](attachments.md). Choose the detail needed to understand or resume the work rather than a fixed length or mandatory set of headings for every activity.

When the user says work was done, record the fact. Activity-only requests update the activity only. Update a related task only when task editing is in scope under [Task completion and scope](#task-completion-and-scope), and apply that section's completion evidence rule.

## Task list

Search every year/month `tasks/` directory. By default include active and unfinished tasks in planned and Backlog groups and show:

```text
ID / Priority / Status / Planning state / Planned start / Planned end / Title
```

`Planning state` is `planned` when omitted on an existing task. `Priority` comes from `priority`, or is `5` when omitted. Sort planned confirmed or legacy dated tasks by ascending priority, planned end, planned start, then full task ID. Put planned `provisional` tasks and tasks with an incomplete period in `日程要確認` after them, sorted by priority and ID. Show Backlog separately, sorted by priority and full task ID without a date window. `Planned start` and `Planned end` come from `planned_start_date` and `planned_end_date`; display `—` for a missing value. `due_month` remains separate month-only deadline information and does not fill `Planned end`. For a weekly task, add `Next` from `next_occurrence` without changing the meaning of the planned period or using it as a sort key. Include the full `task-YYYYMM-NNNNN` ID so identical short numbers cannot be confused. Include completed or cancelled tasks only when requested.

Do not edit files for a list request. Report provisional and incomplete periods as needing date review, then wait for an update request.

When introducing the Backlog group or classifying existing tasks, use [task-planning-migration.md](task-planning-migration.md). It preserves omitted-state compatibility and limits edits to tasks the user identifies.

## Find tasks related to a URL

Use [url-task-lookup.md](url-task-lookup.md) only when the user explicitly asks to check or find existing daybook tasks related to a URL. The procedure reads the source and searches task records across all year/month directories, then reports candidates with reasons. URL presentation, reading, or summarization alone does not trigger the lookup. Treat lookup as read-only unless the user also requests a record update.

## Explicitly import GitHub Issues

Issue intake is not part of an ordinary record update or Issue read. Use [issue-import.md](issue-import.md) only when the user explicitly requests that named Issue(s), or a clearly specified repository backlog, be imported into this daybook. Follow its local CLI prerequisite and setup steps before running `node scripts/import-issues.mjs capabilities`; perform only the local preparation needed for the explicitly requested intake. If `gh` is missing, report Issue intake, comment posting, and intake close as disabled; continue ordinary daybook work normally.

The Agent reads Issues and comments through the existing miku-scm `github.issue.read` workflow, interprets their meaning, writes the local source and manifest fixtures, and asks the local CLI to prepare and apply only the reviewed record changes. The CLI has no network or LLM behavior. Do not treat a failed read as an empty comment list, do not claim the helper returned full comment history, exclude Daily Briefing Issue #3, and reject Pull Requests.

After local apply, use the existing miku-scm Issue-comment workflow to prepare and show the exact result comment, obtain its required approval, post once, and verify it. Only after that verification, use the existing miku-scm close workflow with reason `completed`, its required approval, and verification. Record each remote outcome with `comment-result` or `close-result`. The close completes the intake request; it does not complete a daybook task. Do not commit, push, or open a PR as part of this flow. A needs-info, already-imported, excluded, or failed Issue does not receive an import comment or close.

## Generate a day-plan

Use the existing daybook script from the repository root:

```sh
npm ci
node scripts/generate-day-plan.mjs --date YYYY-MM-DD
```

By default, the generator writes to the canonical path under the target repository root: `YYYY/YYYYMM/day-plan/day-plan-YYYYMMDD.md`. The date defaults to today in Asia/Tokyo when `--date` is omitted. Use `--output-root` only when a separate output directory is explicitly needed, such as the notification workflow's staging directory.

The current implementation selects active tasks from all canonical year/month `tasks/` directories and schedules from canonical year/month `schedules/` directories. It ignores other Markdown files, nested folders, backups, and attachment contents. It treats an omitted legacy `planning_state` as `planned`; an explicit `backlog` task is selected for the separate Backlog section. It checks that task IDs and filenames match their creation-month directory, and checks any supplied `created` month against that directory. Schedule filenames, front matter dates, and event-month directories must agree. Path or schema mismatches stop generation with the offending file path.

It shows active tasks with:

- `planned_start_date <= target <= planned_end_date` as today's planned work, including work periods already in progress;
- `planned_end_date < target` in the planned-period-overrun section;
- `target <= planned_end_date <= target+6` as planned periods ending soon;
- `target < planned_start_date <= target+6` as upcoming work starts;
- active ordinary tasks missing either period date in the date-review section;
- active tasks with `planned_dates_status: provisional` in the date-review section, showing the provisional range;
- schedules dated in the window as upcoming schedules;
- `planned_week` periods that overlap the window as planned weeks.
- active Backlog tasks from all months in their own section, regardless of their dates; Backlog tasks are omitted from all six date-based task groups, including date review and planned weeks.

It excludes `done` and `cancelled` tasks and does not turn `due_month` into a guessed date. Planned provisional tasks appear only in date review, including when their provisional period contains the target day, and are omitted from date-specific task sections and `planned_week`. Backlog tasks do not appear in date review, even with incomplete or provisional dates; their dates are shown only as reference information in Backlog. The Backlog section is present with `- なし` when empty. Schedules remain date-based, including schedules linked from a weekly Backlog task. An unbounded weekly recurring rule without a planned period is not flagged for date review; its dated schedules represent individual occurrences. It includes schedules with the scalar string `status: scheduled` and legacy schedules with no status, and omits schedules with the scalar string `status: cancelled`. Invalid explicit schedule statuses fail generation. Treat the generated output as a snapshot: generation overwrites the canonical file for that date. Keep lasting notes in the source task or schedule instead of editing the generated day-plan.

Display each planned task's priority and planned period in the date-based sections, treating an omitted legacy priority as `5`. Sort today's tasks by ascending priority, then task ID. In planned-end, planned-start, and planned-week sections, sort by the section's date first, then ascending priority, then task ID. Backlog shows the full task ID, linked title, priority, status, and any saved period, due month, planned week, or weekly next occurrence as reference information; sort it by priority and ID. Priority changes ordering only; it does not change which tasks are selected for the plan. The generator rejects a present priority that is not an integer from `1` to `9` and a present planning state other than `planned` or `backlog`.

After generation, inspect the output for expected inclusions and exclusions, and report its path. Use the existing tests for code behavior; do not add a second generator in the skill.

## Finish the operation

Run `git diff --check`, inspect changed paths, and verify links and front matter. For a read-only list or explanation, do not modify the repository. For a record update, report the file path and material change. Leave commit, push, PR, merge, Issue comments, and email actions to explicit requests and their appropriate workflows.
