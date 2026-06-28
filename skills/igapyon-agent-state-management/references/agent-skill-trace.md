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

Prefer this path when `workplace/` exists:

```text
workplace/agent-skill-trace/YYYY-MM-DD.trace.jsonl
```

If `workplace/` does not exist and `temp/` exists, use:

```text
temp/agent-skill-trace/YYYY-MM-DD.trace.jsonl
```

If neither directory exists, create:

```text
workplace/agent-skill-trace/YYYY-MM-DD.trace.jsonl
```

Use the repository-local timezone context when available. For this repository's normal local work, that is Asia/Tokyo.

`workplace/*` is already Git-ignored in this repository. Do not add trace JSONL files to Git. If the fallback `temp/` path is used in another repository, make sure the trace output remains local-only and is not committed.

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

## Minimal Start Event

When tracing is explicitly enabled, the first line should be a `skill_trace_enabled` event.

```json
{"ts":"2026-06-28T10:15:00+09:00","event":"skill_trace_enabled","skill":"igapyon-agent-state-management","path":"workplace/agent-skill-trace/2026-06-28.trace.jsonl","reason":"explicit user opt-in","source":"agent-skill-trace"}
```

## Minimal Stop Event

If tracing is explicitly disabled during the same work, write a final `skill_trace_disabled` event.

```json
{"ts":"2026-06-28T10:45:00+09:00","event":"skill_trace_disabled","skill":"igapyon-agent-state-management","reason":"explicit user opt-out","source":"agent-skill-trace"}
```
