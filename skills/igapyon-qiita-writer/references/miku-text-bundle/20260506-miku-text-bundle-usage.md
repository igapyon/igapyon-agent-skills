## [miku-text-bundle] リポジトリのテキストを生成AI向け Markdown バンドルにまとめるアプリの使用方法

- 掲載先: Qiita
- URL: https://qiita.com/igapyon/items/c67f37ffe4d0fd1eed9d

---
title: [miku-text-bundle] リポジトリのテキストを生成AI向け Markdown バンドルにまとめるアプリの使用方法
tags: mikuku Markdown 生成AI java8 Node.js
author: igapyon
slide: false
---
## はじめに

`miku-text-bundle` は、指定ディレクトリ以下のテキストファイルを収集し、生成AI に渡しやすい分割 Markdown バンドルとして出力する CLI ツールです。

現時点ではベータ版として扱っています。

リポジトリ全体を生成AI の Web UI に渡したいとき、すべてのファイルを手作業で貼り付けるのは大変です。また、大きなリポジトリでは 1 回のメッセージに収まらないこともあります。

`miku-text-bundle` は、ファイル境界を保ったまま Markdown にまとめ、必要に応じて複数の Part に分割します。あわせて、生成AI にどの順番で渡せばよいかを示す prompt ファイルも生成します。

この記事では、`miku-text-bundle` の使い方だけを扱います。

## 何ができるか

`miku-text-bundle` は、入力ディレクトリをリポジトリルートとして扱い、主に次のファイルを収集します。

- `README.md`
- `TODO.md`
- `src/`, `lib/`, `app/`, `test/`, `tests/` 配下のソースファイル
- 対象拡張子: `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.java`, `.cs`

生成先には、たとえば次のような Markdown ファイルが作られます。

```text
text-bundle-000-index.md
text-bundle-000-prompt.md
text-bundle-001.md
text-bundle-002.md
```

`text-bundle-000-index.md` には、出力概要、Part 一覧、スキップされたファイル、警告、抽出した `TODO` / `FIXME` / `XXX` マーカーが記録されます。

`text-bundle-001.md` 以降には、収集されたファイル本文が Markdown の code fence として記録されます。

`text-bundle-000-prompt.md` には、複数メッセージで生成AIへ貼り付けるための順序や完了合図が記録されます。

## Node CLI を入手する

Node CLI 用の単一ファイル runtime は GitHub Releases の Asset から入手できます。

```sh
curl -L -o miku-text-bundle-0.5.2.mjs \
  https://github.com/igapyon/miku-text-bundle/releases/download/v0.5.2/miku-text-bundle-0.5.2.mjs
```

入手したファイルは、必要に応じて hash を確認しておくと安心です。

```sh
shasum -a 256 miku-text-bundle-0.5.2.mjs
```

バージョンは次のように確認できます。

```sh
node miku-text-bundle-0.5.2.mjs --version
```

以降の Node CLI の例では、この `.mjs` ファイルを使います。

## 基本的な使い方

カレントディレクトリのリポジトリをバンドルする基本形は次の通りです。

```sh
node miku-text-bundle-0.5.2.mjs . out/text-bundle
```

第 1 引数には入力ディレクトリを指定します。

第 2 引数には出力ディレクトリを指定します。

出力ディレクトリを省略した場合は、入力ディレクトリ配下の次の場所に出力されます。

```text
workplace/miku-text-bundle/<yyyyMMddHHmm>/
```

同じ分に同名の出力ディレクトリがある場合は、末尾に `-1`, `-2` のような連番 suffix が付きます。

## 出力された Markdown を使う

生成されたファイルは、まず `text-bundle-000-index.md` から確認します。

```sh
ls out/text-bundle
```

典型的には、次の順番で使います。

1. `text-bundle-000-index.md` で全体像と Part 数を確認する
2. `text-bundle-000-prompt.md` を生成AI に渡す
3. `text-bundle-001.md`, `text-bundle-002.md` の順に渡す
4. 最後に prompt ファイルで指定された完了合図を渡す

