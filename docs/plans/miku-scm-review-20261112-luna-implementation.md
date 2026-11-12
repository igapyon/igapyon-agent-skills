---
title: miku-scm 2026-11-12レビュー指摘へのLuna向け対応計画
description: 公開競合とtimeout、同期処理の負荷、テスト選択と生成AI向け指示を段階的に改善する。
category: plan
status: completed
created: 2026-11-12
updated: 2026-11-12
---

# miku-scm レビュー指摘への対応計画

## 1. 依頼・作業範囲

この計画に沿って、製品実装・回帰確認・文書更新を進める。各項目の実施状況と制約は実施記録に残す。

実装の正本は skills/igapyon-miku-scm/。本書で scripts/、tests/、references/ とだけ書く場合は同skillからの相対パス。
.github/、package.json、DEVELOPMENT.md、root scripts/ はrepository rootからの相対パス。

- 計画時branch: devel-tiga1112uda、HEAD: 1bb049117e66aebecd952c4986bee19fcf129f72。
- 利用者依頼による版数更新済みの未stage差分4ファイルを保持する。
  pom.xml、skills/igapyon-mikuku-agent/references/VERSION.md、
  skills/igapyon-miku-scm/scripts/miku-scm-run.mjs、
  skills/igapyon-github-writer/scripts/github-writer-workflow-manifest.mjs。
  値は 1.20261112.4 / 20261112d。計画作成を理由に増分し直さない。
- 実装開始時は実際のbranch、HEAD、差分と最新の利用者指示を優先する。上記HEADへのcheckout/resetはしない。
- 実装検証は一時Git repositoryとローカルbare remoteを使う。実利用repositoryへのsyncやGitHubへの書き込みで検証しない。
- 配備、commit、push、PR作成、tag/Releaseはそれぞれの依頼で扱う。
- 既存の11月5日改善計画・追加対応計画は完了済みの履歴。本書は追加指摘を扱う。
- [Contract CI負荷改善計画](contract-ci-balance-plan.md)の「版数だけの変更の軽量化」はSC12-09で具体化する。同計画のhosted Windows検証の前提を引き継ぐ。

## 2. 根拠と到達点

以下は直前のレビュー時の結果。本計画作成ターンではテストを再実行していない。

| ID | 分類 | 根拠 | 到達点 |
| --- | --- | --- | --- |
| R1 | 公開時の競合 | 新規branch確認後に同名branchをbase SHAで作ると、通常pushがfast-forwardしてpublishedになることをローカルbare remoteで再現 | 新規作成にもremote refの不存在条件を原子的に適用 |
| R2 | 終了しない通信 | publicationのcreateGitRunner経由ではspawnにtimeoutが渡らないことを確認。syncGit側は120秒 | 委譲後も有限時間で停止し、公開結果不明なら再送しない |
| R3 | no-opの余分な確認 | cleanかつHEAD=baseでもpublication preflightを呼び、その故障でnot-appliedになることを再現 | 不要な公開確認なしにup-to-date |
| R4 | テスト分割の検査漏れ | extractTestNamesは行頭の二重引用符の固定名だけを抽出。動的な未分類testは0件のまま検査成功 | 発見した全testファイルを名前フィルターなしで一度ずつ実行 |
| R5 | pullのprocess数 | refusePublishedがcommit×remote ref、およびcommit×receiptで祖先検査を繰り返す | 同じ保護条件を最大2回のまとめた履歴照会で判定 |
| R6 | テスト・CIの負荷 | fullは48ファイル・60jobs、fastは34ファイル。版数変更も両skillのfull対象 | fastの目的を明確にし、厳密に証明できる変更だけCI軽量経路へ |
| R7 | 生成AIへの負荷 | SKILL.mdは約24.7KB・382行。通常経路と復旧/Issue/開発規則が同居 | 実行に必要な規則を入口に残し、選択した経路の詳細だけ読む |
| R8 | 手作業の機械処理 | Agentがdraftのbyte hashとapply引数を別途組み立てる | 固定helperから正しい引数を取得 |
| R9 | 重複fetchの候補 | 通常sync pushはprepare、apply、publication前後の計4箇所でfetch | costと保護条件を計測して統合可否を判断 |

