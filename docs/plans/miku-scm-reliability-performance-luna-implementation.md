---
title: miku-scm 正確性・復旧・性能のLuna向け改善計画
description: "公開対象の固定、コミット対象の再確認、同期の復旧と診断、guardIgnoredの重複処理削減を小さな実装単位で進める。"
category: plan
status: complete
created: 2026-11-05
updated: 2026-11-05
---

# miku-scm 正確性・復旧・性能の改善計画

## 1. 依頼と実装範囲

2026-11-05のソースレビュー6件と、追加調査で再現した `guardIgnored()` の性能問題を改善する。最初の依頼は **Lunaが実装できる粒度の計画作成**。その後の実装依頼によりLUNA-00〜09を実装・ローカル検証した。最終fullは532/532成功。[実施記録](miku-scm-reliability-performance-execution.md)に結果と未確認環境を記載する。以下の調査・手順は計画時の根拠と採用仕様である。

正本は `skills/igapyon-miku-scm/`。以下の `scripts/`、`tests/`、`references/` は、特記がなければこのディレクトリからの相対パス。

- 調査時HEAD: `2f6916a`、branch: `devel-tiga1103vea`、製品版: `1.20261103.8`。
- 計画作成中に別作業のdaybook更新 `4d9b856` が追加された。miku-scm sourceに変更がないことを確認し、その作業とTODOの追記を保持した。
- 調査時はclean。計画作成による本書とroot `TODO.md` の差分を実装時に保持する。
- 再開時は最新の利用者指示と実際のGit状態を優先する。過去文書のbranchへcheckout/resetしない。
- 実装依頼を受けたときの範囲はsource・規範文書・契約・ローカル検証。公開、配備、版数更新はそれぞれの依頼で扱う。
- テストは一時Git repository、ローカルbare remote、固定された外部I/Oの代替を使う。実利用repositoryやGitHub上のデータは検証対象にしない。

## 2. 確認済みの根拠

| ID | 優先度 | 再現した問題 | 主な場所 |
| --- | --- | --- | --- |
| R1 | P1 | 保存した公開計画のbranch Aから同じHEADのbranch Bへ切り替えてもBへpush成功 | `post-recommit-publish.mjs` の `executePublish()` |
| R2 | P1 | 計画保存後にorigin URLを別bare repositoryへ変更してもpush成功 | 同ファイルの `savePublicationPlan()` |
| R3 | P1 | check中に同じHEADの別の-done branchへ切り替えるとそこへcommit成功、結果は元branchを表示 | `work-commit.mjs` のcheck後〜commit |
| R4 | P2 | lock取得後、operation作成前にprocessが終了すると通常再実行はlock停止、abortもENOENT | `miku-scm-sync-state.mjs` の `lock()` / `openSync()` |
| R5 | P2 | 通常commitのcheck失敗を解消してsync pushを再実行しても別種の復旧判定で停止 | `sync-push.mjs` の `continuePendingPush()` |
| R6 | P2 | 存在しないremoteへのfetch失敗がexit 128だけになり、原因と修復先が分からない | `miku-scm-sync-state.mjs` の `syncGit()` |
| R7 | P2 | 同じ未追跡directoryを対象ファイルごとにcheck-ignoreし、別processを繰り返す。case照合も同じdirectory一覧を繰り返し読む | `miku-scm-sync-worktree.mjs` の `guardIgnored()` |

R1/R2は単体の `pr.publish.apply` 経路で再現した。sync pushには別途snapshot/remote検証があるため、全公開経路が同じ程度に無防備と説明しない。

レビュー時の確認: miku-scm full **487成功、0失敗、約132秒**。契約37件はcurrent。以下はその後の追加再現で、既存テストに不足していた条件である。Windows実機・実GitHubでの実行証拠は今回取得していない。

性能計測はmacOS、Git 2.54.0、`guardIgnored()` 1回、同一directory内のファイル群で実施した。

