---
title: [miku-soft] 生成AI時代の local-first ツール群アーキテクチャ topic bank
tags: 生成AI ソフトウェアアーキテクチャ AgentSkills MCP CLI
author: igapyon
slide: false
---
## このファイルの位置づけ

このファイルは、`20260430-general.md` で説明済みの内容を繰り返すための原稿ではありません。

overview からこぼれた観察、言い回し、次の記事に育てられそうな論点を残す topic bank として扱います。

そのため、overview で扱った基本説明は短く圧縮し、ここでは `miku-soft` 独自のニュアンス、補足説明、深掘り候補を中心に置きます。

## 用語と表現の方針

この記事群では、`miku-soft` のアーキテクチャを説明するときの用語を、次のようにそろえます。

- この系統の設計全体を指すときは `miku-soft` と書きます。
- 人間が画面で確認する入口は `Web UI` と書きます。
- CLI、Java CLI、Agent Skills、MCP サーバーなどは、同じ product core を見せる複数の `エントリポイント` として扱います。
- 意味や変換方針の中心は `セマンティクスの中心` と書き、上流の主要アプリケーションの core に置きます。
- Web UI、CLI、Java CLI、Agent Skills、MCP サーバーは、原則としてセマンティクスの所有者ではなく adapter として扱います。
- プログラミング言語を述べるときは `TypeScript`、実行環境を述べるときは `Node.js` と書き分けます。
- Java 側の入口は `Java CLI` と書き、実行下限を述べるときは `Java 8 / Java 1.8` と書きます。
- MCP について、実装物を指すときは `MCP サーバー`、通信方式を述べるときは `stdio 方式` と `HTTP 方式` を使います。
- `diagnostics` は副産物ではなく、AI agent や MCP client が次の操作を選ぶための `契約` として扱います。
- `state`、`draft`、`patch`、`projection`、`report`、`diagnostics` は、単なるファイル種別ではなく artifact role として区別します。

言い回しとしては、単に「機能を追加する」「対応口を増やす」と書くのではなく、`同じ product core を、利用者、実行環境、操作様式に応じたエントリポイントとして見せる` という説明を基本にします。

## overview で説明済みの前提

overview 記事では、`miku-soft` を構成する Web UI、CLI、Java CLI、Agent Skills、MCP サーバーを、同じ product core を見せる複数のエントリポイントとして整理しました。

セマンティクスの中心は、上流の主要アプリケーションの core に置きます。Web UI、CLI、Java CLI、Agent Skills、MCP サーバーは、その core をそれぞれの利用者、実行環境、操作様式に合わせて見せる adapter です。

また、diagnostics と成果物は、単なる副産物ではなく、AI agent や MCP client が次の操作を安全に選ぶための契約として扱います。

ここから先は、この前提を繰り返すのではなく、overview では強く出しきれなかったニュアンスと、別記事に分けられそうな論点だけを残します。

## 残したいニュアンス

### Web UI は弱いのではなく、役割が違う

Web UI は、生成AI向けエントリポイントに比べて弱いものではありません。

Web UI は、人間がローカルで入力ファイルを読み込み、変換結果をプレビューし、summary や diagnostics を見て、必要な成果物を保存するための確認面です。

重要なのは、Web UI にだけ意味を閉じ込めないことです。

画面上の状態だけが正で、CLI や Agent Skills から同じ処理を再現できない、という形にはしません。Web UI は人間向けの確認面であり、セマンティクスの所有者ではありません。

### CLI は UI のおまけではない

CLI は、Web UI の裏口ではありません。

AI agent、script、CI、ローカル自動化が、同じ処理を再現可能に実行するための正式なエントリポイントです。

CLI では、入力ファイル、出力ファイル、オプション、stdout、stderr、exit code、diagnostics の役割を明確にします。

生成AIが CLI を呼ぶ場合、画面を見て判断することはできません。そのかわり、exit code、出力ファイル、JSON、diagnostics、summary を見ます。

この意味で、CLI の設計は生成AI向けアーキテクチャの中心にかなり近い位置を持ちます。

### 生成AI向けの設計は、自由にさせる設計ではない

生成AI向けに設計する、というと、AI に自由に文章を生成させたり、自由に計画を作らせたりする方向を想像するかもしれません。

しかし、`miku-soft` でやりたいことは少し違います。

AI の自由度を、構造化された artifact pipeline の中に閉じ込めます。

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

必要な範囲だけを projection として渡し、AI からは自由文ではなく patch JSON のような構造化文書を返してもらいます。それを validate し、参照 ID、変更可能なフィールド、影響範囲、構造変更などを確認してから apply します。

