# Daybook record contract

This reference defines the file and data rules for the `daybook` repository. Read it before creating or changing a record.

## Directory and filename rules

Use the month of the relevant date for the directory:

```text
YYYY/YYYYMM/
├── attachments/
│   ├── task-YYYYMM-NNNNN/
│   ├── schedule-YYYYMMDD-name/
│   └── activity-YYYYMMDD/
├── activities/activity-YYYYMMDD.md
├── schedules/schedule-YYYYMMDD-name.md
├── tasks/task-YYYYMM-NNNNN-name.md
└── day-plan/day-plan-YYYYMMDD.md
```

- An activity belongs to the month in which it happened and normally has one file per day.
- A schedule belongs to the month in which the event occurs and has one file per independent event. Separate unrelated events on the same day.
- A task belongs permanently to the month in which the task was created. A September-created task for an October event stays under `YYYY/202609/tasks/`.
- Keep a task in its creation-month `tasks/` directory when it becomes `done` or `cancelled`; update its status in place and do not move it to an archive or closed folder.
- A day-plan belongs to the target date's month and is a generated snapshot.
- Store supporting files under the same month as their primary record, in `attachments/<record-key>/`. Use the full task ID, or the schedule/activity filename stem, as the record key. Create these directories only when needed.
- Use lowercase English prefixes and a short English filename suffix. Preserve an existing filename and ID when updating its title or deadline.

## Task IDs and status

The task ID is `task-YYYYMM-NNNNN`. `NNNNN` is a five-digit sequence within the creation month. Inspect current files and Git history before assigning the next number. Never reuse a deleted number or close a gap. A filename's ID, front matter `id`, and displayed ID must agree. The ID month and directory month must also agree with `created` when that field is present. Existing tasks without `created` remain readable; validate the date and month whenever it is supplied.

Use these statuses:

| Front matter | Meaning |
| --- | --- |
| `todo` | 未着手 |
| `in_progress` | 進行中 |
| `done` | 完了 |
| `cancelled` | 中止 |

Keep the single checked state in the body aligned with front matter. A partially completed checklist is not itself proof that the task is done.

## Front matter

All dates use `YYYY-MM-DD`. Use quoted strings for times such as `start: "19:00"`.

```yaml
---
type: task
id: task-YYYYMM-NNNNN
status: todo
priority: 5
created: YYYY-MM-DD
planned_date: YYYY-MM-DD
planned_action: "作業内容"
planned_week: YYYY-MM-DD
due: YYYY-MM-DD
due_month: YYYY-MM
completed: YYYY-MM-DD
---
```

`priority` is required on newly created task records and is an integer from `1` to `9`: `1` is highest, `5` is normal, and `9` is lowest. Smaller numbers mean higher priority. Use `5` when the user does not specify a priority; do not infer it from a due date. Existing task records may omit the field, in which case treat it as `5`. Other optional fields should be included only when they are known and useful. `planned_date` is the intended action or start date; it is distinct from the deadline `due`. `planned_week` is the Monday of a planned work week. If a deadline is known only as a month, use `due_month` and do not invent the month's last day. Preserve modifiers such as “EOD” or “午前中” in the body; a date-only `due` does not prove a time of day.

## Weekly recurring tasks

Represent an explicitly weekly routine with one persistent active task and a separate schedule record for each dated occurrence. Use `recurrence: weekly` as the machine-readable marker and `next_occurrence: YYYY-MM-DD` for the next schedule date. Keep the human-readable rule (weekday and any stable time or place) in the task body. Do not repurpose `planned_date`; it continues to mean the intended task start date. Keep the task active after an individual occurrence; mark it done or cancelled only when the recurring routine itself ends.

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

Use relative links between records and to files under `attachments/`, and check that each target exists after edits. Keep supplied source URLs for event pages and emails. If multiple records use the same supporting file, keep one copy under its primary record's month and link to it from the other records. Treat the original task and schedule as authoritative; a day-plan is a snapshot and should not become a second source of truth.

When a task has separate implementation and final execution deadlines, keep the final operational deadline in `due` and describe the earlier implementation milestone explicitly in the body or an intentional `planned_date`. Do not silently reinterpret every `planned_date` as a completion milestone.

## List display

For a task-list request, display this header and one row per selected task:

```text
ID / Priority / Status / Start / Due / Title
```

`Priority` is `priority`, or `5` when omitted. Sort by ascending priority, then deadline (`due`, or `due_month` when `due` is absent; missing deadlines last), then `planned_date` (missing dates last), then full task ID ascending. `Start` is `planned_date`; `Due` is `due`, then `due_month` if no exact due date exists, otherwise `—`. For a weekly task, also show `Next` from `next_occurrence`; do not substitute it for `Start` or use it as a sort key. By default list active tasks across all year/month directories. Apply a date window only when the user asks for a window or asks for a day-plan.
