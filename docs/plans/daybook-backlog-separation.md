# daybook：今日の作業と Backlog を分ける実装計画

作成日：2026-10-19。状態：**source実装・fixture検証完了（2026-10-19）**。想定実装モデル：Luna。

この計画は「対応を計画して。Lunaが実装できるレベルの計画。実装はまだ」という指示で作成し、後続の実装指示を受けて BLG-00 以降を実行した。実装はこのリポジトリの skill source と fixtures に限定し、実 daybook の分類・スクリプト配備・version・公開・GitHub操作は行っていない。

## 1. 解決する問題と実装範囲

現在は、未完了 task の予定期間に対象日が含まれると、すべて day-plan の「今日の作業予定」に入る。期間が広い着手候補も毎日の作業として並び、当日の作業が見づらくなる。

task に英語の属性 `planning_state` を追加し、`planned` と `backlog` を区別する。day-plan は「今日の作業予定」を保ち、別の `Backlog` 欄を持つ。Backlog の期間に今日が含まれていても、Backlog 欄だけに表示する。

利用者が求めたこと：

- 内部の概念名を英語の `backlog` とする。
- 今日の作業と Backlog を day-plan 上でも分ける。
- 今回は実装計画だけを作成する。

以下の互換性、日付省略、表示順、Issue 取り込みの規則は、この計画で採用する具体案。実装時の判断を残さないため、後述の規則を一式として扱う。

変更対象はこのリポジトリの `skills/igapyon-miku-daybook/` にある source と同梱コード、関連説明、検証。実 daybook の記録・スクリプト、インストール済みスキル、GitHub、通知設定の変更は別工程とする。version 更新、commit/push、PR、tag、Release、配備はこの実装計画に含めない。

今回も `planned` の期間内 task は従来どおり「今日の作業予定」に入る。日ごとの明示的な選抜、表示件数の上限、Backlog の自動昇格、日付や優先度からの自動分類は追加しない。Backlog 全件を別欄へ出すため、day-plan 全体の長さは task 数に応じて増える。

## 2. 調査済みの現状と変更箇所

計画時の checkout は `devel-tiga1017lab`、HEAD `b7c992e`、追跡先 `origin/devel` と同位置、作業ツリーは clean。実装再開時は実際の Git 状態を確認し、この HEAD を固定条件にしない。古い GOAL/HANDOFF に残る別作業やブランチを再開しない。

以下では `B = skills/igapyon-miku-daybook`、`S = B/assets/daybook/scripts` と略記する。コマンド中では実際のパスを使う。

| 現在のファイル・処理 | 確認できたこと | 変更内容 |
| --- | --- | --- |
| `S/day-plan.mjs` の `recordFromFile` | YAML の raw 値と文字列化後の値を区別して検証 | raw 値で `planning_state` を厳密に検証 |
| 同 `buildDayPlan` | `activeTasks` から日程要確認・期間・予定週を選択 | 最初に planned/backlog を分け、全 task 欄の入力を統一 |
| 同 `section`、`taskLine` 等 | Markdown の見出しと箇条書きを生成 | Backlog の行と見出し、`records.backlogTasks` を追加 |
| `S/generate-day-plan.mjs` | 正本パスと `--output-root` を扱う薄い CLI | コード変更は原則不要。新しい分離を CLI テストで確認 |
| `S/post-day-plan.mjs` の `renderComment` | Markdown 全体を保ち、相対リンクを GitHub URL に変換 | コード変更は原則不要。両欄とリンクの保持をテスト |
| `S/issue-import.mjs` | `deriveTaskDates` が未指定日を補完し、`renderTask` が task を生成 | task-create の任意属性追加と Backlog の日付未補完に対応 |
| 同 `issueReceiptBody`、`renderPreview` | `period.start/end` が必ずある前提の表示 | 日付なし・片側のみの Backlog を表示可能にする |
| `B/references/records.md` | 新規普通 task の両端日付を必須としている | planned の日付規則と Backlog の省略規則を区別 |
| `B/references/operations.md`、`B/SKILL.md` | 新規 task・一覧・生成・週次操作を案内 | 属性の編集、作成、欄分け、相互変換を説明 |
| `B/references/task-date-migration.md` | 不足日付を補完する移行案内 | Backlog の欠けた日付を補完しない例外を接続 |
| `DEVELOPMENT.md` | 現在の daybook 記録モデル・日付移行の説明先 | Backlog の使い方と導入時の注意を追加 |