これは AI を信頼しないという話ではありません。

AI が強い部分と、機械的に検証すべき部分を分ける設計です。

### artifact role を崩すと AI agent が危なくなる

`XLSX` という拡張子が同じでも、構造交換用の workbook XLSX と、人間向けレポートである WBS XLSX は別の artifact role です。

`JSON` という拡張子が同じでも、内部状態、AI 向け projection、AI から戻る patch、診断ログは別のものです。

この区別を崩すと、AI agent が安全に操作できなくなります。

AI agent にとって重要なのは、ファイル形式だけではありません。そのファイルが state なのか、projection なのか、patch なのか、report なのか、diagnostics なのか、という役割です。

### diagnostics はログではなく判断材料

変換ツールでは、成功した出力だけを見ると重要な情報を見落とします。

現実のファイルには、未対応の要素、曖昧な構造、fallback した値、失われた情報、解釈できなかった範囲が出てきます。

diagnostics には、できるだけ次のような情報を持たせます。

- severity
- code
- message
- source location
- fallback reason
- unsupported reason
- warning summary

人間向け Web UI では、これは確認画面に出ます。

AI agent や MCP client にとっては、次の操作を安全に選ぶための判断材料になります。

変換結果が生成されていても、重大な warning があるなら、そのまま別形式へ渡すべきではないかもしれません。逆に、軽微な fallback であれば、処理を続けてもよいかもしれません。

この判断を可能にするには、diagnostics が自然文ログではなく、できるだけ構造化された出力である必要があります。

## 次の記事にできそうな論点

### TypeScript から Java への straight conversion

この記事は `20260430-general-straight-conv.md` として執筆済みです。

`miku-soft` では、Java CLI を Java-first に再設計するのではなく、TypeScript で実装され Node.js runtime で動く upstream main application から追跡可能な形で変換することを重視します。

ここでいう straight conversion は、単純な機械翻訳ではありません。

重要なのは、上流の TypeScript 版の意味、責務分割、ファイル境界、語彙、CLI の契約、diagnostics、artifact role を、Java 側でも追跡できるようにすることです。

straight conversion の前に TypeScript 版で整理しておきたいのは、たとえば次のような点です。

- core processing と Web UI / CLI エントリポイントを分ける
- セマンティクスを DOM event handler や CLI parsing に閉じ込めない
- data model、conversion policy、diagnostics、artifact generation を見通しやすくする
- public API または CLI の契約として呼び出せる単位を明確にする
- tests で upstream の主要な意図を確認できるようにする
- generated artifact の役割と命名を明確にする
- unsupported、fallback、warning を diagnostics として出せるようにする

Java 側で美しく作り直すのではなく、TypeScript 側で意味と責務を整理し、その整理された構造を Java 側へ追跡可能に移す。

これが、`miku-soft` における straight conversion の出発点です。

執筆済み記事では、特に次の語彙を中心に整理しました。

- `upstream-following ability`
- `mapping table`
- `focused regression`
- `follow-up log`
- `byte-level parity`
- `Java-side original extensions`

この記事で大事だったのは、生成AIに自由に Java らしい再設計をさせるのではなく、AI agent が追跡可能な作業地図を先に用意する、という整理です。

今後この論点を別記事へ展開する場合は、同じ主題を繰り返すよりも、次のような派生テーマに分けるとよさそうです。

- mapping table の実例
- focused regression command の置き方
- byte-level parity をどこから導入するか
- Java-side original extensions と upstream 由来契約の分離
- follow-up log を会話の外に残す運用

### Java 8 / Java 1.8 を runtime 下限に置く理由

Java CLI を提供するなら、runtime の下限も決める必要があります。

ここでは、現実的な下限として Java 8 / Java 1.8 を置きます。

最近の Java だけを前提にすれば、より新しい言語機能や標準 API を使えます。しかし、業務端末や既存のビルド環境で「すでに入っていそうな runtime」として考えると、Java 8 / Java 1.8 はまだ重要な境界になります。

Java 版 CLI は Java-first な再設計ではありません。

Java 8 / Java 1.8 で動くことを実行環境の制約として受け入れつつ、上流の TypeScript 実装と Node.js CLI 側の意味、CLI の契約、diagnostics、artifact role をできるだけ追跡可能に保つことを重視します。

### Agent Skills は単なるプロンプト集ではない

Agent Skills は、単なるプロンプト集ではありません。

少なくとも `miku-soft` で考えている Agent Skills は、AI agent が upstream product を安全に使うための workflow adapter です。

