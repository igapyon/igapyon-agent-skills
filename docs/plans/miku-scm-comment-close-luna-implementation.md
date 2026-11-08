---
title: miku-scm コメント後クローズのLuna向け修正計画
description: "Issueバッチが自分で投稿したコメントの後に誤って衝突停止する問題を、共通snapshotと実helper接続テストで修正する手順。"
category: plan
status: complete
created: 2026-11-03
updated: 2026-11-03
---

# miku-scm コメント後クローズの修正計画

実装・検証結果：[実施記録](miku-scm-comment-close-execution.md)

## 1. 依頼・到達点・対象範囲

利用者の依頼は、コメント投稿後のIssueクローズが誤って停止する問題について、Lunaが実装できる具体的な修正計画を作ること。本書作成時点では製品コードを修正していない。

実装時の到達点は、3件のIssueに対する「コメント→クローズ」の6操作を、完全レビューと一度の `approve` に結び付け、承認した順番で一括完了できること。自分のコメントによる既知の変化だけを後続操作へ引き継ぐ。外部変更・不完全な証跡・不明な投稿結果では従来どおり停止する。

- 正本: `/Users/igapyon/Documents/git/igapyon-agent-skills` の `skills/igapyon-miku-scm/`。
- 調査時branch: `devel-tiga1103uef`。HEAD: `4220875712825f6fa9d810c608cacabf577df32c`。
- 計画作成前の作業ツリーはclean。本書とTODOの追加を実装時に保持する。
- 再開時は実際のbranch/HEAD/diffを優先し、上記branchへの強制checkout/resetはしない。
- 今回修正するのはsnapshotの受け渡し、停止理由の診断、回帰テスト、関連契約・説明。
- 新しいCLI、GitHubコマンド、コメント付きcloseの単一mutation、承認省略機能は追加しない。既存の `github.issue.handoff.batch.apply` を使う。
- 実Issue #318・#400・#405は今回の運用ですでにコメント・クローズ済み。テストで再投稿・再オープン等を行わない。
- 実装依頼で進める範囲はsource修正とローカル検証。バージョンincrement、commit/push、配備先 `~/.codex/skills/` の更新、実GitHubへの書き込みは別の明示依頼で扱う。

## 2. 確認済みの原因

### 2.1 項目名の不整合

`scripts/github-issue-close.mjs` の `runIssueClose()` は、preflight成功時に `issue_title` を返す。`current_title` は返していない。

一方、`scripts/miku-scm-handoff.mjs` の `assertDependencySnapshot()` は、再preflightの返却値を直接読み、`observed.current_title !== expected.title` を判定している。実際にはタイトルが変わっていなくても、`undefined !== タイトル` となって `conflict` になる。

他の操作にも同じ種類の表記差がある。

| preflight | 現在タイトル | 現在状態 |
| --- | --- | --- |
| update | `current_title` | `current_state` |
| comment | `current_title`（`issue_title`もある） | `issue_state` |
| label | `current_title`（`issue_title`もある） | `issue_state` |
| close | `issue_title` | `current_state` |

`scripts/miku-scm-issue-approval.mjs` の `normalizeIssueReview()` は、すでにこの差を吸収して `context.issue_snapshot` を作っている。バッチ比較だけが同じ正規化を使っていない。

### 2.2 実行記録との照合

2026-11-03の実行で次を確認した。

- バッチrun: `20261103115449073-45a45383-4191-44b8-b85b-0618306332e2`。
- コメント投稿は成功し、続くcloseは `mutation_invoked: false` で停止。
- バッチが内部で実行したclose preflight run: `20261103115452605-c4e237f4-ef23-4b20-8734-e7ec4daf3a7c`。
- このpreflightの `issue_title`、本文、状態、labelsはレビュー済みsnapshotと一致。
- コメント集合は、元の集合に承認済みコメントの正確なURL・本文を追加したものと一致。
- `current_title` だけが存在せず、誤って「タイトル・本文・状態・labelsが変わった」と報告された。

記録はローカルの `workplace/miku-scm/runs/<run-id>/result.json` にある。他環境でこれらがなくても実装できるよう、回帰テストは架空Issueのfixtureで再現する。実記録をテスト依存へ持ち込まない。

### 2.3 テストと診断の不足

- `tests/miku-scm-handoff.test.mjs` の既存同一Issueバッチテストは、close用mockへ実helperにない `current_title` を補っている。fixture作成補助もcomment/closeに両方の別名を入れており、実際の境界を検証できていない。
- `assertDependencySnapshot()` が投げる既分類エラーは、`refreshSelectedIssueHandoff()` のcatchでそのまま再throwされる。この経路では取得済みの `refreshResult.run_id` が付かず、停止記録の `preflight_run_id` がnullになる。
- エラー文言が4項目をひとまとめにするため、項目欠落と実データの変更を区別できない。

