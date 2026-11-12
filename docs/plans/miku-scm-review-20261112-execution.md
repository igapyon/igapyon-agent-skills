---
title: miku-scm 2026-11-12レビュー指摘への対応実施記録
description: 計画されたsyncの正確性・性能、テスト構成、AI向け手順の変更と検証結果。
category: plan
status: completed
created: 2026-11-12
updated: 2026-11-12
---

# miku-scmレビュー指摘への対応実施記録

[対応計画](miku-scm-review-20261112-luna-implementation.md)の実施状況を記録する。

## 開始状態（SC12-00）

- 実装開始branch: `devel-tiga1112uda`
- 実装開始HEAD: `1bb049117e66aebecd952c4986bee19fcf129f72`
- Node.js: `v26.12.1`
- Git: `2.54.0`
- 開始時の既存差分: `TODO.md`、root `pom.xml`、Mikuku `VERSION.md`、miku-scm runner、GitHub Writer manifest、対応計画。
- 版数の4ファイル（`1.20261112.4` / `20261112d`）を保持する。checkout/reset、commit、push、実repo同期は行わない。
- `node --test skills/igapyon-miku-scm/tests/miku-scm-test-suite.test.mjs`: 5/5成功。
- `node skills/igapyon-miku-scm/scripts/miku-scm-workflow-contracts.mjs --check`: 37 contracts current。

## 回帰台帳

| 条件 | 検証層 | 実Git fixture |
| --- | --- | --- |
| 新規公開branchの未存在leaseと競合時の無変更 | publication統合 | 必要（local bare remote） |
| Git timeoutの既定値・env・失敗分類 | command runner単体とsync fixture | 単体は不要、状態確認は必要 |
| no-op sync pushがpublicationを呼ばずpendingを残さない | sync push統合 | 必要 |
| replayされたcommitとremote/receipt履歴の交差 | pull統合・process count | 必要（remote alias refsを同一fixtureに作成） |
| suiteが全test fileを名前選択なしで一度起動 | suite runner単体 | 不要 |
| fast allowlistの境界、重複の対応先 | suite runner/guidance単体 | 不要 |
| draft検証の完全なapply argvと変更後停止 | sync push統合 | 必要 |
| SKILL経路の必須workflow、引数、権限、参照先 | routing契約 | 不要 |
| 版数専用CI分類が4値のみの変更に限定 | selector単体・YAML確認 | 不要 |
| fetch呼び出し数と役割 | local fixture計測 | 必要 |

## 変更と検証

### SC12-01〜04：公開競合・timeout・no-op・pull履歴

- **SC12-01**: 新しいpublication branchのpushへ空の `--force-with-lease=refs/heads/<branch>:` を追加。Gitのatomic leaseを最終条件にし、拒否後の再送をしない。保存済みpublicationとsync pushの両方で、preflight後にbase SHAの同名branchを作るraceをbare remote上で注入し、remote SHA保持、local renameなし、unresolved attempt、再依頼でもpush回数不増を確認する。
- **SC12-02**: 共通Git runnerへ120秒timeout、`GIT_TERMINAL_PROMPT=0`、正の有限timeout検証を設定。sync runnerでもspawnのsignal/codeを維持し、公開runnerのエラーから生stderr/URLを除く。ETIMEDOUTを単体注入し、ordinary commit前・apply開始前・push attempt後・push後verifyの各状態保持とno-retryを確認する。長いsleepは使わない。
- **SC12-03**: clean worktreeかつHEAD=baseを、base fetch/ancestor確認後・work-branch mapping/publication preflightより前に `up-to-date` で完了。競合した `-done` branchやpending operationの先行検査は維持。
- **SC12-04**: sync pullの共有履歴判定をfull OIDだけの `git rev-list --stdin` へ集約。remote tipsとreceipt headsそれぞれ最大1回、recorded base以後をreplay setと照合する。100 alias refs/unresolved receipt/malformed outputで安全停止を確認。

### SC12-05〜06：テスト実行保証とfast

元の `*.test.mjs` 3群をファイルへ物理分割し、importでテスト登録しない共有helperへ切り出した。登録ブロックは以下の対応で移動した。括弧内は分割時の登録ブロック数。動的loopは元ブロックのまま保持。