Agent Skills が持つべきものは、たとえば次のような情報です。

- いつ activation するか
- どの runtime artifact を優先して使うか
- どの操作をどの順序で使うか
- state、draft、patch、report、diagnostics をどう区別するか
- hard error と soft warning をどう扱うか
- 生成ファイルをどこへ置くか
- どの操作は handoff にしてよいか

ここで大事なのは、Agent Skill が product logic を再実装しないことです。

必要な機能が upstream にないなら、まず upstream の public API や CLI の契約として追加します。Skill 側はそれを呼びます。

この関係を保たないと、Skill がいつのまにか別プロダクトになってしまいます。

### CLI 内包型 Agent Skills

`miku-soft` では、Agent Skills に CLI を内包させる形を考えています。

ここでは便宜上、CLI 内包型 Agent Skills と呼んでいます。

CLI 内包型 Agent Skills では、skill package の中に、AI agent が呼び出せる runtime artifact を含めます。

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

```text
Agent reads SKILL.md
  -> selects operation
  -> calls bundled CLI
  -> receives files / diagnostics / reports
```

ここでも大事なのは、Agent Skills が product logic を再実装しないことです。

内包する CLI は、上流 product の runtime artifact です。

### MCP は CLI の代替実装ではない

MCP サーバーは、AI client が product operation を tool / resource / prompt として呼ぶための protocol adapter です。

MCP は CLI の代替実装ではありません。

CLI を直接呼ぶことが難しい環境でも、AI client から標準的な tool interface として呼べるようにするための、もう一つのエントリポイントです。

MCP サーバーは、上流の public API、Node.js CLI runtime、Java CLI runtime などを呼び出す薄い protocol adapter として設計します。

MCP 側で product logic を増やしすぎると、CLI や Agent Skills と意味がずれてしまいます。

### MCP transport と security

MCP サーバーは、必ずしも HTTP サーバーとして動くものではありません。

local stdio server は、MCP client からローカルプロセスとして起動され、ローカルの runtime artifact やファイルを扱うための protocol adapter です。

```text
MCP client
  -> local stdio MCP サーバー
      -> bundled / configured runtime
      -> local files
```

一方で、HTTP 方式を提供する場合は、少なくとも次のような点を別途設計する必要があります。

- セッション
- 作業領域の分離
- 認証
- 保存方針
- アップロードの扱い
- 成果物の寿命
- サイズ上限
- 後片付け

また、MCP サーバーは AI client から executable operation を呼べるエントリポイントです。

そのため、任意ファイルアクセスや任意コマンド実行にならないようにする必要があります。

- tool arguments として shell fragment を受け取らない
- 上流 runtime を呼ぶときは、文字列連結した shell command ではなく、固定された command と argument array で呼ぶ
- 読み書きするファイルは、ユーザーや client が明示したもの、または設定された作業領域 / 出力先の範囲に寄せる
- generated file や diagnostics の場所は、結果として明示する

MCP の tool descriptions や annotations は、サーバー側の検証の代わりにはなりません。

### README / docs / TODO / workplace の運用

この論点は `20260430-general-ai-dev-docs-workplace.md` として公開済みです。

- Qiita: https://qiita.com/igapyon/items/e2002183dcdadf00ec59
- タイトル: `[miku-soft] 生成AI駆動開発における README / docs / TODO / workplace の使い分け`

記事では、生成AI駆動開発における文書と作業場所の分け方を扱いました。

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

README は、普通の利用者が最初に読むエントリポイントです。

docs には、詳細な設計、内部仕様、migration、mapping、test policy などを置きます。

TODO.md は、作業中のコンテキストを置く場所です。生成AIと長く開発していると、会話の外に、今どこまで進んだのか、次に何をするのか、再開時に何を読むべきかを置いておくことが効きます。

workplace は、ローカル検証や生成物や一時ファイルの置き場です。ただし、workplace はソースディレクトリではありません。基本的には `workplace/.gitkeep` だけを追跡し、通常の中身は git 管理しません。

このように情報の置き場所を分けておくと、生成AI駆動開発でも、再開時の文脈が崩れにくくなります。

公開済み記事では、特に次の観点を強く出しました。

- これらの Markdown は、人間同士だけでなく、人間と生成AI agent の情報共有の場所になる
- TODO.md は単なるタスク一覧ではなく、セッション再開のための作業コンテキスト置き場になる
- README.md と TODO.md は、次回セッションの再開プロンプトとして機能する
- workplace は一般名詞としての標準慣習ではなく、ローカル検証や一時生成物を通常ソースと分けるための作業領域名として使う
- 確定した判断は docs、作業中の気づきは TODO.md、一時生成物は workplace へ寄せる

