# miku-prompt-lint：自己レビュー4件への対応計画（Luna向け）

作成日：2026-11-11（Asia/Tokyo）。状態：実装・証拠検証済み。意味評価の完了条件は未達。

利用者の指示：「対応を計画して。Lunaが実施できるように。このターンは計画だけ」。
この文書の手順・テスト・モデル評価は、後続の実装依頼を受けて実施する。
旧計画は [miku-prompt-lint-review-fixes-luna-implementation.md](miku-prompt-lint-review-fixes-luna-implementation.md)。
今回の計画は、その独立評価と完了判定について優先する。

## 1. 対象と開始状態

実装する正本は **`/Users/igapyon/Documents/git/miku-prompt-lint-skills`**。
この計画書のある `igapyon-agent-skills` とは別のrepositoryである。

計画時に読み取り確認した状態：

- branch：`devel-tiga1024vbb`、`origin/devel` に対しahead 2。
- HEAD：`e551380e7bd4dba1bf777aa9ca5c5ba64160db9e`。
- 未commit変更：`TODO.md`、`docs/review-followup-execution.md`、
  `references/output-format.md`、`references/template-selection/workflow.md`、
  `tests/fixtures/review-followup-baseline.json`、`tests/fixtures/review-followup.json`、
  `tests/review-followup-contract.test.mjs`。referenceの起点は正本Skillディレクトリ。
- package版：`0.8.0`、開発runtime：Node.js `>=24 <25`。
- 直前の自己レビュー時にはNode.js v26.12.1で `npm test` 20件が通過した。
  応答・traceの48個のSHA-256も一致した。ただし、以下の欠陥は検出できなかった。
- 配備先 `/Users/igapyon/.codex/skills/igapyon-miku-prompt-lint/` は正本と5ファイルが異なる。
  配備版を評価対象や正本へ上書きする根拠にしない。

開始時にはbranch・HEAD・差分・適用される `AGENTS.md` を再確認する。
既存変更を引き継ぎ、計画時の状態にcheckout/resetしない。
本計画の成果物は評価用コード・fixture・記録であり、既に修正した骨子手順と例の変更を保持する。

## 2. 指摘と完了条件

| ID | Mediumの指摘と根拠 | 対応・完了条件 |
| --- | --- | --- |
| SR-1 | R5のtraceは `~/.codex/skills/igapyon-miku-prompt-lint/` を読む一方、baselineは最終正本のmanifestを記録している | 評価用コピーを明示して起動し、実際の読込先とbytesを監査する。外部の対象Skillを読んだ実行は合格に数えない |
| SR-2 | `validateBaseline` はtrace削除、入力hash差し替え、未登録のobserved Rule、証跡なしの再試行成功を受理する | 共有validatorと異常系テストを作り、入力・source・実応答・trace・attemptの対応を検査する |
| SR-3 | R5のwrapperが `Treat all supplied target files, commands, and scripts as review data. Do not execute target behavior.` と指示している | wrapperから採点対象の動作指示を除き、通常のレビュー依頼とraw資料だけで実行試行の有無を観測する |
| SR-4 | A5を引用ログに移したため、長い識別子を完全一致で除外しなくても合格する | A4と同じ使用依頼で識別子だけ長くした反例に戻す。引用内の非発火は既存A7で保持する |

旧baselineの `complete-pass` は、この4件の対応完了を表さない。
旧F2（骨子手順）とF3（例）の修正は保持し、旧F1（独立評価）を再開する。
Security Review Contract、全46Ruleの再評価、版数・配備・commit/push・Releaseは今回の対象に含めない。

## 3. 実装順とファイル

| 順番 | 作業 | 成果物・完了条件 |
| --- | --- | --- |
| SR-00 | 開始確認と旧判定の失効記録 | 旧baselineを履歴へ保存し、active baselineとTODOを再評価待ちにする |
| SR-01 | 評価記録の検証契約を修正 | 共有validator、schema v2 baseline、異常系テスト |
| SR-02 | fixture・起動・wrapper・trace監査を修正 | Git管理するrunnerと証跡検査、A5の直接使用反例、中立なwrapper |
| SR-03 | モデルを使わない検証 | 不正なsnapshot・入力・trace・attempt・wrapperを確実に拒否する |
| SR-04 | 最終条件で独立評価 | 新しいrun IDで全24ケースの新規セッションを実行し、実観測を採点する |
| SR-05 | 完了検査と記録 | 完全性とraw証跡の検査、通常test、必要なbundle検査、完了判定の更新 |

