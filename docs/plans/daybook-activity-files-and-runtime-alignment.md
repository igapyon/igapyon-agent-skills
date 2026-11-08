# daybook：activity分割とBacklog実運用への反映計画

作成日：2026-11-03。状態：source実装・実daybookへのローカル反映・検証完了。実施記録は末尾を参照。

## 目的と確認した現状

同日の別作業を複数セッションで記録すると、一日一ファイルのactivityへの編集が集中する。利用者合意に従い、新規activityを内容ごとのファイルへ分け、日付直後に小文字英字の連番を付ける。

併せて、skill sourceで実装済みのBacklog対応を実daybookへ反映する。2026-10-19の[Backlog計画](daybook-backlog-separation.md)は、source実装と実daybookへの配備を別工程としていた。現在の実daybookは、Backlogを指定したtaskがある一方、generator・Issue取り込み・READMEに対応が未反映である。

調査時のcheckout（実装開始時に再確認する）：

- igapyon-agent-skills：`devel-tiga1101kaa`、HEAD `e41613a`、調査開始時clean。
- 隣接daybook：`devel-tiga1030ifd`、HEAD `96b4c83`、clean。
- `workplace/daybook-staging`は古いコピーであり、実daybookの更新元・対象にしない。

## 1. 合意事項と実装案

利用者が指定した命名：

```text
YYYY/YYYYMM/activities/activity-YYYYMMDDa.md
YYYY/YYYYMM/activities/activity-YYYYMMDDb.md
...
YYYY/YYYYMM/activities/activity-YYYYMMDDz.md
YYYY/YYYYMM/activities/activity-YYYYMMDDaa.md
YYYY/YYYYMM/activities/activity-YYYYMMDDab.md
```

- 接尾辞は小文字の `a…z, aa…az, ba…bz, …, zz, aaa…`。日付と文字の間にハイフンを追加しない。
- 内容・作業エピソードごとに新規ファイルを作る。別セッションの同時編集により複数の内容が同じファイルにまとまることは許容する。
- topic名、時刻、UUIDをファイル名へ追加する方式には変更しない。

以下は本計画で採用する具体案：

- 接尾辞は活動日ごとに `a` から開始する。日付は従来どおり活動した日で、既定はAsia/Tokyo。
- 同じ活動の追記・訂正では既存ファイルを更新する。メッセージやツール呼び出しごとに新しいファイルを作らない。日をまたぐ活動報告は、それぞれの活動日の記録としてつなぐ。
- 次の文字列は、当該日の既存ファイル・ローカルGit履歴・同じprepare内の割当済みパスの最大値から決める。欠番や削除済みの名前は再利用しない。履歴が取得できない場合は、確認できた範囲と制約を明示する。
- 連番の比較は文字数、その後に文字列順で行う。通常のファイル名ソートでは `a, aa, ab, b` になるため、割当処理や連番順の一覧にそのまま使わない。接尾辞は時刻の代わりにはしない。
- front matterは `type: activity` と `date` を維持する。ファイル名の日付・配置月・front matterの一致を確認する。新しい必須ID項目は増やさない。
- 旧 `activity-YYYYMMDD.md` は有効な既存記録として残す。旧ファイルの存在は、その日の新規 `a` の割当を妨げない。既存内容の一括分割・改名は行わない。
- 新しいactivityの添付先はファイルstemに合わせて `attachments/activity-YYYYMMDDa/` などとする。既存添付と相対リンクは維持する。

## 2. 並列編集と書き込み

目的は別件の記録先を分散すること。同じファイルへ複数内容を残すことの許容と、他セッションの内容の消失は区別する。