以前の計画書には README の旧章への指示が残っているが、その説明は現在 `DEVELOPMENT.md` にある。現状の構成に追記し、README に旧章を再作成しない。

## 3. task のデータ契約

### 3.1 属性・既定値・進捗との関係

```yaml
type: task
id: task-202610-00001
status: todo
planning_state: backlog
priority: 5
created: 2026-10-19
```

| 項目 | 規則 |
| --- | --- |
| 属性名 | `planning_state` |
| 許可値 | scalar YAML string の `planned` または `backlog`。大文字小文字もこのとおり |
| 属性自体の省略 | 既存互換として `planned` 相当。読み取りのために元ファイルへ属性を追記しない |
| 明示した不正値 | 空文字、null、数値、boolean、配列、object、未知の文字列はエラー |
| 新規 task | manual 編集、Issue 取り込みとも、実効値を明示して保存する |
| 新規 task の既定 | Backlog の指定がなければ `planned`。日付未指定だけでは Backlog に分類しない |
| `status` | 従来の `todo` / `in_progress` / `done` / `cancelled`。計画属性から進捗を推測しない |
| 対象の型 | task 用属性。schedule/activity/day-plan の型や属性には追加しない |

新属性に対する検証は `parseFrontMatter` 全体へ追加せず、task reader に置く。`post-day-plan.mjs` も使う一般的な front matter parser の振る舞いを変えない。`recordFromFile` は `rawFrontMatter` で検証し、`String(value)` 後の見かけの一致を受理しない。

不正値のエラーは `planning_state must be planned or backlog` と対象ファイルパスを含める。省略は `Object.hasOwn` で区別し、`value || "planned"` などで空値を省略として受理しない。

### 3.2 予定期間と確定度

- `planned` の新規普通 task は、現在の両端日付・暫定補完・`planned_dates_status` の規則を使う。
- `backlog` は両端の日付を省略できる。日付なしで登録する際、今日や取り込み日を補わない。
- Backlog に明示日付がある場合は、両端・片側のいずれでもその値を保持できる。相手側を作らない。既存 task を Backlog に変更するときも、期間や `planned_week` を勝手に消さない。
- 日付がある場合は、Backlog でも既存の実在日付・型・新旧 alias 一致・開始終了順の検証を必ず行う。Backlog を、不正データを読み飛ばす条件にしない。
- `planned_dates_status` がある場合は、Backlog でも両端日付が必要。許可値、週次 task での禁止も現在のまま。両端不揃いの新規 Backlog にはこの属性を書かない。
- 新規 Backlog の両端が明示されている場合は `confirmed` とできる。これは日付の根拠を表し、`planned` への昇格を意味しない。既存の `provisional` はそのまま保持できる。
- `due_month`、本文の外部締切・根拠、`planned_action`、リンク、添付、履歴を保持する。予定終了日を外部締切に読み替えない。

`planning_state: backlog` と `status: in_progress` の組み合わせも許容する。今回の属性を導入するために既存の進捗状態を変更しない。

週次 task との組み合わせも許容する。無期限週次ルールの日付省略の扱いは継続する。Backlog 分類だけでは occurrence schedule の作成・中止・rollover をしない。明示的な週次登録・rollover の既存の編集範囲はそのまま適用し、`planning_state` を自動変更しない。schedule は独立した記録として表示する。

### 3.3 更新と相互変換

| 依頼 | 編集 |
| --- | --- |
| 「これを Backlog にして」 | 指定 task に `planning_state: backlog`。status、ID、期間などは保持し、短い変更履歴を追加 |
| 「日付なしの Backlog として追加」 | 新規 task に backlog を明記。両端と `planned_dates_status` を省略 |
| 「この Backlog を10月20日の予定にして」 | planned に変更し、両端を明示された10月20日にする。両端が明示されているため confirmed |
| 「この Backlog を予定に載せて」、日付なし/片側 | planned に変更し、現在の普通 task の不足日付補完規則を適用。補った値と根拠を履歴・応答へ記録し provisional |
| 「予定に載せて」、完全な既存期間あり | 既存期間と確定度を保持。日付の再確認を依頼されていない限り、provisional を confirmed にしない。過去の日付を今日へずらさない |
| 一覧・説明・生成の依頼 | 元 task を編集しない。自動分類や Backlog の昇格をしない |

