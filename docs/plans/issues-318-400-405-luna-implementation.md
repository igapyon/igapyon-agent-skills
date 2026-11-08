---
title: Issues 318・400・405のLuna向け実装計画
description: "Issue一覧のlabels、完全なコメント取得、Node依存判断の文書化を、変更箇所・手順・確認条件に分けた実行計画。"
category: plan
status: implemented
created: 2026-11-03
updated: 2026-11-03
---

# Issues 318・400・405の実装計画

## 1. 対象と開始時の状態

利用者の依頼は3件の対応検討と計画作成。本書保存時点では製品実装を開始していない。
後続の「この計画を実装して」という指示で、以下のローカル実装・検証を実行する。

- 正本：`/Users/igapyon/Documents/git/igapyon-agent-skills`
- 調査時branch：`devel-tiga1103tdj`
- 調査時HEAD：`9cc0aff2886faf3ed132700720c865b7bf249540`
- 既存の未stage変更：`pom.xml`、`skills/igapyon-mikuku-agent/references/VERSION.md`、
  `skills/igapyon-miku-scm/scripts/miku-scm-run.mjs`、
  `skills/igapyon-github-writer/scripts/github-writer-workflow-manifest.mjs`。
  共通版 `1.20261103.7` / 連動値 `20261103g` への更新で、`mvn validate` は成功済み。
- 上記は利用者が依頼した既存作業。保持する。今回の各Issueのために追加incrementしない。
- 後日の開始では実際のbranch/HEAD/diffを再確認する。上記branchへの強制checkoutやresetはしない。
- `/Users/igapyon/.codex/skills/` は配備先。編集はrepositoryの `skills/` を対象とする。

今回の実装範囲は下表。Issueへのコメント・label変更・close、commit/push、tag/Release、
インストール済みskillへの同期は、それぞれ別の依頼で行う。

