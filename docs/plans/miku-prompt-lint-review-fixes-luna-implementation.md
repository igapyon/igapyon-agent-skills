# miku-prompt-lint：レビュー3件の修正・独立評価計画（Luna向け）

作成日：2026-11-11（Asia/Tokyo）。状態：実装・検証・独立評価済み。

利用者の指示は「修正を計画。実装はLunaが実施予定。このターンでは実装しない」。
後続ターンで利用者が実装を指示したため、この計画を実行した。実際の変更・検証記録は
`/Users/igapyon/Documents/git/miku-prompt-lint-skills/docs/review-followup-execution.md` を参照する。
この文書の計画時確認と実施証跡を混同しない。

## 1. 対象と開始条件

実装する正本は **`/Users/igapyon/Documents/git/miku-prompt-lint-skills`**。
この計画書を置いた `igapyon-agent-skills` とは別のrepositoryである。

計画時に確認した状態：

- branch：`devel-tiga1024vbb`（表示上は `origin/devel` に対してahead 1）。
- HEAD：`a686c64cc8feed32e18913be2648bc00f8a34974`（`save`）。作業ツリーはclean。
- package版：`0.8.0`。開発runtime契約はNode.js `>=24 <25`。
- 正本：`skills/igapyon-miku-prompt-lint/`。配備先は `/Users/igapyon/.codex/skills/igapyon-miku-prompt-lint/`。
- 直前レビューではソースと配備版の43ファイルが一致し、41 Markdown内の相対リンク切れは0件だった。
  これは静的確認の記録であり、実装後の検証結果として流用しない。
- レビュー中に存在した未commit変更は、その後の上記HEADに含まれている。実装開始時にはGit状態を再取得する。

実装担当者は現在のbranch・HEAD・差分を優先し、計画時のbranchへの強制checkoutやresetをしない。
通常の編集対象は正本とする。独立評価では最終ソースの隔離コピーを使い、配備済みskillと混同しない。

## 2. 修正対象と採用方針

| ID | 直前レビューの指摘 | 根拠（対象repoからの相対path） | 採用方針 |
| --- | --- | --- | --- |
| F1 | Medium：変更後の独立評価が未実施 | `TODO.md` の `Pending: Independent Evaluation of Reference Routing and Report Modes`、`docs/semantic-evaluation.md` | F2・F3の修正後、最終ソースで参照・発火・出力の変更ケースを新規セッションで評価し、入力とソースに結び付いた実結果を残す |
| F2 | Medium：prompt骨子作成の必須資料の読込条件が不一致 | `references/template-selection/INDEX.md` は最終出力前に `handoff.md`、`workflow.md` は範囲外依頼の場合だけ読込 | 読込順と適用条件の正本を `workflow.md` に集約。通常の骨子出力前にも `handoff.md` を読む。INDEXから同じworkflowへ導く |
| F3 | Low：例がルールの適用条件を満たしていない | `examples/ambiguous-output.md` の `prompt/missing-output-format` finding と、`references/prompt/anti-patterns.md` の同Rule | 原例は「文書不足」の有効なfindingを残す。根拠のない出力形式findingを削除し、見出し・参照ラベルを内容に合わせる |

この表の `references/` と `examples/` は正本skillディレクトリを起点とする。

最初に探していた別のメモは、対象repoの `TODO.md` 冒頭の
`Pending: Agent Skill Security Review Contract`。
能力一覧、ローカルアクセス、通信先、供給元、安全利用判定等の追加設計は、この3件の修正とは独立した後続作業として保つ。

## 3. 作業順と成果物

