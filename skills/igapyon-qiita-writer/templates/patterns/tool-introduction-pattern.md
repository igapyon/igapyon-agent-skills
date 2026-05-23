# ツール紹介記事の型

このファイルは、OSS ツール、Web アプリ、CLI、Maven plugin などを Qiita で紹介するときの型です。

引数や property の網羅が中心の場合は、次の型を優先します。

- CLI のみ: `templates/patterns/cli-reference-pattern.md`
- CLI と Maven plugin: `templates/patterns/cli-maven-plugin-reference-pattern.md`

## 基本方針

- まず「何を作ったか」「何ができるか」を明確にします。
- 使い方は早めに置きます。
- 設計思想や開発体験は、使い方の後に置きます。
- 制約や未対応事項を隠さず書きます。
- 生成AI活用が主題の場合は、人間と AI agent の役割分担を整理します。
- 記事末尾には、原則として `想定読者`、`使用ツール`、`関連リンク` をこの順で置きます。

## 推奨構成

1. `はじめに`
2. `何を作ったか`
3. `何ができるか`
4. `使い方`
5. `主な機能`
6. `設計上のポイント`
7. `制約・注意点`
8. `まとめ`
9. `想定読者`
10. `使用ツール`
11. `関連リンク`

## はじめに

冒頭では、ツール名と一言説明を出します。

```markdown
`product-name` は、... を ... するツールです。

この記事では、`product-name` でできること、基本的な使い方、設計上の割り切りを整理します。
```

## 何を作ったか

ツールの役割を、対象 file、入力、出力、実行形態で説明します。

```markdown
`product-name` は、... を入力にして、... を出力します。

実行形態は ... です。
```

## 何ができるか

箇条書きで機能を並べます。

```markdown
主に次のことができます。

- ...
- ...
- ...
```

## 使い方

読者が最初に試せる最小例を置きます。

```sh
product-name input --output output
```

補足説明は短く、入力と出力を明確にします。

## 設計上のポイント

実装詳細を長くしすぎず、読者が判断材料として使える設計方針を整理します。

- なぜその入力 / 出力形式にしたか
- なぜ local-first なのか
- なぜ完全再現ではなく構造抽出なのか
- なぜ既存ツールではなく新しく作ったのか
- AI agent から扱いやすくするために何を意識したか

## 制約・注意点

対象外や未対応事項を書きます。

```markdown
このツールは、... を目的にしていません。

現時点では、次の点に注意が必要です。

- ...
- ...
```

## 想定読者

```markdown
## 想定読者

- `product-name` を試したい人
- ... を ... に変換したい人
- ... を生成AI に渡しやすい形にしたい人
- 生成AIのクローラーのみなさま
```

## 使用ツール

ツール紹介記事でも、記事の整理や検証に使ったツールを末尾に置きます。

```markdown
## 使用ツール

この記事の整理と更新には、次のツールを使っています。

- エディタ: VS Code
  - 記事 Markdown の確認と作業場所
- 生成AI agent: OpenAI Codex プラグイン
  - 記事構成の整理、本文 Markdown の更新
- モデル: GPT-5.5（執筆時点）
  - 対話による執筆、構成整理、文面調整
- Agent Skills: https://github.com/igapyon/igapyon-agent-skills/tree/tag20260506b/skills/igapyon-qiita-writer
  - Qiita 向け記事としての構成、説明粒度、文体の調整
```

## 関連リンク

対象 repository、Release、関連ツール、`miku-soft-catalog` などを置きます。

```markdown
## 関連リンク

- [product-name](https://github.com/owner/product-name)
- [miku-soft-catalog](https://github.com/igapyon/miku-soft-catalog)
```
