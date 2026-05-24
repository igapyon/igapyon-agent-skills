# みくく担当グラレコ生成参照

この文書は、`igapyon-mikuku-agent` を使って、技術記事から `みくく` が説明するグラフィックレコーディング（グラレコ）向け素材を作るときの入口です。

この文書をワークフローの起点にし、必要に応じて `references/graphic-recording/` 配下の個別プロンプトを順番に使います。

## 基本方針

記事本文を直接貼り付けるのではなく、記事 Markdown ファイルのパスを入力として扱います。

入力された記事パスをもとに、次の順序で処理します。

1. 記事 Markdown を読む
2. 実行単位の出力ディレクトリを作る
3. グラレコ制作用整理テキストを作る
4. みくく画像を選ぶ
5. 画像生成AI用プロンプトを作る
6. 画像生成AI用プロンプトとみくく画像を使って画像生成を実行する
7. 生成物を Git 管理外の作業場所へ保存する

## 使用するプロンプト

記事全体を 1 枚のグラレコ画像にする場合は、次の 3 つのプロンプトを順番に使います。

- [graphic-recording/10-article-to-graphic-recording-text-prompt.md](graphic-recording/10-article-to-graphic-recording-text-prompt.md)
- [graphic-recording/20-graphic-recording-explainer-image-prompt.md](graphic-recording/20-graphic-recording-explainer-image-prompt.md)
- [graphic-recording/30-generate-graphic-recording-image-prompt.md](graphic-recording/30-generate-graphic-recording-image-prompt.md)

記事内の `##` 見出しごとに複数のグラレコ画像を作る場合は、次のプロンプトを順番に使います。

- [graphic-recording/40-article-section-graphic-recording-batch-prompt.md](graphic-recording/40-article-section-graphic-recording-batch-prompt.md)
- [graphic-recording/50-generate-section-graphic-recording-images-prompt.md](graphic-recording/50-generate-section-graphic-recording-images-prompt.md)
- [graphic-recording/60-inspect-section-graphic-recording-images-prompt.md](graphic-recording/60-inspect-section-graphic-recording-images-prompt.md)

## 入力

ユーザーから、対象記事の Markdown ファイルパスを受け取ります。

```text
{{ARTICLE_PATH}}
```

記事パスが不明な場合は、推測で処理を始めず、対象記事のパスを確認してください。

## 出力

生成物は、原則として Git 管理外の作業ディレクトリへ保存します。

出力ディレクトリ:

```text
{{RUN_OUTPUT_DIR}}
```

`{{RUN_OUTPUT_DIR}}` が未指定の場合は、次の順序で保存先を決めてください。

1. `{{ARTICLE_PATH}}` が属する Git リポジトリのルートを確認する
2. そのルート直下の `workplace/` を候補にする
3. `workplace/` が Git 管理外として扱われることを確認する
4. 確認できた場合のみ、以下の形式の実行ディレクトリを作る

```text
<記事が属するGitリポジトリ>/workplace/<YYYYMMDDHHmmss>-graphic-recording/
```

例:

```text
/Users/igapyon/Documents/git/igapyon-agent-skills/workplace/20260524095030-graphic-recording/
```

主な生成物は次の 3 つです。

- `graphic-recording-text.md`: グラレコ制作用整理テキスト
- `image-prompt.md`: 画像生成AI用プロンプト
- `graphic-recording.png`: グラレコ説明画像

保存先は原則として同じ `{{RUN_OUTPUT_DIR}}` 配下に揃えます。`workplace/` を使う場合は、その場所が Git 管理外であることを確認できた場合だけ保存してください。

Git 管理外の保存先を確認できない場合は、勝手にリポジトリ内へ保存せず、本文出力にフォールバックします。

## みくく画像

グラレコ説明画像の参照画像には、次の候補から 1 つを使います。

- `/Users/igapyon/Documents/git/igapyon-agent-skills/skills/igapyon-mikuku-agent/assets/mikuku/mikuku01.png`
- `/Users/igapyon/Documents/git/igapyon-agent-skills/skills/igapyon-mikuku-agent/assets/mikuku/mikuku02.png`
- `/Users/igapyon/Documents/git/igapyon-agent-skills/skills/igapyon-mikuku-agent/assets/mikuku/mikuku03.png`

通常は、候補からランダムに 1 つ選びます。

選んだ画像パスを、[graphic-recording/20-graphic-recording-explainer-image-prompt.md](graphic-recording/20-graphic-recording-explainer-image-prompt.md) の `{{MIKUKU_IMAGE_PATH}}` として扱います。

ランダム選択の実行が難しい環境では、候補一覧の中から任意に 1 つ選んでください。

`assets/mikuku/mikuku-mini01.png` は、このグラレコ説明画像の既定候補には含めません。

