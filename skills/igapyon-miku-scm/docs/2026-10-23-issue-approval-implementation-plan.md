---
title: miku-scm Issue操作とapprove承認の改善実施計画
description: "miku-scm Issue操作のapprove必須化に関する実装計画と実施記録。"
category: plan
status: implemented
created: 2026-10-23
updated: 2026-10-23
---

# miku-scm Issue操作とapprove承認の実装計画・実施記録

## 1. 実施状態と対象

**計画作成後、利用者の実装指示によりUX-00〜08を実装し、計画記載の検証を完了した。**
本書は合意した設計と実施記録を保持する。現行の規範は `SKILL.md`、
`references/`、manifest、contract lock、fixed helperとする。

- 正本repository: `/Users/igapyon/Documents/git/igapyon-agent-skills`
- 主対象: `skills/igapyon-miku-scm/`
- 調査時: `devel-tiga1023hac`、HEAD `454ddb3ed18b6f968535b5bfc5e6b1b0f4c6daca`、worktree clean
- インストール済み `/Users/igapyon/.codex/skills/igapyon-miku-scm/` は配備先。正本として編集しない。
- 後日開始時にbranch/HEAD/worktreeを再確認する。上記branchへのcheckoutやHEADへのresetを要求しない。
- 実行状態の正本はroot `TODO.md`。本書は設計と実施証拠を保持する。

本計画のコマンド例とLuna向け開始指示は、計画提示時点の実装設計履歴である。
実GitHubへのIssue操作をテストに使わない。

## 2. 利用者と確定した仕様

1. **Issueへの書き込みは、具体的な作業案の提示後に利用者が `approve` して初めて実行する。**
2. 「文面は任せる。○○に1件登録して」でも、完成した文面・登録先を提示して待つ。
3. 「#123を完了として閉じて」でも、対象・理由を提示して待つ。
4. 「はい」「OK」「お願いします」「いいね」「承認」をIssue書き込みの承認にしない。
5. 一つの作業案にコメントとcloseなどをまとめ、案全体に一度の承認で連続実行する。
6. 通常は利用者にhandoff IDやdigestの入力・コピーを要求しない。
7. 承認を特定の対象・内容・順序に束縛する。別の会話のpendingや古い案を選ばない。
8. 内容や判断の根拠が変わったら停止し、修正版を提示して新たな `approve` を待つ。
9. 依頼のない操作を追加しない。closeにコメント・label変更を自動で付加しない。
10. 途中成功・未実施・結果不明を区別し、再開時の重複投稿を防ぐ。

以前の検討にあった「明確なclose指示なら即実行」「文面の委任があれば登録まで実行」は採用しない。
後から追加された `approve` 必須の合意を優先する。
仕様説明に含まれる `approve` は実行承認ではない。

## 3. 現行構造と変更理由

| 箇所 | 確認した現状 | 改善方針 |
| --- | --- | --- |
| `SKILL.md` / manifest | `miku-scm approve`、selector/batch、legacy `miku-scm 承認`、操作別「OK」triggerがある | Issue承認を一つの文法へ統一。Git/PR/version等は対象外 |
| `miku-scm-run.mjs` `runWorkflow` | 成功したIssue preflightごとに `createIssueApprovalHandoff` | この生成経路を拡張する |
| `miku-scm-handoff.mjs` | v1 record、immutable/record digest、単独/batch apply、依存preflightがある | 既存handoffを拡張。別のtask保存階層は作らない |
| `selectPendingHandoff` | IDなしではroot全体のpendingが一件なら選ぶ | 公開applyのfallback廃止。提示済みIDをAgentが正確に渡す |
| handoffの `review` | 本文等の完全な確認情報を保存していない | v2に正規化した確認内容を保持。summaryから逆算しない |
| `miku-scm-human-output.mjs` `appendIssueOperation` | digest/path/IDが目立ち、完全な投稿本文は表示しない | 人間が確認する対象・変更を表示。詳細はJSON/run artifactへ |
| `miku-scm-workflow-contracts.mjs` `calculateWorkflowContracts` | entryのrunner本体とspecをhashし、import先moduleは自動追跡しない | 新しい承認moduleとrendererをIssue wrapperの契約へ明示的に含める |
| `applyPendingIssueHandoffBatch` | 順序固定、全件事前検証、partial、同Issueの依存refreshを実装 | 一回のapproveによる複合操作に再利用 |
| `github-issue-comment.mjs` | attemptがあればすべて停止。送信前read失敗の `not-applied` でも同じdraftを再利用できない | 未送信と証明できる失敗だけ回復可能にする |
| `github-issue-close.mjs` | 同じIssue/理由の過去の成功も再試行不可 | reopen後の再closeは後続課題。今回、無条件に解除しない |
| Daybook `references/issue-import.md` | コメント/closeにmiku-scmの直接apply IDを案内 | 共通確認・approve導線に合わせる最小限の文書整合 |

