---
title: daybookの記録種別をルートに置くディレクトリ仕様
status: specification_confirmed
created: 2026-11-17
updated: 2026-11-18
---

# daybookの記録ディレクトリ仕様

2026-11-17、利用者との検討により以下の仕様を確定し、source skillの指示文・references・同梱CLIへ実装しました。検証後のsourceはユーザー用`~/.codex/skills/igapyon-miku-daybook/`へ同期済みです。対象daybookへのruntime配備と既存データの移行は未実施です。本書は次の標準配置を定めます。

source skill・runtimeの更新順序と検証、ユーザー用skillへの再同期は[実装計画](daybook-record-layout-implementation.md)にまとめています。

## 採用理由

ヘビーユースでactivityファイルが多数作られることを、活動記録が充実している結果として受け入れます。記録の粒度や頻度を下げず、記録種別をルートに置いてから日付で分割し、一つのディレクトリに集まる件数を分散させます。

taskとtodoも日別まで分割します。scheduleとday-planは月別までとし、記録種別ごとの件数と探し方に合わせて階層の深さを決めます。全ファイル数は変わらないため、全件検索の速度改善をこの構造だけで保証するものではありません。

## 確定した配置

すべて対象daybookリポジトリのルートからの相対パスです。日付は既存のAsia/Tokyo規則に従います。

| 種別 | 標準パス | 日付ディレクトリの意味 |
| --- | --- | --- |
| activity | `activities/YYYY/YYYYMM/YYYYMMDD/activity-YYYYMMDDaaa.md` | 活動日 |
| task | `tasks/YYYY/YYYYMM/YYYYMMDD/task-YYYYMM-NNNNN-name.md` | 作成日。既存taskで不明なら移行時の開始日 |
| todo | `todos/YYYY/YYYYMM/YYYYMMDD/todo-YYYYMM-NNNNN-name.md` | 作成日 |
| schedule | `schedules/YYYY/YYYYMM/schedule-YYYYMMDD-name.md` | 開催月。ファイル名には開催日を保持 |
| day-plan | `day-plans/YYYY/YYYYMM/day-plan-YYYYMMDD.md` | 生成対象月。ファイル名には対象日を保持 |
| attachment | `attachments/YYYY/YYYYMM/<関連する記録の識別子>/<filename>` | 新規資料が生じた活動月。scheduleだけの資料は開催月 |
| topic | `topics/<name>.md` または用途に合うサブディレクトリ | 日付で分割しない |
| Waypoint | `waypoints/YYYYMMDD-HHMM-topic.md`、既存の連番形式も使用 | 既存の命名を維持 |

例えば、2026-11-17の記録は次の配置になります。

```text
daybook/
├── activities/2026/202611/20261117/activity-20261117aaa.md
├── tasks/2026/202611/20261117/task-202611-00001-example.md
├── todos/2026/202611/20261117/todo-202611-00001-example.md
├── schedules/2026/202611/schedule-20261117-example.md
├── day-plans/2026/202611/day-plan-20261117.md
├── attachments/2026/202611/
│   ├── activity-20261117aaa/findings.md
│   ├── task-202610-00014/result.md
│   └── schedule-20261117-example/material.md
├── topics/
└── waypoints/
```

## 記録の識別と日付

- 新規activityの接尾辞は各活動日の`aaa`から始め、`aab`、`aaz`、`aba`と進みます。`zzz`の次は`aaaa`です。既存の短い接尾辞と接尾辞なしの記録の扱いは、現在の互換規則を引き継ぎます。
- task-idは`task-YYYYMM-NNNNN`、todo-idは`todo-YYYYMM-NNNNN`を維持します。採番はそれぞれ独立した月単位の連番で、日が変わってもリセットしません。
- taskとtodoの保存日は原則として作成日で固定します。作成日不明の既存taskを移行する場合は、開始日を代わりの配置日にします。一度保存した後は予定日の変更、着手、完了、取消などによってディレクトリを移しません。11月17日に作成した12月予定の新規taskも、`tasks/2026/202611/20261117/`に残ります。
- 新規記録では、作成日または活動日、日付ディレクトリ、ファイル名・IDに含まれる年月の対応を検証します。scheduleとday-planはそれぞれ開催日と対象日を使います。
- taskとtodoの一覧・検索は、指定がなければ全作成日を横断します。日別ディレクトリを新設しても、既存の対象状態・表示列・順序・日付絞り込みの規則を維持します。

## 添付の所属

