# Project Context

## 目的

このリポジトリは、個人用の Agent Skills を小さく焦点の定まった単位として管理します。

## 上位目標

- 各 skill を専用ディレクトリごとに分離して保つ
- `.claude/skills/` を正本として扱う
- `.github/skills/` を mirror として生成する
- 必要になったときだけ mirror の同期先を増やす
- 利用者固有の文体ガイダンスを各 skill 内に保持する

## 技術スタック

- skill 定義と reference 用の Markdown
- 同期ツール用の Node.js
- npm script: `npm run sync-skills`

## 制約

- skill の編集は `.claude/skills/` 配下でのみ行う
- `.github/skills/` を手で直接編集しない
- `.codex/skills/` は方針上は optional mirror だが、現時点では未実装として扱う
- リポジトリ共通ルールは `AGENTS.md` に置く
- skill 固有の詳細は各 `SKILL.md` と `references/` に置く

## 開発方針

- 小さく組み合わせやすい skill を優先する
- `SKILL.md` は焦点を絞って軽量に保つ
- 詳細なガイダンスは `references/` に移す
- 生成 mirror は手管理せず同期で更新する