| 条件 | ファイル群の件数 | check-ignore process数 | 時間 |
| --- | ---: | ---: | ---: |
| 全件追跡済み、ignorecase=true | 1,000 | 0 | 0.79秒 |
| 全件追跡済み、ignorecase=true | 3,000 | 0 | 6.29秒 |
| 全件追跡済み、ignorecase=false | 3,000 | 0 | 0.11秒 |
| 取り込み先と重なる未追跡directoryが存在 | 1,000 | 1,000 | 11.90秒 |
| 同上 | 3,000 | 3,000 | 35.43秒 |

最後のケースはremoteの `incoming/file-*.txt` と、localの未追跡 `incoming/local.txt` で作れる。新しい対象ファイル自体はlocalに存在しない。`check-ignore incoming` が3,000回繰り返された。実験用wrapperで同じ判定を再利用すると1process、約0.42秒になった。これは製品修正後の測定値ではない。

元の報告の実行ログ・対象repository・配備版は不明であるため、その実行の原因を確定したとは扱わない。本書のfixtureだけで問題を再現できるようにする。`/private/tmp/` の調査用ファイルを実装の必須入力にしない。

## 3. Lunaへの作業の渡し方

1回の作業は下表の **1行** を基本とする。同じファイルを複数の担当が同時に編集する形にしない。各行で「失敗する回帰条件の固定 → 実装 → 対象テスト → 契約更新 → 差分確認」を完了し、結果を記録して次へ進む。

性能2項目を独立した最初の作業にし、その後P1を3項目、復旧・診断を3項目で処理する。公開前にはP1の3件を完了条件にする。

| 順序 | 作業ID | 内容 | 主な製品ファイル | 前提 |
| --- | --- | --- | --- | --- |
| 0 | LUNA-00 | 開始状態と検証記録 | 文書のみ | なし |
| 1 | LUNA-01 | check-ignoreの同一path判定を再利用 | `miku-scm-sync-worktree.mjs` | 00 |
| 2 | LUNA-02 | case照合用directory一覧を再利用 | 同上 | 01 |
| 3 | LUNA-03 | 保存公開計画のbranch固定 | `post-recommit-publish.mjs` | 00 |
| 4 | LUNA-04 | 保存公開計画のremote URL固定 | 同上 | 03 |
| 5 | LUNA-05 | commit直前と直後のbranch/HEAD確認 | `work-commit.mjs` | 00 |
| 6 | LUNA-06 | check失敗後のsync push再準備 | `sync-push.mjs` | 05 |
| 7 | LUNA-07 | 初期化段階で残ったsync lockの取消 | `miku-scm-sync-state.mjs`、`sync-pull.mjs`、`sync-push.mjs` | 06 |
| 8 | LUNA-08 | sync Git失敗の原因と案内 | `miku-scm-sync-state.mjs` | 07 |
| 9 | LUNA-09 | 全体検証と最終記録 | 契約、reference、テスト | 01〜08 |

実装開始時に同じdirectoryへ `miku-scm-reliability-performance-execution.md` を作り、作業IDごとに変更、実行コマンド、結果、残件を追記する。root TODOの同じIDも実施済みのものだけ更新する。

### LUNA-00: 開始確認

- `DEVELOPMENT.md`、root `TODO.md` 冒頭、適用される `AGENTS.md`、本計画の担当項目を読む。GOAL/HANDOFFの古い日付の状態は履歴として扱う。
- `git status -sb`、`git rev-parse HEAD`、`git diff --stat`、`git diff --cached --stat`、Node/Git版を記録する。
- 変更前baselineは担当項目のfocused testsとcontract check。レビュー時の487件成功を新しい変更の成功証拠に流用しない。
- 新しいテストには実helperを使い、外部I/O境界のみを代替する。製品の返却値をmock側で都合よく補わない。

### LUNA-01: check-ignore判定の重複削減

**変更:** `guardIgnored()` 内だけに `Map` を置く。keyはcase照合後の実際のrepository-relative path。値はignore判定のboolean。

