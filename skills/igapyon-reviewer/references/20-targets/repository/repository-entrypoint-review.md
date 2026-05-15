# Repository Entrypoint Review

Use this reference to review whether a repository is understandable from the
outside, especially for general users who are not maintainers or contributors.

This review focuses on README presence, README audience, `TODO.md` maintenance,
Markdown freshness, top-level file placement, documentation structure, and
whether the repository's first impression explains how to use the project
before explaining how to develop it.

## Review Priority

Use this review when reviewing a repository, project directory, README, GitHub
repository page, release bundle, or documentation structure.

This review is separate from code quality. A repository can have good code but
still have a weak public entrypoint.

## Core Checks

Check these first:

- a root `README.md` exists
- the root `README.md` starts from the general user's viewpoint
- the first screen explains what the project is and what it is for
- the README identifies the primary artifact or primary usage path
- setup and usage appear before contributor-only development details
- development notes, internal workflow, maintenance rules, and implementation
  history do not dominate the public entrypoint
- examples are copy-pasteable or concrete enough for first-time users
- supported inputs, outputs, commands, files, or workflows are visible
- requirements and prerequisites are stated before commands that depend on them
- limitations, non-goals, and safety notes are visible when they affect use
- `TODO.md` exists when the repository has ongoing work, open review items, or
  maintenance notes that should not be scattered across chats or local memory
- `TODO.md` is maintained enough to distinguish active tasks from completed,
  obsolete, or parked items
- other Markdown files are kept aligned with implementation, command,
  configuration, workflow, release, and artifact changes

## README Audience Checks

Flag README issues when:

- the README assumes the reader is already a developer on the project
- the first useful instruction is a build, test, or release command
- internal architecture appears before product purpose and user workflow
- contributor setup is mixed into basic user usage
- local repository rules are presented as if they are product usage
- the README names technologies but not the user-visible value
- the README explains how the project was made before explaining what it does
- examples require unstated local files, unpublished artifacts, or maintainer
  knowledge

Prefer README ordering like this when it fits the project:

1. What this project is.
2. Who it is for.
3. What it can do.
4. How to use the primary artifact.
5. Minimal examples.
6. Requirements and supported environments.
7. Output, files, or artifact roles.
8. Limitations and known constraints.
9. Development, testing, release, and contribution notes.

## File and Directory Structure Checks

Review whether the top-level layout separates user-facing entrypoints from
developer-only material:

- root `README.md` for public entrypoint
- `docs/` or equivalent for longer user documentation
- `examples/` for runnable or inspectable examples
- `src/`, `test/`, `scripts/`, `.github/`, and build files for development
- `CONTRIBUTING.md` for contributor workflow when needed
- `CONTRIBUTORS.md` for visible acknowledgements when external contributions,
  feedback, or improvement suggestions exist
- `THIRD_PARTY_NOTICES.md` or equivalent notice file when third-party software,
  reference materials, or bundled assets need attribution or license notices
- `CHANGELOG.md` or release notes when version history matters
- `TODO.md` for active local planning, review follow-ups, maintenance notes, or
  deferred work when the repository uses a repo-level task ledger
- `LICENSE` and notices when distribution or reuse is expected

Flag structure issues when:

- generated artifacts, temporary files, local work folders, or logs are visible
  as if they are source material
- important runtime artifacts are buried without README guidance
- user documentation is scattered across many files with no index
- developer scripts are easier to find than the actual user entrypoint
- examples are present but not referenced from README
- release artifacts, packages, or installable bundles are not named clearly
- docs contain overlapping or contradictory instructions
- contributor, third-party notice, or acknowledgement files exist but are not
  discoverable from README, CONTRIBUTING, release docs, or repository metadata
- active tasks are scattered across README, comments, chats, temporary files, or
  local notes instead of a maintained `TODO.md`
- Markdown documents describe old commands, old file names, old output shapes,
  old package names, old configuration keys, or removed workflows

## TODO Maintenance Checks

Check whether `TODO.md` is present and useful when the repository has ongoing
work:

- active tasks are written in concrete, reviewable terms
- completed tasks are removed, marked done, or moved out of the active list
- obsolete ideas are deleted or explicitly parked
- tasks identify the affected area, file, feature, or release when practical
- high-priority or blocking items are easy to distinguish from optional ideas
- review findings that are not fixed immediately are captured
- `TODO.md` does not duplicate detailed issue tracker content without adding
  local value
