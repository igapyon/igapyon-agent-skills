---
title: Luna向け miku-soft developer 改善実施計画
description: "2026-10-22レビュー後の文書整理と配布検証の実施記録を含む計画。Node基準は承認済み、参照パス移行は判断待ち。"
category: plan
status: stable
created: 2026-10-22
updated: 2026-10-22
---

# Luna向け miku-soft developer 改善実施計画

## 1. 実施状態と対象

**計画作成時点では実施を保留していた。2026-10-22に利用者の指示でLUNA-00〜04とLUNA-06を実施し、D-NODEを決定した。その後、Java互換性についてD-JAVAを決定した。**
実施内容・検証環境・未決事項は[実施記録](2026-10-22-luna-execution-record.md)を参照する。
D-NODEの共通方針とスターター値を反映した。Nodeのversion互換性はGitHub Actionsを正式な検証環境とし、push/PR CIで22/24をmatrix実行する。Release workflowはNode 24で作った最終staged ZIPをNode 22でsmokeしてからassetをuploadする。今回の作業ではActionsを起動していないため、その実行結果は未確認。ローカルNode 22/24の実行は必須にしない。LUNA-05はD-PATHが決まるまで保留する。
Java 8を最低実行環境とし、Java 8と最新LTSで実行確認する方針も反映した。Java runtimeでの実行検証は行っていない。
担当モデルとしてLunaを想定した計画だったが、今回の実施は現在のCodexセッションで行った。

対象リポジトリの正本は次の場所にある。

- `/Users/igapyon/Documents/git/igapyon-agent-skills`
- 対象スキル：`skills/igapyon-miku-soft-developer/`
- 関連する既存検査：`scripts/skill-reference-routing.test.mjs`、`scripts/skill-reference-routes.mjs`

現在の会話の作業ディレクトリである `miku-project-skills` は変更対象ではない。
`/Users/igapyon/.codex/skills/igapyon-miku-soft-developer/` はインストール済みコピーであり、正本として編集しない。
別環境では、同じリポジトリの実際のチェックアウト先に読み替える。

今回の後続作業は、次の3項目を中心とする。

1. 重複した設計説明を整理し、ルールの参照先と責任範囲を明確にする。
2. 前回レビューで未実施だった検証を、実行環境と対象成果物を明示して補う。
3. 承認済みNode基準を説明・starter・CIへ反映し、Release後のZIPを最低版で検証するstepを加える。GitHub Actionsを正式な検証先とし、workflow未実行時は実結果を未確認として記録する。ローカルのNode 22/24実行は必須にしない。

兄弟リポジトリの修正、公開Releaseの変更、全スキルの一括整理は含めない。

## 2. 最初に読む資料と修正済みの前提

最初は以下を読み、各作業で必要になった資料を追加で読む。

1. [今回のレビュー記録](2026-10-22-skill-review.md)
2. [スキル本体](../../SKILL.md)
3. [アーキテクチャと参照資料の扱い](../../references/architecture-rules.md)
4. [保守資料の入口](README.md)
5. [既存の決定事項と保留事項](2026-07-31-reference-actions-audit/decision-and-roadmap.md)

リポジトリ側の `DEVELOPMENT.md`、適用される `AGENTS.md` も確認する。
この作業はスキル自体の保守であり、対象アプリのモード選択やmaintenance upliftを開始しない。

2026-10-22のレビューでは、以下の修正を正本へ反映済みである。
着手時に現物を確認し、欠落・退行がなければ再実装しない。

| 修正済み項目 | 現物を確認する場所 |
| --- | --- |
| Releaseのタグ由来文字列をシェルコードへ直接埋め込まない | `assets/agent-skills/.github/workflows/release-build.yml` の `Prepare release zip` |
| 同じbundle出力を使うテストを直列実行する | `assets/agent-skills/package.json` の `test` |
| 必須CLIを列挙し、欠落・空ファイルを拒否する | 同packageの `skillRuntimeArtifacts` と `scripts/build-skill-bundle.mjs` |
| 列挙したCLIのZIP収録と隔離環境での実行を検査する | `assets/agent-skills/tests/` |
| agentメタデータの `interface` と明示起動のpolicyを使う | `assets/agent-skills/templates/skill/agents/openai.yaml` |
| JDK 9以降ではJava SE 8のAPIへ制限する | `assets/java-straight-conversion/pom-cli-runtime.xml` のprofile |
| スキル自体の説明・レビュー・編集をプロジェクト作業と区別する | `SKILL.md`、`references/activation-policy.md` |
| レビューだけの依頼と、修正も含む依頼を区別する | `references/review/README.md`、`references/maintenance-workflow.md` |
| 監査案、実行手順、現行ルールを区別し、参照前提を場合分けする | `docs/maintenance/README.md`、`references/architecture-rules.md`、各workflow |

