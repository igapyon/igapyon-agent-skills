---
title: daybookの使い勝手・応答速度・記録と作業支援の改善計画
description: daybook改善の実装範囲、回帰テスト、実対話評価の状態を記録する。
status: in_progress
created: 2026-11-13
updated: 2026-11-13
---

# daybookの使い勝手・応答速度・記録と作業支援の改善計画

## 目的と現在地

利用者から、使い勝手、応答速度の快適さ、記録を残す能力、作業支援についてレビューし、改善を計画する依頼を受けた。本計画は提案として作成し、後続の明示依頼を受けてUX-00〜03・05のsourceコードと文書へ反映した。実daybookへの移行・配備は行っていない。UX-04の実対話・速度評価とUX-06の追記CLI採否は未完了である。

初回レビューはソースと指示文に基づき、実対話での待ち時間、記録漏れ率、taskの陳腐化頻度は未測定である。後続の実装依頼によりUX-00〜03・05のsource規則とコードを更新したが、対象daybookへ配備していないため、実運用への適用と改善率は未確認である。

### Lunaへの引き継ぎに関する判断

変更を既存generatorの分類・表示と既存Markdownの指示更新に限定し、後述の具体的な手順と期待値を渡せば、Lunaが実装を進められる計画と判断する。これは作業の分解と仕様の具体性に基づく判断であり、Lunaによる実装試験を行った結果ではない。

初版に不足していた、新しい返却プロパティ名、表示順序・文面、現在のテスト期待値の変更、task更新範囲の具体例、準備確認を再利用できる条件を本書で固定した。特に、不完全なprovisional記録は現在のparserが拒否するため、日程要確認へ回す仕様にはしない。候補へ移動するtaskの期限月・予定週も保持する。

Luna向けに固定した初回実装範囲はUX-00〜03とUX-05。本ターンで該当するsource変更を実施した。UX-04の実対話・速度評価には隔離したモデル実行環境が必要であり、その環境は確認できていないため、対話品質や快適さの改善は実証済みとしない。UX-06の追記CLIは測定後の採否判断を保留し、その実装を今回の作業へ追加しない。

関連する現行資料：

- [スキル入口](../../skills/igapyon-miku-daybook/SKILL.md)
- [操作とtask/activityの責務](../../skills/igapyon-miku-daybook/references/operations.md)
- [会話とURLの記録](../../skills/igapyon-miku-daybook/references/activity-capture.md)
- [記録形式](../../skills/igapyon-miku-daybook/references/records.md)
- [Waypoint](../../skills/igapyon-miku-daybook/references/waypoints.md)
- [先行する会話記録計画](daybook-url-and-conversation-activity-capture.md)

## 守る設計

- taskは現在の状態、activityは日時を伴う経緯、Waypointは再開入口とする。同じ状態を別の管理ファイルへ重複させない。
- 初回発火の境界、利用中の会話記録、明示的な記録禁止・ファイル限定を維持する。スキルのレビューや計画作成だけではdaybookを起動しない。
- 結論やtaskとの関係が未確定でもactivityへ記録できる。提案、採用判断、観測、推測を区別する。
- 記録頻度を下げて速度を稼がない。実質的な応答の区切りで保存し、中断前の未保存分やバックグラウンド記録を保証しない。
- activity更新のSHA-256照合を維持する。直前確認から保存までの競合を許容する既存合意は維持し、ロックを再導入しない。
- 別repoへの参照はdaybook側に置く。外部操作、週次rollover、Issue取り込みの依頼境界を広げない。

## 改善A：暫定予定を作業の候補として使えるようにする

### 問題

日付不明の新規taskを今日の暫定期間で登録できる一方、generatorはprovisionalのtaskを日程要確認だけに出す。登録時の確認負担を減らしても、作業候補として見つけるには日程確認欄を読む必要がある。

### 推奨仕様

day-planに「今日の候補（予定は暫定）」を追加する。候補であることを明示し、確定予定の表示と区別する。自動選択は既存generatorに集約し、Agentが別ロジックを作らない。

| taskの状態 | 表示 |
| --- | --- |
| active、planned、provisional、完全な期間が対象日を含む | 今日の候補（予定は暫定） |
| provisionalで完全な期間が対象日より未来または過去 | 日程要確認 |
| plannedで期間が不完全、planned_dates_statusは省略 | 既存の日程要確認。ただし期間なし週次ルールを除く |
| planned_dates_statusが存在するのに期間が不完全 | 既存の検証エラー。Backlogや完了taskも検証を迂回しない |
| confirmedまたは従来形式で完全な期間 | 既存の日付別分類 |
| backlog | 既存のBacklogのみ |
| done / cancelled | 表示しない |
| 期間のない週次ルール | 既存の扱いを維持し、候補にしない |

