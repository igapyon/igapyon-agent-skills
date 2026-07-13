# 見出し単位グラレコ画像 生成実行プロンプト

`40-article-section-graphic-recording-batch-prompt.md` が作成した実行ディレクトリを読み、各 `##` セクション用の `image-prompt.md` とみくく描画プロンプトを使って、セクションごとのグラフィックレコーディング（グラレコ）画像を生成してください。

このプロンプトは、画像生成だけを担当します。記事分割、セクション本文作成、画像生成AI用プロンプト作成は `40-article-section-graphic-recording-batch-prompt.md` の担当です。

このプロンプトでは、元記事 Markdown、`section-source.md`、`section-text.md`、`image-prompt.md` を変更してはいけません。
このプロンプトでは、`sections/<NNN>/` ディレクトリ、`section-source.md`、`section-text.md`、`image-prompt.md` を新規作成してはいけません。
不足がある場合は50番で補完せず、40番へ戻って、全対象セクション分の初期化と素材作成を完了してください。
画像生成結果に合わせて本文やプロンプトを直す必要がある場合は、生成済みファイルを直接書き換えず、`TODO.md` に再生成状態を記録し、必要な調整案を別ファイルへ保存してください。
元記事への画像リンク挿入や本文修正は、ユーザーが明示的に許可した場合だけ別作業として行います。

速度優先運用では、画像生成後に `copy-section-image.mjs` で対象セクションへ `graphic-recording.png` をコピーし、同スクリプトの自動 PNG 検証と `TODO.md` 更新に成功したらすぐ次へ進んでください。
`image-generation-report.md`、`copy-generated-image.md`、`run-state.md`、`ls -lh`、`file`、目視確認は各セクションごとに実行しません。
目視確認を省略しても、0 バイト確認と PNG シグネチャ確認を行う `copy-section-image.mjs` の自動検証は省略してはいけません。
必要になった場合だけ、後からまとめて検品・記録してください。
速度優先運用を既定とします。詳細記録運用は、ユーザーが明示した場合だけ使ってください。

記事全体の代表画像生成フェーズの後にこのプロンプトを使う場合でも、全体画像の追加バリエーション生成へ戻らないでください。
このプロンプトでは、`TODO.md` の `image-pending` セクションを順に処理し、章ごとの `graphic-recording.png` を保存することだけを担当します。

---

# 入力

実行単位の出力ディレクトリ:

```text
{{RUN_OUTPUT_DIR}}
```

TODO ファイル:

```text
{{TODO_PATH}}
```

みくく描画プロンプトのパス:

```text
{{MIKUKU_PROMPT_PATH}}
```

処理件数:

```text
{{LIMIT}}
```

`{{TODO_PATH}}` が未指定の場合は、次を使ってください。

```text
{{RUN_OUTPUT_DIR}}/TODO.md
```

`{{MIKUKU_PROMPT_PATH}}` が未指定の場合は、`TODO.md` の `みくく描画プロンプト:` 行を読んでください。

`{{LIMIT}}` が未指定の場合は、まず 1 セクションだけ処理してください。ユーザーが「続けて」「次へ」「進めて」と依頼した場合は、次の `image-pending` セクションを 1 件処理してください。
ユーザーが全件処理または件数を明示した場合のみ、未生成セクションを複数処理してください。

---

# みくく描画プロンプトの扱い

`TODO.md` の `みくく描画プロンプト:` 行は、描画プロンプトパスの記録にすぎません。
画像生成ツールへ描画プロンプトが自動で引き継がれることは前提にしないでください。

詳細記録運用では、タイトルごとの画像生成で各セクションを処理するたびに、次を実施してください。

1. `{{MIKUKU_PROMPT_PATH}}` の実在を確認する
2. `{{MIKUKU_PROMPT_PATH}}` の本文を読む
3. 対象セクションの `image-prompt.md` に、みくく描画プロンプト本文または意味を保った短縮本文が含まれていることを確認する
4. 含まれていない場合は画像生成せず、`image-pending: character-prompt-not-embedded` として残す

