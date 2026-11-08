---
title: Issues 318・400・405 実施記録
description: "Luna向け実装計画の各段階、検証結果、未実施事項を記録する。"
category: implementation-record
status: complete
created: 2026-11-03
updated: 2026-11-03
---

# Issues 318・400・405 実施記録

計画：[実装計画](issues-318-400-405-luna-implementation.md)

## LUNA-00：開始状態

- 開始時branch：`devel-tiga1103tdj`
- 開始時HEAD：`9cc0aff2886faf3ed132700720c865b7bf249540`
- 開始時 Node.js/npm：`v26.12.1` / `11.20.0`
- 既存変更として保持：版数連動4ファイルの未stage差分、`TODO.md` の計画項目、計画書。
- `AGENTS.md` はcheckout内に見つからなかった。
- baseline：`node --test skills/igapyon-miku-scm/tests/github-issue-read.test.mjs skills/igapyon-miku-scm/tests/miku-scm-github-readonly.test.mjs` 成功、8/8。

## LUNA-318：Issue一覧labelsとcache

- 固定 `gh issue list` fieldに`labels`を追加。Issue labelは空配列を含め必ず配列で返し、name/color/description・重複を検証する。
- READONLY cacheをv3へ更新。旧v1/v2と不正list entryはmissとし、repository/query/state/labelsの整合を検査する。
- SKILLとhelper referenceに、ラベルは候補選定に使うが、完了・重複・準備済みの判定根拠にはしない方針を反映。
- focused tests：`github-issue-read`、`miku-scm-github-readonly`、workflow manifest/contracts、runnerで成功。
- 実GitHub Open一覧（run `20261103113951516-fe09be66-e76d-44db-b2b6-24b0dd9ffb1b`）：24件すべてlabels配列あり。#400=`bug`、#318=`enhancement`、#405=`documentation`。
- 24件のcompact JSON配列はlabels込み110,605 bytes、labelsを除くと108,314 bytes。labels metadataの増分は2,291 bytes。固定一覧取得1回、個別Issue取得0回。

## LUNA-400：コメント全ページ取得

- `scripts/github-issue-comments.mjs`を追加。固定GraphQL read queryをcursorでページングし、100件/page、最大100 pages・64 MiB、各`gh` page 15秒・16 MiBで制限する。
- metadataのIssue番号/URL/host/`updatedAt`、pageInfo、件数、コメントid/URL/body/createdAt/author、重複、cursor、GraphQL partial errors、全件数を検証する。不完全・途中失敗時は結果を返さず、書込みへ進ませない。
- generic Issue read、update/comment/label/closeのreaderへ接続。operationのreaderは既存normalizerへ完全な接続を渡す。Issue updateのsnapshot digestにコメントdigestも含め、preflight後のコメント変更を検出する。
- writing prepareは全コメント取得後に従来の上限100件へ圧縮し、`comments_truncated`を保持する。
- READONLY cacheをv3へ更新。read/batchとupdate/comment/label/closeのpreflight/apply contractをv3、`writing.issue.prepare`をv2へ更新。createとhandoff contract versionは変更しない。37 workflow contractを生成。
- collector testは0/1/100/101/201 comments、Enterprise host、空本文、ページ/総数/updatedAt/identity異常、partial error、page failure、重複、cursor、上限を確認。updateの実readerを使い、preflight後のコメント変更でmutation 0回を確認。
- Issue #399再現確認（run `20261103113333662-f12dae99-a8af-43a5-904f-db9a2862ec7b`）：`success`、comment count 0、mutationなし。旧失敗が発生したmetadata+comments read経路が通ることを確認。
- 対象Issue batch（run `20261103113944545-a78cbe8b-ff7d-4223-b9d8-c517dd10e95f`）：#318/#400/#405すべてsource=`github`・stale=false・comment count 0。各Issueにlabel 1件。

## LUNA-405：Node runtime dependency判断

- `10-node-app-workflow.md`に`Runtime Dependency Decisions`をNode compatibility policy前へ追加。Node標準機能と外部packageを、複雑さ、仕様準拠、安全性、user value、保守、互換性、license、package/bundle影響で比較する。
- runtime/dev依存を分け、標準機能を選ばない理由または採用を見送る理由、packageとbundleへの影響、関連build/test/smoke/pack検査の記録を求める。適切な外部libraryを選ぶ例外を残す。
- Node-Specific Checklistと`review/node-cli.md`から新しい節へリンク。package.jsonや依存そのものの変更はなし。

## 最終確認

- 修正版の`npm run test:miku-scm`成功：53 test jobs、473 assertions/tests passed。初回はbenchmark fixtureだけ旧1回取得前提で失敗したため、Issue readをmetadata＋GraphQLの2 fixed readsに更新して再実行。
- `npm run test:skill-index-policy`成功：79/79。
- `node skills/igapyon-miku-scm/scripts/miku-scm-workflow-contracts.mjs --check`：37 contracts current。
- `mvn validate`成功：`1.20261103.7 / 20261103g / miku-scm 1.20261103.7 / github-writer 1.20261103.7`の整合を確認。
- `git diff --check`成功。
- 既存の版数変更4ファイルは保持。version increment、package/ZIP生成、skill配備、GitHub write、commit/pushは未実施。
- 実装branch：`devel-tiga1103tdj`。commitは作成していない。作業treeの変更は引き渡し時点で未stage。