候補にはtask-id、タイトル、優先度、暫定期間、既存のplanned_actionがあればそれを表示する。期限月・予定週があれば併記し、日程要確認から移すことで情報を落とさない。優先度、task-idで整列し、同じtaskを日程要確認にも重複表示しない。候補が空なら「なし」とする。保存済みの期間やplanned_dates_statusは変更しない。過去の仮置き日を今日へ自動更新しない。

候補の対象日は`buildDayPlan`の`targetDate`とする。`generatedDate`や実行日の今日では選別しない。`planning_state`省略は従来どおりplannedとして扱い、有限の期間を持つ週次taskにも通常と同じ候補規則を適用する。通常のtask一覧の分類・表示は変更しない。

daybook全体について「今日何から始める？」と依頼された場合は、対象daybookのgeneratorで当日のday-planを生成して候補集合を得る。通常のday-plan操作と同じく生成先は正規パスとし、元記録は変更しない。確定予定と暫定候補を区別し、既知の時間・労力制約とtaskの次の行動から小さな一歩を提案する。候補の提示だけで着手・完了・日程確定扱いにしない。短い回答を求められた場合は全一覧を転載せず、選んだ候補と理由を示す。特定taskの初動を相談するだけなら、必要なtaskから提案し、day-plan生成を必須にしない。

明示的にファイル変更が禁止されている場合はday-planも生成しない。既存のplanを使うなら生成日のスナップショットと説明し、最新の候補選別を別途Agentが実装しない。対象daybookのgeneratorが旧版なら、スキル本文を根拠に新欄があると断定せず、更新が必要であることを伝える。自動配備は行わない。

想定例：「経費申請をTODOに追加」→今日の暫定期間で登録→day-planに暫定候補として表示→「まず領収書を集める」を提案できる。

変更先：`assets/daybook/scripts/day-plan.mjs`と同テスト、`post-day-plan.test.mjs`、`references/operations.md`、`records.md`、`notification.md`、SKILL、利用者向けREADME二か所。新しい候補集合をbuildDayPlanの返却recordsにも追加する。通知はgeneratorのMarkdownを利用し、同じ候補とcommit固定リンクを表示する。schema変更や既存データ移行は不要。

## 改善B：依頼された作業の進展をtaskに反映する

### 問題と方針

activity-onlyの依頼からtaskを変更しない規則は維持する。一方、特定taskの作業支援・実行・再開を依頼された場合は、その作業の進展をtaskへ反映する範囲を明文化する。単にtaskを読んだ、URLが一致した、過去に関連したという理由では更新範囲を成立させない。

| 依頼・状況 | taskへの反映案 |
| --- | --- |
| 「このtaskを進めて」「このtaskの作業を再開して」 | 対象が確定した範囲で、観測された進捗・採用済み方針・残課題・次の行動を更新 |
| 同じ作業支援の継続会話 | 現在の指示が制限しない限り上記の範囲を引き継ぐ |
| 「活動だけ記録」「相談だけ」「一覧を見せて」 | task変更を含めない |
| 新しい話題、対象が曖昧、単なるURL受領 | 関連を推測してtaskを編集しない |
| Waypointの閲覧・保存・状態変更だけ | task変更を含めない |

task更新は実質的な変化が生じた応答の区切りで行う。同じ事実を各発言ごとに追記しない。根拠となるactivityへのリンクを残し、詳細な経緯はactivityに保つ。通常の進捗反映は毎回確認しないが、Agentが出しただけの提案を採用済み方針にしない。

「相談だけ」はtaskを更新しない意図が明示された場合を指す。「このtaskの作業を手伝って。その進め方を相談したい」のように作業支援を含む依頼を、相談という単語だけで除外しない。activityは利用中の共通記録規則に従い、「相談だけ」を全ファイル記録禁止へ読み替えない。

taskの`status`は、対象作業を実際に始めた根拠がある場合に`todo`から`in_progress`へ反映できる。提案・説明・Waypointの`in_use`化だけでは着手扱いにしない。`done`は既存の完了条件と実際の完了日規則に従い、`cancelled`は取消の指示がある場合に限る。本文のチェック状態も対応させる。

目的・完了条件・優先度・予定日・planning_stateの変更は、引き続きその変更を含む依頼が必要。完了は更新scopeと全完了条件を満たす根拠の両方を要求する。作業再開の指示だけではdoneにしない。中断・取消・記録制限は現在のユーザー指示を優先する。

activityとtaskの両方を更新する場合は、まず経緯をactivityに保存し、taskへ現在地を反映する。後者の保存が失敗したら「経緯は保存済み、task反映は未完了」と実際の状態を報告する。複数ファイル更新の原子性は保証しない。

変更先：SKILL、`references/operations.md`、`activity-capture.md`、`waypoints.md`。先行計画は過去の実施記録として保持し、本計画による変更部分をリンクで示す。新しい永続モードやtask自動同期サービスは作らない。

## 改善C：保存の確実さを保ちながら応答の待ち時間を減らす

### 第1段階：既存CLIと手順の整理

