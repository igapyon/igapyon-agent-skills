---
title: daybook の発火条件・操作整合・既定優先度7の実装計画
description: "発火の境界を保ち、予定日を仮置きして登録を進める。週次タスクとBacklog分類を修正し、未指定の優先度を7へ揃える。"
category: plan
status: in_progress
created: 2026-11-05
updated: 2026-11-05
---

# daybook の発火条件・操作整合・既定優先度7の実装計画

## 1. 目的と今回の範囲

利用者の方針は「スキル発火は厳しく。ただし、発火後は依頼された操作を円滑に進める」「開始日・終了日は推測して埋め、分からなければ今日開始・今日終了」「優先度はとりあえず7」。日程や優先度の未指定を質問で埋めることより、修正可能な仮置きで登録を終えることを優先する。直前のレビューで見つかった3件と合わせて、Lunaが実装できる単位で変更を定める。

1. 利用指示と単なる言及を区別し、daybookの発火条件を明確にする。
2. 期間のある週次タスクを、記録仕様どおりday-planで扱えるようにする。
3. 期間を持たない正常な週次タスクを、一覧で不要な日程確認の対象にしない。
4. 通常のBacklog分類変更を、スキル・スクリプトの導入更新作業から分ける。
5. 未指定の優先度を、記録・表示・Issue取り込みで7へ揃える。
6. 通常のtask登録では開始・終了日を文脈から仮置きし、材料がなければ両方を今日として、確認待ちにせず登録する。

本書作成時点では計画のみ。実装対象はこのリポジトリ内のsource skillと同梱スクリプト・テスト。実daybookの記録変更、配備先への同期、版数更新、commit/pushは含めない。前の[HANDOFF起動計画](daybook-handoff-startup-luna-implementation.md)の起動・待機・再開仕様は維持する。

開始時点で `references/operations.md` には、着手支援を求められたときの小さな一歩と、記録後の短い結果報告に関する未commit差分がある。この差分を保持する。root `TODO.md` とmiku-scmにも別作業の差分があるため、実装開始時にGit状態を再確認し、対象外を変更しない。

## 2. 確認済みの問題

| 対象 | 現在の状態 | 直す理由 |
| --- | --- | --- |
| 発火 | SKILL本文はメタ依頼を除外しているが、descriptionとactivationの「name this skill」は利用指示と単なる言及の区別が弱い | 単語一致や過去の作業履歴で記録操作を始めないよう、入口の表現を揃える |
| 有限期間の週次task | `records.md` は有限期間と `planned_dates_status` を認めるが、`day-plan.mjs` は `recurrence: weekly` なら一律に同fieldを拒否 | 文書どおりのtask一件でday-plan生成全体が止まる |
| 期間なし週次taskの一覧 | `operations.md` と `records.md` の一覧説明は不完全な期間を一律に `日程要確認` とする | generatorの `needsDateReview()` が持つ正当な例外と説明が不一致 |
| Backlog分類 | 通常の分類依頼も `task-planning-migration.md` へ進み、skill・generatorの更新とpreview生成が手順に含まれる | 対応済み環境で、一件の分類変更が導入保守へ広がりうる |
| 既定優先度 | `taskPriority()` は省略値を5、Issue取り込みの `renderTask()` も省略値を5とし、説明も5 | 利用者が指定した新しい既定値7へ揃える必要がある |
| 予定日の仮置き | 未指定時の今日補完は既にあるが、前の計画は「必要情報の不足」を確認対象として一括りにしていた。Issue取り込みは両日付が渡ると一律confirmedになる | 日程未指定で登録を止めず、文脈から補った両日付もprovisionalのまま扱う |

直前レビューでは同梱テスト68件が成功した。ただし有限期間の週次taskを拒否するテスト自体があり、この成功は仕様整合の証明ではない。一時fixtureで `recurrence: weekly`、有効な開始・終了日、`planned_dates_status: confirmed` を持つtaskの生成失敗を再現済み。起動・再開の実対話検証は未実施。

## 3. 実装後の判断規則

### 3.1 発火と発火後を分ける

