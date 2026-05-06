## [miku-readfile] JSON request でローカルのテキストファイルを安全に読むアプリの使用方法

- 掲載先: Qiita
- URL: https://qiita.com/igapyon/items/710b3240fcfd155f5102

---
title: [miku-readfile] JSON request でローカルのテキストファイルを安全に読むアプリの使用方法
tags: mikuku Shift_JIS JSON AIエージェント AI駆動開発
author: igapyon
slide: false
---
## はじめに

`miku-readfile` は、生成AI agent や automation が local workspace の text file を安定して読むための local-first CLI です。

現時点ではベータ版として扱っています。

主な目的は、UTF-8 / Shift_JIS のテキストファイルを、明示指定された file だけ読み取り、構造化された JSON result として返すことです。

このツールは AI agent が主要ユーザー想定なので、入出力が JSON になっています。

このツールは、AI agent が local workspace の Shift_JIS file を検索・読み込みできない場面を補うための暫定的なものです。AI agent 側が Shift_JIS file を十分に正しく扱えるようになったら、役割を終える想定です。

このツールは検索しません。読むべき file を探す場合は `miku-grep` などで候補を探し、選んだ file を `miku-readfile` で読む想定です。

この記事では、`miku-readfile` の使い方だけを扱います。

## 何ができるか

`miku-readfile` は、stdin から JSON request を受け取り、stdout に JSON result を返します。

```sh
miku-readfile < request.json > result.json
```

主に次のことができます。

- 明示指定した file を読む
- UTF-8 / Shift_JIS として decode する
- file ごとの encoding を指定する
- 拡張子ごとの encoding rule を指定する
- 行範囲を指定して読む
- 読み取った text と file metadata を JSON で返す
- 読めない file を diagnostics として返す

一方で、次のことはしません。

- 検索
- glob 展開
- directory traversal
- MCP
- GUI
- server / daemon
- file 変換や上書き

## Node CLI を入手する

Node CLI 用の単一ファイル runtime は GitHub Releases の Asset から入手できます。

```sh
curl -L -o miku-readfile-0.5.0.1.mjs \
  https://github.com/igapyon/miku-readfile/releases/download/v0.5.0.1/miku-readfile-0.5.0.1.mjs
```

入手したファイルは、必要に応じて hash を確認しておくと安心です。

```sh
shasum -a 256 miku-readfile-0.5.0.1.mjs
```

バージョンは次のように確認できます。

```sh
node miku-readfile-0.5.0.1.mjs --version
```

以降の Node CLI の例では、この `.mjs` ファイルを使います。

## 最小 request で読む

まず、次のような `request.json` を用意します。

```json
{
  "version": 1,
  "root": ".",
  "files": ["README.md"]
}
```

実行します。

```sh
node miku-readfile-0.5.0.1.mjs < request.json > result.json
```

`root` は読み取り境界です。

`files` には、`root` からの相対 path を指定します。

成功すると、`result.json` には `ok: true`、読み取った file の text、encoding、line ending、byte size、logical line count などが入ります。

## 複数 file を読む

複数 file を読む場合は、`files` に複数の path を指定します。

```json
{
  "version": 1,
  "root": ".",
  "files": [
    "README.md",
    "TODO.md"
  ]
}
```

失敗した file が 1 件でもある場合、全体 result は `ok: false` になります。

ただし、読めた file は `files` に返り、読めなかった file は `diagnostics` に理由が返ります。

## 行範囲を指定して読む

file 全体ではなく、一部の行だけ読みたい場合は、file entry を object にします。

```json
{
  "version": 1,
  "root": ".",
  "files": [
    {
      "path": "src/Legacy.java",
      "range": {
        "startLine": 120,
        "lineCount": 40
      }
    }
  ]
}
```

`startLine` は 1 始まりです。

`lineCount` には読みたい行数を指定します。

## Shift_JIS file を読む

encoding は top-level の `encoding` で指定できます。