## 3. 採用する修正仕様

### 3.1 内部snapshotの共通化

`miku-scm-issue-approval.mjs` に **`normalizeIssuePreflightSnapshot(result)`** をexportする。既存 `normalizeIssueReview()` 内のsnapshot構築を抽出し、同じ関数をバッチの再preflight比較にも使う。

返すshapeと選択規則を次に固定する。

```js
{
  title: result.current_title ?? result.issue_title ?? null,
  body: result.current_body ?? null,
  state: result.current_state ?? result.issue_state ?? null,
  labels: Array.isArray(result.current_labels) ? [...result.current_labels] : null,
  updated_at: result.current_updated_at ?? null,
  comments: Array.isArray(result.current_comments)
    ? normalizeIssueComments(result.current_comments)
    : null,
}
```

- `normalizeIssueReview()` はcreateの場合の `issue_snapshot: null` を維持し、それ以外で新関数を呼ぶ。
- 正しい既存入力から作るreview/snapshotの値とproperty順を維持する。handoff/reviewのschema名は変更しない。
- helperの公開JSONに別名を追加・削除しない。closeへ `current_title` を足すだけの局所対応にしない。
- `title` や `proposed_title` を現在タイトルのfallbackにしない。それらはupdateの提案値の場合がある。
- 欠落した項目をbaselineや空配列から補完しない。欠落と「取得済みで0件」を区別する。
- labelsの配列順や本文・コメントの空白/LFを新たに変換しない。

### 3.2 バッチの比較規則

`assertDependencySnapshot()` で、observedを上記関数の返却値へ置き換える。比較にはrawな `current_*` / `issue_*` を使わず、`title / body / state / labels / comments` を使う。

比較前にbaselineとobservedの必要項目を検査する。内部の小さな検査関数でよく、exportは不要。

- title: 空でないstring。
- body: string。**空本文 `""` も有効**。
- state: `OPEN` または `CLOSED`。
- labels: string配列。空配列は有効。
- comments: 配列。各コメントのURL・本文は既存normalizerの検査を通ること。空配列は有効。
- updated_at: 空でないstring。

必要項目の欠落・不正値では `conflict` とし、どちらのsnapshotの何の項目が不完全かをdetailへ書く。本文の値や機密情報はdetailへコピーしない。

既存のexpectedの組み立ては維持する。

1. レビュー済みbaselineを開始値にする。
2. 同じIssueで成功・検証済みの先行update/label/commentの効果だけを加える。
3. commentはreceiptのstatus、comment URL/ID、承認本文のSHA-256を照合してから加える。
4. metadataと、URL・本文で比較したコメント集合を照合する。
5. 既存 `refreshableExpectations()` のallowlistで許可したdigest/timestampだけを再preflightの値へ更新する。
6. repository/Issue番号、理由、draft、操作内容、適用契約等の変更は引き続き拒否する。

`updated_at` は自分の投稿でも変わるためbaselineとの単純一致条件に加えない。完全なsnapshot・検証済み効果・既存allowlistによる判定を維持する。`up-to-date` の既存経路も維持する。

### 3.3 停止理由とrun ID

既存の `dependency_refresh.detail` と `dependency_refresh.preflight_run_id` を使い、JSON項目やhuman output schemaは追加しない。

- 不完全なobserved例: `Dependency preflight Issue snapshot is incomplete: title`。
- 本当に変わった例: `Issue fields changed outside the approved sequence: title, labels`。
- 比較するfield順を `title, body, state, labels` に固定し、違うfieldだけを列挙する。
- コメント集合の不一致・receipt不完全は、従来の個別メッセージで区別する。
- `refreshSelectedIssueHandoff()` のcatchで、`error.handoffStatus` が付いているエラーにも、未設定の `preflightRunId` を `refreshResult.run_id` から補って再throwする。
- `recordDependencyRefreshStop()` がそのIDを既存auditへ保存することを確認する。
- `partial/conflict/not-applied/unresolved` の分類や、投稿済みコメントを自動再投稿しない規則は変更しない。

## 4. 変更するファイル

以下は `skills/igapyon-miku-scm/` からの相対path。