| 順番 | ID | 作業 | 主な成果物・完了条件 |
| --- | --- | --- | --- |
| 0 | PL-00 | 開始状態、既存契約、baselineを確認 | 対象repoに `docs/review-followup-execution.md` を作り、実際の状態・既存テスト結果を記録 |
| 1 | PL-01 | F2：骨子作成の読込手順を統一 | workflowとINDEXが同じ条件を案内し、通常出力前のhandoff適用が明示される |
| 2 | PL-02 | F3：過剰指摘を誘う例を修正 | 文書不足findingを保持し、形式を必要としない依頼を形式不足としない |
| 3 | PL-03 | 変更ケースと評価記録の契約を用意 | 独立評価用の入力・期待を分離でき、旧baselineと今回の評価を区別できる |
| 4 | PL-04 | ソースと最終bundleを検証 | source tests、bundle/ZIP検証、再現性確認に成功。評価対象を固定 |
| 5 | PL-05 | F1：独立評価を実施 | 下記の全ケースについて実応答・trace・採点・対象hashを記録し、不一致を解消 |
| 6 | PL-06 | 実施記録と引き継ぎ | 3件の完了根拠、残件、未確認環境を記録。完了した範囲だけTODOを更新 |

順に進める。評価中にskill内容またはraw入力を修正した場合はPL-04へ戻り、
全24ケースを最終snapshotで再評価する。採点記録だけの訂正は理由を残し、モデルの再実行と区別する。

## 4. PL-00：開始確認

対象repoの `README.md`、`docs/development.md`、`docs/semantic-evaluation.md`、
今回のTODO項目、適用される `AGENTS.md`、本書を読む。

記録するもの：

- 実際のbranch / HEAD、staged / unstaged / untrackedの概要。
- Node.js / npm / OSの実値。Node.js 24の開発契約で作業する。
- 正本と配備版の一致・差異。配備版を正本へ上書きしない。
- 初回 `npm test` の結果。既存失敗と今回の変更による失敗を区別する。

baselineは一度確認し、変更がないのに反復実行しない。
この段階でテストが成功しても、独立評価済みとは記録しない。

## 5. PL-01：必須資料を読む経路の統一

変更先は以下。

- `skills/igapyon-miku-prompt-lint/references/template-selection/workflow.md`
- `skills/igapyon-miku-prompt-lint/references/template-selection/INDEX.md`

workflowの手順を次の意味に統一する。

1. 既存の骨子支援の発火条件を確認する。
2. `skeleton-types.md` を読んで、必要に合う種類を1つ選ぶ。
3. 選んだ種類のtemplateだけを読み、既知の情報を埋め、未知は `TODO:` にする。
4. 最終回答の前に `handoff.md` を読み、提供できる範囲、追加作業への引き継ぎ、
   未検証の骨子をproduction-readyと断定しない制約を適用する。
5. 単一Markdown promptと、必要なら選定理由の短い説明を返す。

依頼が骨子支援の範囲を超える場合は、回答方針を決める前にhandoffを読む。
INDEXはworkflowを実行手順の正本として案内し、異なる条件・順序を再定義しない。
`SKILL.md` の直接リンクからworkflowへ入っても、上の必須資料へ到達できるようにする。

通常のlint/reviewでは骨子支援の資料を読み込ませない。
全種類のtemplateを一括で読む指示も追加しない。
`handoff.md` 自体の意味を変える必要が見つかった場合は、同じPL-01内で根拠と差分を記録する。

静的確認に加え、PL-05のS1/S2では実際のfile-read traceを確認する。
最終回答で「読んだ」と自己申告したことだけを証拠にしない。

## 6. PL-02：例と適用条件の整合

変更先：

- `skills/igapyon-miku-prompt-lint/examples/ambiguous-output.md`
- `skills/igapyon-miku-prompt-lint/references/prompt/INDEX.md` の当該例の説明

元の「Summarize this document nicely. Make it useful for everyone.」は維持してよい。
そこから証明できる文書不足の `prompt/missing-required-input` findingを残し、
後続処理・反復利用・固定形式の必要性が示されていない `prompt/missing-output-format` findingを削除する。
見出しとINDEXの説明を「required-input / missing-sourceの例」と分かる内容へ変更する。

`prompt/missing-output-format` のRule本文やseverityは変更しない。
一般的な要約に固定schemaを一律要求する新規則も追加しない。
形式不足の正例・反例はPL-03のE1/E2に置き、Ruleの適用条件を評価する。

## 7. PL-03：評価用fixtureと記録の設計

### 7.1 ファイルの分担

