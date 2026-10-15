# daybook スキルのレビュー指摘修正計画

作成日：2026-10-15。状態：実装済み・一部 fixture の npm 依存取得確認は未完（2026-10-15）。想定実装モデル：Luna。

この計画は当初「実装はいまはやらない」という指示で作成した。その後、利用者から「計画に従って実装して」と指示を受け、以下の範囲を実装した。実 daybook や GitHub の変更は対象外。

## 1. 目的とレビュー根拠

対象は `skills/igapyon-miku-daybook/` の原本。確認した問題をこの文書内に記載し、ignored なレビュー記録がなくても実装を開始できるようにする。

1. `SKILL.md` の activity 段落は、活動報告から task の完了を推定しないと指示している。一方、`references/operations.md` の Add an activity は、全チェックリストと完了条件が明白なら完了更新を認めている。task の変更範囲と完了の根拠が混在している。
2. `references/issue-import.md` は対象 daybook の `node scripts/import-issues.mjs capabilities` を最初に実行するが、スクリプトと依存関係の配置確認・不足時の導入経路がない。`import-issues.mjs` は `issue-import.mjs` に依存し、後者は `day-plan.mjs` と npm の `yaml` に依存する。通知用ファイル一覧だけを導入した環境には、取り込み用の二つのスクリプトがない。

既存の task＝最新状態、activities＝実施内容・試行錯誤・判断理由という分担、および MIT OpenCourseWare の *Guidelines for Keeping a Laboratory Notebook* を参考にした説明を維持する。

## 2. 実装範囲と開始前の状態

計画時の branch は `devel-tiga1015med`、HEAD は `3e387824978f55c80b93a5336ba627c94b20f6f4`。その時点で README、daybook SKILL.md、operations.md に記録モデル追加の未コミット変更がある。実装時は実際の Git 状態を再確認し、この記述を branch や HEAD の固定条件にしない。既存の差分を出発点として保持する。

修正対象は編集指示・導入手順・参照案内。CLI、生成スクリプト、JSON schema、既存の GitHub 操作フローは現状のものを利用する。新しい installer、独自の GitHub API 呼び出し、タスク状態の自動再構築は作らない。

実 daybook repository、配備済みの `~/.codex/skills/`、miku-scm の source、GitHub、通知設定はこの修正の作業対象にしない。version 更新、commit/push、PR、tag、Release、スキル同期は別途の依頼で扱う。

## 3. 採用する仕様：task の完了と編集範囲

### 3.1 二つの条件を別々に判定する

task の完了更新には、次の両方が必要。

1. **範囲**：現在の依頼と会話の文脈に、その task の状態更新が含まれる。
2. **根拠**：利用者がその task の完了を明示した、または記録された全完了条件を満たしたことが報告・結果から明白である。

明示的に task 更新を依頼され、根拠も揃っている場合は、そのまま更新する。特定の合言葉や、追加の一律承認を要求しない。どの task か不明、条件の一部しか確認できない、といった実際の曖昧さだけを解消する。

「activities に記録して」など活動のみを指定した依頼は活動のみを更新する。対応する task があっても、それだけで task 編集を追加しない。逆に task だけの更新依頼から活動記録を自動追加しない。「task の状態と今日の作業経緯を更新して」など両方が範囲に含まれる場合は、task の最新状態と短い履歴、activities の当時の経緯を更新し、既存の相対リンクで結ぶ。

完了の根拠が足りない場合は、根拠のある最新情報を記録し、done にしない。活動があったこと、Issue が closed になったこと、日程が過去になったことは、それぞれ単独では task 完了の根拠にならない。

### 3.2 完了更新時の整合性

- `status: done`、本文の状態チェック、実際の完了日がわかる場合の `completed` を整合させる。予定終了日を実完了日に流用しない。
- 正しい既存の `completed` を、再報告した日で上書きしない。実完了日が不明で、既存 contract を満たすために必要なら日付を確認する。
- task の ID、ファイル名、作成月ディレクトリを維持する。
- 週次 task は、一回の occurrence の実施だけで recurring rule 自体を done にしない。今回の修正から rollover を起動しない。
- 過去の activities は当時の記録として保持し、後日の方針変更と事実訂正を区別する。

