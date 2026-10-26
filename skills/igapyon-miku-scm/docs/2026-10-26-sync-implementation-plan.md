---
title: miku-scm sync pull / sync push 実装計画
status: implemented-locally-verified
created: 2026-10-26
updated: 2026-10-26
---

# sync pull / sync push 実装計画

## 1. 対象と現在地

[合意仕様](2026-10-26-sync-pull-push-spec.md)に基づく実装計画。最新の追加要望として、`sync pull` の入口で `github merge done` 相当の処理を条件付きで行う案を含める。**現在branchが `-done` でなければ、PRのマージ済み確認は行わない。**

計画作成時のHEADは `9e9fec5916fe110b6f21552403547d5412b9ebcd`、branchは `devel-tiga1026meh`。状態文書、合意仕様、および共通版 `1.20261026.3` / Mikuku `20261026c` の更新差分が未stage・未commit。これらを保持する。

利用者の後続の実装指示に基づき、以下をsourceへ実装した。実施結果は第14節へ記録する。実repositoryへのsync、配備、commit/pushは実施していない。実装前の計画として書かれた工程・受入条件と、実際のローカル検証を区別する。

## 2. sync pull の入口

| 現在の状態 | PRのマージ照会 | 処理 |
| --- | --- | --- |
| 通常の作業branch | しない | Gitでbaseを取得し、通常の同期へ進む |
| `-done`、対象PRが正確にマージ済みと確認できる | する | 次の作業branchを取得したbaseから作り、必要な変更を引き継ぐ |
| `-done`、PRがOpenまたは未マージでClosed | する | 旧branchを保持して停止 |
| `-done`、PR不明・複数候補・取得失敗・対応不一致 | する | 確認できない理由を示し、tracked内容・HEAD・indexを変更せず停止 |
| syncの途中失敗記録が残る | 原則として再開状態を先に照合 | 新しい同期やstashを重ねず、保存済みoperationの回復へ案内 |

このPR確認は `sync pull` の `-done` 経路だけに追加する。通常branchでも必要なfetchや公開済みcommitのGit上の確認は行うが、PR照会は起動しない。

明示的な `github merge done` は従来どおり人間のマージ報告を受ける操作として残す。自動経路では、現行helperへ推測で `--confirmed-merged` を渡さず、検証済みPR情報を受け取る別の内部経路を作る。既存の凍結branch規則に、この限定された例外を文書化する。

## 3. マージ確認の証拠

現行 `post-merge-next-work.mjs` は `--confirmed-merged` と `-done` を要求するが、GitHubで対象PRを検証していない。repository-maintenanceには、公開記録とbranch/HEADに対応するPRを探す処理がある。これを参考に、**削除判定やメンテナンスapplyを呼ばず**、検証に必要な部品を分離する。

### 3.1 照合条件

次のすべてを満たした場合だけ、自動で次branch作成へ進む。

1. repositoryの実パス、選択remote、GitHub repository、対象baseを一意に解決する。
2. 公開済みplan/receiptがあれば、repository・旧branch・公開HEADが現在の `-done` branch/HEADと一致するものを使う。mtimeや最新ファイルだけでは選ばない。
3. 対象PRのhead repository、head branch、head SHAが、実際に公開した作業branchと現在HEADに一致する。legacy記録がなければ `-done` を除いたbranch名から探せるが、同じ厳密照合を要求する。
4. base repositoryとbase branchが取り込み対象に一致する。
5. PR詳細が `merged: true`、`merged_at` が有効、`state: closed` を示す。
6. **マージ後の** `merge_commit_sha` が取得したbase commitの祖先である。baseには、その後の他の人のマージが含まれていてよい。
7. branch/HEAD/remote設定/index/作業内容が確認中に変わっておらず、未処理の同期operationがない。

