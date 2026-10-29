# Daybook record contract

This reference defines the file and data rules for the `daybook` repository. Read it before creating or changing a record.

## Directory and filename rules

Dated tasks, activities, schedules, and day-plans live under the relevant `YYYY/YYYYMM/` directory. Waypoints live at the daybook root:

```text
daybook/
├── YYYY/YYYYMM/
│   ├── attachments/
│   │   ├── task-YYYYMM-NNNNN/
│   │   ├── schedule-YYYYMMDD-name/
│   │   └── activity-YYYYMMDD/
│   ├── activities/activity-YYYYMMDD.md
│   ├── day-plan/day-plan-YYYYMMDD.md
│   ├── schedules/schedule-YYYYMMDD-name.md
│   └── tasks/task-YYYYMM-NNNNN-name.md
└── waypoints/
    ├── YYYYMMDD-HHMM-topic.md
    └── YYYYMMDD-HHMM-topic-00001.md
```

- An activity belongs to the month in which it happened and normally has one file per day.
- A schedule belongs to the month in which the event occurs and has one file per independent event. Separate unrelated events on the same day.
- A task belongs permanently to the month in which the task was created. A September-created task for an October event stays under `YYYY/202609/tasks/`.
- Keep a task in its creation-month `tasks/` directory when it becomes `done` or `cancelled`; update its status in place and do not move it to an archive or closed folder.
- A day-plan belongs to the target date's month and is a generated snapshot.
- Waypoints live in the daybook repository root, outside the year/month record directories. They are short resume entries; see [waypoints.md](waypoints.md) for naming, metadata, and update rules.
- Choose record text, an external reference, or an in-repository attachment using [attachments.md](attachments.md). When an attachment is chosen, store it under its primary record's month: tasks use `attachments/<task-id>/`, where `task-id` is the task's existing front matter `id` (`task-YYYYMM-NNNNN`); activities and schedules use `attachments/activity-YYYYMMDD/` and `attachments/schedule-YYYYMMDD-name/`, respectively. Keep original binaries elsewhere and link to a stable reference; retaining one in Git is an extremely rare, file-specific exception. Follow [attachments.md](attachments.md) for content selection, temporary files, and exceptions. Create directories only when needed.
- Use lowercase English prefixes and a short English filename suffix. Preserve an existing filename and ID when updating its title or deadline.

## Task IDs and status

`task-id` (task ID) is the task's persistent identifier, stored in front matter as `id`, in `task-YYYYMM-NNNNN` format. For example, `task-202610-00014` is the task-id of `task-202610-00014-prepare-materials.md`; the corresponding attachment folder is `attachments/task-202610-00014/`. Keep the YAML field name as `id`.

`NNNNN` is a five-digit sequence within the creation month. Inspect current files and Git history before assigning the next number. Never reuse a deleted number or close a gap. A filename's ID, front matter `id`, and displayed ID must agree. The ID month and directory month must also agree with `created` when that field is present. Existing tasks without `created` remain readable; validate the date and month whenever it is supplied.

Use these statuses:

| Front matter | Meaning |
| --- | --- |
| `todo` | 未着手 |
| `in_progress` | 進行中 |
| `done` | 完了 |
| `cancelled` | 中止 |

Keep the single checked state in the body aligned with front matter. A partially completed checklist is not itself proof that the task is done.

Use `planning_state: planned` or `planning_state: backlog` to control whether an active task belongs in date-based work planning or the separate Backlog group. This is independent of `status`: a Backlog task can be `todo` or `in_progress`. New tasks write `planned` unless the user explicitly asks for Backlog. Existing tasks with no `planning_state` are read as `planned`; do not bulk-add the field. Missing dates, low priority, a long period, and `todo` status do not imply Backlog.

