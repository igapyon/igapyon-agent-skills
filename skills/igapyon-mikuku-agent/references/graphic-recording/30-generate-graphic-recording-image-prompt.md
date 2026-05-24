# グラレコ説明画像 生成実行プロンプト

次の画像生成AI用プロンプトと、みくく参照画像を使って、グラフィックレコーディング（グラレコ）風の説明画像を生成してください。

---

# 入力

画像生成AI用プロンプトのパス:

```text
{{IMAGE_PROMPT_PATH}}
```

みくく画像のパス:

```text
{{MIKUKU_IMAGE_PATH}}
```

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

`{{IMAGE_OUTPUT_PATH}}` と `{{RUN_OUTPUT_DIR}}` がどちらも未指定の場合は、次の順序で保存先を決めてください。

1. `{{IMAGE_PROMPT_PATH}}` が属する Git リポジトリのルートを確認する
2. そのルート直下の `workplace/` を候補にする
3. `workplace/` が Git 管理外として扱われることを確認する
4. 確認できた場合のみ、現在日時を使って以下の実行ディレクトリを作成する

```text
<入力ファイルが属するGitリポジトリ>/workplace/<YYYYMMDDHHmmss>-graphic-recording/
```

5. その下に以下のファイル名で保存する

```text
graphic-recording.png
```

保存先例:

```text
/Users/igapyon/Documents/git/igapyon-agent-skills/workplace/20260524095030-graphic-recording/graphic-recording.png
```

確認方法の例:

```bash
git rev-parse --show-toplevel
git check-ignore -q workplace/<YYYYMMDDHHmmss>-graphic-recording/graphic-recording.png
```

`workplace/` が存在しない、または Git 管理外であることを確認できない場合は、勝手にリポジトリ内へ保存しないでください。

---

# 実施内容

1. `{{IMAGE_PROMPT_PATH}}` の Markdown ファイルを読む
2. `{{MIKUKU_IMAGE_PATH}}` の画像が存在することを確認する
3. `{{MIKUKU_IMAGE_PATH}}` の画像を、この生成実行用の参照画像としてロード、添付、または指定する
4. 画像生成AI用プロンプト本文を画像生成ツールへ渡す
5. 参照画像として `{{MIKUKU_IMAGE_PATH}}` を添付または指定する
6. 横長ポスター構図のグラレコ説明画像を生成する
7. 生成画像を `{{IMAGE_OUTPUT_PATH}}`、`{{RUN_OUTPUT_DIR}}/graphic-recording.png`、または Git 管理外であることを確認できた `workplace/<YYYYMMDDHHmmss>-graphic-recording/graphic-recording.png` へコピーまたは保存する
8. `image-generation-report.md` に元画像パス、みくく参照画像パス、ワークスペース側の保存先を記録する
9. 最後に、生成画像の保存先を短く報告する

`{{MIKUKU_IMAGE_PATH}}` はパス文字列としてプロンプト内に書くだけでなく、画像生成ツールが対応している場合は実際の参照画像入力として渡してください。
別の生成実行でロード済みの参照画像が今回の生成へ引き継がれるとは扱わないでください。

組み込み `imagegen` を使う場合、生成画像は通常 `$CODEX_HOME/generated_images/...` 配下へ保存されます。プロジェクトで使う画像は、生成後に上記の出力先へコピーしてください。元画像は削除しないでください。

---

# 画像生成ツールが使える場合

利用可能な画像生成ツールがある場合は、このプロンプトで画像生成まで実行してください。

生成時は、必ず次を入力として使います。

- 画像生成AI用プロンプト本文
- みくく参照画像 `{{MIKUKU_IMAGE_PATH}}`

出力先を直接指定できない画像生成ツールでも、生成後に画像ファイルを出力先へコピーできる場合は生成済みとして扱ってよいです。

---

# 画像生成ツールが使えない場合

現在の実行環境で画像生成ツールを使えない場合は、画像生成は実行せず、次を短く報告してください。

- 画像生成AI用プロンプトのパス
- みくく参照画像のパス
- 手動で画像生成AIへ渡す必要があること
- 推奨する画像出力パス

この場合も、画像が生成済みであるかのように報告しないでください。