月の下のフォルダ名は、既存taskと明確な関係があればそのtask-id、activityだけに属する場合はactivityの実際のファイル名stem、scheduleだけの場合はscheduleのstemを使います。todo・topic専用の添付フォルダは追加しません。

task関連の新規添付でも、資料が生じた活動月とtaskの作成月は異なる場合があります。例の`attachments/2026/202611/task-202610-00014/`は有効です。activityを伴わないtask関連資料の日付は、既存の[添付規則](../../skills/igapyon-miku-daybook/references/attachments.md)に従います。

通常の追記、月替わり、新たなtask・topicとの関連付けでは、既存添付の保存先を維持して参照します。配置変更の移行で既存添付を動かす場合は、移行対象とパス対応を明示してリンクも更新します。テキスト・外部の安定した参照を優先する保管方針と、同じ資料を一つの正本へ集約する方針を引き継ぎます。

## 移行の方針

目標とする標準配置は本書の一つに揃えます。移行期間には旧配置`YYYY/YYYYMM/{activities,tasks,todos,schedules,day-plan,attachments}/`を読み取れるようにし、既存記録を欠落扱いにしたり、再登録したりしない設計にします。

実データを移す工程では、対象ファイルと新旧パスの対応表を作り、記録間・添付への相対リンクを更新します。記録のID、ファイル名、内容、日付の意味、Issue出典を保持します。

利用者の追加指定により、作成日不明の既存taskは開始日（`planned_start_date`、旧形式は`planned_date`）を配置日の代わりに使います。採用した日付と根拠を移行対応表とtaskの短い履歴へ残し、実際の作成日が判明したものとして`created`を補完する必要はありません。移行後の開始日変更でも保存先を維持します。作成日と有効な開始日の両方がない場合だけ旧配置で保留します。

この代替配置では、ディレクトリの年月とtask-id内の年月が異なっても有効です。例えば`task-202610-00014-example.md`の作成日が不明で開始日が11月17日なら、IDを変えず`tasks/2026/202611/20261117/task-202610-00014-example.md`へ移します。新規taskの作成日・ID月の照合とは区別して読み取りを検証します。

採番は移行中の新旧配置、ローカルGit履歴、同じ処理の割当済みパスを横断し、既存・削除済みの識別子を再利用しないようにします。移動履歴も考慮します。taskの採番対象月はID内の年月で判定し、代替配置によって別月のディレクトリへ移った既存IDも対象に含めます。

保存済みのIssue取り込みplan/resultなどが旧パスを指す場合は、その参照を確認します。実際のファイル移動後に古いplanを黙って別パスへ読み替えてapplyせず、再prepareまたは個別の移行処理で整合させます。

## 実装済み箇所

以下のsourceとskill文書を更新しました。詳細な変更・検証記録は[実装計画の完了記録](daybook-record-layout-implementation.md)にあります。

- [記録形式](../../skills/igapyon-miku-daybook/references/records.md)、[操作手順](../../skills/igapyon-miku-daybook/references/operations.md)、[todo](../../skills/igapyon-miku-daybook/references/todos.md)、[活動検索](../../skills/igapyon-miku-daybook/references/activity-capture.md)、添付・Waypoint・URL関連付け・Issue取り込み・通知の参照パスと例を揃えます。
- [activity helper](../../skills/igapyon-miku-daybook/assets/daybook/scripts/activity-files.mjs)の作成先、旧記録の読み取りと更新、採番探索、親ディレクトリ検証を対応させます。排他的な新規作成と更新前ハッシュ照合を維持します。
- [day-plan generator](../../skills/igapyon-miku-daybook/assets/daybook/scripts/day-plan.mjs)のtask/schedule探索、正規出力先、記録への相対リンクを対応させます。
- [Issue取り込み](../../skills/igapyon-miku-daybook/assets/daybook/scripts/issue-import.mjs)の出典探索、月単位task採番、新規パス生成、既存記録へのリンク、パス検証、activity書き込み判定、再apply時の整合を対応させます。
- README、配布用案内、運用用SKILL/referencesと同梱runtimeを同じ仕様へ揃えます。対象daybookのREADME・runtimeとの統合、実データ移行、インストール済みskillの更新は、それぞれ実施状況を記録します。

sourceの検証では、新規作成、task/todoの月単位採番と全日横断、旧記録の読み取り・更新、新旧配置をまたぐ探索、相対リンク、day-planと通知、Issue取り込みの出典検出・重複防止・再applyを確認しました。実daybookの移行前後に記録内容と日付の意味を確認する工程は、対象repoが特定された後続作業です。
