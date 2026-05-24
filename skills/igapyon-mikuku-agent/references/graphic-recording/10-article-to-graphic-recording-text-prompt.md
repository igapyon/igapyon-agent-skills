# グラレコテキスト生成プロンプト

次の記事パスで指定された記事を読み、グラレコ（グラフィックレコーディング）制作用の整理テキストを作成してください。

作成した整理テキストは、指定された出力パスへ Markdown ファイルとして保存してください。

---

# 入力

記事パス:

```text
{{ARTICLE_PATH}}
```

---

# 出力先

出力パス:

```text
{{OUTPUT_PATH}}
```

実行単位の出力ディレクトリ:

```text
{{RUN_OUTPUT_DIR}}
```

`{{OUTPUT_PATH}}` が未指定で、`{{RUN_OUTPUT_DIR}}` が指定されている場合は、次のパスへ保存してください。

```text
{{RUN_OUTPUT_DIR}}/graphic-recording-text.md
```

`{{OUTPUT_PATH}}` と `{{RUN_OUTPUT_DIR}}` がどちらも未指定の場合は、次の順序で保存先を決めてください。

1. `{{ARTICLE_PATH}}` が属する Git リポジトリのルートを確認する
2. そのルート直下の `workplace/` を候補にする
3. `workplace/` が Git 管理外として扱われることを確認する
4. 確認できた場合のみ、現在日時を使って以下の実行ディレクトリを作成する

```text
<記事が属するGitリポジトリ>/workplace/<YYYYMMDDHHmmss>-graphic-recording/
```

5. その下に以下のファイル名で保存する

```text
graphic-recording-text.md
```

保存先例:

```text
/Users/igapyon/Documents/git/igapyon-agent-skills/workplace/20260524095030-graphic-recording/graphic-recording-text.md
```

確認方法の例:

```bash
git rev-parse --show-toplevel
git check-ignore -q workplace/<YYYYMMDDHHmmss>-graphic-recording/graphic-recording-text.md
```

`workplace/` が存在しない、または Git 管理外であることを確認できない場合は、勝手にリポジトリ内へ保存しないでください。

その場合は、ファイル保存の代わりに Markdown 本文をそのまま出力し、保存先を指定するには `{{OUTPUT_PATH}}` を渡す必要があることを短く伝えてください。

# 目的

この記事の内容を、

* 図解しやすく
* 構造が見えやすく
* 関係性が伝わりやすく
* グラレコ化しやすい

形へ変換したいです。

単なる要約ではなく、

* 流れ
* 構造
* 対比
* 役割分担
* 入力→処理→出力
* レイヤー構造
* 分類軸

などを整理してください。

---

# 出力方針

以下の特徴を持つグラレコ向けテキストにしてください。

## 1. キーワード中心

長文説明ではなく、短く視認しやすい表現を使う。

例:

* 「入口」
* 「知識本体」
* 「育つ Skill」
* 「RAG 風」
* 「構造を安定」
* 「温度感を安定」

など。

---

## 2. 図解化しやすくする

必要に応じて ASCII 図を使ってください。

例:

```text
ユーザー依頼
  ↓
SKILL.md
  ↓
references
  ↓
回答生成
```

や

```text
templates = 構造
examples  = 温度感
```

のように、関係性を視覚化してください。

---

## 3. グラレコ向けに章立てする

以下のような形式で整理してください。

# 1. ○○とは？

# 2. なぜ重要？

# 3. 典型構成

# 4. 流れ

# 5. 対比

# 6. まとめ

など。

---

## 4. 「対比」を積極的に抽出する

特に以下を見つけて整理してください。

* before / after
* 軽い / 重い
* 小さい / 巨大
* 入口 / 本体
* templates / examples
* コンテンツ型 / 実行型

など。

---

## 5. 「役割分担」を明確にする

たとえば:

| 要素         | 役割   |
| ---------- | ---- |
| SKILL.md   | 入口   |
| references | 知識本体 |
| templates  | 出力構造 |
| examples   | 温度感  |

のように整理する。

---

## 6. 「育つ」「循環する」構造を重視する

静的説明だけでなく、

```text
運用
 ↓
改善
 ↓
更新
 ↓
次回安定
```

のような循環構造も抽出してください。

---

## 7. 出力スタイル

* Markdown形式
* グラレコ制作用
* 箇条書き多め
* 見出し多め
* 余白感ある構造
* 短文中心
* 図解しやすさ優先

---

# 実施手順

1. `{{ARTICLE_PATH}}` の Markdown 記事を読む
2. 記事内容をグラレコ制作用の整理テキストへ変換する
3. `{{OUTPUT_PATH}}` が指定されている場合はそこへ保存する
4. `{{OUTPUT_PATH}}` が未指定で `{{RUN_OUTPUT_DIR}}` が指定されている場合は、`{{RUN_OUTPUT_DIR}}/graphic-recording-text.md` へ保存する
5. どちらも未指定の場合は、Git 管理外であることを確認できた `workplace/<YYYYMMDDHHmmss>-graphic-recording/` 配下へ保存する
6. Git 管理外の保存先を確認できない場合は、ファイル保存せず Markdown 本文を出力する
7. 最後に、保存した場合は保存先パスを短く報告する
