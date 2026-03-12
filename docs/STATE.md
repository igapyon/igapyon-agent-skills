# Current State

## 概要

このリポジトリはすでに動作しており、2 つの source skill と、`.github/skills/` への生成 mirror を含んでいます。

## 現在の構成

- source skill は `.claude/skills/` に置かれている
- mirror skill は `.github/skills/` に置かれている
- 同期は `npm run sync-skills` で行う
- skill の詳細は `SKILL.md` と `references/` に分かれている
- `.codex/skills/` は方針上の候補だが、まだ同期対象には入っていない

## 最近の変更

- `docs/` 配下の文書を日本語中心に整理した
- `docs/` の内容を実装準拠で見直す作業を開始した

## 既知の課題

- `AGENTS.md` には optional mirror として `.codex/skills/` の記述があるが、同期実装は未対応
- sync script 実行以外の自動検証はまだない
- `SESSION.md` や `TODO.md` は放置すると古くなりやすい

## 決定事項

- `.claude/skills/` を正本として維持する
- `.github/skills/` を生成物として維持する
- `SKILL.md` は軽量に保ち、詳細は references に委ねる
- mirror は手修正せず、必要時に `npm run sync-skills` で再生成する
