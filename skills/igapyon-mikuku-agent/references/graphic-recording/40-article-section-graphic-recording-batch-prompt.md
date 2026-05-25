# 見出し単位グラレコ画像 バッチ生成プロンプト

次の記事パスで指定された Markdown 記事を読み、`##` 見出しごとに、みくくが説明するグラフィックレコーディング（グラレコ）画像を作るための素材を準備してください。

このプロンプトは、記事分割、セクション整理、画像生成AI用プロンプト作成、`TODO.md` 作成までを担当します。画像生成そのものは [50-generate-section-graphic-recording-images-prompt.md](50-generate-section-graphic-recording-images-prompt.md) で実行します。
本文理解が必要な `section-text.md` は LLM が作成し、`section-text.md` とみくく描画プロンプト本文を合成した `image-prompt.md` は、可能であれば `compose-section-image-prompts.mjs` で作成してください。

記事全体の代表画像生成フェーズの後にこのプロンプトを使う場合は、全体画像の追加バリエーション生成へ戻らないでください。
このプロンプトでは、章ごとの素材作成へ移行し、`TODO.md` と `sections/<NNN>/image-prompt.md` を作ることに集中してください。

重要: セクション処理の開始時に、全対象セクション分の `sections/<NNN>/` ディレクトリと `section-source.md` を先に一括作成してください。
`section-source.md` は、元記事を `##` 見出しごとに分割した読み取りコピーだけを保存します。
1 セクションずつ、ディレクトリ作成、`section-source.md` 作成、`section-text.md` 作成、`image-prompt.md` 作成までをまとめて進める処理順にしないでください。

---

# 入力

記事パス:

```text
{{ARTICLE_PATH}}
```

`{{ARTICLE_PATH}}` は読み取り専用の入力ファイルです。
このプロンプトでは、元記事 Markdown を変更、上書き、追記、整形、校正、画像リンク挿入してはいけません。
セクション切り出し、整理テキスト、画像生成AI用プロンプト、TODO、貼り付け案は、すべて `{{RUN_OUTPUT_DIR}}` 配下の生成物として保存してください。
元記事本文の修正や画像挿入は、ユーザーが明示的に許可した場合だけ別作業として行います。

みくく描画プロンプトのパス:

```text
{{MIKUKU_PROMPT_PATH}}
```

`{{MIKUKU_PROMPT_PATH}}` が未指定の場合は、次を使い、全セクションで同じ描画プロンプトとして使ってください。

```text
/Users/igapyon/Documents/git/igapyon-agent-skills/skills/igapyon-mikuku-agent/assets/mikuku/mikuku-portrait-short-prompt.md
```

---

# 出力先

実行単位の出力ディレクトリ:

```text
{{RUN_OUTPUT_DIR}}
```

`{{RUN_OUTPUT_DIR}}` が未指定の場合は、次の順序で保存先を決めてください。

1. 処理開始時のカレントフォルダを保存先ベースにする
2. カレントフォルダ直下の `workplace/` を候補にする
3. `workplace/` が存在しない場合は作成する
4. カレントフォルダが Git リポジトリ内の場合だけ、`workplace/` が Git 管理外として扱われることを確認する
5. カレントフォルダが Git リポジトリでない場合は、別の場所を探さず、その `workplace/` を使う
6. 現在日時を使って以下の実行ディレクトリを作成する

```text
<処理開始時のカレントフォルダ>/workplace/<YYYYMMDDHHmmss>-section-graphic-recording/
```

カレントフォルダが Git リポジトリ内の場合の確認方法の例:

```bash
git check-ignore -q workplace/<YYYYMMDDHHmmss>-section-graphic-recording/TODO.md
```

カレントフォルダが Git リポジトリ内で、`workplace/` が Git 管理外であることを確認できない場合は、勝手に別の場所へ保存しないでください。
カレントフォルダが Git リポジトリでない場合は、Git 管理外確認を要求せず、カレントフォルダ直下の `workplace/` を作成して使ってください。

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