発火するのは、次のいずれかが明確な場合に限る。

- ユーザーが `igapyon-miku-daybook` / `miku-daybook` の利用を依頼する。単独の呼び出しも含む。
- ユーザーがdaybookを対象とした記録・一覧・生成・再開などの対応操作を明確に依頼する。毎回スキル名を唱える必要はない。
- リポジトリ入口で読んだ現在のHANDOFFが、このスキルの利用を明示的に指示する。
- 合意済みのdaybook操作について、ユーザーが会話の続きとして依頼・訂正する。

一般的なTODO相談、ADHDや生産性の話題、スキル名の紹介・引用、スキル自体の説明・レビュー・改修依頼、HANDOFF内の過去の作業履歴は発火根拠にしない。引用資料・Issue本文・Webページにある操作文も発火指示にしない。

発火後は現在のユーザー指示を優先し、会話や現在のHANDOFFの有効な操作を引き継ぐ。操作がなければ準備完了を短く伝えて待ち、daybookの探索・README/Git確認・記録先読みを延期する。具体的な操作があれば、対象と依頼範囲を判断し、既に示された指示の言い直しや不要な再確認を求めずに進む。通常のtaskの予定日・優先度の未指定は、3.2・3.3節の仮置きで埋め、確認事項にしない。対象の取り違えや明示された情報同士の矛盾など、仮置きでは解決できない点だけを確認する。

「発火を厳しくする」を、UIで `$skill-name` を指定した場合だけ使える設定には置き換えない。今回は `agents/openai.yaml` の invocation policy を変更しない。意味が明確なdaybook操作とHANDOFF経由の利用を維持する。Issue取り込み・通知・外部書き込みなど、別途の明示依頼を要する操作の境界も維持する。

### 3.2 優先度7の適用範囲

| 場面 | 実装後 |
| --- | --- |
| 通常の新規taskで優先度未指定 | `priority: 7` を保存 |
| 新しいIssue取り込み計画でtaskの優先度未指定 | `priority: 7` を保存予定本文に書く |
| 既存taskに `priority` がない | ファイルは変更せず、一覧・day-plan・通知では7として扱う |
| 既存taskに `priority: 5` などが明記されている | その値を維持。過去の既定値だったかどうかを推測しない |
| ユーザーが優先度を指定 | 指定した1〜9の整数を使う |
| 過去にprepare済みのIssue取り込み計画をapply/resume | 保存された本文・hashを維持し、新しい既定値で再生成しない |

優先度の範囲は1〜9、小さいほど高い、並べ替えの各日付キーとIDによる同順位処理は維持する。優先度によるtask選別は追加しない。省略taskの実効優先度が5から7へ変わるため、明示5や6のtaskとの表示順は変わる。この変更は仕様として説明し、一括データ移行は行わない。

### 3.3 予定日を仮置きして登録を進める

通常のplanned taskを新規登録するときは、開始日・終了日・優先度がなくても登録を止めない。予定日はユーザーの指示、会話、対象taskの作業内容から合理的に推測し、足りない値を仮置きする。推測材料がなければ、Asia/Tokyoの今日を開始日・終了日の両方に使う。優先度は未指定なら7とし、重要そうだという推測だけで別の値にしない。

| 日程の情報 | 設定する値 |
| --- | --- |
| 両端が明示されている、または期間全体がユーザー確認済み | 指定を維持し、確定期間として扱う |
| 片側または両側を文脈から推測できる | 明示・保存済みの値を保ち、欠けた側だけを推測で埋める。期間全体はprovisional |
| 両端とも不明で、推測材料もない | 開始＝今日、終了＝今日、provisional |
| 開始だけ分かり、終了の推測材料がない | 終了＝開始、provisional |
| 終了だけ分かり、開始の推測材料がない | 開始＝今日と終了日の早い方、provisional |

一つでも仮置きした日付があれば `planned_dates_status: provisional` とする。どの日付をどの理由で補ったかを本文・履歴に短く残す。たとえば「来週中に進めたい」を来週の月〜金で仮置きすることはできるが、その曜日範囲をユーザー指定の事実にはしない。開始日≦終了日を守り、明示された日付を都合よく置き換えない。