| ファイル | 作業 |
| --- | --- |
| `scripts/miku-scm-issue-approval.mjs` | 共通snapshot関数の抽出、reviewから利用 |
| `scripts/miku-scm-handoff.mjs` | 共通snapshotで比較、完全性検査、差分項目とrun IDの診断 |
| `tests/miku-scm-issue-approval.test.mjs` | 4操作の実際の項目名、空本文、欠落の表現、reviewとの一致 |
| `tests/miku-scm-handoff.test.mjs` | mockを実shapeに修正、外部変更・証跡不完全・診断・既存resumeの回帰 |
| **新規** `tests/miku-scm-handoff-comment-close.test.mjs` | 実comment/close helperからhandoffバッチまでの結合テスト |
| `scripts/miku-scm-workflow-manifest.mjs` | batch.applyだけcontract version 2→3 |
| `tests/miku-scm-workflow-manifest.test.mjs` | batch.applyの期待versionを更新 |
| `references/approval-handoff.md` | 一回の承認でcomment→close、既知の効果だけを引き継ぐ規則と診断を補足 |
| `scripts/miku-scm-workflow-contract-lock.mjs` | generatorで更新 |
| `references/workflow-contracts.md` | generatorで更新 |

`github-issue-close.mjs` / comment/update/label helperの返却JSONや固定GitHub command surfaceは変更不要。新テストからその実関数をimportする。

## 5. Lunaが実行する順序

### LUNA-00: 開始確認と記録

1. `DEVELOPMENT.md`、root `TODO.md` 冒頭、`DECISIONS.md` の2026-10-23のIssue承認決定、適用される `AGENTS.md` を読む。古いGOAL/HANDOFFのbranchへ戻らない。
2. `git status -sb`、`git rev-parse HEAD`、`git diff --stat`、`git diff --cached --stat` を確認する。既存の計画書・TODO差分と無関係な作業を保持する。
3. `node --version` を記録する。production dependenciesを追加しない。
4. 本書と同じdirectoryへ `miku-scm-comment-close-execution.md` を作り、開始状態と各段階の変更・コマンド・結果・残件を記録する。
5. 変更前baselineとして次を一度実行する。失敗があれば変更前の失敗として記録する。

```sh
node --test skills/igapyon-miku-scm/tests/miku-scm-issue-approval.test.mjs skills/igapyon-miku-scm/tests/miku-scm-handoff.test.mjs
```

### LUNA-01: 実helperを使って失敗を固定する

新テストファイルに、まず単一Issueの正常なcomment→closeを実装し、修正前に失敗することを確認する。テストのためにproduction側へ項目を追加しない。

テストは一時directoryと架空の `igapyon/example` のIssue #42を使う。既存 `github-issue-comment.test.mjs` / `github-issue-close.test.mjs` のfixtureを参考にする。

接続する実関数:

```text
github-issue-comment.mjs: parseArgs（parseCommentArgsにalias）, runIssueComment
github-issue-close.mjs:   parseArgs（parseCloseArgsにalias）, runIssueClose
miku-scm-handoff.mjs:     createIssueApprovalHandoff, reviewIssueApprovalHandoffs,
                         applyPendingIssueHandoffBatch
miku-scm-workflow-contract-lock.mjs: workflowContractById
```

harnessの固定手順:

1. コメントdraftを一時rootの `workplace/miku-scm/issue-comments/issue-42-comment-202611030000.md` に保存する。本文は日本語を含むLF終端の固定stringにする。
2. statefulなIssueオブジェクトを用意し、`readIssue` から毎回deep cloneを返す。開始はOPEN・comments 0件とする。
3. **実 `runIssueComment()` と実 `runIssueClose()` のpreflight返却値を加工せず**、それぞれの `createIssueApprovalHandoff()` の `reviewedResult` と `applyArguments` に渡す。返却値へ `current_title` 等を補わない。
4. `reviewIssueApprovalHandoffs()` で2件の順序付きbindingを作り、そのdigestと `approvalCommand: "approve"` でbatch APIを呼ぶ。
5. `runPreflight` のclose経路は、渡されたargsを実 `parseCloseArgs()` でparseし、実 `runIssueClose()` を呼ぶ。返却値は実runnerと同じ `{status: "success", run_id, mutation_invoked: false, result: helperResult}` に包むだけにする。
6. `runApply` はworkflow IDをswitchし、実parser・実 `runIssueComment()` / `runIssueClose()` へ渡す。返却は `{status, run_id, mutation_invoked, result: helperResult}` とする。helperの `commented/closed/up-to-date` だけをenvelopeのsuccessへ対応付け、`conflict/not-applied/unresolved` はその分類を保持する。未知のstatusはテスト失敗にする。`mutation_invoked` は呼び出し前後のmutationログ件数差から求め、成功statusだけで推測しない。resultの項目を補わない。
7. 外部I/Oだけを注入する。`ghMutation` は固定argvを検査し、コメントは `--body-file` の実際の一時ファイル内容を同期readしてstateへ追加する。正確なcomment URLを返し、updatedAtを進める。closeではstateをCLOSED・stateReasonをCOMPLETEDへ更新する。
8. `readComment` は実際にstateへ保存した `{id, url, body}` を返し、実helperの投稿検証とreceipt生成を通す。`sleep` はfixture内のno-opとし、実時間待ちをしない。
9. 未対応workflow/argvや予期しないGitHub read経路ではassertionで失敗させる。実gh/API/networkへfallbackさせない。
10. helperが作るattempt・handoff・receiptは一時rootにだけ保存する。rootとfixturesは `t.after()` で片付ける。

