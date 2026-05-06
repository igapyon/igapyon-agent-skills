## [miku-docx2md] Word の .docx を Markdown に変換するアプリの使用方法

- 掲載先: Qiita
- URL: N/A

---
title: [miku-docx2md] Word の .docx を Markdown に変換するアプリの使用方法
tags: mikuku Markdown DOCX 生成AI AI駆動開発
author: igapyon
slide: false
---
## はじめに

`miku-docx2md` は、Word の `.docx` file を Markdown に変換する local-first tool です。

現時点ではベータ版として扱っています。

この tool は、Word の見た目をそのまま再現するためのものではありません。文章、見出し、list、table、link、画像 asset など、文書構造を Markdown として読みやすく取り出すことを目的にしています。

Word 文書を生成AI に読ませたい場合、`.docx` のままでは扱いにくいことがあります。`miku-docx2md` で Markdown に変換しておくと、人間にも生成AI にも読みやすい形で受け渡しやすくなります。

この記事では、`miku-docx2md` の使い方だけを扱います。

## 何ができるか

`miku-docx2md` は、1 つの `.docx` file を 1 つの Markdown document に変換します。

主に次の内容を Markdown に変換できます。

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

`miku-docx2md` は、`.docx` を「Word 画面の再現対象」としてではなく、「文書構造を取り出す source」として扱います。

## ブラウザで使う

ローカルのブラウザだけで変換したい場合は、配布物に含まれる HTML file を開きます。

1. `index.html` を開く
2. `miku-docx2md.html` へ進む
3. `.docx` file を選択する
4. 変換を実行する
5. Markdown と summary を確認する
6. 必要に応じて Markdown、summary、画像 asset ZIP を download する

ブラウザ版は、選択した local file をブラウザ UI 上で処理します。

画像 asset ZIP は、変換結果に解決可能な埋め込み画像がある場合に利用します。

## CLI で使う準備

CLI を使う場合は、Node.js が必要です。

development checkout で使う場合は、最初に dependency を入れます。

```sh
npm install
```

CLI の実行 entry は `npm run cli` です。

```sh
npm run cli -- ./sample.docx --out ./sample.md
```

`--` より後ろが `miku-docx2md` CLI に渡される引数です。

## 最小構成で Markdown に変換する

最小構成では、入力 `.docx` と Markdown 出力先を指定します。

```sh
npm run cli -- ./sample.docx --out ./sample.md
```

`./sample.docx` が入力 file です。

`--out ./sample.md` が Markdown の出力先です。

`--out` を指定しない場合、Markdown は stdout に出力されます。script から扱う場合は、`--out` で file に保存するほうが扱いやすいです。

## summary を確認する

変換 summary を標準出力へ表示するには、`--summary` を指定します。

```sh
npm run cli -- ./sample.docx --out ./sample.md --summary
```

summary には、段落、見出し、list item、table、image、link、unsupported element などの count が含まれます。

summary を file に保存したい場合は、`--summary-out` を使います。

```sh
npm run cli -- ./sample.docx \
  --out ./sample.md \
  --summary-out ./sample.summary.txt
```

標準出力にも表示し、file にも保存したい場合は、`--summary` と `--summary-out` を両方指定します。

```sh
npm run cli -- ./sample.docx \
  --out ./sample.md \
  --summary \
  --summary-out ./sample.summary.txt
```

## 画像 asset を出力する

`.docx` 内の解決可能な埋め込み画像を sidecar asset として出力するには、`--assets-dir` を指定します。

```sh
npm run cli -- ./sample.docx \
  --out ./sample.md \
  --assets-dir ./sample.assets
```

asset directory には、たとえば次のような file が出力されます。

```text
sample.assets/
  manifest.json
  word/media/example.png
```

`--assets-dir` を指定した場合、可能なときは Markdown 内の画像 placeholder が相対 image link になります。

asset 出力なしの例です。

```markdown
[Image: Example alt text]
```

asset 出力ありの例です。

```markdown
![Example alt text](sample.assets/word/media/example.png)
```

`manifest.json` には、asset path、media type、alt text、byte size、source trace、block index、document position などが記録されます。

## debug comment を出力する

通常、unsupported element は Markdown には出力されません。

unsupported element の診断用 trace を出したい場合は、`--debug` を指定します。

```sh
npm run cli -- ./sample.docx \
  --out ./sample.debug.md \
  --debug
```

`--include-unsupported-comments` も `--debug` と同じ意味です。

```sh
npm run cli -- ./sample.docx \
  --out ./sample.debug.md \
  --include-unsupported-comments
```