1. `ignored(name)` を小さな内部関数にする。cache hitなら保存値を返し、miss時だけ現行の固定argvでGitを呼ぶ。
2. `syncGit` の `code` が0ならtrue、1ならfalse。その他の終了・spawn失敗は検査失敗として停止し、falseとしてcacheしない。
3. cacheは関数のローカル変数とし、呼び出し終了時に破棄する。stash前後、別operation、別processへ引き継がない。
4. 現在のmanaged pathの除外、symlink検査、ignored衝突停止を維持する。検査対象の木と検査回数は減らさない。
5. `references/sync-pull.md` に「1回のguard内で同一pathのignore判定を再利用する」と追記する。

**テスト:** 新規 `tests/miku-scm-sync-guard.test.mjs` を作る。`sync-fixture.mjs` を使い、`guardIgnored({root, git: countingGit}, [target])` を直接実行する。Git呼び出しは実 `syncGit` へ委譲し、check-ignoreの引数・件数だけ数える。

- remoteで `incoming/file-000.txt` 〜100件をcommit。localに未追跡 `incoming/local.txt` だけを置く。fetch後のbase SHAをguardへ渡す。
- 100件全てを調べても `check-ignore incoming` は **1回**。初期化helperの呼び出しはcountの対象外にする。
- `incoming/` をignoreしたケースは従来どおり停止し、localの内容を保持する。
- 同じctxでguardを再実行する前にignore ruleを変更し、2回目は新しいruleで停止する。cacheの呼び出し間漏れを検出する。
- check-ignoreにcode 128を注入した場合は停止する。

`node --test skills/igapyon-miku-scm/tests/miku-scm-sync-guard.test.mjs skills/igapyon-miku-scm/tests/sync-pull.test.mjs`

**完了条件:** 上記件数と既存ignored保護テストが成功。今回はpathごとのmemoizationを採用する。stdin一括化・並列process化は、重複除去後に残る実測上の問題がある場合の別改善とする。

### LUNA-02: directory一覧とcase照合の重複削減

**変更:** 同じguard内にdirectoryごとのcacheを追加する。

1. `readdir` の結果を、`Map<parentRelativePath, Map<normalizedName, string[]>>` に変換して保存する。正規化は既存 `key()` のNFC/lowercaseを使う。
2. 各path要素の候補取得を毎回の `entries.filter()` からMap lookupに変える。対象keyの候補が2件以上なら既存どおり曖昧として停止する。対象外の名前の衝突まで新たに停止理由にしない。
3. ENOENT/ENOTDIRでの中断、symlinkを辿らない条件、`lstat` による実体確認を維持する。cacheはguardの呼び出し間で共有しない。
4. テスト用の読取境界として `guardIgnored(ctx, commits, dependencies = {})` に任意の `readdir` 関数を注入できるようにする。通常呼び出しは今の2引数のまま、実filesystemを使う。CLIへは公開しない。

**テスト:** LUNA-01の新規ファイルへ追記する。

- `core.ignorecase=true`、追跡済み100ファイルが同じdirectoryにある場合、実readdirへ委譲するcounting wrapperで、同じparentの読取が1回以下であることを確認する。
- case違いのignored衝突、symlink、追跡済みのignored配下ファイルの既存保護条件を確認する。
- 曖昧なcase aliasは最小のreaddir fixtureで検証する。macOS/Windowsで大小文字だけ違う実ファイルを作れると仮定しない。
- 2回のguardの間でdirectory内容を変え、2回目に変更を検出する。
- `core.ignorecase=false` の既存経路も成功する。

**性能記録:** 100/1,000/3,000件の同一directory fixtureで、guard1回の時間、check-ignore回数、readdir回数を記録する。CIの合否は絶対秒数でなく重複呼び出し回数と保護結果で判定する。変更後もpullのstash前後2回、next-workのcheckout前の検査を実行する。

### LUNA-03: 保存公開計画のbranch照合

**変更:** `executePublish()` で計画の `branch` を内部の期待値として `runPublish()` へ渡す。内部引数は `dependencies.expectedPublicationBranch` とする。

