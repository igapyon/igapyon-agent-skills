---
title: [miku-soft] 生成AI時代におけるアプリケーションのソフトウェアアーキテクチャ設計
tags: mikuku 生成AI MCP AgentSkills ソフトウェアアーキテクチャ
author: igapyon
slide: false
---
## はじめに

最近、`Mikuku` さんと私が作っている `miku` 系の小さなソフトウェア群について、ソフトウェア方式の観点から整理してみました。この整理情報は他のアプリでも役立つ可能性があります。

これらのソフトウェア群は、Excel、Word、MS Project XML、MusicXML、ABC、ソースツリーなど、既存のドメインファイルを読み取り、Markdown、JSON、XML、SVG、XLSX、ZIP などの扱いやすい成果物へ変換するツール群です。

入力ファイルの読み取りや成果物の生成を、基本的にネットワークを利用せずに、まず利用者の手元の環境で完結させるようになっています。

私は便宜上、この系統の設計を `miku-soft` と呼ぶこととします。

この記事では、個別アプリの細かい仕様ではなく、`miku-soft` 全体を支える方式設計を整理して紹介します。

## この記事で扱うこと

この記事では、`miku-soft` を構成する Web UI、CLI、Java CLI、Agent Skills、MCP サーバーを、同じ product core を見せる複数のエントリポイントとして整理します。

特に、次の観点を扱います。

- セマンティクスの中心をどこに置くか
- Web UI、CLI、Java CLI、Agent Skills、MCP サーバーの役割をどう分けるか
- diagnostics と成果物を、生成AIや自動化処理から扱いやすい契約としてどう考えるか
- TypeScript / Node.js / Java 8 / Java 1.8 を、実行環境ごとにどう使い分けるか
- MCP の stdio 方式と HTTP 方式を、どのように区別して考えるか

一方で、個別リポジトリの細かい CLI オプションや、各ファイル形式の変換仕様までは扱いません。

## 前提制約

まず `miku-soft` は、専門ソフトを置き換えるものではありません。

Excel、Word、MS Project、楽譜ソフト、IDE などを再実装するのではなく、既存の専門ソフトや既存ファイルの間に立ち、人間、スクリプト、生成AIが扱いやすい成果物へ変換して橋渡しする小さな道具群として考えています。

```text
specialized software / domain file
  -> miku-soft の橋渡しツール
  -> Markdown / JSON / XML / SVG / XLSX / ZIP / diagnostics
  -> 人間 / スクリプト / AI agent
```

もう一つの制約は、手元の環境で動き、ネットワークがなくても使え、入力内容を外部へ出しにくくすることです。

扱う入力には、業務文書、設計書、プロジェクト計画、楽譜、表計算ファイル、ソースコードなどが含まれます。外部サービスへ不用意に送れないものも含まれます。

そのため、`miku-soft` は外部サーバーやクラウド API を前提にしない設計を基本にします。

- Web UI はブラウザ内でローカルに動作する
- CLI はローカルファイルを読み書きする
- Agent Skills や MCP サーバーも、まずは手元にある実行部品を呼ぶ

この制約が、エントリポイントの分割、実行環境の選定、通信方式の選定に影響してきます。

## セマンティクスの中心を core に置く

方式設計として最初に決めたいのは、セマンティクスの中心です。`miku-soft` では、セマンティクスの中心を上流の主要アプリケーションの core に置きます。

Web UI、CLI、Java CLI、Agent Skills、MCP サーバーは、セマンティクスの所有者ではありません。それぞれの利用者や実行環境に向けて、同じ core を見せるエントリポイントです。

```text
Upstream Main Application
  = セマンティクスの所有者 / product core

Web UI
  = 人間向けの確認面

CLI / Java CLI
  = 再実行しやすい実行エントリポイント

Agent Skills
  = AI agent 向けの作業手順

MCP server
  = MCP client 向けの呼び出し口
```

もし各エントリポイントがそれぞれ独自にセマンティクスを持ち始めると、同じ入力に対して Web UI と CLI で結果がずれたり、Agent Skills や MCP サーバーだけが別の解釈を持ったりします。この形に寄ると、生成AIや自動化処理から安全に扱いにくくなってしまいます。保守の負荷も上がってしまいそうですね。

それを避けるため、セマンティクスは core に置き、各エントリポイントは adapter として扱います。

## エントリポイントを分ける

`miku-soft` では、同じ product core を複数のエントリポイントとして見せます。

```text
Product Core
  -> Web UI
  -> Node.js CLI
  -> Java CLI
  -> Agent Skills
  -> MCP server
```

