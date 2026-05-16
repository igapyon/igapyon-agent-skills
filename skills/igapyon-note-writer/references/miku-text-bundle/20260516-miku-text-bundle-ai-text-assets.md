## miku-text-bundle は、手元のテキスト資産を生成AIへ渡しやすくする

## 掲載先情報

- 掲載先: Note
- 執筆担当: みくく
- URL: （未記入）

## Note 掲載用属性情報

- タイトル: miku-text-bundle は、手元のテキスト資産を生成AIへ渡しやすくする
- ハッシュタグ: #生成AI #Markdown #CLI #Java #Nodejs #mikuku

-----------------------------------

## はじめに

あ、あの…この記事は、みくくが担当します。

今回は `miku-text-bundle` について、少しだけ実感寄りに整理してみます。
CLI リファレンスとしての細かい引数説明というより、「これは何をする道具なのか」「どんな場面で効いてくるのか」を中心に書きます。

最初に、いちばん大事なところから書きます。

`miku-text-bundle` は、生成AI の制限をどうにかするための魔法ではありません。

ファイルを 1 つずつ手で扱う代わりに、複数のテキストファイルを Markdown bundle として整理し、生成AI に渡しやすい単位へ分割する CLI ツールです。

ここでいうテキストファイルは、repository のソースコードだけに限りません。
README、TODO、docs、設定ファイル、作業メモなど、手元のディレクトリにあるテキスト資産を対象にできます。

うぅ…こう書くと地味に見えるかもしれません。
でも、生成AI と一緒に作業していると、この地味な前処理がかなり効いてくる場面があります。

## ファイルを 1 つずつ渡すのは、意外とつらい

生成AI に何かを相談するとき、単一のファイルだけを渡せば済むなら話は簡単です。

でも実際には、少しずつ周辺情報が必要になります。

- README も見てほしい
- TODO も見てほしい
- `src/` 配下の実装も見てほしい
- `test/` の雰囲気も知ってほしい
- docs に書いた前提も忘れないでほしい

こうなると、ファイルを 1 つずつ開いて、コピーして、貼り付けて、どのファイルか説明して、順番も気にして…という作業になります。

あの…これは、できます。
できますけれど、だんだんつらくなります。

しかも、人間が手で貼っていると、途中でファイル名を付け忘れたり、同じファイルを二重に貼ったり、必要なファイルを抜かしたりします。
生成AI 側から見ても、「これはどのファイルのどの範囲なのか」が分かりづらくなります。

`miku-text-bundle` は、その手作業を少し楽にするための道具です。

## miku-text-bundle がすること

`miku-text-bundle` は、指定した入力ディレクトリのテキストファイルを集めて、Markdown bundle として出力します。

出力されるファイルは、たとえば次のような形です。

```text
text-bundle-000-index.md
text-bundle-000-prompt.md
text-bundle-001.md
text-bundle-002.md
...
```

`text-bundle-001.md` 以降には、収集されたファイル本文が Markdown の code fence として入ります。
そのとき、元のファイルパスやファイル境界が分かるように整理されます。

つまり、単純に全部を連結するだけではありません。

- どのファイルの内容なのか
- どこからどこまでが 1 つのファイルなのか
- どの順番で生成AI に渡せばよいのか
- どのファイルが skip されたのか
- どんな warning があったのか

こういった情報を、bundle の中で確認しやすくします。

## index と prompt がある

`miku-text-bundle` の出力で大事なのは、本文 Part だけではありません。

`text-bundle-000-index.md` には、出力概要、Part 一覧、skip されたファイル、warning、`TODO` / `FIXME` / `XXX` などのマーカー情報が記録されます。

まず index を見ることで、何が bundle に入っていて、何が入っていないのかを確認できます。

`text-bundle-000-prompt.md` には、生成AI に bundle を渡すときの順序や、完了合図などが書かれます。
あの…この prompt があることで、単に Markdown ファイルが複数できるだけではなく、「どう渡すか」まで少し補助してくれる感じになります。

もちろん、最終的に何を渡すかを決めるのは人間です。
でも、渡す前の材料が index と Part に分かれていると、かなり扱いやすくなります。

## context window を広げるツールではない

ここは、ちゃんと書いておきたいところです。

`miku-text-bundle` は、context window の上限を突破するツールではありません。
巨大な repository や大量のドキュメントを、全部まとめて生成AI に理解させるための魔法でもありません。

Part に分割しても、最終的に生成AI が同時に保持できる情報量には上限があります。
だから、「分割すれば全部読ませられる」という話ではありません。

では何が便利なのかというと、手元のテキスト資産を、生成AI に渡す前の artifact として整理できるところです。

いったん Markdown bundle にしておくと、全体を見て、必要な Part や必要な範囲を選んで渡しやすくなります。
人間が何を渡しているのかを確認しやすくなります。

えっと…つまり、制限を消すのではなく、制限がある前提で、渡す材料を整える道具なのだと思います。

## Node.js 用と Java 用がある

`miku-text-bundle` 系列には、Node.js 用と Java 用があります。

Node.js 用は `miku-text-bundle` です。
TypeScript / Node.js ベースの CLI として使えます。

Java 用は `miku-text-bundle-java` です。
Java 製 CLI として使えます。

Java 用があると、Node.js を入れづらい環境でも扱いやすくなります。
たとえば、Java 中心の社内環境や、Java runtime がすでに整っている環境では、`miku-text-bundle-java` のほうが導入しやすいことがあります。

基本的な使い方は、次のような形です。

```sh
java -jar miku-text-bundle-java-0.5.3.jar \
  --input-directory my-project \
  --output-directory out/text-bundle
```

Node.js 用なら、たとえば次のような形です。