速度優先運用では、40番が作成した `image-prompt.md` にみくく描画プロンプト本文が埋め込み済みであることを前提にします。
50番では各セクションごとに `{{MIKUKU_PROMPT_PATH}}` を読み直したり、埋め込み確認を `rg` で繰り返したりしないでください。
確認が必要な場合は、実行開始時に最初の 1 セクションだけ確認すれば十分です。

複数セクションを連続処理する場合でも、前セクションで使った描画プロンプトが次セクションへ暗黙に引き継がれるとは考えないでください。
各 `imagegen` 実行、または各外部画像生成AIへの投入ごとに、みくく描画プロンプト本文を含む `image-prompt.md` を使ってください。

---

# 前提

`{{RUN_OUTPUT_DIR}}` は、40番プロンプトによって作成されたディレクトリです。
40番では、画像生成へ進む前に、全対象セクション分の `sections/<NNN>/section-source.md` を一括作成済みである必要があります。
50番は、その既存構成を読み取って画像生成するだけです。

想定する構成:

```text
{{RUN_OUTPUT_DIR}}/
  TODO.md
  sections/
    001/
      section-source.md
      section-text.md
      image-prompt.md
    002/
      section-source.md
      section-text.md
      image-prompt.md
```

各セクションの画像出力先:

```text
{{RUN_OUTPUT_DIR}}/sections/<NNN>/graphic-recording.png
```

---

# 対象セクションの決定

まず `TODO.md` を読み、画像生成が必要なセクションを決めてください。
速度優先運用では、`TODO.md` の最初の `image-pending` 行を処理対象にし、対応する `sections/<NNN>/image-prompt.md` を読んで生成します。
既存画像の有無をファイルシステムで毎回確認しないでください。`TODO.md` を状態の正とします。

処理対象にする行:

- `image-pending`
- `image-pending: image-tool-unavailable`
- `image-prompt.md まで作成、画像生成は未実行`
- `[ ]` で、`image-pending` 系の状態があり、対応する `image-prompt.md` が存在する行

処理対象から外す行:

- `image-generated`
- `image-generated-unsaved`
- `image-skipped`
- `image-skipped: front-matter`
- `image-pending: mikuku-prompt-missing`
- 詳細記録運用では、`graphic-recording.png` が既に存在し、ユーザーが再生成を明示していない行
- 詳細記録運用では、対応する `image-prompt.md` が存在しない行

既存画像を上書きしないでください。再生成が必要な場合は、ユーザーが明示したときだけ実行してください。
速度優先運用では、既存画像の有無を毎回確認せず、`TODO.md` の状態で上書き可否を判断してください。

`image-pending: mikuku-prompt-missing` は、みくく描画プロンプトパスを修正してから再実行してください。

---

# 画像生成ツールの確認

詳細記録運用では、処理を始める前に、現在の環境で次の 2 点が可能か確認してください。

1. `image-prompt.md` の本文を画像生成AIへ渡せる
2. 生成画像を最終的に対象セクションのディレクトリへ保存または移動できる

速度優先運用では、この確認は省略します。
この環境では組み込み `imagegen` と `copy-section-image.mjs` が使える前提で進め、失敗した場合だけその時点で止めてください。

みくく描画プロンプト本文が `image-prompt.md` に含まれている場合は、セクションごとの生成実行ごとにその `image-prompt.md` 本文を使ってください。

組み込み `imagegen` が利用可能な場合は、出力先を直接指定できないことだけを理由に保留しないでください。まず `imagegen` で 1 セクション分を生成し、生成された画像をワークスペース内の対象セクションディレクトリへ保存または移動してください。

組み込み `imagegen` は、通常 `$CODEX_HOME/generated_images/...` 配下へ画像を保存します。対象セクションで使う画像は、現在の `imagegen` 呼び出しが返した正確な保存先からコピーしてください。元画像は削除しないでください。
`$CODEX_HOME/generated_images` 全体を検索し、更新日時が最も新しい PNG を今回の生成結果とみなしてはいけません。