参照:
[SKILL](../SKILL.md)、
[承認規則](../references/approval-handoff.md)、
[下書き](../references/github-issue-rewrite-handoff.md)、
[handoff実装](../scripts/miku-scm-handoff.mjs)、
[runner](../scripts/miku-scm-run.mjs)、
[出力](../scripts/miku-scm-human-output.mjs)。

## 4. 実装範囲

### 今回の実装範囲

- 現行のcreate / title-body update / comment / existing-label membership / close。
- 日本語の依頼から読み取り・下書き・preflight・確認表示まで同じturnで進めるSkill導線。
- approve gate、確認対象の固定、通常表示の短縮、単独/複合作業の一括承認。
- 既知Issueへの標準複合形 `update（必要ならlabelを含む）→ comment → close` のうち依頼されたstep。
- 一つの案は最大20 step。同じIssueでは同種stepは一つ、closeは最後。
  二度投稿など明示された操作を黙って統合しない。
- safe failure、partial、元の承認が有効な場合の明示的な再開。
- 旧artifact互換と、既知callerの文書整合。

### 今回の実装対象外

- 新しいGitHub操作、assignee/milestone等、新しい認証方式や権限拡大。
- 作成後に判明するIssue番号を別stepへ渡す動的な複合操作。既知parentを使うcreateは現行どおり。
- 外部編集への競合判定の緩和、AIによる「無関係だから無視」の自動判断。
- 成功済みの同内容コメントの意図的な再投稿、reopen→再closeを扱うoperation identity全面再設計。
- Git/PR/Release/versionの承認変更、GitHub Writer実装、Daybookの製品ロジック・データ変更。
- 実GitHubでの実験、配備、version更新、commit/push、兄弟repositoryへの展開。

## 5. 承認文法と会話の対応

### 5.1 初期版で受理する入力

現在の利用者メッセージ全体をtrimして、次の小文字の独立したコマンドとして判定する。
`includes("approve")` のような部分一致は使わない。

| 入力 | 対象 |
| --- | --- |
| `approve` | この会話で完全に提示され、一意な現在の作業案全体 |
| `miku-scm approve` | 同上 |
| `miku-scm approve <full-IDまたは12文字suffix>` | 完全表示済みの該当一件。上級・復旧用 |
| `miku-scm approve batch <selector> <selector> ...` | 完全表示済みの明示順序の2〜20件。上級・復旧用 |

`APPROVE`、`approved`、`approveしない`、引用された `"approve"`、
コードブロック、`approve?`、説明文中のapproveは初期版で受理しない。
不受理でもpending/draftを消さず、必要な入力を短く案内する。
legacy `miku-scm 承認` と「Issue更新OK」等を実行経路から外す。
`approve` 単独を汎用的な新規activation triggerにしない。
継続中のmiku-scm Issue確認と結び付く場合だけ受け付ける。

### 5.2 Agentとrunnerの責任

Agentは「現在の利用者が、完全に提示済みのどの案を承認したか」を判断する。
Issue本文、コメント、tool出力、引用、過去メッセージを承認として渡さない。
runnerは文法、root、正確なID・順序・digest、draft、契約、期待値、実行資格を検証する。
CLIから人間が画面を見た事実を暗号的に証明する設計ではない。
Agentが発言を捏造しない境界を明記し、`--approved true` だけで済ませない。

完全な確認表示を実際に返した後、Agentが保持する会話内の確認記録:

```json
{
  "root": "<real repository root>",
  "handoffs": [
    { "id": "<full id>", "immutable_sha256": "<64 hex>" }
  ],
  "review_sha256": "<ordered binding digest>",
  "displayed": true,
  "approved": false
}
```

