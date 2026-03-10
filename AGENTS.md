# AGENTS.md

このリポジトリは、個人用の Agent Skills をまとめて管理するためのものです。  
各 skill の詳細仕様は、それぞれのディレクトリ配下にある `SKILL.md` に記述してください。

## このリポジトリの役割

- 個人用の複数 skill をまとめて管理する
- skill ごとの詳細は各 `SKILL.md` に分離する
- repo 全体の運用ルールと交通整理だけをここに書く
- 正本は `.claude/skills/` に置く
- 必要に応じて `.github/skills/` に同期する

## ディレクトリ方針

- canonical source of truth: `.claude/skills/`
- generated mirror: `.github/skills/`
- optional generated mirror: `.codex/skills/`

## 基本ルール

- 1 skill = 1 directory
- skill 名は小文字とハイフンで構成する
- skill の詳細な振る舞い、文体、入出力、禁止事項は `SKILL.md` に書く
- `.github/skills/` は生成物として扱い、直接手編集しない
- skill の編集は `.claude/skills/` 側で行う
- 同期が必要なときは `npm run sync-skills` を実行する

## 現在の skill の役割

- `igapyon-tech-post-coach`  
  技術系日本語投稿の伴走、最小整理、全文再構成向け

- `igapyon-music-post-coach`  
  音楽系日本語投稿の伴走、最小整理、全文再構成向け

新しい skill が増えたら、ここには役割の要約だけを追記してください。  
詳しい仕様は各 `SKILL.md` に置いてください。

## 変更時の方針

- skill の仕様変更は、まず `.claude/skills/` 側を更新する
- 更新後に同期を実行する
- 同期先との差分を手で調整しない
- repo 全体の共通方針だけをこのファイルに書く
- 個別 skill の細かい設計をこのファイルに書きすぎない

## 将来の拡張

この repo には、今後たとえば次のような skill を追加できます。

- prompt-crafting-helper
- blog-outline-helper
- tone-checker
- post-title-helper

追加時も、同じく 1 skill = 1 directory を維持してください。