### 3.3 依頼と期待する編集の確認表

同一の架空 task `task-202610-00001` を想定する。通常 task は未完了、チェックリストは「参加費を振り込む」一項目、日付は 2026-10-15 とする。ケースごとに初期状態を戻して判断する。

| ID | 依頼・前提 | 期待する編集 |
| --- | --- | --- |
| C1 | 「今日、参加費を振り込んだ。activities に記録して」 | 当日の activity のみ。task の状態・履歴・リンクは変更しない。 |
| C2 | 「task-202610-00001 を完了にして。今日振り込んだ」 | task を done、状態チェックと completed を整合。activity を新規作成しない。 |
| C3 | 「振込が済んだので、この task の状態を更新し、今日の活動にも経緯を残して」 | 全完了条件と一致するため task を done。activity に経緯を記録し相互リンク。追加承認なし。 |
| C4 | チェックリストに「受領確認」もある。「振込済み。task と活動を更新して」 | 支払済みの情報と活動を更新するが task は未完了。受領確認が残ることを明記。 |
| C5 | 「task-202610-00001 について作業した。活動に記録して」 | 確認できた作業だけ activity に記録。未報告の完了・方法・理由を補わない。 |
| C6 | 「検討して B 案に決めた。task の最新方針と今日の活動を更新して」 | task に B 案と次の行動、activity に報告された検討経緯。既存の A 案採用日の活動を消さない。 |
| C7 | 週次 recurring task。「今週分を実施した。task と活動に反映して」 | 許可範囲の実施情報を反映。recurring rule は active のまま。rollover は起動しない。 |
| C8 | 同 task は既に done、completed は 2026-10-14。「昨日完了した件を、昨日の activities に追記して」 | task の正しい completed を維持。2026-10-14 の活動へ追記し、報告日を実施日と混同しない。 |

## 4. 採用する仕様：Issue 取り込みの導入前提

### 4.1 gh 確認より前の準備

`references/issue-import.md` の現行 Step 1 の前に、ローカル CLI の前提確認・不足時の導入手順を加える。通常の daybook 起動や記録編集ではこの確認を起動しない。

必要なものを表で明記する。

| 対象 | 確認する内容 |
| --- | --- |
| 実行環境 | Node.js と、対象 repo の依存関係管理方法を確認する。同梱 workflow は現在 Node.js 24 を使用しているが、今回新しい最低版の保証は追加しない。 |
| `scripts/import-issues.mjs` | 取り込み CLI。配置元は読み込んだ daybook スキルの `assets/daybook/scripts/`。 |
| `scripts/issue-import.mjs` | CLI の core module。同じ bundle の対応する版。 |
| `scripts/day-plan.mjs` | core が使う共有 module。通知・day-plan 生成と共用なので既存変更を保護する。 |
| `yaml` | 対象 repo で上記 module から import できる依存関係。宣言だけでなく導入済みかを確認する。 |
| miku-scm | 既存の GitHub read/comment/close を担当するスキルと runner の配置先。daybook のローカル CLI へ GitHub 操作を追加しない。 |

スキルの配備先と対象 daybook root を区別する。配布元パスは、実際に読み込んだ daybook `SKILL.md` のディレクトリから解決し、特定の絶対パスや対象 repo 内の `skills/` を仮定しない。

### 4.2 不足時の統合手順

導入案内は次の順にする。通常の明示的な Issue 取り込み依頼を実行するために必要な、競合のないローカル準備に一律の追加承認ゲートを作らない。既存の独自実装との競合は、具体的な差分と影響を示して解決する。

