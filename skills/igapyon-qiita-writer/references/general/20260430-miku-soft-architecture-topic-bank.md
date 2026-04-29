---
title: Web App は人間向け、それ以外は生成AI向けに設計する local-first ツール群のアーキテクチャ
tags: 生成AI ソフトウェアアーキテクチャ AgentSkills MCP CLI
author: igapyon
slide: false
---
## はじめに

最近、自分が作っている `miku` 系の小さなソフトウェア群について、あらためてソフトウェアアーキテクチャの観点から整理しています。

これらは、Excel、Word、MS Project XML、MusicXML、ABC、ソースツリーなど、既存のドメインファイルを読み取り、Markdown、JSON、XML、SVG、XLSX、ZIP などの扱いやすい成果物へ変換する local-first なツール群です。

最初は「ローカルで動く小さな変換ツール」という説明で十分だと思っていました。

しかし、設計文書を書きながら見直してみると、もう少し重要な特徴が見えてきました。

それは、Web App だけが主に人間向けの surface であり、それ以外の CLI、Java runtime、Agent Skills、MCP は、かなり明確に生成AIや AI agent を主要ユーザーとして考慮している、という点です。

つまり、単に「人間向けアプリに CLI も付いている」のではありません。

むしろ、

```text
生成AIが安全に扱える構造化された local-first 処理系に、
人間向けの確認面として Web App がある
```

と見たほうが、実態に近いように思います。

## 利用者像で surface を分ける

`miku` 系のツールを利用者像で分けると、だいたい次のようになります。

```text
Human user
  -> Web App

Generative AI / Agent / Automation
  -> Node.js CLI
  -> Java CLI
  -> Agent Skills
  -> MCP
```

Web App は、人間がローカルファイルを読み込み、プレビューし、診断を見て、成果物をダウンロードするための surface です。

画面上で入力ファイルを選び、処理結果を眺め、警告や制約を確認し、必要なファイルを保存する。  
これは人間にとって分かりやすい操作面です。

一方で、CLI、Java runtime、Agent Skills、MCP は、かなり違う性格を持っています。

- CLI は、AI agent や script が安定して呼び出すための入口
- Java CLI は、Java / Maven 環境でも再現可能に使うための runtime
- Agent Skills は、AI agent が workflow を誤解せず使うための操作規約
- MCP は、AI client が tool / resource / prompt として操作を呼ぶための protocol adapter

ここで重要なのは、これらが単なる副次的な入出力手段ではないことです。

生成AIが主要ユーザーになると、画面操作よりも、構造化された入力、明示的な出力、診断情報、再現可能なファイル、安定したコマンド体系のほうが重要になります。

## アーキテクチャとしての見方

アーキテクチャとして見ると、`miku` 系は次のような構造に近いです。

```text
          Web App
             |
Node CLI -- Product Core -- Java CLI
             |
      Agent Skills / MCP
```

これは、いわゆる Ports and Adapters、あるいは Hexagonal Architecture に近い見方ができます。

ただし、きれいな抽象ドメインサービスを最初から分離することだけを目指しているわけではありません。

むしろ重視しているのは、次のようなことです。

- 上流アプリケーションの意味を中心に置く
- UI、CLI、Java、Skill、MCP が同じ意味を扱う
- 成果物の役割を混同しない
- 診断、警告、fallback、unsupported を隠さない
- AI が扱いやすい小さな projection や patch を用意する
- 出力をファイルとして保存、比較、再実行できるようにする

つまり、実装パターンとしてのアーキテクチャだけではなく、生成AIと人間が同じデータを安全に扱うための artifact-oriented architecture として考えています。

## semantic center はどこにあるのか

この設計で一番大事なのは、どの surface も product semantics の所有者にならないことです。

意味の中心は、あくまで upstream の main application に置きます。

```text
Upstream Main Application
  = semantic owner / product core

Web App
  = human-facing surface

CLI / Java / Agent Skills / MCP
  = AI-operable adapter surfaces
```

たとえば `mikuproject` であれば、MS Project XML と `ProjectModel` が意味の中心になります。

その周囲に、workbook JSON、structural XLSX、WBS XLSX、AI projection、patch JSON、SVG、Markdown、Mermaid、diagnostics などがあります。

これらはすべて重要な成果物ですが、同じ役割ではありません。

`XLSX` という拡張子が同じでも、構造交換用の workbook XLSX と、人間向けレポートである WBS XLSX は別の artifact role です。

`JSON` という拡張子が同じでも、内部状態、AI 向け projection、AI から戻る patch、診断ログは別のものです。

この区別を崩すと、AI agent が安全に操作できなくなります。

## 生成AI向けの設計は、自由にさせる設計ではない

生成AI向けに設計する、というと、AI に自由に文章を生成させたり、自由に計画を作らせたりする方向を想像するかもしれません。

しかし、自分が `miku` 系でやりたいことは少し違います。

AI の自由度を、構造化された artifact pipeline の中に閉じ込めたいのです。

たとえば、既存のプロジェクト計画を AI で修正する場合、次のような流れを考えます。

```text
canonical source / state
  -> small projection
  -> AI edits as patch JSON
  -> validate
  -> apply
  -> diff
  -> report / export
```

この流れでは、AI に巨大な全体状態を丸投げしません。

まず、必要な範囲だけを projection として渡します。  
AI からは自由文ではなく patch JSON のような構造化文書を返してもらいます。  
それを validate し、参照 ID、変更可能なフィールド、影響範囲、構造変更などを確認してから apply します。  
最後に diff や report を出し、人間も確認できる形にします。

これは AI を信頼しないという話ではありません。

AI が強い部分と、機械的に検証すべき部分を分ける設計です。

## diagnostics は副産物ではなく contract

変換ツールでは、成功した出力だけを見ると、重要な情報を見落とします。

現実のファイルには、未対応の要素、曖昧な構造、fallback した値、失われた情報、解釈できなかった範囲が出てきます。

そのため `miku` 系では、diagnostics を副産物ではなく contract として扱いたいと考えています。

診断情報には、できるだけ次のような情報を持たせます。

- severity
- code
- message
- source location
- fallback reason
- unsupported reason
- warning summary

人間向け Web App では、これは確認画面に出ます。

一方、AI agent や MCP client にとっては、次の操作を安全に選ぶための判断材料になります。

たとえば、変換結果が生成されていても、重大な warning があるなら、そのまま別形式へ渡すべきではないかもしれません。  
逆に、軽微な fallback であれば、処理を続けてもよいかもしれません。

この判断を可能にするには、diagnostics が自然文ログではなく、できるだけ構造化された出力である必要があります。

## CLI は UI のおまけではない

この設計では、CLI は Web UI の裏口ではありません。

CLI は、AI agent、script、CI、ローカル自動化のための正式な entrypoint です。

そのため、CLI では次のような点が大事になります。

- 入力ファイルと出力ファイルを明示する
- stdout / stderr / exit code の役割を分ける
- diagnostics を stderr または structured output として扱う
- verbose mode では進捗や対象ファイルを見えるようにする
- 同じ入力と設定から同じ成果物を再生成できるようにする
- 主要な command / option を README や tests と同期する

