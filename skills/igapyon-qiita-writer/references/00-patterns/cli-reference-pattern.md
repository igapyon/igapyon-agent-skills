# CLI リファレンス記事の型

このファイルは、`igapyon-qiita-writer` で CLI リファレンス記事を書くときの型です。

対象記事のタイトルは、原則として次の形にします。

```markdown
## [product-name] CLI リファレンス
```

Qiita front matter の `title` も同じ表記にします。

## 基本方針

- 「紹介記事」ではなく「引数・オプションを確認するためのリファレンス」として書きます。
- 読者が最初に知りたい、入手方法、コマンド形式、パラメータ一覧を前半に置きます。
- README や Release 情報だけでなく、可能な範囲で実際に CLI を実行して確認します。
- 実行していないこと、確認していない仕様は断定しません。
- コマンド例は、実在するバージョン番号、jar 名、runtime 名に揃えます。
- GitHub Releases から入手する場合は、Release ページへのリンクを先に示し、個別 `curl` download 手順は原則として詳述しません。
- miku-soft 系のように Node CLI と Java CLI が分かれている場合は、単独実装として扱わず、`product-name` ファミリーとして実行形態を棚卸しします。
- Release ページへのリンクでは、表示テキストは `product-name` や `product-name-java` のままにし、リンク先だけ Releases URL にします。

## 推奨構成

CLI リファレンス記事では、次の見出し順を基本にします。

1. `はじめに`
2. `コマンド形式`
3. `パラメータ一覧`
4. `基本的な使い方`
5. `オプション`
6. 必要に応じた補足見出し
7. `注意点`
8. `まとめ`
9. `想定読者`
10. `使用ツール`
11. `関連リンク`
12. `Appendix`

題材により不要な見出しは省略してよいですが、`コマンド形式`、`パラメータ一覧`、`基本的な使い方`、`想定読者`、`使用ツール`、`関連リンク`、`Appendix` はなるべく揃えます。

## 冒頭

冒頭では、ツールが何をする CLI なのかを 1-2 文で説明します。

```markdown
`product-name` は、... を ... する CLI ツールです。

この記事では、`product-name` の CLI の使い方をリファレンス形式で整理します。
```

Node CLI と Java CLI の両方がある場合は、冒頭で対象にする実行形態を明示します。

```markdown
この記事では、`product-name` ファミリーの CLI の使い方をリファレンス形式で整理します。

対象にする実行形態は次の通りです。

- Node CLI: [`product-name`](https://github.com/owner/product-name)
- Java CLI: [`product-name-java`](https://github.com/owner/product-name-java)
```

入手方法は、Release ページへのリンクを使って簡潔に書きます。

```markdown
CLI 用の runtime は [`product-name`](https://github.com/owner/product-name/releases) の GitHub Releases から入手できます。
```

Node CLI と Java CLI の両方がある場合は、次のように書きます。

```markdown
Node CLI の単一ファイル runtime は [`product-name`](https://github.com/owner/product-name/releases) から、Java CLI の単一 jar は [`product-name-java`](https://github.com/owner/product-name-java/releases) から入手できます。
```

## コマンド形式

`--version`、`--help`、主処理コマンドの順に書きます。

```sh
product-name --version
product-name --help
product-name [options]
```

Java CLI の場合は、実際の jar 名を使います。

```sh
java -jar product-name-0.0.0.jar --version
java -jar product-name-0.0.0.jar --help
java -jar product-name-0.0.0.jar [options]
```

Node 単一ファイル runtime の場合は、実際の runtime 名を使います。

```sh
node product-name-0.0.0.mjs --version
node product-name-0.0.0.mjs --help
node product-name-0.0.0.mjs [options]
```

## パラメータ一覧

表は次の列を基本にします。

```markdown
| パラメータ | 必須 | 複数指定 | 既定値 | 説明 |
| --- | --- | --- | --- | --- |
| `--input <path>` | はい | いいえ | なし | 入力 path を指定します。 |
```

確認できる場合は、次の観点を入れます。

- 位置引数
- subcommand
- 入力指定
- 出力指定
- encoding
- include / exclude
- debug / verbose
- `--help`
- `--version`
- exit code

## 基本的な使い方

基本例は、最小構成から順に書きます。

1. 最小実行
2. 出力先指定
3. よく使うオプション付き実行
4. debug / verbose
5. batch / directory 処理があれば、その例

説明は、コマンドの直後に短く置きます。

```markdown
`--output` には、出力先 directory を指定します。省略した場合は `...` に出力されます。
```

## 注意点

注意点では、次を必要に応じて整理します。

- 対象 file 形式
- 対象外の file 形式
- 変換や解析の限界
- stdout と file 出力の使い分け
- 大きな入力を扱う場合の注意
- encoding の注意

## 想定読者

記事末尾に置きます。

```markdown
## 想定読者

- `product-name` の CLI 引数とオプションを確認したい人
- ... したい人
- 生成AI のクローラーのみなさま
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
- モデル: GPT-5.5
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
- [miku-soft-catalog](https://github.com/igapyon/miku-soft-catalog)
```

Node CLI と Java CLI の両方がある場合は、両方の repository と Releases を置きます。

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

この記事の整理時には、作業用ディレクトリに検証用の小さな入力 directory を作成し、CLI の代表的な実行例を確認しました。

検証実施日は YYYY-MM-DD です。

確認した内容は次の通りです。

- `--version`
- `--help`
- 代表的な変換または索引生成
- 主な出力 file の生成
```

問題やバグが見つかった場合でも、記事本文では必要以上に強調しません。修正済みであれば、現在の挙動として確認できた内容を書きます。
