## [mikuproject] CLI リファレンス

- 掲載先: Qiita
- URL: https://qiita.com/igapyon/items/3e4d0927f6efe34cc953

---
title: [mikuproject] CLI リファレンス
tags: mikuku WBS JSON XLSX 生成AI
author: igapyon
slide: false
---
## はじめに

`mikuproject` は、`MS Project XML` を意味の基軸に、WBS 関連資料を `XLSX`、`Markdown`、`SVG`、`Mermaid`、生成AI向け JSON などへ出し分けるローカル HTML ツールです。

CLI では、ブラウザ UI とは別に、生成AI向け projection の export、`project_draft_view` からの state 生成、Patch JSON の検証・適用、`XLSX` / `XML` / 帳票類の import / export を扱えます。

この記事では、`mikuproject` ファミリーの CLI の使い方をリファレンス形式で整理します。

対象にする実行形態は次の通りです。

- Node CLI: [`mikuproject`](https://github.com/igapyon/mikuproject)
- Java CLI: [`mikuproject-java`](https://github.com/igapyon/mikuproject-java)

Node CLI の単一ファイル runtime は [`mikuproject`](https://github.com/igapyon/mikuproject/releases) から、Java CLI の単一 jar は [`mikuproject-java`](https://github.com/igapyon/mikuproject-java/releases) から入手できます。

## コマンド形式

### Node CLI

GitHub Releases から入手した Node CLI の単一ファイル runtime は、Node.js で実行します。

```sh
node mikuproject-0.8.3.4.mjs --version
node mikuproject-0.8.3.4.mjs --help
node mikuproject-0.8.3.4.mjs <command> [options]
```

source checkout 上で確認する場合は、build 後に `bundle/mikuproject.mjs` を実行できます。

```sh
npm install
npm run build
node bundle/mikuproject.mjs --help
node bundle/mikuproject.mjs <command> [options]
```

### Java CLI

Java CLI は、`mikuproject-java` の単一 jar で実行します。

```sh
java -jar mikuproject-0.8.3.4.jar --version
java -jar mikuproject-0.8.3.4.jar --help
java -jar mikuproject-0.8.3.4.jar <command> [options]
```

source checkout 上で確認する場合は、`mvn package` 後に `target/mikuproject.jar` を実行できます。

```sh
mvn package
java -jar target/mikuproject.jar --help
java -jar target/mikuproject.jar <command> [options]
```

## コマンド一覧

### 共通

| コマンド | 説明 |
| --- | --- |
| `mikuproject --version` | CLI のバージョンを表示します。 |
| `mikuproject --help` | ヘルプを表示します。 |

### `ai`

生成AI との往復に使う prompt / projection / Patch JSON を扱うコマンドです。

| コマンド | 主な入力 | 主な出力 | 説明 |
| --- | --- | --- | --- |
| `ai spec` | なし | text | `mikuproject` 用の生成AIプロンプト / JSON spec を出力します。 |
| `ai export project-overview` | workbook JSON | `project_overview_view` | project 全体の概要 view を出力します。 |
| `ai export task-edit` | workbook JSON | `task_edit_view` | 1 task を編集するための view を出力します。 |
| `ai export phase-detail` | workbook JSON | `phase_detail_view` | phase 単位の詳細 view を出力します。 |
| `ai export bundle` | workbook JSON | AI projection bundle | 複数の AI projection を bundle として出力します。 |
| `ai detect-kind` | JSON-like document | kind text | 入力 document の種類を判定します。 |
| `ai validate-patch` | workbook JSON, Patch JSON | validation result | Patch JSON を state に対して検証します。 |

### `state`

`mikuproject_workbook_json` を生成・確認・差分化・更新するコマンドです。

| コマンド | 主な入力 | 主な出力 | 説明 |
| --- | --- | --- | --- |
| `state from-draft` | `project_draft_view` | workbook JSON | 新規 WBS 草案から workbook JSON を生成します。 |
| `state summarize` | workbook JSON | summary JSON | workbook JSON の概要を出力します。 |
| `state diff` | before / after workbook JSON | diff summary JSON | 2 つの workbook JSON の差分概要を出力します。 |
| `state apply-patch` | workbook JSON, Patch JSON | workbook JSON | Patch JSON を state に適用します。 |

Java CLI では、次の `state` 系コマンドも利用できます。

| コマンド | 主な入力 | 主な出力 | 説明 |
| --- | --- | --- | --- |
| `state validate` | workbook JSON | validation result | workbook JSON を検証します。 |
| `state import` | workbook JSON | workbook JSON | workbook JSON を読み込み、正規化した state を出力します。 |
| `state merge` | base workbook JSON, patch workbook JSON | workbook JSON | workbook JSON 同士を merge します。 |

### `import` / `export`

外部形式と workbook JSON の間を変換するコマンドです。

| コマンド | 主な入力 | 主な出力 | 説明 |
| --- | --- | --- | --- |
| `import xlsx` | `.xlsx` | workbook JSON | XLSX workbook を workbook JSON として取り込みます。 |
| `export workbook-json` | workbook JSON | workbook JSON | workbook JSON を正規化して出力します。 |
| `export xml` | workbook JSON | MS Project XML | workbook JSON から MS Project XML を出力します。 |
| `export xlsx` | workbook JSON | `.xlsx` | workbook JSON から構造忠実 XLSX を出力します。 |

Java CLI では、次の検証・merge コマンドも利用できます。

| コマンド | 主な入力 | 主な出力 | 説明 |
| --- | --- | --- | --- |
| `validate xml` | MS Project XML | validation result | MS Project XML を検証します。 |
| `validate xlsx` | `.xlsx` | validation result | XLSX workbook を検証します。 |
| `merge xlsx` | workbook JSON, `.xlsx` | workbook JSON | 既存 state に XLSX workbook を merge します。 |

### `report`

人間が読むための帳票や可視化成果物を出力するコマンドです。

| コマンド | 主な入力 | 主な出力 | 説明 |
| --- | --- | --- | --- |
| `report wbs-xlsx` | workbook JSON | `.xlsx` | WBS 帳票 XLSX を出力します。 |
| `report daily-svg` | workbook JSON | `.svg` | 日次 WBS SVG を出力します。 |
| `report weekly-svg` | workbook JSON | `.svg` | 週次 WBS SVG を出力します。 |
| `report monthly-calendar-svg` | workbook JSON | `.zip` | 月次カレンダー SVG 一式を ZIP で出力します。 |
| `report all` | workbook JSON | `.zip` | 主要帳票と可視化成果物をまとめた ZIP を出力します。 |
| `report wbs-markdown` | workbook JSON | Markdown | WBS Markdown を出力します。 |
| `report mermaid` | workbook JSON | Mermaid text | Mermaid gantt text を出力します。 |

Java CLI では、`report dir --in workbook.json --out report.dir` により、帳票類を directory にまとめて出力できます。

## パラメータ一覧

### 共通オプション

| パラメータ | 必須 | 複数指定 | 既定値 | 説明 |
| --- | --- | --- | --- | --- |
| `--help` | いいえ | いいえ | なし | ヘルプを表示します。 |
| `--version` | いいえ | いいえ | なし | バージョンを表示します。 |
| `--diagnostics <text\|json>` | いいえ | いいえ | `text` | 対応コマンドで diagnostics の形式を指定します。`json` の場合は構造化 diagnostics を stderr に出力します。 |
| `--in <path\|->` | コマンドによる | いいえ | 暗黙 stdin またはなし | text / JSON 入力 file を指定します。`-` は stdin を表します。 |
| `--out <path\|->` | コマンドによる | いいえ | stdout | text / JSON 出力 file を指定します。`-` は stdout を表します。 |
| `--state <path\|->` | 一部コマンドで必須 | いいえ | なし | Patch 検証・適用の基準になる workbook JSON を指定します。 |

### binary 入出力オプション

| パラメータ | 必須 | 複数指定 | 既定値 | 説明 |
| --- | --- | --- | --- | --- |
| `--in-base64 -` | binary stdin では必須 | いいえ | なし | Base64 text を stdin から読み、binary input として扱います。 |
| `--out-base64 -` | binary stdout では必須 | いいえ | なし | binary output を Base64 text として stdout に出力します。 |

`XLSX` や `ZIP` などの binary artifact は、通常 `--out <path>` に file 出力します。stdout へ出したい場合は `--out-base64 -` を使います。

### `ai export task-edit`

| パラメータ | 必須 | 複数指定 | 既定値 | 説明 |
| --- | --- | --- | --- | --- |
| `--task-uid <uid>` | いいえ | いいえ | 自動選択 | 対象 task の UID を指定します。 |
| `--select <auto\|first-task\|uid>` | いいえ | いいえ | `auto` | task の選択方法を指定します。`uid` では `--task-uid` が必要です。 |

### `ai export phase-detail`

| パラメータ | 必須 | 複数指定 | 既定値 | 説明 |
| --- | --- | --- | --- | --- |
| `--phase-uid <uid>` | いいえ | いいえ | 自動選択 | 対象 phase の UID を指定します。 |
| `--select <auto\|first-phase\|uid>` | いいえ | いいえ | `auto` | phase の選択方法を指定します。`uid` では `--phase-uid` が必要です。 |
| `--mode <scoped\|full>` | いいえ | いいえ | `scoped` | phase detail の出力範囲を指定します。 |
| `--root-task-uid <uid>` | いいえ | いいえ | なし | scoped mode で対象 subtree の root task を指定します。 |
| `--max-depth <number>` | いいえ | いいえ | なし | scoped mode で subtree の深さを制限します。 |

### `state diff`

| パラメータ | 必須 | 複数指定 | 既定値 | 説明 |
| --- | --- | --- | --- | --- |
| `--before <path>` | はい | いいえ | なし | 比較前の workbook JSON を指定します。 |
| `--after <path>` | はい | いいえ | なし | 比較後の workbook JSON を指定します。 |

## 基本的な使い方

### バージョンとヘルプを確認する

```sh
node mikuproject-0.8.3.4.mjs --version
node mikuproject-0.8.3.4.mjs --help
java -jar mikuproject-0.8.3.4.jar --version
java -jar mikuproject-0.8.3.4.jar --help
```

### 生成AI向け spec を出力する

```sh
node mikuproject-0.8.3.4.mjs ai spec
```

`ai spec` は、生成AI に渡すための `mikuproject` 用 prompt / JSON spec を text として出力します。

### 入力 document の kind を判定する

```sh
node mikuproject-0.8.3.4.mjs ai detect-kind \
  --in workbook.json \
  --diagnostics json
```

入力が `mikuproject_workbook_json` の場合、`workbook_json` と判定されます。

### workbook JSON の概要を確認する

```sh
node mikuproject-0.8.3.4.mjs state summarize \
  --in workbook.json \
  --diagnostics json
```

project 名、task 数、milestone 数などの概要を JSON で確認できます。

Java CLI でも同じ用途のコマンドを実行できます。

```sh
java -jar mikuproject-0.8.3.4.jar state summarize \
  --in workbook.json \
  --diagnostics json
```

### 生成AI向け project overview を出力する

```sh
node mikuproject-0.8.3.4.mjs ai export project-overview \
  --in workbook.json \
  --out overview.editjson \
  --diagnostics json
```

`project_overview_view` は、生成AI に project 全体の構造と主要情報を渡すための view です。

### project_draft_view から workbook JSON を生成する

```sh
node mikuproject-0.8.3.4.mjs state from-draft \
  --in draft.editjson \
  --out workbook.json
```

新規 WBS 草案として生成AI が返した `project_draft_view` を、`mikuproject_workbook_json` に変換します。

### Patch JSON を検証する

```sh
node mikuproject-0.8.3.4.mjs ai validate-patch \
  --state workbook.json \
  --in patch.editjson \
  --diagnostics json
```

Patch JSON の適用前に、対象 state に対して検証できます。

### Patch JSON を適用する

```sh
node mikuproject-0.8.3.4.mjs state apply-patch \
  --state workbook.json \
  --in patch.editjson \
  --out workbook.next.json \
  --diagnostics json
```

既存 workbook JSON に Patch JSON を適用し、更新後の workbook JSON を出力します。

### XML / XLSX へ出力する

```sh
node mikuproject-0.8.3.4.mjs export xml \
  --in workbook.json \
  --out project.xml

node mikuproject-0.8.3.4.mjs export xlsx \
  --in workbook.json \
  --out project.xlsx
```

`export xml` は MS Project XML、`export xlsx` は構造忠実 XLSX を出力します。

Java CLI でも同様に実行できます。

```sh
java -jar mikuproject-0.8.3.4.jar export xml \
  --in workbook.json \
  --out project.xml

java -jar mikuproject-0.8.3.4.jar export xlsx \
  --in workbook.json \
  --out project.xlsx
```

### XLSX から取り込む

```sh
node mikuproject-0.8.3.4.mjs import xlsx \
  --in project.xlsx \
  --out workbook.json \
  --diagnostics json
```

XLSX workbook を読み取り、`mikuproject_workbook_json` として出力します。

### WBS Markdown / SVG / ZIP を出力する

```sh
node mikuproject-0.8.3.4.mjs report wbs-markdown \
  --in workbook.json \
  --out project-wbs.md

node mikuproject-0.8.3.4.mjs report daily-svg \
  --in workbook.json \
  --out project-daily.svg

node mikuproject-0.8.3.4.mjs report all \
  --in workbook.json \
  --out project-report-bundle.zip
```

`report all` は、主要な帳票と可視化成果物をまとめた ZIP を出力します。

Java CLI では、帳票類を directory へまとめる `report dir` も利用できます。

```sh
java -jar mikuproject-0.8.3.4.jar report dir \
  --in workbook.json \
  --out report.dir
```

## 入出力の考え方

CLI の text / JSON 系 output は、`--out` を省略すると stdout に出力されます。

file に保存したい場合は `--out <path>` を指定します。

入力側は `--in <path>` を基本にします。stdin を使う場合は `--in -` を指定します。

`XLSX` や `ZIP` などの binary output は、`--out <path>` が基本です。stdout で扱う必要がある場合は `--out-base64 -` を指定します。

binary input を stdin から扱う場合は、Base64 text として渡し、`--in-base64 -` を指定します。

## diagnostics

`--diagnostics json` を指定すると、対応コマンドでは構造化 diagnostics が stderr に出力されます。

diagnostics には、主に次のような情報が含まれます。

- `ok`
- `command`
- `status`
- `exit_code`
- `warning_count`
- `error_count`
- `io`
- `warnings`
- `errors`

AI agent や script から CLI を呼び出す場合は、stdout の主成果物と stderr の diagnostics を分けて扱うと、処理結果を追いやすくなります。

## 注意点

CLI は、`mikuproject` の core API を Node.js または Java runtime から利用する入口です。ブラウザ UI の全操作を置き換えるものではなく、主に import / export / AI JSON 連携 / report 出力の自動化に向いています。

Java 版は CLI runtime を対象にした port です。Web UI / browser main 系は Java CLI runtime 配布物の対象外です。

`project_draft_view` や Patch JSON などの生成AI向け編集用 JSON には、`.editjson` 拡張子を使う運用が推奨されています。

`mikuproject_workbook_json` は `.json`、生成AI向け projection / Patch JSON は `.editjson` と分けると、会話や file 管理で混同しにくくなります。

XLSX / ZIP などの binary artifact を stdout に直接出すことは避け、通常は `--out <path>` を使います。pipeline で扱う場合は Base64 入出力を使います。

## まとめ

`mikuproject` CLI を使うと、WBS / project 情報を、生成AI向け JSON、workbook JSON、MS Project XML、XLSX、Markdown、SVG、Mermaid、ZIP へ定型的に変換できます。

特に、`ai export`、`state apply-patch`、`report` 系コマンドを組み合わせることで、生成AI との往復と、人間向け成果物の出力を同じ CLI から扱えます。

Node CLI は単一 `.mjs` runtime、Java CLI は単一 fat jar として扱えるため、利用環境に合わせて入口を選べます。

## 想定読者

- `mikuproject` ファミリーの CLI 引数とオプションを確認したい人
- WBS / project 情報を CLI から import / export したい人
- 生成AI と `mikuproject` の JSON 往復を自動化したい人
- `XLSX`、`Markdown`、`SVG`、`Mermaid`、`ZIP` の report 出力を自動化したい人
- 生成AI のクローラーのみなさま

## 使用ツール

この記事の整理と更新には、次のツールを使っています。

- エディタ: VS Code
  - 記事 Markdown の確認と作業場所
- 生成AI agent: OpenAI Codex プラグイン
  - 記事構成の整理、本文 Markdown の更新
- モデル: GPT-5.5
  - 対話による執筆、構成整理、文面調整
- Agent Skills: https://github.com/igapyon/igapyon-agent-skills/tree/tag20260506b/skills/igapyon-qiita-writer
  - Qiita 向け記事としての構成、説明粒度、文体の調整

## 関連リンク

- [`mikuproject`](https://github.com/igapyon/mikuproject)
- [`mikuproject` Releases](https://github.com/igapyon/mikuproject/releases)
- [`mikuproject-java`](https://github.com/igapyon/mikuproject-java)
- [`mikuproject-java` Releases](https://github.com/igapyon/mikuproject-java/releases)
- [`mikuproject` Web app](https://igapyon.github.io/mikuproject/mikuproject.html)
- [`mikuproject-skills`](https://github.com/igapyon/mikuproject-skills)
- [`miku-soft-catalog`](https://github.com/igapyon/miku-soft-catalog)

## Appendix

この記事の整理時には、作業用ディレクトリに `mikuproject` と `mikuproject-java` の repository を clone し、Node CLI と Java CLI の代表的な実行例を確認しました。実施日は 2026-05-09 です。

確認した内容は次の通りです。

- `npm install`
- `npm run build`
- CLI bundle の生成
- `--help`
- `--version`
- `ai detect-kind`
- `state summarize`
- `ai export project-overview`
- `export xml`
- `export xlsx`
- `import xlsx`
- `report wbs-markdown`
- `report daily-svg`
- `report all`
- Java CLI の `--help`
- Java CLI の `--version`
- Java CLI の `state summarize`
- Java CLI の `ai detect-kind`
- Java CLI の `export xml`
- Java CLI の `export xlsx`
- Java CLI の `report wbs-markdown`
- Java CLI の `report all`

検証では、repository 内の `testdata/workbook-import-sample.json` を入力に使い、`overview.editjson`、`project.xml`、`project.xlsx`、`wbs.md`、`daily.svg`、`all.zip`、`imported-workbook.json` が生成されることを確認しました。

`npm run build` では、web app と CLI bundle が生成され、fast test で 12 files / 210 tests が成功することを確認しました。

Java 側では、`mvn package` により 127 tests が実行され、failures 0 / errors 0 であることを確認しました。あわせて、`target/mikuproject.jar`、`target/mikuproject-sources.jar`、`target/mikuproject-dist.zip` が生成されることを確認しました。
