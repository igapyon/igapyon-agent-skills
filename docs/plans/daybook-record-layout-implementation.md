---
title: miku-daybookの記録階層更新の実装計画
status: planned
created: 2026-11-17
updated: 2026-11-17
---

# miku-daybookの記録階層更新の実装計画

[確定したディレクトリ仕様](daybook-record-layout.md)を、`skills/igapyon-miku-daybook/`の指示文と同梱runtimeへ反映する計画です。計画作成は完了し、実装は未着手です。

## 目的と対象範囲

新規activity・task・todoを種別ルートの年/月/日へ、新規schedule・day-planを種別ルートの年/月へ保存できるようにします。添付はルートの`attachments/`配下へ置きます。詳細なパスと日付の意味は確定仕様を正本とし、本書は実装方法と確認項目を担当します。

初回の実装範囲はsource skill、同梱CLI、通知workflowのテンプレート、関連する配布・同期手順とその検証です。新しいskillだけでも旧配置の記録を引き続き扱える状態を目指します。次に、検証したsourceをユーザーの`~/.codex/skills/igapyon-miku-daybook/`へ再同期します。

実daybook内のruntime・README・通知workflowへの配備と、既存記録・添付の移動は後続工程です。作業対象のdaybookを特定し、その固有変更と保存済み取り込み処理を確認してから実施します。スキルのメタ作業である本計画はdaybookの記録操作を開始しません。

## 調査時点

- branchは`devel-tiga1117wcj`、HEADは`b51f6b5a528f7398daef4a2ebac19287bb4531d8`、開始時のworktreeはcleanです。実装開始時に再確認します。
- 確定仕様は設計資料に保存済みです。運用用の`SKILL.md`・references・同梱runtimeは旧配置を前提にしています。
- ユーザー用skillは直前にsourceから同期しましたが、同期は新階層の実装を意味しません。
- task・schedule・activityのpath生成、走査、検証が`day-plan.mjs`、`activity-files.mjs`、`issue-import.mjs`に分散しています。
- todoの専用CLIはありません。task/todoの通常操作はMarkdown編集で、todoはday-plan生成とIssue取り込みの入力対象ではありません。この階層変更のためにtodo対応をそれらへ追加しません。
- 通知workflowのテンプレートも旧day-planパスを組み立てています。generatorだけの更新ではartifact取得・通知が壊れます。
- ローカル同期スクリプトは`node_modules`を除外していません。前回同期のsourceにはGit無視対象の`assets/daybook/node_modules/`があり、再同期前に配布と同期の対象を揃える必要があります。

## 実装上の契約

### パス生成・解釈・探索を共有する

同梱`scripts/record-paths.mjs`を追加し、種別、配置形式、新旧パスの日付・ID情報、正規パス生成、対象記録の探索を共有します。任意のMarkdownを再帰検索する方式にはせず、新しい種別ルートと旧年/月/種別の双方の正規ディレクトリを走査します。

- 新規作成先は新配置に固定します。旧記録の更新は渡された既存パスを保ち、更新のために新パスへ変換したり、コピーを作ったりしません。
- activityは新旧いずれの配置でも接尾辞なし・1〜2文字の既存名を受け付けます。新規採番は`aaa`以上で、日単位の最大値を引き継ぎます。
- 新規task/todoは`created`の完全な日付と年/月/日を照合します。作成日不明の既存taskは開始日で新配置へ移行でき、移行後も`created`省略を受理します。このtaskでは有効なディレクトリ日付と階層内の年/月/日を検証し、現在の開始日との一致やID月との一致を要求しません。作成日を持つ記録は既存の整合規則を維持します。
- task/todoの採番はID内の年月を基準にします。開始日を代用した既存taskは別月へ配置される場合があるため、新配置の全日付ディレクトリと旧配置から対象ID月のファイルを探します。Git履歴と同じ処理の予約パスも両配置のパスとして解釈し、欠番・削除済みIDを再利用しません。
- 同じtask-id/todo-id、activityの同一日付・接尾辞、同じscheduleファイル名が複数の正規パスで見つかった場合は、両パスを示して処理を止めます。自動で片方を正本に選んだり、内容が同じという理由だけで隠したりしません。
- 記録として認識できるパスの日付不一致は診断します。`attachments/`、`topics/`、`waypoints/`、一時出力、backupを記録探索へ混ぜません。記録階層内のsymlinkを辿らず、直接指定する読み書きでも既存の親ディレクトリ検証を維持します。