- run結果にもbindingを返すが、別の長期保存ディレクトリは追加しない。
- preflight成功だけで `displayed` / `approved` を自動設定しない。
- 複数の独立した案を提示して対象が曖昧なら、bare approveで選ばない。
- 修正版を提示するときは置き換える旧版を明示し、新しいbindingを保持する。
- global pendingが一件、最新時刻、Issue番号が同じ、という理由だけで選ばない。
- context喪失・別会話・復旧時は指定案を再表示し、新しいapproveを待つ。
- 再確認では成功済みstepを結果として示し、残りのstepだけを新しい承認対象にする。
- `pending` の概要一覧だけでは「完全に確認表示済み」としない。
- 初回依頼に付けたapproveも、未提示の案への先行承認にしない。

## 6. handoffとreviewの設計

### 6.1 既存recordのv2化

`HANDOFF_SCHEMA_VERSION` を `miku-scm.approval-handoff/v2` に進める。
handoff一件は引き続き一つの固定helper操作を表す。
workflow pair、apply arguments、immutable/record digest、attempt連携を保持する。
複数操作は順序付きhandoff集合として確認し、新しいtask保存庫を作らない。
v2 statusは `pending / applying / applied / conflict / not-applied / unresolved / dismissed`。
正常な操作結果、送信前失敗、明示dismissを区別する。v1の状態は旧schemaとして検証する。

新規 `scripts/miku-scm-issue-approval.mjs` に次の純粋関数を置く:

- `parseIssueApprovalCommand(text)`: 5.1の文法・selector配列または不受理理由。
- `normalizeIssueReview(preflightWorkflow, result)`: 操作別の完全な確認内容。
- `buildIssueReviewBinding(canonicalRoot, records, approvalContracts)`: 呼び出し側が解決したroot、順序付きID/digest、契約からbinding。
- `validateIssueApprovalBinding(command, binding, records)`: 文法・selector・順序・digestの照合。

このmoduleはfilesystem/gh/generated lock/rendererに依存させず、必要な値を引数で受け取る。
rootのrealpath化、record読み取り、現行契約の取得はhandoff/runner側で行い、循環importを避ける。

immutable領域の `review` は `schema_version: miku-scm.issue-review/v1`、
`operation`、`repository`、`issue_number`、`issue_url`、`issue_title`、
`proposal`、`context` を持ち、操作別required fieldを検査する。
新規Issueの番号/URLを捏造しない。

| 操作 | preflight結果から保存する確認内容 |
| --- | --- |
| create | `title`、全文 `body`、完全な `labels`、`parent_issue`、登録先 |
| update | `current_title` / `proposed_title`、`current_body` / `proposed_body`、`body_diff`、`current_labels` / `resulting_labels`、add/remove |
| comment | `issue_title`、`issue_state`、全文 `comment_body`、対象URL |
| label | `current_labels`、`resulting_labels`、追加/削除する正確な既存label名 |
| close | `issue_title`、`current_state`、`reason`、`duplicate_target`（必要時）、対象URL |

根拠のsnapshot/digest/timestampもcontextに保持する。
review自体をimmutable digestの対象とし、draftとreviewの投稿内容の一致を検査する。
既存の短い `human_summary` だけから内容を復元しない。

### 6.2 まとめて確認するREADONLY workflow

`github.issue.handoff.review` をmanifest/runner/helpへ登録する。
entryは既存 `miku-scm-handoff.mjs`、
新設関数 `reviewIssueApprovalHandoffs(options, dependencies)`。

```text
node <skill-root>/scripts/miku-scm-run.mjs --format json \
  github.issue.handoff.review \
  --handoff <full-id-1> [--handoff <full-id-2> ...]
```

- 1〜20件。重複、未知ID、改ざん、実行中、dismiss済み、旧schemaを拒否。
- 対象statusはpendingと、未送信と証明できるnot-appliedのみ。
  applied prefixを再確認する場合は結果として表示し、再実行対象から除く。
- Agentは当該依頼のpreflightが返したIDだけを収集。pending全体から追加しない。
- 全件検証後、完全なreviewと順序付き `review_binding` を返す。
- bindingは `schema_version: miku-scm.issue-review-binding/v1`、realpath root、
  現在のwrapper契約 `approval_contracts`、`handoffs: [{id, immutable_sha256}]` と、
  それらのcanonical JSONから計算した `review_sha256`。
- `approval_contracts` は `github.issue.handoff.review`、`github.issue.handoff.apply`、
  `github.issue.handoff.batch.apply` の固定順の `{workflow, pair_sha256}` 配列。
  apply直前に現行lockから再構築し、確認後の承認処理自体の契約変更も検出する。
