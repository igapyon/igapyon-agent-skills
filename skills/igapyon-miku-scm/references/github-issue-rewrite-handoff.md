# GitHub Issue Rewrite Handoff

Retrieve public GitHub Issues, rewrite their title and body, and return text for a human to paste into GitHub. Keep the entire workflow READONLY against GitHub.

## Workflow

1. Resolve the exact public repository and Issue number. When the user requests multiple Issues, resolve each number before drafting.
2. Retrieve the current Issue and its comments with anonymous REST API `GET` requests according to the anonymous READONLY workflow.
3. Reject an item containing a `pull_request` field as a Pull Request rather than an Issue.
4. Preserve the Issue's intent, constraints, and established terminology. Incorporate relevant clarification from comments.
5. Rewrite the title and body so the purpose, background, scope, and completion conditions are clear when those sections are supported by the source or the user's direction.
6. Distinguish new proposals or inferences from confirmed facts. Do not invent decisions, dependencies, or acceptance criteria and present them as already agreed.
7. Return the draft to the user for human transfer. If the user corrects the intent, revise the draft rather than defending the first interpretation.

## Output

For each Issue, provide:

- the Issue number and link
- `タイトル案`
- `本文案` as copyable Markdown
- a short note identifying any material assumption or newly proposed detail

Keep the draft ready to paste. Do not save it to a local file unless the user asks.

## Human Handoff Boundary

End after returning the rewritten text. The human opens the GitHub Issue and performs the update.

Do not:

- update the Issue through an API, browser, `gh`, or another tool
- request authentication or credentials
- add comments, labels, assignees, milestones, or state changes
- imply that the Issue was updated

This human-paste Issue workflow belongs to `igapyon-miku-scm`. Continue to delegate PR, Release, About, and commit-message writing to `igapyon-github-writer` only when that skill is explicitly requested.