これは機能を横に増やしているというより、利用者、実行環境、操作様式ごとにエントリポイントを分けている、という見方です。

## Web UI の役割

Web UI は、人間が確認するためのエントリポイントです。

- 入力ファイルを選ぶ
- 変換結果をプレビューする
- summary や diagnostics を見る
- 必要な成果物を保存する

初めて使うツールでは、いきなり CLI を実行するよりも、画面上で入力と出力の関係を確認できるほうが安心できます。ただし、Web UI は `セマンティクスの所有者` ではありません。Web UI の状態だけが正で、CLI や Agent Skills から同じ処理を再現できない、という形にはしません。

## CLI の役割

CLI は、人間、バッチ処理、スクリプト、CI、AI agent が、同じ処理を再現可能に実行するためのエントリポイントです。

CLI では、次のような要素を通じて、処理を明示的に扱えます。

- 入力ファイル
- 出力ファイル
- オプション
- stdout
- stderr
- exit code
- diagnostics

AI agent は Web UI の画面を眺めるよりも、ファイル、JSON、exit code、diagnostics、summary のような構造化された結果を扱うほうが安定します。

CLI は Web UI のおまけではありません。ただし、CLI もセマンティクスの複製場所になってはなりません。

CLI は次の部分を担当します。

- オプション解釈
- ファイル入出力
- 標準出力
- 標準エラー
- 終了コード

実際の変換や診断生成は core に寄せます。

## Java CLI の役割

Node.js CLI と Java CLI では、想定する端末環境が少し違います。

- Node.js CLI は、開発者や macOS 利用者には比較的自然です。
- 企業などで管理下にある業務端末では、Node.js が標準の実行環境として入っていないことがあります。
- Java は業務システム、社内ツール、Maven、古くからの開発環境などの関係で、端末に入っている確率が比較的高そうな実行環境です。

そのため、`miku-soft` では Java 8 / Java 1.8 で動作する Java CLI も提供対象にします。

ここでの Java CLI は、Java-first な再設計ではありません。TypeScript で実装され Node.js で動く上流の主要アプリケーションを、Java / Maven 環境でも実行可能にするためのエントリポイントなのです。

## Agent Skills の役割

Agent Skills は、AI agent が作業手順を理解して使うためのエントリポイントです。

CLI がコマンドを提供するエントリポイントだとすると、Agent Skills は、そのコマンドをどの文脈で、どの順序で、どの成果物に対して使うべきかを説明するエントリポイントです。

Agent Skills には、たとえば次の情報を持たせます。

- いつ activation するか
- どの実行部品を使うか
- どの操作をどの順序で呼ぶか
- state、draft、patch、projection、report、diagnostics をどう区別するか
- hard error と soft warning をどう扱うか
- 生成ファイルをどこへ置くか
- CLI backend と MCP backend をどう選ぶか

実装の中心は Markdown と JSON です。

`SKILL.md` や `references/*.md` に作業手順や制約を書き、`index.json` や metadata JSON に機械が読みやすい情報を置きます。

さらに、`miku-soft` では CLI 内包型 Agent Skills が考慮されています。

```text
some-miku-skill/
  SKILL.md
  references/
  index.json
  runtime/
    product-cli.js
    product-cli.jar
```

AI agent は `SKILL.md` を読み、同じ package の中にある CLI 実行部品を呼び出して処理を進められます。

ここでも、Agent Skills がセマンティクスを再実装しないことが重要です。

Agent Skills は、上流 CLI、公開 API、MCP サーバーをどう安全に使うかを AI agent に教える作業手順 adapter として扱います。

## MCP サーバーの役割

MCP サーバーは、AI client が product operation を tool / resource / prompt として呼ぶための通信規約上のエントリポイントです。

Agent Skills が AI agent に「どう使うべきか」を渡すエントリポイントだとすると、MCP サーバーは AI client に「どう呼べるか」を公開するエントリポイントです。

MCP サーバーでは、次の形が重要になります。

- tool name
- input schema
- result schema
- resource URI
- prompt
- diagnostics

MCP tool name は、可能であれば上流 CLI の command tree との対応を追える名前にします。CLI、Agent Skills、MCP サーバー、docs、tests の対応関係を追いやすくするためです。

ただし、MCP サーバーもセマンティクスの所有者ではありません。MCP サーバーは、上流の公開 API、Node.js CLI 実行部品、Java CLI 実行部品などを呼び出す通信規約 adapter として設計します。

## diagnostics と成果物を契約として扱う

変換ツールでは、成功した出力だけを見ると重要な情報を見落とします。

現実のファイルには、次のようなものが出てきます。

