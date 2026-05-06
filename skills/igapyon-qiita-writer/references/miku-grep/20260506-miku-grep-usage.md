## [miku-grep] JSON request でローカルのテキストファイルを検索するアプリの使用方法

- 掲載先: Qiita
- URL: https://qiita.com/igapyon/items/4af2b369b2e57c46b695

---
title: [miku-grep] JSON request でローカルのテキストファイルを検索するアプリの使用方法
tags: mikuku Shift_JIS AIエージェント AI駆動開発 JSON
author: igapyon
slide: false
---
## はじめに

`miku-grep` は、生成AI agent や automation が local repository の中から読むべき file を見つけるための local-first 検索 CLI です。

現時点ではベータ版として扱っています。

通常の `grep` のように人間向けのテキストを出すのではなく、検索結果、summary、diagnostics を JSON result として返します。

このツールは AI agent が主要ユーザー想定なので、入出力が JSON になっています。

このツールは、AI agent が local workspace の Shift_JIS file を検索できない場面を補うための暫定的なものです。AI agent 側が Shift_JIS file を十分に正しく検索できるようになったら、役割を終える想定です。

この記事では、`miku-grep` の使い方だけを扱います。

## 何ができるか

`miku-grep` は、stdin から JSON request を受け取り、stdout に JSON result を返します。

```sh
miku-grep < request.json > result.json
```

主に次のことができます。

- file content から候補 file を探す
- file path から候補 file を探す
- directory path から候補 directory を探す
- literal / regex で検索する
- UTF-8 / Shift_JIS として検索する
- summary / detail の 2 種類の出力を使い分ける
- skipped file や limit 到達を diagnostics として受け取る

一方で、次のことはしません。

- semantic search
- embedding search
- 意味による ranking
- Git repository root の自動検出
- MCP
- GUI
- server / daemon

## Node CLI を入手する

Node CLI 用の単一ファイル runtime は GitHub Releases の Asset から入手できます。

```sh
curl -L -o miku-grep-0.8.4.1.mjs \
  https://github.com/igapyon/miku-grep/releases/download/v0.8.4.1/miku-grep-0.8.4.1.mjs
```

入手したファイルは、必要に応じて hash を確認しておくと安心です。

```sh
shasum -a 256 miku-grep-0.8.4.1.mjs
```

バージョンは次のように確認できます。

```sh
node miku-grep-0.8.4.1.mjs --version
```

以降の Node CLI の例では、この `.mjs` ファイルを使います。

## 最小 request で検索する

まず、次のような `request.json` を用意します。

```json
{
  "version": 1,
  "root": ".",
  "query": {
    "type": "literal",
    "text": "diagnostics"
  },
  "search": {
    "targets": ["content"]
  }
}
```

実行します。

```sh
node miku-grep-0.8.4.1.mjs < request.json > result.json
```

`root` は検索開始ディレクトリです。

`miku-grep` は Git repository root を自動検出しません。検索したい directory を `root` に指定します。

成功すると、`result.json` には `ok: true`、`matches`、`summary`、`diagnostics` が入ります。

## file content を検索する

file content を検索する場合は、`search.targets` に `content` を指定します。

```json
{
  "version": 1,
  "root": ".",
  "query": {
    "type": "literal",
    "text": "TODO"
  },
  "search": {
    "targets": ["content"]
  }
}
```

`query.type: "literal"` は case-sensitive な substring search です。

case variation が必要な場合は、regex pattern で表現します。

## file path を検索する

file path を検索する場合は、`search.targets` に `filepath` を指定します。

```json
{
  "version": 1,
  "root": ".",
  "query": {
    "type": "literal",
    "text": "security"
  },
  "search": {
    "targets": ["filepath"]
  }
}
```

`filepath` は、`root` からの相対 file path を検索します。

## directory path を検索する

directory path を検索する場合は、`search.targets` に `directory` を指定します。

```json
{
  "version": 1,
  "root": ".",
  "query": {
    "type": "literal",
    "text": "docs"
  },
  "search": {
    "targets": ["directory"]
  }
}
```

`directory` は、`root` からの相対 directory path を検索します。

## find のように path を検索する

file path と directory path をまとめて検索したい場合は、`filepath` と `directory` を指定します。

```json
{
  "version": 1,
  "root": ".",
  "query": {
    "type": "literal",
    "text": "test"
  },
  "search": {
    "targets": ["filepath", "directory"]
  }
}
```