登録後は「開始・終了は今日で仮置き、優先度7で登録しました」のように結果を短く伝える。「この日程でよいですか」と確認待ちに戻さない。`日程要確認` は暫定日程を区別する表示であり、登録完了の前提条件ではない。暫定taskをday-planの確定した「今日の作業予定」に混ぜない既存仕様は維持する。

この補完は、予定日の設定・変更が依頼に含まれる場合と、Backlogからplannedへ戻す際の不足期間にも使う。本文だけの更新や読み取りでは既存taskの空欄を埋めず、明記された日付や優先度を初期値へ戻さない。「日付を入れずにBacklogへ」などの明示指定と、終了日のない週次ルールは維持する。推測対象は作業予定日であり、開催日、実際の完了日、過去の活動日、外部の確定締切を作り上げない。

Issue取り込みでも、予定日・優先度が未指定という理由だけで `needs-info` にしない。Agentが文脈から補った期間はprovisionalとしてCLIへ渡し、材料がなければ既存の取り込み日による補完を使う。保存済み計画を再開するときは、開始・終了日も保存値を使い、再開日の「今日」へ置き換えない。

### 3.4 週次taskの期間

| 週次taskの記録 | 検証と表示 |
| --- | --- |
| 両予定日なし、`planned_dates_status` なし | 正常な期間なしルール。日程要確認にしない。個別の開催日はscheduleで扱う |
| 両予定日あり、`confirmed` | 有限期間のルール。通常の確定期間の選択規則でday-planへ出す |
| 両予定日あり、`provisional` | 有限期間の暫定ルール。plannedなら日程要確認だけに出す |
| 両予定日あり、status省略 | 既存記録の互換性を維持。自動でstatusを補わない |
| 片側だけの期間、statusなし | 不完全な期間としてplannedの日程要確認に出す |
| 期間が不完全なのに `planned_dates_status` あり | generatorは現在どおり検証エラー。読み取り時には修復しない。記録作成時には必要な補完を済ませて保存する |

Backlogは既存仕様どおり独立した欄に表示し、日程要確認には重複させない。日次の出現日を週次ルールから自動生成する変更ではない。週次登録・繰越は引き続き明示的な依頼に限る。

## 4. 変更対象

パスは、特記がなければ `skills/igapyon-miku-daybook/` からの相対パス。

| ファイル | 作業 |
| --- | --- |
| `SKILL.md` | descriptionとActivationの利用指示・言及の区別を揃える。通常の分類と移行の参照先、予定日の仮置きの案内を整合 |
| `references/records.md` | 優先度7、予定日を推測・今日補完する規則、週次一覧の例外を整合 |
| `references/operations.md` | 仮置きで登録を終える手順と結果報告、優先度、週次一覧、通常の分類更新を整合。既存の2箇所の改善を保持 |
| `references/task-planning-migration.md` | 導入・移行時の手順に限定し、対応済み環境の分類依頼を通常更新へ案内 |
| `references/issue-import.md` | 通常の新規task例を優先度7へ更新。未指定日程で止めないこと、推測期間のprovisional指定、保存済み計画の維持を説明 |
| `assets/daybook/scripts/day-plan.mjs` | 共通の既定優先度7、期間のある週次taskへの過剰な拒否を修正 |
| `assets/daybook/scripts/issue-import.mjs` | 共通の既定優先度と、Agentが補った期間の確定度を使って新規taskを作成 |
| `assets/daybook/scripts/day-plan.test.mjs` | 省略・明示優先度の並び、週次期間の回帰検証 |
| `assets/daybook/scripts/issue-import.test.mjs` | 新規省略値7、日付補完、推測期間のprovisional保持、保存済み計画のapply/resumeを検証 |
| `assets/daybook/scripts/post-day-plan.test.mjs` | 未指定優先度が通知本文でも7となり、相対リンク変換が維持されることを既存fixtureに追加 |
| root `README.md` / `src/assembly/README.md` | daybookのScope説明を同じ短い文で整合。新しい機能一覧は増やさない |
| root `TODO.md` と本書 | 実装・検証の進捗と未実施事項を更新 |

