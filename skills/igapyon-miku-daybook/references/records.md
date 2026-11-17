# Daybook record contract

This reference defines the file and data rules for the `daybook` repository. Read it before creating or changing a record.

For when to capture conversations, URLs, and operation outcomes during active use, follow [activity-capture.md](activity-capture.md). The schemas and paths below also apply to these ordinary activity records.

Activities can stand alone for starting, continuing, and resuming work. Todos, tasks, topics, and waypoints are created as needed under [todos.md](todos.md), [record responsibilities](operations.md#task-and-activity-responsibilities), [topics.md](topics.md), and [waypoints.md](waypoints.md); their presence in the layout below does not require one for every activity.

## Directory and filename rules

Dated records use type-first roots, then calendar folders. Topics and waypoints live at the daybook root:

```text
daybook/
├── activities/YYYY/YYYYMM/YYYYMMDD/activity-YYYYMMDDaaa.md
├── tasks/YYYY/YYYYMM/YYYYMMDD/task-YYYYMM-NNNNN-name.md
├── todos/YYYY/YYYYMM/YYYYMMDD/todo-YYYYMM-NNNNN-name.md
├── schedules/YYYY/YYYYMM/schedule-YYYYMMDD-name.md
├── day-plans/YYYY/YYYYMM/day-plan-YYYYMMDD.md
├── attachments/YYYY/YYYYMM/
│   ├── task-YYYYMM-NNNNN/ # task ID month may differ from attachment month
│   ├── schedule-YYYYMMDD-name/
│   └── activity-YYYYMMDDaaa/
├── topics/
│   ├── text-conversion.md         # saving directly here is valid
│   └── daybook/                  # optional thematic grouping
│       └── activity-identifiers.md
└── waypoints/
    ├── YYYYMMDD-HHMM-topic.md
    └── YYYYMMDD-HHMM-topic-00001.md
```

Read and update existing records at their saved paths. During transition, the former `YYYY/YYYYMM/{activities,tasks,todos,schedules,day-plan,attachments}/` layout remains valid; do not rename a record or attachment as a side effect of ordinary work. The bundled record helpers read both record layouts. New records use the type-first paths above.

- An activity belongs to the date on which it happened. New files go in `activities/YYYY/YYYYMM/YYYYMMDD/`. Create a separate file for each coherent event or work episode, with a lowercase letter suffix immediately after the date: `activity-YYYYMMDDaaa.md`, then `aab`, through `aaz`, then `aba`, and onward through `zzz`. The three-letter range covers 17,576 activities per date. On overflow, continue automatically with `aaaa`; likewise `zzzz` advances to `aaaaa`. There is no specification limit on suffix length. Restart at `aaa` for each activity date. Continue the same file for updates to that episode. Multiple episodes combined during concurrent work are acceptable; preserve all contributions.
- Compare suffixes by length then alphabetically, rather than ordinary filename sorting. Allocate after the largest suffix found in current files, local Git history and pending writes, with a minimum new suffix of `aaa`; existing one- or two-letter suffixes do not continue the shorter sequence. Do not reuse gaps or deleted names. Use the bundled creation CLI and update CLI described in [operations.md](operations.md#add-an-activity). The suffix is an allocation sequence, not an event time. Keep front matter `type: activity` and `date`; the activity date must agree with the filename and month.
- Existing unsuffixed `activity-YYYYMMDD.md` files and files with one- or two-letter suffixes remain valid and may be updated for their existing episodes. Keep their names, links and attachment paths. New episodes use the sequence starting at `aaa`; an existing unsuffixed file does not consume a suffix. Do not bulk-split or rename old records.
- Updating an activity follows [Edit activities over time](activity-capture.md#edit-activities-over-time), including same-day refinement, dated supplements/corrections to older accounts, and the overnight finishing exception. Keep its actual date and saved path.
- A schedule belongs to the month in which the event occurs: `schedules/YYYY/YYYYMM/`. Keep one file per independent event and separate unrelated events on the same day.
- A todo belongs permanently to its creation date's `todos/YYYY/YYYYMM/YYYYMMDD/` directory, including after completion, cancellation, or transfer. Its `todo-YYYYMM-NNNNN` ID uses a separate monthly sequence; follow [todos.md](todos.md) for allocation, metadata, and states.
- A new task belongs permanently to its creation date's `tasks/YYYY/YYYYMM/YYYYMMDD/` directory. The five-digit ID sequence remains monthly and its `YYYYMM` comes from `created`. A September-created task for an October event stays under `tasks/YYYY/202609/YYYYMMDD/` using its September creation day.
- For an existing task with no known `created` date, an explicitly requested layout migration may use its valid start date (`planned_start_date`, or legacy `planned_date`) as the placement date. Keep its existing task ID and leave `created` absent. The placement day and task ID month may differ. Record the choice in the migration mapping and task history. Once placed, keep the task path stable when planned dates or state change.
- Keep a task at its saved path when it becomes `done` or `cancelled`; update its status in place and do not move it to an archive or closed folder.
- A day-plan belongs to the target date's month at `day-plans/YYYY/YYYYMM/` and is a generated snapshot.
- Topics live under root `topics/`, outside the year/month hierarchy. Use a short descriptive lowercase English filename with hyphens and `.md`, directly in that directory or a useful subdirectory. Their creation/update dates do not determine their location. Keep saved paths stable and represent other relationships with links; see [topics.md](topics.md) for scope, content, metadata, and optional organization.
- Waypoints live in the daybook repository root, outside the year/month record directories. They are short resume entries; see [waypoints.md](waypoints.md) for naming, metadata, and update rules.
- Choose record text, an external reference, or an in-repository attachment using [attachments.md](attachments.md). Reuse an existing attachment's saved path first. New attachments use `attachments/YYYY/YYYYMM/<record-id>/` at the month when the material arose; prefer an existing task's ID only when its purpose or work products clearly relate to it, otherwise use the activity's actual filename stem. Do not create a task merely to store an attachment. An attachment's parent month may differ from the month in its task-id; task creation-date checks below apply to task records, not attachment folders. Keep existing attachment paths when updating or referencing them, including when a task is later created or linked. Follow [attachments.md](attachments.md) for task-only and schedule-only placement, content selection, temporary files, and binary exceptions. Create directories only when needed.
- Use lowercase English prefixes. Todos, tasks, and schedules use a short English name suffix; activities use the letter sequence above. Preserve an existing filename and ID when updating its title or deadline.

## Task IDs and status

`task-id` (task ID) is the task's persistent identifier, stored in front matter as `id`, in `task-YYYYMM-NNNNN` format. For example, `task-202610-00014` is the task-id of `task-202610-00014-prepare-materials.md`; the corresponding attachment folder is `attachments/YYYY/YYYYMM/task-202610-00014/`. Keep the YAML field name as `id`.

`NNNNN` is a five-digit sequence within the creation month. Inspect current files in every date folder and Git history before assigning the next number. Never reuse a deleted number or close a gap. A filename's ID, front matter `id`, and displayed ID must agree. For new tasks, the directory date, ID month, and `created` must agree. Existing legacy tasks remain readable; for an existing task in the new layout, a supplied `created` must match its day directory and ID month. A migrated task with no `created` keeps its saved placement date even if its ID month differs from the placement month; do not infer a created date from its start date.

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
priority: 7
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

`priority` is required on newly created task records and is an integer from `1` to `9`: `1` is highest and `9` is lowest. Smaller numbers mean higher priority. Use `7` when the user does not specify a priority. Existing task records may omit the field, in which case treat it as `7` without rewriting the file. Preserve any explicit value, including `5`.

`planning_state` is required on newly created task records and must be the scalar string `planned` or `backlog`. An omitted value on an existing record is treated as `planned` without rewriting the file. Backlog is a separate planning group, not a task status or completion state.

New planned tasks require `planned_start_date` and `planned_end_date`. They form an inclusive planned work period; a one-day task uses the same value for both. Require valid `YYYY-MM-DD` dates and `planned_start_date <= planned_end_date`. The end date is a planned finish date, not the actual completion date or necessarily an external deadline. Record actual completion with `status: done` and `completed`. If a user supplied a firm deadline, preserve its meaning, source, and modifiers in the task body; do not imply that the planned end is the deadline unless that is what the user intends. `planned_action` describes the intended work and does not imply it must occur on every day in the period.

An explicitly classified Backlog task may omit both planned endpoints or keep only the endpoint that is known. Do not fill an omitted Backlog date provisionally. Any supplied dates must still be valid and ordered. If `planned_dates_status` is present, both endpoints are still required. Keep `due_month` and `planned_week` as coarse reference information; neither creates a work date nor changes the planning group. Do not classify a task as Backlog merely because its period is long, it has no dates, it has low priority, or its status is `todo`.

For a new planned task, write both planned endpoints and `planned_dates_status`. Use context from the request, conversation, and task to make reasonable work-period estimates for unspecified endpoints; preserve explicit dates. Use `confirmed` only when both endpoints are explicit or the user confirms the complete period. If either endpoint is estimated or assumed, use `provisional`, even when the resulting period is one day. When neither date nor a reasonable estimate is available, use Asia/Tokyo today as both the provisional start and end. If only a start date is supplied and no end estimate is available, use it for both ends. If only an end date is supplied and no start estimate is available, use the earlier of today and that end date as the provisional start. Record the complete provisional period and briefly identify which values were estimated and why in the task body/history and response. Do not ask the user to confirm a provisional period before completing an otherwise clear task registration. `planned_week` is the Monday of a coarse work-week plan; it does not replace either required date on a new planned task.

`planned_dates_status` must be a scalar YAML string, either `confirmed` or `provisional`, and requires both valid planned endpoints. `confirmed` describes confidence in the planned period, not task completion. An unbounded weekly recurring rule without a planned period must not carry this field. Existing records without the field keep their legacy behavior; do not add or infer statuses by bulk-editing existing tasks. When a user changes only one endpoint and has not confirmed the resulting full period, keep the period provisional. A user may confirm the current values without changing them. In a generated day-plan, an active planned provisional period that includes the target date appears as a provisional candidate; other provisional periods remain in date review. This display rule does not change the stored period or the regular task-list grouping.

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

## Todos

For a new todo, use `type: todo`, persistent `id: todo-YYYYMM-NNNNN`, scalar `status: open`, and actual `created: YYYY-MM-DD`. The supported states are `open`, `done`, `cancelled`, and `transferred`; transfer requires a saved task covering the remaining action and a destination link. Priority, planned dates, `planning_state`, and a body status checkbox are not required. Use [todos.md](todos.md) for capture, cross-day updates, lists, execution, and handoff; do not confuse this record type with a task's `status: todo`.

## Topics

For a new topic, use `type: topic`, `created: YYYY-MM-DD`, and `updated: YYYY-MM-DD` with actual Asia/Tokyo dates. Preserve the creation date and update `updated` only on an actual change. A topic uses its saved path as its reference; no task-id, allocation suffix, priority, status, completion checkbox, or planned dates are required. Existing topic conventions and unknown historical dates are handled under [topics.md](topics.md#content-and-dates). Topics are maintained thematic records, not task/schedule inputs to the day-plan generator.

## Relationship rules

Use relative links between records and to retained text files under `attachments/`, including links across months, and check that each target exists after edits. Keep supplied source URLs for event pages and emails. If multiple records use the same supporting file, reference one canonical copy at its saved path; use [attachments.md](attachments.md) when choosing a new attachment location. Prefer stable references to originals and retained results managed outside daybook, including another Git repository; never use a temporary-file path as a permanent link. References to other work repositories belong on the daybook side; do not add references back to daybook in those repositories. Treat the original task and schedule as authoritative; a day-plan is a snapshot and should not become a second source of truth.

For a topic's current understanding and specifications, use the topic and its designated sources; for work state and completion conditions, use the task. A task retains a short actionable conclusion and links to topic detail. Topics link to their source activities, which retain the dated attempts, observations, and corrections. Creating a topic does not move source activities or attachments, edit unrelated tasks, or add backlinks to older activities.

When a task has implementation milestones or a firm external deadline in addition to its planned work period, label each date's meaning in the body and preserve the source. Do not silently reinterpret a `planned_end_date` as a firm external deadline.

## List display

For a todo list or a broader remaining-work overview, follow [Lists and related records](todos.md#lists-and-related-records); todo lists include open items across months, separately from task lists. For a task-list request, display this header and one row per selected task:

```text
ID / Priority / Status / Planning state / Planned start / Planned end / Title
```

`Planning state` is `planning_state`, or `planned` when omitted. Include planned and Backlog tasks by default, in separate groups. Sort planned confirmed or legacy dated tasks by ascending priority, planned end date, planned start date, then full task ID. Show planned tasks with provisional or incomplete periods in `日程要確認`, sorted by priority and ID. Show an unbounded weekly task without a planned period after dated planned tasks and before `日程要確認`, sorted by priority and full task ID; do not flag it for date review. Sort Backlog by ascending priority and then full task ID; do not date-filter it unless requested. Treat an omitted legacy priority as `7` without changing its file. Read current `tasks/YYYY/YYYYMM/YYYYMMDD/` and legacy `YYYY/YYYYMM/tasks/` records across all years. For weekly tasks, also show `Next` from `next_occurrence`; do not substitute it for either end of the task's planned period or use it as a sort key. By default list active tasks across both layouts. Apply a date window only when the user asks for a window or asks for a day-plan.