1. README・利用するCLIと同梱モジュールの一致確認・参照資料の読み込みは、同じ対象と版で確認済みなら毎操作で繰り返さない。確認済みの根拠は会話中の文脈で扱う。対象変更、関連ファイル変更を認識した時、文脈消失、実行エラーがあれば必要な範囲を再確認する。新しい永続キャッシュは作らない。具体的な再利用条件は後述のUX-03に従う。
2. Git状態は具体的な編集のまとまりの前に確認する。無関係な変更を保護し、既存activityの内容とハッシュは更新の都度読み直す。準備確認の省略を理由に古い本文・ハッシュを再利用しない。
3. 同じ応答内で同じepisodeに属するURL確認・task操作・調査結果は、一つのまとまったactivity更新にする。長い調査では最初の有用な記録を途中で保存し、応答終了まで未保存のまま待たない。
4. 独立した読み取りを可能な範囲でまとめる。共有記録への依存する書き込みは順序を保ち、同じactivityへ並列更新しない。
5. URLの今回の取得結果は再利用する。過去activity検索は必要な語で候補を抽出して本文を読む。検索範囲や未完了を記録し、調査待ちでも受領記録は保存する。完全一致の判断や現行treeの検索を黙って省略しない。
6. 内部手順の逐次報告を減らし、作業への回答と実際の保存先を簡潔に返す。保存失敗や未反映の進捗は必ず伝える。

変更先：SKILLの必須確認と編集後チェック、`references/operations.md`、`activity-capture.md`。更新後のリンク・front matter・diff検査は編集のまとまりに対して行う。

### 第2段階：計測で必要性を判断するCLI拡張

長いactivityの全文生成がなお支配的な場合に限り、`update-activity.mjs`に追記専用操作を追加する案を検討する。初回の実装範囲は第1段階までとし、拡張は計測結果をもとに実装判断を記録する。

追記案の契約：現在の本文とSHA-256を読んで追加内容を決め、元のハッシュと追記本文を入力する。CLIが直前の内容を照合して結合・保存する。追記本文は標準入力から渡し、完了したMarkdownのハッシュを返す。競合時は停止し、古い追記を自動再送しない。過去本文の訂正は既存の全文更新を使う。ロック、常駐処理、無条件append、新しい記録ID体系は導入しない。

この案で減るのは主にモデルが再出力する全文量であり、読み取りと保存の往復が必ず減るわけではない。単純な追記で内容の重複や読みづらさが増すなら採用しない。

## 実装順序と完了条件

| ID | 作業 | 完了条件 |
| --- | --- | --- |
| UX-00 | 現行版・対象ファイル・測定条件を固定 | 本計画と現行規則の差、作業ツリー、比較用の現行sourceを保存。対話環境の有無を記録 |
| UX-01 | 改善Aのgeneratorと表示を実装 | 暫定候補の境界と通知表示がテストで確認できる |
| UX-02 | 改善Bのscopeと更新時点を整合 | 対応する現行規則を置換し、正例・負例を本文と照合。実対話はUX-04で別途確認 |
| UX-03 | 改善C第1段階を適用 | 準備確認の反復を減らし、逐次保存と競合検出を維持 |
| UX-04 | 組合せの実対話・速度・記録品質を評価 | 下記シナリオを比較し、成功と未検証を区別して報告 |
| UX-05 | 文書・参照・配布内容を確認 | root/配布README、DEVELOPMENT、既存の参照・配布検査が整合。コード・文書の実装結果を記録 |
| UX-06 | 追記CLIの採否判断 | 長文更新の測定結果に基づき、別の実装計画へ進む・見送り・判断保留の理由を記録 |

UX-01〜03は各変更を独立して戻せる単位にする。UX-04を通る前に、実利用で快適になったと断定しない。実daybookへの移行・配備、版更新、commit/push/tag/Releaseはこの計画の実装に自動では含めない。

順序はUX-00→01→02→03→05とし、対話環境が使える場合にUX-04→06を行う。対話環境があれば変更前にも同じ条件で測定する。環境がなければ現行sourceを保存して実装へ進み、対話未実施を理由にコード・文書の更新を止めない。UX-04・06は未完了のまま残し、全計画完了とは報告しない。

## Luna向けの具体的な編集手順

パスは特記がなければ`skills/igapyon-miku-daybook/`からの相対パス。英語の実行指示は英語、日本語の計画書は日本語を維持する。下記は今回反映した実装契約である。実施内容と未完了評価を末尾に記録する。

### UX-00：開始状態と比較元を残す

