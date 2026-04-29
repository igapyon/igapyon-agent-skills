---
title: 生成AI時代の local-first bridge tools として miku-soft を設計する
tags: 生成AI ソフトウェアアーキテクチャ MCP AgentSkills CLI
author: igapyon
slide: false
---
## はじめに

最近、自分が作っている `miku` 系の小さなソフトウェア群を、ソフトウェア方式の観点から整理しています。

これらは、Excel、Word、MS Project XML、MusicXML、ABC、ソースツリーなど、既存のドメインファイルを読み取り、Markdown、JSON、XML、SVG、XLSX、ZIP などの扱いやすい成果物へ変換する local-first なツール群です。

ここでは便宜上、この系統の設計を `miku-soft` と呼びます。

この記事では、個別アプリの細かい仕様ではなく、`miku-soft` 全体を支える方式設計をまとめます。

## 前提制約

`miku-soft` は、専門ソフトを置き換えるものではありません。

Excel、Word、MS Project、楽譜ソフト、IDE などを再実装するのではなく、既存の専門ソフトや既存ファイルの間に立ち、人間、script、生成AIが扱いやすい artifact へ橋渡しする小さな bridge tool 群として考えています。

```text
specialized software / domain file
  -> miku-soft bridge tool
  -> Markdown / JSON / XML / SVG / XLSX / ZIP / diagnostics
  -> human / script / AI agent
```

もう一つの制約は、local-first / offline-first / privacy です。

扱う入力には、業務文書、設計書、プロジェクト計画、楽譜、表計算ファイル、ソースコードなどが含まれます。  
外部サービスへ不用意に送れないものもあります。

そのため、外部サーバーやクラウド API を前提にしない設計を基本にします。

- Web UI はブラウザ内でローカルに動作する
- CLI はローカルファイルを読み書きする
- Agent Skills や MCP サーバーも、まずはローカル runtime を呼ぶ

この制約が、surface 分割、runtime 選定、transport 選定に効いてきます。

## semantic center を core に置く

方式設計として最初に決めたいのは、意味の中心です。

`miku-soft` では、意味の中心を upstream main application の core に置きます。

Web UI、CLI、Java CLI、Agent Skills、MCP サーバーは、意味の所有者ではありません。  
それぞれの利用者や実行環境に向けて、同じ core を露出する surface です。

```text
Upstream Main Application
  = semantic owner / product core

Web UI
  = human-facing surface

CLI / Java CLI
  = repeatable runtime surfaces

Agent Skills
  = agent-facing workflow interface

MCP server
  = MCP-facing protocol interface
```

Web UI ではこう動くが CLI では違う。  
Agent Skills では別の解釈をしている。  
MCP サーバー側だけ独自の product logic を持っている。

この形に寄ると、生成AIや automation から安全に扱いにくくなります。

product semantics は core に置き、各 surface は adapter として扱います。

## surface を分ける

`miku-soft` では、同じ product core を複数の surface へ出します。

```text
Product Core
  -> Web UI
  -> Node.js CLI
  -> Java CLI
  -> Agent Skills
  -> MCP server
```

これは機能を横に増やしているというより、利用者、実行環境、操作様式ごとに入口を分けている、という見方です。

## Web UI の役割

Web UI は、人間が確認するための surface です。

入力ファイルを選び、変換結果をプレビューし、summary や diagnostics を見て、必要な成果物を保存する。

初めて使うツールでは、いきなり CLI を実行するよりも、画面上で入力と出力の関係を確認できるほうが安心できます。

ただし、Web UI は意味の所有者ではありません。

Web UI の状態だけが正で、CLI や Agent Skills から同じ処理を再現できない、という形にはしません。

## CLI の役割

CLI は、人間、batch、script、CI、AI agent が、同じ処理を再現可能に実行するための surface です。

入力ファイル、出力ファイル、オプション、stdout、stderr、exit code、diagnostics を通じて、処理を明示的に扱えます。

AI agent は Web UI の画面を眺めるよりも、ファイル、JSON、exit code、diagnostics、summary のような構造化された結果を扱うほうが安定します。

CLI は Web UI のおまけではありません。

ただし、CLI も product logic の複製場所ではありません。

CLI は option parsing、file I/O、stdout / stderr、exit code を担当し、実際の変換や診断生成は core に寄せます。

## Java CLI の役割

Node.js CLI は、開発者や macOS 利用者には比較的自然です。

しかし、管理された業務端末では、Node.js が標準 runtime として入っていないことがあります。

一方で、Java は業務システム、社内ツール、Maven、古くからの開発環境などの関係で、端末に入っている確率が比較的高そうな runtime surface です。

そのため、`miku-soft` では Java 1.8 で動作する Java CLI も提供対象にします。

ここでの Java CLI は、Java-first な再設計ではありません。

TypeScript で実装され Node.js runtime で動く upstream main application を、Java / Maven 環境でも実行しやすくするための runtime surface です。

