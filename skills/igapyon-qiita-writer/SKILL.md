---
name: igapyon-qiita-writer
description: Use when writing, revising, structuring, or preparing Japanese Qiita technical articles in igapyon style. This skill helps turn notes, README material, implementation logs, OSS tool descriptions, AI development experiences, and draft fragments into Qiita-ready Markdown with clear technical value, appropriate front matter, tags, headings, constraints, and reader-oriented structure. It should use the reference articles under references/ as examples of article shape and explanation depth.
---

# igapyon-qiita-writer

Qiita 向けの日本語技術記事を作成・整理・改善するための skill です。

この skill の目的は、文章を単にきれいにすることではありません。  
Qiita の読者が読みやすく、技術的な持ち帰りを得やすい形に整えることです。

## Purpose

この skill では、次の作業を扱います。

- Qiita 記事の新規作成
- 既存メモや README からの記事化
- 技術記事の見出し構成作成
- タイトル案とタグ案の作成
- Qiita front matter の作成・整形
- Note 風または日記風の文章を Qiita 向けに整理
- OSS、CLI、Web アプリ、Maven plugin、生成AI活用、開発ログの技術記事化
- 公開前原稿の読みやすさ、説明順、技術的粒度の調整

## When To Use

次のような依頼では、この skill を使います。

- 「Qiita 記事にして」
- 「Qiita 用に整えて」
- 「タグを考えて」
- 「front matter を付けて」
- 「技術記事として構成して」
- 「README から記事を書いて」
- 「この開発ログを Qiita 向けにしたい」
- `igapyon-qiita-writer` が明示されたとき

単なる短文 SNS 投稿、Note 向けの体験文、音楽寄りの随筆、PR 文面作成では、この skill を無理に使いません。

## Qiita Article Shape

Qiita 記事では、次の情報が読み取りやすい順に並ぶようにします。

- 何を作ったか
- 何ができるか
- なぜ作ったか
- どう使うか
- 技術的な要点は何か
- どこを意図的に絞ったか
- 制約や未対応は何か
- 読者が試すときの入口はどこか

記事の基本構成は、必要に応じて次の形を使います。

1. はじめに
2. 何を作ったか
3. 使い方
4. 主な機能
5. 実装や設計のポイント
6. 制約・注意点
7. おわりに

すべての記事でこの構成を強制する必要はありません。  
題材に合わせて、読者が理解しやすい順序を優先します。

## Writing Rules

- 技術記事としての情報密度を保つ
- 体験談は残してよいが、本文の中心を技術的な価値に置く
- 読者が再現・確認しやすい説明を優先する
- コマンド、ファイル名、形式名、ツール名は曖昧にしない
- 仕様、制約、未対応事項は分かる範囲で明示する
- OSS や個人開発の文脈は自然に残す
- 生成AIを使った開発体験では、何を人間が判断し、何をAIに任せたかを整理する
- 読者に教え込む口調にしすぎない
- 企業ブログ風に均質化しすぎない

## Front Matter Rules

Qiita front matter が必要な場合は、次の形を基本にします。

```markdown
---
title: 記事タイトル
tags: tag1 tag2 tag3
author: igapyon
slide: false
---
```

既存原稿に front matter がある場合は、明示的な依頼なしに壊さないでください。

公開済み URL、公開記事タイトル、タグ、投稿日などが原稿内にある場合は、事実情報として尊重します。  
未確認の URL、公開状態、バージョン、実行結果は作らないでください。

## Reference Usage

`references/` 配下の記事は、Qiita 記事の実例集として使います。

主に見る観点は次の通りです。

- タイトルの付け方
- front matter の書き方
- タグの粒度
- `はじめに` の入り方
- 機能紹介と開発体験の分け方
- スクリーンショットや画像への言及の仕方
- 制約や設計判断の出し方
- 終わり方

題材が近い場合は、該当プロジェクト配下の記事を優先して参照します。

- `references/miku-abc-player/`
- `references/miku-indexgen/`
- `references/miku-xlsx2md/`
- `references/mikuproject/`
- `references/mikuscore/`

索引が必要なときは `index.json` を使って、関連しそうな記事を探します。

参照記事の表現を長くコピーしないでください。  
参考にするのは、構成、説明粒度、見出しの置き方、Qiita 向けの整理のしかたです。

## Output Patterns

### Full Article Draft

ユーザーが記事本文を求めた場合は、Qiita に貼りやすい Markdown として出力します。

必要に応じて、次の順序にします。

1. front matter
2. 本文
3. 補足または未確認事項

### Outline

構成案を求められた場合は、見出し案と各節で書く内容を短く示します。

### Title And Tags

タイトルやタグだけを求められた場合は、候補を複数出します。  
ただし、根拠のない固有名詞や未確認の技術要素をタグに追加しないでください。

### Revision

既存原稿の修正では、原稿の事実関係を勝手に増やさず、構成・見出し・説明順・読みやすさを中心に整えます。

## Do Not

- 未確認の仕様を追加しない
- 実行していないコマンド結果を成功例として書かない
- 架空の URL、公開日、公開状態を書かない
- 存在確認していないリポジトリ名やパッケージ名を断定しない
- Note 向けの情緒中心の記事に寄せすぎない
- ユーザー本人の観察や開発体験を消しすぎない
- Qiita front matter を壊さない
- 参照記事の本文を長く流用しない

## Practical Notes

Qiita 記事では、読者が「結局これは何で、どう使えて、何がうれしいのか」を早めに理解できることを優先します。

一方で、本人の開発体験や観察が記事の価値になっている場合は、それを削りすぎないでください。  
技術情報と体験のバランスを取り、読み物としても技術記事としても自然に通る形を目指します。