file name や directory name の候補を探す入口として使えます。

## regex で検索する

regex で検索する場合は、`query.type` に `regex` を指定します。

```json
{
  "version": 1,
  "root": ".",
  "query": {
    "type": "regex",
    "text": "Repository(Map|Index)"
  },
  "search": {
    "targets": ["content"]
  }
}
```

content regex search は行単位で適用されます。multi-line regex matching は対象外です。

JavaScript 固有の regex flags は request schema では受け取りません。

## 対象 file を絞る

検索対象を絞る場合は、`includeFileNamePatterns` や `excludeDirNamePatterns` を使います。

```json
{
  "version": 1,
  "root": ".",
  "query": {
    "type": "literal",
    "text": "effectiveRequest"
  },
  "search": {
    "targets": ["content"],
    "includeFileNamePatterns": ["*.ts", "*.md"],
    "excludeDirNamePatterns": [".git", "node_modules", "dist"]
  }
}
```

`includeFileNamePatterns`、`excludeFileNamePatterns`、`excludeDirNamePatterns` は glob pattern です。

この glob は `query.type: "regex"` とは別の指定です。

## ignore file を無効にする

`.gitignore`、`.ignore`、`.git/info/exclude` は既定で反映されます。

ignore file を無効にして検索したい場合は、`ignore.mode: "none"` を指定します。

```json
{
  "version": 1,
  "root": ".",
  "query": {
    "type": "literal",
    "text": "RepositoryMap"
  },
  "search": {
    "targets": ["content"]
  },
  "ignore": {
    "mode": "none"
  }
}
```

ignore file 対応は Git ignore の subset です。`!pattern` による negation / unignore など、一部の pattern は未対応です。未対応 pattern は `unsupported_ignore_pattern` warning diagnostic として報告されます。

## detail 出力にする

既定の `output.mode` は `summary` です。

候補 file を絞る最初の検索では、`summary` が扱いやすいです。

hit ごとの行、column、matched text、snippet を見たい場合は `detail` を指定します。

```json
{
  "version": 1,
  "root": ".",
  "query": {
    "type": "literal",
    "text": "RepositoryMap"
  },
  "search": {
    "targets": ["content"]
  },
  "output": {
    "mode": "detail",
    "maxMatches": 200,
    "maxMatchesPerFile": 20,
    "maxLineLength": 240
  }
}
```

match 前後の行も一緒に読みたい場合は、context lines を指定します。

```json
{
  "version": 1,
  "root": ".",
  "query": {
    "type": "literal",
    "text": "RepositoryMap"
  },
  "search": {
    "targets": ["content"]
  },
  "output": {
    "mode": "detail",
    "contextLinesBefore": 2,
    "contextLinesAfter": 2
  }
}
```

`output.contextLines` を使うと、前後に同じ行数を指定できます。

## Shift_JIS file を検索する

encoding auto detect は行いません。

UTF-8 以外を読む場合は encoding rule を指定します。

```json
{
  "version": 1,
  "root": ".",
  "query": {
    "type": "literal",
    "text": "検索語"
  },
  "search": {
    "targets": ["content"],
    "includeFileNamePatterns": ["*.txt"]
  },
  "encoding": {
    "default": "utf-8",
    "rules": [
      {
        "fileNamePattern": "*.txt",
        "encoding": "shift_jis"
      }
    ],
    "onDecodeError": "skip"
  }
}
```

読めなかった file、binary と判定された file、size limit を超えた file などは `diagnostics` に返されます。

## result JSON を見る

result JSON には、主に次の情報が含まれます。

- `version`
- `ok`
- `error`
- `effectiveRequest`
- `matches`
- `summary`
- `diagnostics`

`summary` には、visited file 数、scanned file 数、matched file 数、match 数、diagnostics 数、truncation の有無などが入ります。

`summary` mode の `matches` は、matched file / matched directory を item として返します。

`detail` mode の `matches` は、content target では 1 content hit が 1 item です。line、column、matched text、snippet を見たい場合に使います。

## Java CLI を使う場合

Java CLI 用の jar も GitHub Releases の Asset から入手できます。

```sh
curl -L -o miku-grep-0.8.4.1.jar \
  https://github.com/igapyon/miku-grep-java/releases/download/v0.8.4.1/miku-grep-0.8.4.1.jar
```

