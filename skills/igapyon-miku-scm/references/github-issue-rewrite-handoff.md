# GitHub Issue Draft and Rewrite Handoff

Draft a new public GitHub Issue or retrieve and rewrite an existing Issue, then return paste-ready text. Drafting remains READONLY against GitHub. A reviewed new-Issue draft may proceed separately through [github-issue-create.md](github-issue-create.md), and a reviewed existing-Issue title/body/existing-label update may proceed through [github-issue-update.md](github-issue-update.md).

The AI Agent must not invoke `gh` directly during drafting or handoff. Invoke only documented static helpers under [github-cli-static-helper-policy.md](github-cli-static-helper-policy.md).

## Workflow

1. Resolve the exact target repository and whether the request is for a new Issue, an update to an existing Issue, or a comment. For an exact `miku-scm issue create`, `update`, or `comment` request, use operation-aware `writing.issue.prepare`; an explicit `owner/repository` wins, otherwise its fixed GitHub-origin resolution is authoritative.
2. For an existing Issue, resolve its number, then use `node skills/igapyon-miku-scm/scripts/github-issue-read.mjs --repo <owner>/<repo> --issue <number>` to retrieve the current Issue and comments. If the helper reports that the Issue cannot be read, stop and report the READONLY failure; do not fall back to anonymous REST.
3. For a new Issue, use the user's direction and inspected repository evidence. Do not imply that an Issue number or GitHub URL already exists. Retrieve the target repository's existing labels with `node skills/igapyon-miku-scm/scripts/github-issue-read.mjs --repo <owner>/<repo> --labels` and select each label clearly supported by the evidence and established repository semantics. When the user requests a sub-Issue, resolve exactly one same-repository parent Issue and treat its number as reviewed registration metadata outside the draft body.
4. Preserve the Issue's intent, constraints, and established terminology. For an existing Issue, incorporate relevant clarification from comments.
5. Draft or rewrite the title and body so the purpose, background, scope, and completion conditions are clear when those sections are supported by the evidence or the user's direction.
6. Distinguish new proposals or inferences from confirmed facts. Do not invent decisions, dependencies, or acceptance criteria and present them as already agreed.
7. Save the draft only at the operation-specific `suggested_draft_path` returned by the fixed writing workflow.
8. For an exact miku-scm Issue operation, immediately invoke the returned fixed mechanical preflight in the same user turn and return its Miku Approval Handoff for review. For a writing-only request, return the draft and proposed existing labels for human transfer. If the user corrects the intent, revise the draft and save a new file rather than defending or silently overwriting the first draft.

Do not omit labels by default when an existing label clearly applies. Prefer the repository's exact established label, such as `bug` for a defect or `enhancement` for a new or improved capability, only when the Issue evidence supports that meaning. When multiple classifications are plausible or the repository's label semantics are unclear, show the candidates and ask the human instead of guessing. Labels and an optional parent Issue number are reviewed registration metadata and remain outside the paste-ready draft file.

## Local Draft Save Rules

Keep Issue writing artifacts separate from the anonymous Issue cache. Separate planned new Issues from existing-Issue update drafts:

```text
workplace/miku-scm/
  new-issues/
  created-issues/
  issue-attempts/
  issue-updates/
  issue-update-attempts/
  issue-comments/
  issue-comment-attempts/
  issue-label-attempts/
  issue-close-attempts/
```

Save new-Issue drafts under `new-issues/`, existing-Issue update drafts under `issue-updates/`, and comment drafts under `issue-comments/`. The dedicated helpers own `created-issues/` and every `*-attempts/` directory. Do not write those records manually. Do not save writing artifacts under `workplace/miku-scm/github-cache/`. Treat all of these directories as local operational data and do not stage or commit their contents.

Resolve the repository root with `git rev-parse --show-toplevel`. If that fails, use the current project-equivalent directory. Create the draft directory when needed.

Use `Asia/Tokyo` (JST), independent of the host operating system timezone, and
these lowercase paths:

- new Issue: `workplace/miku-scm/new-issues/issue-new-<YYYYMMDDHHMM>.md`
- existing Issue update: `workplace/miku-scm/issue-updates/issue-<number>-update-<YYYYMMDDHHMM>.md`
- Issue comment: `workplace/miku-scm/issue-comments/issue-<number>-comment-<YYYYMMDDHHMM>.md`

Do not overwrite an existing draft. When a path already exists, add a numeric suffix such as `-2`.

Save only the paste-ready content:

```text
<title text>

<body Markdown>
```

The first line is the proposed title without a heading marker or label. Everything after the first blank line is the proposed Issue body. Do not include conversational notes, absolute paths, the Issue URL, or an outer Markdown fence in the saved file. Report the saved path relative to the repository root.

The filename timestamp records when the local draft was saved. It does not define the GitHub Issue creation time. After successful registration, GitHub is the source of truth for the Issue, including its number, URL, body, state, and creation timestamp. The creation workflow moves the unchanged reviewed draft from `new-issues/` to `created-issues/<owner>/<repo>/` only as a local lifecycle marker. Do not rewrite it to mirror later GitHub state.

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
- `ラベル案` using exact existing repository label names, or an explicit note that no label is sufficiently supported
- `親Issue案` using one exact same-repository Issue number when a sub-Issue is requested, or omit it
- the saved draft path
- a short note identifying any material assumption or newly proposed detail

Keep the draft ready to paste and save it according to Local Draft Save Rules unless the user explicitly asks not to save it.

## Human Handoff and Registration Boundary

End after returning the drafted text and saved path unless the user explicitly requests a documented miku-scm Issue operation. Such a request authorizes same-turn preparation through the matching preflight and Miku Approval Handoff only. For new-Issue registration, content update, comment, standalone existing-label update, or closure, follow the matching dedicated workflow. Drafting and preflight never authorize remote mutation; only the later exact approval command authorizes apply.

Do not:

- create an Issue except through the separately approved `gh issue create` workflow
- update an existing Issue title or body except through the separately approved content-update workflow
- request authentication or credentials
- add comments except through [github-issue-comment.md](github-issue-comment.md)
- change existing-Issue labels except through [github-issue-label-update.md](github-issue-label-update.md)
- change Issue state except for closure through [github-issue-close.md](github-issue-close.md)
- add assignees or milestones
- add labels except as reviewed new-Issue registration metadata under [github-issue-create.md](github-issue-create.md) or an existing-Issue label update under [github-issue-label-update.md](github-issue-label-update.md)
- create a parent/sub-Issue relationship except as reviewed optional `--parent` metadata during new-Issue registration under [github-issue-create.md](github-issue-create.md)
- imply that the Issue was created or updated

This Issue drafting and handoff workflow belongs to `igapyon-miku-scm`. Use this skill's integrated GitHub writing references for PR, Release, About, and PR-derived commit-message work.
