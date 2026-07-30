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

フッターは本文の後ろに置きます。本文後補足がある場合は、その後ろから始めます。

フッター本文はこのファイルへ複製せず、共通の
[article-footer-sections-template.md](article-footer-sections-template.md) を使います。
同ファイルの `Placeholder Strategy` に従い、画像 base path、関連記事、現在有効な
Note 記事一覧 URL または相対 path を記事 package ごとに解決してください。

公開前に、未解決の `{{...}}` placeholder と、過去の日付に固定された記事一覧 path が
残っていないことを確認します。
