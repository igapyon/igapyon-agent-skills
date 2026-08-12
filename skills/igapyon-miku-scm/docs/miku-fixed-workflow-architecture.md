# Miku Fixed Workflow Architecture

## 位置づけ

**Miku Fixed Workflow Architecture（MFWA）**は、`igapyon-miku-scm`で
実践したPrompt–Runner Pairingによる生成AI関与削減設計の正式名称である。
この文書は、その設計をほかのAgent SkillやCLI workflowにも再利用できる
方式として記録する設計ノートである。
個々のworkflowの規範的な仕様は`references/`、実行契約はworkflow
manifestとcontract lockを正本とする。

この方式の主眼は、生成AIがshell commandを組み立てる処理だけでなく、
実行後に結果を再解釈・再要約し、次の操作を判断する処理も極力減らす
ことにある。

## 正式用語

| 用語 | 定義 |
| --- | --- |
| Miku Fixed Workflow Architecture | thin Prompt Router、normative Markdown、固定実行、契約検証、承認境界を含む全体設計 |
| Miku Fixed Workflow | manifestで識別される個別の固定workflow |
| Miku Fixed Runner | workflowの機械的処理を実行するshell-freeなMJS実装 |
| Miku Workflow Contract | normative MarkdownとRunnerのversioned実行契約 |
| Miku Workflow Contract Bundle | normative Markdown、Runner、contract test、generated lockの一式 |
| Miku Approval Handoff | reviewed artifact、digest、固定apply引数をsealedする承認連携 |

`Fixed Runner Design`はMiku Fixed Runner単体の設計を説明する一般語として
使用し、Markdown、contract test、lock、handoffまで含む全体にはMFWAを使う。

## 解決したい問題

Agent Skillの手順をMarkdownだけで記述すると、生成AIが実行のたびに
次の仕事を繰り返しやすい。

- 詳細な手順を読み、command列を組み立てる
- subprocessやnetworkの途中結果を解釈して次のcommandを選ぶ
- structured resultを人間向けに再作文する
- preflightで確認したapply引数を承認後に組み直す
- safe stop、環境failure、mutation後の不確実性を自然言語だけで分類する

この構造では、同じ依頼でもtool call、context、表現、失敗経路が
揺れやすい。特に実行後の再解釈は、処理自体が成功していても新しい
誤解や不要な次操作を生む余地になる。

## パターンの全体像

```text
利用者の依頼
    |
    v
薄いPrompt Router
    |  workflow ID + 固定option
    v
versioned manifest
    |
    v
Miku Fixed Runner
    |  snapshot / validation / mutation / verification
    v
structured result + stable human_output
    |
    v
生成AIはhuman_outputを変更せず返す
```

人間の承認が必要なmutationは、次の独立した境界を持つ。

```text
preflight Miku Fixed Runner
    |
    v
immutable handoff + digest
    |
    |  チャット上の明示承認
    v
apply Miku Fixed Runner
    |
    v
postcondition + stable human_output
```

## 構成要素

### 1. Promptを薄いrouterにする

Promptの役割を次に限定する。

- 利用者の依頼を固定workflow IDへ分類する
- manifestで許可された最小parameterを選ぶ
- mechanical workflowが返した`human_output`を意味変更せず返す
- writingが必要な場合だけ、構造化evidenceから一度作文する

Promptはrunner内部のGit・GitHub command列を判断しない。通常実行では
詳細なMarkdownを読み直さず、設計、保守、例外復旧時だけ参照する。

### 2. Promptと`.mjs`をversioned contractで対応づける

workflow manifestは少なくとも次を固定する。

- workflow ID
- trigger
- required parameter
- mutation level
- approval gate
- runner entry
- normative specification
- contract test
- contract version

runner、normative specification、両者の組み合わせにはSHA-256を持たせる。
preflightとapplyの間でcontract versionまたはpair digestが変化した場合、
mutation前に停止して新しいpreflightを要求する。

hashは既知の組み合わせを特定するために使い、意味上の正しさはcontract
testで検証する。hashだけを安全性の証明にしない。

### 3. 機械的処理をMiku Fixed Runnerへ集約する

Miku Fixed Runnerが一つのworkflow内で次を完結させる。

- repositoryと対象の解決
- local・remote snapshot取得
- preconditionとapproval boundaryの検証
- planとdigestの生成
- 許可された固定argument arrayによる実行
- conflict検出とpostcondition検証
- attempt recordとerror classification
- versioned structured resultの生成

Miku Fixed Runnerはfree-form shell、任意command fragment、任意実行ファイル名を
入力として受け付けない。AI Agentは`gh`などの外部CLIを直接呼ばず、
固定helper内部だけで利用する。

### 4. 実行後の人間向け出力もrunnerが生成する

structured resultを正本とし、同じresultから安定した`human_output`を
決定論的に生成する。

`human_output`は少なくとも次を区別する。

- success
- ready for approval
- not applied
- conflict
- unresolved
- failure

