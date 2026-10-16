# Agent Skill Trace

Agent Skill Trace is an optional development-time diagnostic aid for Agent Skills.

This feature is intentionally narrow and should stay off by default. It exists to help a Skill author understand when a Skill became active, when `SKILL.md` was read, when Markdown reference files were read, and which trace-relevant decisions occurred during an `igapyon-agent-state-management` workflow.

## Activation Policy

Do not enable Agent Skill Trace automatically.

When `igapyon-agent-state-management` is active and the user asks about logs, traces, Markdown reads, `SKILL.md` read timing, or when Agent Skills became active, introduce Agent Skill Trace as an available diagnostic option.

Enable tracing only when the user explicitly asks to turn it on. Accept clear instructions such as:

- "Agent Skill Trace を ON にして"
- "トレースを開始して"
- "Skill 読み込みタイミングを jsonl に記録して"
- "この作業では Agent Skill Trace を有効化して"

Do not treat vague curiosity as activation. Questions such as "ログは見られる?", "いつ読んだか知りたい", or "トレースできる?" should receive an explanation of the feature and a note that it requires explicit opt-in.

## Output Location

Trace files are JSONL and are split by local date.

Try these repository-local candidates in order and select the first one that
passes the safety check below:

1. `workplace/agent-skill-trace/YYYY-MM-DD.trace.jsonl` when `workplace/` exists.
2. `temp/agent-skill-trace/YYYY-MM-DD.trace.jsonl` when `temp/` exists and the
   `workplace/` candidate is unavailable or unsafe.
3. `workplace/agent-skill-trace/YYYY-MM-DD.trace.jsonl` when neither directory
   exists and the new candidate passes the safety check.

Before writing, confirm that the exact candidate file is not already tracked and
is covered by the repository's ignore rules. In a Git repository, use the
repository's normal tracked-file and ignore checks for this confirmation. For
example, the candidate must fail `git ls-files --error-unmatch -- <path>` and
pass `git check-ignore -q --no-index -- <path>`. Do not create or modify
`.gitignore` automatically for tracing. If no candidate is confirmed to be
local-only, skip trace output and report that tracing could not be safely
persisted; continue the requested work.

Use the repository-local timezone context when available. For this repository's normal local work, that is Asia/Tokyo.

Trace JSONL files are operational artifacts and must remain local-only. This
rule applies equally to `workplace/` and `temp/` in every target repository.

## Event Scope

Keep trace events small and operational. Record facts about Skill activation and file access, not content.

Recommended event types:

- `skill_trace_enabled`
- `skill_activated`
- `skill_instruction_read`
- `skill_reference_read`
- `skill_trace_decision`
- `skill_trace_disabled`

Optional event types:

- `tool_called`
- `fallback`
- `blocked`

## JSONL Shape

Each line should be one compact JSON object.

```json
{"ts":"2026-06-28T10:15:23+09:00","event":"skill_activated","skill":"igapyon-agent-state-management","reason":"explicit user trigger","source":"agent-skill-trace"}
```

Suggested fields:

- `ts`: ISO 8601 timestamp with offset
- `event`: short event name
- `skill`: Skill name when applicable
- `path`: repository-relative path when applicable
- `reason`: short explanation
- `source`: `agent-skill-trace`

## Privacy Rules

Do not write full user messages, file contents, generated drafts, secrets, tokens, credentials, API keys, environment dumps, command output, or long reasoning traces into the JSONL file.

Prefer short reason labels over raw text. For example, use `"reason":"explicit user trigger"` rather than copying the user's full sentence.

When in doubt, omit the field.

## Recording Procedure

When the user explicitly enables tracing:

1. Select the first safe path for the current local date.
2. Create the parent directory only after the path safety check succeeds.
3. Append one compact JSON object per line. Preserve existing lines and do not
   rewrite or delete earlier events.
4. In the first trace file, write the `skill_trace_enabled` event before any
   later trace event. Record only events known at the time; do not reconstruct
   events from memory.
5. Re-evaluate the local date before each append. If the date changes, switch
   to the new date's file and begin it with a `skill_trace_decision` event whose
   reason is `date rollover`.
6. If tracing is explicitly disabled, append `skill_trace_disabled` to the
   current file. A trace write failure must not block the requested work; report
   the failure and continue without further trace writes.

## Minimal Start Event

When tracing is explicitly enabled, the first line of the first trace file
should be a `skill_trace_enabled` event. A file created after a date rollover
starts with the `skill_trace_decision` event described above.

```json
{"ts":"2026-06-28T10:15:00+09:00","event":"skill_trace_enabled","skill":"igapyon-agent-state-management","path":"workplace/agent-skill-trace/2026-06-28.trace.jsonl","reason":"explicit user opt-in","source":"agent-skill-trace"}
```

## Minimal Stop Event

If tracing is explicitly disabled during the same work, write a final `skill_trace_disabled` event.

```json
{"ts":"2026-06-28T10:45:00+09:00","event":"skill_trace_disabled","skill":"igapyon-agent-state-management","reason":"explicit user opt-out","source":"agent-skill-trace"}
```