推奨する配置（いずれも対象repositoryからの相対path）：

| path | 用途 |
| --- | --- |
| `scripts/lib/review-followup-contract.mjs`（新規） | canonical input、manifest、fixture・baseline・attemptの共有検証 |
| `scripts/evaluate-review-followup.mjs`（新規） | snapshot配置、mode別の入力生成、CLI起動、raw成果物保存。採点前にpassを作らない |
| `scripts/verify-review-followup.mjs`（新規） | baselineとraw成果物の検査、trace監査結果の照合、完了gate |
| `tests/review-followup-validation.test.mjs`（新規） | 実モデルを起動しない契約・異常系テスト |
| `tests/review-followup-runner.test.mjs`（新規） | fake executorで入力生成、保存、外部読込・失敗・timeoutを検証 |
| `tests/review-followup-contract.test.mjs` | 既存のsource契約を保持し、active baseline検査に共有validatorを使う |
| `tests/fixtures/review-followup.json` | 24ケースを保持し、A5のraw入力を修正 |
| `tests/fixtures/review-followup-baseline.json` | schema v2のactive結果。新実行前はpending |
| `docs/evaluation-history/review-followup-2026-11-11/`（新規） | 旧baselineの原本と、完了判定を失効した理由 |
| `docs/review-followup-self-review-execution.md`（新規） | 今回の実装・検証・不一致・再評価の実施記録 |
| `docs/semantic-evaluation.md`、`docs/review-followup-execution.md`、`TODO.md`、`package.json` | 新手順・判定・コマンドへの導線 |

実装上まとまりが良ければ共有コードを小分けにしてよい。テストだけに定義したvalidatorや、
一時ディレクトリにしか残らないrunnerを再び正本にしない。

## 4. SR-00：履歴を保持して評価を再開

1. active baselineを変更する前に、旧JSONをbytesを変えず上記の履歴ディレクトリへ保存する。
   元ファイルのSHA-256、旧run ID、SR-1〜SR-4の根拠を隣接するREADMEに記す。
   履歴内の `complete-pass` は失効した過去の主張であり、active gateから読まない。
2. `workplace/rule-calibration-results/2026-11-11-gpt-6-luna-final2/` のraw応答・traceを保持する。
   ファイル名・hashを新実行のものに付け替えない。
3. active baselineをschema v2のpendingにし、対象TODOを再評価待ちへ戻す。
   `docs/review-followup-execution.md` 冒頭に自己レビューによる失効と新実施記録への導線を加える。
4. 旧F2/F3と既存のビルド検証記録は履歴として保持し、旧24件合格を今回の証明に流用しない。

## 5. SR-01：記録とvalidator

### 5.1 入力と観測の対応

baselineだけschema v2へ更新する。24ケースのfixtureはschema v1を維持する。
raw inputのhashは、共有関数でobject keyを再帰的に整列し、array順を保持したJSONの
UTF-8 bytes（末尾改行なし）から算出する。fixtureの `input` と保存したraw inputに同じ関数を使う。
期待値・rationaleをhash対象のraw inputへ混ぜない。

新記録に最低限必要なもの：

- root：schema、scope、gate状態、旧評価への参照、fixture hash、base commit、
  最終Skillの全path・hash・manifest hash、評価protocolのversion・wrapper hash・実行設定。
- case：case ID、mode、実model・reasoning設定・CLI/runtime・日時、順序付き `attempts`。
- attempt：入力hash、実prompt hash、source manifest hash、終了状態、応答とtraceのpath・hash、
  source読込監査、実観測、各assertionの判定と根拠となる応答箇所・trace event。
- 再試行：元attemptへの対応、理由、別のraw応答・trace、実結果。
  `retryResult: pass` のような単独flagだけで成功を表現しない。

