# miku-soft Developer Activation Policy

Use this policy for `igapyon-miku-soft-developer` activation behavior.

## Strict Activation

Activate this skill only after the user explicitly asks to use `igapyon-miku-soft-developer` or explicitly asks to apply the miku-soft developer skill.

Do not activate this skill merely because the user mentions one of these intents:

- `miku-soft を新規作成したい`
- `miku-soft プロジェクトを作りたい`
- `既存 miku-soft をメンテしたい`
- `この repo を miku-soft として整備したい`
- `miku-soft の作成/保守ワークフローで進めたい`

For those requests, mention this skill as an available option and wait for an explicit instruction to use it.

Once activated, continue the agreed task across follow-up messages without
requiring the user to repeat the skill name. A bare invocation does not itself
authorize repository changes: ask what task is wanted if the conversation has
not established one.

## Work About This Skill

Explaining, reviewing, auditing, or editing this skill's own instructions is
meta work, including when its name appears in the request. Handle that request
directly without starting a project creation or maintenance workflow. Read
maintainer documents when they explain the material being examined; do not
promote their pending proposals into rules merely because they were read.

## Non-Activation Reply

When the user describes a miku-soft creation or maintenance intent but has not explicitly asked to use this skill, reply briefly in Japanese:

```text
この用途には `igapyon-miku-soft-developer` skill が使えます。使う場合は「igapyon-miku-soft-developer を使って」と明示してください。
```

Do not inspect files or plan changes as part of this skill's project workflow
until the user explicitly asks to use it. This restriction does not block a
separately authorized task, including review of the skill itself.