## Agent Skills の役割

Agent Skills は、AI agent が workflow を理解して使うための surface です。

CLI が command を提供する interface だとすると、Agent Skills は、その command をどの文脈で、どの順序で、どの artifact に対して使うべきかを説明する interface です。

Agent Skills には、たとえば次の情報を持たせます。

- いつ activation するか
- どの runtime artifact を使うか
- どの操作をどの順序で呼ぶか
- state、draft、patch、projection、report、diagnostics をどう区別するか
- hard error と soft warning をどう扱うか
- 生成ファイルをどこへ置くか
- CLI backend と MCP backend をどう選ぶか

中心は Markdown と JSON です。

`SKILL.md` や `references/*.md` に workflow や制約を書き、`index.json` や metadata JSON に machine-readable な情報を置きます。

さらに、`miku-soft` では CLI 内包型 Agent Skills も考えています。

```text
some-miku-skill/
  SKILL.md
  references/
  index.json
  runtime/
    product-cli.js
    product-cli.jar
```

AI agent は `SKILL.md` を読み、同じ package の中にある CLI runtime を呼び出して処理を進められます。

ここでも、Agent Skills が product logic を再実装しないことが重要です。

Agent Skills は、上流 CLI、public API、MCP サーバーをどう安全に使うかを AI agent に教える workflow adapter として扱います。

## MCP サーバーの役割

MCP サーバーは、AI client が product operation を tool / resource / prompt として呼ぶための protocol surface です。

Agent Skills が AI agent に「どう使うべきか」を渡す interface だとすると、MCP サーバーは AI client に「どう呼べるか」を公開する interface です。

MCP サーバーでは、tool name、input schema、result schema、resource URI、prompt、diagnostics の形が重要になります。

MCP tool name は、可能であれば上流 CLI の command tree に対応させます。

CLI、Agent Skills、MCP サーバー、docs、tests の対応関係を追いやすくするためです。

ただし、MCP サーバーも product semantics の所有者ではありません。

MCP サーバーは、上流の public API、Node.js CLI runtime、Java CLI runtime などを呼び出す protocol adapter として設計します。

## diagnostics と artifact を contract として扱う

変換ツールでは、成功した出力だけを見ると重要な情報を見落とします。

現実のファイルには、未対応の要素、曖昧な構造、fallback した値、失われた情報、解釈できなかった範囲が出てきます。

そのため `miku-soft` では、diagnostics を副産物ではなく contract として扱います。

人間向け Web UI では、これは確認画面に出ます。

AI agent や MCP client にとっては、次の操作を安全に選ぶための判断材料になります。

出力ファイルが生成されていても、重大な warning があるなら、そのまま次の形式へ渡すべきではないかもしれません。  
軽微な fallback であれば、処理を続けてもよいかもしれません。

この判断を可能にするには、diagnostics が自然文ログだけではなく、できるだけ構造化された出力である必要があります。

成果物は、保存、比較、再実行できる file artifact として扱います。

人間の確認だけでなく、AI agent が処理を段階的に進めるためにも重要です。

## language / runtime を surface ごとに選ぶ

`miku-soft` では、プログラミング言語を一つに固定しません。

surface ごとに、現実的に一番合う言語と runtime を選びます。

ここでは、用語も分けます。

プログラミング言語を述べるときは TypeScript と書きます。  
実行環境を述べるときは Node.js と書きます。

TypeScript はそのまま実行するものではなく、JavaScript へ変換して Browser runtime や Node.js runtime 上で動かします。

結果として、surface ごとの言語と runtime は次のようになります。

```text
Web UI
  -> TypeScript implementation
  -> JavaScript bundle
  -> Browser runtime

CLI
  -> TypeScript implementation
  -> Node.js runtime

Java CLI
  -> Java 1.8 runtime

Agent Skills
  -> Markdown / JSON
  -> bundled Node.js CLI runtime
  -> bundled Java 1.8 CLI runtime

MCP server
  -> TypeScript implementation
  -> Node.js runtime
```

Single-file Web App は Browser runtime で動かすため、TypeScript を採用します。

CLI も同じ TypeScript core を使い、Node.js runtime で動かします。

MCP サーバーも TypeScript で実装し、Node.js runtime で動かします。  
MCP の公式 SDK 一覧では TypeScript SDK が前面に出ており、Tier 1 として扱われていることも理由です。

Java CLI は別の理由です。

Java は、Single-file Web App や MCP サーバーの主実装にしたいから選ぶのではありません。  
Node.js が入っていない業務端末でも、Java なら入っている確率が高そうな runtime surface として選びます。

生成AI駆動開発のおかげで、プログラミング言語の選択はかなり自由にできるようになりました。

以前なら保守負荷の高さで避けたかもしれない構成でも、生成AIに実装、変換、テスト追加、差分確認、mapping document の整理を手伝ってもらえるなら、選択しやすくなります。

