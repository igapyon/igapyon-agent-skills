# グラレコ説明画像 生成AIプロンプト

次の入力パスで指定されたグラレコ制作用テキストを読み、
指定された「みくく」描画プロンプトファイルを読み、技術記事の内容をグラフィックレコーディング（グラレコ）風にまとめた大きな説明ポスター画像の生成AIプロンプトを作成してください。

作成した画像生成AI用プロンプトは、指定された出力パスへ Markdown ファイルとして保存してください。

---

# 入力

グラレコ制作用テキストのパス:

```text
{{GRAPHIC_RECORDING_TEXT_PATH}}
```

みくく描画プロンプトのパス:

```text
{{MIKUKU_PROMPT_PATH}}
```

`{{MIKUKU_PROMPT_PATH}}` の Markdown 本文を読み、キャラクター外観の正本描画プロンプトとして扱ってください。
画像生成AI用プロンプトには、このパスだけでなく、描画プロンプト本文そのものを含めてください。

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
{{RUN_OUTPUT_DIR}}/image-prompt.md
```

`{{OUTPUT_PATH}}` と `{{RUN_OUTPUT_DIR}}` がどちらも未指定の場合は、次の順序で保存先を決めてください。

1. `{{GRAPHIC_RECORDING_TEXT_PATH}}` が属する Git リポジトリのルートを確認する
2. そのルート直下の `workplace/` を候補にする
3. `workplace/` が Git 管理外として扱われることを確認する
4. 確認できた場合のみ、現在日時を使って以下の実行ディレクトリを作成する

```text
<入力ファイルが属するGitリポジトリ>/workplace/<YYYYMMDDHHmmss>-graphic-recording/
```

5. その下に以下のファイル名で保存する

```text
image-prompt.md
```

保存先例:

```text
/Users/igapyon/Documents/git/igapyon-agent-skills/workplace/20260524095030-graphic-recording/image-prompt.md
```

確認方法の例:

```bash
git rev-parse --show-toplevel
git check-ignore -q workplace/<YYYYMMDDHHmmss>-graphic-recording/image-prompt.md
```

`workplace/` が存在しない、または Git 管理外であることを確認できない場合は、勝手にリポジトリ内へ保存しないでください。

その場合は、ファイル保存の代わりに画像生成AI用プロンプト本文をそのまま出力し、保存先を指定するには `{{OUTPUT_PATH}}` を渡す必要があることを短く伝えてください。

# 全体コンセプト

* 「みくく」が技術記事をやさしく説明している
* 技術内容を手描きグラレコ風に整理
* ポスター・講義ノート・ホワイトボード解説風
* 可愛く、わかりやすく、情報量は多め
* 見るだけで記事全体像が伝わる構成

---

# レイアウト

## 画面構成

* 横長ポスター構図
* 左〜中央: グラレコ本体
* 右側: みくくが説明している

## キャラクター

* `{{MIKUKU_PROMPT_PATH}}` の本文をベースにする
* 画像生成AI用プロンプト内に `{{MIKUKU_PROMPT_PATH}}` の本文を含める
* パスだけを書いて済ませない
* 同じキャラクター `Mikuku` / `みくく` として扱う
* キャラクターを再設計しない
* 顔の輪郭、髪型、髪色、目の描き方、ツインテール、髪留め、全体の性格印象を維持する
* 変更してよいのは、場面、ポーズ、表情、構図、持ち物、説明している内容だけ
* 顔の向きと視線方向は、記事内容やグラレコ内の説明対象に合わせて生成前に変更してよい
* 例: 右側のみくくが左側の図解を見る、中央の見出しを見上げる、吹き出し側へ視線を向ける
* `same character`, `do not redesign`, `preserve character identity`, `canonical character reference` の意図を明確に含める
* ツインテール
* やわらかい茶髪
* 少し困り顔
* 優しい表情
* アニメ調
* 手にペンやポインターを持つ
* グラレコを指し示して説明している

---

# グラレコ部分

## スタイル

* 手描きノート風
* Graphic Recording 風
* ホワイトボード解説風
* やわらかい線
* 手書き文字風
* 図解・矢印・囲み・アイコン多め

## 色味

* 暖色系
* ベージュ紙風背景
* やさしいブラウン
* パステル調
* 黒一色ではなく柔らかい色線

---

# 含める内容

入力ファイルの内容を読み、主要な概念・構造・対比・流れ・循環を図解・ボックス・矢印で整理する。

特に、入力ファイルに含まれる以下を反映する。

* 大テーマ
* 主要概念
* 入口と本体
* 対比関係
* 処理の流れ
* 更新サイクル
* 役割分担
* 図解しやすいキーワード

---

# デザイン要素

* 小さなアイコン
* 本
* Markdown記号
* フォルダ
* メモ
* 本棚
* 矢印
* 吹き出し
* 小さな植物
* 小さなマスコット

---

# 吹き出し

みくくが説明している吹き出しを入れる。

例:

「あ、あの…全体像はこんな感じです…！」

「少しずつ育てていくのがポイントなのです…！」

「templates は構造、examples は温度感なのです…！」

「小さな SKILL.md から始められます…！」

---

# 描画品質

* 高精細
* 情報量多め
* 読めそうな図解
* ノート感
* 手描き感
* 可愛い技術解説ポスター
* 日本のアニメ風
* Graphic Recording illustration
* educational infographic poster
* cozy hand-drawn tech explainer style

---

# 避けたいもの

* 無機質な企業プレゼン風
* フラットすぎるUI
* 文字が極端に少ない
* SF感が強すぎる
* 暗すぎる色味
* 写実寄り

---

# 実施手順

1. `{{GRAPHIC_RECORDING_TEXT_PATH}}` の Markdown ファイルを読む
2. `{{MIKUKU_PROMPT_PATH}}` の Markdown ファイルを読む
3. グラレコ制作用テキストとみくく描画プロンプト本文をもとに、画像生成AIへ渡せる最終プロンプトを作成する
4. `{{OUTPUT_PATH}}` が指定されている場合はそこへ保存する
5. `{{OUTPUT_PATH}}` が未指定で `{{RUN_OUTPUT_DIR}}` が指定されている場合は、`{{RUN_OUTPUT_DIR}}/image-prompt.md` へ保存する
6. どちらも未指定の場合は、Git 管理外であることを確認できた `workplace/<YYYYMMDDHHmmss>-graphic-recording/` 配下へ保存する
7. Git 管理外の保存先を確認できない場合は、ファイル保存せず画像生成AI用プロンプト本文を出力する
8. 最後に、保存した場合は保存先パスを短く報告する