ただし、環境や Codex のバージョンによっては、生成画像が `$CODEX_HOME/generated_images/...` に新規 PNG として保存されず、Codex セッション JSONL の `image_generation_end.payload.result` に PNG の base64 として記録される場合があります。
現在の画像生成ツール呼び出しから今回生成分の正確な PNG パスが返らなかった場合は、生成失敗として扱う前に、セッション JSONL からの復元をフォールバックとして試してください。
このフォールバックを使うには、各 `imagegen` 実行の直前にセッション JSONL の最終行番号を記録しておく必要があります。復元対象は、その生成前行番号より後のイベントだけです。
復元した PNG は一度対象セクションの `generated-from-session.png` として保存し、`copy-section-image.mjs` の自動検証を通して `graphic-recording.png` へコピーします。

詳細記録運用では、対象セクションごとに次のファイルへコピー記録を残してもかまいません。

```text
{{RUN_OUTPUT_DIR}}/sections/<NNN>/copy-generated-image.md
```

この Markdown には、生成画像の元パス、コピー先、コピーコマンド、検証コマンド、コピー結果を記録します。

速度優先運用では、`copy-generated-image.md` は作成しません。
画像生成、検証付きコピー、`TODO.md` 更新だけを行い、すぐ次のセクションへ進んでください。

生成画像を対象セクションのディレクトリへ保存または移動できない場合は、生成済みにしないでください。この場合は `image-generated-unsaved` として `TODO.md` に記録してください。

詳細記録運用で画像生成ツールそのものが利用できない場合、または描画プロンプト本文が `image-prompt.md` に含まれていない場合は、必要に応じて画像生成ツールへ渡すための一覧を `{{RUN_OUTPUT_DIR}}/image-generation-queue.md` として作成し、`TODO.md` は `image-pending: image-tool-unavailable` または `image-pending: character-prompt-not-embedded` のまま残してください。
速度優先運用では、`image-generation-queue.md` を作成しないでください。

この状態は「画像生成の失敗」ではなく「現在の環境では未実行」です。`image-generation-failed` は、画像生成ツールを実行したがエラーになった、または出力画像が不正だった場合だけ使ってください。

---

# 処理手順

各対象セクションについて、次の順序で処理してください。

## 1. 入力ファイルを確認する

詳細記録運用では、対象セクションのディレクトリを確認します。

必須入力:

- `image-prompt.md`
- `{{MIKUKU_PROMPT_PATH}}`

任意参照:

- `section-text.md`
- `section-source.md`

`image-prompt.md` がない場合、そのセクションは画像生成せず、`TODO.md` に `image-prompt-missing` と記録してください。

`{{MIKUKU_PROMPT_PATH}}` が存在しない場合、そのセクションは画像生成せず、`TODO.md` に `image-pending: mikuku-prompt-missing` と記録してください。

速度優先運用では、この章の確認は省略してください。
`TODO.md` と 40番の出力構成を信頼し、対象セクションの `image-prompt.md` を直接読んで画像生成へ進みます。

## 2. 画像生成AI用プロンプトを読む

対象セクションの `image-prompt.md` を読みます。

画像生成に渡す入力:

- `image-prompt.md` の本文
- みくく描画プロンプト本文を含む `image-prompt.md`

詳細記録運用では、この時点で、当該セクション用の `image-prompt.md` にみくく描画プロンプト本文が含まれていることを確認してください。
速度優先運用では、埋め込み確認は繰り返さず、`image-prompt.md` 本文をそのまま画像生成ツールへ渡してください。
前セクションの生成時に使った描画プロンプトが現在の生成へ引き継がれるとは扱わないでください。

`image-prompt.md` 内に推奨出力先が書かれている場合は、それを尊重してください。書かれていない場合は、次のパスを使ってください。

```text
{{RUN_OUTPUT_DIR}}/sections/<NNN>/graphic-recording.png
```

## 3. 画像を生成する

速度優先運用では、`image-prompt.md` の本文を使って画像生成を実行してください。
画像生成ツールの利用可否やみくく描画プロンプト本文の埋め込み確認は、各セクションでは繰り返しません。

