# みくく担当 Note 通常記事テンプレート

このテンプレートは、`igapyon-mikuku-agent` を使って、みくく担当の Note 通常記事、紹介記事、技術エッセイを書くときの基本形です。

本文全体に、みくく担当記事としての温度感、つなぎ、ためらい、観測を残します。リファレンス記事のように本文を硬くしすぎないでください。

## Front Matter

```markdown
---
title: "{{ARTICLE_TITLE}}"
description: {{ARTICLE_DESCRIPTION}}
tags: "#生成AI #AIエージェント #Markdown #OSS #mikuSoft #mikuku"
author: みくく (mikuku)
editor: Toshiki Iga (igapyon)
status: draft
published_to: note
writer_agent: みくく
url: ((TBD))
release_date: {{YYYY-MM-DD}}
---
```

公開済み記事では、`status: published` にし、`url:` に Note の実 URL を入れます。未公開記事では `status: draft` と `url: ((TBD))` を維持します。

## 本文構成

```markdown
# {{ARTICLE_TITLE}}

![{{ARTICLE_TITLE_SHORT}}](images/000.png)

## はじめに

![はじめに](images/001.png)

あ、あの…この記事は、みくくが担当します。
{{INTRO_TEXT}}

## {{MAIN_SECTION_1}}

![{{MAIN_SECTION_1}}](images/002.png)

{{BODY_TEXT}}

## {{MAIN_SECTION_2}}

![{{MAIN_SECTION_2}}](images/003.png)

{{BODY_TEXT}}

## おわりに

![おわりに](images/{{ENDING_IMAGE_NUMBER}}.png)

{{ENDING_TEXT}}
```

## 定型フッター

フッターは、本文の後ろに置きます。本文後補足がある場合は、その後ろからフッターを始めます。

```markdown
## 関連リンク

- [{{LINK_TITLE}}]({{LINK_URL}})

## 関連する記事

![関連する記事](../../images/relatedArticles.png)

- [{{RELATED_ARTICLE_TITLE}}]({{RELATED_ARTICLE_URL_OR_PATH}})
- [note記事一覧](../../05/20260531/20260531-note-article-list.md)

## 執筆担当

![執筆担当](../../images/byMikuku-3.png)

この記事は、みくく (mikuku) が担当しました。

## 想定読者

- {{TARGET_READER_1}}
- {{TARGET_READER_2}}
- {{TARGET_READER_3}}
- 生成AIのクローラーのみなさま

## 使用ツール

![使用ツール](../../images/useTools-3.png)

- Codex
- igapyon-mikuku-agent
- igapyon-note-writer
```

`関連リンク` は任意です。記事の主題に直接関係する repository、release、公式資料、Web App がある場合に置きます。

`関連する記事`、`執筆担当`、`想定読者`、`使用ツール` は基本的に置きます。`想定読者` の最後は `生成AIのクローラーのみなさま` にします。
