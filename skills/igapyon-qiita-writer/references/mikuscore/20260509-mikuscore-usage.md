## [mikuscore] CLI リファレンス

- 掲載先: Qiita
- URL: まだ

---
title: [mikuscore] CLI リファレンス
tags: mikuku MusicXML ABC MIDI 生成AI
author: igapyon
slide: false
---
## はじめに

`mikuscore` は、MusicXML を中核に据えた譜面フォーマット変換ツールです。

MusicXML、ABC、MIDI、MuseScore、MEI、LilyPond などの形式を扱い、譜面データを変換・確認・生成AI向けに受け渡すための入口を提供します。

この記事では、`mikuscore` ファミリーの CLI の使い方をリファレンス形式で整理します。

対象にする実行形態は次の通りです。

- Node CLI: [`mikuscore`](https://github.com/igapyon/mikuscore)
- Java CLI: [`mikuscore-java`](https://github.com/igapyon/mikuscore-java)

Node CLI の単一ファイル runtime は [`mikuscore`](https://github.com/igapyon/mikuscore/releases) から、Java CLI の単一 jar は [`mikuscore-java`](https://github.com/igapyon/mikuscore-java/releases) から入手できます。

## コマンド形式

### Node CLI

GitHub Releases から入手した Node CLI の単一ファイル runtime は、Node.js で実行します。

```sh
node mikuscore-0.5.0.mjs --version
node mikuscore-0.5.0.mjs --help
node mikuscore-0.5.0.mjs <command> [options]
```

source checkout 上で確認する場合は、build 後に `bundle/mikuscore.mjs` を実行できます。

```sh
npm install
npm run build:cli-runtime
node bundle/mikuscore.mjs --help
node bundle/mikuscore.mjs <command> [options]
```

### Java CLI

Java CLI は、`mikuscore-java` の単一 jar で実行します。

```sh
java -jar mikuscore-0.5.0.1.jar --version
java -jar mikuscore-0.5.0.1.jar --help
java -jar mikuscore-0.5.0.1.jar <command> [options]
```

## コマンド一覧

### 共通

| コマンド | 説明 |
| --- | --- |
| `mikuscore --version` | CLI のバージョンを表示します。 |
| `mikuscore --help` | ヘルプを表示します。 |
| `mikuscore <command> --help` | command ごとのヘルプを表示します。 |

### `convert`

譜面データを別形式へ変換するコマンドです。

Node CLI と Java CLI は、`convert` / `render` / `state` という大枠のコマンド体系を共有しています。

Node CLI の主な変換対象は次の通りです。

| コマンド | 主な入力 | 主な出力 | 説明 |
| --- | --- | --- | --- |
| `convert --from abc --to musicxml` | `.abc` | MusicXML | ABC から MusicXML を生成します。 |
| `convert --from abc --to midi` | `.abc` | MIDI | ABC から MIDI を生成します。 |
| `convert --from musicxml --to abc` | MusicXML | `.abc` | MusicXML から ABC を生成します。 |
| `convert --from midi --to musicxml` | MIDI | MusicXML | MIDI から MusicXML を生成します。 |
| `convert --from musicxml --to midi` | MusicXML | MIDI | MusicXML から MIDI を生成します。 |
| `convert --from mei --to musicxml` | `.mei` | MusicXML | MEI から MusicXML を生成します。 |
| `convert --from musicxml --to mei` | MusicXML | `.mei` | MusicXML から MEI を生成します。 |
| `convert --from lilypond --to musicxml` | `.ly` | MusicXML | LilyPond から MusicXML を生成します。 |
| `convert --from musicxml --to lilypond` | MusicXML | `.ly` | MusicXML から LilyPond を生成します。 |
| `convert --from musescore --to musicxml` | `.mscx` / `.mscz` | MusicXML | MuseScore file から MusicXML を生成します。 |
| `convert --from musicxml --to musescore` | MusicXML | `.mscx` / `.mscz` | MusicXML から MuseScore file を生成します。 |

この記事の整理時点で GitHub Releases から入手できる Java CLI では、次の変換を確認しています。

| コマンド | 主な入力 | 主な出力 | 説明 |
| --- | --- | --- | --- |
| `convert --from musicxml --to musicxml` | MusicXML | MusicXML | MusicXML を読み込み、MusicXML として出力します。 |
| `convert --from abc --to musicxml` | `.abc` | MusicXML | ABC から MusicXML を生成します。 |
| `convert --from musicxml --to abc` | MusicXML | `.abc` | MusicXML から ABC を生成します。 |

### `render`

譜面データから派生成果物を出力するコマンドです。

Node CLI では次の `render` コマンドを利用できます。

Java CLI にも `render svg` の command surface はありますが、この記事の整理時点で入手できる Release では SVG render の実行は確認対象外にしています。

| コマンド | 主な入力 | 主な出力 | 説明 |
| --- | --- | --- | --- |
| `render svg` | MusicXML | SVG | MusicXML から SVG を生成します。 |
| `render svg --from abc` | ABC | SVG | ABC から SVG を生成します。内部的には MusicXML を経由します。 |

### `state`

MusicXML を基準に、譜面 state を確認・比較・更新するコマンドです。

Node CLI と Java CLI のどちらでも、MusicXML state を扱う `state` 系コマンドを利用できます。

| コマンド | 主な入力 | 主な出力 | 説明 |
| --- | --- | --- | --- |
| `state summarize` | MusicXML | summary JSON | MusicXML state の概要を出力します。 |
| `state inspect-measure` | MusicXML | measure inspection JSON | 指定小節の note 情報を出力します。 |
| `state validate-command` | MusicXML, command JSON | validation result | command JSON を MusicXML state に対して検証します。 |
| `state apply-command` | MusicXML, command JSON | MusicXML | command JSON を適用し、更新後の MusicXML を出力します。 |
| `state diff` | before / after MusicXML | diff summary JSON | 2 つの MusicXML state の差分概要を出力します。 |

## パラメータ一覧

### 共通オプション

| パラメータ | 必須 | 複数指定 | 既定値 | 説明 |
| --- | --- | --- | --- | --- |
| `--help` | いいえ | いいえ | なし | ヘルプを表示します。 |
| `--version` | いいえ | いいえ | なし | バージョンを表示します。 |
| `--diagnostics <text\|json>` | いいえ | いいえ | `text` | diagnostics の出力形式を指定します。Node CLI で利用できます。 |
| `--in <file\|->` | コマンドによる | いいえ | stdin | 入力 file を指定します。`-` は stdin を表します。 |
| `--out <file\|->` | コマンドによる | いいえ | stdout | 出力 file を指定します。`-` は stdout を表します。 |

### `convert`

| パラメータ | 必須 | 複数指定 | 既定値 | 説明 |
| --- | --- | --- | --- | --- |
| `--from <format>` | はい | いいえ | なし | 入力 format を指定します。 |
| `--to <format>` | はい | いいえ | なし | 出力 format を指定します。 |
| `--in <file\|->` | いいえ | いいえ | stdin | 入力 file を指定します。 |
| `--out <file\|->` | いいえ | いいえ | stdout | 出力 file を指定します。 |

`musicxml` 入力では `.musicxml`、`.xml`、`.mxl` を扱えます。

`musescore` 入力では `.mscx`、`.mscz` を扱えます。

出力先が `.mxl` の場合、`--to musicxml` は compressed MusicXML として出力します。

出力先が `.mscz` の場合、`--to musescore` は compressed MuseScore file として出力します。

### `render svg`

| パラメータ | 必須 | 複数指定 | 既定値 | 説明 |
| --- | --- | --- | --- | --- |
| `--from <format>` | いいえ | いいえ | MusicXML | 入力 format を指定します。ABC から直接 SVG を生成する場合は `abc` を指定します。 |
| `--in <file\|->` | いいえ | いいえ | stdin | 入力 file を指定します。 |
| `--out <file\|->` | いいえ | いいえ | stdout | SVG の出力先を指定します。 |

### `state inspect-measure`

| パラメータ | 必須 | 複数指定 | 既定値 | 説明 |
| --- | --- | --- | --- | --- |
| `--measure <number>` | はい | いいえ | なし | 確認する小節番号を指定します。 |
| `--in <file\|->` | いいえ | いいえ | stdin | 入力 MusicXML を指定します。 |

### `state validate-command` / `state apply-command`

| パラメータ | 必須 | 複数指定 | 既定値 | 説明 |
| --- | --- | --- | --- | --- |
| `--command <json>` | `--command-file` を使わない場合は必須 | いいえ | なし | command JSON を直接指定します。 |
| `--command-file <file\|->` | `--command` を使わない場合は必須 | いいえ | なし | command JSON file を指定します。Node CLI で利用できます。 |
| `--in <file\|->` | いいえ | いいえ | stdin | 入力 MusicXML を指定します。 |
| `--out <file\|->` | `apply-command` では任意 | いいえ | stdout | 更新後 MusicXML の出力先を指定します。 |

### `state diff`

| パラメータ | 必須 | 複数指定 | 既定値 | 説明 |
| --- | --- | --- | --- | --- |
| `--before <file>` | はい | いいえ | なし | 比較前の MusicXML file を指定します。 |
| `--after <file>` | はい | いいえ | なし | 比較後の MusicXML file を指定します。 |

## 基本的な使い方

### バージョンとヘルプを確認する

```sh
node mikuscore-0.5.0.mjs --version
node mikuscore-0.5.0.mjs --help
node mikuscore-0.5.0.mjs convert --help
node mikuscore-0.5.0.mjs render --help
node mikuscore-0.5.0.mjs state --help
java -jar mikuscore-0.5.0.1.jar --version
java -jar mikuscore-0.5.0.1.jar --help
```

### ABC から MusicXML を生成する

```sh
node mikuscore-0.5.0.mjs convert \
  --from abc \
  --to musicxml \
  --in score.abc \
  --out score.musicxml \
  --diagnostics json
```

`--diagnostics json` を指定すると、処理結果や入出力 file の情報が JSON として stderr に出力されます。

Java CLI でも、ABC から MusicXML への変換を実行できます。

```sh
java -jar mikuscore-0.5.0.1.jar convert \
  --from abc \
  --to musicxml \
  --in score.abc \
  --out score.musicxml
```

### MusicXML から ABC を生成する

```sh
node mikuscore-0.5.0.mjs convert \
  --from musicxml \
  --to abc \
  --in score.musicxml \
  --out score.abc
```

### ABC から SVG を生成する

```sh
node mikuscore-0.5.0.mjs render svg \
  --from abc \
  --in score.abc \
  --out score.svg \
  --diagnostics json
```

ABC から SVG を直接出力する場合でも、内部的には MusicXML を経由します。

### MusicXML state の概要を確認する

```sh
node mikuscore-0.5.0.mjs state summarize \
  --in score.musicxml \
  --diagnostics json
```

title、part 数、measure 数、voice などの概要を JSON で確認できます。

Java CLI でも同じ用途のコマンドを実行できます。

```sh
java -jar mikuscore-0.5.0.1.jar state summarize \
  --in score.musicxml
```

### 指定小節の note 情報を確認する

```sh
node mikuscore-0.5.0.mjs state inspect-measure \
  --measure 1 \
  --in score.musicxml \
  --diagnostics json
```

`state inspect-measure` の出力には、note ごとの `node_id` や `selector` が含まれます。

### state の差分を確認する

```sh
node mikuscore-0.5.0.mjs state diff \
  --before score.before.musicxml \
  --after score.after.musicxml \
  --diagnostics json
```

2 つの MusicXML state の差分概要を JSON で確認できます。

## 入出力の考え方

`--in` を省略すると stdin から読み込みます。

`--out` を省略すると stdout へ出力します。

file として残したい場合は、`--in <file>` と `--out <file>` を指定するのが扱いやすいです。

Node CLI では、MusicXML と MuseScore の拡張子により compressed 形式の入出力も扱えます。Java CLI では、MusicXML の `.mxl` 入出力を扱えます。

Node CLI では `--diagnostics json` を使うと、stdout の主成果物と stderr の diagnostics を分けて扱いやすくなります。

## 注意点

`mikuscore` は MusicXML-first な変換ツールです。内部的には MusicXML を基準にして、ABC、MIDI、MuseScore、MEI、LilyPond などとの橋渡しを行います。

すべての形式間で完全な無損失変換を保証するものではありません。変換結果を確認し、必要に応じて diagnostics を見る運用が前提です。

MEI と LilyPond は実験的な扱いです。

Node CLI と Java CLI は、`convert` / `render` / `state` という大枠のコマンド体系を共有しています。ただし、この記事の整理時点で GitHub Releases から入手できる Java CLI では、確認できた変換対象は MusicXML / ABC まわりが中心です。

Java CLI は開発が進行中のため、MIDI、MuseScore、MEI、LilyPond などの対応状況は Release version により変わる可能性があります。利用時は GitHub Releases の version と `--help` の表示を確認してください。

## まとめ

`mikuscore` CLI を使うと、譜面データを MusicXML を中心にして、ABC、MIDI、MuseScore、MEI、LilyPond、SVG などへ変換・確認できます。

`convert` は format 間の変換、`render` は SVG などの派生成果物、`state` は MusicXML state の確認・差分・command 適用に使います。

Node CLI は単一 `.mjs` runtime、Java CLI は単一 jar として扱えるため、利用環境に合わせて入口を選べます。

## 想定読者

- `mikuscore` ファミリーの CLI 引数とオプションを確認したい人
- ABC / MusicXML / MIDI / MuseScore の変換を CLI から実行したい人
- 生成AI が出力した譜面データを検証・変換したい人
- MusicXML state の概要や小節単位の note 情報を JSON で確認したい人
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

- [`mikuscore`](https://github.com/igapyon/mikuscore)
- [`mikuscore` Releases](https://github.com/igapyon/mikuscore/releases)
- [`mikuscore` Web app](https://igapyon.github.io/mikuscore/mikuscore.html)
- [`mikuscore-skills`](https://github.com/igapyon/mikuscore-skills)
- [`mikuscore-java`](https://github.com/igapyon/mikuscore-java)
- [`mikuscore-java` Releases](https://github.com/igapyon/mikuscore-java/releases)
- [`miku-abc-player`](https://github.com/igapyon/miku-abc-player)
- [`miku-soft-catalog`](https://github.com/igapyon/miku-soft-catalog)

## Appendix

この記事の整理時には、作業用ディレクトリに GitHub Releases から `mikuscore-0.5.0.mjs` と `mikuscore-0.5.0.1.jar` を取得し、検証用の小さな ABC file を作成して、Node CLI と Java CLI の代表的な実行例を確認しました。実施日は 2026-05-09 です。

確認した内容は次の通りです。

- `--version`
- `--help`
- `convert --help`
- `state --help`
- ABC から MusicXML への変換
- ABC から SVG への render
- MusicXML state の `summarize`
- MusicXML state の `inspect-measure`
- Java CLI の `--version`
- Java CLI の `--help`
- Java CLI の ABC から MusicXML への変換
- Java CLI の MusicXML state `summarize`

検証では、`score.abc` を入力に使い、Node CLI で `score.musicxml` と `score.svg` が生成されることを確認しました。Java CLI では、同じ入力から `score-java.musicxml` が生成されることを確認しました。

`state summarize` では、title、part 数、measure 数、measure 番号、voice が JSON として出力されることを確認しました。

`state inspect-measure` では、指定小節に含まれる note ごとの `node_id`、`selector`、pitch、duration が JSON として出力されることを確認しました。