`image-prompt.md` に持ち物の制約が明記されていない場合は、画像生成ツールへ渡す直前に次の補助制約を追加してください。
既存プロンプトに、みくくが物を持つ指示が残っている場合も、次の補助制約を優先してください。

```text
Do not let Mikuku hold any objects.
```

セッション JSONL 復元を使う可能性がある場合は、各画像生成の直前に現在の最終行番号を記録してください。
複数セクションを処理するときも、基準行番号は一括取得せず、各 `imagegen` 実行の直前に取り直します。

```bash
SESSION_AFTER_LINE=$(awk 'END { print NR }' "$SESSION_JSONL")
# この行番号を記録した直後に、現在のセクション用 imagegen を 1 回実行する
```

組み込み `imagegen` を使う場合は、1 セクションずつ実行してください。
速度優先運用では、各実行前の埋め込み確認は行わず、生成後に現在の `imagegen` 呼び出しが返した正確な画像パスを `copy-section-image.mjs` へ渡してください。
詳細記録運用では、各実行前に `image-prompt.md` 本文にみくく描画プロンプト本文が含まれていることを確認してください。

```text
{{RUN_OUTPUT_DIR}}/sections/<NNN>/graphic-recording.png
```

組み込み `imagegen` の生成物が `$CODEX_HOME/generated_images/...` に保存された場合は、次の方針で扱ってください。

1. 現在の画像生成ツール呼び出しが返した正確な画像ファイルパスを受け取る
2. そのパスを `copy-section-image.mjs` の `--src` に渡す
3. 同スクリプトが 0 バイト確認と PNG シグネチャ確認を行った後、対象セクションの出力先へコピーする
4. 検証とコピーに成功した場合だけ、同スクリプトが `TODO.md` を `image-generated` に更新する
5. 元の `$CODEX_HOME/generated_images/...` 側の画像は残す

コピー先:

```text
{{RUN_OUTPUT_DIR}}/sections/<NNN>/graphic-recording.png
```

現在の画像生成ツール呼び出しから今回生成分の正確な PNG パスが返らなかった場合は、Codex セッション JSONL の `image_generation_end.payload.result` から PNG を復元してください。
復元専用スクリプトには、当該 `imagegen` 実行の直前に記録した `SESSION_AFTER_LINE` を必須の `--after-line` として渡します。指定行以前のイベントは今回の生成結果として使えません。
復元後は `copy-section-image.mjs` を実行し、0 バイト確認と PNG シグネチャ確認に成功した場合だけ最終ファイルのコピーと `TODO.md` 更新を行ってください。

復元コマンド例:

```bash
node "{{SKILL_DIR}}/references/graphic-recording/scripts/restore-generated-image-from-session.mjs" \
  --session-jsonl "$SESSION_JSONL" \
  --after-line "$SESSION_AFTER_LINE" \
  --out "{{RUN_OUTPUT_DIR}}/sections/<NNN>/generated-from-session.png"

node "{{SKILL_DIR}}/references/graphic-recording/scripts/copy-section-image.mjs" \
  --run-dir "{{RUN_OUTPUT_DIR}}" \
  --section "<NNN>" \
  --src "{{RUN_OUTPUT_DIR}}/sections/<NNN>/generated-from-session.png"
```

詳細記録運用で `copy-generated-image.md` を作る場合は、少なくとも次を記録してください。

````markdown
# Copy Generated Image

- status: pending | copied | failed | skipped
- section:
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
node "{{SKILL_DIR}}/references/graphic-recording/scripts/copy-section-image.mjs" \
  --run-dir "{{RUN_OUTPUT_DIR}}" \
  --section "<NNN>" \
  --src "<generated-source-path>"