- digest入力のキー順は `schema_version`、`root`、`approval_contracts`、`handoffs`。
  contract要素は `workflow`、`pair_sha256`、handoff要素は `id`、`immutable_sha256`。
  この順で新しいobjectを構築し、UTF-8の `JSON.stringify`（末尾改行なし）をSHA-256へ渡す。
  表示済み/承認済みの会話状態や実行statusを入力に混ぜない。
- rootはsymlinkを解決。Windowsのpathを一律小文字化して同一視しない。
- draft変更/欠落なら新preflightが必要。
- reviewは承認しない。remote mutationもapply attemptの消費もしない。

## 7. 会話導線・表示

### 7.1 準備の流れ

1. repository/Issue/依頼された操作を確定。曖昧な点だけ質問する。
2. 必要なIssue・コメント・既存labelsを固定helperで読む。
3. 文面を作り、既存規則に従ってlocal draftを保存する。
4. 各操作のpreflightを実行。機械的な準備step間で承認を求めない。
5. 必須stepの準備失敗を黙って除外しない。案全体の問題を報告する。
6. 返されたIDを指定してreviewを実行し、完全な確認表示を返す。
7. ここでturnを終え、利用者のapproveを待つ。

下書きだけの依頼は文面提示で終える。remote操作を自動追加しない。
委任された文面作成でも、明確なclose指示でも、最後の承認は省略しない。

### 7.2 確認表示

先に表示するのはrepository、Issue番号/タイトル/リンク（または新規作成と件数）、
実行順の操作、書き込む内容と全metadata。

- 新規本文・コメントは全文。
- updateは変更titleと省略しないdiffを基本とし、提案本文全文も確認可能な形で提示。
- labelの追加/削除/結果、parent、close理由、duplicate先を表示。
- 最後に `実行する場合は approve と返信してください。`
- 通常表示からdigest、opaqueなID、command引数、attempt pathを外し、JSON/run artifactに保持。
- 長文を黙って省略して承認を求めない。必要なら分割して全文確認を終える。
  local全文artifactを案内する場合も、概要表示だけで「全文確認済み」にしない。

`miku-scm-human-output.mjs` のIssue operation/review/handoff rendererで短縮を実装する。
mechanical workflowの `human_output` をそのまま返す原則は維持する。
Issue read、Git、PR、versionの表示は一括変更しない。

### 7.3 結果表示

成功は対象・操作・リンクを短く返す。
partial/conflict/unresolvedは完了step・未実施step・不明step・次の行動を表示する。
create成功だけでlabels/parentまで検証済みと見なさず、metadata mismatchを区別する。
上位handoff IDだけを表示して対象Issueを隠さない。

## 8. apply・複合操作・再開

### 8.1 公開applyの引数

通常は利用者がapproveだけを入力し、Agentが確認記録から引数を引き継ぐ。
公開CLIはID省略時のglobal pending自動選択を許可しない。

```text
node <skill-root>/scripts/miku-scm-run.mjs --format human \
  github.issue.handoff.apply \
  --handoff <reviewed-full-id> \
  --expected-review-sha256 <review-binding-digest> \
  --approval-command 'approve' --apply

node <skill-root>/scripts/miku-scm-run.mjs --format human \
  github.issue.handoff.batch.apply \
  --handoff <reviewed-full-id-1> --handoff <reviewed-full-id-2> \
  --expected-review-sha256 <ordered-review-binding-digest> \
  --approval-command 'miku-scm approve' --apply
```

`--approval-command` は実際の利用者の承認メッセージを渡す。Agentが自作しない。
selector付きなら文中selectorと引数ID集合/順序も照合。
review digestはroot、ID、immutable内容、順序を束縛する。
`--apply` 単独、または正しい単語だけでは実行条件を満たさない。
ID/digest/`--apply` は常に必須。通常実行は `--approval-command` 必須、
再開は `--resume` と保存済みreceiptが必須で、両flagは同時指定不可とする。
重複した単独flag、未知flag、不正SHA、文中selectorと実引数の不一致をparse段階で拒否する。

### 8.2 検証・exclusive claim

最初のremote mutation前に全件のschema/digest/contract/承認/実行資格を検証する。
並行実行の敗者が、成功したhandoffを失敗状態で上書きしないようにする。