| Issue | 成果物 | 主対象 | 順序 |
| --- | --- | --- | --- |
| [#318](https://github.com/igapyon/igapyon-agent-skills/issues/318) | 一覧のlabelsとcache整合、候補選定規則 | miku-scm | 1 |
| [#400](https://github.com/igapyon/igapyon-agent-skills/issues/400) | コメント全ページの共通取得と承認証跡への接続 | miku-scm | 2 |
| [#405](https://github.com/igapyon/igapyon-agent-skills/issues/405) | Nodeアプリの依存追加判断とレビュー項目 | miku-soft-developerの文書 | 3 |

318→400は同じreader/cache/testsを編集するため順番に進める。405は独立している。
Lunaは各段階の対象だけを読み、完了記録を残して次へ進む。実行を別agentへ委譲することは必須にしない。

## 2. 調査で確認した事実と未確認事項

1. `github.issue.read --list --repo github.com/igapyon/igapyon-agent-skills` でOpen 24件を取得した。
   保存結果は `workplace/miku-scm/runs/20261103105243385-cf12bd22-1301-44f8-8c79-1875562971a6/result.json`。
   各Issueにlabelsフィールドがない。無labelであると判断してはいけない。
2. `github-issue-read.mjs` の一覧用固定fieldは `number,state,title,body,url,updatedAt`。
   `normalizeIssue()` もlabelsを返していない。#318は現行sourceで未対応と確認できる。
3. `miku-scm-github-readonly.mjs` はcache schema v1。cache値のlabelsやコメント完全性は検査していない。
4. #400の再現コマンドを2026-11-03に実行した。
   `github.issue.read --repo github.com/igapyon/igapyon-agent-skills --issue 399` は
   `Issue comment evidence is missing or incomplete` / `implementation-bug` / `mutation_invoked: false` で停止した。
   run：`20261103105532793-e7441a43-ef0e-4650-86b2-7af0f30f93c2`。
5. 現行readerは `gh issue view` のcommentsを `nodes / totalCount / pageInfo` の接続として検査する。
   どの応答条件が実際に欠けたかは今回のエラー出力だけでは断定できない。
   「配列を受け入れれば完了」「実際にコメントが欠落していた」とは断定しない。
6. update/comment/label/closeにも同じ接続検査がある。generic readerだけの修正では不十分。
7. `10-node-app-workflow.md` に依存追加の具体的な判断手順が不足している。
   共通方針と例外は `miku-soft-10-mainapp-design.md` の
   `Scratch Implementation and Dependency Principles` に既にある。

Issue本文は取得済みだが、この調査では各Issueのコメントを取得していない。
400修正後に3件をbatch再取得し、追加の仕様・重複・解決済み報告がないか照合する。
テストsuiteは計画作成中には実行していない。以下のテストは実装担当者が実行する。

## 3. LUNA-00：開始確認と記録

1. `DEVELOPMENT.md`、rootの `GOAL.md / TODO.md / DECISIONS.md / HANDOFF.md`、適用される `AGENTS.md` を読む。
   古いbranch名・状態・検証件数より、最新の利用者依頼と実際のGit状態を優先する。
2. `git status -sb`、`git rev-parse HEAD`、`git diff --stat`、`git diff --cached --stat` を確認する。
3. 既存4ファイルの版数差分と、今回の計画書/TODO差分を記録する。
   無関係な差分をrestore/reset/stashしない。同じ行に並行変更があれば内容を照合する。
4. `node --version`、`npm --version` を記録する。
5. 下記2ファイルの既存テストを一度実行し、失敗があれば変更前の失敗として記録する。

```sh
node --test skills/igapyon-miku-scm/tests/github-issue-read.test.mjs skills/igapyon-miku-scm/tests/miku-scm-github-readonly.test.mjs
```

完了条件：開始状態・既存差分・baseline結果を、同じディレクトリの
`issues-318-400-405-execution.md` に記録する。以後、各段階に実施内容・コマンド・結果・残件を追記する。
実施指示を受けた後は、段階ごとの再承認を要求しない。

## 4. LUNA-318：一覧labelsとcache

### 4.1 編集する場所

| ファイル（`skills/igapyon-miku-scm/`からの相対） | 作業 |
| --- | --- |
| `scripts/github-issue-read.mjs` | list固定fieldと一覧の正規化 |
| `scripts/miku-scm-github-readonly.mjs` | cache schemaとcache値の検証 |
| `SKILL.md` | 次Issue推薦でのlabels利用規則 |
| `references/github-cli-static-helper-policy.md` | 一覧の固定command |
| `references/github-readonly-cache.md` | 新旧cache・不完全値の扱い |
| `references/deterministic-workflow-runner.md` | list出力のlabels説明 |
| `tests/github-issue-read.test.mjs` | label metadataと入力異常 |
| `tests/miku-scm-github-readonly.test.mjs` | list/cacheの一致・旧値の失効 |

manifest・契約の変更は7節も適用する。

### 4.2 実装手順と固定仕様

1. listの固定fieldの末尾に `labels` を追加する。
   内部で実行する固定commandは次とし、利用者向けの任意field/gh引数は追加しない。

```text
gh issue list --repo <[host/]owner/repo> --state <open|closed|all> --limit 1000 --json number,state,title,body,url,updatedAt,labels
```

2. 一覧要素に常に `labels` 配列を返す。空配列は「取得済みでlabelなし」を表す。
   フィールド欠落を空配列に補完しない。
3. labelは `name / color / description` を保持する。
   nameは空白だけではないstring、colorは6桁の16進string、descriptionはstringまたはnull。
   label名の大文字小文字・空白を勝手に変更しない。同名重複は不正応答として停止する。
   その他の既存Issue fieldsは維持する。個別Issueのlabels/comments契約をこの段階で変更しない。
4. list label検証を小さな関数にまとめ、cache内の一覧検証にも再利用する。
   rawの `url/updatedAt` と正規化後の `html_url/updated_at` を取り違えない。
5. `GITHUB_READONLY_SCHEMA_VERSION` をv1→v2にする。
   `readCache` へ期待repository/queryを渡し、保存値と一致することを検査する。
   `issues:*` は `mode/list・repository・state・issues配列・各labels` まで検証する。
   schema不一致・labels欠落・不正labelsのcacheはcache missとして扱う。
6. 不正cacheはstale fallbackにも使用しない。有効な新schemaの完全なcacheだけが
   従来の `stale-cache / degraded` 経路を使える。失敗したrefreshで既存cacheを上書きしない。
7. SKILLに「一覧のexact existing label名 `bug` を優先候補として使う。
   labelsだけで依存・重複・実施済みを判断しない。追加情報やコメントが必要なshortlistだけ個別取得」
   と記載する。すべてのIssueの個別取得、labelの自動作成/変更、実装の自動開始は加えない。
8. human listの表示形式は維持する。labelsはJSONの取得契約へ追加し、表示方式の変更は広げない。

### 4.3 必須の確認

| ケース | 期待結果 |
| --- | --- |
| 2 label付きIssue、labelなしIssue | 正確なname/color/descriptionと空配列を保持 |
| labels欠落、非配列、null要素、空name、不正color/description、重複name | 成功にしない |
| list固定argv | 上記fieldと完全一致。Open既定・1000件上限を保持 |
| batchの `issues:open` | direct listと同じIssue shape |
| v1 cache、新schemaだがlabels欠落のcache | freshでもstaleでも利用しない |
| 有効v2 cache、TTL内の2回目 | 追加GitHub取得なし、labelsを保持 |
| 有効v2 cacheのrefresh失敗 | degraded/stale表示、保存済み完全値を保持 |
| repo/queryの異なるcache | 採用しない |

同じsynthetic Issue集合で旧一覧と新一覧の `Buffer.byteLength(JSON.stringify(value), 'utf8')` を比較し、
増加bytesを記録する。`bug`抽出のための固定list呼び出しは1回、追加の個別取得は0回とfixtureで確認する。
cache hit時はnetwork 0回と区別する。「すべての次Issue推薦が常に1回で終わる」とは主張しない。

完了条件：4.1の対象と契約を整合し、318用focused testsが成功する。

## 5. LUNA-400：完全なコメント取得

### 5.1 採用する方式

`gh issue view` は既存のmetadata/labels取得に使い、そこから `comments` fieldを外す。
コメントは固定GraphQL queryでconnectionを取得し、helper内でcursorを進めて全ページを集める。
`gh issue view` が返すcommentsの形式だけから完全性を推定する経路を廃止する。

新規module：`skills/igapyon-miku-scm/scripts/github-issue-comments.mjs`。
新規test：`skills/igapyon-miku-scm/tests/github-issue-comments.test.mjs`。
外部依存は追加しない。既存の同期 `gh(args)` 注入に合わせ、collectorも同期関数とする。

公開する関数の予定形：

```js
readCompleteIssueCommentConnection(repository, issueNumber, {
  gh,
  expectedUpdatedAt,
});
// 戻り値：{ nodes: 全ページのcomment配列, totalCount, pageInfo: { hasNextPage: false } }
```

`gh` は既存helperから注入する。moduleが独自の認証設定やshellを作らない。
repositoryは既存 `parseRepository` で検証する。hostnameは選択したhost、未指定時はgithub.com。
以下のquery文字列はmodule内定数とし、CLIからqueryやpage sizeを受け付けない。

```graphql
query IssueComments($owner: String!, $name: String!, $number: Int!, $cursor: String) {
  repository(owner: $owner, name: $name) {
    issue(number: $number) {
      number
      url
      updatedAt
      comments(first: 100, after: $cursor) {
        totalCount
        nodes { id url body createdAt author { login } }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
}
```

内部の固定argv：

```text
gh api graphql --method POST --hostname <selected-host> -f query=<固定query> -f owner=<owner> -f name=<repository> -F number=<検証済み整数> [-f cursor=<直前のendCursor>]
```

最初の呼び出しにはcursor引数を付けない。owner/name/query/cursorは `-f` のraw string、
numberだけは `-F` の整数とする。`-F` による `@file` 解釈をstring入力へ持ち込まない。
POSTでもqueryによる読み取りであり、GraphQL mutationは実装しない。
Agentがこのgh commandを直接実行するための例ではなく、tracked helperの実装仕様である。
公式資料：[gh api](https://cli.github.com/manual/gh_api)、
[GraphQL Issues reference](https://docs.github.com/en/graphql/reference/issues)。

### 5.2 collectorの検証順

1. repository、positive safe integerのIssue番号、空ではないexpectedUpdatedAtを検証する。
2. metadataのview後にcollectorを呼ぶ。各pageのquery結果で対象number/URL/hostを照合する。
   issue.updatedAtはviewの値と一致する必要がある。
3. gh失敗、JSON不正、GraphQL `errors`、repository/issueのnullを拒否する。
   `data` があっても `errors` があるpartial responseは成功にしない。
4. 各pageのtotalCountは非負のsafe integer。全pageで同じ値に固定する。
   nodesは配列で100件以下、pageInfo.hasNextPageはbooleanとする。
5. 各commentのid・url・body・createdAtを検証する。
   authorは削除済みユーザーを表すnullかlogin stringを持つobjectを許す。
   URLは選択したrepository/Issueへのissuecommentを指す必要がある。
6. id/URLの重複、totalCountより多い累計、cursorの反復を拒否する。
   次pageありなら空でないendCursorと空でないnodesを要求し、そのcursorだけを次に渡す。
7. 最終page到達後に、取得した全nodes数とtotalCountが一致することを確認する。
   この時点で全件connectionを組み、既存 `normalizeIssueCommentConnection` でも検証する。
8. 戻り値のnodesはAPIの順番を保持する。mutation用の正規化/sortは既存normalizerが担当する。

上限は内部定数：100 page、合計64 MiBの応答、各gh subprocessは15秒timeout・16 MiB maxBuffer。
超過時はページを打ち切って成功にせず、明示エラーにする。既存 `createGhRunner` とgeneric readerの
default runnerにも上限を反映する。cursorはその取得中だけ使い、後日の再開データとして保存しない。

診断messageにはIssue番号・page番号・原因・期待件数/観測件数を含める。
原因例：`page fetch failed`、`missing pageInfo`、`totalCount changed`、`duplicate comment`、
`final count mismatch`、`pagination limit exceeded`。コメント本文やcredentialはerrorへ含めない。
既存runnerのclassification/phase/mutation_invokedは保持する。原因のために広範囲のerror分類再設計はしない。

これは全ページ・件数・対象・観測中の変更の検査であり、GitHub上の原子的snapshotを保証するものではない。
apply直前にはcacheを使わず再取得し、既存のsnapshot/digest照合を引き続き行う。

### 5.3 呼び出し元の変更

| ファイル | 変更内容 |
| --- | --- |
| `scripts/github-issue-read.mjs` | view fieldからcommentsを外し、collectorの全nodesを返す。requested number/URLも照合 |
| `scripts/github-issue-update.mjs` | `createGhIssueReader` のmetadata検証後にcollectorを呼び、既存normalizerでcommentsを返す |
| `scripts/github-issue-comment.mjs` | 同上。投稿後の個別コメント検証は維持 |
| `scripts/github-issue-label-update.mjs` | 同上。exact existing labelと重複検査は維持 |
| `scripts/github-issue-close.mjs` | 同上。stateReasonとnull bodyの既存扱いを維持 |
| `scripts/miku-scm-github-readonly.mjs` | schemaをv2→v3へ更新し、400導入前の個別Issue cacheも失効させる |
| `references/github-cli-static-helper-policy.md` | viewの新field、固定GraphQL query/argv、全ページ完全性条件を文書化 |
| `references/github-issue-update.md` / `github-issue-comment.md` / `github-issue-label-update.md` / `github-issue-close.md` | 同じ固定readerを使う説明・fieldを整合 |
| `references/github-readonly-cache.md` | v3と完全な個別Issue取得・失敗時fallbackを説明 |

generic readerのcommentsは従来どおり `url/body/createdAt/author` を持つnodes配列を返す。
operation用commentsは従来の `url/body/created_at/author` の正規化shapeとdigest計算を保持する。
配列への変更を理由にcomment evidenceを省略しない。

`miku-scm-writing-prepare.mjs` の `boundedGitHubEvidence()` は全件取得後の文面作成用圧縮であり、
`comments_truncated` 表示を維持する。この圧縮結果をIssue mutationの承認証跡として使わない。
createのparent read、create後の検証、独立したPR Issue matching cacheは今回のコメント修正対象外。

### 5.4 テストと完了条件

collectorのfake gh fixtureで、固定query/argvと次cursorの受け渡しを完全一致で検証する。
0件・1件・100件・101件・201件を使い、最後のケースは3pageが必要なことを検証する。

- malformed connection/pageInfo、count不足/過剰、途中count変化、重複id/URL、cursor循環を拒否する。
- 2page目のgh失敗、GraphQL partial error、metadata updatedAt変更、別repo/Issue、上限超過を拒否する。
- author=null、空bodyの正当なコメント、Enterprise hostを扱う。
- 「平らなcomments配列を受け取れた」だけで完全性確認に代えない。
- generic readとupdate/comment/label/closeの実際の `createGhIssueReader` を使い、全件保持を確認する。
- preflight後に後半pageのコメント本文が変わるfixtureでapplyが停止し、mutation呼び出し0回を確認する。
- 読み取り途中の失敗でもmutation呼び出し0回。実GitHubのコメントやcloseをテストに使わない。
- batch `issue:number` のv1/v2 cacheを採用しない。有効v3 cacheのhit/stale規則は維持する。
- writing用evidenceのauthor/created_atと、100件超での `comments_truncated` を確認する。

変更する既存tests：`github-issue-read.test.mjs`、`github-issue-update.test.mjs`、
`github-issue-comment.test.mjs`、`github-issue-label-update.test.mjs`、`github-issue-close.test.mjs`、
`miku-scm-github-readonly.test.mjs`、`miku-scm-issue-approval.test.mjs`、`miku-scm-handoff.test.mjs`、
`miku-scm-run.test.mjs`、`miku-scm-repository.test.mjs`、`miku-scm-writing-prepare.test.mjs`。
既存fixtureでview一回に返していたcommentsを、新しいmetadata応答とGraphQL page応答へ分ける。
固定command期待値やcall数を単に緩めず、全取得手順に合わせる。

契約更新後に一度、元の再現コマンドをrunner経由で再実行する。
ネットワーク等で失敗した場合は、fixture成功と実GitHub未確認を区別して記録する。
成功時もIssue #399のコメント件数を固定値としてテストへ埋め込まない。

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-run.mjs --format json github.issue.read --repo github.com/igapyon/igapyon-agent-skills --issue 399
node skills/igapyon-miku-scm/scripts/miku-scm-run.mjs --format json github.read.batch --repo github.com/igapyon/igapyon-agent-skills --query issue:318 --query issue:400 --query issue:405 --refresh
```

318の実応答は、最終確認でOpen一覧を一度だけ取得し、各要素のlabelsフィールドとmetadataを確認する。

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-run.mjs --format json github.issue.read --repo github.com/igapyon/igapyon-agent-skills --list
```

結果が大きい場合は、その呼び出しのrun IDに対応する保存済み `result.json` から
番号・title・labels・件数など必要な項目だけ読む。同じ一覧を表示形式の変更目的で再取得しない。
取得した3件のコメントを本書と照合する。完了報告があればsourceと対応づけ、重複実装を避ける。
仕様追加があれば影響する段階を更新する。部分取得・staleを最新コメントの確認済みに数えない。

## 6. LUNA-405：Node依存の判断を文書へ反映

主変更は `skills/igapyon-miku-soft-developer/references/10-node-app-workflow.md`。
共通方針の正本は同じreferences内の
`miku-soft-basic/miku-soft-10-mainapp-design.md` の `Scratch Implementation and Dependency Principles`。
共通方針を複製せず、workflowから同見出しへリンクしてNode固有の実施手順を書く。

1. `Node.js Compatibility Policy` の前に `Runtime Dependency Decisions` 節を追加する。
2. runtime dependencyは配布後の実行時に必要なもの、dev dependencyはbuild/test等の開発時に使うものと説明する。
   `package.json` のdependencies/devDependenciesだけでなく、配布bundleに取り込まれるコードも確認する。
   bundlerをdevDependenciesへ置いたことと、取り込んだlibraryの実行時影響は別々に確認する。
3. runtime dependencyは実用上可能な範囲でゼロを目指し、必要最小限にする。
   Node標準機能での代替、仕様準拠、利用者価値、保守、安全性、複雑さから選定する。
   自前実装が仕様逸脱や安全性の問題を増やす場合は外部libraryを認める。
4. 追加時には「必要な機能・標準機能で代替しない理由・選定理由・実行時/開発時の区分・
   配布物への入り方・保守/安全性/ライセンス上の確認・確認したコマンド」を
   既存の設計文書かPRへ記録する。新しい必須管理ファイルは作らない。
5. 依存の追加/変更では既存package managerに従いmanifestとlockfileを揃える。
   productのbuild/test、CLI/runtime両bundle、配布後のsmoke、必要なpack検査から該当するものを選ぶ。
   ソースcheckoutのnode_modulesへ暗黙に依存していないか、隔離した配布物で確認する。
6. 末尾の `Node-Specific Checklist` に同節への参照と依存変更時の確認項目を追加する。
   npm scriptが存在しないrepoへ、架空のscript名を必須コマンドとして実行させない。
7. `references/review/node-cli.md` から新節へ短い参照を追加する。
   共通方針・例外・レビュー項目の全文を別々に複製しない。

このIssueは文書の判断規則を整備する。既存の全projectから依存を削除する作業や、
Node最低版、starterの依存、公開artifact名、Release workflowの変更には広げない。

机上レビューでは次の4例に判断理由を残す。

| 例 | 文書から導ける判断 |
| --- | --- |
| 単純なpath/JSON処理 | Node標準機能を先に検討する |
| TypeScriptやtest runner | build/testだけなら開発用依存へ置く |
| 複雑で安全性が重要なformat処理 | 外部libraryを採る理由を記録できる |
| libraryをbundleへ内包 | runtime側への組込みを認識し、配布物をsmokeする |

文章の単語が存在するだけのテストは追加しない。既存の参照・索引方針検査と、
リンク先/anchor・例外保持・上記判断例のレビューで確認する。

## 7. LUNA-CONTRACT：共有契約の更新

generatorはrepo rootのscriptsではなく、skill配下の次の実在ファイルを使う。

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-workflow-contracts.mjs
node skills/igapyon-miku-scm/scripts/miku-scm-workflow-contracts.mjs --check
```

生成対象は `scripts/miku-scm-workflow-contract-lock.mjs` と `references/workflow-contracts.md`。
手修正しない。318完了時と400完了時の各checkpointで更新する。

- 318で `github.issue.read` / `github.read.batch` のcontract versionを1→2にする。
- 400で同2件を2→3、update/comment/label/closeのpreflight/applyを2→3にする。
  createやhandoff全体の共通定数を一括更新せず、対象entryのversionを明示する。
- 新moduleを使う10件（read・batch・4操作のpreflight/apply）の
  `contract_runtime_sources` に `github-issue-comments.mjs` と、実際に参照するrepository helperを含める。
  import先が自動でhash対象になると仮定しない。既存approval/handoff sourceは保持する。
- `writing.issue.prepare` もgeneric readerを利用する。
  contract versionを1→2にし、reader・collector・normalizer・repository helperをsourceへ含める。
  `writing-mode.md` に完全取得後の文面用圧縮と `comments_truncated` の関係を短く補う。
- 影響するoperationの契約変更により、旧pending handoffの自動適用を許可しない。
  既存の契約不一致検査を維持し、新preflight/確認表示へ戻す。
  approvalの文法、digest計算、attemptの扱いを緩めない。
- `miku-scm-workflow-manifest.test.mjs` のversion期待値を対象ごとのmapで更新する。
- `miku-scm-workflow-contracts.test.mjs` でcollector内容の変更が依存契約hashへ反映され、
  無関係なworkflowのruntime hashを変えないことを検査する。

文書変更で複数のspec hashが更新されるのは許容する。無関係なworkflowの動作変更や
既存handoffの手動書換えによって、drift検査を通さない。

## 8. LUNA-FINAL：検証順序と引き渡し

1. 318のfocused tests、400のcollector・各operation testsを、それぞれの変更直後に実行する。
   失敗したら対象を絞って修正し、その失敗に関係する範囲を再実行する。
2. 契約更新後、次のfocused確認を行う。

```sh
node --test skills/igapyon-miku-scm/tests/github-issue-comments.test.mjs skills/igapyon-miku-scm/tests/github-issue-read.test.mjs skills/igapyon-miku-scm/tests/miku-scm-github-readonly.test.mjs
node --test skills/igapyon-miku-scm/tests/github-issue-update.test.mjs skills/igapyon-miku-scm/tests/github-issue-comment.test.mjs skills/igapyon-miku-scm/tests/github-issue-label-update.test.mjs skills/igapyon-miku-scm/tests/github-issue-close.test.mjs
node --test skills/igapyon-miku-scm/tests/miku-scm-issue-approval.test.mjs skills/igapyon-miku-scm/tests/miku-scm-handoff.test.mjs skills/igapyon-miku-scm/tests/miku-scm-run.test.mjs skills/igapyon-miku-scm/tests/miku-scm-repository.test.mjs skills/igapyon-miku-scm/tests/miku-scm-writing-prepare.test.mjs
```

3. 全変更を揃えた後、引き渡し前に一度full suiteを実行する。

```sh
npm run test:miku-scm
npm run test:skill-index-policy
node skills/igapyon-miku-scm/scripts/miku-scm-workflow-contracts.mjs --check
mvn validate
git diff --check
git status -sb
```

新規testはfull suiteに収集されることを確認する。長い実行は進捗を見ながら待ち、
根拠なくタイムアウトやテスト期待値を緩めない。成功後の反復full実行は、新しい変更や未解決の懸念がある場合に限る。
本文を変更しただけの既存referenceのためにindex.jsonを無条件で再生成しない。
検査がgenerated indexの更新を要求した場合は、そのskillで採用している生成手順を確認する。

4. 最終diffでは以下を確認する。
   - 利用者の既存版数更新4ファイルを保持している。
   - list→batch→cacheのlabels、read→mutationのcommentsがそれぞれ同じ取得仕様になっている。
   - completeなコメントを取得できない場合、mutationや新cache保存へ進まない。
   - gh commandは固定helper内だけにあり、free-form入力やshell経由の実行を追加していない。
   - 405の依存最小化と適切なlibrary採用の例外が両方残っている。
5. execution記録に変更ファイル、実測bytes/call数、テスト結果、実GitHub読取結果、未実施事項を書く。
   root TODOの3件を実装/検証の状態に合わせて更新する。

完了条件は「3件のsource対応とローカル検証が揃い、実GitHub読取の成否と制約が記録されている」。
実GitHubのreadが認証・ネットワーク等でできない場合、fixture成功は報告できるが、
Issue #400の実運用確認まで完了と記載しない。CIのWindows/macOSは実際のrun証拠がある場合だけ成功と記録する。

## 9. Lunaへ渡す開始文

```text
docs/plans/issues-318-400-405-luna-implementation.md を実装してください。
まずLUNA-00で現在のGit状態と既存差分を確認し、318→400→405の順に実施してください。
既存の1.20261103.7 / 20261103gへの4ファイルの変更を保持してください。
各段階の変更箇所・確認条件・契約生成・最終検証は計画に従ってください。
計画内のローカル修正・テストを進めるための再確認は不要です。
結果はdocs/plans/issues-318-400-405-execution.mdとroot TODOへ記録してください。
GitHubへの書き込み・commit/push・tag/Release・ローカルskill配備は別の依頼で扱います。
```