```

## Verify Commands

```bash
ls -lh "<workspace-output-path>"
file "<workspace-output-path>"
```

## Notes
````

画像生成ツールから正確な元パスが返らない場合でも、生成前行番号より後のセッション JSONL イベントから PNG を復元し、`copy-section-image.mjs` の自動検証とコピーに成功した場合は、対象セクションを `image-generated` として扱ってよいです。
ファイル元パスもセッション JSONL 復元もどちらも使えない場合は、コピーを実行せず、対象セクションを `image-generated` として扱わないでください。

## 省略実行ルール

画像生成後の処理を短縮したい場合は、次の最小手順で進めてください。

1. 画像生成の直前にセッション JSONL の基準行番号を記録する
2. 現在の画像生成ツール呼び出しが返した正確な PNG パスを受け取る。パスが返らない場合だけ、基準行より後のセッションイベントから復元する
3. `copy-section-image.mjs` へ正確なパスまたは復元ファイルのパスを渡す
4. 同スクリプトによる 0 バイト確認、PNG シグネチャ確認、コピー、`TODO.md` 更新が成功したことを確認する
5. 次のセクションへ進む

この省略実行でも、画像ファイルのコピーは省略しないでください。
`copy-generated-image.md`、`image-generation-report.md`、`run-state.md`、`ls -lh`、`file`、目視検品は、各セクションごとに実行しなくてもかまいません。
これらは、ユーザーが詳細記録を求めた場合、または一連の画像生成が一区切りついた時点でまとめて作成・更新してください。
高速に連続生成したい場合は、画像生成直後に `copy-section-image.mjs` で自動検証、コピー、`TODO.md` 更新ができたことをもって次へ進んでかまいません。
速度優先運用では、`image-generation-report.md` は更新しないでください。

最小コピーコマンド例:

```bash
# GENERATED_IMAGE_PATH は、現在の imagegen 呼び出しが返した正確なパスを使う
node "{{SKILL_DIR}}/references/graphic-recording/scripts/copy-section-image.mjs" \
  --run-dir "{{RUN_OUTPUT_DIR}}" \
  --section "<NNN>" \
  --src "$GENERATED_IMAGE_PATH"
```

`GENERATED_IMAGE_PATH` を生成画像ディレクトリ全体の検索や更新日時順で決めてはいけません。

現在の画像生成ツール呼び出しから正確な PNG パスが返らない場合の最小復元コマンド例:

```bash
node "{{SKILL_DIR}}/references/graphic-recording/scripts/restore-generated-image-from-session.mjs" \
  --session-jsonl "$SESSION_JSONL" \
  --after-line "$SESSION_AFTER_LINE" \
  --out "{{RUN_OUTPUT_DIR}}/sections/<NNN>/generated-from-session.png"

node "{{SKILL_DIR}}/references/graphic-recording/scripts/copy-section-image.mjs" \
  --run-dir "{{RUN_OUTPUT_DIR}}" \
  --section "<NNN>" \
  --src "{{RUN_OUTPUT_DIR}}/sections/<NNN>/generated-from-session.png"
```

`SESSION_AFTER_LINE` は、現在のセクション用 `imagegen` 実行の直前に記録した値でなければなりません。
セッション JSONL から復元した場合も、`copy-section-image.mjs` が自動検証に成功したときだけ、同スクリプトによる対象セクションの `TODO.md` 更新を許可してください。
復元できない場合は `image-generated-unsaved` または `image-generation-failed` として扱い、生成済みにはしないでください。

コピー後の `ls -lh`、`file`、画像プレビューは実行しないでください。
`copy-section-image.mjs` がエラーを返さなければ、0 バイト確認と PNG シグネチャ確認は成功し、`TODO.md` は `image-generated` に更新済みとして次へ進んでください。

生成時の基本方針:

- 横長ポスター構図
- みくくが説明する構図
- 記事内容や説明対象の配置に合わせて顔の向きや視線方向を調整してよい
- 手描きグラレコ風
- ホワイトボード解説風
- セクション本文だけを主題にする
- 別セクションの内容を混ぜない
- 日本語の短い見出しやキーワードが読めそうな構図

## 4. 生成結果を確認する

速度優先運用では、この章の目視確認と手動確認は省略してください。
ただし、`copy-section-image.mjs` による 0 バイト確認と PNG シグネチャ確認は必須です。自動検証、対象セクションへのコピー、`TODO.md` 更新に成功したら次のセクションへ進みます。
`image-generation-report.md`、`copy-generated-image.md`、目視確認は行いません。

画像生成後、次を確認してください。

- `graphic-recording.png` が保存されている
- ファイルサイズが 0 バイトではない
- 対象セクションのディレクトリに保存されている
- `copy-generated-image.md` が保存されている
- `copy-generated-image.md` に元画像パス、コピー先、コピー結果が記録されている
- `image-generation-report.md` に元画像パスとコピー先を記録している

可能であれば、画像を開いて明らかな失敗がないか確認してください。

確認できない項目は、成功したものとして断定しないでください。

## 5. TODO.md を更新する

画像生成が完了したセクションは、`copy-section-image.mjs` の自動検証とコピーが成功した後に、同スクリプトが `TODO.md` の該当行を次のように更新します。
検証付きコピーより先に手動で `image-generated` へ変更してはいけません。

```markdown
- [x] 001: テキストファイルとは - image-generated
```

詳細記録運用では、`image-generation-report.md` に、少なくとも次を記録してください。
速度優先運用では、`image-generation-report.md` は更新しません。

```markdown
## 001: テキストファイルとは

