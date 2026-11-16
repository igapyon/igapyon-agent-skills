# Todos

Read this reference to capture, list, update, work on, or transfer a todo. A todo holds an actionable item set aside for separate attention, often discovered while working through activities. It keeps that item retrievable across days without requiring a task or a work schedule.

## Responsibilities and capture

Activities retain the dated discovery, discussion, and work. A todo maintains what still needs separate attention and points back to that context. A task manages a job's purpose, completion conditions, progress, and plan. Choose by the intended use, not by size: a substantial item can begin as a todo, and a small job can be managed as a task. Neither elapsed time nor starting work requires conversion to a task.

During active use, a clear “TODO追加”, “これは別途やる”, or “後で対応するので残して” requests a todo when the conversation establishes a concrete action being set aside. Save it without asking the user to choose dates or priority. An Agent's suggestion, a hypothetical improvement, or an unresolved idea stays in the activity until adopted as a follow-up action. An explicit task registration or task-planning request still uses [Add a task](operations.md#add-a-task). A task's own steps normally stay in its checklist; do not automatically extract every remaining step into a todo. Existing Backlog tasks retain their task identity.

Keep writes within scope. An activity-only, read-only, no-recording, or named-file instruction takes precedence; ordinary activity capture alone does not authorize a todo write. Registering or listing a todo does not request executing it. Do not retrospectively extract todos from past activities or convert existing tasks unless requested.

## Location, identity, and content

Save one item per file at `YYYY/YYYYMM/todos/todo-YYYYMM-NNNNN-name.md`, using its creation month. The persistent `id` is `todo-YYYYMM-NNNNN`; use a five-digit monthly sequence independent of task IDs. Inspect current todos, local Git history, and pending writes before allocating after the largest number for that month. Never reuse deleted numbers or gaps; check the destination is unused. Keep the ID, filename, and creation-month directory unchanged on later updates, including completion or transfer. Create directories only when needed.

New records use this minimum front matter:

```yaml
---
type: todo
id: todo-202611-00001
status: open
created: 2026-11-17
---
```

Use the actual Asia/Tokyo creation date. The filename, directory, `id`, and `created` month must agree. `type: todo` identifies this record; a task's `status: todo` continues to mean an unstarted task. Do not search or classify records by that status word alone.

Write a Japanese title and a concise actionable description, with enough reason or context to understand it later. Link to the originating activity and relevant retained material when available. Direct registration is allowed without an earlier activity; normal common capture records the request, while file restrictions may suppress that activity. Do not invent a source or create a dummy record. No priority, planned dates, `planning_state`, completion checkbox, or fixed body sections are required. Preserve a supplied deadline or constraint with its meaning and source; do not infer a planned period. If the user wants date-based planning or notification delivery, follow the requested task/schedule workflow.

Use these scalar status strings:

| Status | Meaning |
| --- | --- |
| `open` | Separate action remains, including work started or waiting on something. |
| `done` | The described action was completed. |
| `cancelled` | The action was explicitly dropped or an adopted decision made it unnecessary. |
| `transferred` | The entire remaining action is now tracked by a linked task. This does not mean the work was completed. |

The todo is maintained current state, so its text and status can be updated on later days. Keep meaningful scope changes and closure reasons traceable with short dated notes and links. Apply the day-based preservation policy to its source activities, not to the todo. Closed records remain at their saved paths. Reopen a closed item only when the user's current request establishes renewed remaining work; a later lookup alone does not reopen it.

## Create, update, and execute

Follow the skill's README/Git checks. Before creating, use the action, purpose, and known sources to search relevant todos across months and any clearly related tasks. Reuse an existing record for the same outstanding action; a repeated registration adds no duplicate or no-op rewrite. If an existing task already tracks that entire action, report its link rather than creating a second maintained item. Similar wording alone does not establish the same work, and a repeated real occurrence may need a new record. Resolve a materially ambiguous target before editing it.