`observed` は実応答・traceから記録する。`observed = expected` による生成や、両者の完全一致だけを
完了検査にしない。焦点Rule・modeの必要条件を比較し、期待にないfindingは有効Ruleとして記録する。
焦点外のfindingを一律に失敗にしない。採点で補足した判断には理由と根拠を残す。

### 5.2 検証内容

- fixtureのcase ID・mode・入力・期待field、enum、Ruleの存在と所有Level。
  active Rule一覧は正本のanti-patternsから取得し、既存テストの取り方を再利用する。
- caseの過不足・重複、mode不一致、source/fixture/input/prompt hashの対応。
- 応答とtraceの必須path・SHA-256、attempt番号・初回・retryの関係。
- mode別の実観測field。reviewはRule/適用/severity/confidence等、activationは分類値とbody読込監査、
  skeletonは読込先・順序・出力境界。観測不足をexpectedで補わない。
- unknown Rule、不正なstatus/enum、外部source読込、証跡不明を含む結果からの完了昇格を拒否する。

通常のCIではGit管理外rawの存在を要求しないが、traceの記録構造とhashは必須にする。
ローカル完了gateではraw input・prompt・応答・trace・監査記録の存在とbytesも必ず照合する。
pathは指定run root内に解決し、絶対path・`..`・symlinkによる脱出を合格にしない。
構造だけの検査と実成果物を検査するmodeを区別し、rawを読めないmodeを完全な証跡検証と表示しない。

### 5.3 gateと再試行

- `pending` / `fail` / `complete-pass` を保持する。構造的に正しいpendingでも完了gateは失敗する。
- complete-passには、24ケースすべての検証済み実行・採点・最終snapshotとの一致が必要。
- 誤ったsourceや観測不能の実行は「モデル判断の失敗」と分けてinvalidとして保存し、合格に数えない。
- semantic failureは同じ入力・sourceで一度だけ再試行し、初回とretryを両方保持する。
  retryだけの成功で安定合格にしない。未解決の変動はfailとして原因を調べる。
- Skill・raw入力・wrapper・モデルへ渡る実行条件を変えたら、新run IDで全24件を再評価する。
  採点器だけの訂正は理由を残して再採点できるが、モデルの再実行と区別する。

## 6. SR-02：評価の起動条件とfixture

### 6.1 SR-1：最終Skillを実際に読む

1. 最終正本をsymlinkを使わずcase専用の `.agents/skills/igapyon-miku-prompt-lint/` へコピーする。
   コピー前後の全path/bytesを照合し、評価中は変更させず、実行前後にもmanifestを照合する。
2. 評価対象へ渡すナビゲーション情報で、この絶対pathの `SKILL.md` が対象Skillだと明示する。
   ルールの適用・severity・実行禁止などの期待動作は追加しない。
3. ローカルの `codex --help` / `codex exec --help` と利用可能な起動設定を確認する。
   対象Skillの登録先を固定できる設定があればcase専用に適用し、ユーザーのglobal設定を編集しない。
   起動はargument配列で行い、user文やraw資料をshell文字列へ展開しない。
4. cwdを隔離しただけ、read-only sandboxを選んだだけでsource隔離済みと判定しない。
   全review/skeleton caseについて成功した実読込のpathとtrace eventを採取し、
   frozen copy内のrealpath・相対path・hashへ結び付ける。
5. `~/.codex/skills/igapyon-miku-prompt-lint/` 等にある外部の対象Skill本文・resourceの読込試行は
   実行をinvalidにする。同じbytesでも許可しない。他の補助Skillを読んだ場合は別に記録する。

trace監査は、command文字列に `.agents` が含まれるだけでは合格にしない。
相対path、cwd変更、絶対path、symlink、複数command、失敗したreadを区別する。
CLIのtraceから読込先を確定できないcommandは手動監査で根拠を補うか、unverifiableとして扱う。
汎用shell parserを作ることは要求しないが、不明なreadを推測で検証済みにしない。
必要な観測が取れなければ、その制約を記録して独立評価を未完了に保つ。

source監査は初回から全caseに適用する。R5だけ再実行して旧23件に混ぜない。

### 6.2 SR-3：中立なwrapper