- handoffディレクトリ内でexclusiveなexecution claimを取得する。
- batchはIDの安定順でclaimし、実行はreviewの順序で行う。
- claim失敗時はremote mutationなし。自分が取得した未実行claimだけを戻す。
- v2へ `applying` を追加し、execution IDと元のreview bindingに結び付くapproval receiptを記録。
- 結果をatomicに保存してからclaimを解放する。
- crashで残るclaim/applyingを時刻だけで自動解除しない。remote照合が必要な状態として報告する。
- contract/draft/snapshot競合時は書き込みを委譲しない。
- 保存済みのapply argumentsを使用し、承認後にpayload・対象・metadataを追加/生成し直さない。

### 8.3 複合操作の依存

`refreshSelectedIssueHandoff` / `refreshableExpectations` を再利用するが、
updated_atや本文digestを無条件に最新値へ差し替えない。
先行操作の効果と、実行後に確認したsnapshotで説明できる変化だけを許可する。

- 必要なら成功結果に `verified_issue_snapshot` とexact remote receipt（comment URL/ID等）を追加。
- `comment → close` では判断根拠のtitle/body/labels/state等が保持され、確認済みコメントが存在することを確認。
- `update → close` では承認した更新後のtitle/body/labelsとの一致を確認。
- 次のstep前に、先行step後の確認snapshotと現在値が一致することを確認。
- 外部編集や未確認コメントを内部操作による変化として吸収しない。
- 自分のコメントに続いて第三者コメントが追加されたfixtureも用意し、closeを止める。
  必要なコメントの識別情報・判断に使った情報を固定READONLYで取得し、不完全な取得を「変化なし」と扱わない。
- 必要な情報を取得できない、内部効果との区別を証明できない場合は後続を停止。
- fixed READONLYのfieldsを増やすときはspec/test/contractを同時更新。

複数書き込みは途中成功しうる。all-or-nothingや自動rollbackを約束しない。
READONLYとmutationが別呼び出しである現行構造を、原子的な条件付き更新と表示しない。

### 8.4 失敗分類とresume

| 状態 | 扱い |
| --- | --- |
| approve前 | remote mutationなし。修正は新draft/review |
| 書き込み前の失敗が確定 | 元の承認・内容・期待値が有効なら明示再開可能 |
| 成功/postcondition確認済み | 同stepを再送せず残りを再検証 |
| 内容/対象/順序/判断根拠が変化 | 新reviewと新approve |
| post-mutation結果不明、crash claim | 照合まで書き込み停止。新ID発行やrecord削除で迂回しない |
| dismiss済み | resume不可。safe failureとの区別を保存 |

helper result/attemptに実際のmutation呼び出しの有無をbooleanまたはunknownで保持する。
wrapper例外から推測した `not-applied` だけで再送資格を与えない。
commentは `pre-comment-read` 等の未送信と確定したrecordだけをarchiveし、
同じ期待値で新たなatomic attemptをclaim可能にする。
pending、成功、post-mutation unresolvedはその回復対象外。
createのURL不明を失敗と決め付けて再createしない。

公開apply/batchに `--resume` を追加する:

- 元の順序付きID、`--expected-review-sha256`、保存済みapproval receiptを使用。新IDを追加しない。
- 同じ連続会話で、利用者が再開を依頼し、元の確認記録・approveが保持されている場合だけAgentが使う。
- receiptなしresumeは拒否。flagだけでapprove gateを越えない。
- 成功済みprefixをreceiptで確認してskipし、依存情報を引き継ぐ。
- 成功がprefixにならない、途中のstepだけが別実行で成功している等の不整合は自動で並べ直さず停止。
- safe not-appliedと未実施後続stepのみを再検証して一回実行。
- 一回の再開依頼でmutationを自動反復しない。
- 後続の意味を変える外部変更なら停止して新reviewへ。
- contextや必要receiptを失ったら再表示と新approveが必要。
- 類似本文のIssueを見つけただけで、不明なcreate結果を成功と判定しない。

元の承認が有効な安全な再開で再承認を求めず、変更された作業案へは元の承認を流用しない。

## 9. 互換・文書・呼び出し元

- v1を一覧/明示dismiss用に読めるようにし、attempt履歴を保持する。
- v1の直接applyは拒否し、新preflightと完全な確認表示を要求する。
- legacy `miku-scm 承認` / 操作別OKはpendingを維持してapproveを案内。
- selector/batchを残すが、完全表示/review digestの要件は免除しない。
- pending/dismissの既存用途は保持。dismissをsafe failureと混同しない。
- 五つの低レベル `*.apply` は固定helper内部インターフェースとして維持。
  Skillの通常導線はhandoff経由に統一し、旧triggerから直接applyしない。
