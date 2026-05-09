## [miku-docx2md] CLI / Maven plugin リファレンス

- 掲載先: Qiita
- URL: https://qiita.com/igapyon/items/e241b5a1cf89cb1aadf5

---
title: [miku-docx2md] CLI / Maven plugin リファレンス
tags: mikuku Markdown docx Java 生成AI
author: igapyon
slide: false
---
## はじめに

`miku-docx2md-java` は、Word の `.docx` file を Markdown に変換する CLI / Maven plugin ツールです。

この記事では、`miku-docx2md-java` の CLI と Maven plugin の使い方をリファレンス形式で整理します。

CLI 用の jar は [`miku-docx2md-java`](https://github.com/igapyon/miku-docx2md-java/releases) の GitHub Releases から入手できます。

## コマンド形式

CLI の基本形は次の通りです。

```sh
java -jar miku-docx2md-0.9.0.jar --version
java -jar miku-docx2md-0.9.0.jar --help
java -jar miku-docx2md-0.9.0.jar <input.docx> [options]
```

単一 file の変換では、入力 `.docx` を 1 つ指定します。`--out` を指定した場合は Markdown を file に出力し、省略した場合は stdout に出力します。

Java CLI では、複数の `.docx` file や、directory 配下の `.docx` file をまとめて変換する batch 変換も利用できます。

```sh
java -jar miku-docx2md-0.9.0.jar --input-directory <dir> [options]
```

## CLI パラメータ一覧

| パラメータ | 必須 | 複数指定 | 既定値 | 説明 |
| --- | --- | --- | --- | --- |
| `<input.docx>` | 単一 file 変換では必須 | はい | なし | 入力にする `.docx` file を指定します。複数指定した場合は batch 変換として扱われます。 |
| `--out <file>` | いいえ | いいえ | なし | Markdown の出力先 file を指定します。省略時は stdout に出力します。 |
| `--assets-dir <dir>` | いいえ | いいえ | なし | 解決可能な埋め込み画像 asset を出力する directory を指定します。`manifest.json` も出力されます。 |
| `--summary` | いいえ | いいえ | `false` | 変換 summary を stdout に表示します。 |
| `--summary-out <file>` | いいえ | いいえ | なし | 変換 summary の出力先 file を指定します。 |
| `--debug` | いいえ | いいえ | `false` | unsupported element の HTML comment trace を Markdown に含めます。 |
| `--include-unsupported-comments` | いいえ | いいえ | `false` | `--debug` と同じ意味です。 |
| `--verbose` | いいえ | いいえ | `false` | 進行状況と処理時間を stderr に表示します。 |
| `--input-directory <dir>` | directory 変換では必須 | いいえ | なし | 配下の `.docx` file を batch 変換する入力 directory を指定します。 |
| `--output-directory <dir>` | いいえ | いいえ | 入力 file と同じ directory | batch 変換時の Markdown 出力先 directory を指定します。 |
| `--recursive` | いいえ | いいえ | `false` | `--input-directory` 配下を再帰的に探索します。 |
| `--help` | いいえ | いいえ | なし | ヘルプを表示します。 |
| `--version` | いいえ | いいえ | なし | バージョンを表示します。 |

## Maven plugin パラメータ一覧

Maven plugin の goal は、単一 file 変換用の `convert` と、directory 変換用の `convert-directory` です。

```sh
mvn jp.igapyon:miku-docx2md-maven-plugin:0.9.0:convert
mvn jp.igapyon:miku-docx2md-maven-plugin:0.9.0:convert-directory
```

### `convert` goal

| property | 必須 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `miku-docx2md.inputFile` | はい | なし | 入力にする `.docx` file を指定します。 |
| `miku-docx2md.outputFile` | いいえ | 入力 file 名の拡張子を `.md` にした file | Markdown の出力先 file を指定します。 |
| `miku-docx2md.summaryFile` | いいえ | なし | 変換 summary の出力先 file を指定します。 |
| `miku-docx2md.assetsDirectory` | いいえ | なし | 解決可能な埋め込み画像 asset の出力先 directory を指定します。 |
| `miku-docx2md.includeUnsupportedComments` | いいえ | `false` | unsupported element の HTML comment trace を Markdown に含めます。 |
| `miku-docx2md.verbose` | いいえ | `false` | Maven log に進行状況を表示します。 |
| `miku-docx2md.skip` | いいえ | `false` | `true` の場合、変換をスキップします。 |

### `convert-directory` goal

| property | 必須 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `miku-docx2md.inputDirectory` | はい | なし | 入力にする directory を指定します。 |
| `miku-docx2md.outputDirectory` | いいえ | 入力 file と同じ directory | Markdown の出力先 directory を指定します。 |
| `miku-docx2md.assetsDirectory` | いいえ | なし | 画像 asset の出力先 root directory を指定します。各入力 file ごとに `<basename>.assets` が作られます。 |
| `miku-docx2md.recursive` | いいえ | `false` | 入力 directory 配下を再帰的に探索します。 |
| `miku-docx2md.includeUnsupportedComments` | いいえ | `false` | unsupported element の HTML comment trace を Markdown に含めます。 |
| `miku-docx2md.verbose` | いいえ | `false` | Maven log に進行状況を表示します。 |
| `miku-docx2md.skip` | いいえ | `false` | `true` の場合、変換をスキップします。 |

## 基本的な使い方

### 1 つの `.docx` を Markdown に変換する

最小構成では、入力 `.docx` と Markdown 出力先を指定します。

```sh
java -jar miku-docx2md-0.9.0.jar ./sample.docx --out ./sample.md
```

`./sample.docx` が入力 file です。

`--out ./sample.md` が Markdown の出力先です。

`--out` を省略した場合、Markdown は stdout に出力されます。script から扱う場合は、`--out` で file に保存するほうが扱いやすいです。

### summary を出力する

変換 summary を file に保存したい場合は、`--summary-out` を使います。

```sh
java -jar miku-docx2md-0.9.0.jar ./sample.docx \
  --out ./sample.md \
  --summary-out ./sample.summary.txt
```

summary を stdout に表示したい場合は、`--summary` を指定します。

```sh
java -jar miku-docx2md-0.9.0.jar ./sample.docx \
  --out ./sample.md \
  --summary
```

`--out` を省略して `--summary` も指定すると、Markdown と summary がどちらも stdout に出ます。通常は `--out` または `--summary-out` と組み合わせるほうが扱いやすいです。

### 画像 asset を出力する

`.docx` 内の解決可能な埋め込み画像を sidecar asset として出力するには、`--assets-dir` を指定します。

```sh
java -jar miku-docx2md-0.9.0.jar ./sample.docx \
  --out ./sample.md \
  --assets-dir ./sample.assets
```

asset directory には、たとえば次のような file が出力されます。

```text
sample.assets/
  manifest.json
  word/media/example.png
```

`--assets-dir` を指定した場合、Markdown 内の画像 link は `--out` の位置から見た相対 path になります。

### debug comment を出力する

通常、unsupported element は Markdown には出力されません。

unsupported element の診断用 trace を出したい場合は、`--debug` を指定します。

```sh
java -jar miku-docx2md-0.9.0.jar ./sample.docx \
  --out ./sample.debug.md \
  --debug
```

`--include-unsupported-comments` も `--debug` と同じ意味です。

```sh
java -jar miku-docx2md-0.9.0.jar ./sample.docx \
  --out ./sample.debug.md \
  --include-unsupported-comments
```

debug comment は診断用です。最終的に人間や生成AI に読ませる Markdown では、通常は指定しないほうが読みやすいです。

### directory 配下をまとめて変換する

directory 配下の `.docx` file をまとめて変換する場合は、`--input-directory` を使います。

```sh
java -jar miku-docx2md-0.9.0.jar \
  --input-directory ./docx \
  --output-directory ./markdown
```

サブ directory も含めて変換したい場合は、`--recursive` を指定します。

```sh
java -jar miku-docx2md-0.9.0.jar \
  --input-directory ./docx \
  --output-directory ./markdown \
  --recursive
```

`--output-directory` を指定した場合、入力 directory からの相対 path を保って Markdown が出力されます。

### Maven plugin として実行する

Maven project では、Maven plugin として明示実行できます。

通常は、`miku-docx2md-java` の source がある位置で `mvn install` してから、利用側 project で plugin を指定します。

```sh
mvn install
```

`pom.xml` に plugin を書く場合は、たとえば次のように指定します。

```xml
<plugin>
  <groupId>jp.igapyon</groupId>
  <artifactId>miku-docx2md-maven-plugin</artifactId>
  <version>0.9.0</version>
</plugin>
```

単一 file を変換する場合は、`convert` goal を使います。

```sh
mvn -N jp.igapyon:miku-docx2md-maven-plugin:0.9.0:convert \
  -Dmiku-docx2md.inputFile=path/to/input.docx \
  -Dmiku-docx2md.outputFile=path/to/output.md
```

summary や asset 出力を追加する場合は、property を足します。

```sh
mvn -N jp.igapyon:miku-docx2md-maven-plugin:0.9.0:convert \
  -Dmiku-docx2md.inputFile=path/to/input.docx \
  -Dmiku-docx2md.outputFile=path/to/output.md \
  -Dmiku-docx2md.summaryFile=path/to/output.summary.txt \
  -Dmiku-docx2md.assetsDirectory=path/to/output.assets
```

directory 配下をまとめて変換する場合は、`convert-directory` goal を使います。

```sh
mvn -N jp.igapyon:miku-docx2md-maven-plugin:0.9.0:convert-directory \
  -Dmiku-docx2md.inputDirectory=path/to/docx \
  -Dmiku-docx2md.outputDirectory=path/to/markdown \
  -Dmiku-docx2md.recursive=true
```

## 出力されるもの

`miku-docx2md` の主な出力は Markdown です。

必要に応じて、summary file と画像 asset directory も出力できます。

| 出力 | 説明 |
| --- | --- |
| Markdown | 変換後の本文です。段落、見出し、list、table、link などが Markdown として出力されます。 |
| summary | paragraphs、headings、tables、images、links、unsupportedElements などの count を含む text です。 |
| asset directory | 解決可能な埋め込み画像 file と `manifest.json` が出力されます。 |
| `manifest.json` | asset path、media type、alt text、byte size、source trace、block index、document position などを含む JSON です。 |

## 変換対象と割り切り

`miku-docx2md` は、Word の見た目をそのまま再現するための tool ではありません。

`.docx` を「Word 画面の再現対象」としてではなく、「文書構造を取り出す source」として扱います。

主に次の内容を Markdown に変換します。

- 段落
- 見出し
- 箇条書き list / 番号付き list / nested list
- table
- 外部 link
- 解決可能な文書内 link
- 太字、斜体、取り消し線、下線の一部
- 段落内改行
- 解決可能な埋め込み画像の sidecar asset 出力
- 変換 summary
- debug 用の unsupported element comment

一方で、次のような Word の見た目再現は目的にしていません。

- Word の page layout の完全再現
- inline image layout / size の忠実な再現
- drawing / shape の layout 抽出
- header / footer
- footnote / endnote
- comment
- tracked changes

`.doc`、`.rtf`、`.odt` は対象外です。

## 想定読者

- `miku-docx2md-java` の CLI 引数とオプションを確認したい人
- Word の `.docx` file を Markdown に変換したい人
- Word 文書を生成AI に渡しやすい形にしたい人
- Word 文書の見た目再現ではなく、文書構造を取り出したい人
- Maven project から `.docx` 変換を明示実行したい人
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

- [`miku-docx2md-java`](https://github.com/igapyon/miku-docx2md-java)
- [`miku-docx2md-java` Releases](https://github.com/igapyon/miku-docx2md-java/releases)
- [`miku-docx2md`](https://github.com/igapyon/miku-docx2md)
- [`miku-soft-catalog`](https://github.com/igapyon/miku-soft-catalog)

## Appendix

この記事の整理時には、作業用ディレクトリに検証用の小さな入力 directory を作成し、Java CLI の代表的な実行例を確認しました。実施日は 2026-05-09 です。

確認した内容は次の通りです。

- `java -jar miku-docx2md-0.9.0.jar --version`
- `java -jar miku-docx2md-0.9.0.jar --help`
- 単一 `.docx` file から Markdown file への変換
- `--summary-out` による summary file 出力
- `--input-directory`、`--output-directory`、`--recursive` による directory 変換

検証では、見出しを含む `.docx` file を入力し、Markdown と summary が出力されることを確認しました。

出力された Markdown の例です。

```markdown
Word headings fixture

# Heading 1

## Heading 2

### Heading 3
```

summary には、見出し数や段落数などの count が出力されることを確認しました。
