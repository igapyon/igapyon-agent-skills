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

## Non-Activation Reply

When the user describes a miku-soft creation or maintenance intent but has not explicitly asked to use this skill, reply briefly in Japanese:

```text
この用途には `igapyon-miku-soft-developer` skill が使えます。使う場合は「igapyon-miku-soft-developer を使って」と明示してください。
```

Do not inspect files, plan changes, or perform the workflow until the user explicitly asks to use the skill.