`text-bundle-000-prompt.md` には、生成AI 側に期待する読み取り手順が書かれています。手作業で順番を考えるより、この prompt に沿って渡すほうが扱いやすいです。

## 収集対象を追加する

デフォルト収集対象に含まれない Markdown や設定ファイルを追加したい場合は、`--include` を使います。

```sh
node miku-text-bundle-0.5.2.mjs . out/text-bundle \
  --include "docs/**/*.md,package.json"
```

`--include` には、カンマ区切りで複数の glob pattern を指定できます。

ただし、入力ディレクトリ直下の `.gitignore` で除外されたファイルや、リポジトリルート直下のドットフォルダ配下のファイルは、`--include` でも収集対象に戻せません。

## 収集対象を除外する

生成物や大きなディレクトリを外したい場合は、`--exclude` を使います。

```sh
node miku-text-bundle-0.5.2.mjs . out/text-bundle \
  --exclude "src/generated/**"
```

`--exclude` も、カンマ区切りで複数の glob pattern を指定できます。

## Part の大きさを調整する

1 つの Part あたりの最大文字数を変えたい場合は、`--max-chars` を使います。

```sh
node miku-text-bundle-0.5.2.mjs . out/text-bundle \
  --max-chars 60000
```

基本的には、ファイル途中では分割せず、ファイル単位で Part に割り当てます。

ただし、単一ファイルだけで `--max-chars` を超える場合は、例外として行単位で分割されます。この場合は、Part 本文と index の両方に警告が記録されます。

## 大きすぎる入力ファイルをスキップする

単一入力ファイルの最大読み込み bytes を変えたい場合は、`--max-input-file-bytes` を使います。

```sh
node miku-text-bundle-0.5.2.mjs . out/text-bundle \
  --max-input-file-bytes 2000000
```

上限を超えるファイルは読み込まれず、`text-bundle-000-index.md` にスキップ理由が記録されます。

デフォルト値は `1000000` bytes です。

## 名前付きオプションで指定する

入力ディレクトリと出力ディレクトリは、位置引数ではなく名前付きオプションでも指定できます。

```sh
node miku-text-bundle-0.5.2.mjs \
  --input-directory . \
  --output-directory out/text-bundle
```

スクリプトや手順書に書く場合は、名前付きオプションのほうが意図を読み取りやすいことがあります。

## Java CLI を使う場合

Java CLI 用の jar も GitHub Releases の Asset から入手できます。

```sh
curl -L -o miku-text-bundle-java-0.5.0.2.jar \
  https://github.com/igapyon/miku-text-bundle-java/releases/download/v0.5.0.2/miku-text-bundle-java-0.5.0.2.jar
```

バージョンは次のように確認できます。

```sh
java -jar miku-text-bundle-java-0.5.0.2.jar --version
```

使い方は Node CLI とほぼ同じです。

```sh
java -jar miku-text-bundle-java-0.5.0.2.jar . out/text-bundle
```

Markdown docs を追加で収集する例です。

```sh
java -jar miku-text-bundle-java-0.5.0.2.jar . out/text-bundle \
  --include "docs/**/*.md" \
  --verbose
```

Java CLI は Java 8 以降で利用できます。

## Agent Skills として使う場合

`miku-text-bundle-skills` は、`miku-text-bundle` 用の Agent Skills package です。

Release Asset として、skill bundle zip が提供されています。

```sh
curl -L -o igapyon-miku-text-bundle-skills-0.5.0.zip \
  https://github.com/igapyon/miku-text-bundle-skills/releases/download/v0.5.0/igapyon-miku-text-bundle-skills-0.5.0.zip
```

記事執筆時点では CLI-backed の Agent Skill です。MCP は提供しません。

実行 backend は Java runtime を優先し、Java runtime が見つからない、または利用できない場合に Node.js runtime を使う方針です。

## 注意点

`miku-text-bundle` は、生成AI の Web UI への受け渡しに使いやすい Markdown バンドルを作るツールです。

入力文字コードは UTF-8 を前提にします。UTF-8 として読めないファイル、またはバイナリと判定されたファイルはスキップされます。

