---
purpose: ai-agent-handoff
read_when:
  - before_resuming_work
  - before_handing_off_work
  - when_context_is_missing
update_when:
  - work_is_paused
  - handoff_summary_changes
  - verification_status_changes
---

# Handoff

## 現在地（2026-10-26照合）

最新作業は `miku-scm sync pull` / `sync push` のsource実装。[実装計画と検証記録](skills/igapyon-miku-scm/docs/2026-10-26-sync-implementation-plan.md)の第14節を参照。pullは現在の作業を保持し、`-done` だけ正確なPRマージ証拠で次branchへ移る。通常branchではPR照会をしない。pushは必要な通常commit、AgentのPR文案、既存recommit/pushを固定prepare/applyでつなぐ。既存の個別操作は維持した。

[自己レビュー](skills/igapyon-miku-scm/docs/2026-10-26-sync-plan-self-review.md)の5件を実装へ反映した。独立したbranch-base記録、ignored途中tree保護、固定rebase option、実際のfetch/push先binding、prepare再開/取消、競合時の同じoperationによる回復を追加。full suite **368/368**、skill index policy **78/78**、validator、版整合が成功。APIは固定fixture、Git操作は一時repository/bare remoteで検証した。

- 状態文書監査はHEAD `8d8f68c` から開始し、`9e9fec5` にcommit済み。続けて依頼された版数更新前のHEADは `9e9fec5916fe110b6f21552403547d5412b9ebcd`。branch `devel-tiga1026meh` はローカル `origin/devel` より1 commit先。
- 現在版は共通 `1.20261026.4` / Mikuku `20261026d`。POM、VERSION.md、2つのrunnerの4値を更新し、`mvn validate`で整合を確認した。候補tag `v20261026d` はローカル・`origin` とも存在しない。
- 版数更新とsync実装・仕様・計画を含む変更は未stage・未commit。直前の `1.20261026.3` package/ZIP検査はincrement前の成果物であり、版数更新後の最新版packageと照合は未実施。Release/tagも作成していない。
- 内製15件＋外部12件＝配布対象27スキル。外部skillはPOMの固定refからビルド時に取り込む。
- 実装時点ではfast **204/204**、契約37件のdriftなし、ローカル文書リンク45件と差分検査が成功。increment前の `1.20261026.3` ZIPは内製15＋外部12＝27スキルを照合済み。`1.20261026.4` のpackageは未実施。

## 実装・マージ確認

以下は、このcheckoutのGit履歴とsourceで確認した状態。古い「未commit」「commit/push未実施」は、各作業当時の記録である。

| 対象 | 確認できた状態・根拠 |
| --- | --- |
| miku-toolbox同梱、Mikuku手指方針、daybook記録方針・task-id用語 | `38e73af`、PR #408のmerge `8d8f68c` に含まれる |
| daybookの添付テキスト優先方針 | 案からsourceへ反映済み。同じ `38e73af` に [attachments.md](skills/igapyon-miku-daybook/references/attachments.md) と各入口を追加・更新 |
| miku-scm Issueのapprove承認改善 | `2066b3d`、PR #398のmerge `ee88c7c` |
| miku-soft Node.js / Java互換性方針 | `31a97dc`、PR #397のmerge `454ddb3` |
| daybook Waypoints・Backlog・添付設計 | `1c22c5c`、PR #396のmerge `5a7376d` |
| daybook URL検索・レビュー指摘修正 | `2232cec`、PR #389のmerge `fbe24e0` |
| index任意化・配布ZIPのsource照合 | `dc2b288` / `c6d3299`、PR #383 / #384でmerge |
| daybook Issue取り込み・配布ZIP整理 | `ec0ec0c`、PR #382のmerge `3eb211f` |
| Work Cycleの最初の実装・連動版更新 | `0cc8aaa`、PR #344のmerge `044734b`。旧 `27a2ed7` の公開方法を再度選ぶ必要はない |
| Windows publication・daybook初版 | `8849b69`、PR #366のmerge `4522ec4`。Windows実機の検証完了を意味しない |

## 残件・保留の入口

- `sync pull` / `sync push` のsource実装とローカル検証は完了。SYNC-08のnative Windows実機、hosted CI、実GitHub、モデル会話routingは未実施。実repoへのsync、配備、commit/pushは行っていない。
- `target/igapyon-agent-skills-1.20261026.3.zip` はincrement前の成果物。現在版 `.4` のpackageとZIP照合を行ってから公開する。
- day-plan生成前の `npm ci` を必要時だけにする案は未反映。[実運用改善メモ](docs/plans/daybook-operation-feedback.md)の項目1。項目2〜4の記録方針・用語は反映済み。
- native Windows 11のjunction / CRLF / publication smoke、hosted CI結果は今回未確認。[Windows計画](WINDOWS11-PUSH-PLAN.md)のW02・W05・W08・W09は未完了のまま扱う。
- Work Cycle全体のcycle artifact、作業開始のone-shot化、PR evidence統合は継続候補。[設計記録](skills/igapyon-miku-scm/docs/work-cycle-lifecycle-redesign.md)と現行sourceを再照合してから別途着手する。
- モデル会話確認、実資料の変換、配備・運用反映、tag / Release、旧監査の残件は、この訂正で実施・完了したことにしない。個別の未確認事項と過去の検証件数は [TODO.md](TODO.md) を参照する。

## 次回の読み方

最新の利用者依頼、実際のGit状態、この文書とTODO冒頭を確認して対象を決める。旧branch名や「Current priority」から作業を自動選択しない。運用規則は [DEVELOPMENT.md](DEVELOPMENT.md)、利用者向け案内は [README.md](README.md) にある。

整理前の引き継ぎ本文は [引き継ぎ履歴](docs/maintenance/2026-10-26-handoff-history.md) に保存した。そこにある「最新」「active」「次の操作」は当時の記録として読む。
