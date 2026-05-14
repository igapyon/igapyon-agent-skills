## [miku-xlsx2md] CLI / Maven plugin リファレンス

- 掲載先: Qiita
- URL: https://qiita.com/igapyon/items/244816e412da0d17adc7

---
title: [miku-xlsx2md] CLI / Maven plugin リファレンス
tags: mikuku Markdown XLSX Java 生成AI
author: igapyon
slide: false
---
## はじめに

`miku-xlsx2md` は、Excel の `.xlsx` workbook を Markdown に変換するツールです。

この記事では、`miku-xlsx2md` ファミリーの CLI と Maven plugin の使い方をリファレンス形式で整理します。

対象にする実行形態は次の通りです。

- Node CLI: [`miku-xlsx2md`](https://github.com/igapyon/miku-xlsx2md)
- Java CLI: [`miku-xlsx2md-java`](https://github.com/igapyon/miku-xlsx2md-java)
- Maven plugin: `miku-xlsx2md-java` に含まれる `miku-xlsx2md-maven-plugin`

Node / browser 版の source は [`miku-xlsx2md`](https://github.com/igapyon/miku-xlsx2md) から、Java CLI / Maven plugin の source は [`miku-xlsx2md-java`](https://github.com/igapyon/miku-xlsx2md-java) から入手できます。

## コマンド形式

### Node CLI

Node CLI は、`miku-xlsx2md` の source checkout 上で実行します。

```sh
npm run cli -- --help
npm run cli -- <input.xlsx> [options]
```

基本は、1 回につき 1 つの `.xlsx` workbook を入力し、Markdown または ZIP を file に出力します。

### Java CLI

Java CLI は、`miku-xlsx2md-java` の CLI jar を使って実行します。

```sh
java -jar miku-xlsx2md-0.9.0.jar --help
java -jar miku-xlsx2md-0.9.0.jar <input.xlsx> [options]
java -jar miku-xlsx2md-0.9.0.jar --input-directory <dir> [options]
```

Java CLI では、単一 workbook 変換に加えて、directory 配下の `.xlsx` をまとめて変換できます。

### Maven plugin

Maven plugin の goal は、単一 workbook 用の `convert` と、directory 一括変換用の `convert-directory` です。

```sh
mvn -N jp.igapyon:miku-xlsx2md-maven-plugin:0.9.0:convert
mvn -N jp.igapyon:miku-xlsx2md-maven-plugin:0.9.0:convert-directory
```

## Node CLI パラメータ一覧

| パラメータ | 必須 | 複数指定 | 既定値 | 説明 |
| --- | --- | --- | --- | --- |
| `<input.xlsx>` | はい | いいえ | なし | 入力にする `.xlsx` workbook を指定します。 |
| `--out <file>` | いいえ | いいえ | 入力 workbook 名由来の Markdown file | 結合済み Markdown の出力先 file を指定します。 |
| `--zip <file>` | いいえ | いいえ | なし | Markdown と asset を含む ZIP の出力先 file を指定します。 |
| `--output-mode <display\|raw\|both>` | いいえ | いいえ | `display` | Markdown に出力する値の扱いを指定します。 |
| `--formatting-mode <plain\|github>` | いいえ | いいえ | `github` | rich text の Markdown / HTML 反映方法を指定します。 |
| `--table-detection-mode <balanced\|border\|planner-aware>` | いいえ | いいえ | `balanced` | 表検出の mode を指定します。 |
| `--encoding <value>` | いいえ | いいえ | `utf-8` | 出力 encoding を指定します。`utf-8`, `shift_jis`, `utf-16le`, `utf-16be`, `utf-32le`, `utf-32be` を指定できます。 |
| `--bom <off\|on>` | いいえ | いいえ | `off` | BOM の有無を指定します。`shift_jis` では `on` を指定できません。 |
| `--shape-details <include\|exclude>` | いいえ | いいえ | `exclude` | 図形の source details を出力に含めるかを指定します。 |
| `--include-shape-details` | いいえ | いいえ | `false` | `--shape-details include` の alias です。 |
| `--no-header-row` | いいえ | いいえ | `false` | 先頭行を table header として扱いません。 |
| `--no-trim-text` | いいえ | いいえ | `false` | 文字列の前後空白を維持します。 |
| `--keep-empty-rows` | いいえ | いいえ | `false` | 空行を維持します。 |
| `--keep-empty-columns` | いいえ | いいえ | `false` | 空列を維持します。 |
| `--summary` | いいえ | いいえ | `false` | sheet ごとの summary を stdout に表示します。 |
| `--help` | いいえ | いいえ | なし | ヘルプを表示します。 |

## Java CLI パラメータ一覧

Java CLI の単一 workbook 変換で使う主なパラメータは、Node CLI と同じです。

Java CLI では、次の directory 変換オプションも利用できます。

| パラメータ | 必須 | 複数指定 | 既定値 | 説明 |
| --- | --- | --- | --- | --- |
| `--input-directory <dir>` | directory 変換では必須 | いいえ | なし | 配下の `.xlsx` file を変換する入力 directory を指定します。 |
| `--output-directory <dir>` | いいえ | いいえ | 入力 file と同じ directory | directory 変換時の Markdown 出力先 directory を指定します。 |
| `--recursive` | いいえ | いいえ | `false` | `--input-directory` 配下を再帰的に探索します。 |
| `--verbose` | いいえ | いいえ | `false` | 処理中の workbook path を stderr に表示します。 |

Java CLI で `--input-directory` を指定する場合、`--out` と `--zip` は利用しません。directory 変換では、Markdown file が出力されます。

## Maven plugin パラメータ一覧

### `convert` goal

| property | 必須 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `miku-xlsx2md.inputFile` | はい | なし | 入力にする `.xlsx` workbook を指定します。 |
| `miku-xlsx2md.outputFile` | いいえ | workbook 名由来の Markdown file | Markdown の出力先 file を指定します。 |
| `miku-xlsx2md.outputMode` | いいえ | `display` | 出力値の mode を指定します。 |
| `miku-xlsx2md.formattingMode` | いいえ | `plain` | rich text の出力 mode を指定します。 |
| `miku-xlsx2md.tableDetectionMode` | いいえ | `balanced` | 表検出 mode を指定します。 |
| `miku-xlsx2md.encoding` | いいえ | `utf-8` | Markdown 出力の encoding を指定します。 |
| `miku-xlsx2md.bom` | いいえ | `off` | BOM の有無を指定します。 |
| `miku-xlsx2md.skip` | いいえ | `false` | `true` の場合、変換をスキップします。 |
| `miku-xlsx2md.verbose` | いいえ | `false` | Maven log に処理対象 workbook path を表示します。 |

### `convert-directory` goal

| property | 必須 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `miku-xlsx2md.inputDirectory` | はい | なし | 入力にする directory を指定します。 |
| `miku-xlsx2md.outputDirectory` | いいえ | 入力 file と同じ directory | Markdown の出力先 directory を指定します。 |
| `miku-xlsx2md.recursive` | いいえ | `false` | 入力 directory 配下を再帰的に探索します。 |
| `miku-xlsx2md.outputMode` | いいえ | `display` | 出力値の mode を指定します。 |
| `miku-xlsx2md.formattingMode` | いいえ | `plain` | rich text の出力 mode を指定します。 |
| `miku-xlsx2md.tableDetectionMode` | いいえ | `balanced` | 表検出 mode を指定します。 |
| `miku-xlsx2md.encoding` | いいえ | `utf-8` | Markdown 出力の encoding を指定します。 |
| `miku-xlsx2md.bom` | いいえ | `off` | BOM の有無を指定します。 |
| `miku-xlsx2md.skip` | いいえ | `false` | `true` の場合、変換をスキップします。 |
| `miku-xlsx2md.verbose` | いいえ | `false` | Maven log に処理対象 workbook path を表示します。 |

Maven plugin の `convert-directory` goal は ZIP 出力には対応していません。

## 基本的な使い方

### Node CLI で Markdown を出力する

Node CLI では、source checkout 上で `npm run cli --` の後ろに `miku-xlsx2md` CLI の引数を指定します。

```sh
npm run cli -- ./tests/fixtures/xlsx2md-basic-sample01.xlsx \
  --out ./output/basic.md
```

`--out` には、結合済み Markdown の出力先 file を指定します。

### Node CLI で ZIP を出力する

画像などの asset も含めて扱いたい場合は、ZIP 出力を使います。

```sh
npm run cli -- ./tests/fixtures/xlsx2md-basic-sample01.xlsx \
  --zip ./output/basic.zip
```

ZIP 内 entry の timestamp は固定されており、同じ入力と設定で再現しやすい出力になります。

### Node CLI で summary を表示する

変換内容を確認したい場合は、`--summary` を指定します。

```sh
npm run cli -- ./tests/fixtures/xlsx2md-basic-sample01.xlsx \
  --out ./output/basic.md \
  --summary
```

summary には、sheet ごとの table 数、narrative block 数、画像数、数式解決数などが表示されます。

### Java CLI で Markdown を出力する

Java CLI では、CLI jar に `.xlsx` workbook と出力先を指定します。

```sh
java -jar miku-xlsx2md-0.9.0.jar ./sample.xlsx \
  --out ./sample.md
```

ZIP 出力も利用できます。

```sh
java -jar miku-xlsx2md-0.9.0.jar ./sample.xlsx \
  --zip ./sample.zip
```

### Java CLI で directory 配下をまとめて変換する

directory 配下の `.xlsx` file をまとめて変換する場合は、`--input-directory` を使います。

```sh
java -jar miku-xlsx2md-0.9.0.jar \
  --input-directory ./xlsx \
  --output-directory ./markdown \
  --recursive \
  --verbose
```

`--output-directory` を省略した場合、Markdown file は入力 `.xlsx` file の隣に出力されます。

### output mode を切り替える

Markdown に出力する値の扱いを変えたい場合は、`--output-mode` を指定します。

```sh
npm run cli -- ./sample.xlsx \
  --out ./sample.md \
  --output-mode both
```

`display` は表示値寄り、`raw` は raw 値寄り、`both` は両方の情報を含める mode です。

### formatting mode を切り替える

Excel の rich text を GitHub 向けの Markdown / HTML として反映したい場合は、`github` mode を使います。

```sh
npm run cli -- ./sample.xlsx \
  --out ./sample.md \
  --formatting-mode github
```

`github` mode では、対応範囲内で `bold`、`italic`、`strike`、`underline`、セル内改行などを反映します。

### table detection mode を切り替える

表検出の挙動は `--table-detection-mode` で切り替えます。

```sh
npm run cli -- ./sample.xlsx \
  --out ./sample.md \
  --table-detection-mode border
```

`balanced` は汎用 heuristic、`border` は罫線領域重視、`planner-aware` は planner / calendar 系 layout-heavy sheet 向けの抑制 heuristic を追加する mode です。

### encoding と BOM を指定する

Markdown 出力の encoding と BOM を指定できます。

```sh
npm run cli -- ./sample.xlsx \
  --out ./sample-utf16be.md \
  --encoding utf-16be \
  --bom on
```

Shift_JIS 出力も指定できます。

```sh
npm run cli -- ./sample.xlsx \
  --out ./sample-sjis.md \
  --encoding shift_jis
```

`shift_jis` では BOM を指定できません。

### Maven plugin として実行する

Maven project では、Maven plugin として明示実行できます。

通常は、`miku-xlsx2md-java` の source がある位置で `mvn install` してから、利用側 project で plugin を指定します。

```sh
mvn install
```

`pom.xml` に plugin を書く場合は、たとえば次のように指定します。

```xml
<build>
  <plugins>
    <plugin>
      <groupId>jp.igapyon</groupId>
      <artifactId>miku-xlsx2md-maven-plugin</artifactId>
      <version>0.9.0</version>
    </plugin>
  </plugins>
</build>
```

単一 workbook を変換する場合は、`convert` goal を使います。

```sh
mvn -N jp.igapyon:miku-xlsx2md-maven-plugin:0.9.0:convert \
  -Dmiku-xlsx2md.inputFile=path/to/input.xlsx \
  -Dmiku-xlsx2md.outputFile=path/to/output.md
```

directory 配下をまとめて変換する場合は、`convert-directory` goal を使います。

```sh
mvn -N jp.igapyon:miku-xlsx2md-maven-plugin:0.9.0:convert-directory \
  -Dmiku-xlsx2md.inputDirectory=path/to/xlsx \
  -Dmiku-xlsx2md.outputDirectory=path/to/markdown \
  -Dmiku-xlsx2md.recursive=false \
  -Dmiku-xlsx2md.verbose=true
```

## 出力されるもの

`miku-xlsx2md` の主な出力は Markdown です。

必要に応じて ZIP 出力も使えます。

| 出力 | 説明 |
| --- | --- |
| Markdown | workbook 全体を Markdown としてまとめた出力です。 |
| ZIP | Markdown と画像などの asset をまとめた出力です。Node CLI と Java CLI の単一 workbook 変換で利用できます。 |
| summary | sheet ごとの変換 summary です。`--summary` で stdout に表示されます。 |

## 変換対象と割り切り

`miku-xlsx2md` は、Excel の見た目を完全再現するための tool ではありません。

`.xlsx` workbook を「画面再現対象」ではなく、「地の文、表、画像、リンク、数式由来の値、図形やグラフの情報を取り出す source」として扱います。

主に次の内容を Markdown 化します。

- 地の文
- table-like region
- 画像
- 外部 link / workbook 内 link
- rich text の一部
- 数式の cached value と、対応範囲内の解析結果
- グラフの設定情報
- 図形の source-oriented data

一方で、Excel の visual layout を忠実に再現することは目的にしていません。

## 注意点

Node CLI は、source checkout 上で `npm install` 後に `npm run cli -- ...` として実行します。

Java CLI / Maven plugin は、`miku-xlsx2md-java` 側で提供されます。

Node CLI と Java CLI では、directory 一括変換の有無が異なります。directory 一括変換は Java CLI / Maven plugin 側の機能です。

Maven plugin の `formattingMode` 既定値は plugin source 上では `plain` です。CLI の既定値は GUI と揃えて `github` です。CLI と Maven plugin の既定値を厳密に合わせたい場合は、Maven 側で `-Dmiku-xlsx2md.formattingMode=github` を明示します。

## まとめ

`miku-xlsx2md` ファミリーでは、Excel の `.xlsx` workbook を Markdown に変換できます。

Node CLI は、source checkout 上で単一 workbook 変換を手早く実行する入口です。

Java CLI は、jar 実行と directory 一括変換に対応しています。

Maven plugin を使うと、Maven project から単一 workbook 変換または directory 一括変換を明示実行できます。

## 想定読者

- `miku-xlsx2md` ファミリーの CLI 引数とオプションを確認したい人
- Excel workbook を Markdown に変換したい人
- Excel 文書を生成AI に渡しやすい形にしたい人
- Maven project から `.xlsx` 変換を明示実行したい人
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

- [`miku-xlsx2md`](https://github.com/igapyon/miku-xlsx2md)
- [`miku-xlsx2md-java`](https://github.com/igapyon/miku-xlsx2md-java)
- [`miku-xlsx2md` Web app](https://igapyon.github.io/miku-xlsx2md/)
- [`miku-soft-catalog`](https://github.com/igapyon/miku-soft-catalog)

## Appendix

この記事の整理時には、作業用ディレクトリに `miku-xlsx2md` と `miku-xlsx2md-java` の repository を clone し、Node CLI、Java CLI、Maven plugin の代表的な実行例を確認しました。実施日は 2026-05-09 です。

確認した内容は次の通りです。

- Node CLI の `--help`
- Node CLI の `--out` による Markdown file 出力
- Node CLI の出力先省略時の Markdown file 出力
- Node CLI の `--zip` による ZIP file 出力
- Java CLI の `--help`
- Java CLI の `--out` と `--summary` による Markdown file 出力
- Java CLI の `--input-directory`、`--output-directory`、`--recursive` による directory 変換
- `mvn package` による Java CLI jar と Maven plugin の build
- Maven plugin の `convert` goal
- Maven plugin の `convert-directory` goal

検証では、`xlsx2md-basic-sample01.xlsx` を入力に使い、Markdown と ZIP が出力されることを確認しました。

Node CLI の `--summary` では、table 数、narrative block 数、merged range 数、analyzed cell 数、formula resolved 数などが表示されることを確認しました。

Java 側では、`mvn package` により `miku-xlsx2md-0.9.0.jar` と `miku-xlsx2md-maven-plugin-0.9.0.jar` が生成され、Maven plugin smoke check で `convert` と `convert-directory` の出力 file が生成されることを確認しました。
