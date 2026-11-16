# Waypoints

Read this reference for a history lookup, a request to resume daybook-managed work, or a Waypoint operation, including a status inquiry or cleanup. Lookup and resumption can use activities directly without a task or waypoint.

## Purpose and source of truth

A Waypoint is an optional short Markdown note that points to a place where work can resume. It may point directly to one or more activities without a task. It can help work resume in a later session or help another session pick up a scoped part of the work. It does not manage or monitor threads.

Keep the work's canonical state in the existing records:

- **Todo, when present:** a separately deferred action, its current disposition, and its source/result links under [todos.md](todos.md).
- **Task, when present:** purpose, completion conditions, progress, remaining work, next actions, and the short conclusion needed to act, with links to topic detail.
- **Topic, when useful:** maintained thematic knowledge, specifications, adopted decisions, and current understanding, with links to evidence under [topics.md](topics.md).
- **Activity:** dated work, trials, observations, failed or inconclusive approaches, corrections, and reasons for decisions; it can supply the full work context when there is no task.
- **Waypoint, when useful:** the scope to resume, links to the relevant records and material, and the first thing to check.

Some short overlap between a record's next action and the Waypoint's resume instruction is useful. Do not copy a full task, activity, plan, conversation, or execution log into a Waypoint. Do not create a task just to provide a waypoint destination or change an existing task's status or planning state merely because a Waypoint is created, resumed, or closed. During active use, record resumed work and conversation progress under [activity-capture.md](activity-capture.md), including work in another repository.

The work resumed from daybook may be in another directory or repository. Keep its location, scope, and useful references in the daybook task, activities, or Waypoint. Daybook may link to that repository and its results. Do not add links, paths, or resume pointers back to daybook in the work repository's files or repository-facing text. Follow the work repository's own instructions and inspect its Git state before editing there; keep its documentation and handoff usable on their own.

Git state helps protect files before an edit or other concrete operation. It does not establish the work's purpose, progress, or completion. Resolve those from the user's request and the relevant activities, any existing task, and linked material. Before changing files in the target daybook, follow the skill's required checks: read the target `README.md` and current Git status, and preserve unrelated changes.

## Find and resume earlier work

For a question such as “こういう作業やってたっけ？”, use the purpose, terms, people, dates, or known paths in the conversation to search canonical `YYYY/YYYYMM/activities/activity-*.md` records, including unsuffixed legacy names. If dates are unknown, include relevant records across months and years. Narrow by filename or content before reading the useful candidates; do not load all activities or select only the newest file. Follow links to any relevant todo, task, topic, waypoint, or material when needed to understand the work. A missing task or waypoint is not evidence that the work was never done.

Report the matching activities with their dates and links, what was tried, the latest supported understanding, corrections to earlier conclusions, and remaining questions when known. Distinguish a proposed action from one actually performed. Keep different episodes distinct when a shared keyword alone does not identify the work. If no match is found, describe the searched scope; if multiple matches materially change the intended continuation, ask only about that ambiguity. A history question alone requests lookup and explanation, not execution of old next actions; common activity capture still follows the current recording scope.

