# Daybook notification workflow

Read this reference only for GitHub Actions, Daily Briefing Issue, or notification email work. The daybook repository's README and workflow are authoritative because schedules and Issue numbers can change.

## Current design

The daybook workflow generates a day-plan mechanically and posts it to a fixed GitHub Issue with an `@igapyon` mention. It uses `GITHUB_TOKEN`, `contents: read`, and `issues: write`. It does not call a generative AI API. The generated Markdown is an artifact; task and schedule files remain the source of truth.

As of the current daybook configuration, the schedule is 06:00, 12:00, and 18:00 Asia/Tokyo. The UTC cron values are `0 21 * * *`, `0 3 * * *`, and `0 9 * * *`. Before changing or reporting these times, read `.github/workflows/day-plan-notify.yml` because this value is operational configuration, not a permanent skill constant.

The workflow passes the scheduled cron expression as the execution slot. The comment marker includes date and slot, so the three runs on one day can each post once while a retry of the same slot is skipped. Manual runs use the `manual` slot.

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
3. **Issue comment but no email**: inspect the comment for the `@igapyon` mention and date/slot marker, then inspect GitHub notification settings, repository subscription, and mail filters. Comment success and email delivery are separate checks.

For a manual validation, run the workflow with a target date and `dry_run: true` first. Use `dry_run: false` only when the user explicitly asks to post. Record the run URL, conclusion, artifact or comment URL, and email result separately.

## Boundaries

Do not edit task or schedule files merely because an email was missing. Do not create a replacement Issue automatically. Do not claim that a notification arrived from a successful Actions run without user-side confirmation. GitHub API writes and GitHub workflow dispatch require an explicit user request; read-only diagnosis is safe to perform when relevant.