既存のsuite-runner focused testsは5/5成功していたが、R4を検出できなかった。
現行fullに欠落ケースがあると断定する根拠はない。R4は今後の追加を含めた実行保証の穴として扱う。
R1の再現では分岐commitの消失は確認していない。問題は「存在しないはずの送信先」が別操作で作られた後も更新すること。
R6の旧full件数541は比較の参考値。新規回帰追加・重複整理の増減を説明し、固定件数を合格条件にしない。

## 3. 実装順

原則1行を1作業単位とする。同じファイルを複数担当で同時編集しない。
各単位で対象の回帰条件、focused確認、必要な契約再生成、差分確認を完了する。
全件テストは最終treeで一度行い、毎単位で繰り返さない。

| 順 | 作業ID | 内容 | 前提 |
| --- | --- | --- | --- |
| 0 | SC12-00 | 開始状態・検証台帳 | 実装依頼 |
| 1 | SC12-01 | 新規branchへの不存在lease | 00 |
| 2 | SC12-02 | Git timeoutと公開結果の分類 | 01 |
| 3 | SC12-03 | sync push no-opの早期終了 | 02 |
| 4 | SC12-04 | pullの公開済み履歴判定をまとめる | 03 |
| 5 | SC12-05 | 残る名前shardを物理ファイルへ分割 | 04 |
| 6 | SC12-06 | fast suiteと重複テストの整理 | 05 |
| 7 | SC12-07 | draftの機械的検証とapply引数の取得 | 06 |
| 8 | SC12-08 | SKILL・reference・対話ケースの整合 | 07 |
| 9 | SC12-09 | CIの厳密な版数専用経路と依存範囲 | 08、hosted Windowsの前提確認 |
| 10 | SC12-10 | fetch重複の計測と採否判断 | 08 |
| 11 | SC12-11 | 最終検証・実施記録 | 01〜10の実施対象 |

SC12-09のhosted結果を取得できなければCI軽量化を未完として残し、他の修正の検証・引き渡しは進める。
SC12-10は計測と判断が成果物。今回の実装範囲ではfetchを削除しない。削除が妥当と分かった場合は、守る条件と変更案を別の実装単位として記録する。

実装開始時に docs/plans/miku-scm-review-20261112-execution.md を作る。
各IDの変更、実行コマンド、結果、ケース増減、未確認環境を追記する。
時間は同じOS・Node・Git条件で比較し、プロセス数と分ける。絶対秒数だけでCIを落とす検査は追加しない。

## 4. SC12-00：開始確認

1. DEVELOPMENT.md、適用されるAGENTS.md、root TODO、本書、現在の利用者指示を確認する。
2. git status -sb、HEAD、staged/unstaged diff概要、Node/Git版を記録する。既存版数4ファイルと計画差分を保持する。
3. 既存contract --checkと最初の担当focused testsをbaselineにする。全件baselineを取得するためだけにfullを実行しない。
4. 各テストに「守る条件・検証層・実Gitの必要性」を簡潔に付ける台帳を実施記録へ作る。fixtureの全組合せ追加はしない。
5. source変更を配備先 ~/.codex/skills へ自動コピーしない。

## 5. SC12-01：新規branchの不存在条件

対象: scripts/post-recommit-publish.mjs、tests/post-recommit-publish.test.mjs、
tests/sync-push-preflight.test.mjs、references/github-post-recommit-publish.md、
references/github-pr-recommit-push.md、references/sync-push.md。

採用仕様:

- 既存remote branchは現行の --force-with-lease=refs/heads/<branch>:<reviewed-SHA> を維持する。
- 新規branchも --force-with-lease=refs/heads/<branch>: を付けてpushする。末尾の空の期待値を保持する。
- 新規経路の -u と push_mode: new-branch、成功後のfetch、比較0 0、ローカル-done化を維持する。
- 直前のREADONLY確認は早い停止に使い、原子的な排他条件はGitのleaseに担わせる。
- lease拒否後にremoteを読み直して期待値を更新し、同じ依頼中に再送する処理は追加しない。
- claim後のpush失敗は既存のunresolved扱いを維持する。拒否を安全な自動再試行へ分類し直さない。

回帰条件:

1. 新規成功時の正確なargvに空のleaseがあり、upstream設定・比較0 0・renameが成功する。
2. 最終remote確認後かつpush直前に、同名branchをbase SHAで作成する。lease拒否となり、そのbranchはbase SHAのまま、ローカル-done renameなし。
3. 2をfixture上のsync pushからも1ケース確認し、backupとrecommit後HEADを保持し、反復依頼でpushが増えない。
4. 分岐SHAへの競合と既存branchの明示SHA leaseは既存テストを活用する。同じ成功系をOSの名前だけ変えて増やさない。

故障注入は既存beforeMutationまたはpublication-push checkpointを使う。Git push本体は実Git＋ローカルbare remote。
SC12-05までは新しいpublicationテスト名を既存shardに入る saved publication 等のprefixにする。

## 6. SC12-02：委譲先までGit実行を有限時間にする

対象: scripts/miku-scm-command-runner.mjs、scripts/miku-scm-sync-state.mjs、
scripts/post-recommit-publish.mjs、関連command-runner/diagnostics/publication tests。
必要に応じて scripts/miku-scm-git-process-policy.mjs を1つだけ追加し、両Git runnerで共用する。

採用仕様:

- Gitの既定timeoutを120,000msへ揃える。明示的な正の内部timeout指定は許可する。
  0、負値、NaN、Infinityはspawn前に引数エラーにする。ghの既存15秒等の設定は別のまま扱う。
- shell:false、buffer上限、syncGitのbinary出力、publicationのtext出力という既存契約を保つ。
  runner全体の戻り値統一や固定npm/Maven runnerの改造まで広げない。
- Gitへ既存環境を継承して GIT_TERMINAL_PROMPT=0 を設定する。LC_ALLやeditor/rebase用の既存sync固有設定は保つ。
  GIT_EDITOR=true等を無関係なGit経路へ一律追加しない。credential helper自体の終了はtimeoutでも保護する。
- spawnのETIMEDOUT、signal、exit codeを捨てない。公開エラーはraw stderrやURLでなく固定の原因分類と段階を出す。
  エラーメッセージ書式への過剰依存は増やさず、既存diagnosticを再利用する。
- await中のロック解放と既存finallyを維持する。timeoutを理由にlockやattemptを強制削除しない。

必須の分類:

| 場所 | 期待する状態 |
| --- | --- |
| prepare中、通常commit前のfetch timeout | push未開始、元のworktree/index/HEADを保持 |
| apply開始前のfetch timeout | apply未開始、prepared planを消費しない。原因解消後の明示sync pushで再準備可能 |
| recommit後、publication preflight timeout | backupと新HEADを保持。既存の検証可能な未公開復旧経路を使う |
| publication attempt claim後のpush timeout | publication receiptとsync operationはunresolved、mutation_invoked:null、再送なし |
| push後の検証fetch timeout | remote結果を推測せずunresolved、-done renameなし、再送なし |

テストはspawn代替でETIMEDOUTを返し、正確なtimeout/env/非再試行を単体確認する。120秒sleepはしない。
公開の上位経路では実fixtureの対象Gitコマンド1つだけをtimeoutに差し替え、attempt消費と戻り値を確認する。
push前/後のtimeoutケースを既存の失敗テストへ統合し、同じ分類を全CLI×全OSで重複実行しない。