1. 現在のユーザー指示、適用されるrepo指示、DEVELOPMENT、状態文書の冒頭、本書を読む。`git status --short --branch`と対象diffを確認し、既存の変更を保つ。本書作成時のHEADは`27ccebc`だが、実装開始時のHEADを正とし、古いHEADへ戻さない。
2. 下記対象ファイルを読む。関数名・見出しが現行sourceと合うかを照合し、ずれがある場合は実際の変更を確認してから対応する。実daybookやインストール済みskillを調査先にしない。
3. 速度比較を行う場合、変更前のskill一式を実装開始時のworktreeから、確認済みGit管理外の一意な`workplace/daybook-ux/<run>/before/`へ保存する。HEADだけを比較元にすると開始時の未commit変更を失うため、対象ファイルのSHA-256と実装開始時の差分も記録する。secretやnode_modulesは比較用コピーへ入れない。
4. 対話環境の有無、実装対象のモデル、測定可能な項目を記録する。対話実行コマンドは未指定なので架空のLuna起動コマンドやAPIを作らない。環境がなければ本文レビュー・ローカルテストまでを今回の実装確認とする。

### UX-01：generatorの変更契約

編集先は`assets/daybook/scripts/day-plan.mjs`、同ディレクトリの`day-plan.test.mjs`と`post-day-plan.test.mjs`。`post-day-plan.mjs`の本体には候補選択を追加しない。

1. `buildDayPlan()`で`plannedTasks`を作った後、`provisionalTodayTasks`を計算する。条件は`planned_dates_status === "provisional"`、両端あり、`start <= targetDate <= end`。既存のactive/Backlog除外を再利用し、`comparePriorityThenId`で整列する。
2. `needsDateReview()`は変更しない。同関数を変えると、`datedTasks`へ暫定taskが混入して確定予定に出るためである。`dateReviewTasks`を作る際だけ、新しい候補集合に含まれるtaskをIDで除外する。
3. `datedTasks`、`todayTasks`、`overdueTasks`、`nearEndTasks`、`upcomingStartTasks`、`plannedWeekTasks`、`backlogTasks`、scheduleの従来の条件を維持する。provisionalは新候補・日程要確認のどちらかにだけ入る。
4. Markdownの「今日の作業予定」の直後、「予定期間超過」の前に新欄を置く。見出しは正確に`## 今日の候補（予定は暫定）`、空欄は既存`section()`の`- なし`を使う。候補行の生成は専用の小さな内部関数にまとめ、既存`taskLink()`、`taskId()`、`taskPriority()`と期間表示を利用する。
5. 候補行の形式は下記とする。2行目は`暫定期間`を必須とし、任意要素は作業、期限月、予定週の順に` / `でつなぐ。値がなければラベルごと省略する。`planned_action`がない場合に新しい作業内容を補わない。
6. 返却する`records`へ`provisionalTodayTasks`を追加し、該当なしでも`[]`を返す。既存プロパティ名は維持する。`loadRecords()`、schema検証、CLI引数、出力先、YAML runtime、依存パッケージは今回の変更箇所にしない。

表示例（値はfixture）：

```markdown
## 今日の候補（予定は暫定）

- task-202609-00020：[経費を申請する](../tasks/task-202609-00020-expense.md)（優先度 7）
  - 暫定期間 2026-09-14〜2026-09-14 / 作業 領収書を集める / 期限月 2026-10 / 予定週 2026-09-14
```

既存テストは次の期待値を更新する。古い規則のテストを残したまま新しい成功例だけを足さない。

- `provisional periods appear only in date review while confirmed periods keep their normal sections`：名前と意味を新分類へ更新。既存fixtureでは`provisionalTodayTasks`が`00020`、provisionalの`dateReviewTasks`が`00021, 00022`になる。`00023`は従来どおりtoday、`00024/00025`は非表示。`00020`の期限月と予定週は新欄に保持する。既存の日付別集合からprovisionalが除かれる検査は残す。
- `backlog-to-planned classification changes the generated section without changing task dates`：targetを含む暫定期間のままplannedへ移した段階では、新候補がtrue、dateReviewがfalseになる。confirmedへ変えた後はtodayがtrue、新候補がfalse。fixtureの分類変更とgeneratorによる記録変更を混同しない。
- `backlog stays out of date-based sections and is listed once in priority and ID order`：Backlog不混入の検査対象に新集合も追加する。
- `CLI uses the canonical default output and honors an output-root override without changing sources`：targetを含む暫定taskをfixtureに追加し、正規出力とstaging出力の両方で新欄とリンクがあることを確認する。既存のsourceSnapshot不変検査は残す。
- 通知の`renderComment preserves planned and Backlog sections and converts both task links`：暫定候補を追加して、3種類の欄とcommit固定URLを確認する。`buildDayPlan()`→`renderComment()`を直接使い、実APIを呼ばない。

### UX-02：task更新の指示を整える

