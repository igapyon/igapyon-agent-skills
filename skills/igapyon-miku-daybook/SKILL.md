---
name: igapyon-miku-daybook
description: Use for managing an igapyon daybook repository's activity, schedule, task, and day-plan records, or for generating and updating its bundled GitHub Actions notification workflow. Do not use for generic TODO lists, public diary writing, or unrelated Git operations.
---

# igapyon-miku-daybook

Manage the Markdown records in a daybook repository. The records are the source of truth; generated day-plans and GitHub notifications are derived views.

## Activation and boundaries

Use this skill when the user says `igapyon-miku-daybook`, `miku-daybook`, or clearly asks to add, update, list, or summarize records in the daybook repository. Also use it when the user explicitly asks to generate or update the daybook GitHub Actions notification workflow. Do not activate for a generic TODO request, an igapyon diary entry, or a question about this skill itself.

This skill edits daybook records, local documentation, and an explicitly requested notification workflow. It does not automatically commit, push, create pull requests, dispatch workflows, post Issue comments, send email, or synchronize Issues with tasks. Apply `igapyon-miku-scm` only when the user explicitly requests a Git or GitHub operation.

Weekly recurrence handling is invocation-driven: during any record-writing request, maintain every active weekly task whose `next_occurrence` is today or overdue, following [operations.md](references/operations.md). The skill does not run in the background. Keep read-only task lists and explanations non-mutating. Day-plan generation may write or overwrite its generated snapshot, but must not modify source task or schedule records.

## Required first checks

1. Read [index.json](index.json) first to discover the bundled references.
2. Identify the target daybook repository from the current working directory or the user's path. Do not assume a fixed absolute path.
3. Read the target repository's `README.md` and current Git status. Preserve unrelated user changes.
4. Read only the reference needed for the current operation:
   - [records.md](references/records.md) for schemas, paths, IDs, and dates.
   - [operations.md](references/operations.md) for add, update, list, activity, schedule, and day-plan workflows.
   - [notification.md](references/notification.md) for GitHub Actions workflow generation, Issue comments, or email notification troubleshooting.

## Core workflow

Classify the request before editing: task, schedule, activity, task list, day-plan, notification, or explanation. Resolve an existing record by its full ID/path/title before creating a new one. When a request is ambiguous, use the available date, month, title, and links to narrow it; do not create a duplicate silently.

For a concrete task request, create or update a `tasks/task-YYYYMM-NNNNN-name.md` record even when the user says “TODO”. Keep a vague idea in `TODO.md` only when it is genuinely not actionable. Include `priority` in every new task's front matter as an integer from 1 (highest) to 9 (lowest); use 5 when unspecified and do not infer it from the due date. Treat an omitted value in an existing task as 5. When a task becomes `done` or `cancelled`, update its status in place and keep the file in its creation-month directory; do not move it to an archive or closed folder. For a task list, show `ID / Priority / Status / Start / Due / Title` and sort by ascending priority, deadline, planned date, then full ID; missing dates go last. Map Priority to `priority` or 5 when absent, Start to `planned_date`, and Due to `due` or `due_month`; use `—` for absent dates. Add a `Next` value for weekly tasks from `next_occurrence`; do not overload Start with the next recurrence date or use it as a sort key.

For an explicitly weekly recurring task, keep one active task as the recurring rule and create one dated schedule record per occurrence. Mark it with `recurrence: weekly` and store its upcoming date in `next_occurrence`; keep `planned_date` for its usual start-date meaning. Read [records.md](references/records.md) and [operations.md](references/operations.md) for the record and rollover rules.

For schedules, use `status: scheduled` or `status: cancelled`. Keep cancellation separate from the user's participation decision; cancelled events stay in the source records but are omitted from generated day-plans. Read [records.md](references/records.md) for legacy handling.

For a report of work already done, update the activity file for the Asia/Tokyo date. Keep one coherent event in one activity item when the place, activity, and instrument or other details describe the same event. Do not infer task completion from an activity report.

For supplied files intended as supporting material, store them under `YYYY/YYYYMM/attachments/<record-key>/` in the primary record's month and link them relatively from the record. Use a task ID or schedule/activity filename stem as the key. Keep one copy of a shared file and do not copy attachments into generated day-plans.

For day-plan generation, use the target repository's existing `scripts/generate-day-plan.mjs` with its default output root so the file is written to the canonical `YYYY/YYYYMM/day-plan/day-plan-YYYYMMDD.md` path under the target repository root. Use today's Asia/Tokyo date unless the user specifies another date. Set `--output-root` only when a separate staging directory is explicitly needed. The current rule is a target date plus six days, with active tasks, overdue and upcoming due dates, planned actions, scheduled events, and overlapping planned weeks selected mechanically. Display task priorities; sort today's tasks by priority, and sort dated task sections by date then priority, using full task ID as the final tie-breaker. Priority affects ordering only, not task selection. Regeneration overwrites the existing day-plan for that date; treat it as a generated snapshot and do not edit it as a source record. Do not reimplement this selection in the skill.

For an explicit notification workflow generation or update, read `references/notification.md`, copy or update the complete runnable bundle under [assets/daybook](assets/daybook/), and adapt repository-specific values after inspecting the target repository. The bundle includes the workflow, day-plan generation and posting scripts, their shared module, package files, and tests. Do not create a YAML-only workflow that refers to scripts absent from the target repository.

## After editing

Validate front matter, ID and filename agreement, required priority on newly created tasks and any present priority values (`1`–`9`), dates, status checkboxes, and relative links. Keep source email or event URLs when supplied. Record uncertain information in the Markdown instead of guessing. Run `git diff --check` and report changed files and any remaining ambiguity. Do not commit or push unless explicitly requested.