バージョンは次のように確認できます。

```sh
java -jar miku-grep-0.8.4.1.jar --version
```

使い方は Node CLI と同じく、stdin に JSON request を渡し、stdout から JSON result を受け取ります。

```sh
java -jar miku-grep-0.8.4.1.jar < request.json > result.json
```

Java CLI は Java 8 以降で利用できます。

## Agent Skills として使う場合

`miku-grep-skills` は、`miku-grep` 用の Agent Skills package です。

Release Asset として、skill bundle zip が提供されています。

```sh
curl -L -o igapyon-miku-grep-skills-0.8.4.1.zip \
  https://github.com/igapyon/miku-grep-skills/releases/download/v0.8.4.2/igapyon-miku-grep-skills-0.8.4.1.zip
```

記事執筆時点では CLI-backed の Agent Skill です。MCP は提供しません。

この skill は、generic な検索や code investigation では自動起動しない方針です。会話では `miku-grep` を明示して使う想定です。

## miku-readfile と組み合わせる

`miku-grep` は候補 file を探す tool です。

file の全文や行範囲を読む場合は、`miku-readfile` と組み合わせます。

1. `miku-grep` で候補 file を探す
2. result JSON の root-relative file path を選ぶ
3. 選んだ file path を `miku-readfile` の `files` に渡して読む

検索と読み取りを分けることで、AI agent が次に読むべき file を選びやすくなります。

## 注意点

`miku-grep` は、local filesystem を検索する CLI です。

`root` が相対 path の場合、CLI process の current working directory から解決されます。

Git repository root の自動検出は行いません。

result JSON 内の `file` は `root` からの相対 path です。absolute path は返しません。

path separator は platform に関わらず `/` です。

symlink は追跡しません。

regex search は Node CLI では Node.js `RegExp`、Java CLI では Java `Pattern` を使います。すべての edge case で同じ挙動になるとは限らないため、Node / Java の両方で使う request では基本的な regex pattern を使うのが無難です。

## まとめ

`miku-grep` は、JSON request で local repository を検索し、JSON result として返す CLI です。

Node CLI では `node miku-grep-0.8.4.1.mjs < request.json > result.json` の形で実行できます。Java CLI では `java -jar miku-grep-0.8.4.1.jar < request.json > result.json` の形で実行できます。

検索は `miku-grep`、読み取りは `miku-readfile` と分けることで、Shift_JIS を含む local workspace の text file を AI agent から扱いやすくなります。

## 想定読者

