# Three Markdown State Files

Use this reference when setting up or resuming lightweight AI agent state management in a repository.

## Purpose

The goal is to externalize the minimum state needed for an AI agent and a human to resume work without relying only on conversation history.

This workflow has two closely related uses:

- Setup: create or align `GOAL.md`, `TODO.md`, and `DECISIONS.md`.
- Resume: read existing repository state and any available state files to recover the current objective, next tasks, blockers, and decisions.

The default files are:

- `GOAL.md`: what the work is trying to accomplish and how to know when it is done
- `TODO.md`: the current working state, next tasks, blockers, and repeated failures
- `DECISIONS.md`: important decisions, rejected options, and the reasons behind them

This is a Context Engineering convention, not a product-specific config format. The front matter is a readable hint for agents and humans; it is not assumed to be interpreted by any tool automatically.

## Initial User Prompt

Use or adapt this prompt when the user asks to initialize the convention:

````markdown
このリポジトリに、AI エージェント作業用の状態管理ファイルを3つ作成してください。

- `GOAL.md`
- `TODO.md`
- `DECISIONS.md`

ただし、同名ファイルがすでに存在する場合は、上書きしないでください。
既存の `TODO.md` が人間用TODOやプロジェクト運用ファイルとして使われている場合は、新しいTODOファイルを増やさず、既存 `TODO.md` の中に `## AI Agent Current Tasks` セクションを追加して、AI エージェント用の現在地をそこへ記録してください。

新規作成するファイルには、AI エージェントが後から読んだときに用途が分かるよう、front matter と短い運用ヒントを入れてください。
すでに同名ファイルが存在する場合は、上書きせず、内容を確認してから差分提案にしてください。
既存 `TODO.md` に `## AI Agent Current Tasks` セクションを追加する場合は、既存ファイルの形式を尊重し、無理に front matter を追加しないでください。
`((TBD: ...))` はプレースホルダーです。実際の作業内容が分かる場合は、作成時に具体的な内容へ置き換えてください。分からない場合は、TBD のまま残し、作業開始時に確認してください。
````

## Resume Prompt

Use or adapt this prompt when the user says `igapyon 作業再開` or otherwise explicitly asks to resume through this state-management workflow:

```markdown
このリポジトリの AI エージェント作業状態を確認して、作業再開ポイントを整理してください。

まず `git status --short`、`README.md`、既存の `TODO.md` を確認してください。
`GOAL.md`、`DECISIONS.md` が存在する場合はそれも読んでください。

新しい `GOAL.md`、`TODO.md`、`DECISIONS.md` は、まだ作成しないでください。
既存状態から、現在の目的、次にやること、blocker、重要な判断、確認が必要な点を短くまとめてください。
```

## Existing TODO.md Section

When an existing `TODO.md` should be preserved, add only this section if it is missing:

```markdown
## AI Agent Current Tasks

This section tracks the current working state for AI agents.
Update this section while working. Do not rewrite unrelated TODO items.

### Tasks

- [ ] ((TBD: 最初の作業項目を書く))
- [ ] ((TBD: 必要なら追加する))

### Blockers

- ((TBD: なければ「なし」と書く))

### Retry Log

Use this section only when the same task or error is repeated.
If the same failure appears 3 times, stop and ask the user.

- ((TBD: YYYY-MM-DD / task / failure / changed approach))
```

## Operating Rules

- Keep `GOAL.md` focused on objective, done conditions, and stop conditions.
- Keep `TODO.md` focused on current state, not full history.
- Keep `DECISIONS.md` focused on important decisions and their reasons, not every thought or command.
- Use `Retry Log` only when the same task or error repeats.
- If the same failure appears three times for the same underlying cause, stop and ask the user.
- Prefer updating existing compatible sections over adding duplicate sections.
- If a tool-specific entry file exists, such as `AGENTS.md` or `CLAUDE.md`, optionally add a short pointer such as: `Before working, check GOAL.md, TODO.md, and DECISIONS.md.`

## Creation Templates

Use the files under `templates/` as the source templates:

- `templates/GOAL.md`
- `templates/TODO.md`
- `templates/DECISIONS.md`