Reread a selected todo and the source material needed for the operation. Use ordinary Markdown editing; the activity CLIs only operate on activities. During active use, capture the discovery or operation in the episode's activity under [activity-capture.md](activity-capture.md). Save that activity first when both are writable, then save the todo with its source link. Add a backlink from the current activity when permitted; do not rewrite older activities just to add one. A lookup or already-current record need not produce a todo write.

A request to work on an identified todo includes maintaining that todo's supported progress, remaining action, and outcome through follow-ups, subject to current file restrictions. Before executing, check its current disposition and any destination task: transferred work continues from that task's current state, and a completed or cancelled item requires a request establishing renewed work. Record the work in activities for its actual date; no task is required. Keep `open` while action remains, including after starting, a partial result, failure, or external waiting. When the in-scope result clearly satisfies the described action, or the user says it is complete, reread the todo, set `done`, and leave a short dated reason and an available result/activity link without waiting for a separate close command. Use `cancelled` for an explicit drop or adopted decision, stating that reason. An activity-only completion report does not itself authorize changing the todo. Do not scan or close unrelated todos on each response.

If a write fails, distinguish the activity already saved from the todo still needing an update. Verify `type`, ID/path/date agreement, allowed status, source/result links, and `git diff --check`; report the saved path and supported outcome.

## Transfer to a task

Transfer when the user wants the item managed as a task or explicitly incorporates it into an existing task. Resolve a matching task first; use [Add a task](operations.md#add-a-task) or [Update a task](operations.md#update-a-task) within that scope. A new task uses its actual creation month and its own ID. For requested synthesis of accumulated activities, apply [Choose how to consolidate activities](operations.md#choose-how-to-consolidate-activities); a simple action registration does not require a history-strategy question.

Save the activity and the destination task first when they are in scope. Ensure the saved task actually includes the todo's remaining action and links to its context; a bare relationship link or a nearby subject is insufficient. Only then reread the todo, set `transferred`, and add a dated reason and the destination task link. Keep the todo as the discovery and handoff reference; maintain future work state in the task. If only part of the action is transferred, keep the todo `open`, describe its remaining part and the handoff, and avoid tracking the transferred part in both places.

A failed task save leaves the todo untransferred. If the task was saved but the todo update failed, report both saved task and pending todo update; on retry, reconcile that destination before creating another task. Transfer never implies task completion, cancellation, or an unrelated task edit. Source activities and attachments retain their saved paths.

## Lists and related records

For “TODO一覧” or “未処理のtodo”, inspect canonical `YYYY/YYYYMM/todos/todo-*.md` records across all years and months and show `open` items by default. Do not restrict them to today or the current month unless requested. Display `ID / Status / Title / Source`, linking the todo and its available origin; order by creation date then full ID. Include closed states when requested and show a destination for transferred items. Report invalid or unsearchable records as such rather than silently treating them as open or claiming a complete list. Listing does not change the inspected todos.

A task-list request retains its existing meaning. For a broad “残っているやること” or “何から始めるか” request across daybook, include open todos alongside the relevant tasks, in separately labelled groups; use the existing day-plan generator when its planning candidates are needed. Do not assign dates or task priorities to todos to rank them. Suggest a small next step from the user's context and constraints without executing it or changing state just because it was suggested.

Todos are not inputs to the bundled day-plan generator or notification workflow. A request for a day-plan alone generates the existing task/schedule snapshot; do not hand-edit that snapshot to insert todos. A broader work overview can report open todos separately from the generated plan. A waypoint may point to a todo and its activities when a resume marker is useful, but creating or closing that waypoint does not change the todo's state.

Retain supporting files under [attachments.md](attachments.md): reuse existing paths; new material prefers a clearly related existing task, otherwise its actual work activity. Todo creation adds no todo-specific attachment hierarchy, and later task transfer links to existing attachments rather than moving them.