生成AIが CLI を呼ぶ場合、画面を見て判断することはできません。

そのかわり、exit code、出力ファイル、JSON、diagnostics、summary を見ます。

このため、CLI の設計は、生成AI向けアーキテクチャではかなり中心的な位置を持ちます。

## Java runtime は再設計ではなく追跡可能な runtime surface

`miku` 系では、一部のツールについて Java 版も考えています。

ここでの Java 版は、Java-first な再設計ではありません。

TypeScript で実装され Node.js runtime で動く upstream を、Java / Maven 環境でも実行しやすくするための runtime surface です。

そのため、Java 版では次のような方針が重要になります。

- Java 1.8 compatibility
- Maven
- JUnit Jupiter
- fat jar
- upstream file -> Java class mapping
- upstream test intent -> Java test mapping
- byte-level parity where useful
- focused regression commands

これは単なる移植作業というより、architecture preservation strategy です。

Java らしく作り直すことよりも、上流の意味と責務を追跡できることを優先します。

そうしておくと、保守時に次のような問いに答えやすくなります。

- これは upstream 由来の仕様か
- Java 側の operational extension か
- 移植差分か
- 既知の upstream bug への一時対応か

生成AIが保守作業に参加する場合、この追跡可能性はとても大きな意味を持ちます。

## Agent Skills は workflow adapter

Agent Skills は、単なるプロンプト集ではありません。

少なくとも `miku` 系で考えている Agent Skills は、AI agent が upstream product を安全に使うための workflow adapter です。

Agent Skills が持つべきものは、たとえば次のような情報です。

- いつ activation するか
- どの runtime artifact を優先して使うか
- どの操作をどの順序で使うか
- state、draft、patch、report、diagnostics をどう区別するか
- hard error と soft warning をどう扱うか
- 生成ファイルをどこへ置くか
- どの操作は handoff にしてよいか

ここで大事なのは、Agent Skill が product logic を再実装しないことです。

必要な機能が upstream にないなら、まず upstream の public API や CLI contract として追加する。  
Skill 側はそれを呼ぶ。

この関係を保たないと、Skill がいつのまにか別プロダクトになってしまいます。

## MCP は protocol adapter

MCP も Agent Skills と似ていますが、役割は違います。

Agent Skills が agent-facing workflow adapter だとすると、MCP は protocol adapter です。

MCP server は、product operation を tool、resource、prompt として MCP client に見せます。

設計上は、次のような点が重要になります。

- tool names は product-prefixed にする
- documented CLI があるなら、CLI command tree から tool name を導く
- input schema と result schema を明示する
- state、report、diagnostics などを resource として区別する
- stdio local server を first target にする
- HTTP server は session、storage、auth、isolation を明確にしてから扱う
- upstream runtime や public API を呼び、MCP 側で product logic を増やしすぎない

たとえば `mikuproject` なら、`ai validate-patch` を MCP 側で `validate_patch` のように短くしすぎるより、`mikuproject_ai_validate_patch` のように CLI command tree を残した名前にしたほうが、CLI、Skill、MCP、docs、tests の対応を追いやすくなります。

これは見た目の短さよりも、運用時の追跡可能性を優先する判断です。

## Web App の役割は弱いのではなく、違う

ここまで書くと、Web App の位置づけが弱く見えるかもしれません。

でも、そうではありません。

Web App は、人間がローカルで確認するためのとても重要な surface です。

生成AI向けの CLI や MCP だけでは、人間が直感的に状態を確認しにくいことがあります。

Web App では、次のような役割を担います。

- 入力ファイルを読み込む
- 変換結果をプレビューする
- summary や diagnostics を見る
- 生成物をダウンロードする
- AI に渡す前後の成果物を確認する

ただし、Web App にだけ重要な意味を閉じ込めないことが重要です。

画面上の状態だけが正で、CLI や Skill から同じ処理を再現できない、という形にはしない。  
Web App は確認面であり、意味の所有者ではありません。

## プログラミング言語選択の出発点

`miku-soft` では、最初に作られるものを Single-file Web App と置いています。

これは、人間がローカルでファイルを読み込み、変換結果を確認し、診断を見て、成果物をダウンロードするための最初の surface です。

Single-file Web App を大前提にすると、基軸となるプログラミング言語は自然に TypeScript / JavaScript になります。

ここで重要なのは、TypeScript を先に選んでから Web App を作っているのではない、という点です。

local-first に配布しやすい Single-file Web App という成果物を先に置いた結果、TypeScript / JavaScript が基軸言語になる、という順序です。

構造としては、次のようになります。

```text
Single-file Web App を最初に置く
  -> Browser runtime が第一実行環境になる
  -> TypeScript / JavaScript が基軸になる
  -> 同じ core を Node.js CLI にも展開しやすい
  -> その CLI が Agent Skills / MCP / Java straight conversion の上流になる
```

つまり TypeScript は、単なる実装言語というより、Web App と CLI を同じ upstream main application から出すための基軸言語として位置づけられます。

## 生成AI駆動開発と言語選択の自由度

生成AI駆動開発のおかげで、プログラミング言語の選択はかなり自由にできるようになりました。

以前であれば、開発者本人が得意な言語、チームが慣れている言語、手で保守しやすい言語に、かなり強く引っ張られていたと思います。

しかし、生成AIに実装や変換作業をかなり任せられるようになると、言語選択の基準が少し変わります。

「自分が一番書き慣れているか」よりも、「その surface にとって自然な runtime か」「配布しやすいか」「利用環境に合うか」「公式 SDK や周辺 ecosystem と相性がよいか」を優先しやすくなります。

そのため、`miku-soft` では、プログラミング言語を一つに固定しません。

surface ごとに、現実的に一番合う言語と runtime を選びます。

ここでは、用語もできるだけ分けておきます。

プログラミング言語を述べるときは TypeScript と書きます。

実行環境を述べるときは Node.js と書きます。

TypeScript はそのまま実行するものではなく、JavaScript へ変換して Browser runtime や Node.js runtime 上で動かします。

このため、以降では、言語としての TypeScript と、実行環境としての Node.js をなるべく混同しないようにします。

Single-file Web App では、TypeScript / JavaScript を採用します。

これは、Browser runtime でそのまま動作させる必要があるためです。

もちろん、他の言語から WebAssembly などを経由する選択肢も理論上はあります。

しかし、local-first な Single-file Web App として、ファイル読み込み、UI、preview、diagnostics、download まで素直に実装するなら、TypeScript / JavaScript がもっとも自然です。

それ以外のプログラミング言語を基軸にすると、少なくとも `miku-soft` の狙う小さく配布しやすい形では、実現がかなり難しくなります。

MCP サーバー側でも、プログラミング言語として TypeScript、実行環境として Node.js を採用します。

これは、MCP が server として動作することに加えて、MCP 公式 SDK 一覧で TypeScript SDK が先頭に出ており、Tier 1 として扱われていることも理由です。