```json
{
  "version": 1,
  "root": ".",
  "files": [
    "README.md",
    "src/Legacy.java"
  ],
  "encoding": {
    "default": "utf-8",
    "extensions": {
      ".java": "shift_jis"
    }
  }
}
```

この例では、基本は UTF-8 として読み、`.java` は Shift_JIS として読みます。

file ごとに encoding を上書きすることもできます。

```json
{
  "version": 1,
  "root": ".",
  "files": [
    {
      "path": "docs/legacy-memo.txt",
      "encoding": "shift_jis"
    }
  ],
  "encoding": {
    "default": "utf-8"
  }
}
```

file ごとの `encoding` は、拡張子 rule や default encoding より優先されます。

## limits を指定する

読み取り量の上限は `limits` で指定できます。

```json
{
  "version": 1,
  "root": ".",
  "files": ["README.md"],
  "limits": {
    "maxFileBytes": 10485760,
    "maxFiles": 100,
    "maxTotalBytes": 4194304
  }
}
```

上限を超えた file は、読めなかった理由とともに `diagnostics` に記録されます。

## result JSON を見る

result JSON には、主に次の情報が含まれます。

- `version`
- `ok`
- `files`
- `summary`
- `diagnostics`

`files` には、読み取れた file ごとに次のような情報が含まれます。

- file path
- effective encoding
- BOM handling
- line ending
- final newline
- byte size
- logical line count
- modified time
- range metadata
- decoded text

`summary` には、要求 file 数、読み取り成功数、skip 数、diagnostics 数が入ります。

`diagnostics` には、validation error、decode error、file size 上限超過、root 境界違反などの expected failure が入ります。

## Java CLI を使う場合

Java CLI 用の jar も GitHub Releases の Asset から入手できます。

```sh
curl -L -o miku-readfile-0.5.0.1.jar \
  https://github.com/igapyon/miku-readfile-java/releases/download/v0.5.0.1/miku-readfile-0.5.0.1.jar
```

バージョンは次のように確認できます。

```sh
java -jar miku-readfile-0.5.0.1.jar --version
```

使い方は Node CLI と同じく、stdin に JSON request を渡し、stdout から JSON result を受け取ります。

```sh
java -jar miku-readfile-0.5.0.1.jar < request.json > result.json
```

Java CLI は Java 8 以降で利用できます。

## Agent Skills として使う場合

`miku-readfile-skills` は、`miku-readfile` 用の Agent Skills package です。

Release Asset として、skill bundle zip が提供されています。

```sh
curl -L -o igapyon-miku-readfile-skills-0.5.0.1.zip \
  https://github.com/igapyon/miku-readfile-skills/releases/download/v0.5.0.2/igapyon-miku-readfile-skills-0.5.0.1.zip
```

記事執筆時点では CLI-backed の Agent Skill です。MCP は提供しません。

この skill は、generic な file-reading や検索では自動起動しない方針です。会話では `miku-readfile` を明示して使う想定です。

## miku-grep と組み合わせる

`miku-readfile` は検索しません。

候補 file を探す場合は、まず `miku-grep` で検索し、見つかった root-relative file path を `miku-readfile` の `files` に渡します。

```json
{
  "version": 1,
  "root": ".",
  "files": [
    "README.md",
    {
      "path": "docs/miku-readfile-cli-spec.md",
      "range": {
        "startLine": 1,
        "lineCount": 80
      }
    }
  ]
}
```

検索と読み取りを分けることで、`miku-readfile` は「明示指定された file だけを読む」小さな tool として扱えます。

## 注意点

`miku-readfile` は、読み取りだけを行う local-first CLI です。

`files` に absolute path は指定できません。

`..` を含む path も validation error です。

読み取り境界は `request.root` です。通常は current repository root を `root` に指定します。

filesystem root や user home のように広すぎる root は拒否されます。

directories、symlinks、binary files、decode errors、oversized files は skip され、diagnostics に理由が返ります。

## まとめ

`miku-readfile` は、JSON request で明示指定した text file を読み、JSON result として返す CLI です。