- 通常の新規activity作成とIssue取り込みが共有できる、小さな命名・採番helperを用意する。通常作成用の薄いCLIからも利用できるようにし、Agentが毎回英字の繰り上がりを独自実装しない。
- 新規ファイルの作成は既存ファイルを上書きしない排他的作成を使う。通常作成で候補パスが先に使われた場合は、再取得して次候補へ進み、確定したパスを返す。
- 既存activityの編集では直前の内容を再読し、対象箇所への変更を行う。他セッションによる変更を検出した場合はその内容を取り込み直す。再読とdiff確認だけで全ての同時書き込みを防げるとは保証しない。
- Issue取り込みのレビュー済みplanは割当済みパスと内容を固定する。apply時に他の書き込みを検出した場合は既存の `LOCAL_CONFLICT` で停止し、再prepare・再レビューへ戻す。apply中にパスや内容を勝手に変更しない。
- 独立したbranchで同名ファイルが作られた場合は、両方の内容と出典を保って統合する。同一ファイルに複数内容が残っても仕様違反としない。

## 3. Activity対応の変更箇所

sourceは `skills/igapyon-miku-daybook/`、同梱runtimeはその `assets/daybook/` とする。

1. `SKILL.md`、`references/records.md`、`operations.md`、`attachments.md`、`issue-import.md`の一日一ファイル・追記先・添付先・探索方法を更新する。waypointやURL関連付けの参照経路も確認する。
2. runtimeに命名・採番・新規作成helperを追加し、通常記録の手順とIssue取り込みで同じ規則を利用する。対象daybookへのhelper導入手順と配布対象にも追加する。
3. `issue-import.mjs`の `scanIssueSources`、`canonicalActivityPath`、canonical path検証、activityのwrite構築を変更する。探索は旧形式と英字付きの両方を受け付け、新規manifest内のactivity recordごとにパスを割り当てる。
4. 出典markerを保持し、取り込み済みactivityを新形式でも検出する。旧plan/resultの再開・再applyは保存されたパスを尊重し、新しい名前へ振り直さない。
5. `DEVELOPMENT.md`、利用者向けREADME・配布用READMEの関連記述を確認し、実daybookのREADMEへ同じ規約を反映する。

day-plan generatorはactivityを入力としていないため、activity分割のための集約機構や日次indexは追加しない。各activityのタイトルで内容を識別できるようにする。

## 4. Backlogの実daybookへの反映

現行source実装を再利用し、実daybookの固有差分を確認して統合する。ディレクトリ全体の置換はしない。

- `day-plan.mjs`と関連tests：`planning_state`検証、planned/backlog分離、Backlog欄、日付別欄からの除外を反映する。
- `issue-import.mjs`と関連tests：Backlog指定の保存、日付未補完、preview/receipt表示を反映する。generatorだけ更新して新規取り込みが旧挙動のままになる状態を避ける。
- 実daybookのREADME：新規taskの `planning_state`、属性省略時の互換動作、日付未設定Backlog、一覧列と生成欄を追記する。
- 通知のMarkdown変換でBacklog欄とリンクが保たれることを確認する。実daybookにはメンション既定値の固有差分があるため、Backlog対応と無関係な通知先・cron・重複抑止設定を一括上書きしない。
- taskの一括再分類や日付補完は行わない。既存のBacklog指定をそのまま正しく表示する。

## 5. 実装順序と検証

1. 両repoの最新Git状態と対象ファイルを再確認し、source/実daybookの固有差分を記録する。
2. source側でactivity命名helper、Issue取り込み、skill文書を実装する。
3. sourceの既存daybook testsに必要な境界・回帰ケースを追加して実行する。
4. 実daybookへactivity対応とBacklog対応を統合し、READMEを揃える。既存記録・添付・リンクを保持する。
5. 実daybookのtestsを実行する。実データからday-planを明示的な一時出力先へ生成し、既存のBacklog taskがBacklog欄に一度だけ表示され、日程要確認には出ないことを確認する。
6. 通知はローカルのrenderとfixtureで確認する。source記録が生成前後で変わっていないこと、相対リンク、差分の範囲を確認する。
7. skillの参照・配布対象へhelperが含まれることを関連検査で確認し、両repoの `git diff --check` と変更一覧を確認する。

必要なテスト：

