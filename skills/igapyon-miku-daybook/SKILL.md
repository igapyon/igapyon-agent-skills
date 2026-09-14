---
name: igapyon-miku-daybook
description: Use for managing an igapyon daybook repository's activity, schedule, task, and day-plan records when the user names this skill or clearly asks to manage that daybook. Do not use for generic TODO lists, public diary writing, or Git operations unless the request is explicitly about the daybook.
---

# igapyon-miku-daybook

Manage the Markdown records in a daybook repository. The records are the source of truth; generated day-plans and GitHub notifications are derived views.

## Activation and boundaries

Use this skill when the user says `igapyon-miku-daybook`, `miku-daybook`, or clearly asks to add, update, list, or summarize records in the daybook repository. Do not activate for a generic TODO request, an igapyon diary entry, or a question about this skill itself.

This skill edits the daybook records and local documentation. It does not automatically commit, push, create pull requests, post Issue comments, send email, or synchronize Issues with tasks. Apply `igapyon-miku-scm` only when the user explicitly requests a Git or GitHub operation.

## Required first checks

1. Read [index.json](index.json) first to discover the bundled references.
2. Identify the target daybook repository from the current working directory or the user's path. Do not assume a fixed absolute path.
3. Read the target repository's `README.md` and current Git status. Preserve unrelated user changes.
4. Read only the reference needed for the current operation:
   - [records.md](references/records.md) for schemas, paths, IDs, and dates.
   - [operations.md](references/operations.md) for add, update, list, activity, schedule, and day-plan workflows.
   - [notification.md](references/notification.md) for GitHub Actions, Issue comments, or email notification troubleshooting.

## Core workflow

Classify the request before editing: task, schedule, activity, task list, day-plan, notification, or explanation. Resolve an existing record by its full ID/path/title before creating a new one. When a request is ambiguous, use the available date, month, title, and links to narrow it; do not create a duplicate silently.

For a concrete task request, create or update a `tasks/task-YYYYMM-NNNNN-name.md` record even when the user says “TODO”. Keep a vague idea in `TODO.md` only when it is genuinely not actionable. For a task list, show `ID / Status / Start / Due / Title`; map Start to `planned_date`, Due to `due` or `due_month`, and use `—` when absent.

For a report of work already done, update the activity file for the Asia/Tokyo date. Keep one coherent event in one activity item when the place, activity, and instrument or other details describe the same event. Do not infer task completion from an activity report.

For day-plan generation, use the target repository's existing `scripts/generate-day-plan.mjs` and its documented output location. The current rule is a target date plus six days, with active tasks, planned actions, due dates, schedules, and overlapping planned weeks selected mechanically. Do not reimplement this selection in the skill or overwrite a hand-written day-plan without an explicit request.

## After editing

Validate front matter, ID and filename agreement, dates, status checkboxes, and relative links. Keep source email or event URLs when supplied. Record uncertain information in the Markdown instead of guessing. Run `git diff --check` and report changed files and any remaining ambiguity. Do not commit or push unless explicitly requested.