1. `references/operations.md`の`Task completion and scope`で「作業を進める依頼」も更新scopeを満たすことを明記する。その直後に`Task updates during requested work`節を設け、改善Bの表、更新可能な項目、更新時点、失敗時の報告を集約する。完了根拠の既存規則は維持する。
2. `Task and activity responsibilities`の「activityだけではtask同期を起動しない」は残し、依頼された作業支援中の更新は新節に従うと接続する。「activityがあるなら毎回taskを書き換える」という表現にしない。
3. SKILLの`Core workflow`でactivityの経緯とtaskの現在地を説明する既存段落を短く更新し、新節へリンクする。入口のdescription、初回発火条件は変更不要。
4. `activity-capture.md`の`Active use and recording scope`と`Capture checkpoints and episode boundaries`で、依頼済み作業のscopeを引き継いでtaskへ反映できる旨を新節へリンクする。「activity記録だけではtask編集を認めない」と両立させる。
5. `waypoints.md`の`Saving, updating, and selecting an entry`で、実作業へ再開した場合は確定した対象taskの作業支援範囲を引き継ぐと説明する。Waypointを読んだだけ・保存しただけのtask非更新規則は維持する。親・兄弟へscopeを拡大しない。

中核の英文案（細部は本書の改善Bに従う）：

```text
A request to work on or resume a specific task includes keeping that task's
observed progress, adopted approach, remaining work, and next actions current
within the requested work. Carry this scope through its follow-up conversation
unless the current user instruction limits it. Reading a task, recording an
activity, proposing an approach, or changing a Waypoint's state alone does not
establish this scope or prove progress. Keep the existing completion-evidence
rules and record restrictions.
```

### UX-03：準備確認の再利用条件を固定する

`references/operations.md`に`Reuse completed setup checks`節を設け、下表を規範として集約する。SKILLの`Required checks for a concrete operation`から短くリンクする。既存の「READMEとGit確認」や「CLIを照合する」を削除するだけの変更にはしない。

| 確認対象 | 同じ会話内での再利用条件 | 改めて行う場面 |
| --- | --- | --- |
| README・操作用参照 | 既読内容、対象の絶対rootと操作への適用が分かる | 別daybook、ルール変更の通知、文脈不明。新操作で未読の参照が必要ならその参照だけ読む |
| CLIと同梱モジュールの照合 | loaded skillの位置、実行するCLIの絶対path、照合対象モジュールの組合せが確認済み | 実行path/skill版の変更、関連ファイル変更を認識、load失敗、確認根拠が残っていない |
| Git状態 | 一つの応答内の連続する編集のまとまりで確認済み | 次の応答で編集を始める前、rootを切り替えた後、変更状態が不明になった時 |
| 書き換える既存記録 | 再利用対象にしない | activityは更新ごとにCLIで本文とSHA-256を読み、task/scheduleも編集前に現在内容を確認 |
| 保存後の検査 | 同じ編集のまとまりの最新結果として確認済み | その後に再編集した時。競合・保存失敗時は成功扱いにしない |

記憶が不確かなときに「前に見たはず」で省略しない。常時の版チェックや全モジュールの毎回hash計算も導入しない。外部変更を常時検知する保証は追加しない。ターンをまたぐ記録本文の使い回しは認めない。

`operations.md`の`Add an activity`、`Finish the operation`と、`activity-capture.md`の`Receive and read a URL`、`Save and report the record`を新節と整合させる。一つの短い応答に一回のactivity更新で足りる場合はまとめるが、長い調査の途中保存は残す。書き込みのたびに別のactivityへ内部操作を記録しない。

### UX-05：利用者向け説明と記録を揃える

| 対象 | 変更する位置と内容 |
| --- | --- |
| `SKILL.md`のday-plan段落 | 対象日を含む暫定候補と、それ以外の日程要確認の区別、全体の初動提案とgeneratorの関係 |
| `references/operations.md`の`Generate a day-plan` | provisionalを一律日程要確認とする既存文を置換。新欄の順序、整列、任意情報、選別基準を説明 |
| `references/records.md`のFront matter | 保存形式はそのまま、provisional表示の説明があれば新分類へ接続。`List display`の通常一覧規則は維持 |
| `references/notification.md`の`Current design` | 新欄もgeneratorの出力として通知へ引き継ぐ旨を追加。配備先には対応generatorが必要とする |
| Issue intake preview | 暫定期間の通知を、新候補または日程要確認のどちらにもなりうる説明へ合わせる。取り込み判断やCLI契約は変えない |
| root `README.md` / `src/assembly/README.md`のdaybook節 | 予定・Backlogの既存bulletに暫定候補の区別を短く追加。指定task支援中に現在地を更新する説明を同じ意味で揃える |
| root `DEVELOPMENT.md`のdaybook説明 | taskの現在地反映と暫定候補の変更を簡潔に示し、操作の詳細は既存referencesへリンク |
| 本書とroot `TODO.md`の該当項目 | 実施ID、コマンドと結果、対話の有無、未実施項目を更新 |

`task-date-migration.md`と`task-planning-migration.md`は現在の説明と矛盾する表示例がないか確認する。過去の日付やデータを再分類する移行は追加しない。過去の実施済み計画の本文は書き換えず、新しい規則の説明は現行referencesに置く。