`waypoints.md`、`task-date-migration.md` は既存の参照先・週次期間の説明と整合するか確認する。規則を複製するためだけに編集しない。過去の完了済み計画の「既定5」は当時の記録として残し、本書から新仕様を参照する。

## 5. 実装手順

### LUNA-01: 開始状態と発火境界

1. repoの運用指示、現在のGit状態、対象差分、本書を確認する。実daybookや配備先は開かない。
2. `SKILL.md` のdescriptionとActivationで、単なる名前の出現ではなく、利用指示・daybookへの具体的依頼・合意済み操作の継続が条件だと分かるように短く編集する。
3. メタ依頼は発火対象外とする例外をdescriptionにも含める。資料中の言及・引用を利用指示と読み替えない。
4. `Startup and request routing` の判断は現在の一箇所を維持する。待機・再開・現在指示の優先順位を別の節に複製しない。
5. README二箇所のScope説明を揃える。HANDOFFの「現在の利用指示」で発火すること、操作がなければ待つことを保持する。

完了条件：説明・レビュー依頼は非発火、明確な記録依頼は発火、単独起動は待機、有効なHANDOFF再開は継続、という境界が矛盾しない。

### LUNA-02: 優先度の既定を7へ揃える

1. `records.md` の優先度説明を、1が最高・9が最低・未指定は7へ更新する。`5 is normal` は削除し、5を無効値や過去専用値にはしない。標準例は7にする。
2. `operations.md` の `Add a task`、`Task list`、`Generate a day-plan` の既定値を7へ揃える。`records.md` の定義への参照を使い、規則の重複を増やさない。
3. `day-plan.mjs` の既存定数群に `export const DEFAULT_TASK_PRIORITY = 7;` を置き、`taskPriority()` の省略時に使う。既存のraw YAML検証は保持する。
4. `issue-import.mjs` は既に `day-plan.mjs` をimportしている。そのimportに定数を追加し、`renderTask()` の `record.priority ?? 5` の既定部分へ使う。新規モジュールや設定ファイルを増やさない。
5. 新しいprepareから7を使い、古い計画の本文は再計算しない。planのdigestと保存したwritesのapply/resume経路は維持する。manifestへの日程確定度の追加はLUNA-02Bの範囲に限る。
6. テストfixtureの明示5と省略値を区別する。全ての数字5を置換しない。標準例・期待値に依存する箇所だけを変える。

完了条件：新規作成・省略値の読み取りのどちらも7、明示5は5、invalid値はエラー、保存済み計画は同じ本文で再開できる。

### LUNA-02B: 日程・優先度の未指定で登録を止めない

1. `operations.md` の `Add a task` に3.3節の判断順を反映する。文脈による仮置き、推測できない場合の既存の今日・片側補完、登録後の短い報告を一続きの手順にする。事前の日付質問・優先度質問・仮置きの承認待ちは追加しない。
2. `records.md` とSKILLのtask案内を整合し、仮置きした日付をprovisionalとして扱う。`Update a task` とBacklogからplannedへの移行にも同じ規則を参照させる。新しい日付項目・設定スイッチは作らない。
3. Issueの解釈手順では「作業予定日がない」と「記録対象・事実が不明」を区別する。前者だけなら取り込みを進める。根拠となる事実の欠落や外部操作の承認経路は、今回の仮置き規則で省略しない。
4. Issue取り込みmanifestのtask-createに、レコード側と同じ `planned_dates_status` を任意指定として追加する。指定時は `confirmed` / `provisional` のscalar文字列と両予定日を必要とする。schedule/activity/link-existingへの指定、不正な型・値、不完全期間への指定は `INVALID_MANIFEST`。対象型の検証はlink-existingの早期returnより前に置く。schema v1の任意項目追加とし、既存入力はそのまま読めるようにする。
5. `date_evidence` の各日付の説明は引き続き必要とする。推測した日付は、実際の引用を装わず「仮置き：来週中という希望から月曜開始とした」のように根拠と仮定を明記し、期間をprovisionalにする。新しい推測専用オブジェクトは増やさない。
6. `deriveTaskDates()` で、両日付があるときは指定された確定度を保持する。省略時は従来どおりconfirmed、provisionalなら各日付と `date_evidence` の説明を `period.reasons` へ渡す。planned/backlogの完全期間のどちらでも確定度を失わない。未指定・片側の機械的補完とBacklogの日付なしは従来どおりとする。
7. 既存の `period.status` / `period.reasons` を使ってtask履歴・preview・取り込み結果コメントへ仮置きと理由が届くことを確認する。`renderTask()` と `issueReceiptBody()` の説明も、実際の期間と表示先に合わせる。来週を仮置きしたのに取り込み日を使ったと説明したり、Backlogの参考期間まで日程要確認欄に出ると説明したりしない。CLIは日程を推測するAI機能を持たず、Agentが選んだ値の検証・保持と既定補完に徹する。保存済みplanを再解釈しない。

