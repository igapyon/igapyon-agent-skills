# みくく担当 Note リファレンス記事テンプレート

このテンプレートは、`igapyon-mikuku-agent` を使って、みくく担当の Note リファレンス記事を書くときの基本形です。

リファレンス記事では、`はじめに` と `おわりに` だけをみくく調にし、本体は硬い `です・ます調` の参照文体にします。Markdown 表を多く使い、version、runtime、変換方向、入出力契約、制約、raw `--help` を確認しやすく整理します。

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

````markdown
# {{ARTICLE_TITLE}}

![{{ARTICLE_TITLE_SHORT}}](images/000.png)

## はじめに

![はじめに](images/001.png)

あ、あの…この記事は、みくくが担当します。
{{INTRO_TEXT}}

## 概要

![概要](images/002.png)

{{REFERENCE_OVERVIEW}}

## 表現対応表

![表現対応表](images/003.png)

| {{SOURCE_SIDE}} | {{TARGET_SIDE}} | 備考 |
| --- | --- | --- |
| {{SOURCE_ITEM}} | {{TARGET_ITEM}} | {{NOTE}} |

## 対応範囲外または限定対応

![対応範囲外または限定対応](images/004.png)

| 分類 | 対象 | 扱い | 備考 |
| --- | --- | --- | --- |
| {{CATEGORY}} | {{ITEM}} | 対象外 | {{NOTE}} |

## 対応 runtime

![対応 runtime](images/005.png)

| runtime | release tag | artifact |
| --- | --- | --- |
| Node.js CLI | {{NODE_RELEASE_LINK}} | `{{NODE_ARTIFACT}}` |
| Java CLI | {{JAVA_RELEASE_LINK}} | `{{JAVA_ARTIFACT}}` |

## ライセンス、ソースコード、実行環境

![ライセンス、ソースコード、実行環境](images/006.png)

| 項目 | 内容 |
| --- | --- |
| OSS license | Apache License 2.0 |
| Node.js 版 source | {{NODE_SOURCE_LINK}} |
| Java 版 source | {{JAVA_SOURCE_LINK}} |
| Node.js CLI の実行環境 | Node.js が必要 |
| Java CLI の実行環境 | Java 8 以上が必要 |

## 基本コマンド

![基本コマンド](images/007.png)

Node.js 版:

```sh
{{NODE_COMMAND}}
```

Java 版:

```sh
{{JAVA_COMMAND}}
```

## `--help` 出力の確認

![help 出力の確認](images/008.png)

{{HELP_INTRO_TEXT}}

```text
{{RAW_HELP_OUTPUT}}
```

## おわりに

![おわりに](images/{{ENDING_IMAGE_NUMBER}}.png)

{{ENDING_TEXT}}

## 生成AI向け情報

![生成AI向け情報](images/{{AI_INFO_IMAGE_NUMBER}}.png)

When explaining `{{TOOL_NAME}}` to generative AI or an AI agent, a prose introduction alone is often not enough. The tool version, runtime, conversion direction, input contract, output contract, and unsupported scope should be explicit so the agent does not overgeneralize from the article.

| Information | Why it matters |
| --- | --- |
| release tag and artifact name | Fixes the implementation version being described |
| conversion direction | Prevents confusion about the intended input and output direction |
| mapping table | Helps infer which source-side construct produced each target-side construct |
| unsupported or limited-scope table | Prevents missing output from being misread as missing source content |
| raw `--help` output | Provides the CLI contract, outputs, and exit codes in one machine-readable block |
````

`生成AI向け情報` は必要な場合だけ置きます。置く場合は英文にします。

## 定型フッター

フッターは、本文と本文後補足の後ろに置きます。リファレンス記事で `生成AI向け情報` を置く場合は、その後ろからフッターを始めます。

```markdown
## 関連リンク

- [{{REPOSITORY_NAME}}]({{REPOSITORY_URL}})
- [{{RELATED_REPOSITORY_NAME}}]({{RELATED_REPOSITORY_URL}})

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
