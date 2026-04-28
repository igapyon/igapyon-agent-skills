# igapyon-agent-skills

個人用の Agent Skills を管理するためのリポジトリです。

## 方針

- skill は `skills/` 配下に置く
- 1 skill = 1 directory
- skill ごとの詳細仕様は各 `SKILL.md` に書く
- repo 全体の運用ルールはこの `README.md` に書く
- 作業メモは repo 直下の `TODO.md` に集約する

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