## 7. SC12-03：変更ゼロのsync pushを公開確認前に終了

対象: scripts/sync-push.mjs の prepareSyncPush、tests/sync-push-preflight.test.mjs、references/sync-push.md。

- assertIdle、snapshot、remote/base設定検証、fetchBase、snapshot再確認、base祖先検査は維持する。
- base進行の判定後、initial.dirty===false かつ initial.head===op.base_sha ならopをcompletedにしてup-to-dateを返す。
- この分岐をrequireFetchBranch(work branch)、completion branch存在検査、publication preflight、通常commitより前に置く。
- commit:{status:skipped}、head、warnings、mutation_invoked:falseを返す。draft/evidence/backup作成やpushはしない。
- frozen -done branch停止、pending operationの検査、remote URL/refspecの妥当性は引き続き先に検査する。
- dirtyまたはbaseよりaheadなら既存の公開先確認を通常commit前に行う。

回帰: clean/head=base＋publish dependencyが呼ばれたら失敗するfixtureでup-to-date。
同時にwork branch fetch mapping不要の既存ケースと、dirty時に公開先不備でcommit前停止する既存ケースを確認する。
no-op成功後にpending operationが残らないことを確認する。

## 8. SC12-04：公開済み履歴のまとめた照会

対象: scripts/sync-pull.mjs の refusePublished、tests/sync-pull.test.mjs または分割後のprovenance群、
references/sync-pull.md。

採用方式:

1. 現行の同名remote-tracking branch存在による即停止を維持する。
2. for-each-refで得る全remote refのfull OIDを重複除去する。
3. 対象branchのpublication plan/attemptを現行と同じ条件で読み、receiptのreviewed_headを重複除去する。
   unresolved attemptを除外しない。壊れた記録や読取失敗は安全停止する。
4. private関数 sharedReplayCommit(ctx, replayCommits, tipOids, recordedBase) を作る。
   非空tip群をstdinのfull OID行として git rev-list --stdin へ渡す。
   同じstdinの最後へ ^<recordedBase-SHA> を渡し、recorded base以前を除く。文字列のref名は入力しない。
5. 出力OIDとreplayCommitsのSetの共通要素があれば停止する。
   remote tip群とreceipt群を別々に判定し、停止原因を従来どおり区別する。照会は各群最大1回、合計最大2回。
6. 空群はGitを呼ばない。nonzero、出力不正、buffer超過を「共有なし」と扱わない。
   現行の64MiB制限で停止する。無制限出力やfetch後のcache持ち越しは追加しない。

回帰: remote tipが対象commitそのもの/子孫なら停止、独立履歴なら通過。
receiptで覆われる履歴と未解決attemptは停止、記録base欠落/書換えは既存どおり停止。
実Gitへ委譲するcounting wrapperで、複数commit×100個のremote alias refsでも祖先判定のprocess数が積にならないことを確認する。
100refsはupdate-refで同じfixture内に作り、100repositoryを作らない。buffer/非zeroは単体境界へ注入する。

## 9. SC12-05：名前によるshardから物理ファイル分割へ

対象: scripts/miku-scm-test-suite.mjs、tests/miku-scm-test-suite.test.mjs、
tests/sync-pull.test.mjs、tests/post-recommit-publish.test.mjs、tests/repository-maintenance.test.mjs、
references/runtime-and-test-suites.md、当該test pathを参照する管理中文書。

- sync-pullを4群、publicationを7群、maintenanceを4群へ分ける。現在の計15shardsに近い仕事量を維持し、workerは4のまま。
- 元ファイル名は主要contract testを残す入口とする。新規ファイルは役割が分かる名前＋.test.mjs。
  例: sync-pull-merge、sync-pull-confirmation、sync-pull-recovery、publication-binding、publication-plan、publication-recovery、maintenance-apply。