When the user requests continuation, resolve the scope from the named activity, todo, task, topic, or waypoint, or from the relevant records found above. Read only what is needed to reconstruct the current state. Use the activity's latest supported results and corrections; check a linked todo's current disposition, an existing task's work state, and any relevant topic's current specifications before relying on them. A topic's adopted or proposed approach alone does not establish execution or todo/task completion. Resuming a todo includes its maintenance under [todos.md](todos.md); merely reading or closing a waypoint does not change that todo. Continue the requested work under the work location's instructions and record new progress for its actual date under [activity-capture.md](activity-capture.md), preserving earlier accounts. A task or waypoint does not need to be created first. Task/topic consolidation remains optional under [record responsibilities](operations.md#task-and-activity-responsibilities).

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
| `in_use` | An optional annotation that a session resumed this entry and recorded work on its scope; it does not establish current live activity. |
| `closed` | This entry's resume role ended, for example because the scope finished or a successor entry replaced it. The file remains as history. |

`in_use` is not a prerequisite for working from an entry or closing it. A `ready` entry may be closed directly when its resumed scope is complete. Keep all three values readable without bulk-migrating existing notes; missing or stale state is not evidence of completion or current activity.

`closed` does not mean the task is complete. Task completion still follows [Task completion and scope](operations.md#task-completion-and-scope) and the task's recorded completion conditions. A closed entry may be resumed again when the user requests it; first reconcile its guidance against current records. If it again has an unfinished resume role within that request, reopen it as `ready`, or optionally `in_use` when actually starting work. A read alone does not reopen it.

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

Reading a note or listing candidates keeps its `status` and `updated_at` unchanged; the check can still receive the common activity record during active use. An explicit no-file-changes or read-only instruction also suppresses activity writes. For a resume operation using a selected Waypoint, read it and follow any specifically designated child entries to identify the resume scope, then use [Find and resume earlier work](#find-and-resume-earlier-work) for the relevant record reads and continuation. A request to resume a specific task carries that task's requested-work scope into the follow-up; update its observed progress and next actions under [operations.md](operations.md#task-updates-during-requested-work). Merely reading or saving a Waypoint, or marking it `in_use`, does not establish task progress or authorize a task edit. Recording `in_use` at actual resumption is optional; do not add recurring state updates during the work. Direct resumption from activities needs no waypoint metadata update.

Carry the actual resumed entry path and its scope through the work's follow-up conversation. When that scope finishes, apply [Finish a resumed scope](#finish-a-resumed-scope) as part of the completion response. The resume request includes this entry's lifecycle updates within the work; a separate “close this waypoint” instruction is not needed. Current read-only, recording-only, or named-file restrictions still take precedence.

## Finish a resumed scope

Close an entry when the work actually resumed from it has completed its recorded scope and it no longer needs to serve as that resume point. Evaluate the scope from its instructions, linked records, the current user direction, and observed results. The end of a response, a completed subset, a failed attempt, or an external wait does not by itself establish this. Do not invent extra completion requirements or wait for the whole task to finish when this entry covers only a completed part.

Before the completion response, reread the current entry and any records needed to verify the result. If another contribution changed its instructions or meaningful unfinished work remains, reconcile that scope before deciding; do not close from an old draft. If it is already closed for the same completed role, leave it and `updated_at` unchanged. Otherwise, once completion is established, set this entry to `closed`, update `updated_at` to the actual change time, and leave a short reason and a link to the saved result or relevant activity when available. Preserve its path and history. No `in_use` transition or separate approval is required. Report the closed entry briefly; if the write fails, report it as incomplete.

Apply this to the entry or entries whose scopes were actually resumed and finished. Evaluate each separately; do not cascade the closure to a parent or siblings, or change task/topic state as a side effect. Keep results under the common activity rules and any current file restrictions. Do not scan unrelated waypoints on each response or ordinary task/activity update. A request merely to read, list, record an activity, or check status follows its own scope and does not trigger this closure procedure.

## Check status or clean up

For “waypointの状況を教えて” or a list request, inspect the requested entries and the linked activities, tasks, topics, or results needed to understand their current role. Use scoped searches if their paths are unknown. Report the saved status separately from the supported assessment: what remains, what appears finished or superseded, and what cannot yet be determined, with useful evidence links. `in_use` alone does not establish that another session is still working. Leave the inspected entries unchanged; normal activity capture follows the user's current recording scope.

For “waypointを整理して” or an explicit close/update request, reconcile the entries covered by that request and update their states or resume guidance based on current evidence. Close entries whose roles are demonstrably over, including work finished elsewhere, an intended successor that now covers the remaining scope, or an explicit user direction to retire the entry. A new entry's existence alone does not establish replacement. Reread before writing and record the short closure reason and result link as above; distinguish completion, replacement, and retirement without claiming unfinished work was completed. The cleanup request authorizes supported updates without asking about each established closure; leave unresolved cases unchanged and report the uncertainty. Consider parents and siblings only when the requested cleanup covers them, and judge each on its own scope. This is an on-request operation, not a periodic scan.

## Pause, finish, and thread references

When the user asks to pause or hand off the current scope, capture meaningful unsaved progress under the active-use recording rules and any current restrictions. For an entry actually used to resume work, check completion first under [Finish a resumed scope](#finish-a-resumed-scope). If its scope is finished, close it; a pause does not reopen it as `ready`. If work remains and a selected waypoint is in scope for the handoff, revise its resume instruction to reflect supported facts, remaining work or waiting conditions, and the next useful check, and set it to `ready` with a new `updated_at`. Keep task edits within their scope. A pause such as “今日はここまで” does not require a new waypoint; leave an optional pointer directly to the activity when requested or useful within the handoff scope. Work remains resumable from activities when no waypoint is saved.

When explicitly replacing an in-scope resume entry, ensure the successor retains the needed remaining scope and links before closing the old entry with a short reason and successor link. Keep the old file. Follow the same current-read and individual-scope rules; do not close related entries or change task status as a side effect.

Thread references are observations, not a lock or live status feed. Record only information that is known, including an observation time when useful. A reference to another thread does not mean it is still active. Do not start another session merely by creating a numbered entry, and do not assume numbered subwork can run in parallel; check the plan's dependencies and known thread scopes.

The session that actually resumed the work maintains its selected entry at completion and requested pauses; `in_use` at the start remains optional. Do not add heartbeat, polling, automatic expiration, or a separate watcher. An interrupted session may leave `ready` or `in_use`; later resumption, a human status inquiry, or requested cleanup checks the records and actual scope rather than inferring live activity from that value.