1. `runPublish()` の最初のbranch取得時に期待branchと厳密一致を確認する。
2. `git fetch` 後、`beforeMutation` callbackの前にbranch/HEAD/cleanを再確認する。
3. `beforeMutation` と既存 `validateSyncSnapshot` callbackの後、pushの直前にも同じ確認を行う。callbackによる状態変更も取り逃さない。
4. 期待値がない直接呼び出しでも、開始時のbranchを以降の照合に使う。`executePublish()` が設定する期待値は、渡されたdependenciesで上書きされない順に構築する。
5. push後のbranch renameも検証したbranchへだけ実施する。保存計画のbranchを現在branchで作り直さない。

**テスト:** `post-recommit-publish.test.mjs` に `saved publication ...` で始まる名前を追加する。既存suiteのshardへ必ず1回だけ入る名前にする。

- Aでpreflight保存、同じHEADのBへswitch、適用。push/renameなし、両remote branch不変。
- fetchの直後のbranch切替をGit wrapperで注入し、pushなし。
- 同じbranch/HEADで適用すると従来どおり成功。
- 停止がattempt claim前なら `mutationInvoked=false`。claim後なら既存の不確実性の扱いを維持し、再送しない。

`node --test skills/igapyon-miku-scm/tests/post-recommit-publish.test.mjs skills/igapyon-miku-scm/tests/pr-recommit-push.test.mjs`

### LUNA-04: 保存公開計画のURL照合

**変更:** `post-recommit-publish.mjs` 内へprivateな `publicationRemoteDigest(git, root, remote)` を追加する。

1. `git remote get-url --all <remote>` と `git remote get-url --push --all <remote>` の返却行をそれぞれ配列にする。末尾改行だけを除き、URL自体をlowercase化・認証情報除去・別表記への変換をしてから比較しない。
2. `sha256(JSON.stringify({fetch_urls, push_urls}))` を返す。URL本文は新しい結果・計画・エラーへ記録しない。
3. `runPublish()` のpreflight結果に `remote_urls_sha256` を追加する。開始時に採取し、preflight返却前にも再確認する。
4. `savePublicationPlan()` をschema 2にし、同digestを保存する。`loadPlan()` はschema 2と64桁digestを必須にする。schema 1は「preflightを取り直す」と明示して停止する。適用時のURLを旧計画へ補って承認済み扱いしない。
5. `executePublish()` は内部 `dependencies.expectedPublicationRemoteSha256` として計画値を渡す。開始時、fetch後、push直前に再計算して照合する。LUNA-03の照合位置と揃える。
6. `pr-recommit-push.mjs` の初回公開preflightとrecommit後preflightの `branch` / `remote_urls_sha256` も照合し、変更後の送信先で新計画を作らない。既存sync側のチェックも通す。
7. `references/github-post-recommit-publish.md` と `references/github-pr-recommit-push.md` に計画のbindingと旧形式の取り直しを反映する。

**テスト:** 一時bare remoteを2つ使う。保存後にfetch URL、push URL、URL配列をそれぞれ変更して停止すること、どちらのremoteにもpushされないこと、無変更なら成功することを確認する。fetch中に変更するケースも追加する。旧schema停止、digest欠落、計画改ざん、既存remoteへの明示leaseは既存テストと合わせて確認する。mock preflightも実helperの新しいdigestを持つ形式に揃える。

`node --test skills/igapyon-miku-scm/tests/post-recommit-publish.test.mjs skills/igapyon-miku-scm/tests/pr-recommit-push.test.mjs skills/igapyon-miku-scm/tests/sync-push.test.mjs`

### LUNA-05: work.commitの対象を再確認

**変更:** `work-commit.mjs` に、開始時のbranchとHEADを読む小さな照合関数を追加する。

1. 開始時のdetached HEADはstaging前に停止する。
2. staging直前、全check完了後のcommit直前に開始branch/HEADとの一致と非-doneを確認する。既存のstaged digest・unstaged・untracked検査も通す。
3. commit直前に `git write-tree` で予定treeを記録する。
4. commit後は現在branch、HEADの親、treeを確認する。branchは開始値と一致、親は開始HEADのみ、treeは予定treeと一致が成功条件。不一致は実測したbranch/HEADを添えてpartialで返す。巻き戻しや自動再commitはしない。
5. 検査中のbranch/HEAD不一致は、staging済みなら既存のpartial経路へ返す。成功結果へ古いbranch名だけを残さない。
6. `references/work-commit.md` に照合とpostconditionを記載する。