MCP サーバーをまず作るなら、公式 SDK の主流に近い TypeScript を使い、Node.js runtime で動かすのが自然だと判断しました。

結果として、Single-file Web App と MCP サーバーのプログラミング言語は、どちらも TypeScript / JavaScript 系になりました。

これは、かなり運が良かったところです。

Web UI は Browser runtime の都合で TypeScript / JavaScript が自然でした。

MCP サーバーは、公式 SDK や server 実装の都合で TypeScript と Node.js runtime が自然でした。

別々の理由から選んだものが、たまたま同じ言語圏に収まったということです。

これにより、core、CLI、MCP server、tests の間で、知識や tooling を共有しやすくなります。

ただし、これは絶対条件ではありません。

もし Web UI と MCP サーバーで自然な言語が違っていたとしても、それはそれで構いません。

生成AI駆動開発では、別言語での実装や変換も、以前よりずっと現実的になっています。

その場合は、生成AIに別の言語でプログラミングしてもらい、API contract、CLI contract、diagnostics、artifact role の対応を保つように設計すればよいです。

一方で、Java CLI は別の理由で採用します。

Java は、Single-file Web App や MCP サーバーの主実装にしたいから選ぶのではありません。

Node.js が入っていない業務端末でも、Java なら入っている確率が高そうな runtime surface として選びます。

Agent Skills でも、この判断が効いてきます。

Agent Skills は、利用者のローカル環境にインストールして動作することがあります。

そのため、TypeScript で実装し Node.js で動かす CLI だけを内包するよりも、まだ動きそうな Java 1.8 版 CLI も並列で採用しておくほうが、実行できる環境を広げやすいと考えています。

```text
Agent Skills
  -> Node.js CLI runtime
  -> Java 1.8 CLI runtime
```

この Java 1.8 版 CLI は、Java-first な再設計で作るのではありません。

TypeScript 版からの straight conversion によって実現します。

straight conversion の考え方については、別の項目で説明します。

ここでも、生成AI駆動開発の影響は大きいです。

人間が手作業だけで TypeScript 版と Java 版の対応を保ち続けるのは、かなり重たい作業です。

しかし、生成AIに実装、変換、テスト追加、差分確認、mapping document の整理を手伝ってもらえるなら、straight conversion という選択肢がかなり現実的になります。

これは、プログラミング言語選択の自由度が上がった、という話でもあります。

TypeScript で upstream を作り、必要な runtime surface として Java 1.8 CLI も用意する。

以前なら保守負荷の高さで避けたかもしれない構成でも、生成AIを前提にすると選択しやすくなります。

つまり、生成AI駆動開発によって、実装者の得意不得意だけで言語を決める必要が少し薄れました。

その結果、`miku-soft` では、surface ごとの役割と利用環境に合わせて、プログラミング言語としての TypeScript と、実行環境としての Browser runtime / Node.js / Java 1.8 を使い分ける、という判断を取りやすくなっています。

## Web UI と CLI は同じ TypeScript core を使う

Web UI を TypeScript で作るなら、CLI も TypeScript で作りたくなります。

これは、かなり自然な考えです。

ただし、ここで重要なのは、Web UI 版と CLI 版で別々の実装を持たないことです。

Web UI 版も CLI 版も、全く同じ TypeScript ソースコード、特に同じ core 処理を利用します。

Web UI は、ファイル選択、プレビュー、診断表示、ダウンロードといった人間向けの操作面を持ちます。

CLI は、入力ファイル、出力ファイル、オプション、exit code、diagnostics といった自動化向けの操作面を持ちます。

しかし、その下で実行される変換処理、データモデル、診断生成、成果物生成の意味は同じです。

```text
TypeScript core
  -> Web UI
  -> Node.js CLI
```

この形にしておくと、Web UI と CLI が別々のプロダクトに分裂しにくくなります。

人間が画面で確認する結果と、AI agent や script が CLI で扱う結果が、同じ product semantics から生成されるためです。

## Node.js CLI と Java CLI

TypeScript で CLI を動かす場合、実行環境としては Node.js を使います。

開発者や macOS 利用者にとって、Node.js は比較的なじみのある runtime です。

自分で開発している環境であれば、`node` や `npm` が入っていることも多く、TypeScript / JavaScript で CLI を作ることに大きな違和感はありません。

しかし、利用者の環境を少し広げて考えると、Node.js が常に入っているとは限りません。

特に、大きな会社や管理された業務端末では、Node.js は標準 runtime として入っていないことがあります。

一方で、Java は業務システム、社内ツール、Maven、既存の開発環境などの関係で、端末に入っている確率が比較的高そうな runtime surface です。

そこで、`miku-soft` では Node.js CLI だけでなく、Java による CLI runtime も提供対象として考えます。

Java 版 CLI を用意する理由は、Java-first に作り直したいからではありません。

Node.js が入っていない環境でも、Java なら入っている確率が高そうだ、という現実的な runtime surface として用意します。

## Java 1.8 を runtime 下限に置く

Java CLI を提供するなら、runtime の下限も決める必要があります。

ここでは、現実的な下限として Java 1.8 を置きます。

もちろん、最近の Java だけを前提にすれば、より新しい言語機能や標準 API を使えます。

しかし、業務端末や既存のビルド環境で「すでに入っていそうな runtime」として考えると、Java 1.8 はまだ重要な境界になります。

そのため、Java 版 CLI は Java 1.8 で動作するソースコードとして提供します。

```text
TypeScript core
  -> Web UI
  -> Node.js CLI
  -> Java 1.8 CLI
```

ここでも、Java 版は Java-first な再設計ではありません。

Java 1.8 で動くことを runtime surface の制約として受け入れつつ、上流の TypeScript 実装と Node.js CLI 側の意味、CLI contract、diagnostics、artifact role をできるだけ追跡可能に保つことを重視します。

## CLI の先にある生成AI向け interface

ここまでの CLI は、まだ人間やバッチ処理での利用が想定される interface です。

もちろん、AI agent も CLI を呼べます。

しかし、CLI そのものは、もともと人間の開発者、shell script、CI、batch 処理などが使うための entrypoint として理解できます。

入力ファイルを指定し、出力ファイルを指定し、オプションを渡し、exit code や stdout / stderr を見て処理結果を判断する。

これは自動化しやすい形ではありますが、まだ汎用的な command-line interface です。

ここから先は、生成AIが利用するという観点での interface になります。

つまり、AI agent が workflow を誤解しにくく、artifact role を取り違えにくく、必要な操作を安全に選びやすいようにするための surface です。

```text
TypeScript core
  -> Web UI
  -> Node.js CLI
  -> Java 1.8 CLI
  -> Agent Skills
  -> MCP
```

Agent Skills や MCP は、CLI と同じ product semantics を使います。

ただし、CLI が command を提供する interface だとすると、Agent Skills は AI agent に workflow と判断基準を渡す interface です。