| 元ファイル | 移動先 | 分割時 |
| --- | --- | ---: |
| `sync-pull.test.mjs` | 同名入口 / `sync-pull-next-work.test.mjs` / `sync-pull-replay.test.mjs` / `sync-pull-guards.test.mjs` | 8 / 8 / 9 / 19 |
| `post-recommit-publish.test.mjs` | 同名入口 / `post-merge-next-work.test.mjs` / `publication-binding.test.mjs` / `publication-plan.test.mjs` / `publication-apply.test.mjs` / `publication-conflict.test.mjs` / `publication-recovery.test.mjs` | 4 / 17 / 11 / 9 / 3 / 3 / 3 |
| `repository-maintenance.test.mjs` | 同名入口 / `repository-maintenance-diagnosis.test.mjs` / `repository-maintenance-github.test.mjs` / `repository-maintenance-apply.test.mjs` | 5 / 5 / 4 / 4 |

各登録本体とloop入力は既存helperへ移動。追加したmalformed pull-output guardは `sync-pull-guards` に残した。suite runnerはfullで全 `.test.mjs` を1回ずつ発見し、名前filterを削除。動的/単引用/任意文字名を一時suiteで実行する回帰を維持するため、子Nodeから `NODE_TEST_CONTEXT` を除去した。これがないと `node --test` 配下の子がNode test runner再帰防止でskipされ、テスト名が未実行のままexit 0になることを確認した。

fastは明示allowlistの6 files（argv/parser/output/manifest/contracts/suite runner）。実Git・Maven・remote fixtureは含めない。現在のfastは6 jobs、22 cases。

公開成功テストの整理:

| 削除した重複 | 保持していた条件 | 残す検証 |
| --- | --- | --- |
| platform指定darwinの新規branch成功 + synthetic Windowsの同成功 | 空lease、比較0 0、done rename、PR/tag手渡し | native平台の新規branch統合1件へ統合し、empty lease argvを記録 |
| synthetic Windowsの既存branch成功 | 明示SHA leaseとfast-forward update | native実Gitの既存branch lease統合へ集約。Windows fixed argv / `windowsHide` はcommand runner単体で確認 |
| Linux指定のpublication成功統合 | 他OS notice付きで固定コマンドを継続 | `platformWarnings("linux")`の純粋判定へ置換 |

**SC12-07**: no-op、publication race/timeout、pull batch判定、suite runner、draft helper、CI selectorを含め、全回帰結果はSC12-11に追記する。

### SC12-07〜09：draft helper、runtime routing、CI