期間なしの週次 task を planned にする場合は既存の週次例外を使い、不自然な終了日を作らない。Backlog 分類時もファイルを専用フォルダへ移さず、同じ task ID と作成月の `tasks/` ディレクトリを使う。

## 4. day-plan の選択・出力契約

### 4.1 選択の順序

`buildDayPlan` は既存の `loadRecords` と `isActiveTask` を使い、次の順で選択する。

```text
activeTasks  = tasks.filter(isActiveTask)
backlogTasks = activeTasks.filter(planning_state == "backlog")
plannedTasks = activeTasks.filter(planning_state != "backlog")

datedTasks      = plannedTasks のうち、両端があり、日程要確認でないもの
dateReviewTasks = plannedTasks のうち、現在の needsDateReview を満たすもの
todayTasks / overdueTasks / nearEndTasks / upcomingStartTasks = datedTasks から従来どおり選択
plannedWeekTasks = plannedTasks から従来どおり選択
nearSchedules   = schedules から従来どおり選択
```

属性省略が planned になることは reader/選択側の一つの解釈として統一する。`plannedWeekTasks` だけ `activeTasks` のまま残す漏れに注意する。

Backlog は、全年・全月の正規 task ディレクトリの active task を対象に、予定期間・対象日・7日間の窓・確定度にかかわらず集める。done/cancelled は表示しない。今回も生成時点の source を読むスナップショットであり、過去日の task 状態を復元しない。

Backlog は次の全 task 配列に混入させない：`todayTasks`、`overdueTasks`、`nearEndTasks`、`upcomingStartTasks`、`dateReviewTasks`、`plannedWeekTasks`。日付の欠落・暫定・期間超過も Backlog 内の参考情報として扱い、別欄に重複表示しない。

### 4.2 表示と返却値

既存7欄の順序・見出しを保ち、`実施予定週` の後、`参照方針` の前に `## Backlog` を追加する。0件でも `- なし` と表示する。省略・件数上限・優先度による除外を追加しない。

Backlog は priority 昇順（省略時5）、同順位は完全な task ID 昇順。`comparePriorityThenId` を再利用する。期間は並べ替えに使わない。

```markdown
## 今日の作業予定

- [参加費を支払う](../tasks/task-202610-00002-pay-fee.md)（優先度 2）
  - 2026-10-19〜2026-10-19：振り込む

## Backlog

- task-202610-00001：[録音整理の改善](../tasks/task-202610-00001-audio.md)（優先度 5 / 状態 todo）
  - 参考予定期間 2026-10-01〜2026-12-31
- task-202610-00003：[資料整理](../tasks/task-202610-00003-docs.md)（優先度 5 / 状態 todo）
  - 予定期間未設定
```

上は該当欄だけの抜粋。リンクは既存の `taskLink` / `relativeLinkFromDayPlan` を使う。Backlog 行には完全な task ID、title、priority、status を表示し、欠けた旧 status は `—` とする。IDやリンクの規則は従来どおり検証する。

参考情報の文言を固定する：

| 保存されている情報 | Backlog 行の補足 |
| --- | --- |
| 両端 | `参考予定期間 START〜END`。provisional の場合は直後に `（暫定）` |
| 開始のみ | `参考開始 START` |
| 終了のみ | `参考終了 END` |
| 両端なし | `予定期間未設定` |
| `due_month` | 上に ` / 期限月 YYYY-MM` を追加 |
| `planned_week` | 上に ` / 参考予定週 YYYY-MM-DD` を追加 |
| 週次の `next_occurrence` | 保存されていれば ` / 次回 YYYY-MM-DD` を追加。日付から分類を変えない |

実装は小さな `backlogLine(date, task)` などにまとめ、`taskPeriod` を日付なし task にそのまま呼ばない。`undefined〜undefined` や `null〜null` を出力しない。