**テスト:** `work-commit.test.mjs` の `resolveChecks` / `command` 注入を使う。check中に同じHEADの別branch（通常と-done）、同じbranchで空commitを作るケースを分け、対象commitが追加されないことを確認する。さらにfixture内のcommit hookがindexを変えた場合は成功報告にならないことを確認する。通常commit、改行、binary diff、チェック失敗後のindex保持は既存テストを維持する。

`node --test skills/igapyon-miku-scm/tests/work-commit.test.mjs skills/igapyon-miku-scm/tests/sync-push.test.mjs`

### LUNA-06: チェック失敗後のsync push再準備

**採用する範囲:** 次の全条件を満たす、commit前の既知の停止だけをplain sync pushで再準備できるようにする。

```text
pending pushは1件、同一branch/remote
op.status === partial、op.phase === work-commit、apply_startedは偽
op.commit.result.status === partial
op.commit.result.stage は pre-commit-check または post-check-verify
op.commit.result.head_before === op.original.head === 現在HEAD
現在branch === op.original.branch
backup_branch / recommitted_head / delegate は存在しない
saved remote設定は現在も一致、Gitはidle
```

1. `continuePendingPush()` に上の専用分岐を、公開前失敗の既存復旧判定より前へ追加する。
2. 条件成立時は旧operationを `superseded` にし、理由を保存する。現在のindex・worktreeをそのまま新しいprepareへ渡し、通常のsensitive path検査とcheckをやり直す。
3. 一度の呼び出し内で繰り返しretryしない。新しいcheckが失敗すればその結果で停止する。
4. 最初の失敗結果に `reason: committed.reason ?? committed.message` を設定し、元のcheck stageを `commit.result.stage` に保持する。対象条件を満たす停止には `next_command: "miku-scm sync push"` と「報告されたcheckを直して再実行」の案内を返す。
5. commit段階での停止、変更されたHEAD、公開開始済み、結果不明はこの分岐に入れない。既存の確認・取消・未公開recommit復旧経路を保持する。
6. `references/sync-push.md` と `SKILL.md` の再実行説明へこの狭い条件を反映する。

**テスト:** 実 `runWorkCommit()` を利用し、checkだけを1回失敗→2回目成功にする。最初はpartialでHEAD不変、次のplain prepareはprepared、新規通常commitは1件、旧operationはsuperseded、公開はまだ0回。sensitive pathが新たに増えた場合は再同意待ち。branch/HEAD/remote変更、stage=commit、unresolved公開は自動再準備しない。

`node --test skills/igapyon-miku-scm/tests/sync-push.test.mjs skills/igapyon-miku-scm/tests/miku-scm-sync-push-output.test.mjs`

### LUNA-07: operation作成前に残ったlockの取消

**方針:** 初期化を証明する新しいlock記録を導入し、既存の明示 `--abort` / `--cancel` で取り消せるようにする。プロセスの生存確認と対象IDの一致を必須にする。

内部仕様を次に固定する。