今回の初回実装で`activity-files.mjs`、create/update CLI、vendor、package依存、agents設定、CI workflow、上流pinを変更する必要はない。Issue import CLIは、生成プレビューに含む暫定期間の表示説明だけを現行day-planへ合わせ、取り込み判断・CLI契約は変更しない。`scripts/skill-reference-routes.mjs`は現在の経路で到達することを検査し、テストを通すためだけに対象を削除しない。Lunaへの別エージェント起動はこの計画に含めない。

## 検証計画

### コードと配布の検証

- day-plan：暫定期間が対象日の前・開始日・期間内・終了日・後、部分欠落、Backlog、完了、期間なし週次を含む境界ケース。重複表示、優先度順、入力記録の不変を確認。
- 通知：新しい候補欄のtaskリンクがcommit固定URLへ変換されること。投稿は行わずfixture/dry-runで確認。
- `npm run test:daybook`で既存互換性と同梱runtimeを確認。参照変更には`npm run test:skill-index-policy`を使う。
- 追記CLIを実装する場合は、同時編集によるハッシュ不一致、既存本文の保持、UTF-8・改行、無効入力、対象外パス、成功した保存を重複再送しない操作手順を検証する。既存の競合許容範囲は広げない。
- 計画段階ではこれらを実行しない。実装後、変更範囲に応じて実施し、配布・CLI・実対話の結果を区別して残す。

generatorの追加・更新ケースは下表を使う。`targetDate = 2026-09-14`、`generatedDate = 2026-11-13`を明示して実行日への依存を排除する。各taskのパス・id・created月は一致させる。既存の`fixtureRoot()`、`writeRecord()`を再利用し、必要な差分だけ追加する。

| ID | 入力 | 期待値 |
| --- | --- | --- |
| P01 | provisional、09-14〜09-14 | 新候補に一件。today/dateReview/overdue/nearEnd/upcomingStart/plannedWeekに含めない |
| P02 | provisional、09-14〜09-16 / 09-12〜09-14 / 09-12〜09-16 | 開始日・終了日・期間内を含む3件とも新候補 |
| P03 | provisional、09-15〜09-16 / 09-12〜09-13 | 未来・過去とも日程要確認、新候補から除外 |
| P04 | confirmedとstatus省略の有効期間 | 既存today等の集合が従来どおりで、新候補から除外 |
| P05 | planning_state省略、priority省略の暫定期間 | planned/優先度7として新候補へ。元記録には初期値を書き足さない |
| P06 | backlog、done、cancelledのtargetを含む暫定期間 | Backlogはその欄だけ、done/cancelledは非表示 |
| P07 | 期間なし週次ルール / 有限の暫定期間を持つ週次ルール | 前者は候補・日程要確認から除外、後者は通常taskと同じ候補規則 |
| P08 | 同じ優先度で同じ短番号を持つ異なる作成月のtask、明示優先度1/9、省略7 | 優先度→フルtask-idで整列。月をまたぐリンクが正しい |
| P09 | 片端欠落・status省略 / 片端欠落・provisionalあり | 前者は日程要確認、後者は既存の完全期間必須エラー |
| P10 | planned_action、due_month、planned_weekの全部あり / 全部なし | 指定順の任意情報を保持。省略時は不自然なラベルや架空のactionを出さない |
| P11 | 候補ゼロ | 既定の位置に新見出しと`- なし`、返却集合は`[]` |
| P12 | 通常生成と`--output-root`、通知render | 両出力の候補内容・相対リンク、通知のcommit固定URL、元記録のバイト列不変 |

新集合の期待ID配列とMarkdownの該当欄を検査する。IDは行の表示とリンクpathの両方に出るため、全文中のID出現回数を「一件だけ」の根拠にしない。既存の不正日付・不正優先度・Backlog・YAML互換性の検証を削除して新仕様に合わせない。定型英文や見出しが存在するだけの新テストは作らない。

Lunaが実装後に使うコマンドはrepo rootから次の順序とする。最初の集中テストが通ったら文書を整合し、最後に二つのsuiteと差分検査を一度実施する。その後に関連編集や失敗があった場合だけ必要な検査を再実行する。

```sh
node --test skills/igapyon-miku-daybook/assets/daybook/scripts/day-plan.test.mjs skills/igapyon-miku-daybook/assets/daybook/scripts/post-day-plan.test.mjs
npm run test:daybook
npm run test:skill-index-policy
git diff --check
```

`test:skill-index-policy`は参照経路と配布ファイルの検査を含むが、実対話や実ZIPの検証とは報告しない。今回はYAML生成元・版数・上流pinを変えないので、runtimeの再生成、依存更新、Maven packageは通常の実装確認に追加しない。テストの実件数は実行結果から記録し、過去の件数を転記しない。

### 実対話の受入ケース

隔離したdaybook fixtureを使用し、実データ・実GitHub投稿には触れない。先行するCAP-05の未完了ケースと共通する条件は併用できるが、本計画の確認でCAP-05全体を完了扱いにしない。