- 新規日のa、同日のb、z→aa、az→ba、zz→aaa、日付の切替、欠番・使用済み名、aa以降の比較。
- 旧日次ファイルと新形式の共存、同一活動への追記、添付リンクと日付の整合。
- 同じ候補パスへの新規作成競合で既存内容が失われないこと。
- 同日の複数activityを含むIssue取り込み、新旧パスの出典検出、再applyの重複防止、旧plan/result互換、prepare後のファイル変更での停止。
- Backlogの日付なし・片側のみ・期間あり・provisional、done/cancelled除外、planning_state省略の既存task互換、通知リンクの変換。

既存の同梱daybook suiteと実daybook suiteを基本とし、今回と無関係なSCM full suiteや全外部skill取得は実行しない。テスト結果は実行後に記録し、過去の件数を今回の成功として扱わない。

## 6. 完了条件と運用反映

- 新しいactivityを内容ごとに指定の小文字連番で作成でき、英字の繰り上がりが通常作成・Issue取り込みで一致する。
- 旧activityと既存リンクを読み続けられ、保存済みの取り込みを重複実行しない。
- 実daybookのBacklogが仕様どおり表示され、新規Issue取り込みでも区分と日付省略が保たれる。
- skill文書、同梱runtime、実daybookのruntime・READMEが同じ規則を説明する。
- 実装差分と検証結果を記録し、ローカルskill配備・GitHub運用反映の実施状況を区別する。インストール先への同期、commit/push、通知workflowの実投稿はそれぞれ利用者の依頼範囲に従う。

実daybookはworkspace書き込み許可範囲の外にあるため、source側の具体的な差分を準備し、一時環境で検証してからfilesystem承認を受けて反映した。

## 計画時の作業

命名・探索・path検証・Issue出典・apply時の衝突検出、Backlogの既存計画とruntime差分を読んで計画した。今回は本計画とroot TODOへの入口だけを追加し、runtime・実daybook・インストール済みskillを変更していない。

## 実装・検証記録（2026-11-03）

- `activity-files.mjs`と`create-activity.mjs`を追加。英字の繰り上がり、現行ファイル・ローカルGit履歴・prepare内の予約パスからの採番、日付整合を共通化した。新規CLIは同じディレクトリに完成したMarkdownを一時保存し、排他的なhard link作成で公開する。候補名の衝突時は再採番し、既存ファイルを置換しない。履歴が利用できない場合は出力に制約を付ける。
- Issue取り込みは新規activity recordごとに英字付きパスを割り当て、新旧形式を出典検索・path検証で受理する。旧日次append planの適用・再開・取り込み済み検出と、新形式の再applyを検証した。prepare中またはapply前に新規パスが使われた場合は競合として停止する。
- skill entrypoint、records/operations/attachments/issue-import、利用者向けREADME・配布README、DEVELOPMENTを更新した。代表参照経路に新しいCLI/helperを含め、配布側で欠落を検出できるようにした。
- 実daybookへ計10ファイルを反映した。activity helper/CLI/tests、day-planとtests、Issue取り込みと関連tests、READMEを更新。通知rendererとworkflowは実daybookの既存設定を維持し、Backlogのリンク変換テストだけを既存通知testsへ追加した。
- 新規命名は旧activityの一括改名・分割を伴わない。既存taskの分類・日付も変更していない。
- source同梱daybook suite：**60/60 pass**。実daybook suite：**59/59 pass**。件数差は既存のメンション既定値とそのtestsの違いによる。
- 参照・配布関連suite：**78/78 pass**。skill-creatorの`quick_validate.py`：成功。両repoの`git diff --check`：成功。
- 実daybookの2026-11-03 day-planをrepo外の一時出力先へ生成した。既存Backlog 1件がBacklog欄に一度だけ現れ、日付別task欄から除かれることを確認。元記録への相対リンク15件と通知のcommit固定リンク・既存メンションを確認した。
- 生成・反映前後でGit管理下の年別記録・添付・waypoints等104ファイルのSHA-256が一致した。実activityを検証用に追加せず、競合試験は一時repoと並列CLIで実行した。
- 検証はこのmacOS環境。native Windowsでの今回の新CLI実行は未確認。
- インストール済みskillへの同期、版数更新、Mavenによる全体ZIP生成、commit/push、GitHub投稿・workflow dispatchは未実施。両repoの変更は未commit。
