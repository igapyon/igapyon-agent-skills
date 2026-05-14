## [miku-text-bundle] CLI リファレンス

- 掲載先: Qiita
- URL: https://qiita.com/igapyon/items/c67f37ffe4d0fd1eed9d

---
title: [miku-text-bundle] CLI リファレンス
tags: mikuku Markdown 生成AI java8 Node.js
author: igapyon
slide: false
---

## はじめに

`miku-text-bundle` は、指定ディレクトリ以下のテキストファイルを収集し、生成AI に渡しやすい分割 Markdown バンドルとして出力する CLI ツールです。

この記事では、`miku-text-bundle` の CLI の使い方をリファレンス形式で整理します。

Node CLI と Java CLI は、基本的に同じ引数とオプションで利用できます。Node CLI の単一ファイル runtime は [`miku-text-bundle`](https://github.com/igapyon/miku-text-bundle/releases)、Java CLI の jar は [`miku-text-bundle-java`](https://github.com/igapyon/miku-text-bundle-java/releases) の GitHub Releases から入手できます。

## コマンド形式

Node CLI の基本形は次の通りです。

```sh
node miku-text-bundle-0.5.4.mjs <inputDir> [outputDir] [options]
node miku-text-bundle-0.5.4.mjs --input-directory <dir> [--output-directory <dir>] [options]
node miku-text-bundle-0.5.4.mjs --help
node miku-text-bundle-0.5.4.mjs --version
```

Java CLI の基本形は次の通りです。

```sh
java -jar miku-text-bundle-java-0.5.3.jar <inputDir> [outputDir] [options]
java -jar miku-text-bundle-java-0.5.3.jar --input-directory <dir> [--output-directory <dir>] [options]
java -jar miku-text-bundle-java-0.5.3.jar --help
java -jar miku-text-bundle-java-0.5.3.jar --version
```

## パラメータ一覧

| パラメータ | 必須 | 複数指定 | 既定値 | 説明 |
| --- | --- | --- | --- | --- |
| `<inputDir>` | `--input-directory` を使わない場合は必須 | いいえ | なし | 入力ディレクトリを位置引数で指定します。 |
| `[outputDir]` | いいえ | いいえ | `workplace/miku-text-bundle/<yyyyMMddHHmm>/` | 出力ディレクトリを位置引数で指定します。 |
| `--input-directory <dir>` | 位置引数の `<inputDir>` を使わない場合は必須 | いいえ | なし | 入力ディレクトリを名前付きオプションで指定します。 |
| `--output-directory <dir>` | いいえ | いいえ | `workplace/miku-text-bundle/<yyyyMMddHHmm>/` | 出力ディレクトリを名前付きオプションで指定します。 |
| `--max-chars <number>` | いいえ | いいえ | `120000` | 1 つの bundle Part あたりの最大文字数を指定します。 |
| `--max-input-file-bytes <number>` | いいえ | いいえ | `1000000` | 単一入力ファイルの最大読み込み bytes を指定します。 |
| `--encoding utf-8\|shift_jis` | いいえ | いいえ | `utf-8` | 入力ファイルのデフォルト文字コードを指定します。 |
| `--encoding-extension ".java=shift_jis"` | いいえ | はい | なし | 拡張子ごとの入力文字コードを指定します。カンマ区切りでも複数指定できます。 |
| `--include <glob>` | いいえ | はい | なし | 追加で収集するファイルパターンを指定します。カンマ区切りでも複数指定できます。 |
| `--exclude <glob>` | いいえ | はい | なし | 収集対象から除外するファイルパターンを指定します。カンマ区切りでも複数指定できます。 |
| `--verbose` | いいえ | いいえ | `false` | 収集数、スキップ数、Part 数などの診断情報を標準出力に表示します。 |
| `--help` | いいえ | いいえ | なし | ヘルプを表示します。`-h` も同じです。 |
| `--version` | いいえ | いいえ | なし | バージョンを表示します。Node CLI では `-v` も同じです。 |

## 位置引数

### `<inputDir>`

入力ディレクトリを指定します。

```sh
node miku-text-bundle-0.5.4.mjs .
```

入力ディレクトリは、収集対象ファイルを探す起点として扱われます。

`--input-directory <dir>` を指定する場合、位置引数の `<inputDir>` は使いません。スクリプトや手順書に書く場合は、名前付きオプションのほうが意図を読み取りやすいことがあります。

```sh
node miku-text-bundle-0.5.4.mjs --input-directory .
```

### `[outputDir]`

出力ディレクトリを指定します。

```sh
node miku-text-bundle-0.5.4.mjs . out/text-bundle
```

省略した場合は、入力ディレクトリ配下の次の場所に出力されます。

```text
workplace/miku-text-bundle/<yyyyMMddHHmm>/
```

同じ分に同名の出力ディレクトリがある場合は、末尾に `-1`, `-2` のような連番 suffix が付きます。

`--output-directory <dir>` を指定する場合、位置引数の `[outputDir]` は使いません。

```sh
node miku-text-bundle-0.5.4.mjs \
  --input-directory . \
  --output-directory out/text-bundle
```

## オプション

### `--input-directory <dir>`

入力ディレクトリを名前付きオプションで指定します。

```sh
node miku-text-bundle-0.5.4.mjs \
  --input-directory .
```

位置引数の `<inputDir>` と同じ意味です。

### `--output-directory <dir>`

出力ディレクトリを名前付きオプションで指定します。

```sh
node miku-text-bundle-0.5.4.mjs \
  --input-directory . \
  --output-directory out/text-bundle
```

位置引数の `[outputDir]` と同じ意味です。

### `--max-chars <number>`

1 つの Part あたりの最大文字数を指定します。

```sh
node miku-text-bundle-0.5.4.mjs . out/text-bundle \
  --max-chars 60000
```

既定値は `120000` です。

基本的には、ファイル途中では分割せず、ファイル単位で Part に割り当てます。

ただし、単一ファイルだけで `--max-chars` を超える場合は、例外として行単位で分割されます。この場合は、Part 本文と index の両方に警告が記録されます。

### `--max-input-file-bytes <number>`

単一入力ファイルの最大読み込み bytes を指定します。

```sh
node miku-text-bundle-0.5.4.mjs . out/text-bundle \
  --max-input-file-bytes 2000000
```

既定値は `1000000` bytes です。

上限を超えるファイルは読み込まれず、`text-bundle-000-index.md` にスキップ理由が記録されます。

### `--encoding utf-8|shift_jis`

入力ファイルのデフォルト文字コードを指定します。

```sh
node miku-text-bundle-0.5.4.mjs . out/text-bundle \
  --encoding shift_jis
```

既定値は `utf-8` です。

対応する文字コードは `utf-8` と `shift_jis` です。文字コードの自動判定は行いません。

指定された文字コードとして読めないファイル、またはバイナリと判定されたファイルはスキップされ、`text-bundle-000-index.md` に理由が記録されます。

Shift_JIS 入力は、Node CLI `0.5.4` と Java CLI `0.5.3` で動作確認しています。

### `--encoding-extension ".java=shift_jis"`

拡張子ごとの入力文字コードを指定します。

```sh
node miku-text-bundle-0.5.4.mjs . out/text-bundle \
  --encoding utf-8 \
  --encoding-extension ".java=shift_jis,.properties=shift_jis"
```

拡張子ルールは、`--encoding` で指定したデフォルト文字コードより優先されます。

`--encoding-extension` には、カンマ区切りで複数のルールを指定できます。また、オプション自体を複数回指定できます。

### `--include <glob>`

追加で収集するファイルパターンを指定します。

```sh
node miku-text-bundle-0.5.4.mjs . out/text-bundle \
  --include "docs/**/*.md,package.json"
```

`--include` には、カンマ区切りで複数の glob pattern を指定できます。また、オプション自体を複数回指定できます。

glob pattern は、シェルで展開されないように引用符で囲むと扱いやすいです。

ただし、入力ディレクトリ直下の `.gitignore` で除外されたファイルや、リポジトリルート直下のドットフォルダ配下のファイルは、`--include` でも収集対象に戻せません。

### `--exclude <glob>`

収集対象から除外するファイルパターンを指定します。

```sh
node miku-text-bundle-0.5.4.mjs . out/text-bundle \
  --exclude "src/generated/**"
```

`--exclude` には、カンマ区切りで複数の glob pattern を指定できます。また、オプション自体を複数回指定できます。

`--include` と組み合わせる例です。

```sh
node miku-text-bundle-0.5.4.mjs . out/text-bundle \
  --include "docs/**/*.md,package.json" \
  --exclude "dist/**,target/**"
```

### `--verbose`

診断情報を標準出力に表示します。

```sh
node miku-text-bundle-0.5.4.mjs . out/text-bundle \
  --verbose
```

収集数、スキップ数、Part 数などを確認したい場合に使います。

### `--help`

ヘルプを表示します。

```sh
node miku-text-bundle-0.5.4.mjs --help
java -jar miku-text-bundle-java-0.5.3.jar --help
```

`-h` も同じです。

### `--version`

バージョンを表示します。

```sh
node miku-text-bundle-0.5.4.mjs --version
java -jar miku-text-bundle-java-0.5.3.jar --version
```

Node CLI では `-v` も同じです。

## 収集対象

既定では、入力ディレクトリをリポジトリルートとして扱い、主に次のファイルを収集します。

- `README.md`
- `TODO.md`
- `src/`, `lib/`, `app/`, `test/`, `tests/` 配下のソースファイル
- 対象拡張子: `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.java`, `.cs`

デフォルト収集対象に含まれない Markdown や設定ファイルを追加したい場合は、`--include` を使います。生成物や大きなディレクトリを外したい場合は、`--exclude` を使います。

入力文字コードの既定値は UTF-8 です。`--encoding shift_jis` を指定すると、収集対象ファイルをデフォルトで Shift_JIS として読みます。

拡張子ごとに文字コードを変える場合は、`--encoding-extension` を使います。たとえば、通常は UTF-8 として読み、`.java` と `.properties` だけ Shift_JIS として読む、といった指定ができます。

```sh
node miku-text-bundle-0.5.4.mjs . out/text-bundle \
  --encoding utf-8 \
  --encoding-extension ".java=shift_jis,.properties=shift_jis"
```

対応する文字コードは `utf-8` と `shift_jis` です。文字コードの自動判定は行いません。指定された文字コードとして読めないファイル、またはバイナリと判定されたファイルはスキップされます。

入力ディレクトリ直下の `.gitignore` は考慮されますが、Git 本体の ignore 仕様と完全互換ではありません。

リポジトリルート直下のドットフォルダは、`.gitignore` の内容に関係なく収集対象外です。たとえば `.git/`, `.vscode/`, `.codex/` などは収集しません。

## 出力ファイル

生成先には、たとえば次のような Markdown ファイルが作られます。

```text
text-bundle-000-index.md
text-bundle-000-prompt.md
text-bundle-001.md
text-bundle-002.md
```

`text-bundle-000-index.md` には、出力概要、Part 一覧、スキップされたファイル、警告、抽出した `TODO` / `FIXME` / `XXX` マーカーが記録されます。

`text-bundle-000-prompt.md` には、複数メッセージで生成AIへ貼り付けるための順序や完了合図が記録されます。

`text-bundle-001.md` 以降には、収集されたファイル本文が Markdown の code fence として記録されます。

生成されたファイルは、まず `text-bundle-000-index.md` から確認します。

典型的には、次の順番で使います。

1. `text-bundle-000-index.md` で全体像と Part 数を確認する
2. `text-bundle-000-prompt.md` を生成AI に渡す
3. `text-bundle-001.md`, `text-bundle-002.md` の順に渡す
4. 最後に prompt ファイルで指定された完了合図を渡す

## Node CLI を入手する

Node CLI の単一ファイル runtime は [`miku-text-bundle`](https://github.com/igapyon/miku-text-bundle/releases) の GitHub Releases から入手できます。

入手したファイルは、必要に応じて hash を確認しておくと安心です。

```sh
shasum -a 256 miku-text-bundle-0.5.4.mjs
```

## Java CLI を入手する

Java CLI の jar は [`miku-text-bundle-java`](https://github.com/igapyon/miku-text-bundle-java/releases) の GitHub Releases から入手できます。

Java CLI は Java 8 以降で利用できます。

## Agent Skills として使う場合

`miku-text-bundle-skills` は、`miku-text-bundle` 用の Agent Skills package です。

skill bundle zip は、[`miku-text-bundle-skills`](https://github.com/igapyon/miku-text-bundle-skills/releases) の GitHub Releases から入手できます。

記事執筆時点では CLI-backed の Agent Skill です。MCP は提供しません。

実行 backend は Java runtime を優先し、Java runtime が見つからない、または利用できない場合に Node.js runtime を使う方針です。

## まとめ

`miku-text-bundle` は、入力ディレクトリと出力ディレクトリを指定するだけで、リポジトリ内のテキストファイルを生成AI 向けの分割 Markdown バンドルにできます。

基本形は、Node CLI では `node miku-text-bundle-0.5.4.mjs <inputDir> [outputDir]`、Java CLI では `java -jar miku-text-bundle-java-0.5.3.jar <inputDir> [outputDir]` です。

収集対象を増やす場合は `--include`、減らす場合は `--exclude`、Part サイズを調整する場合は `--max-chars`、大きすぎる入力ファイルの扱いを調整する場合は `--max-input-file-bytes` を使います。Shift_JIS の入力を扱う場合は `--encoding shift_jis` または `--encoding-extension` を指定します。

## 想定読者

- `miku-text-bundle` の CLI 引数とオプションを確認したい人
- リポジトリの内容を生成AI にまとめて渡したい人
- ソースファイルや README / TODO を Markdown bundle として整理したい人
- 1 回のメッセージに収まらない入力を Part に分けて渡したい人
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

- [miku-soft-catalog](https://github.com/igapyon/miku-soft-catalog)

## Appendix

### 記事内容の検証について

この記事の整理時には、作業用ディレクトリに検証用の小さな入力ディレクトリを作成し、Node CLI と Java CLI の代表的な実行例を確認しました。

検証実施日は 2026-05-09 です。

検証では、次の内容を確認しています。

- `--help` と `--version` による CLI 表示
- 位置引数による入力ディレクトリ、出力ディレクトリ指定
- `--input-directory` と `--output-directory` による名前付き指定
- `--include` による追加収集
- `--exclude` による収集対象からの除外
- `--max-chars` による Part 分割
- `--max-input-file-bytes` による大きすぎる入力ファイルのスキップ
- 出力ディレクトリ省略時の `workplace/miku-text-bundle/<yyyyMMddHHmm>/` 生成
- 同じ分に出力先が重なる場合の `-1` suffix 付与
- `text-bundle-000-index.md`, `text-bundle-000-prompt.md`, `text-bundle-001.md` 以降の生成
- `TODO` マーカーの index への記録
- Node CLI と Java CLI での Shift_JIS 入力指定

検証用の入力には、`README.md`, `TODO.md`, `src/` 配下のソースファイル、`docs/` 配下の Markdown、`.gitignore` で除外されるファイル、リポジトリルート直下のドットフォルダを含めました。

実行結果として、index には収集ファイル数、スキップファイル数、Part 数、スキップ理由、警告、`TODO` / `FIXME` / `XXX` マーカーが記録されることを確認しました。また、prompt ファイルには、index と Part ファイルを生成AIへ渡す順序、完了合図 `END_OF_TEXT_BUNDLE`、回答ファイル名 `text-bundle-response.md` が記録されることを確認しました。
