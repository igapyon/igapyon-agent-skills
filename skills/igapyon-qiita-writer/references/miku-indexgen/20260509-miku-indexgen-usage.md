## [miku-indexgen] CLI / Maven plugin リファレンス

- 掲載先: Qiita
- URL: https://qiita.com/igapyon/items/415b54a06312cd971581

---
title: [miku-indexgen] CLI / Maven plugin リファレンス
tags: mikuku Node.js Java Maven 生成AI
author: igapyon
slide: false
---
## はじめに

`miku-indexgen` は、directory を走査して `index.json` を生成する CLI ツールです。

Markdown 出力を有効にした場合は、人間がざっと読むための `index.md` も生成します。

この記事では、`miku-indexgen` ファミリーの CLI と Maven plugin の使い方をリファレンス形式で整理します。

対象にする実行形態は次の通りです。

- Node CLI: [`miku-indexgen`](https://github.com/igapyon/miku-indexgen)
- Java CLI: [`miku-indexgen-java`](https://github.com/igapyon/miku-indexgen-java)
- Maven plugin: `miku-indexgen-java` に含まれる `miku-indexgen-maven-plugin`

Node CLI の単一ファイル runtime は [`miku-indexgen`](https://github.com/igapyon/miku-indexgen/releases) の GitHub Releases から、Java CLI の jar は [`miku-indexgen-java`](https://github.com/igapyon/miku-indexgen-java/releases) の GitHub Releases から入手できます。

## コマンド形式

### Node CLI

Node CLI は、`npx`、global install、または GitHub Releases の単一ファイル runtime で実行できます。

```sh
npx miku-indexgen --help
npx miku-indexgen --version
npx miku-indexgen --input-directory <dir> [options]
```

source checkout 上で確認する場合は、build 後に `dist/main.js` を実行できます。

```sh
npm install
npm run build
node dist/main.js --input-directory <dir> [options]
```

### Java CLI

Java CLI は、`miku-indexgen-java` の CLI jar を使って実行します。

```sh
java -jar miku-indexgen-1.1.2.jar --help
java -jar miku-indexgen-1.1.2.jar --input-directory <dir> [options]
java -jar miku-indexgen-1.1.2.jar --input-parent-directory <dir> [options]
```

Java CLI では、単一 directory の索引生成に加えて、親 directory 直下の子 directory ごとに `index.json` / `index.md` を生成できます。

### Maven plugin

Maven plugin の goal は、単一 directory 用の `index` と、親 directory 直下の子 directory ごとに処理する `index-child-directories` です。

```sh
mvn -N jp.igapyon:miku-indexgen-maven-plugin:1.1.2:index
mvn -N jp.igapyon:miku-indexgen-maven-plugin:1.1.2:index-child-directories
```

## CLI パラメータ一覧

Node CLI と Java CLI で共通する主なパラメータは次の通りです。

| パラメータ | 必須 | 複数指定 | 既定値 | 説明 |
| --- | --- | --- | --- | --- |
| `--input-directory <dir>` | `--input-parent-directory` を使わない場合は必須 | いいえ | なし | 走査対象 directory を指定します。Node CLI ではこの指定が必須です。 |
| `--output-directory <dir>` | いいえ | いいえ | 入力 directory | `index.json` と任意の `index.md` の出力先 directory を指定します。 |
| `--title <text>` | いいえ | いいえ | なし | 生成する JSON の root に `title` を追加します。 |
| `--markdown` | いいえ | いいえ | `false` | `index.md` も生成します。 |
| `--no-generator` | いいえ | いいえ | `false` | 生成する JSON から `generator` metadata を省略します。 |
| `--json-summary-path <paths>` | いいえ | いいえ | なし | JSON file の `summary` 抽出に使う JSON Pointer をカンマ区切りで指定します。例: `/title,/name` |
| `--no-recursive` | いいえ | いいえ | `false` | 入力 directory 配下の再帰走査を無効にします。 |
| `--no-overwrite` | いいえ | いいえ | `false` | 出力 file が既にある場合、書き込みをスキップします。 |
| `--include-ext <exts>` | いいえ | いいえ | `md,json` | 対象拡張子をカンマ区切りで指定します。例: `md,json` |
| `--input-encoding <encoding>` | いいえ | いいえ | `utf8` | 入力テキストの encoding を指定します。`utf8`, `shift_jis` を指定できます。 |
| `--output-encoding <encoding>` | いいえ | いいえ | `utf8` | 出力テキストの encoding を指定します。`utf8`, `shift_jis` を指定できます。 |
| `--verbose` | いいえ | いいえ | `false` | 走査状況や処理時間などの詳細ログを出力します。 |
| `--help`, `-h` | いいえ | いいえ | なし | ヘルプを表示します。 |

Java CLI では、次の追加パラメータも利用できます。

| パラメータ | 必須 | 複数指定 | 既定値 | 説明 |
| --- | --- | --- | --- | --- |
| `--input-parent-directory <dir>` | `--input-directory` を使わない場合は必須 | いいえ | なし | 指定した親 directory の直下にある子 directory をそれぞれ独立して処理します。 |

Java CLI では、`--input-directory` と `--input-parent-directory` のどちらか一方を指定します。両方を同時に指定することはできません。

Node CLI では、`--version` または `-v` でバージョンを表示できます。

## Maven plugin パラメータ一覧

### `index` goal

`index` goal は、1 つの directory を走査して `index.json` と任意の `index.md` を生成します。

| 設定名 | property | 必須 | 既定値 | 説明 |
| --- | --- | --- | --- | --- |
| `inputDirectory` | `miku-indexgen.inputDirectory` | いいえ | `${project.basedir}` | 走査対象 directory を指定します。 |
| `outputDirectory` | `miku-indexgen.outputDirectory` | いいえ | 入力 directory | 出力先 directory を指定します。 |
| `title` | `miku-indexgen.title` | いいえ | なし | 生成する JSON の root に `title` を追加します。 |
| `markdown` | `miku-indexgen.markdown` | いいえ | `false` | `index.md` も生成します。 |
| `includeGeneratorMetadata` | `miku-indexgen.includeGeneratorMetadata` | いいえ | `true` | `generator` metadata を出力するかを指定します。 |
| `jsonSummaryPaths` | なし | いいえ | なし | JSON summary 抽出用の JSON Pointer list を指定します。 |
| `recursive` | `miku-indexgen.recursive` | いいえ | `true` | 入力 directory 配下を再帰的に走査します。 |
| `overwrite` | `miku-indexgen.overwrite` | いいえ | `true` | 出力 file が既にある場合に上書きします。 |
| `verbose` | `miku-indexgen.verbose` | いいえ | `false` | Maven log に詳細ログを出力します。 |
| `includeExtensions` | なし | いいえ | `md`, `json` | 対象拡張子 list を指定します。 |
| `inputEncoding` | `miku-indexgen.inputEncoding` | いいえ | `utf8` | 入力テキストの encoding を指定します。 |
| `outputEncoding` | `miku-indexgen.outputEncoding` | いいえ | `utf8` | 出力テキストの encoding を指定します。 |
| `skip` | `miku-indexgen.skip` | いいえ | `false` | `true` の場合、plugin 実行をスキップします。 |

### `index-child-directories` goal

`index-child-directories` goal は、親 directory 直下の子 directory をそれぞれ独立して処理します。

| 設定名 | property | 必須 | 既定値 | 説明 |
| --- | --- | --- | --- | --- |
| `inputParentDirectory` | `miku-indexgen.inputParentDirectory` | はい | なし | 子 directory 群を含む親 directory を指定します。 |
| `outputDirectory` | `miku-indexgen.outputDirectory` | いいえ | 各子 directory | 出力先 directory を指定します。指定した場合、子 directory 名ごとの出力先が作られます。 |
| `title` | `miku-indexgen.title` | いいえ | なし | 生成する JSON の root に `title` を追加します。 |
| `markdown` | `miku-indexgen.markdown` | いいえ | `false` | `index.md` も生成します。 |
| `includeGeneratorMetadata` | `miku-indexgen.includeGeneratorMetadata` | いいえ | `true` | `generator` metadata を出力するかを指定します。 |
| `jsonSummaryPaths` | なし | いいえ | なし | JSON summary 抽出用の JSON Pointer list を指定します。 |
| `recursive` | `miku-indexgen.recursive` | いいえ | `true` | 各子 directory 配下を再帰的に走査します。 |
| `overwrite` | `miku-indexgen.overwrite` | いいえ | `true` | 出力 file が既にある場合に上書きします。 |
| `verbose` | `miku-indexgen.verbose` | いいえ | `false` | Maven log に詳細ログを出力します。 |
| `includeExtensions` | なし | いいえ | `md`, `json` | 対象拡張子 list を指定します。 |
| `inputEncoding` | `miku-indexgen.inputEncoding` | いいえ | `utf8` | 入力テキストの encoding を指定します。 |
| `outputEncoding` | `miku-indexgen.outputEncoding` | いいえ | `utf8` | 出力テキストの encoding を指定します。 |
| `skip` | `miku-indexgen.skip` | いいえ | `false` | `true` の場合、plugin 実行をスキップします。 |

`jsonSummaryPaths` と `includeExtensions` は list 型の Maven parameter です。`-D...` ではなく、`pom.xml` の `<configuration>` に list として書くのが分かりやすいです。

## 基本的な使い方

### Node CLI で index.json を生成する

もっとも基本的な使い方は、`--input-directory` で走査対象を指定する形です。

```sh
npx miku-indexgen --input-directory docs
```

この場合、`docs/index.json` が生成されます。

### Node CLI で index.md も生成する

人間が読むための Markdown index もほしい場合は、`--markdown` を指定します。

```sh
npx miku-indexgen --input-directory docs --markdown
```

この場合、`docs/index.json` と `docs/index.md` が生成されます。

### 出力先 directory を分ける

入力 directory とは別の場所へ出力したい場合は、`--output-directory` を指定します。

```sh
npx miku-indexgen \
  --input-directory docs \
  --output-directory out \
  --markdown
```

この場合、`out/index.json` と `out/index.md` が生成されます。

### JSON summary を抽出する

JSON file の `summary` を抽出したい場合は、`--json-summary-path` に JSON Pointer を指定します。

```sh
npx miku-indexgen \
  --input-directory docs \
  --json-summary-path /title,/name
```

指定した JSON Pointer は左から順に評価され、最初に見つかった文字列値が `summary` として使われます。

### 対象拡張子を指定する

既定では `md` と `json` が対象です。対象拡張子を変えたい場合は、`--include-ext` を指定します。

```sh
npx miku-indexgen \
  --input-directory docs \
  --include-ext md,json,txt
```

### Shift_JIS を扱う

入力または出力の encoding として `shift_jis` を指定できます。

```sh
npx miku-indexgen \
  --input-directory docs \
  --input-encoding shift_jis \
  --output-encoding shift_jis \
  --markdown
```

### Java CLI で実行する

Java CLI でも、基本的な使い方は Node CLI と同じです。

```sh
java -jar miku-indexgen-1.1.2.jar \
  --input-directory docs \
  --output-directory out \
  --markdown
```

### Java CLI で子 directory ごとに生成する

親 directory の直下にある子 directory ごとに `index.json` / `index.md` を生成する場合は、`--input-parent-directory` を使います。

```sh
java -jar miku-indexgen-1.1.2.jar \
  --input-parent-directory docs-parent \
  --output-directory out \
  --markdown
```

たとえば `docs-parent/note` と `docs-parent/qiita` がある場合、`out/note/index.json` と `out/qiita/index.json` のように子 directory ごとの出力が生成されます。

### Maven plugin として実行する

Maven project では、Maven plugin として明示実行できます。

通常は、`miku-indexgen-java` の source がある位置で `mvn install` してから、利用側 project で plugin を指定します。

```sh
mvn install
```

`pom.xml` に plugin を書く場合は、たとえば次のように指定します。

```xml
<build>
  <plugins>
    <plugin>
      <groupId>jp.igapyon</groupId>
      <artifactId>miku-indexgen-maven-plugin</artifactId>
      <version>1.1.2</version>
      <configuration>
        <inputDirectory>${project.basedir}/docs</inputDirectory>
        <outputDirectory>${project.build.directory}/generated-index</outputDirectory>
        <markdown>true</markdown>
        <jsonSummaryPaths>
          <jsonSummaryPath>/title</jsonSummaryPath>
          <jsonSummaryPath>/name</jsonSummaryPath>
        </jsonSummaryPaths>
        <includeExtensions>
          <includeExtension>md</includeExtension>
          <includeExtension>json</includeExtension>
        </includeExtensions>
      </configuration>
    </plugin>
  </plugins>
</build>
```

単一 directory を索引化する場合は、`index` goal を使います。

```sh
mvn -N jp.igapyon:miku-indexgen-maven-plugin:1.1.2:index \
  -Dmiku-indexgen.inputDirectory=docs \
  -Dmiku-indexgen.outputDirectory=target/generated-index \
  -Dmiku-indexgen.markdown=true
```

親 directory 直下の子 directory ごとに索引化する場合は、`index-child-directories` goal を使います。

```sh
mvn -N jp.igapyon:miku-indexgen-maven-plugin:1.1.2:index-child-directories \
  -Dmiku-indexgen.inputParentDirectory=docs-parent \
  -Dmiku-indexgen.outputDirectory=target/generated-index \
  -Dmiku-indexgen.markdown=true
```

## 出力されるもの

`miku-indexgen` の主な出力は `index.json` です。

`--markdown` または `markdown=true` を指定した場合は、`index.md` も生成されます。

| 出力 | 説明 |
| --- | --- |
| `index.json` | file 一覧を flat な `files` 配列としてまとめた JSON です。 |
| `index.md` | `index.json` を人間がざっと確認しやすい Markdown として出力したものです。 |
| verbose log | `--verbose` または `verbose=true` 指定時に、走査状況や処理時間を出力します。 |

`index.json` の root には、主に次の情報が入ります。

- `title` optional
- `generator` optional
- `basePath`
- `files`

各 file entry には、主に次の情報が入ります。

- `name`
- `path`
- `ext`
- `dir`
- `size`
- `summary` optional

Markdown file の `summary` は、最初の見出しまたは先頭本文から抽出されます。

JSON file の `summary` は、`--json-summary-path` または `jsonSummaryPaths` を指定した場合に抽出されます。

## 注意点

Node CLI は、単一 directory を対象にします。

Java CLI / Maven plugin では、単一 directory に加えて、親 directory 直下の子 directory ごとに索引を生成する mode も利用できます。

`--no-recursive` は、入力 directory 直下だけを対象にしたい場合に使います。Maven plugin では `recursive=false` に相当します。

`--no-overwrite` は、既存の出力 file を上書きしたくない場合に使います。Maven plugin では `overwrite=false` に相当します。

Maven plugin の `jsonSummaryPaths` と `includeExtensions` は list 型 parameter です。複数値を使う場合は、`pom.xml` の `<configuration>` に書くと扱いやすいです。

## まとめ

`miku-indexgen` ファミリーでは、Markdown / JSON file 群から `index.json` と任意の `index.md` を生成できます。

Node CLI は、`npx` や単一ファイル runtime で手早く索引生成する入口です。

Java CLI は、jar 実行と child directory batch に対応しています。

Maven plugin を使うと、Maven project から単一 directory または child directory batch の索引生成を明示実行できます。

## 想定読者

- `miku-indexgen` ファミリーの CLI 引数とオプションを確認したい人
- Markdown / JSON file 群から `index.json` を生成したい人
- AI エージェントに読ませる前の file 一覧を用意したい人
- Maven project から索引生成を明示実行したい人
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

- [`miku-indexgen`](https://github.com/igapyon/miku-indexgen)
- [`miku-indexgen` Releases](https://github.com/igapyon/miku-indexgen/releases)
- [`miku-indexgen-java`](https://github.com/igapyon/miku-indexgen-java)
- [`miku-indexgen-java` Releases](https://github.com/igapyon/miku-indexgen-java/releases)
- [`miku-soft-catalog`](https://github.com/igapyon/miku-soft-catalog)

## Appendix

この記事の整理時には、作業用ディレクトリに `miku-indexgen` と `miku-indexgen-java` の repository を clone し、Node CLI、Java CLI、Maven plugin の代表的な実行例を確認しました。実施日は 2026-05-09 です。

確認した内容は次の通りです。

- Node CLI の `--help`
- Node CLI の `--version`
- Node CLI の `--input-directory`、`--output-directory`、`--markdown`、`--json-summary-path` による `index.json` / `index.md` 生成
- Node CLI の `npm run build`
- Java CLI の `--help`
- Java CLI の `--input-directory`、`--output-directory`、`--markdown`、`--json-summary-path` による `index.json` / `index.md` 生成
- Java CLI の `--input-parent-directory` による child directory batch
- `mvn package` による Java CLI jar と Maven plugin の build
- `mvn install` による Maven plugin の local install
- Maven plugin の `index` goal
- Maven plugin の `index-child-directories` goal

検証では、各 repository の `docs` 配下を入力に使い、`index.json` と `index.md` が生成されることを確認しました。

Node 側では、`npm run build` により 50 件の test が成功し、`dist/main.js` で CLI 実行できることを確認しました。

Java 側では、`mvn package` により 48 件の test が成功し、`miku-indexgen-1.1.2.jar` と `miku-indexgen-maven-plugin-1.1.2.jar` が生成されることを確認しました。