- 新しいlock JSONに `schema_version: 2` と `phase` を追加する。既存token/pid/operation/rootも保持する。取得時に対象operationが存在すれば内容を検証して `operation-recorded`、新規operationで記録がないときだけ `initializing` にする。既存operationのapply/resumeをinitializing扱いしない。
- `newOperation()` はstate.jsonの保存後に、所有tokenを照合したlockを `phase: "operation-recorded"` へatomic更新する。更新に既存 `writeJson()` を使う。
- 所有lockのfile/tokenはctx内の実行中情報として保持する。phase更新失敗ではmutationへ進まない。lock取得途中の例外では、取得済みhandleと自分のlockを確実に片付ける。
- `lock(ctx, id, recover = false, { allowMissingInitialization = false } = {})` と `openSync()` の対応する内部引数を追加する。通常呼び出しの意味を維持する。
- `allowMissingInitialization` はpullの明示abort、push prepareの明示cancelだけでtrueにする。resumeや普通の再実行ではtrueにしない。
- 旧processがESRCHで終了済み、root/id一致、schema 2、phase=initializing、該当operation directory自体がENOENTのときだけ、記録未作成の取消を許す。directoryがあるがstate欠落の場合は証拠不完全として停止する。
- この経路は `ctx.recoveredInitialization = true` を設定する。既存と同じlock内容の再照合、unlink、排他的再取得を通す。別processのlockを消さない。
- 呼び出し元はそのflagと明示abort/cancelを確認し、`loadOperation()` 前に `status: "cancelled"`、`mutation_invoked: false`、対象operation ID、初期化取消のreasonを返す。finallyで自分のlockを解放する。
- operationが存在する場合は現行のload/検証/復旧へ進む。phase更新前に落ちてもstateがあれば既存復旧が使える。
- 旧形式lockのoperationが存在する場合は既存互換。旧形式・壊れたJSON・live PID・別root/id・operation-recordedなのにstate欠落は、新しい取消対象にしない。
- `references/sync-pull.md` と `references/sync-push.md` に、保存IDを使う明示abort/cancelと、新規syncを始め直す手順を記載する。空・壊れたlockやstate欠落を、単なる初期化中断と推測して解除しない。

**テスト:** 新規 `tests/miku-scm-sync-lock-recovery.test.mjs`。実child processを一時repoで起動し、lock作成後の最初のbranch照会で `process.exit(93)` を注入する。親は終了を待ち、lock JSONからIDを読む。明示abortでcancelledになり、その後の新規pullが成功することを確認する。pushのcancelも確認する。再現に任意のsleepや架空の死んだPIDを使わない。

live PID、別root/id、operation-recordedでstate欠落、旧形式でstate欠落、既存operationありの各否定条件を追加する。既存operationのapply/resumeが取得するlockはoperation-recordedであることも確認する。lockを時間経過だけで回収するテストにしない。

`node --test skills/igapyon-miku-scm/tests/miku-scm-sync-lock-recovery.test.mjs skills/igapyon-miku-scm/tests/sync-pull.test.mjs skills/igapyon-miku-scm/tests/sync-push.test.mjs`

### LUNA-08: sync Git失敗の診断

**方針:** 生のstderrをそのまま出力する方法を避け、固定分類と具体的な案内を返す。分類できないものはunknownとして扱う。

1. `miku-scm-sync-state.mjs` に純粋関数 `describeSyncGitFailure(args, result, stderr)` をexportする。argv全体・URL・stderr本文を返却値に含めない。
2. `{ command, exit_code, signal, spawn_error, category, summary, next_action }` を返す。commandは固定された `args[0]`。spawn_errorはNodeのcode、summary/next_actionは分類ごとの固定文。
3. 優先順はtimeout（ETIMEDOUT）、実行ファイルなし（ENOENT）、明示的な認証失敗、DNS解決失敗、接続失敗、repository不在/アクセス不可、その他permission、unknownとする。stderrの判定は純粋関数内に閉じる。
4. `syncGit()` の例外に `gitDiagnostic` を付け、messageに固定summaryを含める。`failure()` が存在すれば `diagnostic` として保存する。
5. 作業未変更の失敗は分類のnext_actionを使う。partialの場合は保存operationの復旧案内を優先し、通信エラーだから同じmutationを再送してよいとは表示しない。
6. human出力は既存reason/next_actionで原因と次の操作が読めるようにする。新しいログ収集CLIは作らない。

**分類と案内の例:** DNS→接続とremote host設定を確認、authentication→対象hostの既存認証を確認、repository-unavailable→remote URLとアクセス権を確認、missing executable→Gitの導入/PATHを確認、timeout→通信状態を確認、unknown→exit codeと停止段階をもとに環境を調査。

**テスト:** 新規 `tests/miku-scm-sync-diagnostics.test.mjs` に分類表と機密値の非露出を確認する。URL userinfo、token付きURL、Authorizationらしき文字列、ローカルpathをfixture stderrへ入れ、出力に含まれないことをassertする。実runSyncPullで存在しないローカルbare remoteを指定し、repository-unavailableと具体的案内がresultへ届くことを確認する。partial/unresolvedの再送禁止も既存テストで確認する。