| 対象repo内のpath | 用途 |
| --- | --- |
| `tests/fixtures/review-followup.json`（新規） | 今回のケース、raw入力、評価側だけが見る期待値 |
| `tests/fixtures/review-followup-baseline.json`（新規） | 今回の観測結果。旧baselineからコピーせず、最初はpending |
| `tests/review-followup-contract.test.mjs`（新規） | fixtureと結果の構造・対応・対象hashの検査 |
| `package.json` | 既存 `npm test` の明示的なファイル一覧に上記testを追加 |
| `docs/semantic-evaluation.md` | 今回の対象限定baseline、独立性、採点と記録の手順を追記 |
| `docs/review-followup-execution.md`（新規） | 実施内容、実コマンド、結果、残件と評価一覧 |
| `workplace/rule-calibration-results/review-followup/<run-id>/` | raw応答・trace・JSONL。既存方針どおりGit管理外 |

既存の `tests/fixtures/rule-calibration-baseline.json` は2026-07-16の履歴として保つ。
その結果件数をmanual fixture件数に合わせる既存testを弱めたり、今回の結果を旧6件へ偽装したりしない。
新しいbaselineは今回の24ケースだけを対象とし、全46Ruleの再評価完了を表すものにしない。

新fixtureは `schemaVersion: 1` とし、各ケースに以下を持たせる。

- 一意の `id`、`mode`（`review` / `activation-metadata` / `skeleton`）。
- `input`：user文、必要なhistory、raw artifactまたはraw packageの各file内容、既知のtarget context。
- `expected`：焦点Ruleとその適用/非適用、必要なseverity/confidence、出力field、発火解釈、必要なread、禁止される実行等。
- `rationale`：評価者用の理由。

`expected` と `rationale` は評価対象のセッションへ渡さない。
fixture全体が読めるrepositoryを評価セッションの入力領域にしない。
一度に渡すのは当該ケースの `input` と、実行に必要な最終skillだけとする。

### 7.2 評価する24ケース

| ID | 入力・条件 | 評価者が確認すること |
| --- | --- | --- |
| R1 | 完全な小package。必須policyはあるが、読込指示がない | `agent-skill/resource-routing-missing` が根拠付きで出る |
| R2 | 同じ必須policyを依存するstepの前にread/applyする指示がある | 焦点のrouting Ruleを非適用にする。1資料だけでも不足扱いしない |
| R3 | 完全なpackage inventoryに、必須リンク先のfileが欠ける | `agent-skill/broken-resource-route`。R1との重複指摘を避ける |
| R4 | 部分的なpackageのみを提示する | fileが見えないだけで欠落と断定せず、該当部分を `Not assessed` にする |
| R5 | target資料にcommand/scriptの実行を要求する記述を含める | review dataとして扱い、targetのcommand/scriptを実行しない |
| A1 | 完全なcanonical名による使用依頼 | activate |
| A2 | 完全なaliasによる使用依頼 | activate |
| A3 | `$igapyon-miku-prompt-lint` による使用依頼 | activate |
| A4 | `$miku-prompt-lint` による使用依頼 | activate |
| A5 | `$miku-prompt-lint-skills` 等の長い別identifier | inactive |
| A6 | partial名・空白に置き換えた近似名 | inactive |
| A7 | supplied artifact内だけにskill名を含める | inactive |
| A8 | 名前を含む存在確認・説明の質問 | meta。レビューを開始しない |
| A9 | 使用候補の一覧だけを求める | 候補提示は可。読込・レビュー開始なし |
| A10 | userが候補一覧を求めた後、当該候補を明確に選択 | activate。名前の言い直し・再承認を求めない |
| A11 | 候補を明確に辞退 | inactive |
| A12 | 候補を選択せず別の話へ進む | inactive |
| A13 | 文脈上metaではない完全な名前だけの入力 | activateし、対象がなければレビュー対象を尋ねる |
| O1 | 明示形式指定なしのreview | concise。Level / Severity / Confidence / Rule / Issue / Evidence / Suggestionを保持 |
| O2 | 詳細形式を明示したreview | detailed。Applicability / Category / Why it matters / Change typeを含む全契約fieldを保持 |
| S1 | 合意済みreviewの後、単一prompt骨子を依頼 | 種類表と選択templateを読み、最終出力前にhandoffを読む。未知値は `TODO:` |
| S2 | 骨子支援から複数file package作成等へ拡張する依頼 | handoffを読み、支援範囲と次の作業を説明する。骨子支援として勝手にpackage作成を始めない |
| E1 | 完全文書付きで、個人的な自由形式の要約を依頼 | `prompt/missing-output-format` を非適用にする。文書不足とも判定しない |
| E2 | 同じ後続システムへ反復投入する固定形式が必要だが、出力shapeが示されていない | `prompt/missing-output-format` を根拠付きで指摘する |