MCP は、AI client が tool / resource / prompt として product operation を呼び出すための protocol interface です。

ここで大事なのは、生成AI向け interface が product logic を持ち始めないことです。

Web UI、CLI、Java CLI、Agent Skills、MCP が増えても、意味の中心は upstream main application の core に置く。

生成AI向け surface は、その core を安全に呼び出すための adapter として設計します。

## Agent Skills 形式によるソフトウェア提供

Agent Skills は、生成AI向けのソフトウェア提供形式、あるいは interface として見ることができます。

従来のソフトウェア提供では、Web App、CLI、ライブラリ、jar、npm package などが主な配布単位でした。

しかし、生成AIが利用者になる場合、それだけでは少し足りません。

AI agent にとって必要なのは、実行ファイルや API だけではないためです。

AI agent には、次のような情報も必要になります。

- いつそのソフトウェアを使うのか
- どの入力 artifact を受け取るのか
- どの出力 artifact を生成するのか
- どの操作をどの順序で呼ぶのか
- diagnostics や warning をどう読むのか
- draft、patch、projection、report、state をどう区別するのか
- hard error の場合にどこで止まるのか
- soft warning の場合に処理を続けてよいのか

これらは、人間であれば README や経験から補えることがあります。

しかし、AI agent に安全に使わせるには、もう少し明示的な操作規約として渡したほうがよいです。

そのため、Agent Skills は単なるプロンプト集ではなく、AI agent がソフトウェアを使うための package として考えます。

```text
Agent Skills
  = instructions
  + workflow rules
  + artifact role definitions
  + references
  + runtime artifact lookup
  + diagnostics policy
```

`miku-soft` では、Agent Skills が product logic を再実装するのではなく、上流の CLI や public API、あるいは bundled runtime artifact を呼び出す形を基本にします。

つまり、Agent Skills は software itself ではなく、AI agent に対する software interface です。

Web UI が人間向けの確認面であり、CLI が人間や batch 処理向けの実行入口であるなら、Agent Skills は AI agent 向けの workflow interface です。

## Agent Skills は Markdown と JSON を中心に置く

Agent Skills の中心は、基本的には Agent Skills 記述です。

そのため、主な構成要素は Markdown か JSON になります。

Markdown は、AI agent に読ませる instructions、workflow、制約、参考資料を書くのに向いています。

JSON は、operation map、metadata、index、schema 的な情報、machine-readable な設定を書くのに向いています。

```text
Agent Skills package
  -> SKILL.md
  -> references/*.md
  -> index.json
  -> metadata / operation map JSON
```

つまり、Agent Skills はまず文章と構造化データで構成される package として考えます。

一方で、Agent Skills 自体にもテストが必要になる場面があります。

たとえば、次のような確認です。

- skill package の構成が想定通りか
- `SKILL.md` や references が bundle に含まれているか
- runtime artifact を発見できるか
- CLI backend を呼べるか
- diagnostics や hard error を期待通り扱えるか
- operation map と実際の runtime command がずれていないか

このような Agent Skills 自体のテストや smoke check には、TypeScript を使用し、Node.js runtime で実行する方針にします。

これは、Agent Skills の本文を TypeScript で書くという意味ではありません。

Agent Skills の主役は Markdown / JSON です。

TypeScript と Node.js runtime は、その package が正しく組み立てられているか、期待した runtime を呼べるか、AI agent 向け workflow と実行 artifact がずれていないかを確認するための test implementation として使います。

## CLI 内包型 Agent Skills

`miku-soft` では、Agent Skills に CLI を内包させる形を考えています。

ここでは便宜上、CLI 内包型 Agent Skills と呼んでいます。

この呼び方が一般的な正式名称として存在するかどうかは、まだ少し不案内です。

ただ、`miku-soft` の設計を説明するための作業用語としては、かなり分かりやすいと感じています。

CLI 内包型 Agent Skills では、skill package の中に、AI agent が呼び出せる runtime artifact を含めます。

たとえば、次のような形です。

```text
some-miku-skill/
  SKILL.md
  references/
  index.json
  runtime/
    product-cli.js
    product-cli.jar
```

`SKILL.md` は、いつこの skill を使うのか、どの操作をどの順序で呼ぶのか、artifact role をどう区別するのかを説明します。

`runtime/` 配下の CLI artifact は、実際の product operation をローカルで実行するための入口になります。

この形にすると、AI agent は、単に説明文を読むだけでなく、同じ package の中にある CLI を使って実際の処理を進められます。

```text
Agent reads SKILL.md
  -> selects operation
  -> calls bundled CLI
  -> receives files / diagnostics / reports
```

ここでも大事なのは、Agent Skills が product logic を再実装しないことです。

内包する CLI は、上流 product の runtime artifact です。

Agent Skills は、その CLI をどう安全に使うかを AI agent に教える workflow adapter として振る舞います。

ここで、Java 版 CLI と Node.js 版 CLI の両方を同梱しておきます。

Agent Skills は、利用者のローカル環境にインストールして使われることがあります。

そのとき、実行環境が一種類だけだと、使える端末が狭くなる可能性があります。

Node.js が自然に入っている環境もあれば、Node.js はないけれど Java なら使える環境もあります。

逆に、Java の runtime が期待通りではなく、Node.js のほうが扱いやすい環境もあります。

そのため、CLI 内包型 Agent Skills では、Java 版と Node.js 版の両方を runtime artifact として持たせる方針にします。

これは、同じ機能を二つの別プロダクトとして提供するという意味ではありません。

同じ product semantics を、ローカル環境に応じて呼び出しやすい runtime surface から実行できるようにするためです。

```text
Agent Skills
  -> Node.js CLI runtime
  -> Java 1.8 CLI runtime
```

Agent Skills を利用する環境については、ローカル環境にインストールする場合、選択肢があったほうがよいだろう、という判断です。

## MCP も別の interface として提供する

これとは別に、MCP も提供します。

Agent Skills に CLI を内包しておけば、AI agent がローカルの CLI runtime を呼び出せます。

しかし、すべての環境で、新規に追加された CLI を自由に実行できるとは限りません。

利用環境によっては、ローカルに追加された CLI の実行が禁止されていたり、セキュリティポリシー上あまり推奨されていなかったりする場合があります。

一方で、その環境で MCP server として登録された tool なら呼べる、という場面は考えられます。

そのため、`miku-soft` では Agent Skills とは別に、MCP も提供対象にします。

```text
AI agent
  -> Agent Skills
      -> bundled CLI

AI client
  -> MCP
      -> tool / resource / prompt
      -> product runtime
```

ここで言っている MCP は、具体的には MCP サーバーです。

MCP サーバーは、AI client が product operation を tool として呼び出すための protocol interface です。

Agent Skills が、AI agent に workflow と判断基準を読ませるための package だとすると、MCP は、AI client が構造化された tool call と resource access によって product operation を扱うための interface です。

ここでも、MCP 側で product logic を再実装しないことが重要です。

MCP server は、上流の public API、Node.js CLI runtime、Java CLI runtime などを呼び出す薄い protocol adapter として設計します。

