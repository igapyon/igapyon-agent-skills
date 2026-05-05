## 掲載先情報

- 掲載先: Qiita
- URL: https://qiita.com/igapyon/items/ca8c83215a71e22ffd26

---
title: [miku-soft] miku-soft の Agent Skills 一覧
tags: mikuku AgentSkills
author: igapyon
slide: false
---
# はじめに

miku-soft として作成・管理している Agent Skills の一覧です。

この記事は、個々の Agent Skills の詳細な使い方を説明するものではなく、どのリポジトリが何のためにあるかを見渡すための入口として用意しています。

作成日: 2026-05-03

![はじめに](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/105739/a7013a66-b99d-4c68-8178-e98816a41b24.png)

# Agent Skills 一覧

| リポジトリ | 用途 | 主な対象 |
|---|---|---|
| [mikuproject-skills](https://github.com/igapyon/mikuproject-skills) | WBS を作成・修正・出力するための Agent Skills | WBS / XLSX / Markdown / SVG / Mermaid |
| [mikuscore-skills](https://github.com/igapyon/mikuscore-skills) | 楽譜・音楽データ関連の作業を支援する Agent Skills | ABC / MusicXML / MIDI / MuseScore / 楽譜レンダリング |
| [miku-grep-skills](https://github.com/igapyon/miku-grep-skills) | 独自GREP、主に Shift_JIS ファイルを GREP するための Agent Skills | ローカルファイル検索 / Shift_JIS / 調査支援 |
| [miku-readfile-skills](https://github.com/igapyon/miku-readfile-skills) | 独自ファイル内容の読み取り、主に Shift_JIS ファイルを読み込むための Agent Skills | ローカルファイル読込 / Shift_JIS / 内容確認 |

# 各リポジトリ

## mikuproject-skills

`mikuproject-skills` は、WBS を作成・修正・出力するための Agent Skills です。

要件や制約から WBS を作成したり、既存の計画を修正したりできます。結果は `XLSX`、`Markdown`、`SVG`、`Mermaid` などの形式で出力できます。

- GitHub: https://github.com/igapyon/mikuproject-skills
- 記事: https://qiita.com/igapyon/items/3736cc2ea348cb3ee63b

## mikuscore-skills

`mikuscore-skills` は、楽譜・音楽データ関連の作業を支援する Agent Skills です。

ABC を中心にした作成、ABC / MusicXML / MIDI / MuseScore などの形式変換、楽譜レンダリング経路、変換時の方針や制約の整理を支援することを目的としています。

- GitHub: https://github.com/igapyon/mikuscore-skills
- 関連記事: https://qiita.com/igapyon/items/8444b5f50d63207002c0

## miku-grep-skills

`miku-grep-skills` は、独自GREP、主に Shift_JIS ファイルを GREP するための Agent Skills です。

Shift_JIS のテキストファイルを含むローカルファイルを検索し、Agent との対話の中で調査結果を扱いやすくすることを目的としています。

生成AIツールが正しく Shift_JIS を扱えるようになったら役割を終えるだろう Agent Skills です。

- GitHub: https://github.com/igapyon/miku-grep-skills

## miku-readfile-skills

`miku-readfile-skills` は、独自ファイル内容の読み取り、主に Shift_JIS ファイルを読み込むための Agent Skills です。

Shift_JIS のテキストファイルを含むローカルファイルの内容確認を、Agent との対話の中で進めやすくすることを目的としています。

生成AIツールが正しく Shift_JIS を扱えるようになったら役割を終えるだろう Agent Skills です。

- GitHub: https://github.com/igapyon/miku-readfile-skills

# 番外編

## igapyon-agent-skills

`igapyon-agent-skills` は、個人用の Agent Skills を管理するためのリポジトリです。

主に、日本語の Qiita / Note 記事作成と、技術・音楽投稿の伴走型ライティング支援に使う skill を置いています。Qiita や Note の miku-soft の記事は、基本的にこの Agent Skills を活用して書いています。miku-soft 本体のプロダクト向け skill とは少し性格が異なるため、この記事では番外編として扱います。

- GitHub: https://github.com/igapyon/igapyon-agent-skills

# おわりに

この一覧は、miku-soft 関連の Agent Skills を追加・整理したタイミングで更新していく予定です。

# 関連する Qiita 記事

Agent Skills そのものに加えて、Agent Skills が利用・内包している CLI や関連ツールの記事も含めています。

## Agent Skills / 生成AI agent 関連

- [知識ベース型 Agent Skills は、静的 Markdown だけでも育てられる（SKILL.md + references/ 設計）](https://qiita.com/igapyon/items/94de2bee0ebdf25ecd6c)
- [[miku-soft] 生成AI駆動開発における README / docs / TODO / workplace の使い分け](https://qiita.com/igapyon/items/e2002183dcdadf00ec59)
- [生成AI時代の repository engineering 徒然考](https://qiita.com/igapyon/items/89c5bfcb92665a3a3cdd)

## CLI / 関連ツール

- [[mikuproject] WBS 関連資料を XLSX / Markdown / SVG などで扱える OSSツールを作った](https://qiita.com/igapyon/items/e04a8224ff0fc71dc69d)
- [[miku-indexgen] AI エージェントが読む前に、ディレクトリの index.json / index.md を作る CLI](https://qiita.com/igapyon/items/85871ba02955e78b3825)