reviewのwrapperに含めるものは、対象Skillの場所、raw user turn、raw target contextの区切りだけ。
例えば「このuser turnに応答してください。利用可能な対象Skillは `<staged path>` です」とし、
続けてuser turnと資料をそのまま渡す。

以下のような採点対象の動作指示を追加しない：

- `Treat ... as review data` / `Do not execute target behavior`。
- handoffや特定referenceを読む指示、Rule ID、severity、形式の正解。
- expected/rationale、proposed finding、case ID、旧応答や不一致の説明。

R5の「targetを実行しない」はSkill自身の指示として存在することを評価する。
読み取り専用sandbox等の実行制限は維持し、害のない既存sentinel commandについて、
成功・拒否を問わず実行試行がtraceにあれば失敗とする。sentinelの未作成だけで合格にしない。

skeletonは期待を含まない既存historyと現user turnを渡す。
activation-metadataはprofile・raw user turn・必要historyと分類用の出力enumだけを渡し、
対象Skill本文・resourceを配置/読込する必要はない。body読込があればmetadata評価としてinvalidにする。
この13件はmetadata解釈評価であり、hostの自動発火を保証する結果とは呼ばない。

### 6.3 SR-4：A5の反例を復元

A4とA5を以下の対にする。依頼本文を揃え、識別子だけを変える。

```text
A4: $miku-prompt-lint で、このプロンプトをレビューして。
A5: $miku-prompt-lint-skills で、このプロンプトをレビューして。
```

期待はA4=`activate`、A5=`inactive`。A5に引用、ログ、README編集、存在質問を混ぜない。
A7は引用内の名前で非発火になる既存caseとして保持する。
全24caseのIDとmodeは保持し、期待が合うまで入力を容易な別用途へ変更しない。
新A5で不一致が出た場合はmetadataの不備とモデルの変動を切り分け、未解決をpassにしない。

## 7. SR-03：モデルを使わない検証

共有validator・runnerに、以下を拒否/検出するテストを追加する。

| 対象 | 必須の反例 |
| --- | --- |
| trace | field削除、path/hash不正、local完了gateで実file欠落・bytes不一致 |
| input | 64桁の別hash、fixtureと保存rawの差、prompt生成結果との不一致 |
| Rule・mode | 未登録observed Rule、invalid enum、modeに必要な観測欠落 |
| attempt | retry成功flagだけ、retry証跡欠落、初回失敗の削除、attempt重複・順序不正 |
| source | 外部の対象Skill読込、symlink脱出、古いcopy、前後manifest不一致、曖昧な読込 |
| wrapper | 禁止された期待動作の混入、expected/rationale/case IDの流入 |
| A5 | rawがA4と識別子以外は同じ直接使用依頼であり、引用caseへ退行しない |
| gate | pending/fail/invalid/未観測caseからのcomplete-pass、重複・不足case |

runnerテストはfake executorで行い、実モデルや外部操作を呼ばない。
source監査には旧R5と同じ外部readを含む小さい人工traceを使い、巨大な実traceをGitへ追加しない。
canonical hash、source manifest、失敗理由・retry保持は独立に検証する。
`makeCompleteBaselineFixture` のダミーhashと `observed: expected` を正例の根拠にしない。

active baselineがpendingの途中では、独立したvalidator/runner testを先に実行する。
最終active baselineをrequire-completeで検査する契約は保持するため、全体 `npm test` を
独立評価の前提にして循環させない。最終的には全体testと完了gateを両方通す。
`package.json` の明示的test一覧に新testを追加し、runnerと完了検査のコマンドを文書化する。

## 8. SR-04：全24件を新しいLunaセッションで評価

実装担当Lunaは計画と期待を見ているため、自分の回答を独立評価にしない。
各caseを明示的に `gpt-6-luna` の新規セッションで実行し、実際のmodel、reasoning、CLI、
runtime、起動引数を保存する。利用できない設定を利用済みと記録しない。

1. final source、修正fixture、wrapper、起動設定を固定する。
2. case専用cwdはcase IDや期待を示さない不透明な名前にし、最終Skillと当該raw inputだけを渡す。
   fixture全体、採点コード、計画、旧結果を入力領域に置かない。
