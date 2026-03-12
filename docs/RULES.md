# Development Rules

## 一般原則

- 大きな書き換えより小さな変更を優先する
- 意味のある既存内容は保持する
- 現在のリポジトリ構成と命名規則に従う
- 理解や前提が変わったら文書を更新する

## Skill 編集ルール

- skill の編集は `.claude/skills/` 配下でのみ行う
- `.github/skills/` を手で直接編集しない
- mirror 更新が必要な場合は source skill 変更後に `npm run sync-skills` を実行する
- skill 固有の振る舞いは各 skill ディレクトリ内に閉じ込める

## ドキュメント運用ルール

- `docs/` を永続的な LLM 作業メモとして使う
- 大きな作業の前に `CONTEXT.md`、`ARCHITECTURE.md`、`STATE.md`、`TODO.md`、`SESSION.md` を読む
- 必要に応じて、新しく追跡する task を始める前に `TODO.md` を更新する
- 新しい理解や意思決定が出たら `STATE.md` を更新する
- 現在の焦点と次の一手が分かるように `SESSION.md` を更新する
- 文書は簡潔で、構造化され、増分的に保つ

## 編集上の好み

- 見出しと文書構造は維持する
- ファイル全体の書き直しより、小さな節の追記や修正を優先する
- すでに別場所で管理されている細かい skill 内容を重複記載しない