`node --test skills/igapyon-miku-scm/tests/miku-scm-sync-diagnostics.test.mjs skills/igapyon-miku-scm/tests/miku-scm-sync-push-output.test.mjs skills/igapyon-miku-scm/tests/sync-pull.test.mjs`

## 4. 契約、文書、テストの共通更新手順

各項目で変更した規範と実装をセットで保存する。生成物はgeneratorで作る。

この計画で採用する最終contract versionは次のとおり。担当項目で一度だけ更新し、途中で同じversionを繰り返しincrementしない。着手時に現行versionが既に違う場合は、その理由を確認して実施記録へ記す。

| Workflow | 調査時 | 計画の最終値 | 更新担当 |
| --- | ---: | ---: | --- |
| repository.sync.pull | 1 | 2 | LUNA-01 |
| repository.sync.push.prepare | 3 | 4 | LUNA-06 |
| repository.sync.push.apply | 2 | 3 | LUNA-04 |
| pr.publish.preflight | 1 | 2 | LUNA-03 |
| pr.publish.apply | 1 | 2 | LUNA-03 |
| pr.recommit.push | 1 | 2 | LUNA-04 |
| work.commit | 1 | 2 | LUNA-05 |

manifestの該当entryと `miku-scm-workflow-manifest.test.mjs` の期待値を変更する。共有のdefault定数を一括変更しない。publication計画schemaはLUNA-04で2へ変更する。runner全体のschemaを増やす必要はない。

新しいguard/lock/diagnosticテストはfull suiteが自動収集する `*.test.mjs` とし、fast suiteにも入る `miku-scm-` 接頭辞を使う。規範contract testである既存 `sync-pull.test.mjs` には、実runSyncPull経由の代表ケースも残す。shard対象ファイルに追加する名前は既存のprefix規則に合わせる。

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-workflow-contracts.mjs
node skills/igapyon-miku-scm/scripts/miku-scm-workflow-contracts.mjs --check
git diff --check
git status -sb
```

変更したruntime/specのdigestが変わるので、manifestを更新しない小項目でも契約再生成が必要。生成lock/tableの差分が、該当sourceを使うworkflowへ波及することは正常。digest固定値を手作業で合わせない。

## 5. LUNA-09: 最終確認と受け渡し

- R1〜R7の回帰ケースと、元の成功経路・停止経路を対にして確認する。
- LUNA-01/02の性能は、プロセス回数・directory読取回数と実時間を記録する。1,000/3,000件は手動計測、通常CIは100件とcount assertionsを基本にする。
- 反復中は担当focused testsとfast suiteを使い、実装の受け渡し前にfull suiteを1回通す。一部項目だけを実装して受け渡す依頼でも、その変更のfull検証は実施する。
- contract drift check、`git diff --check`、関連diff確認を完了する。合格後に変更がなければ同じ検査を繰り返さない。
- Windowsについては既存macOS/Windows CIの実結果を記録し、ローカルmacOS成功からWindows成功を推定しない。
- 実施記録とroot TODOに、完了ID、テスト結果、未着手ID、実測値、未確認環境を記載する。

```sh
npm run test:miku-scm:fast
npm run test:miku-scm:full
node skills/igapyon-miku-scm/scripts/miku-scm-workflow-contracts.mjs --check
git diff --check
git status -sb
```

## 6. 作業開始用の短い指示

以下は計画時の初回指示例。LUNA-00〜09は実装済みのため、再開時は先に実施記録と現行sourceを照合し、最新の依頼範囲を決める。

```text
docs/plans/miku-scm-reliability-performance-luna-implementation.md に従い、
LUNA-00とLUNA-01を実装してください。
実helperを使った回帰テスト、対象テスト、契約再生成、受け渡し前のfull検証まで行い、
実施記録とTODOへ結果を残してください。
```

計画時はLUNA-02以降も1項目ずつ進める想定とした。所要時間の長さだけを理由に保全・照合の検査を削らず、本計画のcount条件と実際の保護結果を完了基準とした。