- Daybook `references/issue-import.md` のコメント/close案内を共通review/approveへ最小変更。
  Daybook製品ロジック・実記録は変更しない。他callerがあれば影響を記録して判断。

miku-scmの更新文書は `SKILL.md` と、`references/` 配下の次のもの:
`approval-handoff.md`、`github-issue-rewrite-handoff.md`、
`github-issue-create.md`、`github-issue-update.md`、`github-issue-comment.md`、
`github-issue-label-update.md`、`github-issue-close.md`、`workflow-routing.md`、
`deterministic-workflow-runner.md`。
read surfaceを変えた場合は `github-cli-static-helper-policy.md` も更新する。

## 10. Luna向け作業分割と実施状況

`UX-00 → 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08` の順で実施した。
検査失敗を直してから次へ進み、成功済みの無関係な検査を理由なく繰り返さない。

| ID | 対象と作業 | 完了条件 | 実施状況 |
| --- | --- | --- | --- |
| UX-00 | 現branch/HEAD/worktree、refs、caller、test構成を再確認。本書との差を記録 | unrelated差分を識別し、baselineと対象を説明できる | 完了。既存の計画差分を保持 |
| UX-01 | 新規 `miku-scm-issue-approval.mjs` と同名test。承認文法、review正規化、binding | approve不在/引用/否定を拒否。内容/root/順序変化を検出 | 完了。実helperとunit tests追加 |
| UX-02 | handoff v2、validator、v1一覧互換、review workflowをmanifest/runner/helpへ登録。10.1のgenerator拡張と生成も実施 | 完全review/bindingを返す。reviewだけのmutationは0 | 完了。v1はlist/dismissのみ |
| UX-03 | 単独/batch引数、approve/digest gate、claim、receipt | 別案/digest不一致/並行実行で誤操作なし。承認案だけ一回実行 | 完了。明示selectorとexact approvalを検証 |
| UX-04 | 五helperの必要なpostcondition、依存preflight、複合操作 | comment→close等を一回のapproveで実行。外部変化では後続停止 | 完了。順序・同Issue snapshot・verified effectを検査 |
| UX-05 | safe failure分類、comment未送信回復、resume、partial/unknown | 成功済みstepを再送せず、元案だけ再開。unknownを再送しない | 完了。未実施の証拠がある場合だけresume |
| UX-06 | human renderer、SKILL/refs、Daybook caller文書 | 登録委任でも確認待ち。通常はID入力不要。全文確認と短い結果 | 完了。通常表示で内部ID/digest/引数を隠す |
| UX-07 | manifest/help/contract生成物、対象test/guidance、root追跡の最終横断確認 | workflow・引数・spec整合。受け入れcaseに証拠がある | 完了。34 workflow contractsを生成・確認 |
| UX-08 | focused/full検査、skill validation、リンク/差分確認、実施記録 | 検証環境・結果・制約を記録し、実装とモデル実利用の実証を区別 | 完了。model会話/Windows実機は未実施と記録 |

新workflow・引数・spec・runtime sourceを変更したID内で、manifest/helpを整合し契約を生成してからtestする。
UX-07まで初回生成を待たない。UX-07は最終の横断確認であり、途中の契約不整合を放置する指示ではない。

具体的な既存変更箇所:

- `createIssueApprovalHandoff` / `validateHandoffRecord`: v2 reviewとimmutable領域。
- `parseHandoffApplyArgs` / `parseHandoffBatchApplyArgs`: 必須flagとresume。
- `selectPendingHandoff`: applyのIDなしfallback廃止。list用途と区別。
- `applyPendingIssueHandoff` / `applyPendingIssueHandoffBatch`: binding/claim/receipt/resume。
- `applySelectedIssueHandoff`: mutation事実・postconditionを保持して状態更新。
- `refreshSelectedIssueHandoff`: 内部効果で説明できる差だけ受理。
- `runWorkflow`: preflightのreview正規化、review handler、JSON binding。
- `miku-scm-human-output.mjs`: Issue確認・実行結果の表示。
- `miku-scm-workflow-manifest.mjs` / `miku-scm-help.mjs`: workflowと承認trigger。
- contract生成元とmanifestの追加runtime source宣言: 新moduleをdigest対象に含める。