`buildDayPlan` の `records` に `backlogTasks` を加える。既存のキー名・戻り値・正本パス・CLI オプションは保持する。`参照方針` の説明を「当日の作業、7日間の予定、未完了のBacklogを含むスナップショット」に合わせる。

## 5. task 一覧とスキルの編集指示

`records.md` を属性 schema の正本、`operations.md` を編集・選択手順の正本とする。`SKILL.md` は短い入口と参照にとどめる。

- 普通 task の新規作成は planned を既定とし、Backlog と指定された場合のみ backlog とする。日本語の「着手候補」「今は予定に載せず残して」なども文脈で判断し、合言葉の一致を必須にしない。
- 単に日付がない、低優先度、長期間、未着手という理由では Backlog と推定しない。新しい既定値を全 task へ一括追記しない。
- 通常の全 active task 一覧には planned と Backlog の両方を含め、`Backlog` を独立したグループにする。planned 内の並びは既存の日付/日程要確認の規則を使う。
- 一覧列は `ID / Priority / Status / Planning state / Planned start / Planned end / Title` とする。属性省略は表示上 `planned`、欠けた日付は `—`。Backlog は priority、ID の順。
- 「Backlog一覧」「今日の作業だけ」など明示された絞り込みに従う。Backlog 一覧の依頼でも今日を含む期間を必須にしない。
- URL関連探索は現在どおり全状態の task を探す。Backlog を探索対象から除外しない。今回の属性追加を理由に活動記録の追加や task 更新を広げない。
- 日付キー移行ガイドの不足日付補完は planned の普通 task に適用する。Backlog の日付省略を日程不備として埋めない。

新規 `B/references/task-planning-migration.md` に、導入と既存 task の分類を説明する。schema と生成アルゴリズムは重複記載せず、records/operations の対応節へリンクする。

## 6. Issue 取り込みとの統合

### 6.1 manifest の互換性

`S/issue-import.mjs` の task-create record に、任意の `planning_state` を追加する。省略は planned。過去の manifest は引き続き入力でき、source/manifest/plan/result の `schema_version: 1` を維持する。

`validateRecord` は raw JSON の値を同じ enum と型で検証し、不正値は `INVALID_MANIFEST` と issue番号・record key を返す。省略時は manifest オブジェクトへ既定属性を注入せず、実効値を使う側で解決する。`planning_state` を task-create 以外（schedule/activity/link-existing）に指定した場合は `INVALID_MANIFEST` とする。現在の link-existing の早期 return より前にこの対象型の検証を行う。

既存記録への link-existing は、その記録の `planning_state`・status・期間を保持する。取り込みのついでに分類を変えない。

Agent は Backlog 登録も依頼された場合に manifest へ backlog を指定する。「GitHub backlog の取り込み」という語だけで、個々の task の予定指定を無視して全件を Backlog に変えない。利用者の分類指定と確認できた計画に従い、指定がない従来フローは planned を使う。

### 6.2 `deriveTaskDates` と作成される task

planned/属性省略の場合の返却値・補完理由は現在どおりとする。backlog は次の形を返す：

```js
// backlog: 日付なし
{ start: null, end: null, status: null, reasons: [] }
// backlog: 開始だけ指定
{ start: "2026-10-20", end: null, status: null, reasons: [] }
// backlog: 両端が明示されている
{ start: "2026-10-20", end: "2026-10-31", status: "confirmed", reasons: [] }
```

終了のみの場合も対称に扱う。日付妥当性と逆転検査は Backlog 分岐より前に実施する。指定日には既存の `date_evidence` を引き続き要求し、外部締切を予定期間へ変換しない。

`renderTask` は実効 `planning_state` を必ず書き、null の端点と null の `planned_dates_status` は YAML key ごと省略する。planned の生成内容へは属性だけを追加し、従来の暫定期間と根拠を保持する。Backlog の履歴には `Backlogとして登録した` と、保存した日付の意味が分かる説明を入れる。日付なし Backlog の履歴に「取り込み日へ暫定設定」「日程要確認」を入れない。

### 6.3 preview・receipt・保存済み実行の扱い

nullable な期間への対応箇所を漏らさない。少なくとも以下を変更・確認する：