fixtureは一意な一時rootの下に`daybook/`、`project/`、`skills/igapyon-miku-daybook/`を置き、対象sourceを最後のディレクトリにコピーする。daybookとprojectはローカルGit repoとし、README、対象task、無関係なtask、既存activity、対象と兄弟のWaypointを用意する。taskの完了条件は「下書き作成」と「本人による確認」の2点とし、一方だけ完了するケースを作る。別repoの作業は一時project内の小さな文書編集に限定する。

初回発火を検証するケースでは、スキルを検証用カタログの名前・descriptionから選べる環境を使う。SKILL全文や正解手順を開始プロンプトに埋め込んだ試験は、初回発火の実証には数えない。複数turnを指定したケース以外は新規セッション・初期fixtureから開始する。対話の日付は実行環境のAsia/Tokyo日付に合わせてfixtureを作り、固定日を検証できない環境で「今日は別の日だと仮定」を日付フォールバック検証の代わりにしない。

| 会話・条件 | 期待する結果 |
| --- | --- |
| スキル名の言及、レビュー依頼だけ | daybook記録操作を開始しない |
| 日付なしのtask登録→今日の作業案内 | 確認待ちにせず登録し、暫定であることを示して候補を案内 |
| Backlog登録→作業案内 | 自動で今日へ予定化しない |
| 指定taskの作業支援→採用方針変更→再開 | activityに経緯、taskに最新状態を残し、古い方針で再開しない |
| Agentの提案だけで未採用 | taskの採用済み方針として確定しない |
| activity-only / 読み取り専用 / 対象ファイル限定 | 指定外のtask更新・activity保存を行わない |
| 進捗あり、完了条件の一部だけ達成 | 進捗と残条件を記録し、doneにしない |
| 同じepisodeで複数操作 | 重複を避けて経緯を保存。結論や満足の表明を待たない |
| URL閲覧失敗・遅延・同一URLの別の機会 | 受領と実際の確認範囲を保存し、過去閲覧を今回の取得と偽らない |
| 別repoへの移動・Waypoint再開 | 保存先と作業範囲を維持し、作業repoにdaybook参照を追加しない |
| 他の編集者がactivityを更新 | 競合停止後に再読し、他の記録を保持 |
| activity保存成功、task更新失敗 | 保存済み範囲と未反映状態を明確に報告 |

Lunaが本文レビュー・実対話で使う代表的な入力を以下に固定する。返答の印象だけで合格にせず、読み取ったファイル、実際のdiff、保存の成功・失敗を確認する。

| ID | 入力例 | 確認点 |
| --- | --- | --- |
| D01 | 未発火の新規会話で「igapyon-miku-daybookの使い勝手をレビューして」 | 記録操作を始めず、fixtureの全記録が不変 |
| D02 | 「このdaybookに経費申請をTODO追加。日程は未定です」→「今日何から始める？」 | 当日の暫定期間・優先度7で登録。次の応答は暫定候補を区別し、確認待ちに戻さない |
| D03 | 「このdaybookに経費申請を日付なしのBacklogで追加」→同じ初動質問 | 元taskの日付と分類を勝手に変えず、確定した今日の予定とも呼ばない |
| D04 | 「task-…の下書き作成を進めて」→案の選択に「その方法で進めて」→下書きだけ作成 | activityに経緯、taskに採用方針・進捗・残る本人確認を反映。doneにしない |
| D05 | 同じtaskに「A案も考えられます」と提案が出た段階 | 未採用の案を現在の採用方針で上書きしない |
| D06 | 作業支援の後「ここからは相談だけ。taskは更新しないで」→「活動にも記録しないで」 | 前者はtask停止・共通activityあり、後者の区間は両方なし。後から勝手に補完しない |
| D07 | 「このWaypointから指定の子の作業を再開して」 | 指定taskだけへscopeを引き継ぎ、親・兄弟・無関係taskの状態を変えない |
| D08 | 「このtaskだけを一覧表示」/「このtaskファイルだけ変更して」 | 前者はtask不変で共通activityあり、後者は指定ファイル以外への書き込みなし |

残りの表のケース（URL遅延、競合、task保存失敗など）は同じfixtureで状態を制御して評価する。失敗を注入できる既存の対話環境がなければ、該当ケースを本文レビュー・CLIテストと実対話未検証に分ける。検証のためだけに製品CLIへ失敗注入オプションを追加しない。

### 快適さと記録品質の測定

短い記録、短い追記、長いactivityへの追記、taskの作業支援、一覧、URL閲覧の6シナリオを現行版と変更版で比較する。同じモデル・設定・fixture・会話入力を用い、各3回以上実行して中央値と範囲を示す。短文/長文fixtureの実バイト数を記録する。URLは制御した取得結果で比較し、実ネットワークの待ち時間は別に扱う。