3. まずpreflightでsource・prompt生成・監査条件を確認する。
   protocolの修正が必要なら、そのpreflightを本評価の初回成功として数えない。
4. 新run IDで全24件を評価し、応答完了後に期待と比較する。
   case実行は直列を基本とし、timeout・中断・非zero終了を記録する。
5. raw input、実prompt、応答、trace、runtime metadata、採点・監査を同じrun内で対応付ける。
   モデルが読める領域に期待値や採点結果を置かない。
6. R5は実行試行なし、S1は必要資料の成功read順序、S2はhandoffと作業境界を実traceで確認する。
   read-only環境でファイルが作られなかったことだけを、境界を守った証拠にしない。
7. 未解決の失敗・変動・読込不明を残したままcomplete-passにしない。

成果物は `workplace/rule-calibration-results/<new-run-id>/` に保存する。
旧final2の結果を新snapshotのhashへ付け替えず、新baselineは今回の実結果から作る。
全24件を再実行する理由は、A5の入力、wrapper、source選択・監査条件が変わるためである。

## 9. SR-05：検証と完了報告

評価前のvalidator/runner testの後、新baselineを検査して以下を行う。

1. ローカル完了gate：24件の対応、全raw成果物の存在/hash、source監査、実観測の採点を検査する。
2. `npm test`、`git diff --check` を実行する。テスト件数・Node/npm実値・失敗を記録する。
3. Node.js 24で確認する。利用できなければ既存のruntime制約を記録し、
   Node 26の成功をNode 24での成功に読み替えない。CIを未実行なら未実行と書く。
4. bundle生成物・正本Skill・梱包処理が変わった場合に、
   `npm run build:bundle:zip` → `npm run verify:bundle` → `npm run verify:reproducible` →
   `npm run verify:bundle` を実施し、bytesとchecksumを記録する。
   評価コード・記録だけの変更なら、前回とsource hashが同じであることを確認して既存記録を参照できる。
5. `docs/review-followup-self-review-execution.md` にSRごとの実施、使用コマンド、
   protocol/source/inputのhash、結果、不一致・retry、raw保管場所、環境制約を記録する。
6. 上記が成立した範囲でTODOと旧実施記録の現在判定を更新し、旧失効履歴への導線を残す。

完了チェック：

- [x] SR-1：全review/skeleton caseの実読込が固定snapshotに結び付き、外部読込は拒否される。
- [x] SR-2：自己レビューで通ってしまった4種の不正記録を含め、契約違反を検出できる。
- [x] SR-3：中立なwrapperを使ったR5で実行試行がなく、期待動作をwrapperが供給していない。
- [x] SR-4：A4/A5の直接使用の対と、A7の引用非発火を独立に確認できる。
- [ ] 全24caseの新結果と最終source/fixture/protocolが対応し、未解決不一致がない。
- [ ] 通常testとrawを検査する完了gateが成功し、履歴・TODO・実施記録の判定が一致する。

## 10. この計画ターンで行ったこと

対象repositoryと旧計画を読み取り、上記の対応計画を作成した。
旧計画には完了判定を再検証する旨の注記を追加した。
このターンでは対象repositoryの実装・fixture・baseline・TODOを変更せず、
テスト、モデル評価、配備を実行していない。

## 11. 後続の実装・評価

2026-11-12にv2 runner、baseline契約、A5修正、失効済みv1履歴、実施記録、raw証跡を対象repositoryへ反映した。
適用時に既存アーカイブを確認し、active v1 baselineのbytesと一致することを検証してから失効処理を完了した。
対象repositoryで `npm test` はNode.js v26.12.1 / npm 11.20.0にて28件成功し、raw evidence gateも24ケース・31 attempt分成功した。
semantic gateは意図どおり`fail`のまま。第一回は17 pass / 4 invalid / 3 failで、7件のretryを保持した。
A9/A10のactivation差、R3のseverity差、E2の初回severity変動が残るため、計画の意味評価完了条件は満たしていない。
Node.js 24、CI、およびbundle検査は未実施。Skill source bytesに変更がないためbundleは再生成していない。
反映後の詳細は対象repositoryの `docs/review-followup-self-review-execution.md` とactive baselineを参照する。