Apply the request-scope and completion-evidence rules in [Task completion and scope](operations.md#task-completion-and-scope) before changing a task to `done`. The checklist and `completed` date must remain consistent with that rule; do not infer completion from an activity report alone.

## Front matter

All dates use `YYYY-MM-DD`. Use quoted strings for times such as `start: "19:00"`.

```yaml
---
type: task
id: task-YYYYMM-NNNNN
status: todo
planning_state: planned # planned or backlog
priority: 5
created: YYYY-MM-DD
planned_start_date: YYYY-MM-DD
planned_end_date: YYYY-MM-DD
planned_dates_status: confirmed # confirmed or provisional
planned_action: "作業内容"
planned_week: YYYY-MM-DD
due_month: YYYY-MM
completed: YYYY-MM-DD
---
```

`priority` is required on newly created task records and is an integer from `1` to `9`: `1` is highest, `5` is normal, and `9` is lowest. Smaller numbers mean higher priority. Use `5` when the user does not specify a priority. Existing task records may omit the field, in which case treat it as `5`.

`planning_state` is required on newly created task records and must be the scalar string `planned` or `backlog`. An omitted value on an existing record is treated as `planned` without rewriting the file. Backlog is a separate planning group, not a task status or completion state.

New planned tasks require `planned_start_date` and `planned_end_date`. They form an inclusive planned work period; a one-day task uses the same value for both. Require valid `YYYY-MM-DD` dates and `planned_start_date <= planned_end_date`. The end date is a planned finish date, not the actual completion date or necessarily an external deadline. Record actual completion with `status: done` and `completed`. If a user supplied a firm deadline, preserve its meaning, source, and modifiers in the task body; do not imply that the planned end is the deadline unless that is what the user intends. `planned_action` describes the intended work and does not imply it must occur on every day in the period.

An explicitly classified Backlog task may omit both planned endpoints or keep only the endpoint that is known. Do not fill an omitted Backlog date provisionally. Any supplied dates must still be valid and ordered. If `planned_dates_status` is present, both endpoints are still required. Keep `due_month` and `planned_week` as coarse reference information; neither creates a work date nor changes the planning group. Do not classify a task as Backlog merely because its period is long, it has no dates, it has low priority, or its status is `todo`.

For a new planned task, write both planned endpoints and `planned_dates_status`. Use `confirmed` only when both endpoints are explicit or the user confirms the complete period. If either endpoint is filled by an assumption, use `provisional`, even when the resulting period is one day. When dates are not specified, use Asia/Tokyo today as the provisional start and end date. If the user supplies only a start date, use it for both ends until adjusted. If the user supplies only an end date, use the earlier of today and that date as the provisional start. Never change a date the user specified. Identify each provisional value, the complete provisional period, and its basis in the task body/history and in the response. `planned_week` is the Monday of a coarse work-week plan; it does not replace either required date on a new planned task.

`planned_dates_status` must be a scalar YAML string, either `confirmed` or `provisional`, and requires both valid planned endpoints. `confirmed` describes confidence in the planned period, not task completion. An unbounded weekly recurring rule without a planned period must not carry this field. Existing records without the field keep their legacy behavior; do not add or infer statuses by bulk-editing existing tasks. When a user changes only one endpoint and has not confirmed the resulting full period, keep the period provisional. A user may confirm the current values without changing them.

An ongoing weekly recurring rule with no natural finish date is exempt from the required period. Keep its next dated instance in `next_occurrence` and a schedule record. Do not give the rule a fabricated end date. If the user supplies a finite period for the recurring rule itself, preserve it separately from occurrence dates.

`due_month` is retained for a known month-only external deadline. It does not supply or replace `planned_end_date`; do not invent a precise deadline date from it. Existing `planned_date` and `due` keys are read as aliases for `planned_start_date` and `planned_end_date` while users migrate existing records. New records use the new names. If old and new keys appear together, their values must agree; see [task-date-migration.md](task-date-migration.md) before changing existing records.

## Weekly recurring tasks

Represent an explicitly weekly routine with one persistent active task and a separate schedule record for each dated occurrence. Use `recurrence: weekly` as the machine-readable marker and `next_occurrence: YYYY-MM-DD` for the next schedule date. Keep the human-readable rule (weekday and any stable time or place) in the task body. Do not use `planned_start_date` or `planned_end_date` as the next occurrence date. Keep the task active after an individual occurrence; mark it done or cancelled only when the recurring routine itself ends.

Link each occurrence schedule to the persistent task with a relative Markdown link. The task also links to its schedule for `next_occurrence`. A schedule remains the dated record for that occurrence; the recurring task remains the rule. Preserve known times, place, participation details, and source links without inferring missing details.

Use `status: scheduled` or `status: cancelled` in schedule front matter. These must be scalar YAML strings; arrays, objects, numbers, booleans, null, and empty values are invalid. Write `scheduled` on new schedule records. For existing schedules with no `status`, treat them as `scheduled`. A cancelled event remains in its month directory as history and is omitted from day-plans. `status` describes whether the event will happen; keep the user's participation decision separate in the schedule body or its existing participation field. Cancelling one weekly occurrence does not cancel the recurring task or later occurrences.

For example, add these fields only to a weekly task:

```yaml
recurrence: weekly
next_occurrence: 2026-10-04
```

The minimum front matter for the other records is:

```yaml
---
type: activity
date: YYYY-MM-DD
---
```

```yaml
---
type: schedule
date: YYYY-MM-DD
status: scheduled
start: "19:00"
end: "21:00"
doors: "18:30"
---
```

Only `scheduled` and `cancelled` are valid schedule statuses. Treat a present empty or other value as invalid; do not guess its meaning.

```yaml
---
type: day-plan
date: YYYY-MM-DD
generated: YYYY-MM-DD
---
```

## Relationship rules

Use relative links between records and to retained text files under `attachments/`, and check that each target exists after edits. Keep supplied source URLs for event pages and emails. If multiple records use the same supporting file, reference one canonical copy. For an in-repository attachment, keep that copy under its primary record's month. Prefer stable references to originals and retained results managed outside daybook, including another Git repository; never use a temporary-file path as a permanent link. Treat the original task and schedule as authoritative; a day-plan is a snapshot and should not become a second source of truth.

When a task has implementation milestones or a firm external deadline in addition to its planned work period, label each date's meaning in the body and preserve the source. Do not silently reinterpret a `planned_end_date` as a firm external deadline.

## List display

For a task-list request, display this header and one row per selected task:

```text
ID / Priority / Status / Planning state / Planned start / Planned end / Title
```

`Planning state` is `planning_state`, or `planned` when omitted. Include planned and Backlog tasks by default, in separate groups. Sort planned confirmed or legacy dated tasks by ascending priority, planned end date, planned start date, then full task ID. Put planned provisional tasks and tasks with incomplete planned periods in the `日程要確認` group after dated tasks, sorted by priority and ID. Sort Backlog by ascending priority and then full task ID; do not date-filter it unless requested. Read existing records across all year/month directories. For weekly tasks, also show `Next` from `next_occurrence`; do not substitute it for either end of the task's planned period or use it as a sort key. By default list active tasks across all year/month directories. Apply a date window only when the user asks for a window or asks for a day-plan.