`scripts/miku-scm-workflow-contract-lock.mjs` と `references/workflow-contracts.md` は生成し、手編集しない。
影響するworkflow/出力schemaのversionを進め、古いapprovalを新契約へ黙って持ち越さない。
`scripts/` と `tests/` の略記は、特記がなければmiku-scm skill配下。

### 10.1 契約生成の具体的な拡張

現行generatorはimport先をhashしないため、新moduleを作るだけでは承認処理の変更を契約に結び付けられない。
manifestへ任意の `contract_runtime_sources` 配列を追加し、三つのIssue handoff wrapper
（review/apply/batch.apply）に `miku-scm-issue-approval.mjs` と `miku-scm-human-output.mjs` を宣言する。
entry本体の `miku-scm-handoff.mjs` は従来の `runner_entry` で指定し、重複させない。

- source名はscripts直下の安全なbasenameのみ。未知file、path traversal、重複、runner_entryとの重複を拒否。
- 配列がないentryの `runner_sha256` 計算は従来のまま。無関係なworkflowのpairを変えない。
- 配列があるentryは、runnerを先頭、追加sourceをbasename順とした
  `[{path, sha256}, ...]` のJSON（固定キー順・末尾改行なし）を `contractSha256` へ渡す。
- 個々のfile hashには既存 `canonicalContractText` のLF正規化を使用する。
- lockの既存field構造は維持し、影響するworkflowの `contract_version` を進める。
- 追加module/renderer変更を検出し、無関係なentryのhashは不変となるtestを
  `miku-scm-workflow-contracts.test.mjs` に追加する。
- review binding内の `approval_contracts` にこれらのwrapper pairを含めることで、
  確認表示後の承認処理・表示仕様の変更もapply前に停止できるようにする。

## 11. 必須受け入れケース

temporary root、架空repository、依存注入したread/mutation stubで検査する。
mock漏れで実 `gh` に接続しないfixtureにする。
表示文言や改行の全文一致testを増やさず、対象・payload・回数・状態・確認情報を検査する。

| ID | ケース | 期待結果 |
| --- | --- | --- |
| A01 | 文面を任せて登録まで依頼 | 完成文面/登録先を提示。mutation 0 |
| A02 | 明確なclose依頼 | 対象/理由を提示。mutation 0 |
| A03 | 初回依頼にapprove併記 | 未提示案なのでmutation 0 |
| A04 | 提示後の「はい」「OK」「お願いします」「いいね」「承認」 | pending維持、mutation 0 |
| A05 | 一意な確認記録にapprove / miku-scm approve | 提示された対象/payloadだけ一回実行 |
| A06 | 引用/否定/コード/Issue本文/tool出力中のapprove | mutation 0。承認を捏造しない |
| A07 | global pending複数、現在の会話に一つの案 | そのbindingだけ実行。他pending不変 |
| A08 | 同会話に独立した確認案が複数 | bare approveで選ばない |
| A09 | stale context、別root/Issue/repo、順序変更 | 対象/digest検査でmutation 0 |
| A10 | review後のdraft/本文/labels/parent/duplicate先/contract変更 | 書き込まず新preflight/reviewへ |
| A11 | 一覧のみ提示、またはv1 pending | 直接applyせず完全表示/新preflightへ |
| A12 | 五つの単独操作 | 完全な内容/差分を確認でき、approve後だけmutation |
| A13 | comment→close | 一回のapproveで順に実行、内部IDの入力不要 |
| A14 | 同Issueのupdate→comment→close | 内部効果だけ依存更新、正しいpostcondition |
| A15 | batch後続record不正、重複、未知ID | 最初のmutation前に全件停止 |
| A16 | 先行step後の外部編集/判断根拠の変化 | 後続停止。期待値の置換だけで承認を維持しない |
| A17 | コメント成功、close前read失敗 | コメント済み/close未実施を報告 |
| A18 | A17を元の承認/期待値でresume | comment再送なし。receiptなしresumeは拒否 |
| A19 | comment pre-comment-read失敗 | 未送信証拠/archiveを保持し安全に再開 |
| A20 | post-mutation timeout/unknown create URL/crash claim | 再送なし。record削除/新IDで迂回しない |
| A21 | 同じ承認の並行実行 | mutation一回以下。敗者が成功結果を上書きしない |
| A22 | dismiss/成功済み案への再approve | remote操作なし。正しい状態を表示 |
| A23 | create成功、metadata検証mismatch | 作成事実とmetadata不一致を分け、再createしない |
| A24 | large body、日本語、空label list | 確認内容を欠落させず、未作成番号を出さない |
| A25 | read/draft/list/pending/dismiss、Git/PR/version | Issue approve gateを無関係な作業へ広げない |
| A26 | native Windows path、LF/CRLF fixture | root/path/draft規則が正しい。実機未検証を成功扱いしない |