# セクション初期化フェーズ

`##` 見出しの抽出と対象外セクションの判定が終わったら、最初に全対象セクション分の作業場所を初期化してください。

初期化フェーズで行うこと:

1. `{{RUN_OUTPUT_DIR}}/sections/` を作成する
2. 全対象セクションについて `sections/<NNN>/` を作成する
3. 全対象セクションについて `section-source.md` を保存する
4. `TODO.md` を作成し、全対象セクションを `image-pending` として並べる

可能であれば、初期化フェーズでは次のスクリプトを使ってください。

```bash
node skills/igapyon-mikuku-agent/references/graphic-recording/scripts/split-article-sections.mjs --article "{{ARTICLE_PATH}}" --out "{{RUN_OUTPUT_DIR}}" --mikuku-prompt "{{MIKUKU_PROMPT_PATH}}"
```

このスクリプトは、元記事を変更せず、全対象セクション分の `sections/<NNN>/section-source.md` と `TODO.md` を一括作成します。

初期化フェーズで行わないこと:

- `section-text.md` の作成
- `image-prompt.md` の作成
- 画像生成
- 元記事 Markdown への書き込み

この初期化フェーズは、最初のセクションだけでなく全セクションに対して一括で完了させてください。
以後のセクションごとの処理では、既に存在する `sections/<NNN>/section-source.md` を入力として使います。

再実行時に `TODO.md` が既に存在する場合も、未初期化の対象セクションがあれば、先に不足している `sections/<NNN>/` と `section-source.md` を補完してください。
その後で、`section-text.md` または `image-prompt.md` が不足しているセクションだけを処理してください。

---

# TODO.md

セクション初期化フェーズで、`{{RUN_OUTPUT_DIR}}/TODO.md` を作成してください。

`TODO.md` には、抽出した `##` 見出しをセクション単位で並べます。

形式:

```markdown
# 見出し単位グラレコ画像 TODO

記事: {{ARTICLE_PATH}}
みくく描画プロンプト: {{MIKUKU_PROMPT_PATH}}

## 進行状況

- [ ] 001: テキストファイルとは - image-pending
- [ ] 002: 文字エンコーディングは UTF-8 で - image-pending

## 出力ルール

- 各セクションは `sections/<番号>/` に保存する
- 40番では最初に全セクションの `sections/<番号>/` と `section-source.md` を一括作成する
- 40番では初期化完了後、各セクションで `section-text.md` を作り、`compose-section-image-prompts.mjs` で `image-prompt.md` を作る
- 画像生成は50番で実行し、成功したら TODO を `image-generated` に更新する
- 速度優先運用では50番は `image-generation-report.md` や `copy-generated-image.md` を作らず、画像コピーと `TODO.md` 更新だけで進む
```

再実行時に `TODO.md` が既に存在する場合は、`image-pending`、`image-prompt-missing`、または40番の再作成が必要な項目だけを処理してください。

`image-generated` のセクションは、ユーザーが明示しない限り再生成しないでください。

---

# 出力構成

セクション初期化フェーズで、各 `##` セクションごとに以下のディレクトリを一括作成します。

```text
{{RUN_OUTPUT_DIR}}/sections/<NNN>/
```

例:

```text
{{RUN_OUTPUT_DIR}}/sections/001/
{{RUN_OUTPUT_DIR}}/sections/002/
```

各セクションの主な生成物:

- `section-source.md`: 元記事から切り出した `##` 見出しと本文。初期化フェーズで全セクション分を一括作成します。
- `section-text.md`: グラレコ制作用整理テキスト。初期化フェーズ完了後に作成します。
- `image-prompt.md`: 画像生成AI用プロンプト。初期化フェーズ完了後に作成します。

`graphic-recording.png` は 50番で作成します。40番では生成済みとして扱わないでください。

