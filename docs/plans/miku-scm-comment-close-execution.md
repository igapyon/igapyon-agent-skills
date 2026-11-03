---
title: miku-scm コメント後クローズ修正 実施記録
description: "実helperを使った回帰テスト、snapshot正規化、batch診断、検証結果を記録する。"
category: implementation-record
status: complete
created: 2026-11-03
updated: 2026-11-03
---

# miku-scm コメント後クローズ修正 実施記録

計画：[Luna向け修正計画](miku-scm-comment-close-luna-implementation.md)

## LUNA-00：開始状態

- branch：`devel-tiga1103uef`
- HEAD：`4220875712825f6fa9d810c608cacabf577df32c`
- Node.js：`v26.12.1`
- 開始時の既存差分：`TODO.md` に計画項目、本計画書が未追跡。これらは保持する。
- `AGENTS.md`：checkoutと親directoryで見つからず。
- baseline focused tests：32/32成功。

## LUNA-01：実helper接続テスト

- 新規 `miku-scm-handoff-comment-close.test.mjs` を追加。comment/close両helperの実preflight出力を加工せずhandoffへ渡し、実helperとbatch APIを接続した。
- 実行記録のclose preflightどおり、`issue_title`だけを返すclose結果で再現。修正前テストは期待どおり `partial` と実際の `applied` の不一致で失敗した。
- 外部GitHub、固定 `gh` command/API、ネットワークへ接続せず、架空Issue・一時root・注入したread/writeだけを使う。

## LUNA-02：共通snapshotと依存比較

- `normalizeIssuePreflightSnapshot()` をexportし、既存 `normalizeIssueReview()` とhandoff dependency refreshから共用。
- update/comment/label/closeの実preflight項目名を保持したまま、title/state別名を吸収。公開preflight JSON、review/handoff schema、空本文・空配列の意味、入力値は変更しない。
- baseline/observedのtitle・body・state・labels・comments・updated_atを検証。title/body/state/labelsは規定順で比較し、コメントはURL/bodyと検証済み先行receiptで照合。時刻は完全性だけを確認し、固定baselineとの同値条件にはしない。
- 既存handoff fixtureとclose再preflight mockを実helperのshapeへ修正。依存更新後もoperation argumentsとrefresh allowlist検査を維持。

## LUNA-03：停止・診断・再送境界

- 欠落項目と実差分を別メッセージにし、差分field名だけを出す。コメント集合・receiptは個別の理由で停止。
- classified conflictに再preflightのrun IDを付与し、既存 `dependency_refresh.preflight_run_id` へ保存。
- 回帰テストでtitle/body/labels変更、コメント追加、不完全title/comments、verified receipt欠落をclose前に停止。すでに投稿したコメントは1件のまま保持。
- unresolved commentの後続close停止とbatch resumeによる再送拒否、実close preflightのup-to-date no-opを確認。

## LUNA-04：3件6操作

- 3件すべての実preflightから6 handoffを作成し、1回のreview binding・1回の `approve` でbatchを実行。
- mutation orderは `comment42, close42, comment43, close43, comment44, close44`。requested/processed/appliedは6、remainingは0。comment/close各3回。
- 1件に開始時からあったコメントを保持し、各Issueの承認コメントが1件だけであることと、close helperによるCLOSED/COMPLETEDの確認を検証。

## LUNA-05：契約と運用説明

- `github.issue.handoff.batch.apply` のcontract versionを3へ更新。共有Issue approval versionや他workflowの明示versionは一括変更していない。
- approval-handoff referenceへ共通snapshot、承認内での検証済みコメント効果、欠落と実差分の診断を追記。
- generatorにより37 contractのlock/tableを更新。手編集なし。
- 古い実運用handoffの移行・編集はしていない。contract変更時は既存のdigest検査が引き続き書き込みを止める。

## LUNA-06：検証結果

- 変更前focused baseline：32/32。
- 最終focused Issue approval/handoff/helper接続：44/44。
- helper・manifest・contract・runner targeted suite：62/62。
- `npm run test:miku-scm`：54 jobs、487 tests passed、0 failed（約138秒）。
- `npm run test:skill-index-policy`：79/79。
- workflow contracts：37件生成後 `--check` 成功。
- `mvn validate` 成功。版整合 `1.20261103.7 / 20261103g / miku-scm 1.20261103.7 / github-writer 1.20261103.7`。
- `git diff --check` 成功。
- branch `devel-tiga1103uef`、開始HEAD `4220875712825f6fa9d810c608cacabf577df32c`。本実施でcommitは作っていない。
- 実Issueへの操作、インストール済みskillの配備・検証、version increment、package、commit/push、Windows実機・hosted CIは未実施。