- status: image-generated
- prompt: sections/001/image-prompt.md
- mikuku-prompt: {{MIKUKU_PROMPT_PATH}}
- character-prompt-embedded: yes
- generated-source: <imagegen が保存した元画像パス>
- session-jsonl: <セッション復元時だけ記録>
- session-after-line: <セッション復元時だけ記録>
- session-event-line: <セッション復元時だけ記録>
- workspace-output: sections/001/graphic-recording.png
- copy-instruction: sections/001/copy-generated-image.md
```

画像生成ができなかった場合は、理由を短く残してください。

例:

```markdown
- [ ] 001: テキストファイルとは - image-pending: image-tool-unavailable
- [ ] 001: テキストファイルとは - image-pending: character-prompt-not-embedded
- [ ] 001: テキストファイルとは - image-pending: mikuku-prompt-missing
- [ ] 001: テキストファイルとは - image-generated-unsaved
- [ ] 001: テキストファイルとは - image-generation-failed: 画像生成エラー
- [ ] 002: 文字エンコーディングは UTF-8 で - image-prompt-missing
```

画像生成ツールが使えない環境、または描画プロンプト本文が `image-prompt.md` に含まれていない環境では、すべてを生成済み扱いにしないでください。`image-pending: image-tool-unavailable` または `image-pending: character-prompt-not-embedded` として残してください。

---

# バッチ実行ルール

既定では、最初の `image-pending` セクションを 1 件だけ処理してください。

複数セクションを処理する場合は、ユーザーが全件処理または件数を明示したときだけ実行してください。その場合も、1 セクションごとに次を完了させてから次へ進んでください。

1. `image-prompt.md` を読む
2. 画像を生成する
3. 現在の生成に対応する正確な画像パスを `copy-section-image.mjs` へ渡し、自動検証と `graphic-recording.png` へのコピーを行う
4. 同スクリプトによる `TODO.md` 更新の成功を確認する
5. 次のセクションへ進む

速度優先運用では、上記以外のステップを挟まないでください。
特に、各セクションごとの `copy-generated-image.md` 作成、`image-generation-report.md` 更新、`run-state.md` 更新、`ls -lh`、`file`、目視確認、`section-source.md` / `section-text.md` の再読込はしないでください。

途中で失敗した場合も、成功済みのセクションは `image-generated` として残し、未処理のセクションは未完了のまま残してください。

---

# 再実行ルール

再実行時は、未生成のセクションだけを処理してください。

既に `graphic-recording.png` が存在するセクションは、ユーザーが明示しない限りスキップしてください。

上書き生成を行う場合は、古い画像を消さず、次のような別名で保存してください。

```text
graphic-recording-v2.png
```

その場合は、`TODO.md` に実際の出力ファイル名を記録してください。

---

# 最終報告

処理後、短く報告してください。

- 実行単位の出力ディレクトリ
- `TODO.md` のパス
- 画像生成済みセクション数
- スキップしたセクション数
- 失敗したセクション数
- 画像生成ツールが使えなかった場合は、その旨

画像が生成できていない場合は、生成済みであるかのように報告しないでください。