- 未対応の要素
- 曖昧な構造
- fallback した値
- 失われた情報
- 解釈できなかった範囲

そのため `miku-soft` では、diagnostics を副産物ではなく `契約` として扱います。

diagnostics は、利用者ごとに少し違う役割を持ちます。

- 人間向け Web UI では、確認画面に表示する情報になります。
- AI agent や MCP client にとっては、次の操作を安全に選ぶための判断材料になります。

たとえば、次のような判断が必要になります。

- 出力ファイルが生成されていても、重大な warning があるなら、そのまま次の形式へ渡すべきではないかもしれません。
- 軽微な fallback であれば、処理を続けてもよいかもしれません。

この判断を可能にするには、diagnostics が自然文ログだけではなく、できるだけ構造化された出力である必要があります。

成果物は、保存、比較、再実行できるファイルとして扱います。
人間の確認だけでなく、AI agent が処理を段階的に進めるためにも重要です。

## 言語 / 実行環境をエントリポイントごとに選ぶ

`miku-soft` では、プログラミング言語を一つに固定しません。
エントリポイントごとに、現実的に一番合う言語と実行環境を選びます。

念のため、用語の用法について以下のように記述することにします。

- プログラミング言語を述べるときは TypeScript と書きます。
- 実行環境を述べるときは Node.js と書きます。

この記事の構成では、TypeScript は JavaScript へ変換してブラウザや Node.js 上で動かします。

結果として、エントリポイントごとの言語と実行環境は次のようになります。

```text
Web UI
  -> TypeScript 実装
  -> JavaScript bundle
  -> ブラウザ実行

CLI
  -> TypeScript 実装
  -> Node.js 実行

Java CLI
  -> Java 8 / Java 1.8 実行

Agent Skills
  -> Markdown / JSON
  -> 同梱された Node.js CLI 実行部品
  -> 同梱された Java 8 / Java 1.8 CLI 実行部品

MCP server
  -> TypeScript 実装
  -> Node.js 実行
```

TypeScript / Node.js を採用する理由は、エントリポイントごとに少し違います。

- Single-file Web App はブラウザで動かすため、TypeScript を採用します。実行時には JavaScript へトランスパイルして利用します。
- CLI も同じ TypeScript core を使い、Node.js で動かします。
- MCP サーバーも TypeScript で実装し、Node.js で動かします。MCP の公式 SDK 一覧では TypeScript SDK が前面に出ており、Tier 1 として扱われていることも理由です。

Java CLI は別の理由です。
Java は、Single-file Web App や MCP サーバーの主実装にしたいから選ぶのではありません。  
Node.js が入っていない業務端末でも、Java なら入っている確率が高そうな実行環境として選びます。

生成AI駆動開発のおかげで、プログラミング言語の選択はかなり自由にできるようになりました。

以前なら保守負荷の高さで避けたかもしれない構成でも、生成AIに実装、変換、テスト追加、差分確認、mapping document の整理を手伝ってもらえるなら、選択しやすくなります。

## 下流 adapter として Java / Agent Skills / MCP を置く

Java CLI、Agent Skills、MCP サーバーは、それぞれ下流 adapter として扱います。

Java CLI は、TypeScript からのストレートコンバージョンで作ります。ここでいうストレートコンバージョンは、単純な機械翻訳ではありません。

上流の TypeScript 版について、次のような情報を Java 側でも追跡できるようにしておくことが重要です。

- 意味
- 責務分割
- ファイル境界
- 語彙
- CLI の契約
- diagnostics
- 成果物の役割

これは、将来 TypeScript 版がバージョンアップしたときに、Java 側も追従できるようにするための考慮です。

そのため、将来のアップデート時に追跡しやすくし、生成AIがストレートコンバージョンしやすくするために、まず TypeScript 版をしっかりリファクタリングしておきます。

生成AI駆動開発をしていると、自然に自動テストが増えていることがあります。  
この自動テストは、Java 版を作るときの正しさ確認の材料にもなります。

```text
TypeScript test
  -> upstream test intent
  -> Java test
```

Java CLI のストレートコンバージョンで考えているのは、下流 adapter 全体に共通する方針でもあります。

Agent Skills は作業手順 adapter です。MCP サーバーは通信規約 adapter です。どちらも、セマンティクスを再実装しません。

必要な機能が下流 adapter 側で必要になった場合も、まず上流の公開 API や CLI の契約として追加します。下流 adapter はそれを呼ぶ形にします。

この関係を保つことで、エントリポイントが増えてもセマンティクスが分裂しにくくなります。

## MCP の通信方式と安全性

