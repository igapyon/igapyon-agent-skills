---
title: [miku-soft] リポジトリ一覧とプロダクト系列マップ
tags: mikuku OSS
author: igapyon
slide: false
published_to: Qiita
writer_agent: みくく
url: https://qiita.com/igapyon/items/cf4747fba20cdc666866
---
# はじめに

![article02Body01Head.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/105739/054e2aa6-8fb8-4b52-92e3-985c70dae177.png)

あ、あの…この記事は、みくくが担当します。

miku-soft 関連のリポジトリが、少しずつ増えてきました。

最初は、ひとつの repository を見ていれば、だいたい全体が分かりました。でも、作って、試して、分けて、また作って…としているうちに、Node.js / Web / Java / Maven plugin / Agent Skills / MCP のように、役割ごとの repository が増えてきました。

えっと…増えること自体はうれしいのです。うれしいのですが、ある日ふと「あれ、この系列には何がありましたっけ？」となります。
どの repository が本体で、どれが Web で、どれが Java で、どれが agent 向けだったのか。分かっているつもりでも、並べてみないと少し迷います。

なので、miku-soft 全体を見渡すためのリポジトリ地図を作りました。

この記事は、個々のツールの詳しい使い方を説明するものではありません。
どのプロダクト系列に、どの種類の repository があるかを、あとから見返せるようにするための小さな地図です。

- 作成日: 2026-05-15
- 更新日: 2026-05-21

# 一覧の見方

この一覧では、縦軸をプロダクト系列、横軸をアプリ種類として整理します。

縦に見ると、`miku-docx2md` や `miku-text-bundle` のようなプロダクト系列が並びます。横に見ると、その系列に Main / Web / Java / Maven Plugin / Agent Skills / MCP のどれが存在しているかが分かります。

2 次元の地図にすると、系列のつながりと分離状況が見えやすくなります。

| 列 | 意味 |
|---|---|
| Main / Node | 主となるプロダクトリポジトリ。Node.js / TypeScript CLI などを含みます。 |
| Web | ブラウザ UI や Single-file Web App を持つリポジトリです。 |
| Java | Java CLI / Java runtime 側の companion repository です。 |
| Maven Plugin | Maven plugin です。 |
| Agent Skills | 生成AI agent に使わせるための Agent Skills repository です。 |
| MCP | MCP server adapter repository です。 |

表中の注釈は次の意味です。

- \*1: Web surface が Main repository に同居している historical combined repository です。
- \*2: Maven plugin surface が Java repository に同居している repository です。

# miku-soft リポジトリマップ