現在`activity-files.mjs`は日付検証とfront matter解析を`day-plan.mjs`からimportしています。共通path moduleは`day-plan.mjs`をimportしない設計とし、必要な純粋な日付検証を共通側へ移して、`day-plan.mjs`からの既存exportを維持します。front matter解析と業務上の状態分類は既存moduleに残し、循環importを作りません。

### 既存activityの保存先を保持する

`activityTarget`は現在、日付からディレクトリを再構築しています。単に`activityDirectory`を新配置へ切り替えると旧ファイルを読めなくなるため、検証した実際の相対パスから対象を解決するよう変更します。

新規作成は同じ出力ディレクトリ内の一時ファイルと排他的公開を維持します。`readActivity`が返した元のSHA-256による更新、競合時停止、最大32回の名前衝突処理、case違いの候補予約も維持します。最終確認と保存の間の同時書き込みを許容する現行合意に、ロックを追加しません。

### 生成物と通知の基準パスを揃える

`loadRecords`は新旧両配置のtask・scheduleを全年月から読むようにし、`canonicalPlanPath`は`day-plans/YYYY/YYYYMM/day-plan-YYYYMMDD.md`を返すようにします。`--output-root`は出力rootだけを変え、論理的な正規パスを変えません。状態、Backlog、暫定候補、週次ルール、優先度、日付窓と並び順を維持します。

`post-day-plan.mjs`の`renderComment`は、実際のplanの論理パスを基準に相対リンクを解決できるようにします。新しく生成するplanは新パス、保存済みの旧planは旧パスを使います。CLIは`--file`の既知の正規パス部分から識別し、任意の名前へ取り出したartifactでは明示できる`--plan-path`を用意します。明示値は対象日と一致する新旧どちらかの正規planパスに限定します。programmatic APIは省略時に新しい正規パスを使います。

workflowテンプレートの`plan_path`、artifact、posting stepも同じ新パスへ更新します。通知の日付marker、重複抑止、権限、cron、送信先、メンション規則は既存契約を維持します。通知の確認はローカルrender・dry-runとfixtureで行います。

### Issue取り込みは種別と識別子で処理する

`issue-import.mjs`の`canonicalDirectories`、`scanIssueSources`、`canonicalTaskPath`、`canonicalSchedulePath`、`nextTaskSequence`、`validateLinkTarget`、`safeRelativeWritePath`を共通path処理に接続します。taskの配置日は既存どおり`source.import_date`、scheduleとactivityはそれぞれの記録日を使います。

特に`receiptMarkers`の直下ファイル用regex、`segments[1]`で月を読む処理、`validatePlan`・`verifyWriteSourceContent`・`applyOneWrite`の`includes("/tasks/")`や`includes("/activities/")`は見直します。新配置では`activities/`が文字列先頭に来るため、この判定を残すとactivityのmarker検証や排他的書き込みを迂回します。検証済みpathから返る種別とIDで分岐します。

旧receiptは保存されたパスのまま検証します。移動後の記録も出典markerから検出し、既存の`already-imported`等の区分を維持します。旧plan/resultはパス・内容・digestを固定したまま読み、未移動の記録に対して従来どおりapply・途中再開できます。移動後に古いplanで旧パスへ再作成せず、競合として止めて再prepareを案内します。remoteコメントの書き換えは行いません。

取り込みの対象種別、miku-scm経由のread/comment/close、preflight・承認・結果確認の境界は維持します。検証はローカルfixtureを使い、GitHubへの実書き込みを必要としない構成にします。

### 作成日不明の旧taskは開始日で移行する

利用者の追加指定により、作成日不明の既存taskは開始日（`planned_start_date`、旧形式は`planned_date`）を移行時の配置日として使います。既存の開始日alias規則に従い、実際の作成日を調査し終えることを移行の前提にしません。採用した日付と根拠を移行対応表とtaskの短い履歴へ記録します。`created`は不明なままでよく、専用のfront matter項目も増やしません。

移行後は保存済みパスを配置日として固定し、開始日を変更しても再移動しません。ディレクトリ年月と既存task-idの年月が異なる場合もIDを変更せず、parser・generator・Issue関連付け・採番で同じ例外を扱います。作成日も有効な開始日もない場合だけ旧配置で保留し、探索・一覧・更新を継続します。既存todoの作成日規則は今回の追加指定の対象に含めません。