生成AIは成功結果を独自に要約したり、補足説明を加えたりしない。
これにより、実行後の生成AI関与、表現の揺れ、事実の付加、次操作の
推測を減らせる。

この契約は「意味を保った要約」ではなく、runnerが返した
`human_output`の逐語的な返却を要求する。表示に必要な項目が不足した
場合、Agentが`result.json`を読んで補完せず、runnerとsnapshot testを
修正する。固定表現は英語とし、Issue titleなど入力由来の日本語データ
は翻訳せず保持する。

### 5. 承認後のapply引数を生成AIに再構成させない

preflightはapplyに必要な完全な引数と確認済みdigestをimmutableな
handoff artifactへ保存する。handoffには次を含める。

- preflightとapplyのworkflow ID
- repositoryと対象
- fixed apply arguments
- reviewed snapshot、draft、planのdigest
- workflow contract pair digest
- pending、applied、unresolvedなどの状態

利用者がチャットで承認した後、Agentはpending handoffがちょうど1件
存在することだけを固定workflowで確認する。handoff ID、apply workflow、
apply引数を生成AIが選び直さない。pendingが0件または複数件なら安全に
停止する。

### 6. Mechanical modeとWriting modeを分離する

状態取得、検証、計画、mutation、postcondition、結果表示はMechanical
modeとする。

Issue、PR、Release、Aboutなど、人間向け表現が必要な部分だけをWriting
modeとする。Writing modeでも、commit、diff stat、変更ファイル、
Issue候補、既存label、保存先などの証拠収集は固定runnerへ集約する。
生成AIは構造化evidenceと利用者の意図から原則一度だけ作文する。

作文後の登録、更新、label変更、close、publishは再びMechanical modeへ
引き渡す。作文したこと自体をremote mutationの承認として扱わない。

## 生成AIの責務境界

| 段階 | 生成AIが担当すること | `.mjs`が担当すること |
| --- | --- | --- |
| 実行前 | 依頼をworkflow IDへ分類する | option検証、対象解決、snapshot取得 |
| 実行中 | 原則なし | plan、実行、安全確認、postcondition |
| 実行後 | `human_output`を変更せず返す | result分類、人間向け固定出力 |
| 承認後 | 固定apply workflowを起動する | handoff解決、引数復元、再検証、apply |
| Writing | evidenceから一度作文する | evidence収集、完全性・切り詰め情報 |

## Failure設計

failure resultには、少なくとも次を構造化して記録する。

- workflow
- phase
- command ID
- classification
- mutation実行有無
- retryability
- stable signature

pre-mutation failureはmutation未実行として扱う。mutation後の成否が
確定できない`unresolved`は自動再試行しない。同じsignatureを集計可能に
し、恒常的なenvironment failureと実装不具合を区別する。

## 効果

この方式により、次の効果が得られた。

- 通常実行時に読むprompt・referenceを縮小できる
- workflow内部のtool callとcommand選択を固定runnerへ集約できる
- 実行結果の再解釈・再作文を除去できる
- 承認後のapply引数再構成を除去できる
- 同じresultに対して同じ人間向け表示を返せる
- approval、digest、conflict検出、attempt recordを維持したまま高速化できる
- error経路を再現・集計・contract testしやすくなる

生成AI関与の削減は、安全確認の省略ではない。生成AIが都度判断していた
安全処理を、追跡・test済みの決定論的実装へ移した結果である。

## 導入チェックリスト

- workflow IDと固定optionがmanifest化されている
- promptがrunner内部のcommand列を生成しない
- runner、normative specification、contract testが対応づけられている
- pair digestとcontract versionがresultまたはplanへ保存される
- structured resultにmutation実行有無とretryabilityがある
- `human_output`がsnapshot testで固定されている
- `human_output`だけで利用者への報告が完結し、Agent補完を必要としない
- 固定出力は英語で、入力由来の日本語データは変更されない
- preflightとapplyが分離されている
- applyが確認済みartifactとdigestをそのまま消費する
- 承認後に生成AIがapply引数を組み直さない
- multiple pending handoffを自動選択しない
- post-mutation unresolvedを自動再試行しない
- writing evidence収集と公開文面の作文が分離されている
- AI tool call、runner invocation、context bytes、result bytesを計測できる
- mechanical、writing、approvalを同じ指標で比較できる

## 避けるべき実装

- Promptへすべての詳細手順を埋め込む
- runnerにfree-form shellや任意command pass-throughを許す
- JSON resultを毎回生成AIに要約させる
- preflight結果を承認後に自然言語から復元する
- cacheだけを根拠にmutation直前のexact revalidationを省略する
- 性能のためにapproval、digest、attempt record、postconditionを弱める
- writingとremote mutationを一つの承認として扱う

## miku-scmでの対応

この方式の基盤はIssue #293と#295で整備され、stable `human_output`、
Mechanical modeとWriting modeの分離、チャット承認handoffはIssue #308で
発展した。現在の実装では、workflow manifest、deterministic runner、
workflow contract lock、human output renderer、writing prepare、approval
handoffがMFWAを構成している。