重点test:
新規 `miku-scm-issue-approval.test.mjs`、
`miku-scm-handoff.test.mjs`、`miku-scm-human-output.test.mjs`、
`miku-scm-run.test.mjs`（既存のhelp検証を含む）、
`miku-scm-workflow-contracts.test.mjs`、既存の五つの `github-issue-*.test.mjs`。
`miku-scm-handoff-guidance.test.mjs` の旧文言固定を新しい意味の制約へ更新する。
新規testは `miku-scm-*.test.mjs` とし、fast suiteへの収録漏れを防ぐ。

会話caseの単体testはモデル実挙動の証明ではない。
本実施記録で「parser/runnerのtest」と「モデルによる会話確認」を分けた。
会話確認もfake repository/stub toolで行い、A01/A04/A05/A07/A08/A13を最低対象にする。

## 12. 実施した検証

iterationでは該当するtargeted testを先に実行した。
変更後に実行したfocused Issue suiteは88/88通過。

```sh
node --test skills/igapyon-miku-scm/tests/miku-scm-issue-approval.test.mjs skills/igapyon-miku-scm/tests/miku-scm-handoff.test.mjs skills/igapyon-miku-scm/tests/miku-scm-human-output.test.mjs
```

helper変更時は該当 `github-issue-*.test.mjs` を加える。
handler/manifest/spec更新後に生成・最終検査する:

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-workflow-contracts.mjs
node skills/igapyon-miku-scm/scripts/miku-scm-workflow-contracts.mjs --check
npm run test:miku-scm:fast
npm run test:miku-scm:full
npm run test:skill-index-policy
mvn validate
git diff --check
git status -sb
```

実行結果:

- `miku-scm-workflow-contracts.mjs` generationと`--check`: 34 contracts current。
- `npm run test:miku-scm:fast`: 197/197 passed。
- `npm run test:miku-scm:full`: 312/312 passed across 12 jobs。
- `npm run test:skill-index-policy`: 78/78 passed。
- `mvn validate`: BUILD SUCCESS; version alignment passed.
- `quick_validate.py skills/igapyon-miku-scm`: `Skill is valid!`。
- `git diff --check`: passed.

検証は現在のmacOS環境で実施。モデル会話確認とWindows実機確認は未実施。
実GitHub操作、skill配備、version更新、commit/pushも未実施。

## 13. 保留事項と完了報告

後続課題はfield単位の競合緩和、正当な同内容操作の再実行identity、
新規Issue番号の動的な引き渡し、approve自由文/大文字/句読点の受理拡張。
今回の実装で黙って追加しない。

完了時は実施ID、schema/互換変更、検証結果/環境、
未実施のモデル会話確認・Windows実機確認、制約、worktree、配備状態を記録する。
version、commit/push、tag/Release、配備、実GitHub操作は別の明示依頼に従う。

## 14. 計画提示時のLuna向け開始指示（履歴）

**以下は計画提示時の開始指示例であり、実装済みの現在は再開用の命令ではない。**

```text
igapyon-agent-skillsの正本で次の計画を読み、UX-00からUX-08を順に実装してください。
skills/igapyon-miku-scm/docs/2026-10-23-issue-approval-implementation-plan.md

Issue書き込みは、完成した作業案の提示後に利用者がapproveして初めて実行します。
文面の委任や明確なclose指示でも確認を省略しません。
通常のapproveは提示済みの正確なID/digestへAgentが束縛し、global pendingから選びません。
既存handoffを拡張し、別のtask保存階層は追加しないでください。
partial/unknownとsafe failureを区別し、未確認のmutationを再送しないでください。
既存fixed helper/contract/attempt/postconditionを活かしてください。
既存の他作業差分を保持し、対象testと必要なfull検査を行って証拠を記録してください。
実GitHub操作、配備、version更新、commit/pushは今回の指示に含めません。
```
