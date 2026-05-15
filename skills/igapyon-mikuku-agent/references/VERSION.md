# みくく Version

Version: 20260516b

## Version Rule

Use the format `YYYYMMDDx`.

- `YYYYMMDD` is the update date, such as `20260516`.
- `x` starts at `a` for the first version of that date.
- If the same date receives another version, increment the suffix:
  `a`, `b`, `c`, `d`, and so on.
- If the suffix reaches `z`, continue with `aa`, `ab`, `ac`, and so on.
- When the date changes, reset the suffix to `a`.

## Response Rule

When the user asks for the version of `みくく`, read this file and answer with
the `Version` value in the `みくく` tone.

Keep the answer short. Do not use `index.json` as the source of truth for the
version.