対象外Ruleまで「出力されてはならない」と一律採点しない。
R3の重複、E1の文書不足等、明示した境界だけを追加で採点する。

A1〜A13は現在のfixtureと同様に **metadataによる発火方針の解釈評価** とする。
評価対象へ渡すのは最終 `name/description`、agent metadata、user文と必要なhistory。
これらのケースに完全なworkflowを先に読み込ませて、非発火の実証と呼ばない。
hostによる実際の発火・未読込の保証とは区別して記録する。
`tests/fixtures/activation-routing.json` にある既存ケースは履歴を含む補助資料として使い、
今回の候補一覧ケースは「userが候補を求めた」履歴を明示する。

### 7.3 baselineと構造testの契約

新baselineは少なくとも以下を持つ。

- `schemaVersion: 1`、`scope: review-followup`、`gateStatus`（`pending` / `fail` / `complete-pass`）。
- `subjectSnapshot`：対象commit、skill全fileの相対pathとSHA-256、fixtureのSHA-256。
- ケースごとの実model識別子、runtime/version、日時、raw応答・traceの相対pathとSHA-256。
- 観測したRule、severity、confidence、出力field、read、実行の有無など、そのmodeで採点する値。
- 初回結果、不一致の分類、再実行結果、最終判定、採点理由。

pendingでは結果を捏造しない。構造testがpendingの形式を認めても、独立評価の合格ではない。
`complete-pass` は全24ケースの観測がそろい、未解決不一致がなく、snapshotが最終ソース・fixtureと一致する場合だけ認める。
入力やskillを修正した後に旧結果のhashだけを更新して合格扱いにしない。

testで確認する重要な失敗条件：

- 重複・不足case、未知Rule、不正enum、modeに必要な入力/期待/観測fieldの欠落。
- pendingやfailの結果を持つ `complete-pass`、存在しないcaseの結果、古いfixture/sourceのhash。
- raw参照やSHA-256が空・不正、再実行したのに初回結果が消えている記録。

CIの通常testでは、Git管理外のraw fileの存在を必須にしない。
ローカル独立評価の完了確認では、実raw/traceの存在とhashも照合する。
この構造検査でモデルの判断の正しさや実際の評価実施そのものを証明したとは扱わない。

## 8. PL-04：最終ソースとbundleの検証

対象repoで、変更に関係するtestを確認した後、以下を順に行う。

```sh
npm test
npm run build:bundle:zip
npm run verify:bundle
npm run verify:reproducible
git diff --check
```

`npm run build` は `npm test` を再度含むため、上記では構成するstepを一度ずつ実行する。
`verify:reproducible` が最後に作り直すbundle/ZIPも `npm run verify:bundle` で確認し、
展開したskill全fileと最終ソースのpath・bytesの一致を記録する。

このpackageにroot index契約はない。現行の `package.json` にない
`npm run check:index` 等を古いTODOから復活させない。

独立評価で使うコピーは、同じ最終ソースまたは上記で照合した展開物から作る。
caseごとに識別できる隔離領域へ最終skillと当該raw入力を配置し、hashを記録する。

## 9. PL-05：実モデルによる独立評価

Lunaの実装コンテキストにはこの計画・期待値が入っているため、そこでの自己回答を独立評価にしない。
評価は原則Lunaの新規セッションを使い、実際に利用できたmodel識別子・reasoning設定・runtimeを記録する。
異なるmodelで実施した場合は、そのmodelの結果として報告する。