- `materializeCreateRecord`：`renderTask` が返す期間と再計算する期間の整合を保つ。
- `prepareIssueImport` の `periods` / `recordsWithPeriod`：task-create の plan record に実効 `planning_state` を加える。従来の period shape は planned で保持する。
- `issueReceiptBody` と `renderPreview`：Backlog を明示し、日付なしは `予定期間未設定`、片側は `参考開始` / `参考終了`、両端は `参考予定期間` として表示。null/undefined の文字列を出さない。
- `provisionalQuestions` と receipt の provisional 判定：Backlog の `reasons: []` と `status: null` から日程要確認を生成しない。planned の provisional に対する既存案内は保持する。

plan/receipt の marker、import_id の算定式、重複判定、plan digest、source refresh、apply の排他・journal・hash検証、comment/close の手順を変更しない。新しく prepare した plan の bytes/digest が新属性により変わることは正常。保存済み v1 plan/result は保存された bytes を使って再開し、新属性を書き足すための再生成はしない。古い plan に属性がなくても適用/再開を受理する。

`S/import-issues.mjs` の CLI オプションやサブコマンド追加は不要。Backlog を選べる manifest 例と preview 確認点を `references/issue-import.md` に追加する。

## 7. 通知と既存データの導入手順

通知は day-plan の Markdown 全体を使うため、生成後の `Backlog` 欄もコメントへ引き継ぐ。`post-day-plan.mjs` の重複防止・marker・mention・投稿先・cron・workflow の権限は今回の変更対象にしない。通知用 bundle と Issue 取り込み用 bundle の準備範囲も維持する。

新しい移行ガイドには次の順序を記載する。これは後日の明示的な導入/記録更新依頼で行う手順で、今回の source 実装に含めて実行しない。

1. 対象 daybook の README・Git 状態・独自 scripts を確認する。
2. 対応する skill と対象 daybook の generator を同じ更新内容へ揃える。Issue 取り込みを使う場合はその helper も更新する。旧 generator は新属性を無視して Backlog を今日の作業へ出すため、先に task だけ編集しない。更新済みかは実際の source/support を確認し、未付与の Release 番号を作らない。
3. 違う既存実装を無条件に上書きしない。通知の場合は、その実行元ブランチに更新済みコードがあることも別途確認する。
4. 利用者が指定した task を読み、Backlog とする一覧と変更を確認する。期間の長さ・未着手・priority だけで全件を自動分類しない。実装時の全件データ移行は不要。
5. 同じファイルへ `planning_state: backlog` を付け、進捗、期間、確定度、締切、ID、リンクを保持する。短い履歴を加える。planned を明記する既存 task も必要な依頼範囲だけを扱う。
6. `--output-root` を使った別出力先で代表日を生成し、今日/Backlog の欄分けと source 不変を確認する。
7. 分類されていない旧 task は従来どおり表示されることを説明し、残る task を勝手に移行しない。

## 8. Luna 向けの作業順序

各段階でチェックリストを実績に合わせて更新する。

### BLG-00：ベースライン確認

- [x] 後続の実装指示と本計画を読む。
- [x] `git status -sb`、関連 diff、現在の source を確認し、既存変更を保持する。
- [x] 第2節の実在パスと関数、テストの fixture helper、Issue period の利用箇所を確認する。
- [x] 未導入の依存関係だけを既存 package/lock の方針で準備する。新しい npm 依存は追加しない（既存依存で実行できたため変更なし）。

完了条件：対象 source、保護する差分、実行する既存テストが特定されている。

### BLG-01：reader・選択・Markdown を実装

- [x] raw YAML の `planning_state` 検証を追加する。
- [x] active task を backlog/planned に分け、日付欄と予定週は planned の集合を使う。
- [x] priority/ID で整列した `backlogTasks` と専用行 renderer、空欄表示を追加する。
- [x] `Backlog` 欄、`records.backlogTasks`、参照方針の文を追加する。
- [x] 第9節 D1〜D12 の対象を網羅する代表 fixture テストを `day-plan.test.mjs` に実装する。

完了条件：Backlog が全 task 日付欄から外れ、専用欄に一度だけ表示され、属性省略の既存挙動が維持される。

### BLG-02：Issue 取り込みを統合