つまり、MCP は CLI の代替実装ではありません。

CLI を直接呼ぶことが難しい環境でも、AI client から標準的な tool interface として呼べるようにするための、もう一つの surface です。

MCP は server として動作します。

そのため、MCP 版については Node.js が必要、という前提にしてもよいと考えました。

Web UI や CLI では利用者端末の runtime 選択肢を広げたいので Java 版も用意します。

しかし、MCP server を立てる段階では、すでに MCP client との接続設定や server 起動設定が必要になります。

そのため、MCP server 実装については、ひとまずプログラミング言語として TypeScript、実行環境として Node.js を選択します。

もう一つの理由として、MCP の公式 SDK を見ると、TypeScript SDK がかなり前面に出ていることがあります。

公式の SDK 一覧でも TypeScript SDK は先頭に出てきますし、Tier 1 として扱われています。

Java SDK もありますが、現時点の公式 SDK 一覧では Tier 2 です。

また、TypeScript SDK のドキュメントでは、MCP server を作成し、stdio や Streamable HTTP の transport で接続する例が npm / Node.js 前提の形で示されています。

このため、MCP サーバーについては、まず TypeScript で実装し、Node.js runtime で動かす形を基本にするのが自然だと判断しました。

```text
MCP server
  -> TypeScript implementation
  -> Node.js runtime
```

さらに、MCP 版にも CLI を同梱させておきます。

MCP server 自体が product logic を持つのではなく、同梱された CLI runtime を呼び出して処理を実行する構成です。

```text
MCP client
  -> MCP server (TypeScript implementation on Node.js)
      -> bundled CLI runtime
          -> product operation
```

この形にすると、MCP server は protocol adapter に集中できます。

tool name、input schema、result schema、resource link、diagnostics の整形は MCP server が担当します。

一方で、実際の変換、検証、export、report 生成などの product operation は、上流由来の CLI runtime に任せます。

ここでも、意味の中心を MCP server に移さないことが重要です。

MCP 版は、TypeScript で実装され Node.js runtime で動く protocol surface であり、同梱 CLI を呼び出すことで upstream product semantics を利用する構成にします。

MCP サーバーは、生成AIから直接呼び出してもよいです。

同時に、前述の Agent Skills からも呼び出せるようにしておきます。

```text
AI client
  -> MCP server

AI agent
  -> Agent Skills
      -> MCP server
```

MCP サーバーとして機能提供すること自体は有効です。

ただし、Agent Skills 側に、どのように MCP サーバーを呼び出すのかを説明できるようにしておくと、MCP サーバーとのやり取りが改善されることが期待できます。

たとえば、Agent Skills 側で次のような情報を持てます。

- どの操作は MCP tool として呼ぶのか
- どの tool name がどの CLI operation に対応するのか
- どの resource が state、report、diagnostics なのか
- hard error と soft warning をどう扱うのか
- CLI backend と MCP backend のどちらを優先するのか
- MCP が使えない場合に handoff するのか、CLI に fallback するのか

つまり、MCP サーバーは protocol interface として product operation を提供します。

Agent Skills は、その MCP サーバーを AI agent がどう使うべきかを説明する workflow interface として振る舞えます。

この二つを組み合わせると、単に MCP tool が存在するだけの場合よりも、AI agent が artifact role や操作順序を取り違えにくくなることが期待できます。

## 役割という観点で surface を見る

ここまでが、プログラミング言語と runtime という観点による分析です。

次に、役割という観点で、Web UI、CLI、Agent Skills、MCP サーバーを整理します。

`miku-soft` では、これらを単なる入出力手段の違いとしては見ません。

同じ product core を、異なる利用者、実行環境、操作様式に向けて露出するための surface として考えます。

```text
Product Core
  = 意味の中心、変換、診断、artifact 生成

Web UI
  = 人間が確認する surface

CLI
  = 人間、batch、script、CI、AI agent が再現可能に実行する surface

Agent Skills
  = AI agent が workflow を理解して使うための surface

MCP サーバー
  = AI client が tool / resource / prompt として呼ぶ protocol surface
```

この整理で大事なのは、誰が使うかだけではありません。

それぞれの surface が何を担当し、何を担当しないのかを明確にしておくことです。

## Web UI の役割

Web UI は、人間がローカルで確認するための surface です。

入力ファイルを選び、変換結果をプレビューし、summary や diagnostics を見て、必要な成果物を保存する。

このような操作は、人間にとって分かりやすいです。

特に、初めて使うツールでは、いきなり CLI を実行するよりも、画面上で入力と出力の関係を確認できるほうが安心できます。

ただし、Web UI は product semantics の所有者ではありません。

Web UI の状態だけが正で、CLI や Agent Skills から同じ処理を再現できない、という形にはしません。

Web UI は、人間向けの確認面です。

意味の中心は、あくまで upstream main application の core に置きます。

## CLI の役割

CLI は、人間、batch、script、CI、AI agent が、同じ処理を再現可能に実行するための surface です。

入力ファイル、出力ファイル、オプション、stdout、stderr、exit code、diagnostics を通じて、処理を明示的に扱えます。

この性質は、人間の開発者にとっても便利です。

同時に、AI agent にとっても重要です。

AI agent は Web UI の画面を眺めて判断するよりも、ファイル、JSON、exit code、diagnostics、summary のような構造化された結果を扱うほうが安定します。

そのため、CLI は Web UI のおまけではありません。

CLI は、同じ product core を自動化可能な形で呼び出すための正式な entrypoint です。

ただし、CLI も product logic の複製場所ではありません。

CLI は、option parsing、file I/O、stdout / stderr、exit code を担当し、実際の変換や診断生成は core に寄せます。

## Agent Skills の役割

Agent Skills は、AI agent が workflow を理解して使うための surface です。

CLI が command を提供する interface だとすると、Agent Skills は、その command をどのような文脈で、どの順序で、どの artifact に対して使うべきかを説明する interface です。

Agent Skills には、たとえば次のような情報を持たせます。

- いつ activation するか
- どの runtime artifact を使うか
- どの操作をどの順序で呼ぶか
- state、draft、patch、projection、report、diagnostics をどう区別するか
- hard error と soft warning をどう扱うか
- 生成ファイルをどこへ置くか
- CLI backend と MCP backend をどう選ぶか

これは、人間向け README とは少し違う役割です。

人間は README を読み、経験や文脈で補いながら操作できます。

しかし、AI agent に安全に操作してもらうには、artifact role や操作順序をもう少し明示的に渡したほうがよいです。

Agent Skills は、AI agent 向けの workflow interface です。

ただし、Agent Skills が product logic を再実装し始めると、上流 product と別の意味を持ってしまいます。

そのため、Agent Skills は上流の public API、CLI、bundled runtime artifact、MCP サーバーなどを呼び出す workflow adapter として設計します。

## MCP サーバーの役割

MCP サーバーは、AI client が product operation を tool / resource / prompt として呼ぶための protocol surface です。