完了条件：日程・優先度の情報がなくても通常taskを今日〜今日・provisional・優先度7で登録でき、文脈から補った期間も確定済みと誤表示されない。

### LUNA-03: 週次taskの仕様と実装を整合

1. `day-plan.mjs` の `recordFromFile()` にある、weeklyなら `planned_dates_status` を無条件に拒否する分岐を取り除く。列挙値・scalar型・両予定日必須・日付順の検証は維持する。これで期間なしへの同fieldの指定は引き続き拒否される。
2. `needsDateReview()` の「weeklyかつ両予定日がない場合は除外」は維持する。片側だけの日付を、期間なしルールと誤認しない。
3. `day-plan.test.mjs` の「完全な期間を持つweeklyでも拒否」を正解とする既存テストを、3.4節のケースへ置き換える。不正なstatus型・列挙値・不完全期間の検証は残す。
4. `operations.md` と `records.md` の一覧説明に、両予定日なしの週次ルールは要確認でないことを揃える。通常のplannedの確定・旧日付行の後に期間なし週次行を優先度・完全ID順で並べ、日付は `—`、次回は `Next` に示す。既存の `日程要確認` とBacklogの分離は維持し、新しい表示モードは作らない。
5. 有限期間の暫定weeklyは通常のprovisional規則で扱い、予定週などの別欄へ漏れないことを確認する。scheduleの生成・繰越は呼ばない。

完了条件：正常な有限期間のweekly一件で生成が止まらず、期間なしのweeklyには不要な日程確認を要求しない。

### LUNA-04: 通常の分類と導入作業を分ける

1. `SKILL.md` と `operations.md` の通常の「Backlogへ移す／plannedへ戻す」は `Update a task` に案内する。対象taskの既存情報を使い、必要なfield・履歴だけを更新する。
2. `task-planning-migration.md` の入口を、planning_stateの初導入・generator更新・明示された移行に限定する。対応済みの環境で個別分類をする場合は通常更新への短い参照だけにする。
3. 通常分類の必須工程から、配備済みskillの更新、scriptコピー、依存導入、preview生成を外す。ユーザーがday-plan再生成も依頼した場合は、その依頼分を別途実行する。
4. 既知のREADMEや対象ファイルから未対応環境だと分かった場合は、必要な互換性の問題だけを説明する。発火済みであることを理由に導入更新まで自動で広げない。対応済みであることを既に把握している場合は、再導入・再確認しない。
5. 既存の小さな一歩・短い結果報告は保持する。着手支援の依頼がなければ、毎回タスク分解を付け足さない。

完了条件：対応済み環境で一件をBacklogへ変更する依頼は、そのtaskの変更と短い報告で終わる。

## 6. 検証

### 6.1 コードの回帰テスト

既存の一時fixtureとmockを使い、実daybookやGitHubへアクセスしない。以下の振る舞いを検証し、文言の完全一致だけを目的とするテストは追加しない。