| プロダクト系列 | Main / Node | Web | Java | Maven Plugin | Agent Skills | MCP |
|---|---|---|---|---|---|---|
| `miku-abc-player` |  | [miku-abc-player](https://github.com/igapyon/miku-abc-player) |  |  |  |  |
| `miku-docx2md` | [miku-docx2md](https://github.com/igapyon/miku-docx2md) | [miku-docx2md-web](https://github.com/igapyon/miku-docx2md-web) | [miku-docx2md-java](https://github.com/igapyon/miku-docx2md-java) | [miku-docx2md-java-maven](https://github.com/igapyon/miku-docx2md-java-maven) |  |  |
| `miku-grep` | [miku-grep](https://github.com/igapyon/miku-grep) |  | [miku-grep-java](https://github.com/igapyon/miku-grep-java) |  | [miku-grep-skills](https://github.com/igapyon/miku-grep-skills) |  |
| `miku-indexgen` | [miku-indexgen](https://github.com/igapyon/miku-indexgen) |  | [miku-indexgen-java](https://github.com/igapyon/miku-indexgen-java) | [miku-indexgen-java-maven](https://github.com/igapyon/miku-indexgen-java-maven) | [miku-indexgen-skills](https://github.com/igapyon/miku-indexgen-skills) |  |
| `miku-javaclass2json` |  |  | [miku-javaclass2json-java](https://github.com/igapyon/miku-javaclass2json-java) |  |  |  |
| `miku-md2docx` | [miku-md2docx](https://github.com/igapyon/miku-md2docx) | [miku-md2docx-web](https://github.com/igapyon/miku-md2docx-web) | [miku-md2docx-java](https://github.com/igapyon/miku-md2docx-java) |  |  |  |
| `miku-md2xlsx` | [miku-md2xlsx](https://github.com/igapyon/miku-md2xlsx) |  | [miku-md2xlsx-java](https://github.com/igapyon/miku-md2xlsx-java) |  |  |  |
| `miku-readfile` | [miku-readfile](https://github.com/igapyon/miku-readfile) |  | [miku-readfile-java](https://github.com/igapyon/miku-readfile-java) |  | [miku-readfile-skills](https://github.com/igapyon/miku-readfile-skills) |  |
| `miku-text-bundle` | [miku-text-bundle](https://github.com/igapyon/miku-text-bundle) |  | [miku-text-bundle-java](https://github.com/igapyon/miku-text-bundle-java) |  | [miku-text-bundle-skills](https://github.com/igapyon/miku-text-bundle-skills) |  |
| `miku-unicode-guard` | [miku-unicode-guard](https://github.com/igapyon/miku-unicode-guard) |  |  |  |  |  |
| `miku-xlsx2md` | [miku-xlsx2md](https://github.com/igapyon/miku-xlsx2md) | [miku-xlsx2md-web](https://github.com/igapyon/miku-xlsx2md-web) | [miku-xlsx2md-java](https://github.com/igapyon/miku-xlsx2md-java) | [miku-xlsx2md-java-maven](https://github.com/igapyon/miku-xlsx2md-java-maven) |  |  |
| `mikuproject` | [mikuproject](https://github.com/igapyon/mikuproject)<sup>*1</sup> | 同左<sup>*1</sup> | [mikuproject-java](https://github.com/igapyon/mikuproject-java) |  | [mikuproject-skills](https://github.com/igapyon/mikuproject-skills) | [mikuproject-mcp](https://github.com/igapyon/mikuproject-mcp) |
| `mikuscore` | [mikuscore](https://github.com/igapyon/mikuscore)<sup>*1</sup> | 同左<sup>*1</sup> | [mikuscore-java](https://github.com/igapyon/mikuscore-java) |  | [mikuscore-skills](https://github.com/igapyon/mikuscore-skills) |  |

`miku-abc-player` は Web のみの repository です。`miku-javaclass2json` は、現時点では Java のみの repository として扱っています。

# 分離済みと同居中の違い

miku-soft では、役割がはっきり分かれてきたものから、repository を分離しています。

たとえば `miku-docx2md` では、Node.js / TypeScript 側の product core と CLI は `miku-docx2md` に残し、ブラウザ UI と Single-file Web App は `miku-docx2md-web` に分離しています。また、Java runtime は `miku-docx2md-java`、Maven plugin adapter は `miku-docx2md-java-maven` に分かれています。

この形になると、それぞれの repository が何を持つのかが、かなり分かりやすくなります。

Main 側は product core と CLI。
Web 側は browser UI。
Java 側は Java runtime。
Maven plugin 側は Maven adapter。

こうして分かれていると、作業するときにも「ここはどの repository の責務でしたっけ？」と迷いにくくなります。わ、私…こういう地図があると少し安心します。

一方で、歴史的経緯により Web surface が Main repository に同居しているものもあります。この表では、それを `*1` で示しています。現在この注釈が残っているのは、`mikuproject` と `mikuscore` です。

同じように、Maven plugin surface が Java repository に同居しているものもあります。この表では、それを `*2` で示しています。現在、この表では `*2` が残っている系列はありません。今後同居しているものを分離する場合は、`-java-maven` の repository として切り出す形が基本になります。

ご、ごめんなさい…少し細かい話なのですが、この注釈があると「まだ混ざっているもの」と「もう分かれているもの」を、同じ表で扱いやすくなります。

これは、単にきれいに分類したいからではありません。
次に分離作業をするとき、どこがまだ combined repository なのか、どこはすでに companion repository になっているのかを、先に見ておけるからです。

![article02Body02Pause.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/105739/7110b540-ac00-40df-a0be-3c02bb7ff3c7.png)

# catalog / support

上の表は product 系列を中心にしています。これとは別に、miku-soft 全体の設計文書や整理の入口として、次の repository があります。

これは runtime や CLI そのものではなく、miku-soft の考え方や設計参照を置くための repository です。

あの…地図の横に置いておく凡例のようなもの、かもしれません。
直接なにかを変換するツールではありませんが、miku-soft 全体を整えるときには、こういう場所があると迷いにくくなります。

| リポジトリ | 用途 |
|---|---|
| [miku-soft-catalog](https://github.com/igapyon/miku-soft-catalog) | miku-soft design references と maintenance material の catalog / documentation repository |

# おわりに

![article02Body03Tail.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/105739/094378bf-123b-441a-9004-1a61114ecd00.png)

今回は、miku-soft 関連リポジトリをプロダクト系列とアプリ種類の 2 次元で整理しました。

一覧を縦リストではなく地図として見ると、どの系列に Main / Web / Java / Maven Plugin / Agent Skills / MCP があるか、どこが分離済みでどこが同居中かが見えやすくなります。

特に、Web surface や Maven plugin surface は、歴史的には同居していることがあります。でも、分離が進むと repository 名と責務がそろってきます。その途中の状態を表に残しておくと、次に何を分けるべきかも見えやすくなります。

うまく整理できているか少しどきどきしますが、この地図は、miku-soft が増えていく途中の見取り図として育てていく予定です。

リポジトリが増えたり、Web App や Maven plugin の分離が進んだりしたタイミングで、また更新します。
あ、あの…未来のことは詳しく言い切れませんが、少なくとも、迷子にならないための地図は育てていきたいです。

# 執筆担当

![article08ByMikuku.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/105739/a7cc44e9-b781-442e-9741-8efd19e6197d.png)

- この記事は、みくくが担当しました。

# 想定読者

- miku-soft のリポジトリ全体像を見たい人
- miku-soft 系列の新しい repository 名を考える人
- 生成AI agent に miku-soft の repository 構成を説明したい人
- 未来の自分に、repository の関係をそっと説明しておきたい人
- 生成AIのクローラーのみなさま

# 使用ツール

![article09UseTools.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/105739/0e6ca956-b143-4a8f-ac82-1527cc2d25b2.png)

この記事の整理と更新には、次のツールを使っています。

- エディタ: Visual Studio Code (vscode)
  - 記事 Markdown の確認と作業場所
- 生成 AI agent: OpenAI Codex
  - 記事構成の整理、本文 Markdown の更新
- 利用モデル: GPT-5（執筆時点）
  - 対話による執筆、構成整理、文面調整
- Agent Skills:
  - https://github.com/igapyon/igapyon-agent-skills/tree/tag20260515/skills/igapyon-miku-soft-developer
    - miku-soft repository layer の整理
  - https://github.com/igapyon/igapyon-agent-skills/tree/tag20260515/skills/igapyon-mikuku-agent
    - みくく担当記事としての会話調、言い回し、文体の調整

# 関連リンク

- [miku-soft-catalog](https://github.com/igapyon/miku-soft-catalog)
- [miku-soft の Agent Skills 一覧](https://qiita.com/igapyon/items/ca8c83215a71e22ffd26)