- helperはsync-fixture.mjs等を再利用し、必要な場合だけpublication-support.mjs/maintenance-support.mjsへ抽出する。
  .test.mjsを別testからimportしない。import時にtest登録やrepository作成をするhelperを作らない。
- 移動前の登録ブロックと移動先の対応表を実施記録へ残す。各ブロックの本体、動的loopの入力、assertionを維持する。
  import/helper変更で本体を変えた場合は理由を明記する。件数だけを合わせるための変更はしない。
- SLOW_SHARDS、extractTestNames、validateShards、--test-name-pattern生成を削除する。
  buildFullJobsは全.test.mjsの発見と各ファイル1jobへの変換だけにする。
- suite-runner testは「新規に追加した、動的名・単引用符・任意名のtestも1jobで実行される」小さい一時fixtureへ置き換える。
  未分類名を登録拒否する旧テストは廃止する。test名に命名規則を要求しない。
- 削除・移動の台帳と最終full件数の増減を照合する。履歴文書の過去コマンドを一括書き換えない。

fullの並列数を増やしたり、大量の細分化を同時に行ったりしない。
分割後、既存worker/progress/spawn-failure検査を通す。最終fullで動的ケースと新規回帰の結果を確認する。

## 10. SC12-06：fastとテストの重複を整理

対象: package.json、scripts/miku-scm-test-suite.mjs、同suite-runner tests、
tests/miku-scm-*-routing/guidance系、references/runtime-and-test-suites.md。

- --fastを既存suite runnerへ追加し、npm run test:miku-scm:fastも同じworker上限4で実行する。
  --fullと--jobsの互換性を維持する。
- FAST_FILESを明示allowlistにする。全ファイルの自動発見はfullだけに残す。
  allowlistの欠落ファイル・重複・fullに含まれない項目を検出する。
- fastは引数解析、argv構築、出力整形、純粋な判定、manifest/contract整合を対象とする。
  実Git fixture、npm/Maven実行、remote操作を含むファイルをfastへ入れない。
- 最初の候補は command-runner、fixed-command-runner、jst-time、workflow-manifest、
  workflow-contracts、test-suiteの既存test。実装時に各本体を確認してallowlistへ確定する。
  mixedなファイルをfastのためだけに大量分割せず、必要な検証はfocused/fullへ残す。
- guidance/routing検査は改行・段落位置の一致をやめ、固定workflow ID、必要option、権限境界、リンク先の存在を検査する。
  /\s+/等による表記許容だけで意味を検証できたと説明しない。
- publicationのdefault/macOS指定/native成功のような重複候補は、OS固有argvの単体検査とnative実Git成功に整理する。
  WindowsでCIが走る事実を、platform文字列の注入成功と混同しない。
  保存計画の単体経路とsync経由の代表成功は、入口の結合確認として各1件を維持する。
- 削除するテストごとに「守っていた条件」と「残す検証先」を台帳へ対応付ける。対応先のない安全検査は削除しない。

目的は反復確認の短縮。fastの件数削減率やfullの件数維持そのものを目標にしない。
同条件の実行時間と実Git/subprocessの有無を記録する。fastから外したケースはfullに存在することを確認する。

## 11. SC12-07：草案hashとapply引数を固定helperへ

新workflow repository.sync.push.draft.prepare を追加する。
これはAgentが保存した草案を検査して既存apply引数を返すREADONLY段階。Git操作、草案の書換え、公開、plan消費は行わない。

入力:
~~~text
node <skill-root>/scripts/miku-scm-run.mjs --format json repository.sync.push.draft.prepare --repo <same-repo> --operation <same-operation> --expected-plan-sha256 <prepareで取得したdigest>
~~~

実装:

- scripts/sync-push.mjsにprivateなplan検証を再利用する関数と、exportするprepareSyncPushDraftを追加する。
- 保存済みopがprepared・apply_started=falseであること、root/common/operation/plan digest/current apply contractの一致を検査する。
- pr-draft pathはplan.draft_pathだけを使う。任意pathや新しいbase/headのoverride optionを追加しない。
- 既存draftBytesを再利用し、contained realpath、非空、1MiB以下を確認してbyte SHA-256を計算する。
- 原稿bytes、root、op、plan digest、draft path/digestを使い、既存repository.sync.push.apply用の完全なapply_argumentsを返す。
  workflow_idも別fieldへ返し、文字列のshellコマンドは生成しない。実applyは従来どおり再検証する。
- scripts/miku-scm-run.mjsのregistry、workflow-manifest、cli-contracts、human-output、normative sync-push referenceへ追加する。
  mode分岐を曖昧なdefaultへ落とさず明示する。既存applyの直接入口を保持する。
- 入力fileが変わった場合はapplyが既存digest比較で停止する。helperを呼んだから新しい承認が必要とはしない。
- prepareの長いevidenceを一律切り詰める変更はしない。Agentは必要な変更内容を読む必要がある。
  出力が切れたときは返された同一runのresult.json/plan.jsonだけを読む既存経路を維持する。
  artifactへ分けただけでモデルが読む証拠量も減ったと報告しない。

回帰: 正常の引数生成をfixture上で既存applyへ1回接続。plan/draft pathの改変と空draftの拒否は小さい単体検査。
digest取得後の草案変更、consumed/unresolved opの再利用は停止。既存sync全体の成功ケースを増やさず、1つを新段階経由へ置き換える。

## 12. SC12-08：SKILL・規範文書・対話判断の整理

対象: SKILL.md、references/workflow-routing.md、sync-pull.md、sync-push.md、
approval-handoff.md、runtime-and-test-suites.md、version-increment.md、
DEVELOPMENT.md、routing/guidance tests。

入口SKILLに残す内容:

1. 発火条件と「説明・レビュー・計画」はsync実行を許可しないこと。
2. user request→workflowの短い表。sync pushのprepare→1回の文章生成→draft.prepare→applyを明記。
3. skill-rootとtarget --repoの違い、--formatの配置、同じrunの結果参照。
4. prepared以外は次段階へ進まない、結果不明は再送しない、worktree/backup/stash保持。
5. sync compound requestの途中に追加確認を挟まないことと、bare recommitの局所履歴書換えgate。
6. Issue書込だけに適用する完全一致approveと、現在会話のreview binding。syncの許可と混在させない。
7. 選択した経路の詳細referenceと、開発時の検証規則へのリンク。

長い故障分類・復旧option列・Issue複数操作の詳細は既存referenceへ集約する。
移動した安全規則が必要なworkflowにはmanifestのruntime_referencesを設定し、空のまま「読まれない規則」にしない。
通常syncの詳細読込は例外時だけで済む構成を目指す。
入口の目安は12〜14KiB。数字を合わせるために権限・停止・復旧条件を削らない。

版数だけの更新の扱いを明記する:
4つの正本のversion値だけが変わった場合は整合確認と両skill contract --checkで確認する。
任意のscript変更までversion-onlyと見なさない。実装/契約/テスト変更にはfocusedと最終fullを使う。
実施する軽量判定はSC12-09の全文比較と同じ条件とし、未実装期間は人間/Agentのdiff確認を根拠として記録する。

最低限の対話ケースを本書の実施記録へ表として残す:

- sync pushの成功、up-to-date、prepared以外、同じprepared/draftの再利用、base進行。
- apply結果不明、長い出力の途中切断、draft改変。
- 通常branchのpull、done+merged、done+open PR、PR読取不能への人間回答。
- bare recommit、draft recommit push、git add commitの違い。
- Issue reviewへのapproveと、sync push依頼の区別。
- miku-scmのレビュー/計画だけを頼んだ場合、版数だけを更新した場合。