## 作業順序と完了条件

| ID | 作業と主な変更先 | 完了条件 |
| --- | --- | --- |
| LAY-00 | source、配備済みskill、必要な対象runtimeの版・差分を固定 | 最新Git状態と対象を確認し、前提と固有変更を記録 |
| LAY-01 | `record-paths.mjs`と利用側の依存関係 | 新旧パスの生成・解釈・探索と日付照合が共有され、循環importがない |
| LAY-02 | `activity-files.mjs`、create/update CLIとtests | 新規は新配置、旧記録は元パスで更新。採番と競合対策が維持される |
| LAY-03 | `day-plan.mjs`、`generate-day-plan.mjs`、`post-day-plan.mjs`、通知workflowとtests | 新旧入力から新出力を生成し、通知リンクとartifactが正しい |
| LAY-04 | `issue-import.mjs`、import CLIとtests | 新規保存、既存関連付け、receipt、出典検出、旧plan互換と再applyが整合 |
| LAY-05 | `SKILL.md`・全references・README類・DEVELOPMENT | 指示・例・探索パターン・同梱ファイル一覧がruntimeと一致 |
| LAY-06 | 同梱runtimeの隔離実行、参照・配布チェック | npm依存なしでコピー先・別cwdから動き、共通moduleの欠落を検出できる |
| LAY-07 | ローカル同期手順と一時配備先の検証 | 開発用`node_modules`を混ぜず、検証済みsourceを対象skillだけへ再同期できる |

LAY-00→01を行い、02→03→04を順に実装します。05は各runtime変更と合わせて更新し、全体が揃ってから06・07へ進めます。中間状態の文書だけをユーザー用skillへ配備しません。

### 文書・配布で更新する箇所

- `references/records.md`を配置の正本とし、SKILL入口には新規保存先と互換読み取りの要点を置きます。スキル利用時に開発repoの本計画を読むことは前提にしません。
- `operations.md`・`todos.md`の通常作成・月単位採番・全日付一覧、`activity-capture.md`・`waypoints.md`の過去活動探索、`url-task-lookup.md`のtask探索を新旧両方へ揃えます。topics/waypoints自体の配置は既存仕様を引き継ぎます。
- `attachments.md`の所属と保存月を維持してルートだけを変更し、新旧記録から添付への相対リンク例を確認します。既存添付は通常更新では動かしません。
- `issue-import.md`、`notification.md`、`operations.md`のCLI導入一覧へ新しい共通moduleを追加します。通知導入だけでIssue helperを追加するような範囲拡張はしません。
- 既存の日付・planning移行guideは新旧記録を探せるように更新します。過去の`docs/plans/`の実施記録は一括置換せず、現行仕様への入口を必要な箇所へ補います。
- root/配布README、DEVELOPMENT、`scripts/check-daybook-runtime.mjs`、`scripts/daybook-runtime.test.mjs`、必要な参照・配布testを揃えます。runtime checkerには新配置のfixtureと旧配置の互換fixtureを両方残します。

### 再同期と実daybookへの配備

`scripts/sync-codex-skill.sh`のsync/`--check`両方で`node_modules`を除外し、`prepare-release-staging.sh`の配布対象と整合させます。一時source/配備先を使い、更新・古い通常ファイルの削除・他skillの保護・除外ディレクトリの扱いを確認します。すでに配備先にある開発依存の削除は別途扱い、自動掃除を追加しません。

sourceの実装・検証後、ユーザー用の対象skillへ一方向に同期し、同じ対象範囲の内容一致を確認します。配備先に固有編集があれば上書き前に差分を保存します。書き込み先がworkspaceの許可範囲外となる実行では、環境の承認手順を使います。

対象daybook内の`scripts/`を使う操作には、そちらへのruntime反映も必要です。特にgeneratorは自身の配置からrepo rootを求めるため、ユーザー用skillの同期だけで対象daybookのgeneratorが更新されたとは扱いません。後続配備では対象README・Git状態・各callerを確認し、共通moduleを含む同じ版の必要ファイルを統合します。固有の通知設定・依存関係を保持し、既存データを動かさずに新旧記録が読めることを先に確認します。

## 検証する動作

