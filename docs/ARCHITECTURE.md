# Architecture

## システム概要

このリポジトリは、source skill、生成された mirror、それらを同期する小さなツールを管理します。

## 主要コンポーネント

### `.claude/skills/`

skill の正本です。

- `igapyon-tech-post-coach`
- `igapyon-music-post-coach`

各 skill には次のようなファイルがあります:

- `SKILL.md`
- `references/style-guide.md`
- `references/structure-patterns.md`

### `.github/skills/`

GitHub 向けに `.claude/skills/` を mirror した生成物です。

現時点では、この mirror だけが同期対象として実装されています。

### `tools/sync-skills.mjs`

次の処理を行う同期スクリプトです:

- `.claude/skills/` ディレクトリの存在を確認する
- source 配下の直下ディレクトリを skill 一覧として収集する
- 各 source skill に `SKILL.md` があることを検証する
- skill が 0 件なら同期せず終了する
- 対象 mirror ディレクトリを削除して再作成する
- `.claude/skills/` から `.github/skills/` へ skill ディレクトリをコピーする

### リポジトリレベルのドキュメント

- `README.md`: リポジトリの概要
- `AGENTS.md`: リポジトリ運用ルール
- `docs/*`: 永続的な LLM 作業メモ

## 関係

`.claude/skills/*` -> source of truth  
`tools/sync-skills.mjs` -> sync mechanism  
`.github/skills/*` -> generated mirror

`.codex/skills/*` -> 現時点では未同期、将来拡張候補

## 外部依存

- Node.js ランタイム
- `sync-skills` 実行用の npm