各行へ期待workflow・進める範囲・停止条件・参照元を付ける。
自動テストはrouting/CLI契約の事実を確認し、モデルの解釈を保証したとは扱わない。
実対話を行うなら対象skillを指定した隔離会話で操作先もfixtureへ固定し、評価を全PRの重い必須CIへ追加しない。
DEVELOPMENTの「pushはmacOS/Windowsだけ」「gh必須」など、現行sourceと古い説明の不一致も同時に修正する。

## 13. SC12-09：CIの起動範囲を厳密化

対象: .github/scripts/contract-ci.cjs、scripts/contract-ci.test.mjs、
.github/workflows/miku-scm-contract.yml、github-writer-contract.yml、
必要時のroot scripts/validate-version-alignment.mjs、CI保守文書。

前提確認:
PR #440等、前回のsync-push分割を含むhosted実行のWindows full成功と時間をREADONLYで確認する。
取得不能・未実行なら前回計画の前提を満たさないと記録し、今回も版数専用CI経路の有効化を保留する。
証拠取得のために実repoへpushやworkflow_dispatchを実行しない。

判定は既存selectorを拡張し、mode=none / versions / fullを返す。既存required check名は保持する。

- versionsにできるのは既知の4つのversion sourceの値だけが変わった場合。
  完全なchanged-file一覧に加え、固定したbase/headの同pathの全文blobを読む。
  root POMのproject.version、VERSION.mdのVersion行、2つのPRODUCT_VERSION literalについて、
  それぞれ一意な対象値だけを同じplaceholderへ置換し、残りのbytesが同一であることを比較する。
  コメントやimportやbuild設定の変更、同じliteralの重複、rename/add/deleteはfull。
  部分patchとファイル名だけでは軽量と判定しない。
- 4sourceが全て同時に変わることを前提にせず、headの4値全体の整合も確認する。
  版数値が不正/不整合なら検証失敗。軽量判定を安全に証明できなければfullへ戻す。
- API失敗、一覧不完全、head/baseの移動、blob読取失敗を成功扱いしない。
  既存の選択前後のPR照合、rename元チェック、常時required gateを維持する。
- .github/の依存は一覧で明示する。共通selectorと両対象workflow自身の変更はfull。
  release/daybook等の別workflow専用変更は、依存がないことを確認したものだけ対象外にする。
  未知の.github pathはfullへ倒す。sharedから雑に全削除しない。
- 外部skill ref値だけの軽量化は今回追加しない。版数経路と異なる同梱・checksumの責務を混ぜず、既存計画の後続項目として残す。

versions job:
Ubuntu / Nodeで4値の整合と両skill contract --checkを実行する。
既存assertVersionAlignmentを再利用し、必要ならvalidate-version-alignment.mjsへ --repo <root> の読込入口を追加する。
既存Mavenからの位置引数呼出しは維持する。単にrunnerの --versionを起動するだけで4値の整合確認としない。
full jobはmacOS/Windowsの両方を維持する。benchmarkの手動専用構成を維持する。

gateはselectの成功とmodeごとに必要なjob成功を要求する。
versions jobのfailure/cancelled/skippedは失敗、full matrix失敗は失敗、noneだけ明示的なskipを許す。
既存required output等の互換fieldを残す場合も、modeとの矛盾を成功としない。

テストは同じfixture表で両skillを確認:
正しいversion-only、version+コード1行、POM plugin変更、VERSION説明追記、rename、欠落/重複literal、
不整合head、不完全一覧、API失敗、head/base移動、既知の別workflow、未知workflow。
gateの3modeと失敗伝播を確認。workflow YAML構文とjob依存関係も確認する。

## 14. SC12-10：fetchと再検査のcostを記録

実fixtureへ委譲するcounting Git wrapperと既存checkpointを使い、no-op、通常pull、dirty sync push、
clean/ahead sync push、recommit後のpreflight停止のコマンド数を記録する。
subprocess数、fetch/ls-remote回数、snapshot/remote照合回数、phase時間を分ける。
fixture準備は計測外にする。ローカルbare remoteの時間をGitHub通信の実測と混同しない。