| 場面 | 期待する結果 |
| --- | --- |
| 記録のない日にactivityを作成 | 新日別パスの`aaa`を返す |
| 同日に旧`zz`、新`aaz`、履歴に削除済み`azz`がある | 新日別パスの`baa`を返す。予約パスも考慮 |
| 旧activityを読み、元hashで更新 | 旧パスだけを更新し、新パスのコピーを作らない |
| 新旧配置でstale hash・case違い・並列新規作成が発生 | 既存内容を失わず、現行の衝突時動作を維持 |
| 同月の別日にtaskが作成済み、旧配置・履歴にもIDがある | 同月最大IDの次を使い、日別に採番をリセットしない |
| 作成日不明、IDは10月、開始日は11月17日の旧taskを移行 | 11月17日の新配置で旧ID・`created`省略を受理。10月の採番でもそのIDを数える |
| 開始日を代用して移行したtaskの開始日を後から変更 | 保存先を維持し、一覧・生成・Issue関連付けで引き続き読める |
| 通常のtask/todo作成・一覧を指示文どおりに行う | 作成日で固定し、全日付を横断。予定日や状態変更で移動しない |
| 新旧のtask・scheduleを混在させてplanを生成 | 対象の漏れ・重複がなく、既存の分類・順序を維持 |
| 同一識別子が新旧両配置にある | 両パスを診断し、自動で一方を選ばない |
| 新パスの日付不一致、誤った階層、親symlinkがある | 不正な読み書きを止め、対象パスを報告 |
| 新旧plan・別rootへ出力したartifactを通知renderする | 正しい論理planパスからcommit固定リンクを作る |
| 生成・render・dry-runの前後を比較 | source記録のbytesが変わらず、GitHubへの投稿もない |
| Issue取り込みで新規task/schedule/activityを保存 | 新パスで正常に検証・保存され、activityは完全な内容を排他的に公開 |
| 旧記録・移動後記録・旧receiptのあるIssueを再prepare | 再取り込みせず、既存の区分と出典を保つ |
| 保存済み旧planのapply・途中再開・再apply | 未移動なら互換動作。移動済みなら旧パスへ再作成しない |
| 同梱ファイルを依存なしの一時repoへコピー | 全CLIのhelp、activity作成/更新、plan生成、取り込み、通知dry-runが動く |

task/todoの通常操作はモデルの指示解釈を含むため、共通moduleのunit testだけで実対話済みとはしません。指示文の照合と、隔離したdaybookでの操作結果を区別して記録します。隔離モデルの検証環境が使えない場合は、その範囲を未検証と明記します。

実装時は変更箇所の集中testを行った後、`npm run test:daybook`と`npm run test:skill-index-policy`、skill-creatorの`quick_validate.py`を実行します。ローカルMarkdownリンクと`git diff --check`も確認します。新規testは実際に起こりうる境界と回帰動作に絞り、過去の成功件数を今回の結果として使いません。

## 実データ移行の後続工程

1. 対象daybookの新旧パス対応表を作り、作成日不明のtaskは開始日を配置日に採用します。採用日と根拠、作成日・開始日とも不明の保留対象、重複・切れたリンク・未完了の取り込み処理を列挙します。
2. repo外の複製で記録・添付の移動と相対リンク更新を行い、識別子・出典・日付の意味・変更対象外の本文が保たれることを確認します。添付は一つの正本を保ちます。
3. 新配置からplan・一覧・URL関連検索・再開が行えることを確認し、本番対象へ同じ移行を適用します。開始日代用taskは元のIDと保存先を維持し、作成日も有効な開始日もないtaskだけ旧配置で保留します。
4. 保存済みの取り込みplan/resultは自動で書き換えません。進行中処理の区切りを確認し、必要なら新しいread evidenceから再prepareします。過去のGitHubコメントを移行のために再投稿しません。

移行ツールを作る必要性と具体的なCLI契約は、実データの棚卸しに基づく後続計画で決めます。通常のスキル起動やrecord操作から一括移動を開始する処理は追加しません。

## 完了の判定と今回の実施内容

source実装の完了はLAY-01〜06と対応する動作確認が揃った時点、ユーザー用skillの更新完了はLAY-07の再同期と内容一致まで確認した時点とします。対象daybookへのruntime配備と実データ移行は、それぞれ別に実施状況を報告します。版数更新・commit・pushは依頼された時点のmiku-scm手順に従います。

今回はsourceの調査、本計画、確定仕様とTODOからの入口を追加しました。runtime・運用用の指示文・インストール先・実daybookは変更していません。実装testは未実施です。