1. 対象 README、Git 状態、既存 scripts、package と lockfile を確認する。
2. 必要な三つの `.mjs` がなければ、同じ配布 bundle から不足ファイルを導入する。既存ファイルが bundle と同一なら書き換えない。異なる既存ファイルは差分を確認し、互換性を判断できない場合は対象ファイルと問題を報告して停止する。既存の `day-plan.mjs` を無条件で置換しない。
3. `yaml` が導入済みで、読み込み可能なら依存関係を変更しない。不足時は bundle の package 宣言を参照し、対象 package に必要な依存関係だけを統合する。既存 scripts や他の依存関係を保持する。既存版との競合がある場合は無断で upgrade/downgrade しない。
4. 対象の npm 運用に沿って lockfile と依存関係を整える。宣言と lock を変更していない導入済み構成なら `npm ci`、依存宣言の追加が必要なら対応する npm install の手順を使う。結果 diff は `yaml` と必要な lock entry に限り、無関係な依存の変更を解消できない場合は停止する。空 repo に通知用の package 名・test script を丸ごとコピーせず、その repo に必要な package 定義を作る。ほかの package manager に固定された対象では、その方針との衝突を解決してから進める。
5. 対象 daybook root で `node scripts/import-issues.mjs --help` を実行し、CLI と import 依存関係が読み込めることを確認する。この help はローカル表示だけで GitHub 操作をしない。
6. 読み込みが成功してから現行の `node scripts/import-issues.mjs capabilities` へ進む。

`--help` 自体も core と yaml を import するため、ファイル・依存関係がない状態の万能な診断コマンドとして案内しない。読み込み失敗を `GH_NOT_FOUND` と読み替えない。`GH_NOT_FOUND` は、読み込み成功後に capabilities が返した場合だけ使う。今回、新しい CLI エラーコードや新 subcommand を発明しない。

`gh` の実行ファイルがあるだけでは認証成功を保証しないという現行説明、および GitHub の読取・コメント・close を miku-scm に委譲する流れを維持する。gh 導入やログインを自動実行しない。

### 4.3 通知 bundle との関係

通知 workflow の作成依頼では、`references/notification.md` に列挙した通知用ファイルを一式として扱う。取り込み CLI の配置は別の機能準備であることと、対応する前提確認へのリンクを記載する。通知のためだけに取り込み機能まで導入する規則には変更しない。

## 5. Luna 向けの作業順序

### DBR-00：ベースラインと範囲を確認

- [x] 後続の実装指示を確認し、この計画を読む。
- [x] `git status -sb` と既存差分を確認。記録モデル追加の README、SKILL.md、operations.md を保持。
- [x] `SKILL.md`、`operations.md`、`records.md`、`issue-import.md`、`notification.md` と CLI の import 関係を確認。
- [x] 今回の対象を本計画に限定し、古い GOAL/TODO/HANDOFF の別作業を再開しない。

完了条件：修正する source と、保護する既存差分を特定できている。

### DBR-01：完了判定を統一

- [x] `operations.md` に `Task completion and scope` を追加し、依頼範囲、完了根拠、done 時の日付・状態整合を正本化。
- [x] Add an activity の旧例外文を共通節への案内に置換。
- [x] `SKILL.md` activity 段落から共通節へ案内。
- [x] `records.md` の status 規則から共通節へリンク。
- [x] C1/C3/C4 に対応する activity-only、task-only、両方の例を共通節へ追加。

完了条件：SKILL.md だけを入口にしても、詳細 reference を読んでも、task の変更範囲・完了条件が同じになる。

### DBR-02：Issue CLI の導入経路を記述

- [x] `issue-import.md` の capabilities より前に、前提表・導入順・`--help` を追加。
- [x] source/manifest/prepare/apply、comment-result、close-result、再開仕様を維持。
- [x] 導入済み helper と依存関係は変更せずに現行フローへ進むと記載。
- [x] helper 不足、`yaml` 不足、load failure、`GH_NOT_FOUND`、miku-scm runner 不在を区別。
- [x] package/lockfile の既存設定を保護し、通知用一式を取り込みだけのためにコピーしない規則を記載。

完了条件：実装者が対象に新旧いずれの環境を渡されても、最初に何を確認し、何を追加し、どの競合で止めるか判断できる。