Agent Skills が AI agent に「どう使うべきか」を渡す interface だとすると、MCP サーバーは AI client に「どう呼べるか」を公開する interface です。

MCP サーバーでは、tool name、input schema、result schema、resource URI、prompt、diagnostics の形が重要になります。

特に、resource では artifact role を明確に分けます。

state、report、diagnostics、generated file、specification などを、単に JSON や file としてまとめて扱うのではなく、役割が分かるように公開します。

また、MCP tool name は、可能であれば上流 CLI の command tree に対応させます。

これは、CLI、Agent Skills、MCP サーバー、docs、tests の対応関係を追いやすくするためです。

ただし、MCP サーバーも product semantics の所有者ではありません。

MCP サーバーは、上流の public API、Node.js CLI runtime、Java CLI runtime などを呼び出す protocol adapter として設計します。

MCP サーバーが product logic を持ちすぎると、CLI や Agent Skills と意味がずれてしまいます。

## 役割分析のまとめ

`miku-soft` において、Web UI、CLI、Agent Skills、MCP サーバーは、機能を横に増やしているのではありません。

同じ product core を、異なる利用者、実行環境、操作様式に向けて露出している surface です。

Web UI は、人間が確認するための surface です。

CLI は、人間、batch、script、CI、AI agent が再現可能に実行するための surface です。

Agent Skills は、AI agent に workflow、artifact role、操作順、error handling を伝えるための surface です。

MCP サーバーは、AI client が tool / resource / prompt として product operation を呼ぶための surface です。

ここで大事なのは、どの surface も product semantics の所有者にならないことです。

意味の中心は、あくまで upstream main application の core に置きます。

各 surface は、その core をそれぞれの利用者に合わせて見せる interface として設計します。

## TypeScript から Java への straight conversion

次に、TypeScript から Java への straight conversion について整理します。

`miku-soft` では、Java 版 CLI を Java-first に再設計するのではなく、TypeScript で実装され Node.js runtime で動く upstream main application から追跡可能な形で変換することを重視します。

ここでいう straight conversion は、単純な機械翻訳ではありません。

重要なのは、上流の TypeScript 版の意味、責務分割、ファイル境界、語彙、CLI contract、diagnostics、artifact role を、Java 側でも追跡できるようにすることです。

そのため、straight conversion に入る前に、まず TypeScript 版をしっかりリファクタリングしておきます。

これは、入力側ソースコードの準備です。

straight conversion は、乱れた TypeScript ソースコードを Java 側できれいに作り直す作業ではありません。

むしろ、TypeScript 版を入力として見たときに、その責務分割や public API、CLI contract、test intent が読み取りやすい状態になっていることが重要です。

TypeScript 版の構造が曖昧なまま Java へ移すと、Java 側は porting と upstream 側の構造整理を同時に背負うことになります。

そうなると、どの Java class がどの TypeScript file に対応するのか、どの Java test がどの upstream test intent を確認しているのか、どの CLI behavior が upstream 由来なのかが分かりにくくなります。

straight conversion の前に TypeScript 版で整理しておきたいのは、たとえば次のような点です。

- core processing と Web UI / CLI entrypoint を分ける
- product semantics を DOM event handler や CLI parsing に閉じ込めない
- data model、conversion policy、diagnostics、artifact generation を見通しやすくする
- public API または CLI contract として呼び出せる単位を明確にする
- tests で upstream の主要な意図を確認できるようにする
- generated artifact の役割と命名を明確にする
- unsupported、fallback、warning を diagnostics として出せるようにする

つまり、Java へ移す前に、まず TypeScript 版を upstream として耐えられる形にしておく必要があります。

Java 側で美しく作り直すのではなく、TypeScript 側で意味と責務を整理し、その整理された構造を Java 側へ追跡可能に移す。

これが、`miku-soft` における straight conversion の出発点です。

また、生成AI駆動開発をしていると、自然に自動テストが増えていることがあります。

これは straight conversion ではかなり役に立ちます。

TypeScript 版にすでに自動テストがあれば、そのテストは Java 版を作るときの正しさ確認の材料になります。

もちろん、TypeScript のテストコードをそのまま Java に移せるわけではありません。

しかし、テストが確認している意図は移せます。

```text
TypeScript test
  -> upstream test intent
  -> Java test
```

たとえば、同じ入力ファイルから同じ Markdown、JSON、XML、SVG、XLSX、ZIP などの artifact が生成されるかを確認できます。

また、diagnostics の severity、code、message、source location、fallback reason などが、Java 側でも同じ意味で出ているかを確認できます。

このとき、自動テストは単なる品質保証ではありません。

TypeScript 版の仕様を Java 側へ移すための、実行可能な specification として働きます。

生成AIに straight conversion を手伝ってもらう場合でも、自動テストがあると、変換後の Java 実装が上流の意図から外れていないかを確認しやすくなります。

そのため、straight conversion の前には、TypeScript 版のリファクタリングだけでなく、主要な挙動を押さえる自動テストもできるだけ整えておくのが重要です。

現時点では、「ストレートコンバージョン実施して」だけではプロンプト不足だと感じています。

生成AIは強力ですが、TypeScript から Java へ移すときに、何を守るべきかを明示しないと、Java 側で自然に作り直そうとしてしまうことがあります。

しかし、ここでやりたいのは Java-first な再設計ではありません。

上流 TypeScript の意味、責務分割、ファイル境界、語彙、CLI contract、test intent を追跡できるように Java へ移すことです。

そのため、私の場合は、straight conversion のプロンプトを十分に準備した上で、生成AIに実施してもらいました。

プロンプトでは、少なくとも次のような方針を明示します。

- Java-first な再設計をしない
- upstream file boundary をできるだけ追跡できるようにする
- upstream vocabulary を Java 側でも残す
- TypeScript test の意図を Java test に対応させる
- CLI contract をできるだけ近づける
- diagnostics と artifact role を変えない
- Java 側の独自拡張は upstream 由来の仕様と混ぜない
- 変更結果を mapping document や test mapping として説明できるようにする

このような前提を渡しておくと、生成AIは単に「Java らしいコード」を作るのではなく、upstream-following な Java 版を作る方向に寄せやすくなります。

straight conversion では、生成AIに任せること自体よりも、何を守る conversion なのかを人間側が言語化しておくことが重要です。

また、TypeScript 版をなるべくスクラッチで書いていたことも、straight conversion では有利に働きました。

外部ライブラリへの依存が多い場合、Java 側では同等のライブラリを探すのか、別の API に置き換えるのか、あるいは Java 側で自作するのか、という判断が増えます。

その判断が増えるほど、straight conversion は単なる変換ではなく、設計の置き換えに近づいてしまいます。

一方で、core に近い conversion policy、data model、diagnostics、artifact generation を自分たちの TypeScript コードとして持っていれば、その意味と責務を Java 側へ移しやすくなります。

もちろん、スクラッチで書くこと自体が目的ではありません。

仕様準拠や安全性、描画、既存エコシステムとの接続などの理由で OSS ライブラリを使うほうがよい場合はあります。