- [x] manifest の任意属性と対象型を検証する。
- [x] `deriveTaskDates` の backlog 分岐、`renderTask` の属性と nullable key の扱いを実装する。
- [x] period 利用箇所、preview、receipt、日程確認文を第6節に従って整合させる。
- [x] 第9節 I1〜I7 の対象 fixture テストを既存の Issue テストへ追加する。

完了条件：explicit backlog と旧 manifest の両方を prepare/apply でき、取り込み後の day-plan でも同じ分類になる。

### BLG-03：schema と操作指示を統合

- [x] records.md に schema と予定期間の例外を定義する。
- [x] operations.md の Add/Update a task、Task list、Generate a day-plan を更新する。
- [x] SKILL.md の具体的 task、新規日付、一覧、day-plan の段落を正本へ接続する。
- [x] issue-import.md に任意属性、例、日付省略、preview確認点を追加する。
- [x] task-date-migration.md の不足日付補完を planned に限定し、新ガイドへ案内する。
- [x] 新規 task-planning-migration.md を作り、SKILL/operations から案内する。
- [x] weekly、URL探索、activity-only の既存範囲との静的な矛盾確認を行う。

完了条件：どの入口でも既定値・Backlogの日付省略・状態遷移・day-planの分類が一致する。

### BLG-04：利用者向け説明と通知を確認

- [x] README の daybook 説明へ、今日の作業と Backlog を分けられる旨を短く追加する。
- [x] DEVELOPMENT.md の daybook 節に登録/予定化の依頼例と移行ガイドへのリンクを追加する。
- [x] notification.md に、両欄を含む通知と対象 generator の更新が必要なことを記載する。
- [x] `post-day-plan.test.mjs` に P1 の renderer 統合確認を追加する。実投稿はしない。

完了条件：source 更新と実 daybook/通知への配備を混同せず、使い方が説明されている。

### BLG-05：検証と引き継ぎ

- [x] 第10節の対象 suite と文書照合を実施し、失敗を修正する。
- [x] TODO/HANDOFF/本計画に実際の完了項目、実行した検証、制約を記録する。
- [x] source 実装、実データ分類、配備、公開のそれぞれの実施状況を明記する。

完了条件：第11節の受入条件を満たし、未実施を実施済みと記録していない。

## 9. 検証ケース

既存の `node:test` と fixture helper を拡張する。実 daybook、実 GitHub、通知先は使わない。配列の所属を主な検証対象とし、ファイル全体の文言一致だけのテストにしない。

### 9.1 day-plan

基準日は `2026-10-19`、window は `2026-10-25` まで。作成月と ID が一致する正規 task を作る。

| ID | fixture・条件 | 期待 |
| --- | --- | --- |
| D1 | 同じ期間 10/01〜12/31 の explicit planned と backlog | planned は今日。backlog は Backlog だけ。配列と見出し内の両方で確認 |
| D2 | 属性省略の旧 task、期間あり/なし/provisional、旧 alias あり | 既存の選択結果と alias 検証を維持。Backlog は空 |
| D3 | backlog の期間を今日内・昨日終了・明日開始・窓外終了、予定週重複で用意 | すべて backlogTasks。日付関連6配列へ0件。priority 1 でも他欄へ入らない |
| D4 | backlog で日付なし、開始のみ、終了のみ、provisionalな両端 | Backlogだけ。日程要確認に0件。参考情報は第4節の表どおり |
| D5 | backlog の done/cancelled、todo/in_progress | 未完了2件だけを表示。状態属性を生成で変更しない |
| D6 | 前年・前月・今月の backlog、同priority、priority省略 | 全月から収集しpriority→完全ID順。省略priorityは5 |
| D7 | YAML の値が配列/object/null/数値/boolean/空文字/`Backlog`/`pending` | それぞれ失敗。エラーに属性名とファイルパス。属性省略は成功 |
| D8 | backlog の不正日付、逆転、新旧alias不一致、片側しかないのに dates_status あり | 現在の検証で失敗。Backlog判定による検証スキップなし |
| D9 | 無期限週次 backlog と、同 task にリンクした対象日の有効 schedule | task は Backlog、schedule は近々の予定。source・次回日付を変更しない |
| D10 | backlog 0件/1件、空のsource、月を跨ぐリンク | 見出しと「なし」、1件は1回だけ、完全IDと正しい相対リンク。null/undefinedを出さない |
| D11 | CLIの通常出力・`--output-root`・同日再生成に backlog を混ぜる | 両欄が生成される。staging時に正本plan不変。全task/scheduleの前後bytes不変 |
| D12 | 同じtaskをbacklog→plannedへfixtureで編集、planned日付はprovisional/confirmedを分ける | provisionalは日程要確認、confirmedは期間内なら今日へ。backlogTasksから消える。日付を書き換えるのはテストfixture操作だけ |

