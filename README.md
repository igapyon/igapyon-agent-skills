# igapyon-agent-skills

個人用の Agent Skills を管理するためのリポジトリです。

このリポジトリでは、用途ごとに skill を分けて管理します。  
たとえば、技術記事投稿、音楽ブログ投稿、プロンプト設計支援などを、別々の skill として追加していきます。

## 方針

- skill は用途ごとに分ける
- skill ごとの詳細仕様は各 `SKILL.md` に書く
- repo 全体の運用方針は `AGENTS.md` に書く
- 正本は `.claude/skills/` に置く
- 必要に応じて `.github/skills/` に同期する
- 現在の同期実装は `.github/skills/` のみを対象にしている
- `.github/skills/` は生成物として扱い、直接編集しない

## ディレクトリ構成

```text
.
├─ .claude/
│  └─ skills/
│     ├─ igapyon-tech-post-coach/
│     │  └─ SKILL.md
│     ├─ igapyon-music-post-coach/
│     │  └─ SKILL.md
│     └─ ...
├─ .github/
│  └─ skills/
├─ docs/
│  ├─ CONTEXT.md
│  ├─ ARCHITECTURE.md
│  ├─ PLAN.md
│  ├─ TODO.md
│  ├─ STATE.md
│  ├─ SESSION.md
│  └─ RULES.md
├─ tools/
│  └─ sync-skills.mjs
├─ AGENTS.md
├─ package.json
└─ README.md
```

## skill の置き方

各 skill は 1 ディレクトリごとに分けます。

例:

```text
.claude/skills/igapyon-tech-post-coach/
└─ SKILL.md
```

必要であれば、将来は skill 配下に補助ファイルを追加できます。

例:

```text
.claude/skills/example-skill/
├─ SKILL.md
├─ references/
│  └─ notes.md
└─ assets/
   └─ template.txt
```

## 命名ルール

- 小文字
- 単語区切りはハイフン
- 短く、用途が分かる名前
- 1 skill = 1 用途を原則にする

例:

- `igapyon-tech-post-coach`
- `igapyon-music-post-coach`
- `prompt-crafting-helper`

## 編集ルール

- skill の編集は `.claude/skills/` 側で行う
- `.github/skills/` は手で直接編集しない
- repo 全体の説明や交通整理は `AGENTS.md` に書く
- skill 固有の文体・入出力・禁止事項・進め方は各 `SKILL.md` に書く

## LLM Workflow

このリポジトリでは、LLM セッション向けの作業メモを `docs/` に集約します。

- 安定した前提や背景は `docs/CONTEXT.md`
- 構造把握は `docs/ARCHITECTURE.md`
- 現状理解は `docs/STATE.md`
- 作業キューは `docs/TODO.md`
- 現在セッションの焦点は `docs/SESSION.md`
- 運用ルールは `docs/RULES.md`

LLM が作業を始めるときは、原則として `CONTEXT.md`、`ARCHITECTURE.md`、`STATE.md`、`TODO.md`、`SESSION.md` の順に読む前提です。

## 同期方法

このリポジトリでは、`.claude/skills/` を正本として、必要に応じて `.github/skills/` に同期します。

現時点で `npm run sync-skills` が同期するのは `.github/skills/` のみです。

実行コマンド:

```bash
npm run sync-skills
```

これにより、`.claude/skills/` 配下の skill が `.github/skills/` にコピーされます。

## 新しい skill を追加する手順

1. `.claude/skills/` の下に新しいディレクトリを作る
2. その中に `SKILL.md` を置く
3. 必要なら `AGENTS.md` の役割一覧を更新する
4. `npm run sync-skills` を実行する

例:

```bash
mkdir -p .claude/skills/my-new-skill
```

その後、`.claude/skills/my-new-skill/SKILL.md` を作成します。

## 現在の skill

- `igapyon-tech-post-coach`  
  技術系日本語投稿の伴走・最小整理向け

- `igapyon-music-post-coach`  
  音楽系日本語投稿の伴走・最小整理向け

## 今後の拡張候補

- プロンプト設計支援
- ブログ構成整理
- 投稿前のトーン確認
- 草稿から見出し案を作る補助 skill

## メモ

このリポジトリは、最初から巨大な仕組みにすることを目的としていません。  
小さな skill を用途ごとに増やしながら、必要に応じて整理していく前提です。