現行4fetchそれぞれに「何の変更を検出するか」「最後の書込から再利用できるか」を表で対応させる。
特に、草案生成を挟むprepare→apply、push前の期待値、push後の比較を別の条件として扱う。
同じ保証を証明できないチェックは残す。

この単位では恒常的なbenchmark CI・全workflow共通cache・チェック迂回用フラグを作らない。
削減の候補が見つかれば、故障注入条件と影響経路を実施記録へ具体化して次の実装案とする。
Agent tool call数と読む証拠量も、取得できる実測だけ記録し、token数を推定値で報告しない。

## 15. SC12-11：検証と引き渡し

反復中のコマンド例（担当項目のファイルだけを選択）:
~~~sh
node --test skills/igapyon-miku-scm/tests/miku-scm-command-runner.test.mjs
node --test skills/igapyon-miku-scm/tests/sync-push-preflight.test.mjs
node --test skills/igapyon-miku-scm/tests/miku-scm-test-suite.test.mjs
node --test scripts/contract-ci.test.mjs
~~~

規範spec・runner・manifest・契約対象testを変えた単位の終了時:
~~~sh
node skills/igapyon-miku-scm/scripts/miku-scm-workflow-contracts.mjs
node skills/igapyon-miku-scm/scripts/miku-scm-workflow-contracts.mjs --check
~~~
生成lock/tableを直接編集しない。追加moduleはcontract_runtime_sourcesへ結び付ける。
同じsourceが変更されたまま旧contractのplanを適用可能にしない。
新workflowと安全semanticsが変わるworkflowのcontract versionを更新する。
互換性のないplanは再prepareへ案内するが、未解決の公開attemptを破棄・再送しない。

最終tree確定後に必要なものを各1回:
~~~sh
npm run test:miku-scm:fast
npm run test:miku-scm:full
node skills/igapyon-miku-scm/scripts/miku-scm-workflow-contracts.mjs --check
mvn validate
git diff --check
git status -sb
~~~
SC12-09の変更がある場合だけselector tests、両workflow YAML/gate検査、
GitHub Writer contract --checkと関連focused testsも追加する。
SKILLの参照移動がある場合は既存の参照経路検査とリンク照合を行う。
full後に製品treeを変更した場合は影響を判断し、必要な検証を取り直す。成功済みの同一treeでfullを繰り返さない。

引き渡しに必ず含めるもの:

- SC12各IDの実施/未実施、未実施の具体的な条件。
- R1/R2/R3の回帰結果、R5のprocess数、fast/fullのケース増減と対応先。
- Windows native/hostedの実行証拠の有無。platform引数をwin32へ変えただけのテストをWindows実機成功と報告しない。
- SKILLのbytesと読み込むruntime references、対話ケースの確認方法と限界。
- CI軽量化の前提と実際に有効化した範囲、既存required check名と失敗伝播。
- draft.prepareの引数検証、草案改変停止、結果不明時の非再送。
- 残したfetchと理由、後続候補。
- 既存の版数差分・利用者の他の差分を保持したこと。

root TODOの完了チェックと実施記録は、確認できた結果にだけ付ける。

## 実施結果

SC12-00〜11を完了。fast suiteは6 jobs / 22 cases、full suiteは60 jobs / 553 cases成功。両skill contract check、CI selector 6件、skill reference routing 16件、版数整合、`mvn validate`、`git diff --check`も成功した。実測、変更内容、未確認のWindows hosted CIと実モデル対話は[実施記録](miku-scm-review-20261112-execution.md)を参照。

今回の変更後のWindows hosted CI、native Windows、実モデル対話、配備、実GitHub sync、commit/pushは実施していない。既存の版数値 `1.20261112.4` / `20261112d` を保持した。
