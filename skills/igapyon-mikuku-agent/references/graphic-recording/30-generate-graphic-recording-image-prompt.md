# グラレコ説明画像 生成実行プロンプト

次の画像生成AI用プロンプトを使って、グラフィックレコーディング（グラレコ）風の説明画像を生成してください。

画像生成AI用プロンプトには、すでにみくく描画プロンプト本文が含まれている前提です。

---

# 入力

画像生成AI用プロンプトのパス:

```text
{{IMAGE_PROMPT_PATH}}
```

みくく描画プロンプトのパス:

```text
{{MIKUKU_PROMPT_PATH}}
```

このプロンプトは画像生成と生成画像の保存だけを担当します。
元記事 Markdown、グラレコ制作用テキスト、画像生成AI用プロンプトを、画像生成結果に合わせて変更してはいけません。
記事への画像リンク挿入、alt text 追記、本文調整が必要な場合も、元記事へ直接書き込まず、`{{RUN_OUTPUT_DIR}}` 配下に別ファイルで提案してください。

---

# 出力先

画像出力パス:

```text
{{IMAGE_OUTPUT_PATH}}
```

実行単位の出力ディレクトリ:

```text
{{RUN_OUTPUT_DIR}}
```

`{{IMAGE_OUTPUT_PATH}}` が未指定で、`{{RUN_OUTPUT_DIR}}` が指定されている場合は、次のパスへ保存してください。

```text
{{RUN_OUTPUT_DIR}}/graphic-recording.png
```

コピー手順記録パス:

```text
{{RUN_OUTPUT_DIR}}/copy-generated-image.md
```

`{{IMAGE_OUTPUT_PATH}}` と `{{RUN_OUTPUT_DIR}}` がどちらも未指定の場合は、次の順序で保存先を決めてください。

1. 処理開始時のカレントフォルダを保存先ベースにする
2. カレントフォルダ直下の `workplace/` を候補にする
3. `workplace/` が存在しない場合は作成する
4. カレントフォルダが Git リポジトリ内の場合だけ、`workplace/` が Git 管理外として扱われることを確認する
5. カレントフォルダが Git リポジトリでない場合は、別の場所を探さず、その `workplace/` を使う
6. 現在日時を使って以下の実行ディレクトリを作成する

```text
<処理開始時のカレントフォルダ>/workplace/<YYYYMMDDHHmmss>-graphic-recording/
```

7. その下に以下のファイル名で保存する

```text
graphic-recording.png
```

保存先例:

```text
/Users/igapyon/Documents/git/igapyon-agent-skills/workplace/20260524095030-graphic-recording/graphic-recording.png
```

カレントフォルダが Git リポジトリ内の場合の確認方法の例:

```bash
git check-ignore -q workplace/<YYYYMMDDHHmmss>-graphic-recording/graphic-recording.png
```

カレントフォルダが Git リポジトリ内で、`workplace/` が Git 管理外であることを確認できない場合は、勝手に別の場所へ保存しないでください。
カレントフォルダが Git リポジトリでない場合は、Git 管理外確認を要求せず、カレントフォルダ直下の `workplace/` を作成して使ってください。

---

# 記事全体画像のバリエーション上限

このプロンプトで生成する記事全体画像は、章ごとの画像生成へ進む前の代表画像フェーズです。

記事全体画像のバリエーション生成は、ユーザーが明示的に追加再生成を依頼しない限り、最大 3 枚までにしてください。
1-3 枚の候補を生成したら、その時点で最も適した 1 枚を代表画像として採用し、追加の全体画像バリエーション生成を続けないでください。

採用画像は原則として次に保存してください。

```text
{{RUN_OUTPUT_DIR}}/graphic-recording.png
```

複数候補を保存する場合は、次のように候補番号つきのファイル名を使ってください。

```text
{{RUN_OUTPUT_DIR}}/graphic-recording-variant-01.png
{{RUN_OUTPUT_DIR}}/graphic-recording-variant-02.png
{{RUN_OUTPUT_DIR}}/graphic-recording-variant-03.png
```

代表画像を採用したら、`image-generation-report.md` に候補数、採用画像、未採用理由、次工程を記録してください。
次工程は、セクション用素材が未作成なら `40-article-section-graphic-recording-batch-prompt.md`、素材作成済みなら `50-generate-section-graphic-recording-images-prompt.md` です。

同一性崩れ、重大な破綻、保存失敗などで候補として使えない画像は失敗として記録してよいですが、その場合も無制限に再生成せず、最大 3 回を目安に一度停止し、未解決点を報告してください。

---

# 実施内容