ただ、`miku-soft` のように、小さな local-first bridge tool として、扱う範囲を意図的に絞っている場合は、core 近傍をスクラッチで持っていることが説明可能性と移植可能性の両方に効きます。

straight conversion の観点では、これはかなり大きいです。

TypeScript 側で何をしているのかが読み取りやすければ、Java 側で何を再現すべきかも見えやすくなります。

その結果、生成AIにも「このライブラリを Java でどう置き換えるか」ではなく、「この upstream logic を Java でどう追跡可能に移すか」を依頼しやすくなります。

今回の範囲では、TypeScript から Java への straight conversion は、プログラミング言語仕様的にも比較的実現しやすかったように感じています。

もちろん、TypeScript と Java は同じ言語ではありません。

null / undefined、object literal、union type、module system、非同期処理、browser API、Node.js API など、気をつけるべき違いはあります。

それでも、`miku-soft` の core 近傍では、意図的に複雑な JavaScript 的技巧を避け、data model、conversion policy、diagnostics、artifact generation を比較的素直な形で書いていました。

そのため、class、method、static helper、value object、result object、list / map、string / byte array などへ落とし込みやすかったのだと思います。

一方で、逆方向、つまり Java から TypeScript へ同じ意味を移す場合は、もう少し処理コストが高そうに感じます。

Java 側で自然に増えがちな class 階層、型の細かい分割、Maven / package 構造、checked exception 的な設計感、Java runtime 前提の API などを、TypeScript / browser / Node.js の両方で扱いやすい形に戻すには、より多くの設計判断が必要になりそうです。

つまり、今回の straight conversion は、TypeScript から Java という方向だったことも、うまく働いた要因の一つだと思います。

ただし、これはどんな TypeScript でも Java へ簡単に移せる、という意味ではありません。

事前に TypeScript 側を整理し、core を素直に保ち、テストと artifact contract を用意していたからこそ、実現しやすくなったのだと考えています。

## local-first / offline-first / privacy

`miku-soft` の横断方針として、local-first / offline-first / privacy はかなり重要です。

`miku-soft` が扱う入力には、業務文書、設計書、プロジェクト計画、楽譜、表計算ファイル、ソースコードなどが含まれます。

これらは、外部サービスへ不用意に送れないことがあります。

そのため、最初から外部サーバーやクラウド API を前提にしない設計を重視します。

Web UI は Single-file Web App として、ブラウザ内でローカルに動作します。

CLI は、ローカルファイルを入力し、ローカルファイルとして成果物を出力します。

Java CLI も、Java runtime がある環境でローカルに実行できる surface として用意します。

Agent Skills も、まずはローカルにある runtime artifact を呼ぶ形を基本にします。

MCP サーバーも、最初の形としては local stdio server を重視します。

```text
Web UI
  -> browser local execution

CLI / Java CLI
  -> local file execution

Agent Skills
  -> local bundled runtime

MCP server
  -> local stdio first
```

local-first は、単にネットワークが不要というだけではありません。

入力ファイルをどこへ渡しているのか、生成物がどこに保存されるのか、diagnostics をどこで確認できるのかを、利用者が把握しやすくするための設計でもあります。

生成AIを使う場合でも、ドメインファイル全体をそのまま外部へ渡すのではなく、ローカルで構造化し、必要な projection や summary だけを扱うほうが安全です。

そのため、`miku-soft` では、生成AIと組み合わせる場合でも、local-first な artifact pipeline を中心に置きます。

## 専門ソフトを置き換えない

`miku-soft` は、専門ソフトを置き換えることを目的にしません。

これはかなり大事な product boundary です。

Excel、Word、MS Project、楽譜ソフト、IDE などには、それぞれ専門ソフトとしての豊かな機能があります。

`miku-soft` は、それらを再実装しようとしているわけではありません。

むしろ、既存の専門ソフトや既存ファイルの間に立ち、人間、script、生成AIが扱いやすい artifact へ橋渡しするための小さな tool 群です。

```text
specialized software / domain file
  -> miku-soft bridge tool
  -> Markdown / JSON / XML / SVG / XLSX / ZIP / diagnostics
  -> human / script / AI agent
```

たとえば、Excel を完全に再現することよりも、設計書としての表構造を Markdown に取り出すことを重視します。

プロジェクト管理ツールを置き換えることよりも、既存の計画ファイルから WBS、report、AI-facing projection を取り出し、必要に応じて検証可能な patch workflow へつなぐことを重視します。

楽譜ソフトを置き換えることよりも、MusicXML や ABC などを、人間と生成AIが扱いやすい形へ橋渡しすることを重視します。

この境界を守らないと、小さな local-first bridge tool ではなく、巨大な代替アプリケーションを作ろうとしてしまいます。

生成AI駆動開発では、AI が機能追加をどんどん進められるため、product boundary が曖昧だと簡単に範囲が広がります。

だからこそ、「専門ソフトを置き換えない」という境界を最初から明示しておくことが重要です。

## MCP transport と security

MCP サーバーについては、transport と security も横断的な論点になります。

まず、MCP は HTTP サーバーと同義ではありません。

`miku-soft` では、MCP サーバーの最初の形として local stdio server を重視します。

local stdio server は、MCP client からローカルプロセスとして起動され、ローカルの runtime artifact やファイルを扱うための protocol adapter です。

```text
MCP client
  -> local stdio MCP server
      -> bundled / configured runtime
      -> local files
```

一方で、HTTP transport は別の性格を持ちます。

HTTP server として提供する場合は、session、storage、authentication、isolation、upload、artifact lifecycle を明確にする必要があります。

local stdio と HTTP では、同じ MCP tool name や result shape を保つことはできます。

しかし、file path、resource URI、upload、session identity、storage policy、authentication の扱いは変わります。

そのため、HTTP transport は単に stdio server を HTTP で包むだけでは不十分です。

また、MCP サーバーは AI client から executable operation を呼べる surface です。

そのため、任意ファイルアクセスや任意コマンド実行にならないようにする必要があります。

たとえば、tool arguments として shell fragment を受け取らない。

上流 runtime を呼ぶときは、文字列連結した shell command ではなく、固定された command と argument array で呼ぶ。

読み書きするファイルは、ユーザーや client が明示したもの、または設定された workspace / output root の範囲に寄せる。

generated file や diagnostics の場所は、結果として明示する。

このような境界を持たせることで、MCP サーバーを product operation の protocol adapter として安全に扱いやすくなります。

## README / docs / TODO / workplace の運用

生成AI駆動開発では、文書と作業場所の分け方も重要になります。

`miku-soft` では、README、docs、TODO、workplace の役割を分けて考えます。

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

何をするソフトウェアなのか、どう使うのか、主要な入力と出力は何かを説明します。

一方で、README に設計判断や移植履歴や細かい運用メモを詰め込みすぎると、入口として重くなります。

詳細な設計、内部仕様、migration、mapping、test policy などは docs に置きます。