## downstream adapter として Java / Agent Skills / MCP を置く

Java CLI、Agent Skills、MCP サーバーは、それぞれ downstream adapter として扱います。

Java CLI は、TypeScript からの straight conversion で作ります。

ここでいう straight conversion は、単純な機械翻訳ではありません。

上流の TypeScript 版の意味、責務分割、ファイル境界、語彙、CLI contract、diagnostics、artifact role を、Java 側でも追跡できるようにすることが重要です。

そのため、straight conversion に入る前に、まず TypeScript 版をしっかりリファクタリングしておきます。

生成AI駆動開発をしていると、自然に自動テストが増えていることがあります。  
この自動テストは、Java 版を作るときの正しさ確認の材料になります。

```text
TypeScript test
  -> upstream test intent
  -> Java test
```

Agent Skills は workflow adapter です。

MCP サーバーは protocol adapter です。

どちらも、product logic を再実装しません。

必要な機能が upstream にないなら、まず upstream の public API や CLI contract として追加する。  
下流 adapter はそれを呼ぶ。

この関係を保つことで、surface が増えても product semantics が分裂しにくくなります。

## MCP transport と security

MCP サーバーは、必ずしも HTTP サーバーとして動くものではありません。

現行の `mikuproject-mcp` は local stdio transport の MCP サーバーです。

MCP client からローカルプロセスとして起動され、stdin / stdout を通じて MCP の tool / resource / prompt をやり取りします。

HTTP の network listener は持っていません。

一方で、MCP TypeScript SDK は Streamable HTTP transport も提供しています。

そのため、MCP server core を `createMikuprojectServer()` のように組み立てておけば、将来的に別 entrypoint として HTTP transport を追加する余地はあります。

```text
createMikuprojectServer()
  -> stdio transport
  -> Streamable HTTP transport
```

ただし、HTTP transport は、単に stdio server を HTTP で包むだけでは不十分です。

HTTP 版を提供する場合は、session、workspace isolation、authentication、storage policy、upload lifecycle、artifact lifecycle、size limits、cleanup などを別途設計する必要があります。

また、MCP サーバーは AI client から executable operation を呼べる surface です。

任意ファイルアクセスや任意コマンド実行にならないようにする必要があります。

- tool arguments として shell fragment を受け取らない
- 上流 runtime を呼ぶときは、文字列連結した shell command ではなく、固定された command と argument array で呼ぶ
- 読み書きするファイルは、ユーザーや client が明示したもの、または設定された workspace / output root の範囲に寄せる

MCP tool descriptions や annotations は、server-side validation の代わりにはなりません。

## packaging と repository operation

`miku-soft` では、配布単位も surface ごとに分かれます。

- Single-file Web App
- Node.js CLI artifact
- Java fat jar
- Agent Skills bundle
- MCP package

生成AI駆動開発では、文書と作業場所の分け方も重要になります。

```text
README.md
  -> 利用者向けの入口

docs/
  -> 設計、詳細仕様、判断理由、mapping

TODO.md
  -> 作業中の文脈、次にやること、再開時の入口

workplace/
  -> ローカル検証、生成物、一時ファイル、upstream checkout
```

README は、普通の利用者が最初に読む入口です。

詳細な設計、内部仕様、migration、mapping、test policy などは docs に置きます。

TODO.md は、作業中の文脈を置く場所です。

生成AIと長く開発していると、会話の外に、今どこまで進んだのか、次に何をするのか、再開時に何を読むべきかを置いておくことが効きます。

workplace は、ローカル検証や生成物や一時ファイルの置き場です。

ただし、workplace は source directory ではありません。

基本的には `workplace/.gitkeep` だけを追跡し、通常の中身は git 管理しません。

このように情報の置き場所を分けておくと、生成AI駆動開発でも、再開時の文脈が崩れにくくなります。

## まとめ

`miku-soft` は、単に Web UI、CLI、Java CLI、Agent Skills、MCP サーバーを横に増やしているわけではありません。

同じ product core を、異なる利用者、実行環境、操作様式に向けて露出している設計です。

Web UI は、人間が確認するための surface です。  
CLI は、人間、batch、script、CI、AI agent が再現可能に実行するための surface です。  
Java CLI は、Java runtime がある環境でも同じ処理を実行するための surface です。  
Agent Skills は、AI agent に workflow、artifact role、操作順、error handling を伝えるための surface です。  
MCP サーバーは、AI client が tool / resource / prompt として product operation を呼ぶための surface です。

ここで大事なのは、どの surface も product semantics の所有者にならないことです。

意味の中心は、あくまで upstream main application の core に置きます。

各 surface は、その core をそれぞれの利用者に合わせて見せる interface として設計します。

この関係を保てると、Web UI、CLI、Java runtime、Agent Skills、MCP サーバーが増えても、それぞれが別々のプロダクトに分裂しにくくなります。

