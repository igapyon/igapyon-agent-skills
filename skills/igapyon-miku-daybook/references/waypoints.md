# Waypoints

Read this reference for a history lookup, a request to resume daybook-managed work, or a Waypoint operation. Lookup and resumption can use activities directly without a task or waypoint.

## Purpose and source of truth

A Waypoint is an optional short Markdown note that points to a place where work can resume. It may point directly to one or more activities without a task. It can help work resume in a later session or help another session pick up a scoped part of the work. It does not manage or monitor threads.

Keep the work's canonical state in the existing records:

- **Task, when present:** a maintained summary of purpose, completion conditions, latest conclusion and approach, current status, unresolved matters, and next actions.
- **Activity:** dated work, trials, observations, failed or inconclusive approaches, corrections, and reasons for decisions; it can supply the full work context when there is no task.
- **Waypoint, when useful:** the scope to resume, links to the relevant records and material, and the first thing to check.

Some short overlap between a record's next action and the Waypoint's resume instruction is useful. Do not copy a full task, activity, plan, conversation, or execution log into a Waypoint. Do not create a task just to provide a waypoint destination or change an existing task's status or planning state merely because a Waypoint is created, resumed, or closed. During active use, record resumed work and conversation progress under [activity-capture.md](activity-capture.md), including work in another repository.

The work resumed from daybook may be in another directory or repository. Keep its location, scope, and useful references in the daybook task, activities, or Waypoint. Daybook may link to that repository and its results. Do not add links, paths, or resume pointers back to daybook in the work repository's files or repository-facing text. Follow the work repository's own instructions and inspect its Git state before editing there; keep its documentation and handoff usable on their own.

Git state helps protect files before an edit or other concrete operation. It does not establish the work's purpose, progress, or completion. Resolve those from the user's request and the relevant activities, any existing task, and linked material. Before changing files in the target daybook, follow the skill's required checks: read the target `README.md` and current Git status, and preserve unrelated changes.

## Find and resume earlier work

For a question such as “こういう作業やってたっけ？”, use the purpose, terms, people, dates, or known paths in the conversation to search canonical `YYYY/YYYYMM/activities/activity-*.md` records, including unsuffixed legacy names. If dates are unknown, include relevant records across months and years. Narrow by filename or content before reading the useful candidates; do not load all activities or select only the newest file. Follow links to any relevant task, waypoint, or material when needed to understand the work. A missing task or waypoint is not evidence that the work was never done.

Report the matching activities with their dates and links, what was tried, the latest supported understanding, corrections to earlier conclusions, and remaining questions when known. Distinguish a proposed action from one actually performed. Keep different episodes distinct when a shared keyword alone does not identify the work. If no match is found, describe the searched scope; if multiple matches materially change the intended continuation, ask only about that ambiguity. A history question alone requests lookup and explanation, not execution of old next actions; common activity capture still follows the current recording scope.

When the user requests continuation, resolve the scope from the named activity, task, or waypoint, or from the relevant records found above. Read only what is needed to reconstruct the current state. Use the activity's latest supported results and corrections; check an existing task's current state before relying on it. Continue the requested work under the work location's instructions and record new progress for its actual date under [activity-capture.md](activity-capture.md), preserving earlier accounts. A task or waypoint does not need to be created first. Task consolidation remains optional under [Task and activity responsibilities](operations.md#task-and-activity-responsibilities).

## Resume from a Waypoint

A resume request can name a Waypoint directly:

```markdown
igapyon-miku-daybook スキルを使い、waypoints/20261105-0900-example-00001.md から作業を再開してください。
```

