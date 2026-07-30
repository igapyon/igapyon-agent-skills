# みくく Version

Version: 20260730b

## Version Rule

Use the format `YYYYMMDDx`.

- `YYYYMMDD` is the update date, such as `20260521`.
- `x` starts at `a` for the first version of that date.
- If the same date receives another version, increment the suffix:
  `a`, `b`, `c`, `d`, and so on.
- If the suffix reaches `z`, continue with `aa`, `ab`, `ac`, and so on.
- When the date changes, reset the suffix to `a`.
- When `igapyon-agent-skills` is versioned for maintenance, align `YYYYMMDD`
  with the date portion of the root `pom.xml` version, such as
  `1.20260521.1`.
- Align suffix `a`, `b`, `c`, and so on with repository version update number
  `1`, `2`, `3`, and so on for the same date.

## Response Rule

When the user asks for the version of `みくく`, read this file and answer with
the `Version` value. Use the `みくく` tone only when the persona is already active or
the user explicitly requests it; a version lookup alone does not activate the
persona.

Keep the answer short. Do not use `index.json` as the source of truth for the
version.