debug comment は、次のような HTML comment として出力されます。

```markdown
<!-- unsupported: drawing -->
```

debug comment は診断用です。最終的に人間や生成AI に読ませる Markdown では、通常は指定しないほうが読みやすいです。

## table の扱い

Word の table は Markdown table として出力されます。

ただし、Word の表 layout を完全再現するのではなく、Markdown として読みやすい矩形 table に寄せます。

結合セルは placeholder で簡略表現します。

| placeholder | 意味 |
| --- | --- |
| `←M←` | 左側 cell に吸収された merge cell |
| `↑M↑` | 上側 cell に吸収された merge cell |

これは、Word の複雑な table layout を HTML table として再現するのではなく、Markdown として文書構造を残すための割り切りです。

## link と anchor の扱い

外部 link は、可能な場合 Markdown link として出力されます。

```markdown
[example](https://example.com/)
```

文書内 link は、target anchor が解決できる場合に Markdown link として出力されます。

```markdown
[該当箇所へ](#section-1)
```

target anchor が安全に解決できない場合は、broken link を作らず、plain text に fallback します。

## 注意点

`miku-docx2md` は、`.docx` file を Markdown に変換する tool です。

`.doc`、`.rtf`、`.odt` は対象外です。

Word の見た目の完全再現は対象外です。

画像は解決可能なものを sidecar asset として出力できますが、Word 上の配置や size を忠実に再現するものではありません。

unsupported element は通常 Markdown には出ません。調査したい場合は `--debug` を使います。

CLI で `npm run cli` を使う場合は、事前に `npm install` が必要です。

## まとめ

`miku-docx2md` は、Word の `.docx` file から文書構造を取り出し、Markdown に変換する local-first tool です。

ブラウザ版では `index.html` から `miku-docx2md.html` を開き、local の `.docx` file を選択して変換できます。

CLI では `npm run cli -- ./sample.docx --out ./sample.md` の形で Markdown file を生成できます。summary や画像 asset が必要な場合は、`--summary-out` や `--assets-dir` を追加します。

Word の見た目を再現するのではなく、文書構造を Markdown として取り出す tool として使うのが自然です。

## 想定読者

- Word の `.docx` file を Markdown に変換したい人
- Word 文書を生成AI に渡しやすい形にしたい人
- Word 文書の見た目再現ではなく、文書構造を取り出したい人
- local-first な browser app または Node.js CLI で `.docx` を処理したい人
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

CLI の基本形は次の通りです。

```sh
npm run cli -- <input.docx> [options]
```

利用できる CLI parameter は次の通りです。

| パラメータ | 必須 | 説明 |
| --- | --- | --- |
| `<input.docx>` | はい | 入力する `.docx` file です。 |
| `--out <file>` | いいえ | Markdown の出力先 file です。指定しない場合は stdout に Markdown が出力されます。 |
| `--assets-dir <dir>` | いいえ | 解決可能な埋め込み画像 asset の出力先 directory です。 |
| `--summary` | いいえ | summary を stdout に表示します。 |
| `--summary-out <file>` | いいえ | summary text の出力先 file です。 |
| `--debug` | いいえ | unsupported element の HTML comment trace を Markdown に含めます。 |
| `--include-unsupported-comments` | いいえ | `--debug` と同じです。 |
| `--help` | いいえ | help を表示します。 |

exit code は次の通りです。

| exit code | 意味 |
| --- | --- |
| `0` | 成功 |
| `1` | error |

### 出力 file の説明

`--out` を指定した場合、Markdown file が作成されます。

```text
sample.md
```

`--summary-out` を指定した場合、summary text file が作成されます。

```text
sample.summary.txt
```

`--assets-dir` を指定した場合、asset directory が作成されます。

```text
sample.assets/
  manifest.json
  word/media/...
```

`manifest.json` には、出力された画像 asset の metadata が記録されます。

### summary に含まれる主な項目

summary には、主に次の count が含まれます。

| 項目 | 説明 |
| --- | --- |
| `paragraphs` | 段落数 |
| `headings` | 見出し数 |
| `listItems` | list item 数 |
| `tables` | table 数 |
| `images` | image reference 数 |
| `imageAssets` | 解決された image asset 数 |
| `drawingLikeUnsupported` | drawing-like unsupported element 数 |
| `links` | link 数 |
| `internalLinks` | 文書内 link 数 |
| `externalLinks` | 外部 link 数 |
| `unsupportedElements` | unsupported element 数 |
| `unsupportedCommentTraces` | debug comment trace 数 |
