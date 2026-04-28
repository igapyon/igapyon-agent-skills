# igapyon-agent-skills

個人用の Agent Skills を管理するためのリポジトリです。

## 方針

- skill は `skills/` 配下に置く
- 1 skill = 1 directory
- skill ごとの詳細仕様は各 `SKILL.md` に書く
- repo 全体の運用ルールはこの `README.md` に書く
- 作業メモは repo 直下の `TODO.md` に集約する

## references の扱い

各 skill 配下の `references/` は、skill 利用時に参照しやすいように同梱する参考資料です。

特に、`references/` 以下の `miku` から始まるディレクトリ内のファイルは、ほかのリポジトリに正本がある記事やメモを、この repo で利用しやすいようにコピーしたものです。  
この repo では、それらのコピーを skill と一緒に `.codex/skills/` へ複写して利用する前提です。

正本側の更新を取り込む必要がある場合は、必要なタイミングでこの repo 側のコピーを更新します。

一方、`references/general/` は、この repo を正本として管理する一般記事用の置き場です。  
`miku` 系プロダクトに分類されない Qiita / Note 記事は、必要に応じて各 writer skill の `references/general/` に置きます。

## 構成

```text
.
├─ skills/
│  ├─ igapyon-techpost-writer/
│  │  └─ SKILL.md
│  └─ igapyon-musicpost-writer/
│     └─ SKILL.md
├─ TODO.md
└─ README.md
```

## 現在の skill

- `igapyon-techpost-writer`  
  技術系日本語投稿の伴走、最小整理、全文再構成向け

- `igapyon-musicpost-writer`  
  音楽系日本語投稿の伴走、最小整理、全文再構成向け
