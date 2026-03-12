# Current Session

## 現在の焦点

実装の事実に合わせて `docs/` を更新し、実態との差分を減らすこと。

## 次の一手

- `tools/sync-skills.mjs` の現在の挙動を `ARCHITECTURE.md` と `STATE.md` に反映する
- `.codex/skills/` を未実装として扱う前提を `docs/` 側で明示する
- 古くなった session 初期化メモを現状ベースの内容に置き換える

## メモ

- `docs/` 自体はすでに導入済みで、初回整備フェーズは完了している
- 現在の同期実装は `.github/skills/` のみを対象としている
- 同期スクリプトは対象 mirror を毎回作り直すため、mirror 側の手修正は保持されない
