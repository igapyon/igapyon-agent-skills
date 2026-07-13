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

カレントフォルダが Git リポジトリ内の場合の確認方法の例:

```bash
git check-ignore -q workplace/<YYYYMMDDHHmmss>-graphic-recording/graphic-recording.png
```

カレントフォルダが Git リポジトリ内で、`workplace/` が Git 管理外であることを確認できない場合は、勝手に別の場所へ保存しないでください。
カレントフォルダが Git リポジトリでない場合は、Git 管理外確認を要求せず、カレントフォルダ直下の `workplace/` を作成して使ってください。

---

# 記事全体画像のバリエーション上限

このプロンプトで生成する記事全体画像は、`whole-article` では最終成果物です。明示的な `whole-article-then-sections` では、章ごとの画像生成へ進む前の代表画像フェーズとして扱います。

既定では候補を 1 枚だけ生成してください。ユーザーが追加候補またはバリエーションを明示的に求めた場合だけ候補を増やし、合計 3 枚を上限にしてください。
候補を生成したら、その時点で最も適した 1 枚を代表画像として採用し、明示されていない追加バリエーションを生成しないでください。

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
`whole-article` の次工程は `report` です。ユーザーが章ごとの画像も明示した `whole-article-then-sections` の場合だけ、セクション用素材が未作成なら `40-article-section-graphic-recording-batch-prompt.md`、素材作成済みなら `50-generate-section-graphic-recording-images-prompt.md` へ進みます。

同一性崩れ、重大な破綻、保存失敗などで候補として使えない画像は失敗として記録してよいですが、その場合も無制限に再生成せず、初回を含む最大 3 回で一度停止し、未解決点を報告してください。

---

# 実施内容

1. `{{IMAGE_PROMPT_PATH}}` の Markdown ファイルを読む
2. `{{MIKUKU_PROMPT_PATH}}` の Markdown ファイルが存在することを確認する
3. `{{IMAGE_PROMPT_PATH}}` の本文に、みくく描画プロンプト本文または意味を保った短縮本文が含まれていることを確認する
4. 画像生成ツールがテキストプロンプトを受け取れることを確認する
5. 既に記事全体画像の候補が何枚生成済みか確認する
6. 候補が 1 枚以上あり、ユーザーが追加候補を明示していない場合は追加生成しない。追加候補が明示されていても、候補が 3 枚以上なら追加生成しない
7. セッション JSONL 復元を使う可能性がある場合は、画像生成の直前にセッション JSONL の現在の最終行番号を `SESSION_AFTER_LINE` として記録する
8. 画像生成AI用プロンプト本文を画像生成ツールへ渡す
9. 横長ポスター構図のグラレコ説明画像を生成する
10. 現在の画像生成ツール呼び出しが返した正確な元ファイルパスを使う。生成画像ディレクトリ全体から最新 PNG を探索してはいけない
11. 今回の生成画像パスが返らなかった場合だけ、手順 7 の行番号より後のセッションイベントから復元する
12. `copy-generated-image.md` を作成し、元画像パスまたはセッション復元情報、コピー先、実行するコピーコマンド、確認コマンドを記録する
13. 生成画像を `{{IMAGE_OUTPUT_PATH}}`、`{{RUN_OUTPUT_DIR}}/graphic-recording.png`、または処理開始時のカレントフォルダ直下の `workplace/<YYYYMMDDHHmmss>-graphic-recording/graphic-recording.png` へコピーまたは保存する
14. コピー先の存在、ファイルサイズ、画像形式を確認し、`copy-generated-image.md` を結果付きで更新する
15. `image-generation-report.md` に元画像パスまたはセッション復元情報、みくく描画プロンプトパス、コピー手順記録パス、ワークスペース側の保存先、候補数、採用画像、次工程、または未実行理由を記録する
16. 代表画像を採用できた場合は、追加の全体画像バリエーション生成を続けない。`whole-article-then-sections` が明示された場合だけ章ごとの画像生成へ進み、それ以外は報告へ進む
17. 最後に、生成画像の保存先、または未生成の理由と次工程を短く報告する