---

# セクションごとの処理

セクション初期化フェーズが全セクション分完了していることを確認してから、各セクションについて次の順序で処理してください。

まだ全対象セクションの `sections/<NNN>/section-source.md` がそろっていない場合は、`section-text.md` や `image-prompt.md` の作成へ進まず、先に初期化フェーズを完了してください。

## 1. セクション本文を確認する

対象の `##` 見出しと本文は、初期化フェーズで以下へ保存済みである必要があります。

```text
{{RUN_OUTPUT_DIR}}/sections/<NNN>/section-source.md
```

これは元記事からの読み取りコピーです。`section-source.md` の作成時も、元記事側には一切書き込まないでください。
不足している場合は、そのセクションだけを個別処理へ進めず、全対象セクションの `section-source.md` がそろうように初期化フェーズを補完してください。

## 2. グラレコ制作用整理テキストを作る

`section-source.md` を読み、対象セクションだけに基づいて、短文・箇条書き・見出し中心のグラレコ制作用整理テキストを作成します。

保存先:

```text
{{RUN_OUTPUT_DIR}}/sections/<NNN>/section-text.md
```

重視する観点:

- 見出しの主題
- セクション内の重要語
- 手順、対比、注意点
- 入力、処理、出力
- 読者が誤解しやすいポイント
- 図解しやすいキーワード

記事全体の別セクションにある情報を勝手に混ぜないでください。

## 3. セクション専用の画像生成プロンプトを合成する

`section-text.md` と `{{MIKUKU_PROMPT_PATH}}` の本文を入力として、セクション専用の画像生成AI用プロンプトを作成します。
可能であれば、次のスクリプトを使ってください。

```bash
node skills/igapyon-mikuku-agent/references/graphic-recording/scripts/compose-section-image-prompts.mjs --run-dir "{{RUN_OUTPUT_DIR}}" --mikuku-prompt "{{MIKUKU_PROMPT_PATH}}" --section "<NNN>"
```

複数セクション分の `section-text.md` が作成済みの場合は、`--section` を省略して未作成の `image-prompt.md` をまとめて作成してかまいません。

```bash
node skills/igapyon-mikuku-agent/references/graphic-recording/scripts/compose-section-image-prompts.mjs --run-dir "{{RUN_OUTPUT_DIR}}" --mikuku-prompt "{{MIKUKU_PROMPT_PATH}}"
```

このスクリプトは、`section-text.md` の本文、`{{MIKUKU_PROMPT_PATH}}` の本文、同一性維持ルール、横長グラレコ画像の固定方針を合成し、`image-prompt.md` を作成します。
既存の `image-prompt.md` は、`--overwrite` を指定しない限り上書きしません。

保存先:

```text
{{RUN_OUTPUT_DIR}}/sections/<NNN>/image-prompt.md
```

スクリプトを使えない場合だけ、同等の内容を手動で作成してください。
その場合も、`{{MIKUKU_PROMPT_PATH}}` のパスだけで済ませず、本文を `image-prompt.md` に埋め込んでください。
画像内テキストは、`section-text.md` の語句を短く整理し、長文を入れすぎないでください。

## 4. TODO.md を更新する

セクションの `section-source.md`、`section-text.md`、`image-prompt.md` を保存できたら、`TODO.md` の該当行を `image-pending` として残してください。

形式:

```markdown
- [ ] 001: テキストファイルとは - image-pending
```

40番では、画像がまだ生成されていないため `[x]` にしないでください。`[x]` と `image-generated` は50番で画像保存まで確認できた場合だけ使います。

速度優先運用では、50番へ渡すための `{{RUN_OUTPUT_DIR}}/image-generation-queue.md` は作成しなくてもかまいません。
`TODO.md` と `sections/<NNN>/image-prompt.md` があれば、50番は次の `image-pending` セクションを処理できます。

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
