# Task List

## 現在のタスク

- [ ] `AGENTS.md` の `.codex/skills/` 記述と実装の扱いを揃える
- [ ] `.codex/skills/` という mirror 自体が必要かどうかを先に判断する
- [ ] `docs/` のうち session 系文書を、実際の運用に合わせて定期的に更新する形に整える

## バックログ

- [ ] 必要性が明確になったら tech/music 以外の skill を追加する
- [ ] `.codex/skills/` への同期が必要なら `tools/sync-skills.mjs` に同期先を追加する
- [ ] UI metadata が必要になったら skill 用の `agents/openai.yaml` を検討する
- [ ] リポジトリが大きくなったら sync 挙動の validation や test を追加する

## 完了済み

- [x] ルートレベルの `TODO.md` を `docs/TODO.md` に統合した
- [x] `README.md` から `docs/` を明示的に参照するようにした
- [x] `igapyon-tech-post-coach` と `igapyon-music-post-coach` を見直し、`SKILL.md` には常時必要な guidance だけを残した
- [x] 長めの style ルール、構成パターン、例を `references/` に移した
- [x] `references/` を読むべきタイミングを `SKILL.md` に追記した
- [x] `docs/*.md` の本文を日本語化し、タイトル行だけ英語で維持した