入力ディレクトリ直下の `.gitignore` は考慮されますが、Git 本体の ignore 仕様と完全互換ではありません。

リポジトリルート直下のドットフォルダは、`.gitignore` の内容に関係なく収集対象外です。たとえば `.git/`, `.vscode/`, `.codex/` などは収集しません。

## まとめ

`miku-text-bundle` は、リポジトリ内のテキストファイルを収集し、生成AI に渡しやすい分割 Markdown バンドルとして出力するツールです。

Node CLI では `node miku-text-bundle-0.5.2.mjs <inputDir> [outputDir]` の形で実行できます。Java CLI では `java -jar miku-text-bundle-java-0.5.0.2.jar <inputDir> [outputDir]` の形で実行できます。

生成された `text-bundle-000-index.md` と `text-bundle-000-prompt.md` を入口にし、Part ファイルを順番に渡すことで、大きめのリポジトリでも生成AI に扱わせやすくなります。

## 想定読者

- リポジトリの内容を生成AI にまとめて渡したい人
- ソースファイルや README / TODO を Markdown bundle として整理したい人
- 1 回のメッセージに収まらない入力を Part に分けて渡したい人
- Node CLI または Java CLI でテキスト収集を自動化したい人
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

## Appendix

### CLI の完全なパラメータ説明

Node CLI の基本形は次の通りです。

```sh
node miku-text-bundle-0.5.2.mjs <inputDir> [outputDir] [options]
node miku-text-bundle-0.5.2.mjs --input-directory <dir> [--output-directory <dir>] [options]
node miku-text-bundle-0.5.2.mjs --help
node miku-text-bundle-0.5.2.mjs --version
```

Java CLI の基本形は次の通りです。

```sh
java -jar miku-text-bundle-java-0.5.0.2.jar <inputDir> [outputDir] [options]
java -jar miku-text-bundle-java-0.5.0.2.jar --input-directory <dir> [--output-directory <dir>] [options]
java -jar miku-text-bundle-java-0.5.0.2.jar --help
java -jar miku-text-bundle-java-0.5.0.2.jar --version
```

利用できるパラメータは次の通りです。

| パラメータ | 必須 | 複数指定 | 説明 |
| --- | --- | --- | --- |
| `<inputDir>` | `--input-directory` を使わない場合は必須 | いいえ | 入力ディレクトリを位置引数で指定します。 |
| `[outputDir]` | いいえ | いいえ | 出力ディレクトリを位置引数で指定します。省略時は `workplace/miku-text-bundle/<yyyyMMddHHmm>/` に出力されます。 |
| `--input-directory <dir>` | 位置引数の `<inputDir>` を使わない場合は必須 | いいえ | 入力ディレクトリを名前付きオプションで指定します。 |
| `--output-directory <dir>` | いいえ | いいえ | 出力ディレクトリを名前付きオプションで指定します。 |
| `--max-chars <number>` | いいえ | いいえ | 1 つの bundle Part あたりの最大文字数を指定します。デフォルトは `120000` です。 |
| `--max-input-file-bytes <number>` | いいえ | いいえ | 単一入力ファイルの最大読み込み bytes を指定します。デフォルトは `1000000` です。 |
| `--include <glob>` | いいえ | はい | 追加で収集するファイルパターンを指定します。カンマ区切りでも複数指定できます。 |
| `--exclude <glob>` | いいえ | はい | 収集対象から除外するファイルパターンを指定します。カンマ区切りでも複数指定できます。 |
| `--verbose` | いいえ | いいえ | 収集数、スキップ数、Part 数などの診断情報を標準出力に表示します。 |
| `--help` | いいえ | いいえ | ヘルプを表示します。`-h` も同じです。 |
| `--version` | いいえ | いいえ | バージョンを表示します。Node CLI では `-v` も同じです。 |

`--include` と `--exclude` の glob pattern は、シェルで展開されないように引用符で囲むと扱いやすいです。

```sh
node miku-text-bundle-0.5.2.mjs . out/text-bundle \
  --include "docs/**/*.md,package.json" \
  --exclude "dist/**,target/**"
```