### DBR-03：入口と説明を整合

- [x] 明示的 Issue intake に必要なローカル準備だけを案内し、通常編集の開始条件からは除外。
- [x] operations の Issue 取り込み案内を capability check より前の準備へ変更。
- [x] SKILL.md の通知 bundle 案内を notification.md の一覧参照へ整理。
- [x] notification.md から Issue intake 手順へリンクし、通知 bundle に helper を含めない。
- [x] root README に intake 前提手順へのリンクを追加し、MIT 出典・対応表を維持。

完了条件：どの入口からも同じ完了規則と導入手順にたどり着き、機能ごとの準備範囲が一致する。

### DBR-04：文書と導入手順を検証

- [x] C1〜C8を完了根拠と編集範囲の規則へ照合し、期待編集先・done 判定を説明可能と確認。
- [x] 一時 fixture S1〜S6 を実施し、結果と dependency install の部分未検証を第6節へ記録。
- [x] skill-creator の `quick_validate.py` を実行し `Skill is valid!`。
- [x] 追加した相対リンクと heading anchor の存在を確認。
- [x] `git diff --check` 成功。status と関連 diff をレビュー。

CLI source を変えない修正なので、miku-scm の full suite、全 repo の package、Release 検証は必須にしない。既存スクリプトの修正が必要と判明したら、理由と追加範囲を整理し、この文書の範囲を更新してから着手する。

完了条件：指示の整合性と導入経路の確認結果を区別して報告できる。静的なケース照合を、モデルの独立した実行評価に合格したものとは報告しない。

### DBR-05：引き継ぎを更新

- [x] TODO の DBR-00〜05 を実績に合わせて更新。
- [x] HANDOFF に変更、検証、未実施事項を記載。
- [x] S2/S4 の npm cache limitation を明記し、未実施の配備や GitHub 操作を完了扱いにしない。

## 6. 導入確認 fixture

実装時に `/private/tmp` の独立した一時 root を作り、各ケースを分離した。fixture に実認証情報や実 daybook 記録は含めていない。スクリプトのコピー元は source bundle。実 daybook と GitHub は使用していない。

| ID | fixture の初期状態 | 期待する結果 |
| --- | --- | --- |
| S1 | 三つの helper と yaml が導入済み。package に独自 scripts と別依存あり。 | `--help` 成功。準備でファイル変更なし。capabilities は PATH を空にして実行すると `GH_NOT_FOUND`。実 gh を起動しない。 |
| S2 | README と package のみ、取り込み helper なし。 | 必要三ファイルと yaml を第4節の手順で統合後、`--help` 成功。通知 YAML や投稿スクリプトを追加しない。 |
| S3 | 通知用一覧のファイルと yaml だけがある。 | 同一 bundle の day-plan.mjs を再利用し、取り込み用二ファイルを追加後 `--help` 成功。既存通知ファイル・設定・独自 scripts を変更しない。 |
| S4 | helper は揃っているが yaml が未宣言・未導入。 | 読み込み不足を gh 不在と混同しない。必要な依存関係を対象 package/lock に統合後、`--help` 成功。 |
| S5 | 既存 day-plan.mjs に互換性不明の独自変更あり。 | 単純上書きで解決しない。具体的競合を示して停止。既存内容の hash が維持される。 |
| S6 | ローカル CLI は正常、miku-scm の指定配置先がない。 | GitHub フローへ進まない。CLI に代替の gh/API 操作を追加しない。 |

各ケースについて実行コマンド、exit status、期待との一致、意図したファイル以外の差分がないことを記録する。ネットワークや依存導入を実施できなかったケースは未実施として残す。live の GitHub read/comment/close はこの検証に不要。

PATH を空にするケースは、`process.execPath` などで取得した Node の絶対パスから CLI を起動する。shell が node 自体を見つけられない失敗を、capabilities の GH_NOT_FOUND と混同しない。既存の `assets/daybook/scripts/import-issues.test.mjs` に同じ起動方法の例がある。

### 実施結果（2026-10-15）