上表のパスは、特記がない場合、対象スキルからの相対パスである。
レビュー時は関連suiteの78件が成功した。これは当時の実測値であり、後続のテスト総数を78件に固定する仕様ではない。
当時のNode検査環境は26、Javaコンパイル検証環境はJDK 17だった。
Node 22/24のGitHub Actions run、Java 8での実行、独立したモデル評価は未実施である。Nodeのローカル実行は必須にしない。

## 3. 実施前に区別する判断事項

「この計画を実施して」という指示だけで、以下の数値・公開契約まで自動決定しない。
既存の合意が会話や決定記録にあればそれを使い、同じ確認を繰り返さない。
未決定の項目は、依存しない作業を先に進めて最後に報告する。

| ID | 判断内容 | 決定がない場合の扱い |
| --- | --- | --- |
| D-NODE | 製品のNode最低版と検証対象 | 2026-10-22承認：最低版はNode.jsが保守中のLTSのうち、製品が対応を約束する最古のライン。CIでは最低版と最新LTSを検証し、中間の保守中LTSも可能な範囲で加える |
| D-JAVA | Java最低版と検証対象 | 2026-10-22承認：Java 8を標準の最低runtimeとし、Java 8と選択した配布元の最新LTSで実行確認する。ビルドJDKは別に選定し、配布元のサポート期間も確認する |
| D-PATH | 既存の公開参照パスを新しい分類へ移すか | 現行ファイル内で整理する。移動・削除・互換stubへの置換をしない |
| D-INTEGRITY | 公開checksum形式とasset命名規則を変更するか | 公開名・checksum形式を維持する。ローカルで同一バイト列を比較する検証は可能 |
| D-DEPLOY | 修正後のスキルをローカル配備先へ同期するか | 正本の修正・検証までとする |
| D-EVAL | 別モデル等による独立した実行評価をするか | 判断事例の机上確認までとし、モデル挙動の実証とは報告しない |

