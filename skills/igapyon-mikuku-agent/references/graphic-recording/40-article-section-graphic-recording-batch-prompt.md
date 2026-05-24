# 見出し単位グラレコ画像 バッチ生成プロンプト

次の記事パスで指定された Markdown 記事を読み、`##` 見出しごとに、みくくが説明するグラフィックレコーディング（グラレコ）画像を作るための素材を準備してください。

このプロンプトは、記事分割、セクション整理、画像生成AI用プロンプト作成、`TODO.md` 作成までを担当します。画像生成そのものは [50-generate-section-graphic-recording-images-prompt.md](50-generate-section-graphic-recording-images-prompt.md) で実行します。

---

# 入力

記事パス:

```text
{{ARTICLE_PATH}}
```

みくく画像のパス:

```text
{{MIKUKU_IMAGE_PATH}}
```

`{{MIKUKU_IMAGE_PATH}}` が未指定の場合は、次の候補から 1 つ選び、全セクションで同じ参照画像として使ってください。

- `skills/igapyon-mikuku-agent/assets/mikuku/mikuku01.png`
- `skills/igapyon-mikuku-agent/assets/mikuku/mikuku02.png`
- `skills/igapyon-mikuku-agent/assets/mikuku/mikuku03.png`

---

# 出力先

実行単位の出力ディレクトリ:

```text
{{RUN_OUTPUT_DIR}}
```

`{{RUN_OUTPUT_DIR}}` が未指定の場合は、次の順序で保存先を決めてください。

1. `{{ARTICLE_PATH}}` が属する Git リポジトリのルートを確認する
2. そのルート直下の `workplace/` を候補にする
3. `workplace/` が Git 管理外として扱われることを確認する
4. 確認できた場合のみ、現在日時を使って以下の実行ディレクトリを作成する

```text
<記事が属するGitリポジトリ>/workplace/<YYYYMMDDHHmmss>-section-graphic-recording/
```

確認方法の例:

```bash
git rev-parse --show-toplevel
git check-ignore -q workplace/<YYYYMMDDHHmmss>-section-graphic-recording/TODO.md
```

`workplace/` が存在しない、または Git 管理外であることを確認できない場合は、勝手にリポジトリ内へ保存しないでください。

---

# 対象セクション

記事 Markdown から、レベル 2 見出しである `## ` を抽出してください。

記事先頭に YAML front matter がある場合は、画像生成対象にしないでください。

front matter として扱うもの:

- ファイル先頭の `---` から次の `---` までの YAML front matter
- ファイル先頭の `+++` から次の `+++` までの TOML front matter
- ファイル先頭付近にある掲載先、URL、タイトル、ハッシュタグ、執筆担当などの公開管理用メタデータ

front matter や公開管理用メタデータは、`TODO.md` の画像生成対象セクションに入れないでください。既に抽出済みの再実行で見つけた場合は、`image-skipped: front-matter` として扱い、`image-prompt.md` の作成や画像生成は行わないでください。

各セクションは、次の範囲として扱います。

```text
## 見出し
この見出しの本文
次の ## 見出しの直前まで
```

対象に含めるもの:

- `## ` で始まる見出し
- 見出し直後から次の `## ` 直前までの本文
- セクション内の `###` 以下の小見出し、箇条書き、表、コードブロック

対象に含めないもの:

- 記事タイトルなどの `# ` 見出し
- 前書きとして `##` より前にある本文
- front matter または公開管理用メタデータだけの `##` セクション
- 次の `##` 以降の別セクション本文

記事の構造上、前書きも画像化したい場合は、`00-introduction` として扱ってよいかユーザーに確認してください。

本文中で front matter そのものを解説している通常の本文セクションは、公開管理用メタデータではないため対象に含めてかまいません。たとえば `## front matter とは` のような解説セクションは、記事本文として扱ってください。

---

# TODO.md

最初に、`{{RUN_OUTPUT_DIR}}/TODO.md` を作成してください。

`TODO.md` には、抽出した `##` 見出しをセクション単位で並べます。

形式:

```markdown
# 見出し単位グラレコ画像 TODO

記事: {{ARTICLE_PATH}}
みくく画像: {{MIKUKU_IMAGE_PATH}}

## 進行状況

- [ ] 001: テキストファイルとは - image-pending
- [ ] 002: 文字エンコーディングは UTF-8 で - image-pending

## 出力ルール

- 各セクションは `sections/<番号>-<slug>/` に保存する
- 40番では各セクションで `section-source.md`、`section-text.md`、`image-prompt.md` を作る
- 画像生成は50番で実行し、成功したら TODO を `image-generated` に更新する
```

再実行時に `TODO.md` が既に存在する場合は、`image-pending`、`image-prompt-missing`、または40番の再作成が必要な項目だけを処理してください。

`image-generated` のセクションは、ユーザーが明示しない限り再生成しないでください。

---