短い追記は約2 KiB、長い追記は約32 KiBの既存activityを使い、同じ追加事実を与える。実際のUTF-8バイト数を記録する。複数応答のシナリオは一回の試行内で同じepisodeを継続し、試行間ではセッションとfixtureを初期化する。変更前後の順番を入れ替えて偏りを減らす。実装モデルと評価対象モデルを記録し、Lunaでの動作を主張する場合はLunaの実対話結果を使う。

測る値：最初の有用な応答までの時間、最初の保存までの時間、応答完了までの時間、ツール往復数、読み取り量、記録更新の出力量、繰り返した準備確認数。挨拶や「確認します」だけを有用な応答に数えない。

時間は実行環境のセッションtrace等にある実タイムスタンプから得る。取得できない値は`未計測`とし、CLI単体の処理時間を会話全体の時間として代用しない。読み取り量と出力量は計測できるUTF-8バイト数として記録し、モデル内部のtoken数と呼ばない。本文や結果を用意して照合しただけの確認をモデル対話の実行回数へ足さない。

測定結果の列は`source版/hash / 評価モデルと設定 / scenario / repeat / 初回有用応答ms / 初回保存ms / 完了ms / tool往復 / 読取bytes / 更新入力bytes / 反復準備確認数 / 品質欠落 / scope違反 / trace参照`とする。取得不能な列は理由とともに未計測にする。原traceはGit管理外に置き、本文には合成fixture由来の再現条件と集計だけを残す。

品質は、目的・進展・判断理由・未確定事項・次の行動のうち入力に存在する必要事項の欠落、重複、推測の確定化、scope外の編集で評価する。保存した文章量の多さを品質指標にしない。

合格条件：必須の記録事項とscope境界を満たし、再開時に現在地を復元できること。短い継続操作でCLI一致確認や同じ参照資料の再読が不必要に反復されないこと。速度の数値目標は基準測定後に設定し、改善がばらつきの範囲なら効果未確認とする。記録を省いた結果だけ速くなった変更は採用しない。

UX-06は測定後、長文更新入力が全文量に比例して増え、それが待ち時間の主因と判断できる場合だけ別の追記CLI実装計画を起こす。主因が取得待ち・再確認・別の処理なら見送り、必要な測定列が取れなければ判断保留にする。計測の有無にかかわらず「高速化済み」を前提として追記機能を実装しない。

## 実装・検証記録

UX-00開始時のworktreeはbranch `devel-tiga1113mch`、HEAD `27ccebc`。開始前に存在した差分は本計画と`TODO.md`、利用者が直前に依頼した版数更新の`pom.xml`（`1.20261113.5`）と`skills/igapyon-mikuku-agent/references/VERSION.md`（`20261113e`）。実装開始前に現状を確認し、これらを保持した。速度比較用sourceの保存は行っていない。対話比較も実施しないため、測定用baselineを作成する条件には当たらなかった。

| 項目 | 結果 |
| --- | --- |
| UX-00 | 開始時HEAD、branch、既存差分を確認。版数更新は本実装開始前の利用者依頼に基づく既存変更として保持 |
| UX-01 | day-planに対象日を含む暫定候補集合・欄・任意情報表示を追加。候補を日程要確認から除外し、日付別confirmed欄へ混ぜない。通知のcommit固定リンクとIssue取り込みpreview文を整合 |
| UX-02 | 作業・再開依頼のtask更新scope、activityとtaskの分担、提案と採用方針、status遷移、activity先行保存と部分失敗の説明を整合 |
| UX-03 | 同一会話で再利用するREADME/参照・CLI照合・Git状態・保存後検査の条件を定義。activity本文とSHA-256は更新ごとに再読する規則を維持 |
| UX-04 | 未実施。一般のCodex CLIは存在するが、計画に必要な隔離skill catalog、fixture、複数回のmodel実行とtrace測定を備えた専用harnessは確認できなかった。この会話を実対話の代用にしていない |
| UX-05 | SKILLと関連references、root/assembly README、DEVELOPMENT、Issue取り込みpreviewを更新。task-date/planning migration guideに矛盾がないことを検索で確認 |
| UX-06 | UX-04の速度データがないため保留。追記CLIは実装していない |

候補の境界、開始日・終了日・期間内、未来・過去、priority/full task-id順、別作成月への相対link、planning_state/priority省略、Backlog・完了・取消、週次、任意情報、空欄、canonical/staging出力、入力不変、通知URLをテストした。集中テストは28/28、`npm run test:daybook`は81/81、`npm run test:skill-index-policy`は77/77で成功。`skill-creator/scripts/quick_validate.py`も`Skill is valid!`を返した。全ての実装・計画記録後に`git diff --check`を再実行して成功した。

実daybookのデータ・配備先・ZIPは変更していない。実対話の成功や速度向上を測定済みとは主張しない。変更差分は未commitであり、commit/push/tag/releaseは行っていない。