既存 reader は task の入力集合全体を検証する。done/cancelled に新属性の不正値があっても無条件に無視する処理は作らない。

### 9.2 Issue 取り込み

| ID | fixture・条件 | 期待 |
| --- | --- | --- |
| I1 | task-create の backlog、日付なし | deriveはnull形。taskにbacklogを明記し両端/dates_status省略。preview/receiptにBacklog・期間未設定。暫定補完文なし |
| I2 | backlog の両端明示/開始のみ/終了のみ。各指定日にはdate_evidence | 指定値だけ保存。両端のみconfirmed。片側を補わない。preview/receiptにnull/undefinedなし |
| I3 | planning_state省略とexplicit plannedで日付欠落・片側・両端 | 既存の補完日/根拠/確定度を保持し、作成taskにはplannedを明記 |
| I4 | 不正planning_state、非task-createへの属性、日付根拠不足、日付逆転 | 不正属性/対象型はINVALID_MANIFEST、日付は既存の対応エラーで拒否 |
| I5 | backlogとplannedを同一importでprepare→apply→buildDayPlan | ローカル書込みと日程分類が一致。prepareでは正規記録を変更せず、apply再実行は重複作成しない |
| I6 | 既存Backlog taskへのlink-existing | planning_state/status/期間を保持。provenance/履歴だけを既存仕様で追記。manifestから分類変更不可 |
| I7 | 新属性のない保存済みv1 plan/resultの適用/再開 | 元のwrite bytesとhashを使い成功。taskへ属性を自動注入しない。既存のpartial-write/conflict/hashテストも維持 |

I7 は既存の保存plan fixture/テスト構造を利用する。必要なら旧形のplanを組み立てるtest helperでfixture rootとdigestを整合させる。productionのplan検証を緩めたり、実行中planを手作業で書き換える回復手順を追加しない。

### 9.3 通知表示と Agent 向け指示

P1：一時 fixture の `buildDayPlan` 結果を `renderComment` へ渡す。今日とBacklogの両見出し、優先度、Backlogの完全ID・状態・参考期間を保持し、両方の相対リンクが同じ架空 repo/sha の正しいURLに変換されることを確認する。renderだけを使い、fetch/投稿は行わない。既存の重複防止テストは全件維持する。

Agent 向けには次を静的に指示へ照合する。独立したモデル挙動評価を実施したものとは報告しない。

| ID | 依頼 | 期待する指示 |
| --- | --- | --- |
| A1 | 「録音整理を日付なしのBacklogとして登録して」 | backlog、新ID、日付補完なし |
| A2 | 「taskを追加。日付はまだ決めていない」 | planned既定、従来のprovisional補完。Backlogへの自動推定なし |
| A3 | 「このtaskをBacklogへ」、長い既存期間あり | 指定taskの分類と短い履歴を更新。期間・状態は保持 |
| A4 | 「Backlogを10月20日にやる予定にして」 | 同じtaskをplannedへ。両端10/20、confirmed。新taskを重複作成しない |
| A5 | 「day-planを出して」「Backlog一覧を見せて」 | source分類の変更なし。日程未設定Backlogを日程不備として補わない |
| A6 | 「今日調べたことをactivitiesへ記録して」 | 既存の活動のみの範囲。関連Backlogのstatus/planning_stateを変更しない |
| A7 | URLと関連taskの確認 | Backlogも探索対象。探索だけなら分類・リンクを変更しない |
| A8 | 旧日付キーの移行依頼に日付なしBacklogが含まれる | Backlogの日付省略を維持し、planned用の補完を流用しない。rolloverしない |

## 10. 検証の実行手順