Node CLI では `node miku-readfile-0.5.0.1.mjs < request.json > result.json` の形で実行できます。Java CLI では `java -jar miku-readfile-0.5.0.1.jar < request.json > result.json` の形で実行できます。

検索は `miku-grep` に任せ、選んだ file を `miku-readfile` で読むことで、Shift_JIS を含む local workspace の text file を扱いやすくなります。

## 想定読者

- AI agent の Shift_JIS のテキストファイルの読み込みに困っている人
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
node miku-readfile-0.5.0.1.mjs < request.json > result.json
node miku-readfile-0.5.0.1.mjs --version
node miku-readfile-0.5.0.1.mjs --help
node miku-readfile-0.5.0.1.mjs -h
```

Java CLI の基本形は次の通りです。

```sh
java -jar miku-readfile-0.5.0.1.jar < request.json > result.json
java -jar miku-readfile-0.5.0.1.jar --version
java -jar miku-readfile-0.5.0.1.jar --help
java -jar miku-readfile-0.5.0.1.jar -h
```

利用できる CLI parameter は次の通りです。

| パラメータ | 必須 | 説明 |
| --- | --- | --- |
| stdin | 通常実行では必須 | request JSON を渡します。 |
| stdout | 通常実行では必須 | result JSON が出力されます。 |
| `--version` | いいえ | バージョンを表示します。stdin JSON なしで実行できます。 |
| `--help` | いいえ | ヘルプを表示します。stdin JSON なしで実行できます。 |
| `-h` | いいえ | `--help` の alias です。 |

通常実行では、CLI option ではなく stdin JSON が主な interface です。

### request JSON の完全なパラメータ説明

request JSON の top-level fields は次の通りです。

| field | 必須 | 型 | 説明 |
| --- | --- | --- | --- |
| `version` | はい | number | request schema version です。MVP では `1` を指定します。 |
| `root` | はい | string | file 読み取りの base directory です。current directory を使う場合も `"."` を明示します。 |
| `files` | はい | array | 読み取る file entry の配列です。root-relative path を指定します。 |
| `encoding` | いいえ | object | default encoding、拡張子ごとの encoding rule を指定します。 |
| `limits` | いいえ | object | file size、file count、total bytes の上限を指定します。 |

`files` の entry は string または object です。

| field | 必須 | 型 | 説明 |
| --- | --- | --- | --- |
| string entry | いいえ | string | file 全体を読む root-relative path です。 |
| `path` | object entry では必須 | string | file の root-relative path です。 |
| `range.startLine` | `range` を使う場合は必須 | number | 1 始まりの開始行です。 |
| `range.lineCount` | `range` を使う場合は必須 | number | 読み取る行数です。 |
| `encoding` | いいえ | string | file ごとの encoding override です。 |

`encoding` object は次の fields を持ちます。

| field | 必須 | 型 | 説明 |
| --- | --- | --- | --- |
| `default` | いいえ | string | default encoding です。 |
| `extensions` | いいえ | object | 拡張子ごとの encoding rule です。たとえば `".java": "shift_jis"` のように指定します。 |

利用する encoding は、file entry の `encoding`、拡張子 rule、default encoding の順で決まります。

`limits` object は次の fields を持ちます。

| field | 必須 | 型 | 説明 |
| --- | --- | --- | --- |
| `maxFileBytes` | いいえ | number | 単一 file の最大 bytes です。default は `10485760` bytes です。 |
| `maxFiles` | いいえ | number | request で扱う最大 file 数です。default は `100` です。 |
| `maxTotalBytes` | いいえ | number | 読み取る file の合計最大 bytes です。default は `4194304` bytes です。 |

validation rule の主なものは次の通りです。

- unknown request fields は validation error
- `version` は `1`
- `root` は必須
- file path は `/` 区切りの root-relative path
- absolute path は validation error
- `..` path segment は validation error
- `range.startLine` は `1` 以上の integer
- `range.lineCount` は `1` 以上の integer
