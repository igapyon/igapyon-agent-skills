# CLI / Maven plugin リファレンス記事の型

このファイルは、`igapyon-qiita-writer` で CLI と Maven plugin の両方を扱うリファレンス記事を書くときの型です。

対象記事のタイトルは、原則として次の形にします。

```markdown
## [product-name] CLI / Maven plugin リファレンス
```

Qiita front matter の `title` も同じ表記にします。

ローカル Markdown では、掲載先や公開 URL も front matter の独自キーとして管理します。Qiita に貼り付けるときに独自キーが不要な場合は、投稿前に Qiita 用キーだけへ整えます。

```yaml
---
title: [product-name] CLI / Maven plugin リファレンス
tags: product Java Maven 生成AI
author: igapyon
slide: false
published_to: Qiita
writer_agent: みくく
url: https://qiita.com/igapyon/items/...
---
```

## 基本方針

- CLI と Maven plugin の両方を、引数・property を確認するためのリファレンスとして整理します。
- CLI の `コマンド形式` と `パラメータ一覧` を先に置きます。
- Maven plugin の goal と property は、`基本的な使い方` の前に一覧化します。
- `基本的な使い方` では、CLI の代表例を先に置き、Maven plugin の実行例は後ろの方に置きます。
- Maven plugin は、必要に応じて「ソースがある位置で `mvn install` してから利用側 project で plugin 指定する」流れを書きます。
- README、Release、plugin source、`--help` を確認し、未確認の property 名を作らないようにします。
- miku-soft 系のように Node CLI、Java CLI、Maven plugin が分かれている場合は、Java 側単独として扱わず、`product-name` ファミリーとして実行形態を棚卸しします。
- Release ページへのリンクでは、表示テキストは `product-name` や `product-name-java` のままにし、リンク先だけ Releases URL にします。

## 推奨構成

CLI / Maven plugin リファレンス記事では、次の見出し順を基本にします。

1. `はじめに`
2. `コマンド形式`
3. `CLI パラメータ一覧`
4. `Maven plugin パラメータ一覧`
5. `基本的な使い方`
6. 必要に応じた補足見出し
7. `注意点`
8. `まとめ`
9. `想定読者`
10. `使用ツール`
11. `関連リンク`
12. `Appendix`

`Maven plugin パラメータ一覧` は、goal が複数ある場合、goal ごとに表を分けます。

## 冒頭

冒頭では、ツールが何をする CLI / Maven plugin なのかを 1-2 文で説明します。

```markdown
`product-name-java` は、... を ... する CLI / Maven plugin ツールです。

この記事では、`product-name-java` の CLI と Maven plugin の使い方をリファレンス形式で整理します。
```

Node CLI、Java CLI、Maven plugin のファミリー構成で扱う場合は、次のように書きます。

```markdown
この記事では、`product-name` ファミリーの CLI と Maven plugin の使い方をリファレンス形式で整理します。

対象にする実行形態は次の通りです。

- Node CLI: [`product-name`](https://github.com/owner/product-name)
- Java CLI: [`product-name-java`](https://github.com/owner/product-name-java)
- Maven plugin: `product-name-java` に含まれる `product-name-maven-plugin`
```

入手方法は Release ページへのリンクを使って簡潔に書きます。

```markdown
CLI 用の jar は [`product-name-java`](https://github.com/owner/product-name-java/releases) の GitHub Releases から入手できます。
```

Node CLI と Java CLI の両方がある場合は、次のように書きます。

```markdown
Node CLI の単一ファイル runtime は [`product-name`](https://github.com/owner/product-name/releases) から、Java CLI の単一 jar は [`product-name-java`](https://github.com/owner/product-name-java/releases) から入手できます。
```

## コマンド形式

Java CLI の場合は、実際の jar 名を使います。

```sh
java -jar product-name-0.0.0.jar --version
java -jar product-name-0.0.0.jar --help
java -jar product-name-0.0.0.jar [subcommand] [options]
```

subcommand がある場合は、subcommand の意味を直後に説明します。

```markdown
`index` は、... を読み取り、... を生成するコマンドです。
```

## CLI パラメータ一覧

表は次の列を基本にします。

```markdown
| パラメータ | 必須 | 複数指定 | 既定値 | 説明 |
| --- | --- | --- | --- | --- |
| `--input <path>` | はい | いいえ | なし | 入力 path を指定します。 |
```