`{{MIKUKU_PROMPT_PATH}}` はパス文字列としてプロンプト内に書くだけでなく、事前に本文を `{{IMAGE_PROMPT_PATH}}` へ埋め込んでください。
別の生成実行で使った描画プロンプトが今回の生成へ暗黙に引き継がれるとは扱わないでください。

画像生成AI用プロンプト本文に持ち物の制約が明記されていない場合は、画像生成ツールへ渡す直前に次の補助制約を追加してください。
既存プロンプトに、みくくが物を持つ指示が残っている場合も、次の補助制約を優先してください。

```text
Do not let Mikuku hold any objects.
```

組み込み `imagegen` が `prompt` しか受け取れない環境でも、`{{IMAGE_PROMPT_PATH}}` にみくく描画プロンプト本文が含まれていれば生成を実行できます。

組み込み `imagegen` の生成画像は通常 `$CODEX_HOME/generated_images/...` 配下へ保存されます。プロジェクトで使う画像は、現在の `imagegen` 呼び出しが返した正確な保存先から上記の出力先へコピーしてください。元画像は削除しないでください。
`find`、更新日時順の並べ替え、ディレクトリ全体の「最新 PNG」などで元画像を推測してはいけません。

ただし、環境や Codex のバージョンによっては、生成画像が `$CODEX_HOME/generated_images/...` に新規 PNG として保存されず、Codex セッション JSONL の `image_generation_end.payload.result` に PNG の base64 として記録される場合があります。
`$CODEX_HOME/generated_images/...` に今回生成分の PNG を特定できない場合は、生成失敗として扱う前に、次のフォールバックを試してください。

1. 画像生成前に現在の Codex セッション JSONL を特定する
2. 画像生成の直前に、その JSONL の現在の最終行番号を `SESSION_AFTER_LINE` として記録する
3. 画像生成を 1 回実行する
4. 今回の生成画像パスが返らなかった場合だけ、`SESSION_AFTER_LINE` より後の `image_generation_end.payload.result` を復元候補にする
5. `payload.result` を base64 decode して `{{RUN_OUTPUT_DIR}}/graphic-recording.png` へ保存する
6. `file` とファイルサイズで PNG として復元できたことを確認する
7. `copy-generated-image.md` と `image-generation-report.md` には、元画像パスの代わりに `session-jsonl`、`session-after-line`、`event-type: image_generation_end`、採用したイベント行番号、復元先を記録する

生成前の基準行より前にあるイベントは、内容や更新日時にかかわらず今回の生成結果として使ってはいけません。

復元コマンド例:

```bash
SESSION_AFTER_LINE=$(awk 'END { print NR }' "$SESSION_JSONL")
# この行番号を記録した直後に、現在の記事全体用 imagegen を 1 回実行する

node "{{SKILL_DIR}}/references/graphic-recording/scripts/restore-generated-image-from-session.mjs" \
  --session-jsonl "$SESSION_JSONL" \
  --after-line "$SESSION_AFTER_LINE" \
  --out "{{RUN_OUTPUT_DIR}}/graphic-recording.png"

file "{{RUN_OUTPUT_DIR}}/graphic-recording.png"
ls -lh "{{RUN_OUTPUT_DIR}}/graphic-recording.png"
```

## コピー手順記録

画像生成後は、コピーを実行する前に `{{RUN_OUTPUT_DIR}}/copy-generated-image.md` を作成してください。

`copy-generated-image.md` には、少なくとも次を記録してください。

````markdown
# Copy Generated Image

- status: pending | copied | failed | skipped
- generated-source-path:
- generated-source-kind: file | session-jsonl
- session-jsonl:
- session-after-line:
- session-event-type:
- session-event-line:
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

生成画像の元パスを特定できない場合でも、セッション JSONL から正常な PNG を復元できた場合は生成済みとして扱ってよいです。
ファイル元パスもセッション JSONL 復元もどちらも使えない場合は、コピーを実行せず、`status: failed` または `status: skipped` として理由を `Notes` に記録してください。この場合、`graphic-recording.png` を生成済みとして報告しないでください。

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