修正前の期待: コメント1回成功後にバッチがpartial-conflictで止まり、テストの「全件applied」というassertionが失敗する。現在の実helper返却値に `issue_title` があり `current_title` がないことも確認する。

```sh
node --test skills/igapyon-miku-scm/tests/miku-scm-handoff-comment-close.test.mjs
```

### LUNA-02: 共通snapshotとバッチ比較を実装

1. 3.1の関数を抽出し、`normalizeIssueReview()` とhandoffへ接続する。
2. 3.2の完全性検査と、正規化済みobservedの比較を実装する。
3. `miku-scm-issue-approval.test.mjs` に4操作の表をそのままケース化する。close fixtureには `current_title`、comment/label fixtureには `current_state` を入れない。
4. 欠落はnull、空本文・空labels・空commentsは有効、入力配列を変更しないこと、reviewのsnapshotが共通関数と一致することを確認する。
5. `miku-scm-handoff.test.mjs` の `createExistingIssuePending()` を操作別shapeに直す。既存成功テストの再preflight mockもcloseの実shapeに直す。すべての別名を一つのmockへ同時に足す方法は禁止する。
6. LUNA-01のテストがappliedとなり、commentとcloseがそれぞれ1回だけであることを確認する。

### LUNA-03: 診断と停止条件を検証

3.3の診断を実装し、以下をparameterized testまたは既存テストの拡張で確認する。同じ分岐を形式的に繰り返すテストは増やさず、異なる境界を検証する。

| ケース | 必須の結果 |
| --- | --- |
| closeが `issue_title` のみ | 自分のコメント後も正常close |
| comment/labelが `issue_state` のみ | snapshotのstateは正しくOPENになる |
| 現在タイトルが両方のfieldから欠落 | title不足を示して停止。baselineから補完しない |
| 本文が空string、labels/commentsが空配列 | 不完全扱いしない |
| 自分のコメント以外にtitle/body/state/labelsが変化 | 変化field名を示しclose 0回、投稿済みcomment 1回を保持 |
| 予定外コメントの追加・編集・削除 | comments衝突でclose 0回 |
| 先行commentの正確なreceiptがない | close 0回。URL/本文検査を省略しない |
| 再preflightのコメント証跡不完全 | close 0回。0件へ補完しない |
| snapshot比較中に停止 | `dependency_refresh.preflight_run_id` が注入したrun IDと一致 |
| 既知のpreflight読取失敗後の明示resume | 既存resumeテストが成功し、成功済みcommentを再投稿しない |
| comment結果がunresolved | 後続を実行せず、既存の自動再送禁止を維持 |
| close再preflightがup-to-date | 確認済みno-opとして既存どおり処理し、再closeしない |

### LUNA-04: 3件・6操作の結合確認

LUNA-01のharnessをIssue番号ごとのMapへ拡張し、#42/#43/#44の3件を扱うケースを追加する。fixtureのうち1件は開始時に既存コメント1件を持たせる。

事前に6件すべての実preflight結果からhandoffを作り、レビューは一度だけ行う。`approve` はそのbinding全体へ一度だけ渡す。

次をすべてassertする。

- ログは `comment42, close42, comment43, close43, comment44, close44` の正確な順序。
- batchは `applied`、requested/processed/appliedはすべて6、remainingは0。
- comment mutation 3回、close mutation 3回。各Issueの新規コメントは1件だけ。
- 3件ともCLOSED/COMPLETEDを実close helperが検証し、既存コメントは保持される。
- 後続closeの再preflightは同じIssueの成功receiptだけを使い、別Issueのcomment URL・本文を混ぜない。
- 追加承認・手動field補完・固定待機・実ネットワークはない。

### LUNA-05: 契約・説明を更新