実行 harness：`node /private/tmp/daybook-skill-review-fixtures.mjs`。Node は `/opt/homebrew/Cellar/node/26.5.0/bin/node`。実 fixture root は `/private/tmp/daybook-skill-review-1792048625254/`。

| ID | 結果 | 実行結果 |
| --- | --- | --- |
| S1 | PASS | `--help` と `capabilities` は exit 0。PATH を空にした capabilities の reason は `GH_NOT_FOUND`。helper の前後ハッシュは一致し、`gh` は起動していない。 |
| S2 | PARTIAL | helper 3件を追加し、既存 package 名・custom script と通知ファイル不在を確認。`npm install --offline --no-audit --no-fund yaml@^2.8.1` は exit 1 (`ENOTCACHED`)。同梱 bundle の `yaml` を fixture に置いた後の `--help` は exit 0。npm による依存取得・lock 生成は未検証。 |
| S3 | PASS | 通知 bundle の8ファイルと `yaml` がある状態で `npm ci --offline --no-audit --no-fund` と `--help` が exit 0。通知ファイル8件の前後ハッシュは一致し、`day-plan.mjs` を再利用。 |
| S4 | PARTIAL | `yaml` 不在の `--help` は exit 1 の load failure で `GH_NOT_FOUND` ではない。npm install はS2と同じく exit 1 (`ENOTCACHED`)。同梱 bundle の `yaml` を置いた後の `--help` は exit 0。npm による依存取得・lock 生成は未検証。 |
| S5 | PASS | target 固有の `day-plan.mjs` は bundle と不一致と判定し停止。ファイルの前後ハッシュは一致し、上書きなし。 |
| S6 | PASS | local `--help` は exit 0。fixture の miku-scm runner は不在と判定して remote flow を停止。直 `gh`／API fallback はなし。remote command は実行していない。 |

S2/S4 は npm registry 情報がオフライン cache になく、`npm install` の依存取得・lock 更新を確認できなかった。ランタイムの load 判定は bundle 内の `yaml` を fixture に置いて確認した。ネットワーク利用可能な環境での実 npm install は未実施。

## 7. 変更ファイル一覧

| ファイル | 変更内容 |
| --- | --- |
| `skills/igapyon-miku-daybook/SKILL.md` | 完了判定の共通節への案内、Issue intake のローカル準備範囲、通知 bundle の範囲明確化 |
| `skills/igapyon-miku-daybook/references/operations.md` | 完了・範囲の正本と最小例、activity の例外文統一、導入前提への routing |
| `skills/igapyon-miku-daybook/references/records.md` | 状態 schema から完了規則へのリンク |
| `skills/igapyon-miku-daybook/references/issue-import.md` | CLI 前提表、導入経路、確認コマンド、不足・競合時の対応 |
| `skills/igapyon-miku-daybook/references/notification.md` | 通知用 bundle と取り込み用準備の関係、参照リンク |
| `README.md` | daybook の取り込み前提手順へのリンク |
| `TODO.md` / `HANDOFF.md` / この計画書 | 実際の進捗・検証結果を反映 |

同梱 `.mjs`、package、lock、tests、workflow は既存機能を利用する。対象 daybook にどう導入するかを文書化する修正であり、この repo の assets 自体を無目的に更新しない。

## 8. 最終受入条件

1. 活動のみ・task のみ・両方の依頼を区別し、完了の証拠だけで編集範囲を広げない。
2. task 更新が範囲にあり完了根拠が明白なら、一律の追加承認なしに正しく更新できる。
3. activity と task の既存の記録モデル、および週次 task の状態規則を維持する。
4. Issue CLI 未導入環境の準備手順が、同梱ファイルと既存コマンドに基づいて具体化されている。
5. 既存のカスタマイズ・package 設定・通知機能を無条件に上書きしない。
6. 読み込み失敗と GH_NOT_FOUND を区別し、GitHub 操作は miku-scm の既存手順へ委譲する。
7. 文書・リンク・fixture の実施済み結果が記録され、未実施の実運用を成功と主張しない。