実装時は既存 `yaml` が読み込み可能なら依存導入を省く。必要時のみ同梱 package のディレクトリで既存 lock に従って `npm ci` を実行する。新依存・無関係なlock更新は不要。

root repository から：

```sh
npm --prefix skills/igapyon-miku-daybook/assets/daybook test
npm run test:skill-index-policy
git diff --check
```

上は daybook 全4 test files（day-plan、post-day-plan、issue-import、import-issues CLI）と、root の参照・配布関連suiteを対象とする。既存の全caseを維持し、新caseを追加する。テスト数は実際の出力を記録し、計画時に推測した数で合格を宣言しない。

さらに以下を読むことで確認する：

- schema・作成規則・一覧列・生成条件がSKILL/records/operationsで一致する。
- DEVELOPMENT、README、notification、issue-import、両移行ガイドのリンク先が実在する。
- 新しい reference がSKILL/operationsから到達できる。
- 第9節A1〜A8の指示照合結果が説明できる。
- Git diff の変更が第2/8節の対象ファイルに収まる。元データ、配備先、version、通知設定が変更されていない。

配布の生成経路・除外規則は変更しないため、このsliceで全外部skillを取得するMaven packageやmiku-scm full suiteは必須にしない。参照・配布suiteで実際に失敗した場合は原因に応じた追加検証を行い、別作業の失敗を今回の変更へ混ぜない。

## 11. 最終受入条件

1. `planning_state: backlog` の未完了 task は、期間・優先度・確定度によらずday-planのBacklog欄にだけ一度表示される。
2. 全6 task 日付欄からBacklogが除かれ、属性省略/explicit plannedの既存挙動を維持する。
3. Backlog は日付なしで新規作成でき、既存の日付や外部締切を失わない。不正型・不正日付は受理しない。
4. task の進捗、ID、作成月、添付、リンク、週次scheduleを分類だけで変更しない。
5. manual編集・一覧・Issue取り込み・生成・通知の分類規則が一致する。
6. 保存済みの旧record/manifest/plan/resultとの互換性と、sourceを変更しない生成がテストで確認されている。
7. 実装結果と検証実績がTODO/HANDOFF/本計画へ記録され、実データ分類・配備・公開は実施状況どおりに報告される。

## 12. 計画作成時の記録

- 現行reader、day-plan選択/表示、CLI、通知renderer、Issueのmanifest/date/preview/receipt、関連tests、skill/reference、DEVELOPMENTを参照した。
- 変更したのは本計画とTODO/HANDOFFの計画案内のみ。source・test・package・実daybook記録は未変更。
- 本計画の作成に際して実装テストは実行していない。第9〜10節は将来の実装時に実施する検証。
- 計画作成後、`git diff --check` と新規計画書の whitespace 確認に指摘なし。`git status --short` で変更が本計画・TODO・HANDOFF の3ファイルだけであることを確認した。

## 13. 実装・検証記録（2026-10-19）

- `day-plan.mjs` は raw YAML の状態検証、planned/backlog の分割、Backlog行・空欄・参照方針・戻り値を実装。`day-plan.test.mjs` には日付範囲、部分日付、priority/ID順、完了/中止除外、週次schedule分離、旧属性、状態遷移、CLI出力とsource不変のfixtureを追加した。
- `issue-import.mjs` は task-create のみ任意の `planning_state` を受け付け、Backlogの日付を補わない。生成task、plan metadata、preview、receiptに状態を反映。`issue-import.test.mjs` で日付なし/片側/両端、manifest拒否、prepare/apply/day-plan、再apply、link-existingの保持、旧schema v1 plan/resultの適用・再開を確認した。
- 通知rendererのfixtureで今日とBacklog両欄、状態・優先度・参考期間、2つの相対リンクからGitHub URLへの変換を確認。実投稿はしていない。
- `npm test`（daybook 4 suite）：51/51 pass。
- `npm run test:skill-index-policy`：77/77 pass。
- `git diff --check`：指摘なし。変更Markdown 11文書の相対リンクを確認。
- 既存依存・package/lockは変更なし。source skill/reference、tests、README/DEVELOPMENT、TODO/HANDOFF、計画書のみ変更。実daybookのtask分類・canonical day-plan生成・skill配備・version・commit/push・GitHub操作は未実施。
