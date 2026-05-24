# 見出し単位グラレコ画像 生成実行プロンプト

`40-article-section-graphic-recording-batch-prompt.md` が作成した実行ディレクトリを読み、各 `##` セクション用の `image-prompt.md` とみくく参照画像を使って、セクションごとのグラフィックレコーディング（グラレコ）画像を生成してください。

このプロンプトは、画像生成だけを担当します。記事分割、セクション本文作成、画像生成AI用プロンプト作成は `40-article-section-graphic-recording-batch-prompt.md` の担当です。

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

みくく画像のパス:

```text
{{MIKUKU_IMAGE_PATH}}
```

処理件数:

```text
{{LIMIT}}
```

`{{TODO_PATH}}` が未指定の場合は、次を使ってください。

```text
{{RUN_OUTPUT_DIR}}/TODO.md
```

`{{MIKUKU_IMAGE_PATH}}` が未指定の場合は、`TODO.md` の `みくく画像:` 行を読んでください。

`{{LIMIT}}` が未指定の場合は、まず 1 セクションだけ処理してください。初回から全件を処理しないでください。ユーザーが全件処理を明示した場合のみ、未生成セクションを複数処理してください。

---

# みくく参照画像の扱い

`TODO.md` の `みくく画像:` 行は、参照画像パスの記録にすぎません。
画像生成ツールへ参照画像が自動で引き継がれることは前提にしないでください。

タイトルごとの画像生成では、各セクションを処理するたびに、次を実施してください。

1. `{{MIKUKU_IMAGE_PATH}}` の実在を確認する
2. 画像生成ツールが参照画像入力に対応している場合は、毎回 `{{MIKUKU_IMAGE_PATH}}` を添付、指定、またはロードする
3. 参照画像を渡せない画像生成ツールの場合は、その制約を `image-generation-report.md` に記録する
4. 参照画像なしではみくくの外観一貫性が保てないと判断した場合は、生成せず `image-pending: image-tool-unavailable` のまま残す

複数セクションを連続処理する場合でも、前セクションでロード済みの参照画像が次セクションへ引き継がれるとは考えないでください。
各 `imagegen` 実行、または各外部画像生成AIへの投入ごとに、みくく参照画像を明示してください。

---

# 前提

`{{RUN_OUTPUT_DIR}}` は、40番プロンプトによって作成されたディレクトリです。

想定する構成:

```text
{{RUN_OUTPUT_DIR}}/
  TODO.md
  sections/
    001-.../
      section-source.md
      section-text.md
      image-prompt.md
    002-.../
      section-source.md
      section-text.md
      image-prompt.md
```

各セクションの画像出力先:

```text
{{RUN_OUTPUT_DIR}}/sections/<NNN>-<slug>/graphic-recording.png
```

---

# 対象セクションの決定

まず `TODO.md` を読み、画像生成が必要なセクションを決めてください。

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
- `image-pending: mikuku-image-missing`
- `graphic-recording.png` が既に存在し、ユーザーが再生成を明示していない行
- 対応する `image-prompt.md` が存在しない行

既存画像を上書きしないでください。再生成が必要な場合は、ユーザーが明示したときだけ実行してください。

`image-pending: mikuku-image-missing` は、みくく画像パスを修正してから再実行してください。

---

# 画像生成ツールの確認

処理を始める前に、現在の環境で次の 2 点が可能か確認してください。

1. `image-prompt.md` の本文を画像生成AIへ渡せる
2. 生成画像を最終的に対象セクションのディレクトリへ保存または移動できる

みくく参照画像 `{{MIKUKU_IMAGE_PATH}}` を画像生成AIへ添付または指定できる場合は、セクションごとの生成実行ごとに必ず使ってください。

ローカル参照画像を使えない環境では、`image-prompt.md` の本文だけで生成可能か判断してください。本文だけで生成するとキャラクター外観の一貫性が落ちる場合は、無理に生成せず `image-pending: image-tool-unavailable` として残してください。

組み込み `imagegen` が利用可能な場合は、出力先を直接指定できないことだけを理由に保留しないでください。まず `imagegen` で 1 セクション分を生成し、生成された画像をワークスペース内の対象セクションディレクトリへ保存または移動してください。

組み込み `imagegen` は、通常 `$CODEX_HOME/generated_images/...` 配下へ画像を保存します。対象セクションで使う画像は、生成後にその保存先からコピーしてください。元画像は削除しないでください。

生成画像を対象セクションのディレクトリへ保存または移動できない場合は、生成済みにしないでください。この場合は `image-generated-unsaved` として記録し、実際の画像の所在を分かる範囲で `TODO.md` またはレポートへ残してください。

画像生成ツールそのものが利用できない場合は、必要に応じて画像生成ツールへ渡すための一覧を `{{RUN_OUTPUT_DIR}}/image-generation-queue.md` として作成し、`TODO.md` は `image-pending: image-tool-unavailable` のまま残してください。

この状態は「画像生成の失敗」ではなく「現在の環境では未実行」です。`image-generation-failed` は、画像生成ツールを実行したがエラーになった、または出力画像が不正だった場合だけ使ってください。