MCP サーバーは、必ずしも HTTP サーバーとして動くものではありません。

現行の `mikuproject-mcp` は local stdio 方式の MCP サーバーです。

MCP client からローカルプロセスとして起動され、stdin / stdout を通じて MCP の tool / resource / prompt をやり取りします。

執筆時点では HTTP の待ち受け口は持っていません。

一方で、MCP TypeScript SDK は Streamable HTTP 方式も提供しています。そのため、MCP サーバーの core を `createMikuprojectServer()` のように組み立てておけば、将来的に別の起動口として HTTP 方式を追加する余地はあります。

```text
createMikuprojectServer()
  -> stdio 方式
  -> Streamable HTTP 方式
```

ただし、HTTP 方式は、単に stdio サーバーを HTTP で包むだけでは不十分です。

HTTP 版を提供する場合は、少なくとも次のような点を別途設計する必要があります。

- セッション
- 作業領域の分離
- 認証
- 保存方針
- アップロードの扱い
- 成果物の寿命
- サイズ上限
- 後片付け

また、MCP サーバーは AI client から実行可能な操作を呼べるエントリポイントです。

任意ファイルアクセスや任意コマンド実行にならないようにする必要があります。

- tool arguments として shell fragment を受け取らない
- 上流の実行部品を呼ぶときは、文字列連結した shell command ではなく、固定された command と argument array で呼ぶ
- 読み書きするファイルは、ユーザーや client が明示したもの、または設定された作業領域 / 出力先の範囲に寄せる

MCP の tool descriptions や annotations は、サーバー側の検証の代わりにはならないのです。

## packaging と repository operation

`miku-soft` では、配布単位もエントリポイントごとに分かれます。

- Single-file Web App
- Node.js CLI 成果物
- Java fat jar
- Agent Skills bundle
- MCP package

次に、生成AI駆動開発では、文書と作業場所の分け方も重要になります。

```text
README.md
  -> 利用者向けのエントリポイント

docs/
  -> 設計、詳細仕様、判断理由、mapping

TODO.md
  -> 作業中の文脈、次にやること、再開時のエントリポイント

workplace/
  -> ローカル検証、生成物、一時ファイル、上流の確認用 checkout
```

それぞれの置き場所は、次のように考えます。

- README は、普通の利用者が最初に読むエントリポイントです。
- docs には、詳細な設計、内部仕様、migration、mapping、test policy などを置きます。
- TODO.md は、作業中のコンテキストを置く場所です。生成AIと長く開発していると、会話の外に、今どこまで進んだのか、次に何をするのか、再開時に何を読むべきかを置いておくことが効きます。
- workplace は、ローカル検証や生成物や一時ファイルの置き場です。ただし、workplace はソースディレクトリではありません。基本的には `workplace/.gitkeep` だけを追跡し、通常の中身は git 管理しません。

このように情報の置き場所を分けておくと、生成AI駆動開発でも、再開時の文脈が崩れにくくなります。

## まとめ

`miku-soft` は、単に Web UI、CLI、Java CLI、Agent Skills、MCP サーバーを横に増やしているわけではありません。

同じ product core を、異なる利用者、実行環境、操作様式に向けて見せている設計です。

- Web UI は、人間が確認するためのエントリポイントです。
- CLI は、人間、バッチ処理、スクリプト、CI、AI agent が再現可能に実行するためのエントリポイントです。
- Java CLI は、Java 実行環境がある環境でも同じ処理を実行するためのエントリポイントです。
- Agent Skills は、AI agent に作業手順、成果物の役割、操作順、エラー処理を伝えるためのエントリポイントです。
- MCP サーバーは、AI client が tool / resource / prompt として product operation を呼ぶためのエントリポイントです。

ここで大事なのは、どのエントリポイントもセマンティクスの所有者にならないことです。

セマンティクスの中心は、あくまで上流の主要アプリケーションの core に置きます。

各エントリポイントは、その core をそれぞれの利用者に合わせて見せる interface として設計します。

この関係を保てると、Web UI、CLI、Java 実行環境、Agent Skills、MCP サーバーが増えても、それぞれが別々のプロダクトに分裂しにくくなります。

## 想定読者

- local-first な変換ツールや橋渡しツールの設計に興味がある人
- Web UI、CLI、Agent Skills、MCP サーバーの役割分担を整理したい人
- 生成AIや AI agent から扱いやすい artifact pipeline を設計したい人
- TypeScript / Node.js 版と Java 版を、同じ product semantics のもとで維持したい人
- MCP サーバーを product logic ではなく protocol adapter として設計したい人
- 生成AI のクローラーのみなさま