| ID | 検証内容 |
| --- | --- |
| P01 | priority省略のtaskはday-plan本文で7。明示5・6・7・9と混在させ、省略値の並びが7相当で、同順位はID順になる |
| P02 | planned・日程要確認・Backlogの各欄で省略値7を使用。生成前後のsource bytesは同一 |
| P03 | Issue取り込みの新規planned/backlog双方で、省略時に整数7が保存される。明示1・5・9は維持する |
| P04 | 古いprepare済み計画のpriority5を、新runtimeのapply/resumeがそのまま書き、保存した本文・after_hashを変更しない。既存のschema v1互換テストも維持 |
| P05 | `renderComment()` に省略priorityを含む生成結果を渡し、7の表示とcommit固定リンクを確認。投稿処理は実行しない |
| D01 | Issue取り込みのplanned taskで両日付・priority省略なら、取り込み日〜同日・provisional・7を保存。開始のみ・終了のみの既存補完と理由も維持 |
| D02 | 取り込み日以外の両日付とprovisionalを渡すと、保存本文・preview・結果コメントに実際の暫定期間と理由が残る。plannedは日程要確認、Backlogは参考期間と説明。status省略の既存完全期間はconfirmedのまま |
| D03 | manifestの不正status型・値・不完全期間・対象外recordへの指定を拒否。推測を含む完全期間でも各日付のdate_evidenceがなければ拒否 |
| D04 | 保存済み計画のapply/resumeを別の日に行っても、日付・優先度・本文・hashは保存値のまま。明示Backlogと期間なしweeklyの例外も維持 |
| W01 | 有限期間weeklyのconfirmedは生成成功し、期間に応じた通常欄へ入る |
| W02 | 有限期間weeklyのprovisionalは日程要確認だけに入り、今日・開始・終了・超過・予定週には入らない |
| W03 | 両予定日なしweeklyは正常に読め、日程要確認に入らない。対応scheduleの表示は維持 |
| W04 | 片側のみのweeklyはstatusなしなら要確認。片側または両側なしでstatusありならエラー。不正status型・列挙値・日付逆転も拒否 |
| W05 | Backlog weeklyは従来どおりBacklogだけ。有限期間・期間なしのどちらもsourceとscheduleを変更しない |

P04は実装前のコードで一時fixtureとして保存した計画、または既存の保存形式を忠実に再現したテスト用fixtureで確認する。実運用の保存計画を編集しない。既存の明示5のfixtureを7に変えることでテストを通すのではなく、省略と指定の両方を検証する。

### 6.2 発火・会話・読み取り範囲

