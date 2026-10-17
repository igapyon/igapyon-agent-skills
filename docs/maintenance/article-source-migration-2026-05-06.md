# 記事正本の集約記録（2026-05-06）

ルート README に記録されていた、2026-05-06 時点の記事集約の確認結果です。現在の正本配置と運用ルールは、[運用ガイドの記事公開の優先順位](../../DEVELOPMENT.md#記事公開の優先順位)と[references の扱い](../../DEVELOPMENT.md#references-の扱い)を参照してください。

## Qiita 記事

`workplace/*/docs/articles/qiita/` 配下の有意な記事本文は、`README.md` と `TEMPLATE.md` を除き、すべて `skills/igapyon-qiita-writer/references/` 側に同一内容で存在することを確認しました。

| 対象 | 記事件数 |
| --- | --- |
| `miku-abc-player` | 1 |
| `miku-indexgen` | 1 |
| `miku-xlsx2md` | 8 |
| `mikuproject` | 4 |
| `mikuscore` | 2 |

## Note 記事

`workplace/*/docs/articles/note/` 配下の有意な記事本文は、`README.md` と `TEMPLATE.md` を除き、当時の `skills/igapyon-note-writer/references/` 側に同一内容で集約済みであることを確認しました。

| 対象 | 記事件数 |
| --- | --- |
| `miku-abc-player` | 1 |
| `miku-indexgen` | 1 |
| `miku-xlsx2md` | 3 |
| `mikuproject` | 3 |
| `mikuscore` | 2 |

旧配置の注意点として、`mikuscore` の記事が `workplace/docs-articles/mikuscore-devel/` と `workplace/docs-articles/miku-abc-player-devel/vendor/mikuscore/` の両方に存在する可能性が記録されていました。Note 正本は、現在の運用ルールに従い姉妹リポジトリ `../mikuku-articles/` で管理します。