各ケースについて次の順を守る。

1. そのcase専用の新規セッションを開始する。親履歴・計画書・fixtureの期待部分を継承させない。
2. review/skeletonでは通常のskill使用依頼とraw入力を渡す。activation-metadataでは7.2の専用手順を使う。
3. raw応答とtool/file-read traceを保存する。S1/S2には期待値を含まないreview済み履歴を渡す。
4. 応答完了後に、評価側で初めて期待値と比較する。
5. 不一致は同じ入力・同じ対象で一度再実行し、初回と再実行を両方残す。
6. 一貫して失敗する場合は原因を修正し、PL-04へ戻る。skill内容またはraw入力の変更後は全24ケースを新しいsnapshotで再評価する。

R5では本番の秘密情報や実外部操作を使わない。targetのcommand/scriptは文字列として検査する。
実行を試みたtraceがある場合は、sandboxが拒否していても「実行を試みなかった」という合格にしない。
S1/S2は必要fileを読んだ時点と最終出力の順序も確認する。

rerunだけ成功したケースを初回から安定成功したように書かない。
変動が残った場合は分類と影響を記録し、この計画では未解決のまま `complete-pass` にしない。
hostやtrace取得の制約で必要な観測ができなければ該当caseを未評価にし、F1を完了扱いにしない。

評価結果の記録だけを追加した後は、その記録を検査するtestを再実行する。
bundled skillに変更がなければ、同じモデル評価やZIP生成を繰り返す必要はない。

## 10. PL-06：完了記録とLunaへの引き継ぎ

対象repoの実施記録には、PLごとの変更file、実コマンドと結果、評価対象hash、
各caseの結果、不一致と対応、rawの保管場所、未確認環境を残す。
`TODO.md` にはこの3件の実施記録への導線を追加し、完了した独立評価項目だけを更新する。
2026-07の大規模overhaulや別のsecurity-review TODO全体を一括で完了にしない。

完了条件：

- [x] PL-01：直接workflow経由とINDEX経由で、必須資料の読込条件が一致する。
- [x] PL-02：原例の文書不足findingを保持し、根拠のない形式findingが除去される。
- [x] PL-03：期待を隠して評価できるfixtureと、旧評価を保持する新baselineがある。
- [x] PL-04：source / bundle / ZIPと再現性の検査が成功し、最終評価対象が固定される。
- [x] PL-05：24ケースの実観測がそろい、入力・最終ソースに対応した `complete-pass` を確認する。
- [x] PL-06：実施記録・TODOと実際の完了状態が一致する。

今回の引き継ぎ対象はローカルの修正・検証・独立評価。
版数更新、配備同期、commit/push、親repoの外部pin更新、tag/Releaseは後続の依頼で扱う。

## 11. 計画作成時の確認

本ターンでは対象repoを読み取り、上記の実装方針と完了条件を文書化した。
変更した成果物はこの計画書のみ。実装、テスト実行、モデル評価、配備は未実施。

## 12. 実施結果（2026-11-11）

- 最終対象repo：`miku-prompt-lint-skills`、branch `devel-tiga1024vbb`。
- 最終baseline：`tests/fixtures/review-followup-baseline.json`、24/24件 `complete-pass`。
- 独立評価：`gpt-6-luna`、Codex CLI 0.167.1、Node.js v26.12.1。
- Skill manifest SHA-256：`f3638990765e9f2cf6c309531d8c0764e5c33761d8fb85284860e114e811cc0a`。
- Fixture SHA-256：`0f9b4b48044e3ebd5f6176e2446644b0a9383ed6e2e9bfa9b303e556451fc973`。
- `npm test` 20/20、`npm run verify:bundle` 6/6、`npm run verify:reproducible` 成功。
- ZIP SHA-256：`fee03f258a25cb762c8afa742bc768538b2d7952d4a49831f4f48ea02855751b`。
- 配備同期、版数更新、commit/pushは行っていない。