Resolve this example's relative path from the selected daybook repository root. Follow the entry's scope and links to relevant activities, any existing task, and material. A named activity or task can instead be used directly under [Find and resume earlier work](#find-and-resume-earlier-work). When the user describes the work without naming an entry, use that lookup procedure; selecting or creating a waypoint is not a prerequisite.

## Location and names

Store Waypoints in the target daybook repository's root `waypoints/` directory. Do not require a `waypoints/README.md`; this reference defines the operation.

For one standalone resume entry, use:

```text
YYYYMMDD-HHMM-<topic>.md
```

For a set of entries created to resume one larger piece of work, use a shared stem:

```text
YYYYMMDD-HHMM-<topic>.md          # optional entry for the whole work
YYYYMMDD-HHMM-<topic>-00001.md    # first independently resumable subwork
YYYYMMDD-HHMM-<topic>-00002.md    # another independently resumable subwork
```

- Use the Asia/Tokyo creation time for the shared `YYYYMMDD-HHMM` prefix and a short lowercase English topic.
- In a numbered set, the shared prefix records when the set's first entry was created. Keep it when adding a subwork entry later. `updated_at` records each file's latest content or metadata update.
- The unnumbered whole-work entry is optional. Omit it when the task or its plan already provides a clear route back to the overall work.
- Create numbered entries only for subwork that benefits from an independent resume point. Keep the plan, dependencies, acceptance conditions, and progress in the task or a linked plan document. A numbered entry points to the relevant scope and resume step.
- Start numbering at `00001`. For a new entry, inspect the existing set and use the next number after its highest number. Never reuse a number, including one whose entry is `closed`; do not renumber entries when the plan order changes.
- A number identifies an entry within the shared stem. It is not a task ID, priority, revision, execution order, or evidence that parallel work is safe.
- Update an existing entry in the same file, preserving its exact path, shared stem, and number. Filename collision rules apply only when creating a distinct new entry: if a new standalone filename is already occupied, select a unique name by adding `-2`, `-3`, and so on before `.md`; for distinct new subwork in a numbered set, select the next unused number. Check the new destination before writing.
- If an existing whole-work entry or numbered set has the same prefix but describes different work, use a distinct topic suffix for the new set, such as `YYYYMMDD-HHMM-<topic>-2-00001.md`. Keep that adjusted stem consistent for all entries in the new set.
- Multiple entries may point to the same activity or task. Do not create one task per Waypoint; task creation follows [Task and activity responsibilities](operations.md#task-and-activity-responsibilities).

## Front matter

New Waypoints use this front matter:

```yaml
---
type: waypoint
updated_at: "2026-10-20T15:30:00+09:00"
status: ready
---
```

`updated_at` is the actual Asia/Tokyo time of the last content or metadata change, in ISO 8601 form with an explicit offset. Do not change it for a read or no-op save. Keep the filename's creation prefix unchanged when updating a file.

Validate `type: waypoint`, a quoted ISO 8601 `updated_at` with an explicit UTC offset, and a scalar `status` from the table below. Do not use a list, object, boolean, or empty value for these fields.

Use exactly one of these `status` values:

| Status | Meaning |
| --- | --- |
| `ready` | Saved and available as a resume entry; this is the state for a new entry or an explicitly paused handoff. |
| `in_use` | The session that resumed this entry has recorded that it is actively working on its scope. |
| `closed` | This entry's resume role ended, for example because the scope finished or a successor entry replaced it. The file remains as history. |

`closed` does not mean the task is complete. Task completion still follows [Task completion and scope](operations.md#task-completion-and-scope) and the task's recorded completion conditions. A closed entry may be resumed again when the user requests it; first reconcile its guidance against the current task and activities.

Each entry has its own state. Resuming a child does not change the status of the optional whole-work entry or sibling entries. A parent status is not copied to its children. Do not mark the task complete automatically when all its Waypoints are closed.

Existing notes without this front matter remain readable and have no recorded Waypoint state or update time. Do not derive `updated_at` from their filename or silently infer a status. When substantively updating a legacy note, add the required fields with the appropriate current values.

## Saving, updating, and selecting an entry

When saving a Waypoint:

1. Read the relevant activities and any existing task, plus needed linked plans or material. Update canonical records only within the scope of the user's request.
2. Resolve whether the request updates an existing entry or needs a distinct new resume point, using the specified path and the work or subwork scope. Edit an existing entry in place; do not assign it a new timestamp prefix, collision suffix, or subwork number. For a new entry, decide whether a whole-work entry, numbered subwork entry, or both are useful. Do not generate a Waypoint for every checklist item.
3. Write a concise resume instruction with links to the canonical records, the selected scope, and the first check for the next session. For activity-only work, a pointer to the relevant activity and where to continue is sufficient; no task link is required. When known and useful, include related thread names, URLs, or IDs, their scope, and when that information was last checked. Do not invent identifiers or current thread status.
4. When a whole-work entry exists, list relative links to the set's child entries there, labelled by their scope, and link each child back to it. Adding a child includes updating the whole-work entry's navigation; creating a whole-work entry later includes adding backlinks to existing children. Keep the status of navigation-only edits unchanged and update `updated_at` only when content actually changes. If the whole-work entry is omitted, children link directly to the relevant activities, task, or plan; do not create a placeholder whole-work entry or a link to a missing file.
5. Save new entries as `ready` after checking their destinations are unused. On an existing entry, preserve its status unless the requested operation entails a transition described below. Set `updated_at` to the actual content or metadata change time; a no-op update leaves it unchanged.

For selection, use an explicitly named file from the active instructions first. Otherwise narrow candidates by the user's requested work, established conversation, and filenames, then read only the relevant notes. If the intended work remains ambiguous, show candidate filenames and clarify the scope before loading linked task and activity contents or changing a note. Do not select a note only because it has the newest timestamp.

Reading a note or listing candidates keeps its `status` and `updated_at` unchanged; the check can still receive the common activity record during active use. An explicit no-file-changes or read-only instruction also suppresses activity writes. For a resume operation using a selected Waypoint, read it and follow any specifically designated child entries to identify the resume scope, then use [Find and resume earlier work](#find-and-resume-earlier-work) for the relevant record reads and continuation. A request to resume a specific task carries that task's requested-work scope into the follow-up; update its observed progress and next actions under [operations.md](operations.md#task-updates-during-requested-work). Merely reading or saving a Waypoint, or marking it `in_use`, does not establish task progress or authorize a task edit. Before beginning actual subwork through a waypoint, set the entry for that scope to `in_use` and update `updated_at`. If only reviewing or explaining the note, leave its metadata unchanged. Direct resumption from activities needs no waypoint metadata update.

## Pause, finish, and thread references

When the user asks to pause or hand off the current scope, capture meaningful unsaved progress under the active-use recording rules and any current restrictions. If there is a selected waypoint in scope, revise its resume instruction to reflect supported facts and the next step, and set it to `ready` with a new `updated_at`. Keep task edits within their scope. A pause such as “今日はここまで” does not require a new waypoint; leave an optional pointer directly to the activity when requested or useful within the handoff scope. Work remains resumable from activities when no waypoint is saved.

When this entry no longer serves as a resume point, set it to `closed` and update `updated_at`. Keep the file. Do not close related entries or change the task's status as a side effect.

Thread references are observations, not a lock or live status feed. Record only information that is known, including an observation time when useful. A reference to another thread does not mean it is still active. Do not start another session merely by creating a numbered entry, and do not assume numbered subwork can run in parallel; check the plan's dependencies and known thread scopes.

The resumed session updates its own entry when it starts, pauses, or ends the entry's role. Do not add heartbeat, polling, automatic expiration, or a separate watcher. An interrupted session may leave `in_use`; the next session checks the canonical records and actual scope rather than inferring live activity from that value.