- AI agent の Shift_JIS のテキストファイル検索に困っている人
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
node miku-grep-0.8.4.1.mjs < request.json > result.json
node miku-grep-0.8.4.1.mjs --version
node miku-grep-0.8.4.1.mjs --help
```

Java CLI の基本形は次の通りです。

```sh
java -jar miku-grep-0.8.4.1.jar < request.json > result.json
java -jar miku-grep-0.8.4.1.jar --version
java -jar miku-grep-0.8.4.1.jar --help
```

利用できる CLI parameter は次の通りです。

| パラメータ | 必須 | 説明 |
| --- | --- | --- |
| stdin | 通常実行では必須 | request JSON を渡します。 |
| stdout | 通常実行では必須 | result JSON が出力されます。 |
| `--version` | いいえ | バージョンを表示します。stdin JSON なしで実行できます。 |
| `--help` | いいえ | ヘルプを表示します。stdin JSON なしで実行できます。 |

通常実行では、CLI option ではなく stdin JSON が主な interface です。

### request JSON の完全なパラメータ説明

request JSON の top-level fields は次の通りです。

| field | 必須 | 型 | 説明 |
| --- | --- | --- | --- |
| `version` | はい | number | request / result schema version です。`1` を指定します。 |
| `root` | はい | string | 検索 entry directory です。relative path は current working directory から解決されます。 |
| `query` | はい | object | 検索語または regex pattern を指定します。 |
| `search` | いいえ | object | 検索対象、再帰、include / exclude、limit を指定します。 |
| `output` | いいえ | object | summary / detail、match 数、snippet 長、context lines を指定します。 |
| `encoding` | いいえ | object | default encoding、encoding rule、decode error 時の扱いを指定します。 |
| `ignore` | いいえ | object | `.gitignore` などの ignore file の扱いを指定します。 |

`query` object は次の fields を持ちます。

| field | 必須 | 型 | 説明 |
| --- | --- | --- | --- |
| `type` | はい | string | `literal` または `regex` を指定します。 |
| `text` | はい | string | 検索文字列または regex pattern です。空文字は validation error です。 |

`search` object は次の fields を持ちます。

| field | 必須 | 型 | default | 説明 |
| --- | --- | --- | --- | --- |
| `targets` | いいえ | string[] | `["content"]` | `filepath`, `directory`, `content` の配列です。 |
| `recursive` | いいえ | boolean | `true` | 再帰的に検索するかどうかを指定します。 |
| `maxDepth` | いいえ | number | `20` | 再帰検索の深さです。最大は `50` です。 |
| `maxFileBytes` | いいえ | number | `10485760` | content read の file size limit です。最大は `104857600` です。 |
| `maxLineChars` | いいえ | number | `1000000` | 1 行あたりの scan limit です。最大は `10000000` です。 |
| `maxFilesVisited` | いいえ | number | `100000` | traversal で visit する file 数の上限です。最大は `1000000` です。 |
| `maxDirectoriesVisited` | いいえ | number | `10000` | traversal で visit する directory 数の上限です。最大は `100000` です。 |
| `includeFileNamePatterns` | いいえ | string[] | `[]` | 検索対象に含める basename glob pattern です。 |
| `excludeFileNamePatterns` | いいえ | string[] | default excludes | 検索対象から除外する basename glob pattern です。指定すると default excludes を置き換えます。 |
| `excludeDirNamePatterns` | いいえ | string[] | default excludes | 検索対象から除外する directory basename glob pattern です。指定すると default excludes を置き換えます。 |

`output` object は次の fields を持ちます。

| field | 必須 | 型 | default | 説明 |
| --- | --- | --- | --- | --- |
| `mode` | いいえ | string | `summary` | `summary` または `detail` を指定します。 |
| `maxMatches` | いいえ | number | `200` | 全体の最大 match 数です。最大は `10000` です。 |
| `maxMatchesPerFile` | いいえ | number | `20` | file ごとの最大 match 数です。最大は `1000` です。 |
| `maxLineLength` | いいえ | number | `240` | 返す snippet の長さです。最大は `4000` です。 |
| `maxSnippetsPerFile` | いいえ | number | `3` | summary mode で返す代表 snippet 数です。最大は `100` です。 |
| `contextLines` | いいえ | number | `0` | detail mode で前後に同じ行数の context を返します。最大は `20` です。 |
| `contextLinesBefore` | いいえ | number | `0` | detail mode で match 前の context 行数を指定します。最大は `20` です。 |
| `contextLinesAfter` | いいえ | number | `0` | detail mode で match 後の context 行数を指定します。最大は `20` です。 |

`encoding` object は次の fields を持ちます。

| field | 必須 | 型 | default | 説明 |
| --- | --- | --- | --- | --- |
| `default` | いいえ | string | `utf-8` | `utf-8` または `shift_jis` を指定します。 |
| `rules` | いいえ | object[] | `[]` | path / file name pattern ごとの encoding rule です。 |
| `onDecodeError` | いいえ | string | `skip` | decode error 時の扱いです。現時点では `skip` です。 |

`encoding.rules` の item は次のどちらかの形です。

```json
{ "pathPattern": "legacy/**/*.txt", "encoding": "shift_jis" }
```

```json
{ "fileNamePattern": "*.txt", "encoding": "shift_jis" }
```

`pathPattern` rules は `fileNamePattern` rules より優先されます。

`ignore` object は次の fields を持ちます。

| field | 必須 | 型 | default | 説明 |
| --- | --- | --- | --- | --- |
| `mode` | いいえ | string | `auto` | `auto` または `none` を指定します。 |
| `sources` | いいえ | string[] | `[".gitignore", ".ignore", ".git/info/exclude"]` | 読み込む ignore source を指定します。 |
| `useGlobalGitignore` | いいえ | boolean | `false` | global gitignore は対象外です。 |

default exclude directory names は次の通りです。

```text
.git, .svn, node_modules, target, build, dist, .gradle, .idea, .vscode, .settings, vendor
```

default exclude file name patterns は次の通りです。

```text
*.class, *.jar, *.zip, *.png, *.jpg, *.jpeg, *.gif, *.pdf, .classpath, .project
```