- `TODO.md` does not become a permanent dumping ground for stale notes

Flag TODO issues when:

- `TODO.md` is missing even though the repository clearly has active local
  planning or review follow-ups
- `TODO.md` exists but is stale, vague, or mostly completed work
- important unfinished work is mentioned in README or comments but not tracked
  in the task ledger
- tasks are too broad to act on, such as "improve docs" without scope
- old temporary decisions remain without date, status, owner, or next action

Do not require `TODO.md` for every repository. If the project uses GitHub
Issues, Linear, or another tracker as the clear source of truth, review whether
the README or contribution docs point there instead.

## Markdown Freshness Checks

Check whether Markdown documents outside the root README are still synchronized
with the current implementation and repository shape.

Review files such as:

- `docs/**/*.md`
- `references/**/*.md`
- `CONTRIBUTING.md`
- `CHANGELOG.md`
- `THIRD_PARTY_NOTICES.md`
- release, design, architecture, usage, and troubleshooting notes
- skill references or agent workflow documents

Look for drift between Markdown and the implementation:

- documented commands no longer exist or have changed options
- examples call old scripts, old package names, old class names, old CLI names,
  or old file paths
- documented input, output, JSON, Markdown, archive, or artifact shapes no
  longer match the code
- README and deeper docs contradict each other
- release or install instructions mention old versions, old artifact names, or
  old packaging behavior
- design notes describe planned behavior as if it were implemented
- old limitations remain after the implementation changed
- new features, warnings, failure modes, or constraints are implemented but not
  reflected in docs
- generated docs or indexes are stale compared with source references
- screenshots, sample outputs, or code blocks no longer match current behavior

Flag Markdown freshness issues when:

- a user following the document would run the wrong command or inspect the wrong
  file
- an integrator or agent would infer the wrong contract from stale docs
- a maintainer would preserve old behavior because the design note was not
  updated after implementation changed
- important docs cannot be trusted without reading source code first

Do not require every historical design note to be rewritten. If a document is
clearly marked as historical, archived, or superseded, review whether that
status is visible enough.

## General User vs Developer Distinction

For public repositories, distinguish these audiences:

- General user: wants to understand, install, run, configure, or inspect output.
- Integrator or agent: wants stable CLI, API, MCP, file, or artifact contracts.
- Contributor: wants to build, test, modify, release, or maintain the project.

The README may serve all three, but it should not make contributor knowledge a
prerequisite for general use.

## Severity Guidance

Use these severity levels:

- High: no root README, or README does not explain what the project is or how a
  general user can use the primary artifact.
- Medium: README exists but is developer-first, hides the primary user path, or
  mixes internal maintenance details into basic usage.
- Medium: important files, examples, runtime artifacts, or docs are present but
  not discoverable from README.
- Medium: active review findings or maintenance tasks are not captured in
  `TODO.md` or another clearly identified task tracker.
- Medium: Markdown documents contain stale commands, paths, artifact names, or
  behavioral descriptions that can mislead users, integrators, agents, or
  maintainers.
- Medium: implementation changes introduced new user-visible behavior but the
  relevant Markdown was not updated.
- Low: `TODO.md` exists but contains stale, vague, duplicated, or completed
  items that make current work harder to scan.
- Low: minor Markdown drift or historical notes are not clearly labeled, but
  the primary user path remains understandable.
- Low: ordering, naming, or structure makes the repository slightly harder to
  scan but does not block understanding.

For private or internal repositories, reduce severity when the repository is
clearly not meant for general users. Still report when the requested review is
about public readiness.

## Review Output

Use this format when the repository entrypoint is in scope:

```text
Repository Entrypoint Review

Audience fit: general-user-first / developer-first / unclear
README: present / missing / insufficient
TODO: maintained / missing / stale / not applicable
Markdown freshness: current / stale / mixed / not checked

Findings:
- Severity: ...
  Issue: ...
  Why it matters: ...
  Suggested direction: ...
```

When no material issue is found, say so briefly and mention any residual risk:

```text
Repository Entrypoint Review

No major README or public entrypoint issues found. Remaining risk: ...
```

Do not rewrite the README unless the user asks for revision. In review mode,
point out missing sections, audience mismatch, and structure problems with
targeted suggestions.