# 出力構成

各 `##` セクションごとに、以下のディレクトリを作成します。

```text
{{RUN_OUTPUT_DIR}}/sections/<NNN>-<slug>/
```

例:

```text
{{RUN_OUTPUT_DIR}}/sections/001-text-file/
{{RUN_OUTPUT_DIR}}/sections/002-utf-8-encoding/
```

各セクションの主な生成物:

- `section-source.md`: 元記事から切り出した `##` 見出しと本文
- `section-text.md`: グラレコ制作用整理テキスト
- `image-prompt.md`: 画像生成AI用プロンプト

`graphic-recording.png` は 50番で作成します。40番では生成済みとして扱わないでください。

---

# セクションごとの処理

各セクションについて、次の順序で処理してください。

## 1. セクション本文を保存する

対象の `##` 見出しと本文を、そのまま以下へ保存します。

```text
{{RUN_OUTPUT_DIR}}/sections/<NNN>-<slug>/section-source.md
```

## 2. グラレコ制作用整理テキストを作る

`section-source.md` を読み、対象セクションだけに基づいて、短文・箇条書き・見出し中心のグラレコ制作用整理テキストを作成します。

保存先:

```text
{{RUN_OUTPUT_DIR}}/sections/<NNN>-<slug>/section-text.md
```

重視する観点:

- 見出しの主題
- セクション内の重要語
- 手順、対比、注意点
- 入力、処理、出力
- 読者が誤解しやすいポイント
- 図解しやすいキーワード

記事全体の別セクションにある情報を勝手に混ぜないでください。

## 3. セクション専用の画像生成プロンプトを作る

`section-text.md` と `{{MIKUKU_IMAGE_PATH}}` を入力として、セクション専用の画像生成AI用プロンプトを作成します。

保存先:

```text
{{RUN_OUTPUT_DIR}}/sections/<NNN>-<slug>/image-prompt.md
```

プロンプトには、以下を含めてください。

- みくくがその `##` セクションを説明している構図
- セクション見出しを主題にした横長ポスター構図
- 手描きグラレコ風
- ホワイトボード解説風
- 図解、矢印、囲み、アイコン
- セクション本文に基づく重要語
- みくくの吹き出し
- 参照画像として使う `{{MIKUKU_IMAGE_PATH}}`
- 画像生成時に、各セクションごとに `{{MIKUKU_IMAGE_PATH}}` を参照画像として読み込み直す指示
- 画像内テキストとして使う短い正確表記
- 画像内に長文を入れすぎない方針

`TODO.md` の `みくく画像:` 行は、参照画像パスの記録です。
画像生成ツールへ参照画像が自動で引き継がれることは前提にしないでください。
各 `image-prompt.md` には、タイトルごとの画像生成時に `{{MIKUKU_IMAGE_PATH}}` を添付、指定、またはロードしてから生成することを明記してください。

画像内テキストは、本文の長い見出しや文章をそのまま入れず、短いラベルへ整理してください。

推奨形式:

```markdown
## 画像内テキスト 正確表記

- セクション見出しを短くした表記
- 重要キーワード 1
- 重要キーワード 2
- みくくの短い吹き出し

## 画像内テキスト方針

- 長文は避ける
- 重要語は短く区切る
- 日本語ラベルは少数に絞る
- 画像生成時に文字が崩れても、原文本文は変更しない
```

## 4. TODO.md を更新する

セクションの `section-source.md`、`section-text.md`、`image-prompt.md` を保存できたら、`TODO.md` の該当行を `image-pending` として残してください。

形式:

```markdown
- [ ] 001: テキストファイルとは - image-pending
```

40番では、画像がまだ生成されていないため `[x]` にしないでください。`[x]` と `image-generated` は50番で画像保存まで確認できた場合だけ使います。

必要に応じて、50番へ渡すための `{{RUN_OUTPUT_DIR}}/image-generation-queue.md` を作成してください。

---

# 画像デザイン方針

全セクションで、見た目の方向性を揃えてください。

- みくくが説明する
- 技術記事の 1 セクションをやさしく図解する
- 横長ポスター構図
- 手描きノート風
- ホワイトボード解説風
- 可愛い技術解説ポスター
- 日本語の見出しや短いキーワードが読めそうな構成
- 情報量は多すぎず、1 セクションの主題に絞る

避けたいもの:

- 記事全体を無理に 1 枚へ詰め込む
- 別セクションの内容を混ぜる
- 文字量が多すぎて読めない構図
- 暗い色味
- 写実寄り
- 無機質な企業プレゼン風

---

# 最終報告

処理後、短く報告してください。

- 実行単位の出力ディレクトリ
- `TODO.md` のパス
- 処理済みセクション数
- 未処理セクション数
- 画像生成が未実行の場合は、その理由と `image-prompt.md` の場所

画像が生成できていない場合は、生成済みであるかのように報告しないでください。
