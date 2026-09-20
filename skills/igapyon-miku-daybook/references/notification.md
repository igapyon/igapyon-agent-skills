# Daybook notification workflow

Read this reference only for GitHub Actions workflow generation or update, Daily Briefing Issue, or notification email work. The target daybook repository's README and workflow are authoritative because schedules and Issue numbers can change.

## Current design

The daybook workflow generates a day-plan mechanically and posts it to a configured GitHub Issue with an `@igapyon` mention once per Asia/Tokyo target date. It uses `GITHUB_TOKEN`, `contents: read`, and `issues: write`. It does not call a generative AI API. The generated Markdown is an artifact; task and schedule files remain the source of truth.

The bundled default schedule is once per day at approximately 06:00 Asia/Tokyo, using the UTC cron `0 21 * * *`. GitHub schedule events are best effort and can be delayed or dropped. Before changing or reporting the target time, read the target repository's `.github/workflows/day-plan-notify.yml` because this value is operational configuration.

The comment marker is date-only: `<!-- daybook-briefing:YYYY-MM-DD -->`. The posting script also recognizes previous date-only and date-plus-slot markers, so migrating an existing Issue does not create another comment for a date that was already posted. A scheduled retry and a manual non-dry-run for the same target date are skipped when a Bot comment for that date exists. Dry-runs never post.

## Bundled runnable files

For an explicit request to create or update this workflow, use [assets/daybook](../assets/daybook/) as the source bundle and copy its structure into the target repository root:

- `.github/workflows/day-plan-notify.yml`
- `scripts/day-plan.mjs`
- `scripts/generate-day-plan.mjs`
- `scripts/post-day-plan.mjs`
- `scripts/day-plan.test.mjs`
- `scripts/post-day-plan.test.mjs`
- `package.json` and `package-lock.json`

The bundle is self-contained. It does not require the source daybook repository or a network-fetched script at runtime. Preserve an existing target repository's package scripts and dependencies when integrating it. Set `DAYBOOK_ISSUE_NUMBER` and `DAYBOOK_NOTIFY_ENABLED` as repository variables; optionally set `DAYBOOK_MENTION` for the target account, whose default is `@igapyon`. Do not copy the source repository's Issue number or account-specific values without checking the target.

## Configuration

Read the target repository's workflow and README to find the current fixed Issue. The existing configuration uses repository variables named `DAYBOOK_ISSUE_NUMBER` and `DAYBOOK_NOTIFY_ENABLED`. Do not copy an Issue number, account name, or notification target into another daybook without checking its configuration.

For a scheduled notification to post, confirm:

1. the workflow exists on the default branch;
2. Actions is enabled and the workflow is active;
3. `DAYBOOK_NOTIFY_ENABLED` is `true`;
4. `DAYBOOK_ISSUE_NUMBER` identifies an open Issue, not a pull request;
5. the workflow has `issues: write` permission;
6. the scheduled run reaches the post step.

## Troubleshooting order

Separate three outcomes:

1. **No run**: inspect the Actions run history and the default branch. GitHub schedule events use UTC, are best effort, and can be delayed or dropped during load. A cron at minute 00 can be especially vulnerable to congestion; choose a different minute only when the user accepts an approximate delivery time.
2. **Run but no Issue comment**: inspect the gate, generated artifact, Issue number, permissions, and post step. A successful dry-run intentionally does not post.
3. **Issue comment but no email**: inspect the comment for the `@igapyon` mention and date marker, then inspect GitHub notification settings, repository subscription, and mail filters. Comment success and email delivery are separate checks.

For a manual validation, run the workflow with a target date and `dry_run: true` first. Use `dry_run: false` only when the user explicitly asks to post. Record the run URL, conclusion, artifact or comment URL, and email result separately.

## Boundaries

Do not edit task or schedule files merely because an email was missing. Do not create a replacement Issue automatically. Do not claim that a notification arrived from a successful Actions run without user-side confirmation. GitHub API writes and GitHub workflow dispatch require an explicit user request; read-only diagnosis is safe to perform when relevant.