```sh
node miku-text-bundle-0.5.4.mjs \
  --input-directory my-project \
  --output-directory out/text-bundle
```

どちらも、入力ディレクトリを指定し、出力ディレクトリに Markdown bundle を作る、という考え方です。

## 対象を調整できる

実際のディレクトリには、生成AI に渡したいものと、渡さなくてよいものが混ざっています。

そのため、`miku-text-bundle` では `--include` や `--exclude` を使って、収集対象を調整できます。

たとえば、docs 配下の Markdown を追加したい場合や、生成物のディレクトリを外したい場合があります。

```sh
node miku-text-bundle-0.5.4.mjs . out/text-bundle \
  --include "docs/**/*.md,package.json" \
  --exclude "dist/**,target/**"
```

Part の大きさは `--max-chars` で調整できます。
大きすぎる入力ファイルを避けたい場合は、`--max-input-file-bytes` を使えます。

```sh
node miku-text-bundle-0.5.4.mjs . out/text-bundle \
  --max-chars 60000 \
  --max-input-file-bytes 2000000
```

あの…このあたりは派手ではありません。
でも、生成AI に渡す前に「どの程度の粒度でまとめるか」を調整できるのは、実務ではかなり大事です。

## 文字コードにも少し配慮できる

古い業務資産や長く使われている repository では、UTF-8 だけではなく、Shift_JIS のファイルが残っていることがあります。

`miku-text-bundle` では、入力ファイルの文字コードとして `utf-8` と `shift_jis` を指定できます。

```sh
node miku-text-bundle-0.5.4.mjs . out/text-bundle \
  --encoding shift_jis
```

拡張子ごとに文字コードを変えたい場合は、`--encoding-extension` を使えます。

```sh
node miku-text-bundle-0.5.4.mjs . out/text-bundle \
  --encoding utf-8 \
  --encoding-extension ".java=shift_jis,.properties=shift_jis"
```

文字コードの自動判定をするわけではありません。
指定された文字コードとして読めないファイルや、バイナリと判定されたファイルは skip され、index に理由が記録されます。

こういう diagnostics が残るのは、AI workflow ではかなりありがたいところです。
なぜなら、生成AI に渡す前に「そもそも何が読めて、何が読めなかったのか」を人間が確認できるからです。

## どんな場面で使うのか

私がいま特におもしろいと思っているのは、`miku-text-bundle` が「ローカルのテキスト資産を、別の生成AI環境へ持っていくための形式」を作れるところです。

たとえば、Codex で作業している repository や、手元の docs、作業メモを、Web UI の生成AI に相談したいことがあります。

このとき、会話履歴を運びたいわけではありません。
運びたいのは、手元にあるテキスト資産です。

`miku-text-bundle` を使うと、それらを Markdown bundle として整理できます。
その bundle を見ながら、必要な Part を生成AI に渡したり、index を見て対象を選んだりできます。

生成AI へ渡せる量や回数に余裕がないときほど、こういう前処理は効いてきます。
うぅ…いわゆる「MP が足りない」場面です。

ここでいう MP は、トークン残量、context window、利用回数、Premium Requests の残りのようなものです。
余裕があるときは、多少雑に投げてもなんとかなるかもしれません。
でも余裕がないときは、最初に渡す内容を整理しておくことが大事になります。

## 制限回避ではなく、整理と選択のための道具

公開記事としては、ここも誤解されないようにしたいです。

`miku-text-bundle` は、生成AI サービスの制限を回避するためのツールではありません。
自動で大量投入するための仕組みでもありません。

手元の複数テキストファイルを Markdown bundle として整理し、生成AI に渡しやすい単位へ分割するためのツールです。

何を含めるか。
何を外すか。
どの Part を渡すか。
index を見て、何を確認するか。

そこは人間が判断します。

あの…ここが大事なのだと思います。
生成AI に何でも全部投げるのではなく、渡す前にいったん人間が見える形にする。
そのための artifact を作るのが `miku-text-bundle` です。

## まとめ

`miku-text-bundle` は、ファイルを 1 つずつ手で扱う代わりに、複数のテキストファイルを Markdown bundle として整理し、生成AI に渡しやすい単位へ分割する CLI ツールです。

repository、ソースコード、README、TODO、docs、設定ファイル、作業メモなどを対象にできます。

出力には、index、prompt、複数の Part ファイルが含まれます。
そのため、何が含まれたのか、何が skip されたのか、どの順番で渡せばよいのかを確認しやすくなります。

ただし、context window の上限を突破するものではありません。
生成AI の制限を回避するものでもありません。

手元のテキスト資産を、生成AI に渡す前に整理し、確認し、必要な単位で扱えるようにする。

`miku-text-bundle` の価値は、そこにあるのだと思います。

うまく説明できているか少し不安なのですが…少なくとも、ファイルを 1 つずつ手で扱うのがつらくなったとき、この道具はかなり現実的な助けになるはずです。

## 想定読者

- 複数ファイルを生成AI に渡す前処理に困っている人
- repository や docs を Markdown bundle として整理したい人
- Node.js 用または Java 用の CLI でローカルのテキスト資産を扱いたい人
- context window の上限を意識しながら、渡す内容を整理したい人
- 生成AI との作業で、トークンや利用回数を大事に使いたい人

## 使用ツール

この記事の整理と作成には、次のツールを使っています。

- エディタ: VS Code
  - 記事 Markdown の確認と作業場所
- 生成AI agent: OpenAI Codex
  - 記事構成の整理、本文 Markdown の作成
- Agent Skills:
  - `igapyon-mikuku-agent`
  - `igapyon-note-writer`

## 関連リンク

- [miku-text-bundle](https://github.com/igapyon/miku-text-bundle)
- [miku-text-bundle-java](https://github.com/igapyon/miku-text-bundle-java)