- **SC12-07**: read-only `repository.sync.push.draft.prepare` を追加。現在のroot/common/operation、prepared/apply_started、plan digest、contract、plan draft path、workplace containment、byte length/hashを検査し、`repository.sync.push.apply` の完全なargvを返す。既存の通常sync push成功fixtureをこの段階経由に置換。helper後のdraft改変とconsumed/unresolved opの拒否も確認する。
- **SC12-08**: `SKILL.md` を24,742 bytes / 381 linesから現在 **11,198 bytes / 173 lines**へ整理。細部は`runtime-sync-pull.md`、`runtime-sync-push.md`、`runtime-post-merge.md`、`runtime-issue-approval.md`へ分け、選択されたworkflowにruntime referenceを結ぶ。runtime referenceの存在と経路はmanifest/routing testで確認する。
- **SC12-09前提**: GitHub Actions run [#154](https://github.com/igapyon/igapyon-agent-skills/actions/runs/43145493985)をREADONLY照会。2026-11-12の`pull_request` runはsuccess、macOSとWindows両full jobおよびrequired jobがsuccess、Windows fullのstepは03:02:54Z〜03:11:56Zで完了しており、前回分割のhosted条件を満たす。
- **SC12-09実装**: selectorを`none` / `versions` / `full`へ拡張。版数専用は4つの許可sourceだけ、status=modified、renameなし、base/head全文をversion値だけplaceholderへ置換して一致し、head全4値の整合を要求する。厳密に証明できない関連変更はfull、不完全なファイル一覧はfull、一覧/PR API失敗やPRのhead/base移動は選択失敗。両workflowでUbuntuのversion+contract job、既存macOS/Windows full、従来のrequired check名とmode別成功/skip gateを維持。版数値のみを意味のない契約差分にしないためGitHub Writer contract digestではmanifestの `PRODUCT_VERSION` 値だけを正規化し、対応テストを追加。

### SC12-10：実fixtureのコマンドcost

Node.js v26.12.1 / Git 2.54.0 / macOS / local bare remoteでcounting wrapperを使い、各scenarioを1回測定。fixture構築は計測外、ローカルremoteはGitHub latencyを表さない。wall timeは再現性のあるCI閾値には使わない。

| Scenario / phase | Git process | fetch | ls-remote | remote URL reads | phase wall |
| --- | ---: | ---: | ---: | ---: | ---: |
| no-op sync push prepare | 43 | 1 | 0 | 6 | 0.55 s |
| ordinary fast-forward pull | 97 | 1 | 0 | 10 | 1.26 s |
| dirty sync push prepare | 91 | 1 | 1 | 15 | 1.62 s |
| draft.prepare | 4 | 0 | 0 | 0 | 0.06 s |
| dirty sync push apply+publish | 245 | 3 | 4 | 47 | 3.59 s |
| clean/ahead sync push prepare | 80 | 1 | 1 | 13 | 1.09 s |
| clean/ahead sync push apply+publish | 245 | 3 | 4 | 47 | 3.55 s |
| recommit後publication preflight stop | apply 110 | 1 | 1 | 21 | 1.77 s |

通常push全体は4 fetch（prepare 1、apply 3）で、全成功時はapply中の3件がbase再確認1件とpublicationのpre/post-push確認2件。recommit後のpreflight stopでは最後の2件が起動しなかった。applyの4 `ls-remote` は初期remote確認・fetch後、recommit後の期待値確認・fetch後に分かれる。各照会の間にcommit/soft-reset/pushがあるため値の再利用はできない。fetch/remote照合は外部通信の変化検出とpush後の成否確認であり、今回削除しない。既存のno-op早期returnだけは不要なpublication確認を避ける。

### 対話のroute表と範囲

| 会話 | 期待route | 続行/停止条件 |
| --- | --- | --- |
| sync pushでdirty workあり | prepare → evidenceからdraft → draft.prepare → apply argv | sensitive pathは個別同意、各stageのprepared/success以外で停止 |
| clean HEAD=baseのsync push | prepare | `up-to-date`で完了、draft/publicationなし |
| apply前fetchでbase進行 | push prepare/apply | `needs-sync-pull`; pullは明示依頼待ち、ordinary commit保持 |
| apply途中で結果不明 | apply | receipt/remoteを照合するまで再送しない |
| 長いhuman outputが切れた | 同一runのresult read | 同じrun/workflow/repo/opだけを照合、再prepareしない |
| draft.prepare後にdraft改変 | apply | byte digest mismatchでbackup/reset/push前に停止 |
| ordinary branchでsync pull | pull | PR merge queryなし、変更保持とbase統合 |
| done branch + merged PR | pull | exact PRのmerge evidenceとfetched base containment後だけ次work |
| done branch + open PR | pull | 次workへ進めず停止 |
| PR読取不能→human affirmative | pull | 表示済みbranch/HEAD/baseへの回答かつ同operationなら再確認後継続 |
| bare recommit | recommit preflight/draft | local history rewriteの明示gateを保持 |
| draft recommit push | fixed compound push | preflight gateと固定saved draftを用い一度だけ |
| git add commit | work.commit | 通常commit依頼のみ、別Issue/remote権限へ拡張しない |
| Issue reviewでapprove | handoff review → exact current approve → apply | current reviewにbindし、変更後はreviewし直す |
| sync push依頼にapprove prose | sync push route | Issue approvalとは無関係、syncの次stageは自動compound内で進める |
| review/planだけの依頼 | read/review only | miku-scm source/target mutationなし |
| 版数値だけのPR | CI selector `versions` | 4 sourceの全文証明とalignment、両contract check |

この表はroute規則を文書化し、CLI/manifest/selectorの自動契約と照合するためのもの。実LLM対話を実行した保証ではない。

### SC12-11：最終検証

- 最終 `npm run test:miku-scm:fast`: 6 jobs / 22 cases成功、worker上限4、suite duration 0.823秒。
- 最終 `npm run test:miku-scm:full`: 60 jobs / 553 cases成功、失敗0、worker上限4、suite duration 127.805秒。初回fullで見つかった8件は、SKILL詳細を専用referenceへ移した後の旧文言assertionとpublication contract versionの旧期待値。route/guidance testを新しい責務の配置に合わせ、publication expected contractをv4へ直して同じ全件suiteを再実行した。
- focused `node --test` guidance 10/10、`publication-binding.test.mjs` 16/16成功。
- `scripts/contract-ci.test.mjs`: 6/6。`scripts/skill-reference-routing.test.mjs`: 16/16。
- Miku SCM workflow contracts 38件、GitHub Writer workflow contracts 12件は両方current。`node scripts/validate-version-alignment.mjs --repo .` は `1.20261112.4 / 20261112d` の4値整合を確認。`mvn validate` と `git diff --check` 成功。
- 今回の変更後のWindows hosted CI、native Windows、実モデル対話、配備、実GitHub syncは未確認。前提に使った既存GitHub Actions #154のWindows成功は今回の変更のCI成功を意味しない。
- version、commit、pushは変更・実行していない。source配備もしていない。