1. `github.issue.handoff.batch.apply` のmanifest entryだけを `contract_version: 3` にする。現行値は共有定数経由の2。共有 `ISSUE_APPROVAL_CONTRACT_VERSION` を一括incrementしない。
2. manifestテストのworkflow別期待値mapへbatch.apply=3を加える。
3. `approval-handoff.md` の順序付きプラン説明へ、共通snapshotで実preflightを比較すること、承認コメントによる既知の変化は追加承認なしでcloseへ渡せること、停止理由が不完全項目と外部変化を区別することを補う。完全レビュー・exact approve・真の衝突後の再レビュー要件は維持する。
4. 下記generatorを使ってlock/referenceを更新する。生成ファイルのSHAやversionを手編集しない。

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-workflow-contracts.mjs
node skills/igapyon-miku-scm/scripts/miku-scm-workflow-contracts.mjs --check
```

共有runtime sourceの変更で他のIssue/handoff契約hashも変わり得る。これは正しい更新であり、hashを固定して回避しない。新moduleは増やさないため、既存 `miku-scm-issue-approval.mjs` / `miku-scm-handoff.mjs` の宣言をそのまま活かす。CLI ID、schema version、human output field構成は維持する。

旧契約のpending handoffを自動移行・手編集しない。既存のcontract mismatch検査が書き込み前に拒否することをテストで維持する。`workplace/` の実運用handoffやattemptをテスト都合で変更しない。

### LUNA-06: 検証と完了記録

変更中は対象のfocused testsを実行し、全変更が揃った段階で次の順に確認する。

```sh
node --test skills/igapyon-miku-scm/tests/miku-scm-issue-approval.test.mjs skills/igapyon-miku-scm/tests/miku-scm-handoff.test.mjs skills/igapyon-miku-scm/tests/miku-scm-handoff-comment-close.test.mjs
node --test skills/igapyon-miku-scm/tests/github-issue-comment.test.mjs skills/igapyon-miku-scm/tests/github-issue-close.test.mjs skills/igapyon-miku-scm/tests/miku-scm-workflow-manifest.test.mjs skills/igapyon-miku-scm/tests/miku-scm-workflow-contracts.test.mjs skills/igapyon-miku-scm/tests/miku-scm-run.test.mjs
npm run test:miku-scm
npm run test:skill-index-policy
node skills/igapyon-miku-scm/scripts/miku-scm-workflow-contracts.mjs --check
mvn validate
git diff --check
git status -sb
```

新テストは `.test.mjs` の自動探索対象であり、full suiteへ収集されることを出力で確認する。fastの既存 `miku-scm-*.test.mjs` にも一致する。full suite成功後は、新しい差分や失敗等がなければ繰り返さない。

完了記録には、変更前の失敗、修正後の単一Issueと3件6操作の結果、真の衝突停止、テスト件数、contract更新範囲、未実施の配備/実GitHub/Windows確認を記載する。過去の473件等を今回の実行件数として転記しない。root TODOを実測した状態へ更新する。

## 6. 完了判定と停止条件

完了は次のすべてを満たす場合に限る。

- 実close preflightの `issue_title` をそのまま受け取り、正常なcomment→closeが追加承認なく通る。
- 3件6操作を一回のreview/approveで完了でき、各mutationが1回だけ。
- review作成とバッチ比較が同一のsnapshot正規化を使う。
- 真の外部変更・不完全な情報・不明結果では止まり、成功済みcommentを再投稿しない。
- 衝突箇所と再preflightのrun IDが記録され、上記のローカル検証と契約checkが成功する。
- 製品の実装・検証と、未実施の配備/実運用確認が区別されている。

別機能の導入、承認ルールの緩和、既存履歴の書き換えが必要になったら、理由と最小限の選択肢を記録してその依存部分を止める。通常の実装判断やこの計画内の各段階に再承認を要求しない。

## 7. Lunaへ渡す開始文

```text
docs/plans/miku-scm-comment-close-luna-implementation.md を実装してください。
正本はこのrepositoryのskills/igapyon-miku-scmです。
LUNA-00から06まで順番に進め、実helper返却値をそのまま渡す結合テストを先に失敗させてください。
公開preflightの項目名を変えず、reviewと依存比較に共通snapshotを使ってください。
一回のレビュー・approveで3件6操作を完了する正常系と、本当の衝突・二重投稿防止を確認してください。
実Issueや配備済みskillをテストで変更せず、製品version、commit/push、配備は別途依頼として扱ってください。
結果はdocs/plans/miku-scm-comment-close-execution.mdとroot TODOに記録してください。
```