現行スターターの数値snapshotは2026-10-22時点で、Node 22を最低版、Node 24を最新LTSおよびRelease build hostとする。Node 20はEOLのため標準の最低版にしない。
新しいstarter作成やbaseline更新では[Node.js公式release schedule](https://github.com/nodejs/Release#release-schedule)を確認し、最新LTSの確認対象と最低ラインの保守期限を個別に更新する。現行値を日付なしの固定方針として扱わない。

## 4. 作業一覧と依存関係

| 作業ID | 作業 | 前提 | 完了時に残すもの |
| --- | --- | --- | --- |
| LUNA-00 | 作業状態と検証環境を確定する | 実施指示 | 対象・既存差分・利用可能環境・基準検査の記録 |
| LUNA-01 | 重複とルールの担当箇所を棚卸しする | 00 | ルール対応表と整理対象一覧 |
| LUNA-02 | 現行パスを保って重複を整理する | 01 | 内容を保った文書差分、参照・判断事例の確認 |
| LUNA-03 | 最終配布物と未検証環境の検証を補う | 00。02とは独立して実施可 | starterの意味のある回帰検査と実行結果 |
| LUNA-04 | Node基準の変更を反映する | 01、D-NODE決定 | 文書・starter・CI・最終成果物検証の整合した差分 |
| LUNA-05 | 必要なら参照パスを移行する | 02、D-PATH決定 | 新パス、旧パス互換、caller確認 |
| LUNA-06 | 全体確認と引継ぎ、必要なら同期 | 実施対象の作業完了 | 最終diff、検証記録、残件、依頼があれば同期結果 |

通常の最初の実施範囲は00〜03と06とする。04・05は対応する決定がある場合だけ追加する。
各作業が完了するたびに、差分と結果を短く記録する。指定範囲内の次作業へ進むための再承認は不要である。

## 5. LUNA-00：作業状態と環境の確定

1. 正本へ移動し、`git status --short`、`git diff --stat`、`git rev-parse HEAD` を確認する。
2. 既存の差分と今回の対象を記録する。前回レビューの変更が未コミットでも、それ自体を作業不能の理由にしない。
3. 対象ファイルに並行作業があれば、変更箇所を照合する。`reset`、`restore`、自動stashで差分を消さない。
4. `node --version`、`npm --version`、`java -version`、`javac -version`、`mvn -v` を記録する。
5. 実行可能な範囲で、既存の `npm run test:skill-index-policy` を1回実行して基準結果を記録する。
6. 不足するNode/JDKがあれば一覧化する。別バージョンの成功を、不足するバージョンでの成功として扱わない。

変更ファイルは、原則として対象スキルと関連する参照・starter検査に限定する。
リポジトリ全体のversion、他スキル、兄弟repo、ユーザー環境設定は、この作業のためには変更しない。

完了条件：対象と既存差分を区別でき、これから実施する作業IDと、保留する判断IDが明記されている。

## 6. LUNA-01：ルールの担当箇所と重複の棚卸し

成果物として、この計画書と同じディレクトリに `2026-10-22-rule-ownership.md` を作る。
以下の列を持つ表で、まず実際に整理する項目を記録する。

`ルールID | 現在の説明箇所と見出し | 内容の担当箇所 | 呼出側に残す要約 | 保持すべき例外 | 整理状況`

担当箇所は、次を初期案とし、現物の責務に照らして決定する。

| ルール群 | 主に担当するファイル | 呼出側の扱い |
| --- | --- | --- |
| このスキルの起動条件・継続・メタ作業 | `references/activation-policy.md` | `SKILL.md` には選択に必要な要約を残す |
| モード選択・どの資料を読むか | `SKILL.md` | 各workflowにはその作業固有の前提だけを残す |
| 製品の意味の所有・層の境界・資料間の関係 | `references/architecture-rules.md` と各層のbasic文書 | overviewは層の関係を説明し、詳細規則を再定義しない |
| リポジトリ操作・GitHub操作の担当 | `references/repo-operations.md` | 個別手順に必要な短い注意とリンクは残せる |
| Node製品・Web・Java・Maven・Skill・MCPの固有規則 | 対応する `references/miku-soft-basic/` の既存文書 | workflowは実施順、必要入力、検証の呼出を担当する |
| Javaへのstraight conversion | basicの `miku-soft-30-straight-conversion.md` | `30-java-straight-conversion-workflow.md` は実施手順を担当する |
| CLIの共通説明・生成物・上書き・診断 | `references/miku-soft-ai-era-cli-interface.md` | 各層固有の差分を残す。既存製品の終了コード等を一律変更しない |
| Markdown front matterの共通方針 | `references/miku-soft-ai-era-markdown-front-matter.md` | 製品固有の読取schemaや例外を保持する |
| maintenance upliftの実施手順 | `docs/maintenance/adoption-workflow.md` | dated auditの提案を現行ルールへ昇格させない |
| 製品名・過去の実装例・参照時点 | 既存catalog、basic内の明示された製品固有節 | 歴史的な観察と現在の必須規則を混同しない |
| Node等の具体的version値 | D-NODE決定前は既存の担当箇所を維持 | 数値を含む整理は04でまとめて実施する |

同じ単語が登場するだけの箇所を重複として削らない。例えば「GitHubは人が担当する」という共通方針と、命名後に人がrepoを作るという具体的な次手順は役割が異なる。
短い要約、読み先を選ぶ説明、離れた手順で必要な注意は残してよい。

完了条件：削る文章ごとに、その意味・例外がどこへ残るかを示せる。読みやすさを損なう固定の削減率や行数目標は設けない。

## 7. LUNA-02：現行パスを保った文書整理

一度に全basic文書を書き直さず、次の順に小さく整理する。

1. 起動・モード・repo操作：`SKILL.md`、activation、repo-operations、maintenance、reviewの入口。
2. Agent Skills：`40-agent-skills-workflow.md` と `miku-soft-40-agentskills-design.md`。
3. Node/Web：`10-node-app-workflow.md`、`11-web-app-workflow.md` と対応するbasic。
4. Java：`30-java-straight-conversion-workflow.md`、basic 20/21/30。
5. MCP、overview、共通CLI/front matter：前段との重複がある箇所だけを整理する。

各組で、以下を実施する。

1. LUNA-01の表で当該ルールと例外を確認する。
2. 規範として説明する文章を担当箇所へ集める。異なる条件の文章は条件を残して並べる。
3. 呼出側には、その場の判断に必要な要約と、読み先・読む条件を残す。
4. リンク先を開かないとモードすら選べない構造や、関連資料の全読込を必須にする構造を避ける。
5. 移動した内容を旧文面と比較し、例外・人の担当範囲・診断・artifactの役割が消えていないか確認する。
6. 既存の見出しへのcallerを検索する。参照されるanchorを消す場合は、見出しか同名anchorを残す。
7. 対応表の整理状況と確認結果を更新する。

この作業では、ファイル名の変更、旧参照パスの削除、Node最低版変更、公開asset改名、checksum形式変更を行わない。
`SKILL.md` は全設計文書の要約集にせず、起動・対象判定・主要制約・参照導線を担わせる。

完了条件：現行パスから必要な規則へ到達でき、整理前後で同じ依頼に対する作業範囲が変わらない。
この時点では参照到達性と机上判断を確認し、モデルの振る舞いを検証済みとは言わない。

## 8. LUNA-03：最終成果物と実行環境の検証補完

### 8.1 最終ZIPを展開した状態の検査

主対象は以下である。

- `assets/agent-skills/tests/isolated-bundle-smoke.test.mjs`
- `assets/agent-skills/tests/release-bundle-contents.test.mjs`
- `scripts/skill-reference-routing.test.mjs`（repoルート）
- 必要になった場合だけ、関連するbundle生成script

現在の隔離smokeは生成ディレクトリをコピーしている。実際に配布するZIPをbuildし、一時ディレクトリへ展開したファイルを検査するよう変更する。

1. `build:bundle:zip` を呼び、package versionから生成されたZIPの所在を得る。
2. テスト専用の一時ディレクトリへ展開する。
3. ZIP内の `skills/<skill-name>/` から、`skillRuntimeArtifacts` の各CLIを解決する。
4. 作業ディレクトリを一時ディレクトリにして各CLIの `--version` を実行する。
5. 元のsource checkoutのパスやcwdに依存していないことを確認する。
6. 各テストが作った一時ディレクトリは、そのテストの終了処理で片付ける。

既存の「必須ファイル欠落」「壊れたCLI」「runtime不要のSkill」の検査を保持する。
テスト内から同じテスト一式を再帰呼出ししない。共有bundle出力を使う間は `--test-concurrency=1` を維持する。

### 8.2 starter用fixtureを増やす条件

意味のある失敗を検出する、次の事例を用意する。

| 事例 | 期待結果 |
| --- | --- |
| runtime不要で宣言が空配列 | ZIPの構造検査が成功。runtime実行は要求しない |
| 必須CLIが欠落または空 | 配布bundle作成が失敗する |
| 正常なNode CLI | 展開済みCLIのmetadata操作とfixture上の小さな実操作が成功する |
| NodeとJavaの両方を必須と宣言し、片方が欠落 | 成功扱いにしない |
| ファイルはあるが実行失敗するCLI | 隔離smokeが失敗する |
| ZIPから必須ファイルを欠落させた配布物 | ZIPの構造・内容検査が失敗する |
| Release用に名前を付け直したZIP | 名前変更後のZIPを展開しても同じ検査に成功する |

ZIP欠落の事例では、検査関数へ壊したZIPを直接渡す。検査時に正常ZIPを再生成して欠落を隠さない。
必要ならZIP検査を「buildする処理」と「指定ZIPを調べる処理」に分ける。
Node/Javaのfixtureは小さく自己完結したものを一時領域で作り、実製品runtimeの更新・ダウンロード・同梱はしない。
ネットワーク、DB、外部サービスを要求しない。見出しや文章の完全一致だけのテストを増やさない。

### 8.3 JavaとNodeの環境確認

Javaは、テンプレートの実際のcompiler設定を使って以下を確認する。

1. サポートする新しいbuild JDK上でJava 8対応コードがコンパイルできる。
2. 同設定で `List.of` 等のJava 8にないAPIがコンパイルエラーになる。
3. Java 8実行環境が用意できる場合、生成した最小runtimeの `--version` と小さな実操作が成功する。
4. Java 8上でのビルドも保証するなら、profileが発動しない経路を別途確認する。

前回のコンパイルfixtureは依存ライブラリと配布pluginを省いた検証だった。compilerの成功を、全starter配布buildや実製品のJava 8互換性の証明に置き換えない。
全starterをbuildする検査を追加する場合は、README等のassembly必須入力と最小main classをfixtureへ明示的に用意する。

Nodeは、現行の最低版とReleaseビルド版をGitHub Actionsで区別して実行する。ローカルで利用可能なNode versionが限られていても、Actionsのmatrixと最終artifact smokeを正式なversion互換性確認として扱う。
対象workflowが実行されていない場合は、その結果を未確認と記録し、Actions上の実行結果が得られるまで互換性を実証済みとしない。

完了条件：配布ZIPからの実行を確認でき、成功・失敗事例と実際に使ったNode/JDKが記録されている。
GitHub Actionsでのupload・dispatchは、この検査に含めない。

## 9. LUNA-04：承認済みNode基準の一括整合

**D-NODEは2026-10-22に決定済み。** 共有workflow・設計書とAgent Skills/Web starterの仕様値を整合させた。Agent Skillsのpush/PR CIはNode 22/24のmatrixで`npm run build`を実行する。Release workflowはNode 24でbuild後、リリース名でstagingしたZIPをNode 22に切り替えて検査してからassetをuploadする。今回はGitHub Actionsを起動していないため、Actionsの実結果は未確認である。ローカルのNode 22/24実行は必須にせず、兄弟リポジトリへの適用は未実施である。

少なくとも次の5項目を別々に記録する。

`製品の最低Node | repo/toolingの最低Node | CIのversion集合 | Release build host | 最終成果物を検証するNode`

ブラウザ実行環境と、GitHub Action内部のNodeは別の欄として扱う。
Node用bundle compilerのtargetがある製品では、そのtargetも最低版と整合させる。
このスキルに存在しない製品側の設定ファイルを、存在すると仮定して変更しない。

### 9.1 変更対象

1. `references/10-node-app-workflow.md` のcompatibility方針・Release説明・YAML例。
2. `references/40-agent-skills-workflow.md` のstarter説明・CI説明・checklist。
3. `references/miku-soft-basic/miku-soft-40-agentskills-design.md` のRelease/runtime説明。
4. `assets/agent-skills/package.json` の `engines.node`。
5. `assets/agent-skills/.github/workflows/ci.yml` のmatrix。
6. 同 `release-build.yml` のbuild版と、最終成果物の最低版での検証。
7. `assets/web-app/package.json` と `assets/web-app/scripts/stage-web-release-assets.mjs`。Web製品のbrowser runtimeではなくbuild/tooling要件として扱う。
8. Node main appとWebのRelease workflow assetも実在すれば確認する。今回のcheckoutには該当workflow assetがないため、存在を仮定して追加しない。

### 9.2 具体的な進め方

1. 上記の現行値を表にし、D-NODEの値と比較する。
2. Nodeの数値と最低ラインの意味は、ルール所有表で指定されたAgent Skills designのNode基準節に記録する。
3. workflowは役割・更新条件と設計書への参照を持つ。実行可能なYAML例・starter assetの数値は、現在の公式LTS状態に一致させる。
4. packageの最低版とCIの最低版を合わせる。上限の追加は、具体的な非互換理由がない限り行わない。
5. Releaseは採用build版で作成し、その最終stagedファイルを採用最低版へ切り替えて検証する。
6. Skillは最終ZIPをrelease用の名前にstageした後、その同じZIPをNode 22で展開し、宣言済みCLIの`--version`を実行する。検査scriptを通常のstarter suiteからも呼び、名前変更ZIPと必須entryを欠落させたZIPで回帰検査する。
7. Webはtoolingの最低版でbuildできることと、生成HTMLの契約を確認する。HTMLをNode CLIとして実行しない。
8. 最低版で実行できない外部runtimeを必要とする場合は、原因と例外を明記する。兄弟製品のruntimeを無断更新しない。
9. 現行資料を検索し、採用値と矛盾する記述が残っていないことを確認する。dated auditやレビュー記録の過去の実測値は置換しない。

Action majorの更新は、各Actionの公式情報を確認する。`setup-node` の指定だけでAction内部のNodeも切り替わったと扱わない。
公開asset名、tag形式、checksum方式、Release作成の担当は、このversion整合と同時に変更しない。

実装条件：採用した最低版をmetadataとCIで宣言し、配布する最終成果物を最低版で検証するworkflowを持つ。今回のAgent Skills starterはこのstepを追加済み。正式な検証結果はGitHub ActionsのmatrixとRelease artifact smokeから得る。Actions runがまだない場合はworkflow実装済み・実行結果未確認と報告し、ローカルの別Node versionを必須条件にしない。

## 10. LUNA-05：必要な場合だけ参照パスを移行

開始条件はD-PATH決定である。[既存の分類案](2026-07-31-reference-actions-audit/numbering-and-structure-plan.md)を参照する。
判断がなければLUNA-02の現行パス整理で完了とし、この節を追加しない。

1. `旧パスとanchor | 新パスとanchor | 参照元 | 互換の残し方` の移行表を作る。
2. 新しい担当ファイルを追加し、内容・例外がそろってから内部リンクを切り替える。
3. 旧パスは互換用の案内を残す。参照されるanchorも残し、単にファイルが存在するだけの互換にしない。
4. `scripts/skill-reference-routes.mjs` の当該スキルの既存行を更新し、必要な複数のtargetを列挙する。同じskill名の行を追加して解決したことにしない。
5. sourceに加え、コピーしたスキル単体からも新旧両方の導線を確認する。
6. 兄弟repoのcallerは参照一覧に記録する。兄弟repoのリンク変更は別の実施指示に分ける。

互換stubを削除する時期は、この移行で決めつけない。既存indexの採用状況を確認し、未採用のスキルへ `index.json` を新設しない。

完了条件：旧パス・必要anchorが機能し、新しい担当箇所へ到達できる。参照移行と製品方針変更の差分が混ざっていない。

## 11. 指示の判断事例

LUNA-02の前後に、以下の依頼で判断が変わっていないかを確認する。
期待結果の単語一致をテストするのではなく、作業範囲・読込先・書込の有無を確認する。

| 依頼例 | 期待する行動 |
| --- | --- |
| スキル名の単独呼出し | 作業内容が未指定なら短く確認する。cwdだけで保守を開始しない |
| 「このスキルを理解して」 | スキル資料を読み説明する。アプリのモード選択を要求しない |
| 「このスキルをレビューして」 | スキル自体をレビューする。プロジェクトのupliftを開始しない |
| 「このスキルをレビューし、不整合も修正して」 | 指摘の根拠を確認して対象内を修正する。別のモード切替確認を要求しない |
| 明示起動なしで一般的な実装依頼 | このスキルのproject workflowを自動起動しない。別途許可された通常作業まで止めない |
| 明示起動後のコンセプト相談 | 会話上で構想・名称を詰める。将来repoのファイルを作らない |
| 既存repoのレビューだけを依頼 | 調査・指摘を行う。無関係な保守を実装しない |
| 既存repoの保守を具体項目なしで依頼 | 既知の対象から、承認済みで局所検証可能な範囲を選ぶ。保留中の監査案を採用しない |
| Skill-only製品の作成依頼 | 成果物を分類し、存在しないupstream CLI/runtimeを前提にしない |
| 参考sister repoの指定なし | 利用可能な資料を調べ、定義済みfallbackを使う。必要な判断ができない場合だけ確認する |
| 「計画を詳細化して。実施は今しない」 | 計画文書だけを更新し、実装・検証suite・同期を実行しない |

この表の机上確認と、独立モデルを動かす評価は別である。
D-EVALを実施する場合は、対象skillと最小fixture、利用者依頼を渡し、想定答えを先に与えずに行動と生成物を評価する。
実施条件・使用モデル・実施したケース・失敗ケースを記録し、未実施ケースを成功扱いにしない。

## 12. LUNA-06：検査・記録・完了報告

以下はLUNA-06の最終確認に使うコマンドである。計画の作成時点では実行しない。

~~~sh
cd /Users/igapyon/Documents/git/igapyon-agent-skills
node --test scripts/skill-reference-routing.test.mjs
npm run test:skill-index-policy
python3 /Users/igapyon/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/igapyon-miku-soft-developer
git diff --check -- skills/igapyon-miku-soft-developer scripts/skill-reference-routing.test.mjs scripts/skill-reference-routes.mjs
git status --short
~~~

局所変更では関連検査から実行し、最終的な変更後に関連suiteをまとめて確認する。
同じ内容で成功したsuiteを理由なく繰り返さない。追加したscriptには動作確認を行う。
`quick_validate.py` が別の場所にある環境では、実際のskill-creator同梱scriptを使う。
テスト不足の解消を、無関係なsuiteの大量実行や文面のregex検査へ置き換えない。

変更したMarkdownの相対リンクと必要anchorを、実ファイルに照らして確認する。
ソース経由のリンク検査と、ZIP経由の検査と、モデル判断の確認を別々に報告する。
失敗が既存差分に由来するときは、根拠を示して今回の変更と分け、無関係な修正を広げない。

この計画と同じディレクトリに `2026-10-22-luna-execution-record.md` を作り、作業IDごとに次を記録する。

`実施日 | 基点commitと既存差分 | 実施ID | 変更ファイル | 判断IDと採用値 | 検査コマンド・環境・結果 | 未実施事項 | 次の作業`

新しい実施結果は実施記録へ追加する。過去のレビュー記録を、後日の結果が当時実施済みだったように書き換えない。
既存のroot TODO/HANDOFFに今回の作業を記録する慣行があれば、今回の結果だけを追記し、別作業の記録を置換しない。

D-DEPLOYについて同期指示がある場合だけ、正本の検査後に次を使う。

~~~sh
sh scripts/sync-codex-skill.sh --check igapyon-miku-soft-developer
sh scripts/sync-codex-skill.sh igapyon-miku-soft-developer
sh scripts/sync-codex-skill.sh --check igapyon-miku-soft-developer
~~~

同期前のcheckでインストール先独自の変更が見つかったら、その内容を保存・照合してから扱いを決める。
GitHub操作、commit、push、tag、Release、registry公開は、依頼されていなければ実施範囲へ加えない。

最終報告は、実施ID、改善した挙動、検証結果、未決定・未実施事項、同期の状態を短く示す。
既存の別作業を保持したことも確認する。

## 13. 判断後に作業を再開する場合の指示例

LUNA-00〜04と06は実施済みである。Agent Skills Release workflowにNode 22で最終staged ZIPをsmokeするstepを追加した。Node 22/24のGitHub Actions run結果、またはD-PATHの判断が必要な場合は該当する残件だけを実施する。ローカルのNode 22/24実行は不要である。

~~~text
igapyon-agent-skills の正本で、次の計画と実施記録を読んでください。
skills/igapyon-miku-soft-developer/docs/maintenance/2026-10-22-luna-implementation-plan.md
skills/igapyon-miku-soft-developer/docs/maintenance/2026-10-22-luna-execution-record.md

今回は判断済みの作業IDだけを実施してください。完了済みのLUNA-00〜04と
LUNA-06は再実装せず、既存の実施記録を引き継いでください。
Node 22/24のGitHub Actions実行結果がまだなければ未確認として扱ってください。ローカルのNode version切替は必須にしないでください。
公開名・checksum、参照パス移行は、対応する判断が記録されていない限り変更しないでください。
スキル自体の保守として扱い、他のスキル・兄弟repo・配備先・GitHubは
明示された範囲を超えて変更しないでください。
~~~
