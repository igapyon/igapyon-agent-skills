# GitHub Issue Draft and Rewrite Handoff

Draft a new public GitHub Issue or retrieve and rewrite an existing Issue, then return text for a human to paste into GitHub. Keep the entire workflow READONLY against GitHub.

## Workflow

1. Resolve the exact target repository and whether the request is for a new Issue or an update to an existing Issue.
2. For an existing Issue, resolve its number, retrieve the current Issue and comments with anonymous REST API `GET` requests, and reject an item containing a `pull_request` field.
3. For a new Issue, use the user's direction and inspected repository evidence. Do not imply that an Issue number or GitHub URL already exists.
4. Preserve the Issue's intent, constraints, and established terminology. For an existing Issue, incorporate relevant clarification from comments.
5. Draft or rewrite the title and body so the purpose, background, scope, and completion conditions are clear when those sections are supported by the evidence or the user's direction.
6. Distinguish new proposals or inferences from confirmed facts. Do not invent decisions, dependencies, or acceptance criteria and present them as already agreed.
7. Save the draft under the repository according to Local Draft Save Rules.
8. Return the draft to the user for human transfer. If the user corrects the intent, revise the draft and save a new file rather than defending or silently overwriting the first draft.

## Local Draft Save Rules

Keep Issue writing artifacts separate from the anonymous Issue cache. Save every new-Issue draft and existing-Issue update draft under:

```text
workplace/miku-scm/issue-drafts/
```

Do not save drafts under `workplace/miku-scm/github-cache/`. Treat both directories as local operational data and do not stage or commit their contents.

Resolve the repository root with `git rev-parse --show-toplevel`. If that fails, use the current project-equivalent directory. Create the draft directory when needed.

Use local time and these lowercase filenames:

- new Issue: `issue-new-<YYYYMMDDHHMM>.md`
- existing Issue update: `issue-<number>-update-<YYYYMMDDHHMM>.md`

Do not overwrite an existing draft. When a path already exists, add a numeric suffix such as `-2`.

Save only the paste-ready content:

```text
<title text>

<body Markdown>
```

The first line is the proposed title without a heading marker or label. Everything after the first blank line is the proposed Issue body. Do not include conversational notes, absolute paths, the Issue URL, or an outer Markdown fence in the saved file. Report the saved path relative to the repository root.

## Output

For each existing Issue, provide:

- the Issue number and link
- `タイトル案`
- `本文案` as copyable Markdown
- the saved draft path
- a short note identifying any material assumption or newly proposed detail

For a new Issue, provide:

- the target repository
- `タイトル案`
- `本文案` as copyable Markdown
- the saved draft path
- a short note identifying any material assumption or newly proposed detail

Keep the draft ready to paste and save it according to Local Draft Save Rules unless the user explicitly asks not to save it.

## Human Handoff Boundary

End after returning the drafted text and saved path. The human opens GitHub and performs the Issue creation or update.

Do not:

- create or update the Issue through an API, browser, `gh`, or another tool
- request authentication or credentials
- add comments, labels, assignees, milestones, or state changes
- imply that the Issue was created or updated

This human-paste Issue workflow belongs to `igapyon-miku-scm`. Use this skill's integrated GitHub writing references for PR, Release, About, and PR-derived commit-message work.