1. `{{IMAGE_PROMPT_PATH}}` の Markdown ファイルを読む
2. `{{MIKUKU_PROMPT_PATH}}` の Markdown ファイルが存在することを確認する
3. `{{IMAGE_PROMPT_PATH}}` の本文に、みくく描画プロンプト本文または意味を保った短縮本文が含まれていることを確認する
4. 画像生成ツールがテキストプロンプトを受け取れることを確認する
5. 既に記事全体画像の候補が何枚生成済みか確認する
6. 候補が 3 枚以上ある場合は追加生成せず、代表画像の採用または次工程への移行を報告する
7. 画像生成AI用プロンプト本文を画像生成ツールへ渡す
8. 横長ポスター構図のグラレコ説明画像を生成する
9. 生成画像の元ファイルパスを特定する
10. `copy-generated-image.md` を作成し、元画像パス、コピー先、実行するコピーコマンド、確認コマンドを記録する
11. 生成画像を `{{IMAGE_OUTPUT_PATH}}`、`{{RUN_OUTPUT_DIR}}/graphic-recording.png`、または処理開始時のカレントフォルダ直下の `workplace/<YYYYMMDDHHmmss>-graphic-recording/graphic-recording.png` へコピーまたは保存する
12. コピー先の存在、ファイルサイズ、画像形式を確認し、`copy-generated-image.md` を結果付きで更新する
13. `image-generation-report.md` に元画像パス、みくく描画プロンプトパス、コピー手順記録パス、ワークスペース側の保存先、候補数、採用画像、次工程、または未実行理由を記録する
14. 代表画像を採用できた場合は、追加の全体画像バリエーション生成を続けず、章ごとの画像生成へ進む
15. 最後に、生成画像の保存先、または未生成の理由と次工程を短く報告する

`{{MIKUKU_PROMPT_PATH}}` はパス文字列としてプロンプト内に書くだけでなく、事前に本文を `{{IMAGE_PROMPT_PATH}}` へ埋め込んでください。
別の生成実行で使った描画プロンプトが今回の生成へ暗黙に引き継がれるとは扱わないでください。

画像生成AI用プロンプト本文に持ち物の制約が明記されていない場合は、画像生成ツールへ渡す直前に次の補助制約を追加してください。
既存プロンプトに、みくくが物を持つ指示が残っている場合も、次の補助制約を優先してください。

```text
Do not let Mikuku hold any objects.
```

組み込み `imagegen` が `prompt` しか受け取れない環境でも、`{{IMAGE_PROMPT_PATH}}` にみくく描画プロンプト本文が含まれていれば生成を実行できます。

組み込み `imagegen` の生成画像は通常 `$CODEX_HOME/generated_images/...` 配下へ保存されます。プロジェクトで使う画像は、生成後に上記の出力先へコピーしてください。元画像は削除しないでください。

## コピー手順記録

画像生成後は、コピーを実行する前に `{{RUN_OUTPUT_DIR}}/copy-generated-image.md` を作成してください。

`copy-generated-image.md` には、少なくとも次を記録してください。

````markdown
# Copy Generated Image

- status: pending | copied | failed | skipped
- generated-source-path:
- workspace-output-path:
- source-exists: yes | no
- workspace-output-exists: yes | no
- workspace-output-size:
- workspace-output-file-type:

## Copy Command

```bash
cp "<generated-source-path>" "<workspace-output-path>"
```

## Verify Commands

```bash
ls -lh "<workspace-output-path>"
file "<workspace-output-path>"
```

## Notes
````

コピー後は `status: copied`、`workspace-output-exists: yes`、ファイルサイズ、画像形式を更新してください。

生成画像の元パスを特定できない場合は、コピーを実行せず、`status: failed` または `status: skipped` として理由を `Notes` に記録してください。この場合、`graphic-recording.png` を生成済みとして報告しないでください。

---

# 描画プロンプト本文の判定

画像生成を始める前に、現在使える画像生成ツールの入力仕様を確認してください。

描画プロンプト本文を使えている例:

- `{{MIKUKU_PROMPT_PATH}}` の本文を読んでいる
- `{{IMAGE_PROMPT_PATH}}` の本文に、みくく描画プロンプト本文または意味を保った短縮本文が含まれている
- 画像生成ツールへ `{{IMAGE_PROMPT_PATH}}` の本文を渡せる

描画プロンプト本文を使えていない例:

- `{{MIKUKU_PROMPT_PATH}}` のパスだけを書いている
- みくく描画プロンプト本文を読んでいない
- 以前の会話や別実行で使ったキャラクター指定が暗黙に引き継がれることを期待している

描画プロンプト本文が `{{IMAGE_PROMPT_PATH}}` に含まれていない場合は、通常の画像生成を実行しないでください。`image-generation-report.md` に `character-prompt-embedded: no` と記録し、`graphic-recording.png` は生成済みとして報告しないでください。

---

# 画像生成ツールが使える場合

利用可能な画像生成ツールがあり、かつ `{{IMAGE_PROMPT_PATH}}` にみくく描画プロンプト本文が含まれている場合は、このプロンプトで画像生成まで実行してください。

生成時は、必ず次を入力として使います。

- みくく描画プロンプト本文を含む画像生成AI用プロンプト本文

出力先を直接指定できない画像生成ツールでも、生成後に画像ファイルを出力先へコピーできる場合は生成済みとして扱ってよいです。

ただし、最終的な成功条件は、ワークスペース側の `graphic-recording.png` が存在し、0 バイトではなく、`copy-generated-image.md` と `image-generation-report.md` に元画像パスとコピー先が記録されていることです。

---

# 画像生成ツールが使えない場合

現在の実行環境で画像生成ツールを使えない場合、または `{{IMAGE_PROMPT_PATH}}` にみくく描画プロンプト本文が含まれていない場合は、画像生成は実行せず、次を短く報告してください。

- 画像生成AI用プロンプトのパス
- みくく描画プロンプトのパス
- 手動で画像生成AIへ渡す必要があること
- 推奨する画像出力パス
- 未実行の理由

この場合も、画像が生成済みであるかのように報告しないでください。