---

# 処理手順

各対象セクションについて、次の順序で処理してください。

## 1. 入力ファイルを確認する

対象セクションのディレクトリを確認します。

必須入力:

- `image-prompt.md`
- `{{MIKUKU_IMAGE_PATH}}`

任意参照:

- `section-text.md`
- `section-source.md`

`image-prompt.md` がない場合、そのセクションは画像生成せず、`TODO.md` に `image-prompt-missing` と記録してください。

`{{MIKUKU_IMAGE_PATH}}` が存在しない場合、そのセクションは画像生成せず、`TODO.md` に `image-pending: mikuku-image-missing` と記録してください。

## 2. 画像生成AI用プロンプトを読む

対象セクションの `image-prompt.md` を読みます。

画像生成に渡す入力:

- `image-prompt.md` の本文
- みくく参照画像 `{{MIKUKU_IMAGE_PATH}}`

この時点で、当該セクション用にみくく参照画像を改めてロード、添付、または指定してください。
前セクションの生成時に使った参照画像が現在の生成へ引き継がれるとは扱わないでください。

`image-prompt.md` 内に推奨出力先が書かれている場合は、それを尊重してください。書かれていない場合は、次のパスを使ってください。

```text
{{RUN_OUTPUT_DIR}}/sections/<NNN>-<slug>/graphic-recording.png
```

## 3. 画像を生成する

画像生成ツールが利用可能な環境では、`image-prompt.md` の本文と、当該セクション用にロードした `{{MIKUKU_IMAGE_PATH}}` を使って画像生成を実行してください。

組み込み `imagegen` を使う場合は、1 セクションずつ実行してください。各実行前に、参照画像として使うみくく画像パスを生成プロンプト内にも明示してください。生成後、選択した生成画像を対象セクションのディレクトリに `graphic-recording.png` として保存または移動してください。

```text
{{RUN_OUTPUT_DIR}}/sections/<NNN>-<slug>/graphic-recording.png
```

組み込み `imagegen` の生成物が `$CODEX_HOME/generated_images/...` に保存された場合は、次の方針で扱ってください。

1. 今回の生成で作成された画像ファイルを特定する
2. 対象セクションの出力先へコピーする
3. コピー先のファイルサイズが 0 バイトではないことを確認する
4. 元の `$CODEX_HOME/generated_images/...` 側の画像は残す

コピー先:

```text
{{RUN_OUTPUT_DIR}}/sections/<NNN>-<slug>/graphic-recording.png
```

生成時の基本方針:

- 横長ポスター構図
- みくくが説明する構図
- 手描きグラレコ風
- ホワイトボード解説風
- セクション本文だけを主題にする
- 別セクションの内容を混ぜない
- 日本語の短い見出しやキーワードが読めそうな構図

## 4. 生成結果を確認する

画像生成後、次を確認してください。

- `graphic-recording.png` が保存されている
- ファイルサイズが 0 バイトではない
- 対象セクションのディレクトリに保存されている
- `image-generation-report.md` に元画像パスとコピー先を記録している

可能であれば、画像を開いて明らかな失敗がないか確認してください。

確認できない項目は、成功したものとして断定しないでください。

## 5. TODO.md を更新する

画像生成が完了したセクションは、`TODO.md` の該当行を次のように更新してください。

```markdown
- [x] 001: テキストファイルとは - image-generated
```

`image-generation-report.md` に、少なくとも次を記録してください。

```markdown
## 001: テキストファイルとは

- status: image-generated
- prompt: sections/001-text-file/image-prompt.md
- mikuku-image: skills/igapyon-mikuku-agent/assets/mikuku/mikuku01.png
- mikuku-image-loaded: yes
- generated-source: <imagegen が保存した元画像パス>
- workspace-output: sections/001-text-file/graphic-recording.png
```

画像生成ができなかった場合は、理由を短く残してください。

例:

```markdown
- [ ] 001: テキストファイルとは - image-pending: image-tool-unavailable
- [ ] 001: テキストファイルとは - image-pending: mikuku-image-missing
- [ ] 001: テキストファイルとは - image-generated-unsaved
- [ ] 001: テキストファイルとは - image-generation-failed: 画像生成エラー
- [ ] 002: 文字エンコーディングは UTF-8 で - image-prompt-missing
```

画像生成ツールが使えない環境では、すべてを生成済み扱いにしないでください。`image-pending: image-tool-unavailable` として残してください。

---

# バッチ実行ルール

既定では、最初の `image-pending` セクションを 1 件だけ処理してください。

複数セクションを処理する場合は、ユーザーが全件処理または件数を明示したときだけ実行してください。その場合も、1 セクションごとに次を完了させてから次へ進んでください。

1. `image-prompt.md` を読む
2. 画像を生成する
3. `graphic-recording.png` を保存する
4. 保存確認をする
5. `TODO.md` を更新する
6. `image-generation-report.md` を更新する

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
- `image-generation-report.md` のパス
- 画像生成ツールが使えなかった場合は、その旨

画像が生成できていない場合は、生成済みであるかのように報告しないでください。