今後この論点をさらに広げる場合は、同じ役割分担を繰り返すよりも、実際の `TODO.md` 運用例、docs へ移す判断基準、workplace の `.gitignore` 設計などに分けるとよさそうです。

### 外部ライブラリ依存の判断軸

local-first な Single-file Web App を前提にすると、外部ライブラリへの依存も自然に絞ることになります。

ただし、方針は依存ゼロ主義ではありません。

判断軸としては、次のようになります。

- 実行時ネットワークに依存しないか
- Single-file Web App に bundle できるか
- OSS として扱えるか
- core のセマンティクスを隠してしまわないか
- diagnostics や artifact role を `miku-soft` 側で保持できるか
- その依存がユーザー価値や保守性を明確に上げるか

使わないのは、core の意味を外部ライブラリに丸投げしてしまう依存です。

使ってよいのは、複雑な仕様、描画、既存形式接続、安全性などを現実的に扱うための OSS 依存です。

## 記事化候補

### 公開済み: 生成AI駆動開発における README / docs / TODO / workplace

記事:

- `20260430-general-ai-dev-docs-workplace.md`
- Qiita: https://qiita.com/igapyon/items/e2002183dcdadf00ec59
- Qiita記事「[miku-soft] 生成AI駆動開発における README / docs / TODO / workplace の使い分け」

扱った主題:

- README は利用者向け
- docs は設計と判断理由
- TODO.md は再開時の文脈
- workplace はローカル検証と生成物
- 会話の外に作業文脈を置く重要性

この記事では、`README.md`、`docs/`、`TODO.md`、`workplace/` を、生成AI agent と人間が作業文脈を共有するための置き場所として整理しました。

この記事の続きとしては、次のような派生テーマが考えられます。

- TODO.md をセッション再開コンテキストとして使う具体例
- docs へ残す判断理由と、TODO.md に残す一時メモの分け方
- workplace の `.gitignore` 設計と一時生成物の置き場所
- README.md と TODO.md を読ませる再開プロンプトの型

### 候補 1: 生成AI向け設計は、自由にさせる設計ではない

主題:

- AI に巨大な状態を丸投げしない
- projection、patch、validate、apply、diff、report の pipeline に閉じ込める
- AI を信頼しないのではなく、AI が強い部分と機械的に検証すべき部分を分ける

この記事は、overview の次に出す記事として相性がよさそうです。

### 執筆済み: TypeScript から Java への straight conversion

記事:

- `20260430-general-straight-conv.md`
- Qiita記事「[miku-soft] 生成AI時代のストレートコンバージョン設計」

扱った主題:

- Java-first な再設計を避ける
- upstream file boundary、語彙、CLI の契約、diagnostics、artifact role を追跡する
- TypeScript test intent を Java test へ移す
- 生成AIに任せる前に、人間側が守るべき conversion 方針を言語化する

この記事の続きとしては、mapping table、focused regression、follow-up log、byte-level parity、Java-side original extensions のどれかを、実例ベースで個別に掘る方向がよさそうです。

### 候補 2: Agent Skills は単なるプロンプト集ではない

主題:

- Agent Skills は workflow adapter
- artifact role、diagnostics policy、runtime artifact lookup を持つ
- CLI 内包型 Agent Skills
- Agent Skills が product logic を再実装しないための境界

### 候補 3: MCP サーバーを protocol adapter として設計する

主題:

- MCP は CLI の代替実装ではない
- tool name、input schema、result schema、resource URI、diagnostics を契約として整える
- local stdio first
- HTTP 方式にする場合の session、storage、auth、isolation
- tool descriptions や annotations はサーバー側検証の代わりにならない

## まとめメモ

overview 記事では、`miku-soft` の全体像を説明しました。

この topic bank では、全体像の繰り返しではなく、次の記事に育てられる論点だけを残します。

特に残したい軸は、次の通りです。

- Web UI は弱いのではなく、役割が違う
- CLI は UI のおまけではない
- 生成AI向けの設計は、自由にさせる設計ではない
- diagnostics はログではなく判断材料
- Agent Skills は単なるプロンプト集ではない
- MCP は CLI の代替実装ではない
- Java CLI は Java-first な再設計ではなく、追跡可能なエントリポイント

この方向に整理しておくと、`topic-bank.md` は overview の重複原稿ではなく、次の記事群のための観察メモとして使いやすくなります。