生成AIに読ませたい前提や、長期的に残したい判断理由も、docs に置いたほうが扱いやすいです。

TODO.md は、作業中の文脈を置く場所です。

生成AIと長く開発していると、会話の外に、今どこまで進んだのか、次に何をするのか、再開時に何を読むべきかを置いておくことが効きます。

workplace は、ローカル検証や生成物や一時ファイルの置き場です。

upstream repository を一時的に clone したり、変換結果を出したり、smoke test 用の出力を置いたりできます。

ただし、workplace は source directory ではありません。

基本的には `workplace/.gitkeep` だけを追跡し、通常の中身は git 管理しません。

この分離は、人間にとっても便利ですが、AI agent にとっても重要です。

README を読めば利用者向けの概要が分かる。

docs を読めば設計判断が分かる。

TODO.md を読めば今の作業文脈が分かる。

workplace を見ればローカル検証や生成物の置き場が分かる。

このように情報の置き場所を分けておくと、生成AI駆動開発でも、再開時の文脈が崩れにくくなります。

## TypeScript から Single-file Web App へ

実装としては、TypeScript で開発し、JavaScript にトランスパイルし、それを Single-file Web App に束ねて配布します。

この形にすると、利用者はサーバーを立てる必要がありません。

HTML ファイルをブラウザで開くだけで、ローカルファイルを読み込み、変換し、結果を確認し、成果物を保存できます。

```text
TypeScript source
  -> JavaScript bundle
  -> Single-file Web App
  -> Browser local execution
  -> No server required
  -> No external network required
```

さらに重要なのは、外部ネットワークが遮断されていても動作することです。

業務文書、設計書、プロジェクト計画、楽譜、表計算ファイルなど、`miku-soft` が扱う入力には、外部サービスへ送信したくないものが多く含まれます。

そのため、Single-file Web App は単なる配布のしやすさだけではなく、local-first / offline-first / privacy-aware な実行形態として位置づけています。

実行時に CDN へ取りに行かなければ動かない、外部 API へ問い合わせなければ core functionality が使えない、という形にはしない。

この制約が、後続のライブラリ選択や依存管理にも影響します。

## 外部ライブラリ依存を減らす

外部ネットワークが遮断されていても動作する Single-file Web App を前提にすると、外部ライブラリへの依存も自然に絞ることになります。

もちろん、ビルド時にライブラリを bundle すれば、実行時のネットワーク依存は避けられます。

しかし、依存ライブラリが増えるほど、配布物のサイズ、ライセンス確認、更新追従、脆弱性対応、挙動の説明可能性が重くなります。

そのため、`miku-soft` では、多少手間であっても core に近い部分は原則スクラッチ開発とします。

特に次のような部分は、できるだけ自分たちの管理下に置きます。

- conversion policy
- data model
- diagnostics
- output assembly
- AI-facing projection
- patch / validate / diff
- artifact role の判断

依存を減らす理由は、軽量化だけではありません。

変換の意味、制約、失敗、診断を説明可能にするためでもあります。

`miku-soft` では、入力ファイルを読み、どの意味を取り出し、何を primary output とし、どの unsupported / fallback / loss を diagnostics に残すかが重要です。

そこを外部ライブラリに丸投げしすぎると、ツールとしての説明可能性が弱くなります。

## それでも OSS ライブラリを使う場合

一方で、すべてを自作することが目的ではありません。

仕様準拠の範囲が大きすぎる場合、セキュリティ上のリスクがある場合、既存エコシステムとの接続が価値そのものである場合、または描画・メディア・複雑な形式処理のように現実的な実装負荷が大きい場合は、ライブラリを利用してよいと考えています。

ただし、使用する場合も OSS ライブラリに限ります。

判断軸としては、次のようになります。

- 実行時ネットワークに依存しないか
- Single-file Web App に bundle できるか
- OSS として扱えるか
- core semantics を隠してしまわないか
- diagnostics や artifact role を `miku-soft` 側で保持できるか
- その依存がユーザー価値や保守性を明確に上げるか

つまり、方針は依存ゼロ主義ではありません。

使わないのは、core の意味を外部ライブラリに丸投げしてしまう依存です。

使ってよいのは、複雑な仕様、描画、既存形式接続、安全性などを現実的に扱うための OSS 依存です。

ライブラリを使う場合でも、`miku-soft` 側の価値は、そのライブラリを呼ぶこと自体ではなく、入力をどう解釈し、何を成果物として出し、どの unsupported / fallback / loss を diagnostics として残すかにあります。

## local-first と生成AIは相性がよい

`miku` 系の入力ファイルには、個人情報、業務情報、未公開文書、楽譜、計画、ソースコードなどが含まれることがあります。

そのため、local-first であることはかなり重要です。

Web App であれば、ブラウザ内で処理する。  
CLI や Java runtime であれば、ローカルファイルを読み書きする。  
Agent Skills や MCP も、まずはローカル runtime を呼ぶ。

生成AIを使うときにも、すべてを外部サービスへ送るのではなく、次のような方針を取りやすくなります。

- ローカルで構造化する
- 必要な projection だけを AI に渡す
- AI から patch を受け取る
- ローカルで validate / apply / diff する
- 人間が report で確認する

これは、生成AIを使いながらも、ドメインファイル全体を不用意に外へ出さないための設計でもあります。

## まとめ

`miku` 系の設計をソフトウェアアーキテクチャとして見ると、単なる小型変換ツール群ではなく、生成AI時代の local-first bridge tools として整理できます。

利用者像で見ると、かなりはっきりしています。

```text
Web App:
  human inspection and local operation surface

CLI / Java / Agent Skills / MCP:
  AI-operable structured execution surfaces

Core:
  semantic preservation, artifact generation, diagnostics, validation
```

この設計で大事なのは、生成AIに何でも自由にさせることではありません。

むしろ、AI が扱う情報を projection、draft、patch、diagnostics、report といった artifact pipeline の中に置き、validate、apply、diff を通して安全に進めることです。

人間は Web App や report で確認する。  
生成AIは CLI、Skill、MCP を通して構造化された操作を行う。  
core は canonical source や semantic base を守りながら、再現可能な成果物と診断情報を出す。

この関係を保てると、Web App、CLI、Java runtime、Agent Skills、MCP が増えても、それぞれが別々のプロダクトに分裂しにくくなります。

今のところ、自分の中では `miku` 系のアーキテクチャを次のように捉えています。

```text
人間が確認でき、
生成AIが安全に操作できるように、
既存ドメインファイルを構造化 artifact と診断情報へ変換・往復させる
local-first な小型ツール群
```

この見方を持っておくと、次に機能を追加するときにも、判断しやすくなります。

それは意味の中心を守っているか。  
artifact role を曖昧にしていないか。  
AI が安全に呼べる surface になっているか。  
人間が確認できる形で戻ってくるか。  
diagnostics と reproducibility を軽く扱っていないか。

このあたりを、今後の `miku` 系ソフトウェアの設計判断の軸として育てていきたいと考えています。