## 実施手順

### 1. 記事を読む

まず、指定された記事パスの Markdown ファイルを読み込んでください。

読み込んだ記事内容を、この後の手順で扱う「記事本文」とします。

記事パス:

```text
{{ARTICLE_PATH}}
```

### 2. 実行単位の出力ディレクトリを作る

上記の「出力」ルールに従い、`{{RUN_OUTPUT_DIR}}` を決めてください。

`{{RUN_OUTPUT_DIR}}` が未指定で、Git 管理外の `workplace/` を確認できた場合は、現在日時を使って次の形式のディレクトリを作成します。

```text
workplace/<YYYYMMDDHHmmss>-graphic-recording/
```

以降の生成物は、原則としてこのディレクトリに保存してください。

### 3. グラレコ制作用テキストを作る

まず、[graphic-recording/10-article-to-graphic-recording-text-prompt.md](graphic-recording/10-article-to-graphic-recording-text-prompt.md) の方針に従って、記事本文をグラレコ制作用の整理テキストへ変換してください。

生成した整理テキストは、次のパスへ Markdown ファイルとして保存してください。

```text
{{RUN_OUTPUT_DIR}}/graphic-recording-text.md
```

重視する観点:

- 流れ
- 構造
- 対比
- 役割分担
- 入力、処理、出力
- レイヤー構造
- 分類軸
- 育つ構造
- 循環する構造

出力は、短文・箇条書き・見出し中心の Markdown にしてください。

保存したファイルのパスを、次の手順の `{{GRAPHIC_RECORDING_TEXT_PATH}}` として扱ってください。

### 4. みくく画像を選ぶ

上記の「みくく画像」の候補から、今回使うみくく画像をランダムに 1 つ選んでください。

選んだ画像パスを、次の手順の `{{MIKUKU_IMAGE_PATH}}` として扱ってください。

### 5. 画像生成用プロンプトを作る

次に、手順 3 で保存したグラレコ制作用テキストのファイルパスと、手順 4 で選んだみくく画像のファイルパスを入力として、[graphic-recording/20-graphic-recording-explainer-image-prompt.md](graphic-recording/20-graphic-recording-explainer-image-prompt.md) の方針に従い、画像生成AIへ渡すための最終プロンプトを作成してください。

作成した画像生成AI用プロンプトは、次のパスへ Markdown ファイルとして保存してください。

```text
{{RUN_OUTPUT_DIR}}/image-prompt.md
```

保存したファイルのパスを、次の手順の `{{IMAGE_PROMPT_PATH}}` として扱ってください。

最終プロンプトには、以下を含めてください。

- みくくが説明している構図
- 参照画像として使うみくく画像のパス
- 横長ポスター構図
- 手描きグラレコ風
- ホワイトボード解説風
- 図解、矢印、囲み、アイコン
- 吹き出し
- 技術記事の主要概念
- 対比や循環構造
- 避けたい表現

### 6. 画像生成を実行する

次に、手順 5 で保存した画像生成AI用プロンプトのファイルパスと、手順 4 で選んだみくく画像のファイルパスを入力として、[graphic-recording/30-generate-graphic-recording-image-prompt.md](graphic-recording/30-generate-graphic-recording-image-prompt.md) の方針に従い、グラレコ説明画像を生成してください。

画像生成ツールが利用可能な環境では、画像生成AI用プロンプト本文と `{{MIKUKU_IMAGE_PATH}}` の参照画像を渡して画像生成まで実行します。

生成した画像は、次のパスへ画像ファイルとして保存してください。

```text
{{RUN_OUTPUT_DIR}}/graphic-recording.png
```

画像生成ツールが使えない環境では、画像生成は実行せず、画像生成AI用プロンプトのパス、みくく画像のパス、推奨する画像出力パスを報告してください。

## 最終報告

処理後、保存したファイルのパスを短く報告してください。

- グラレコ制作用整理テキスト
- 選択したみくく画像
- 画像生成AI用プロンプト
- グラレコ説明画像、または画像生成ツールへ渡すための入力情報
- 実行単位の出力ディレクトリ

Git 管理外の保存先を確認できない場合は、ファイル保存せず本文を出力してください。

## 注意点

- グラレコ生成は、記事執筆そのものとは別の後工程として扱います。
- 記事の文体調整が必要な場合は、先に [article-writing.md](article-writing.md) を参照します。
- グラレコ向け整理では、要約だけでなく、構造、対比、役割分担、流れ、循環を抽出します。
- 画像生成AI用プロンプトでは、みくく画像パスを参照画像として明示します。
- `index.json` は生成物です。更新が必要な場合は手編集せず、`miku-indexgen` で再生成します。