Squash / Rebase mergeでは旧PR HEADがbaseの祖先にならない場合がある。PR HEADの祖先判定だけでマージ済みとは判定しない。GitHub APIの `merge_commit_sha` はPRの状態とマージ方法で意味が変わるため、上記5の確認後に6を評価する。[GitHub公式仕様](https://docs.github.com/en/rest/pulls/pulls#get-a-pull-request)

### 3.2 固定READONLY helper

新設する `scripts/miku-scm-pr-merge-state.mjs` の内部でのみ、検証済み入力から以下の固定GETを呼ぶ。

```text
gh api --method GET repos/<owner>/<repo>/pulls -f state=all -f head=<owner>:<branch> -f base=<base> -f per_page=100
gh api --method GET repos/<owner>/<repo>/pulls/<positive-number>
```

- 最初の一覧から正確に一つを選び、その番号を使って詳細を再取得する。検証済み公開記録に正確なPR番号があれば一覧を省略できる。
- 初版は既存helper同様、一覧が100件に達したら完全な照合とは扱わず停止する。古い候補から「最新」を推測して選ばない。
- 固定15秒timeout、malformed JSON、欠落field、403/404/429、認証失敗を区別する。取得失敗は「PRなし」「未マージ」へ変換しない。
- Agentによる直接の `gh` 呼び出し、任意引数・endpoint・hostnameの受け渡し、login/token操作は追加しない。`github-cli-static-helper-policy.md` に新しい用途と正確な引数配列を追記する。
- 同一repository内のPRを初版の自動移行対象とする。forkや解決不能なpush先は自動移行せず理由を示す。通常branchでのローカル同期までGitHub CLI必須にはしない。
- 証拠はrepository/branch/HEAD/base/PR番号/merged日時/merge SHA/照会日時へ束縛して記録する。ユーザー入力のbooleanをマージ証拠にしない。

`gh api` はfield追加時に既定methodがPOSTへ変わるため、GETを明示する。[GitHub CLI公式仕様](https://cli.github.com/manual/gh_api)

## 4. 共通構成と実装先

新規ファイル名は本計画上の案。既存の同等部品があれば重複実装せず抽出する。

| 部品 | 責務・変更先 |
| --- | --- |
| sync operation状態 | `scripts/miku-scm-sync-state.mjs`：実パス、branch/HEAD/base、branch作業開始点、実際のremote接続先、pathと内容digest、処理段階、排他claim、復旧記録 |
| 作業の退避・復元 | `scripts/miku-scm-sync-worktree.mjs`：backup、正確なstash SHA、indexを含む復元、部分失敗の記録 |
| PR確認 | `scripts/miku-scm-pr-merge-state.mjs`：前節の固定READONLY APIと照合 |
| 次branchの共通処理 | `post-merge-next-work.mjs` からbranch作成・tag助言・検証のcoreを抽出。人間報告と検証済みPRの入口を分ける |
| pull | `scripts/sync-pull.mjs`：通常同期と `-done` の自動移行を統括 |
| push | `scripts/sync-push.mjs`：commitを含むprepareと、文案を受けるapplyを統括 |
| 既存部品 | `work-commit.mjs`、`pr-recommit-push.mjs`、writing evidence、publication plan、command runnerを再利用 |

operation記録はGitで無視される `workplace/miku-scm/sync/operations/<operation-id>/` に置く。保存先が無視されること、path containment、repository/worktreeのidentityを確認する。未知のrepositoryの `.gitignore` は自動編集しない。

`prepared-plan.json` 等の不変入力とdigest、処理中のstate/eventsを分ける。operationは正確なIDで引き継ぎ、globalな最新記録から選ばない。開始前に排他claimを保存し、外部のGit操作による状態変更も各mutation直前に再確認する。

stash作成・rebase・branch作成・復元・pushは、それぞれ開始前にattemptを保存し、結果を確認してから次段階へ進める。process中断等で段階の成否が不明なら、現在状態との照合から回復し、stash作成や適用を無条件で再実行しない。

現在のlocal snapshotはdirty件数等を含むが、同じ件数のまま編集された内容を識別できない。新しいsyncの再検証には、indexのbinary diff、tracked作業差分、未追跡pathと内容のdigestも使う。内容自体をログへ出さない。

### 4.1 作業branchのbase記録

remote-tracking refの直前値だけでは、別のstatus/fetchで既に取り込まれたbaseの履歴書き換えを検出できない。branch作成時または最後に正常完了した同期時のbase SHAを、実パス・common Git dir・branch・remote接続先・base refと対応付けて保持する。

sync側は作成・復元の完了後にこの記録を保存する。旧明示post-merge経路はrunnerの成功記録を移行元とする。既存の作業branchでは、対応を検証できる過去のbranch作成run記録から移行できる。記録がない場合もno-op/安全なFFは可能だが、分岐しているbranchのrebaseでは「作業開始点が未確認」として停止する。現在のmerge-baseを、根拠なしに自分の作業開始点へ読み替えない。

記録がないままHEADがbaseより先にあるno-opでは、新たなbase記録を作らない。確認不要の終了を経て、不明な作業開始点が次回rebaseの根拠になることを防ぐ。新baseとHEADが一致する安全なFF/初期状態、または検証済みの作成・同期記録からだけ、最初のbase記録を確立する。

rebase時は、記録したbaseが現在HEADと取得した新baseの両方の祖先であることを確認し、記録baseからHEADまでのcommit列を再適用対象とする。記録baseが新baseに含まれなければ、削除された旧共有commitを再適用せず停止する。履歴書き換えの検査は、取り込み不要かどうかを分類する前に行う。記録の更新は検証済みの完了時だけとし、途中失敗はoperationの固定baseで回復する。

### 4.2 remote接続先の固定

remote名が同じでも、fetch URLとpush URLは異なることがある。`remote get-url --all <remote>` と `remote get-url --push --all <remote>` で展開後の接続先を取得し、URL配列のdigestと、資格情報を除くrepository identityをsnapshot・不変plan・公開証拠へ束縛する。URLに埋め込まれた資格情報はログへ出さない。[Git公式仕様](https://git-scm.com/docs/git-remote)

初版のsync pushは、fetch/push先が各一つで同じrepositoryを指す設定を対象にする。複数push先、mirror、解決不能または異なるrepositoryを指す設定はcommit前に停止する。prepare→apply、core委譲後のfetch/reset/push直前、push後の検証でも接続先を再確認し、同じremote名だけを根拠に継続しない。通常pullは取得先の固定を行うが、push経路を新設したりPRを照会したりしない。

### 4.3 claimと中断中のpush準備

実行中の排他lockと、文案待ちのoperation状態を分ける。lockは共通Git dirに対応させ、同じrepositoryの複数worktreeでも同時にsyncを進めない。prepareが正常に文案待ちへ移る時点で実行lockを解放し、不変planを残す。時刻やPIDだけで途中のattemptをなかったことにせず、停止したprocessと保存状態を照合して回復する。

push prepareには、通常開始と排他的な `--resume <operation-id>` / `--cancel <operation-id>` を用意する。

- 文案待ちのresumeは同じoperationと保存済みevidenceを検証して返却する。すでに成功したcommitを繰り返さず、不変planのevidenceも書き換えない。HEAD/base等が変わっていれば古いplanは使わない。
- apply未開始が確認できるcancelは、planを無効化しoperationを閉じる。commit、作業内容、文案、backupは保持し、履歴を巻き戻さない。
- 次に `sync pull` を依頼された場合も、apply未開始のpush準備だけは `superseded` として閉じて通常pullへ進める。これにより、base進行でpushが止まった後に、古い準備記録が必要なpullを妨げない。古いplanでのapplyは拒否する。
- apply開始後・途中失敗・remote結果不明の場合は上記の自動失効を使わず、そのattemptの照合と既存の公開回復手順へ進む。

## 5. 退避・復元と停止後の状態

- 同期不要ならstashやbackupを作らず、staged/unstaged/untracked状態も保つ。
- 内容またはHEADを変える前に、元HEADのbackupと作業snapshotを記録する。
- dirtyな場合は `stash push --include-untracked` を使い、作成messageとSHAで今回のstashを特定する。既存stashを代用しない。ignored fileを含める `--all` は使わない。
- 退避対象外のignored fileが、新しいtracked pathと衝突して上書きされないようにする。FFでは `merge --ff-only --no-overwrite-ignore <base-sha>` を使う。branch切替・rebaseでも取得baseおよび再適用する各commitのtreeとディスク上のignored path、file/directory・symlink・大文字小文字の衝突をmutation前に調べ、保護できない衝突では停止する。rebaseの途中だけ追跡され、最後には削除されるpathも含め、最終tree同士の比較だけにしない。対象Gitで有効なno-overwrite guardも固定し、FF/次branch作成/rebaseの各経路で検証する。ignored file全体をstashへ追加して回避しない。
- 元のindexに変更があった場合は `stash apply --index <exact-sha>`、なければ通常のapplyで復元する。成功・失敗ともstashを保持し、自動pop/dropはしない。
- 現行の明示 `github merge done` が持つstaged変更の停止規則は維持する。新しいsync経路は共通carryoverを外側で管理し、次branch coreにはcleanな状態で入る。
- 復元で競合した場合は、変更済みの作業tree・index・stash・backupを保持する。再実行でstash applyを重ねない。
- 成功後は `取得baseがHEADの祖先`、期待するbranch、rebase/mergeが終了していること、stash保持と復元結果を確認する。dirtyな状態へ戻ることは正常な完了になり得る。

`stash --index` はindexも復元しようとするが、競合時は復元に失敗し得る。その失敗を同期成功に含めない。[Git公式仕様](https://git-scm.com/docs/git-stash)

### 回復経路

`repository.sync.pull` に、通常開始と排他的な `--resume <operation-id>` / `--abort <operation-id>` を設ける。いずれも明示依頼と `--apply` を必要とし、初回と同じrepository・branch・operationを再検証する。

- rebase競合のresume：利用者が解消・stageした内容と未解消pathを確認し、進行中の同じrebaseだけをcontinueする。新たなfetchやstashは始めない。成功後に元stashを一度だけ復元する。
- 空commitでの停止は通常の競合解消と区別する。省略するか空commitとして保持するかの明示選択を受け、停止したcommitに束縛した回復手順で続行する。単なるresumeからskipを推測しない。
- rebase中のabort：同じrebaseであることを確認してabortし、元HEADに戻ったことを検証してから元stashを復元する。
- stash復元競合のresume：すでに適用された状態の解消を確認する。stashを再適用しない。
- 復元が始まった後のabortでは、解消中の内容を自動消去しない。backupとstashからの個別回復手順を示す。
- 次branch作成後の失敗では、作成済みbranchを記録して保持する。再開で次branchを重複作成しない。完了記録のある旧 `-done` へ手動で戻った場合も、次branchを新しく量産しない。

## 6. sync pull の本体

1. 進行中のmerge/rebase/cherry-pick、未解消conflict、detached HEAD、対象外branch等を判定する。対象は解決可能な作業branchと `-done` branch。base branchへ直接変更する経路は初版に含めない。
2. `-done` だけ第3節のPR確認へ進む。確認不可なら作業を退避せず停止。確認できたら、取得baseを固定し、carryoverを保存して次branch coreへ進む。
3. 通常branchはPR照会をせずfetchし、base SHAと旧tracking SHAを記録する。第4.1節の独立したbranch-base記録も検証し、既に別のfetchで進んだtracking refだけでは履歴書き換えを判定しない。
4. 新baseがHEADの祖先なら取り込み不要、HEADが新baseの祖先ならfast-forwardとする。
5. 両方が進んだ場合は、検証済みbranch-base記録と再適用commit列を固定する。作業開始点の記録欠落、shallow履歴、共通祖先不明、ローカルmerge commit等で範囲が曖昧なら止める。
6. rebase前に、対象branchのremote上の存在、公開receipt、再適用commitを含む取得remote refsを調べる。公開済み・共有済みと分かるcommitは自動で書き換えない。確認範囲外のremoteまで「未公開を証明した」とは報告しない。
7. 必要なbackup・退避を作り、固定したSHAを使ってfast-forwardまたはrebaseする。自動stash、autosquash、他branchのupdate-refs等のGit設定へ処理を委ねない。
8. rebaseは下記の固定optionを使い、既存commitを自動でまとめたり同等patchを事前に落としたりしない。再適用で空になったcommitは停止して扱いを示す。Gitの対応optionを確認し、非対応ならmutation前に止める。
9. 第5節の復元・postconditionを実行し、取得したbase SHAと最終branch、適用方式、backup・退避の有無を返す。

`-done` から次branchを作る場合は、旧PR commitをrebaseで再適用しない。次branchは取得済みbaseから作られるため、同じbaseに対する通常取り込みは不要となる。追加でfetchし続けて、同時開発者の進行を無期限に追いかけない。

固定rebaseの引数案は以下とする。SHAは検証済みの完全なcommit IDへ解決し、任意の追加optionは受け付けない。

```text
git -c merge.renames=false -c merge.directoryRenames=false rebase --merge --reapply-cherry-picks --empty=stop --keep-empty --no-autostash --no-autosquash --no-update-refs --no-fork-point --onto <fetched-base-sha> <recorded-base-sha>
```

`--empty=stop` だけではclean cherry-pickの事前除外を防げないため、`--reapply-cherry-picks` も固定する。空commitの保持と、他refsやbackupを更新しないことも検証する。[Git公式仕様](https://git-scm.com/docs/git-rebase)

## 7. sync push の構成

PR本文の生成がAgentの仕事であるため、利用者向けの一回の依頼を、固定prepare → 必要な文案作成 → 固定applyで実行する。成功ごとの利用者確認は挟まない。

| workflow案 | mutation | 役割 |
| --- | --- | --- |
| `repository.sync.pull` | local | PR確認を含むpull、明示resume/abort |
| `repository.sync.push.prepare` | local | 必要なcommit、対象範囲確定、PR evidenceと不変planの保存 |
| `repository.sync.push.apply` | remote | planと文案を再検証して既存recommit/push coreへ進む |

### prepare

- branch、OS、conflict、remote/base、公開段階の既知blockerを先に確認する。push非対応OSでcommitだけを先行させない。
- fetch後にbaseがHEADの祖先でなければ、commit前に `sync pull` を案内して止める。
- 未commit変更があれば既存 `work.commit` を一回実行する。`committed` とpostconditionの成功を確認した場合だけ文案段階へ進む。`partial` / `not-applied` / `conflict` や例外では、その結果を引き継いで停止する。対象範囲、version notice、認識済みcheck、sensitive pathの既存規則を引き継ぐ。通常の一行messageが分かれば渡し、version-only時は既存fallbackを使う。
- cleanならcommitを省略。baseとの差分commitもなければ `up-to-date` として終了し、文案・recommit・push・`-done`化を行わない。
- commit後のHEAD、branch、base SHA、対象commit列、PR evidence、文案保存先を固定してplanとdigestを返す。
- 既存文案を再利用できるのは、このrepository/branch/HEAD/base/文案digestとの対応を確認できる場合だけ。branch名やmtimeだけでは再利用しない。対応記録のない旧文案は現行evidenceで再作成する。

### 文案とapply

- Agentは返されたevidenceから一度だけ文案を作成・保存し、同じ会話で返されたoperationとplan digestを使用する。compose以外の通常Git手順をAgentへ戻さない。
- applyはplan path containment、operation claim、未消費・未取消状態、repository/branch/HEAD/base、展開後のfetch/push URL identity、文案の正確なdigest、clean状態を再検証する。
- prepare後にbaseやHEADが変化した場合は、古いevidenceのままrecommit/pushしない。すでに作ったcommitは保持し、必要な `sync pull` や文案再準備を示す。
- 既存 `pr.recommit.push` のcoreへ委譲する。呼出直前だけでなく、そのcoreのbackup/reset直前にも期待HEAD/base/文案を確認できるよう、内部のexpected snapshot入力を追加する。
- remote期待SHA、backup、lease、push後の照合、`-done`化は既存と共有する。remoteの成否不明は `unresolved` とし、自動再送しない。
- 全体結果には `commit: created|skipped` とprepare/applyの停止段階を含める。commit後に文案作成が失敗した場合も、未変更扱いに戻さず部分完了として示す。

`sync push` に自動 `sync pull` は組み込まない。`draft recommit push` と互換名 `pr recommit push` はcommit段階を追加せず、現在の意味を維持する。

## 8. routing・契約・配布

- `SKILL.md`：`sync pull` / `sync push` を明示起動へ追加。説明・仕様相談で操作を始めないこと、`-done` での条件付き移行、pushのAgent文案区間を簡潔に記載する。
- `references/sync-pull.md` / `sync-push.md`：固定helper、復旧、停止条件をまとめ、SKILLから必要な場合だけ参照する。合意仕様や本計画を毎回の実行で読ませない。
- `scm-rules.md`、`github-cli-static-helper-policy.md`、`workflow-routing.md`、`deterministic-workflow-runner.md`、既存のrecommit/post-merge referenceを整合させる。
- manifest、CLI contracts、runner登録、dependency injection、result正規化、human outputを同時に更新する。新規IDはcontract v1から開始し、既存契約入力が変わる場合は対応するversionを進める。
- 新しい `contract_runtime_sources` は、共有する退避・状態・PR確認・post-merge core・commit・publication等を含め、共有部品だけの変更も検出できるようにする。generated lock/tableはgeneratorで更新する。
- `prepared` / `up-to-date` の結果は `mutation_invoked` を明示する。runnerの既定値に依存して未実施を実施済みと報告しない。最終応答は固定human outputをそのまま返す。
- README、配布README、DEVELOPMENTの利用例へ両コマンドを追加し、PR作成・マージが人間の工程であることを保つ。新しい全件indexは追加しない。

## 9. 実施順序

| 工程 | 作業と完了条件 |
| --- | --- |
| SYNC-00 | 実際のGit状態、既存差分、skill-creator、現行runnerとtest構成を再確認。開始時の対象とbaselineを記録 |
| SYNC-01 | operation/不変plan/digest/claim、branch-base記録、接続先snapshot、carryoverを実装。中断中prepareの再開/取消、staged＋unstaged混在、ignored衝突、既存stash保持、部分失敗のfocused検証が成功 |
| SYNC-02 | PR確認helperを実装。正確な引数配列、merged/head/base/merge SHA、上限・失敗を検証。通常branchで呼ばれない経路を固定 |
| SYNC-03 | post-merge coreを抽出。従来の人間報告、staged停止、tag助言、命名、`0 0`検証を回帰確認。検証済みPRだけの新入口を追加 |
| SYNC-04 | 通常pullと `-done` 自動移行を統合。作業開始点の照合、固定optionのFF/rebase、変更保持、競合停止、resume/abortを一時remoteで検証 |
| SYNC-05 | push prepareを実装。commit必要時・省略・変更なし、base進行時停止、evidenceと接続先を含むplan binding、文案待ちの再開/取消を検証 |
| SYNC-06 | push applyとAgent routingを実装。文案準備から同一依頼内で完走し、古いplan拒否・既存lease・不明時停止を検証 |
| SYNC-07 | manifest/CLI/help/human output、SKILL・references、配布案内を整合。契約再生成とdrift検査、代表的なAgent経路の受入確認を実施 |
| SYNC-08 | full suite、skill検証、配布関連検査とmacOS/Windows確認。未実行の実機/hosted CI/モデル確認を区別して記録 |
| SYNC-09 | 計画・TODO・HANDOFFへ結果と残件を反映。合意仕様の未実装表示は実際の完成後に更新。配備やcommit/pushは別途依頼された範囲で実施 |

## 10. 主な受入ケース

一時Git repositoryとbare remote、固定GitHub応答fixtureを用いる。実GitHubへのPR作成・merge・pushは受入fixtureに使わない。

| ID | ケース | 確認する結果 |
| --- | --- | --- |
| P01 | 通常branch・変更なし・base進行 | FF、PR/gh呼出し0回、不要なstashなし |
| P02 | 通常branch・base取込済み・編集中 | 内容とindexを保ちno-op、PR呼出し0回 |
| P03 | 未公開commit複数＋base進行 | 元HEADをbackup、対象commitだけrebase、baseを含む |
| P04 | staged/unstagedが同一fileに混在、binary・rename・削除・untracked | 同期後に保持。復元失敗はpartialで正確なstashを返す |
| P05 | rebase競合・空になったcommit | 黙って削除・skipせず停止、明示resume/abortのみ |
| P06 | 復元競合・untracked同名衝突 | 元資料をstashに保持、再applyや自動消去なし |
| P07 | 公開記録あり・remoteで共有済み・base書換え・shallow・local merge | 対象外理由を示し、rebase前に停止 |
| P08 | 確認中の同件数編集・HEAD/branch/remote変更 | 内容digestで検出、古いsnapshotで進まない |
| P09 | base書換えを別のfetchが既に取り込み済み | tracking同士の比較が通っても、記録baseとの照合で停止。削除された共有commitを再適用しない |
| P10 | branch-base記録なし / 正確な旧作成記録あり | 分岐時は停止 / 検証済み記録を移行して自分のcommitだけ再適用。FF/no-opは不要に禁止せず、開始点不明のahead no-opから記録を作らない |
| P11 | FF・次branch作成・rebase途中だけの対象pathにignored file/dir/symlinkが存在 | 元内容を上書きせず停止。最終treeだけを比較せず、ignored全体のstash追加でも代替しない |
| P12 | 同じpatchを他の人がbaseへ取り込み済み | 事前dropせず空commit停止として示し、明示的な保持/省略だけを受け付ける |
| P13 | 元から空のcommit、autostash/autosquash/updateRefs設定あり | 固定optionで元の意図と対象commit列を保持。backupと他branchのrefsは更新しない |
| M01 | `-done`・正確なPR merged・baseには他の追加mergeあり | 次branchを取得baseから作成し、旧PRを再適用しない |
| M02 | merge commit / squash / rebase merge | PR HEAD一致とマージ後SHAのbase到達を使い分ける |
| M03 | PR Open、未マージClosed、候補なし/複数、別repo/base/head | stash・branch作成前に停止 |
| M04 | 100件、JSON不正、field欠落、403/404/429、ghなし | 未確認扱いで停止。未マージや成功へ読み替えない |
| M05 | 正常なPRだがfetchしたbaseにマージ結果がない | 待ち/再照合が必要と示し、旧HEADを保つ |
| M06 | branch名衝突、作成後失敗、再実行、完了後に旧branchへ戻る | 既存branchとstashを保持し、次branchを重複作成しない |
| M07 | 明示的な旧 `github merge done` | 人間報告の既存経路とstaged停止を維持 |
| M08 | マージ後にremote作業branchが削除済み | 公開記録とPRのhead/ref/SHAを照合できれば移行可能。branchの存在だけで未確認扱いにしない |
| U01 | dirtyからsync push | 1回commit→文案→recommit/push→`-done`。通常変更を取りこぼさない |
| U02 | cleanでcommit済み / cleanで差分commitなし | commit省略 / no-op。空commitや空PR処理なし |
| U03 | version-only / 具体的作業title / sensitive path / check失敗 | 既存message選択・notice・停止・index保持を維持 |
| U04 | base進行がprepare前 / 文案作成後に判明 | 既知ならcommit前停止、後発なら作成済みcommitを保持して停止 |
| U05 | 古い文案、別branch/HEAD/base、plan/draft改ざん | recommit/push前に拒否し、現在evidenceで再準備 |
| U06 | backup異常、remote branch変化、push成否不明 | 既存guard維持、未実施と不明を区別し自動retryなし |
| U07 | 不適切なOS、`-done`、conflict、他operation claim | commitを含む初回mutation前に停止 |
| U08 | prepare後のURL変更、fetch/push別repo、複数pushURL、mirror | 接続先を照合して停止。確認したrepo以外へpushしない |
| U09 | `work.commit` がpartial/not-applied/conflictを返す | 文案・recommit/pushへ進まず、stage済み内容等の実状態を報告 |
| U10 | 文案待ちのresume/cancel、prepare直後のprocess終了 | commitを重複作成せず再開可能。cancelは記録を閉じ、内容・HEADを保持。実行lockが永久残留しない |
| U11 | prepare後のbase進行で停止し、次にsync pullを依頼 | remote apply未開始なら古い準備を失効してpullへ進む。古いplanのapplyは拒否し、不明なpushはこの経路で解除しない |
| C01 | 通常pull、pull内post-merge、push各結果 | 実際に完了した段階、branch、base、backup/stash、次操作を固定出力で返す |
| C02 | 既存個別コマンド、説明だけの依頼、型付き引数 | 既存意味とactivation境界を維持。任意command passthroughなし |
| C03 | 同じcommon Git dirの複数worktree、停止processのlock | 同時syncを抑止し、時間だけで不明attemptを解除しない。operationの再開/取消と実行lockを区別 |

テスト名のP/M/Uは本計画のcase識別子であり、実ファイルの命名制約ではない。既存の `post-recommit-publish.test.mjs` に追加する場合はfull suiteのshard条件に正確に一つだけ一致させる。新しい独立test fileはfull側の自動収集へ乗せ、fast側には必要な軽いunit/contract testだけを追加する。

## 11. 実装時の検証と引き渡し

各工程でfocused test、反復中にfast、契約入力変更時に契約再生成とcheck、引き渡し前にfullを実行する。実行順の例は次のとおり。

```sh
npm run test:miku-scm:fast
node skills/igapyon-miku-scm/scripts/miku-scm-workflow-contracts.mjs
node skills/igapyon-miku-scm/scripts/miku-scm-workflow-contracts.mjs --check
npm run test:miku-scm:full
python3 /Users/igapyon/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/igapyon-miku-scm
npm run test:skill-index-policy
mvn validate
git diff --check
```

validatorの絶対パスはこの環境の実行例であり、別環境では利用中のskill-creatorの場所に解決する。実装した共通helperとGitHub読取をnative Windows/既存macOS・Windows CIでも確認し、mockやmacOS上のwin32注入だけでWindows実機確認済みとは報告しない。

配布案内・新規reference/helperの同梱はpackageとarchive checkerで確認する。最新ZIP未確認という既存残件を、コードテストの成功だけで閉じない。

```sh
mvn package
node scripts/check-release-archive.mjs target/igapyon-agent-skills-<version>.zip
```

`<version>` は、その実装時のPOMのproject versionへ置き換える。

今回すでに未commitの版更新があるため、計画保存で追加incrementはしない。実装の公開時には実際の保守日とversion状態から、別途依頼・方針に従って判断する。

## 12. 参照と調査根拠

- [合意仕様](2026-10-26-sync-pull-push-spec.md)
- [現行SKILL](../SKILL.md)、[SCM規則](../references/scm-rules.md)、[固定GitHub CLIの境界](../references/github-cli-static-helper-policy.md)
- [post-merge helper](../scripts/post-merge-next-work.mjs)、[公開記録とPR照合を持つmaintenance helper](../scripts/repository-maintenance.mjs)
- [work.commit](../scripts/work-commit.mjs)、[recommit/push](../scripts/pr-recommit-push.mjs)、[publication](../scripts/post-recommit-publish.mjs)
- [runtime/test規則](../references/runtime-and-test-suites.md)、[skill参照方針](../../../docs/policies/reference-discovery.md)

公式仕様の確認日は2026-10-26。GitHubのPR情報のfield、マージ後SHA、Gitのstash/rebase optionを計画の根拠として確認した。現在の対象repositoryで新しいsyncを実行した証拠や、API fixture/OS受入結果ではない。

## 13. 自己レビュー

同日の[自己レビュー記録](2026-10-26-sync-plan-self-review.md)で5点を修正した。作業開始点の根拠、ignored path保護、rebaseのcommit除外、実際のpush接続先、中断中prepareの回復を補い、受入ケースを25件から35件へ追加した。Git単体の一時fixtureによる再現と、将来のsync実装に対する受入検証は区別する。

## 14. 実装とローカル検証（2026-10-26）

- SYNC-00〜07：source実装済み。新規workflowは `repository.sync.pull`、`repository.sync.push.prepare`、`repository.sync.push.apply`。契約37件、human output v14。Agentは返された根拠から文案を一回作り、同じoperationとplan/draft digestをapplyへ渡す。
- 共通state/worktree/PR確認helperを追加し、既存のnext-branch作成core、work.commit、recommit/publicationを共有した。旧 `github merge done` の人間確認・staged停止は維持した。
- branch-base記録、書換え検出、ignored途中tree保護、固定rebase option、正確なstash保持、同じrebaseのresume/abort、復元済みの明示確認、common-dir lockを実装。失敗・中断したstash復元は、各pathの解決を人間が確認してから `--resolved-carryover` 付きresumeとする。再applyは行わない。
- pushはdirtyなら一回commitし、cleanなら省略。作成済みcommitは後発のbase進行や文案失敗でも保持する。prepareをresume/cancelでき、apply未開始の準備はpullで失効できる。不明なremote結果は再送・pullで解除しない。
- R01〜R05の補強をコードへ反映し、実際のfetch/push先のdigestを内部backup/reset/fetch/push/検証直前にも照合する。公開済みcommitの確認範囲は取得済みrefsとlocal receiptであり、全remoteの未公開証明とはしない。

受入用の新規integration testはpull 29件・push 20件。別に軽いrouting/output/runner 3件を追加した。一時bare remoteと固定GitHub応答のみを使い、通常branchのgh呼出し0回、FF、rebase、元から空のcommit、同等patchのkeep/drop停止、base書換え、独立した旧作成記録の移行、staged/unstaged混在・binary・rename・削除・untracked保持、ignored途中tree、rebase/復元競合回復、squash mergeと追加base進行、PR照合失敗、古いplan/draft/HEAD/URL、commit失敗、prepare再開/取消とpullへの移行、不明pushの再送禁止を確認した。共有Git directoryを持つ実worktree間の実行lockも検証した。

確認済み：full suite **368/368**、skill index policy **78/78**、skill validator、`mvn validate`。最終fastは204/204、契約driftなし。追加修正後のfullも368/368。最終ZIP照合はroot HANDOFFの最新記録を参照する。

SYNC-08のnative Windows実機、hosted CI、実GitHubでのmerge方式、実モデルの会話routingは未実施。macOSの実Git、一時remote、固定API fixtureの結果をこれらへ読み替えない。SYNC-09としてroot状態文書へ実装状況を反映し、最新版ZIPは最後にsourceと照合する。既存の版数 `1.20261026.3` / `20261026c` を維持し、追加increment、実repoへのsync、配備、commit/push、tag/Releaseは行っていない。

追加確認：ディレクトリrenameをGitが推測すると入力treeに存在しない移動先を書き、ignored fileを上書きするケースを実fixtureで再現した。sync内のrebase（resume/abortを含む）とstash復元は `merge.renames=false` / `merge.directoryRenames=false` を固定し、元pathを保持するか競合で停止する。commit・index・worktreeの3経路でignored内容の保持を回帰確認した。これはR02の保護範囲を実現する追加修正であり、renameを伴う同期では自動推測に代わって明示的な解消が必要になる場合がある。