前の[HANDOFF起動計画の対話検証](daybook-handoff-startup-luna-implementation.md#5-検証)の隔離fixture配置とC01〜C11を再利用する。次の追加ケースを確認する。

| ID | 入力・状況 | 期待結果 |
| --- | --- | --- |
| A01 | 「daybookというスキルをレビューして」「daybookで何ができる？」 | メタ作業としてソースだけを見る。実データの記録操作は非発火 |
| A02 | 未発火の状態で一般的なTODO整理・生産性の相談。daybookを対象にする依頼はない | daybookは非発火。データrepoの探索なし |
| A03 | HANDOFFの過去履歴に「以前daybookを更新した」とあるだけ | 名前だけで発火しない |
| A04 | 「daybookにこの作業をtask登録して」、日程・優先度の指定も推測材料もなし | 発火し、今日〜今日・provisional・priority7で登録を完了。日程質問・優先度質問・仮置きの承認待ちなし。結果を短く報告 |
| A05 | 合意済みのdaybook操作の続きで「このtaskをBacklogへ」。環境は対応済み | スキル名を再要求しない。対象taskだけ変更。script・package・配備先・day-planは変更なし |
| A06 | 一覧に、期間なしweekly、有限confirmed、有限provisional、Backlog weeklyが混在 | 期間なしweeklyに日程確認を求めずNextを表示。provisionalだけ要確認。Backlogは別欄。読み取りのみ |
| A07 | 「このtask、10分だけなら何から始める？」 | 条件に合う小さな一歩を一つ提案。依頼されていない記録変更や全体計画の展開をしない |
| A08 | 対応済み環境でpriority5の既存taskの本文だけを更新 | priority5を維持。未指定の新規taskは7になることと混同しない |
| A09 | 「daybookにこの作業を登録。来週中に進めたい」、両端の指定なし | 会話から実行可能な期間を推測して登録。provisionalと仮置き理由を残し、事前確認で止めない |
| A10 | 開始だけ指定／終了だけ指定した通常task登録で、他の推測材料なし | 指定値を維持して欠けた側を3.3節どおり補完。日付順を守り、provisional・priority7で完了 |
| A11 | 「日付なしのBacklogとして登録」または終了日のない週次ルールの登録 | 明示指定とルールの性質を維持し、今日終了を押し込まない。priority未指定は7 |
| A12 | 新規Issue取り込みで作業内容は明確だが、作業予定日・優先度なし | 日程未指定だけではneeds-infoにせず、ローカル計画を今日〜今日・provisional・7で準備。外部書き込みは既存の承認経路に従う |

発火評価では利用可能なカタログの名前・descriptionだけを初期状態へ渡し、SKILL本文や正解手順を先に読み込ませない。適切に分離した環境で実行できない場合は、ケースごとの本文レビューと「実対話未検証」を記録する。形式検査を発火の実行検証として数えない。

### 6.3 実装後に実行するコマンド

同梱runtimeの依存が利用可能なら再インストールしない。必要な場合だけ、その既存lockfileを使って準備する。

```sh
node --test skills/igapyon-miku-daybook/assets/daybook/scripts/*.test.mjs
python3 /Users/igapyon/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/igapyon-miku-daybook
npm run test:skill-index-policy
git diff --check
```

`quick_validate.py` のパスは実行環境で読み込んだskill-creatorの実在パスに合わせる。最初のコマンドはコード・ローカルCLIの検証、次の二つは形式・参照・配布の検証。別作業による失敗は対象差分と分けて報告し、miku-scmなどを本計画のために改修しない。

## 7. 完了条件と実施記録

- [x] 利用指示・具体的なdaybook操作と、言及・メタ依頼を入口で区別できる。
- [x] 単独起動の待機、HANDOFFから指定子Waypointへの再開、現在の指示の優先が維持される。
- [x] priority未指定が新規作成・表示・新規Issue取り込みで7、明示値と保存済み計画は維持される。
- [x] 通常taskの予定日未指定は、推測または今日〜今日の仮置きで埋め、日程確認待ちにせず登録を終える。暫定と理由を保持する。
- [x] 週次の期間あり／なし・確定／暫定の検証と表示が文書どおりになる。
- [x] 通常の分類変更が導入更新へ広がらない。
- [x] 対象テストと形式・参照・配布検査を実行し、結果を記録した。
- [x] 本文レビューと実対話検証を分け、未実施事項を正確に記録した。
- [x] 既存の着手支援・短い報告の改善と、対象外の差分を保持した。

## 8. 現在の実装状況（2026-11-05）

SKILLの発火説明、task日程・優先度の規則、weekly statusの検証、通常のBacklog分類ルーティング、Issue importの明示的な暫定statusをsourceへ反映した。Issue importの既存manifestsは引き続き読み取れ、status省略時は従来どおり完全な期間をconfirmedとして扱う。planのdigestと保存済みwritesには変更を加えていない。

自己レビューで、日付根拠内のHTML markerがIssue receipt検証を壊す問題、優先度省略値の古い並び期待、通常の日付変更を移行ガイドへ送る案内を見つけ、修正した。daybook runtime suite **69/69**、`npm run test:skill-index-policy` **79/79**、`quick_validate.py`、`git diff --check` が成功。日付根拠のmarker混入・一行化、priority 5と省略7、Backlog例外、週次の確定・暫定・無期限を一時fixtureでも確認した。Skill本文とrouting policyを確認したが、実際のモデル会話での発火・待機・再開は未検証。このためstatusは `in_progress` とし、実対話確認を残す。