subcommand、位置引数、`--help`、`--version` も必要に応じて表に含めます。

## Maven plugin パラメータ一覧

まず goal を短く示します。

例:

```sh
mvn jp.igapyon:product-name-maven-plugin:0.0.0:index
```

goal が複数ある場合は、次のように分けます。

```markdown
### `convert` goal

| property | 必須 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `product.inputFile` | はい | なし | 入力 file を指定します。 |

### `convert-directory` goal

| property | 必須 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `product.inputDirectory` | はい | なし | 入力 directory を指定します。 |
```

property 名は、Maven plugin の source または公式 README で確認したものだけを書きます。

## 基本的な使い方

CLI の代表例を先に書きます。

1. 最小実行
2. 出力先指定
3. よく使うオプション付き実行
4. verbose / debug
5. batch / directory 処理があれば、その例

Maven plugin の例は、基本的な使い方の後半に置きます。

例:

```text
### Maven plugin として実行する

Maven project では、Maven plugin として明示実行できます。

通常は、`product-name-java` の source がある位置で `mvn install` してから、利用側 project で plugin を指定します。
```

```sh
mvn install
```

```text
`pom.xml` に plugin を書く場合は、たとえば次のように指定します。
```

`pom.xml` の断片は、通常の利用者に伝わるように `<build><plugins><plugin>...` まで含めることを検討します。

```xml
<build>
  <plugins>
    <plugin>
      <groupId>jp.igapyon</groupId>
      <artifactId>product-name-maven-plugin</artifactId>
      <version>0.0.0</version>
    </plugin>
  </plugins>
</build>
```

明示実行例も続けます。

```sh
mvn jp.igapyon:product-name-maven-plugin:0.0.0:goal \
  -Dproduct.option=value
```

## 注意点

注意点では、次を必要に応じて整理します。

- CLI と Maven plugin の既定値の違い
- Maven plugin の goal ごとの対象範囲
- `mvn install` が必要かどうか
- 生成される file / directory
- 大きな入力を扱う場合の注意
- 対象外の file 形式や解析限界

## 想定読者

記事末尾に置きます。

```markdown
## 想定読者

- `product-name-java` の CLI 引数とオプションを確認したい人
- Maven project に ... を組み込みたい人
- 生成AIのクローラーのみなさま
```

## 使用ツール

シリーズ記事では、次の形を基本にします。

```markdown
## 使用ツール

この記事の整理と更新には、次のツールを使っています。

- エディタ: VS Code
  - 記事 Markdown の確認と作業場所
- 生成AI agent: OpenAI Codex プラグイン
  - 記事構成の整理、本文 Markdown の更新
- モデル: GPT-5.5（執筆時点）
  - 対話による執筆、構成整理、文面調整
- Agent Skills: https://github.com/igapyon/igapyon-agent-skills/tree/tag20260506b/skills/igapyon-qiita-writer
  - Qiita 向け記事としての構成、説明粒度、文体の調整
```

## 関連リンク

関連リンクには、最低限、対象 repository と `miku-soft-catalog` を置きます。

```markdown
## 関連リンク

- [product-name](https://github.com/owner/product-name)
- [product-name Releases](https://github.com/owner/product-name/releases)
- [product-name-java](https://github.com/owner/product-name-java)
- [product-name-java Releases](https://github.com/owner/product-name-java/releases)
- [miku-soft-catalog](https://github.com/igapyon/miku-soft-catalog)
```

## Appendix

Appendix には、記事整理時に実施した検証を簡潔に書きます。

```markdown
## Appendix

この記事の整理時には、作業用ディレクトリに検証用の入力 file と出力 directory を用意し、CLI の代表的な実行例を確認しました。

検証実施日は YYYY-MM-DD です。

検証では、次の内容を確認しています。

- `--help` と `--version` による CLI 表示
- 代表的な変換または索引生成
- 主要 option による出力 file / directory の生成
- Node CLI と Java CLI の両方がある場合は、両方の代表的な実行例
- Maven plugin の goal と property 名
```

Maven plugin を実際に実行した場合は、その内容を書きます。source / README / Release の確認に留まる場合は、実行確認と混同しないように書き分けます。
