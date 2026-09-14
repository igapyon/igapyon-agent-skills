# Daybook record contract

This reference defines the file and data rules for the `daybook` repository. Read it before creating or changing a record.

## Directory and filename rules

Use the month of the relevant date for the directory:

```text
YYYY/YYYYMM/
├── activities/activity-YYYYMMDD.md
├── schedules/schedule-YYYYMMDD-name.md
├── tasks/task-YYYYMM-NNNNN-name.md
└── day-plan/day-plan-YYYYMMDD.md
```

- An activity belongs to the month in which it happened and normally has one file per day.
- A schedule belongs to the month in which the event occurs and has one file per independent event. Separate unrelated events on the same day.
- A task belongs permanently to the month in which the task was created. A September-created task for an October event stays under `YYYY/202609/tasks/`.
- A day-plan belongs to the target date's month and is a generated snapshot.
- Use lowercase English prefixes and a short English filename suffix. Preserve an existing filename and ID when updating its title or deadline.

## Task IDs and status

The task ID is `task-YYYYMM-NNNNN`. `NNNNN` is a five-digit sequence within the creation month. Inspect current files and Git history before assigning the next number. Never reuse a deleted number or close a gap. A filename's ID, front matter `id`, and displayed ID must agree.

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
created: YYYY-MM-DD
planned_date: YYYY-MM-DD
planned_action: "作業内容"
planned_week: YYYY-MM-DD
due: YYYY-MM-DD
due_month: YYYY-MM
completed: YYYY-MM-DD
---
```

Only include optional fields when they are known and useful. `planned_date` is the intended action or start date; it is distinct from the deadline `due`. `planned_week` is the Monday of a planned work week. If a deadline is known only as a month, use `due_month` and do not invent the month's last day. Preserve modifiers such as “EOD” or “午前中” in the body; a date-only `due` does not prove a time of day.

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
start: "19:00"
end: "21:00"
doors: "18:30"
---
```

```yaml
---
type: day-plan
date: YYYY-MM-DD
generated: YYYY-MM-DD
---
```

## Relationship rules

Use relative links between records and check that the target exists after edits. Keep supplied source URLs for event pages and emails. Treat the original task and schedule as authoritative; a day-plan is a snapshot and should not become a second source of truth.

When a task has separate implementation and final execution deadlines, keep the final operational deadline in `due` and describe the earlier implementation milestone explicitly in the body or an intentional `planned_date`. Do not silently reinterpret every `planned_date` as a completion milestone.

## List display

For a task-list request, display this header and one row per selected task:

```text
ID / Status / Start / Due / Title
```

`Start` is `planned_date`; `Due` is `due`, then `due_month` if no exact due date exists, otherwise `—`. By default list active tasks across all year/month directories. Apply a date window only when the user asks for a window or asks for a day-plan.
