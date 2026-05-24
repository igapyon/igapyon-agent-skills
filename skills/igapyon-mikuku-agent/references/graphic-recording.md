# みくく担当グラレコ生成参照

この文書は、`igapyon-mikuku-agent` を使って、技術記事から `みくく` が説明するグラフィックレコーディング（グラレコ）向け素材を作るときの入口です。

この文書をワークフローの起点にし、必要に応じて `references/graphic-recording/` 配下の個別プロンプトを順番に使います。

## 基本方針

記事本文を直接貼り付けるのではなく、記事 Markdown ファイルのパスを入力として扱います。

入力された記事 Markdown は、グラレコ生成のための読み取り専用ソースです。
このワークフローでは、ユーザーが明示的に「元記事を編集してよい」「記事本文に画像を挿入してよい」と依頼した場合を除き、`{{ARTICLE_PATH}}` のファイルを変更してはいけません。
画像リンク、alt text、Note 貼り付け用スニペット、校正案、差し込み案が必要な場合も、元記事へ直接書き込まず、必ず `{{RUN_OUTPUT_DIR}}` 配下の別ファイルとして保存してください。

入力された記事パスをもとに、次の順序で処理します。

1. このワークフロー文書を現在のターンで読む
2. 記事 Markdown を読む
3. 実行単位の出力ディレクトリを作る
4. みくく描画プロンプトファイルを読み込む
5. 画像生成ツールがテキストプロンプト生成に対応していることを確認する
6. 実行状態ファイル `run-state.md` を作る
7. グラレコ制作用整理テキストを作る
8. 画像生成AI用プロンプトを作る
9. みくく描画プロンプト本文を含む画像生成AI用プロンプトで画像生成を実行する、または未実行理由を記録する
10. 生成物を Git 管理外の作業場所へ保存する

## 使用するプロンプト

記事全体を 1 枚のグラレコ画像にする場合は、次の 3 つのプロンプトを順番に使います。

- [graphic-recording/10-article-to-graphic-recording-text-prompt.md](graphic-recording/10-article-to-graphic-recording-text-prompt.md)
- [graphic-recording/20-graphic-recording-explainer-image-prompt.md](graphic-recording/20-graphic-recording-explainer-image-prompt.md)
- [graphic-recording/30-generate-graphic-recording-image-prompt.md](graphic-recording/30-generate-graphic-recording-image-prompt.md)

記事全体の代表画像を作ってから章ごとの画像生成へ進む場合は、30番で全体画像を採用したあと、追加の全体画像バリエーション生成を続けず、次の 40番、50番、60番へ進んでください。

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

主な生成物は次の 4 つです。

- `graphic-recording-text.md`: グラレコ制作用整理テキスト
- `image-prompt.md`: 画像生成AI用プロンプト
- `copy-generated-image.md`: 生成画像を作業ディレクトリへコピーするための記録と手順
- `graphic-recording.png`: グラレコ説明画像

保存先は原則として同じ `{{RUN_OUTPUT_DIR}}` 配下に揃えます。`workplace/` を使う場合は、その場所が Git 管理外であることを確認できた場合だけ保存してください。

Git 管理外の保存先を確認できない場合は、勝手にリポジトリ内へ保存せず、本文出力にフォールバックします。

## 記事全体画像のバリエーション上限

記事全体 1 枚のグラレコ画像は、章ごと画像生成へ進む前の代表画像フェーズとして扱います。

記事全体画像のバリエーション生成は、ユーザーが明示的に追加再生成を依頼しない限り、最大 3 枚までにしてください。
1-3 枚の候補を生成したら、その時点で最も適した 1 枚を代表画像として採用し、追加の全体画像バリエーション生成を続けず、次に `##` 見出しごとのセクション画像生成へ進んでください。

同一性崩れ、重大な破綻、保存失敗などで候補として使えない画像は失敗として記録してよいですが、その場合も無制限に再生成せず、最大 3 回を目安に一度停止し、未解決点を報告してください。

## 実行ゲート

グラレコ作業では、実際に読んだ入力と処理状態を固定してから次へ進んでください。

次のどれかを満たしていない場合は、整理テキスト作成、画像プロンプト作成、画像生成へ進まないでください。

- 現在のターンで、この `graphic-recording.md` を読んだ
- 対象記事 Markdown を読んだ
- 記事全体 1 枚か、`##` 見出しごとの複数枚かを決めた
- 使用する個別プロンプトを読んだ
- `{{RUN_OUTPUT_DIR}}` を決めた
- `{{RUN_OUTPUT_DIR}}` が Git 管理外であることを確認した、または保存せず本文出力へフォールバックすると決めた
- 使用する `{{MIKUKU_PROMPT_PATH}}` を決め、実在を確認し、本文を読んだ
- 画像生成ツールがテキストプロンプト生成に対応していることを確認した

`{{RUN_OUTPUT_DIR}}` と `{{MIKUKU_PROMPT_PATH}}` を決め、みくく描画プロンプト本文を読み、画像生成ツール仕様を確認したら、整理テキスト作成へ進む前に次の状態ファイルを作成してください。

```text
{{RUN_OUTPUT_DIR}}/run-state.md
```

`run-state.md` には、少なくとも次を記録してください。

```markdown
# Graphic Recording Run State

- workflow-read: yes
- article-read: yes
- mode: whole-article | sections | whole-article-then-sections
- run-output-dir:
- workplace-gitignored: yes | no
- prompts-read:
  - 10-article-to-graphic-recording-text-prompt.md
  - 20-graphic-recording-explainer-image-prompt.md
  - 30-generate-graphic-recording-image-prompt.md
- article-path:
- mikuku-prompt:
- mikuku-prompt-exists: yes | no
- mikuku-prompt-read: yes | no
- article-source-read-only: yes
- article-modified: no
- image-tool:
- text-prompt-generation: available | unavailable
- character-prompt-embedded: yes | no
- copy-instruction-created: yes | no
- whole-article-variation-limit: 3
- whole-article-variations-generated:
- whole-article-selected:
- generated-source-path:
- workspace-output-path:
- next-step: section-batch | section-image-generation | report
- current-status:
```

以降の各段階が終わるたびに、`current-status` と関連項目を更新してください。

状態ファイルを保存できない場合は、同等の内容を本文で短く示してから処理を続けてください。

## みくく描画プロンプト

グラレコ説明画像のキャラクター描画には、次のテキストプロンプトを使います。

- `/Users/igapyon/Documents/git/igapyon-agent-skills/skills/igapyon-mikuku-agent/assets/mikuku/mikuku-portrait-short-prompt.md`

このファイルを `{{MIKUKU_PROMPT_PATH}}` として扱います。

画像生成AI用プロンプトを作るときは、このファイルの本文を読み、最終プロンプトへそのまま、または意味を保ったまま埋め込んでください。パスだけを書いて済ませないでください。

## みくく同一性の維持

グラレコ画像では、`{{MIKUKU_PROMPT_PATH}}` の本文を、同一キャラクター `Mikuku` / `みくく` の正本描画プロンプトとして扱ってください。

新しい画像を生成するときも、キャラクターを再設計しないでください。変更してよいのは、場面、ポーズ、表情、構図、持ち物、説明している内容だけです。

グラレコ描画では、記事内容や説明対象の配置に合わせて、生成前に顔の向きや視線方向を変更してよいです。たとえば、右側に配置したみくくが左側の図解を見る、中央の見出しを見上げる、吹き出し側へ視線を向ける、などは許容します。ただし、顔の輪郭、目の描き方、髪型、髪色、ツインテール、髪留めの印象は維持してください。

維持する要素:

- 顔の輪郭
- 髪型
- 髪色
- ツインテールと髪留めの印象
- 目の描き方
- 全体の性格印象
- 日本のアニメ調技術解説イラストの雰囲気
- やわらかく明るい光
- Note.com や技術記事に合う清潔なビジュアルブランド

画像生成AI用プロンプトには、`{{MIKUKU_PROMPT_PATH}}` の本文に加えて、`same character`, `do not redesign`, `preserve character identity`, `canonical character prompt` に相当する指示を含めてください。

髪留め、髪型、顔つきなどの細部が変わった場合は、同一性が崩れた生成として扱い、正式なグラレコ成果物ではなく再生成候補または下書きとして扱ってください。

## 描画プロンプト本文の扱い

画像生成時は、`{{MIKUKU_PROMPT_PATH}}` のパスだけでなく、そのファイル本文を画像生成AI用プロンプトへ埋め込んでください。

次の場合は、描画プロンプト本文を使えていると扱えます。

- `{{MIKUKU_PROMPT_PATH}}` の本文を読んだ
- 画像生成AI用プロンプトに、みくく描画プロンプト本文または意味を保った短縮本文を含めた
- 画像生成ツールへ、その統合済みテキストプロンプトを渡せる

次の場合は、描画プロンプト本文を使えていると扱わないでください。

- `{{MIKUKU_PROMPT_PATH}}` のパスだけを書いた
- 以前の会話や別実行で使った描画プロンプトが暗黙に引き継がれることを期待した
- みくく描画プロンプト本文を読まず、一般的な「アニメ少女」説明だけで生成した

みくく描画プロンプト本文を読めない場合は、通常の画像生成を実行せず、画像生成AI用プロンプトのパス、みくく描画プロンプトのパス、推奨する画像出力パス、未実行理由を報告してください。

## 実施手順

### 0. ワークフローを読む

この作業を開始するたびに、まずこの `graphic-recording.md` を現在のターンで読み込んでください。

過去の会話で読んだ記憶だけで処理を始めないでください。

記事全体 1 枚で作る場合は、少なくとも次を読む必要があります。

- [graphic-recording/10-article-to-graphic-recording-text-prompt.md](graphic-recording/10-article-to-graphic-recording-text-prompt.md)
- [graphic-recording/20-graphic-recording-explainer-image-prompt.md](graphic-recording/20-graphic-recording-explainer-image-prompt.md)
- [graphic-recording/30-generate-graphic-recording-image-prompt.md](graphic-recording/30-generate-graphic-recording-image-prompt.md)

`##` 見出しごとの複数枚で作る場合は、少なくとも次を読む必要があります。

- [graphic-recording/40-article-section-graphic-recording-batch-prompt.md](graphic-recording/40-article-section-graphic-recording-batch-prompt.md)
- [graphic-recording/50-generate-section-graphic-recording-images-prompt.md](graphic-recording/50-generate-section-graphic-recording-images-prompt.md)
- [graphic-recording/60-inspect-section-graphic-recording-images-prompt.md](graphic-recording/60-inspect-section-graphic-recording-images-prompt.md)

### 1. 記事を読む

まず、指定された記事パスの Markdown ファイルを読み込んでください。

読み込んだ記事内容を、この後の手順で扱う「記事本文」とします。
記事本文は読み取り専用入力として扱い、このワークフロー中に上書き、追記、画像リンク挿入、整形、校正を行ってはいけません。
元記事へ反映したい提案がある場合は、`{{RUN_OUTPUT_DIR}}` 配下に提案ファイルを作り、ユーザーの明示的な許可を待ってください。

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

`{{RUN_OUTPUT_DIR}}` を作成したら、次にみくく描画プロンプトファイルを読み、画像生成ツール仕様を確認してください。その後、上記の「実行ゲート」に従って `run-state.md` を作成してください。

### 3. みくく描画プロンプトを読む

上記の「みくく描画プロンプト」のパスを `{{MIKUKU_PROMPT_PATH}}` として扱ってください。

`{{MIKUKU_PROMPT_PATH}}` が実在することを確認し、本文を読み込んでください。

### 4. 画像生成ツール仕様を確認する

画像生成ツールが、統合済みのテキストプロンプトを受け取れるか確認してください。

確認結果は `run-state.md` の `image-tool` と `text-prompt-generation` に記録します。

みくく描画プロンプト本文を読めない場合でも、グラレコ制作用整理テキストは作成してよいです。ただし、画像生成AI用プロンプトと画像生成へは進まず、未実行理由を記録してください。

### 5. 実行状態を確認する

整理テキストを作る前に、`run-state.md` または本文の状態メモで次を確認してください。

- `workflow-read: yes`
- `article-read: yes`
- `mode` が決まっている
- 使用する個別プロンプトを読んでいる
- `mikuku-prompt-exists: yes`
- `mikuku-prompt-read: yes`
- `text-prompt-generation` が `available` または `unavailable` として記録されている

未確認の項目がある場合は、処理を進めず、該当ファイルを読んで状態を更新してください。

### 6. グラレコ制作用テキストを作る

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

### 7. 画像生成用プロンプトを作る

次に、手順 6 で保存したグラレコ制作用テキストのファイルパスと、手順 3 で選んだみくく描画プロンプトのファイルパスを入力として、[graphic-recording/20-graphic-recording-explainer-image-prompt.md](graphic-recording/20-graphic-recording-explainer-image-prompt.md) の方針に従い、画像生成AIへ渡すための最終プロンプトを作成してください。

作成した画像生成AI用プロンプトは、次のパスへ Markdown ファイルとして保存してください。

```text
{{RUN_OUTPUT_DIR}}/image-prompt.md
```

保存したファイルのパスを、次の手順の `{{IMAGE_PROMPT_PATH}}` として扱ってください。

最終プロンプトには、以下を含めてください。

- みくくが説明している構図
- みくく描画プロンプト本文
- 横長ポスター構図
- 手描きグラレコ風
- ホワイトボード解説風
- 図解、矢印、囲み、アイコン
- 吹き出し
- 技術記事の主要概念
- 対比や循環構造
- 避けたい表現

### 8. 画像生成を実行する

次に、手順 7 で保存した画像生成AI用プロンプトのファイルパスと、手順 3 で選んだみくく描画プロンプトのファイルパスを入力として、[graphic-recording/30-generate-graphic-recording-image-prompt.md](graphic-recording/30-generate-graphic-recording-image-prompt.md) の方針に従い、グラレコ説明画像を生成してください。

画像生成ツールが利用可能で、かつ統合済みのテキストプロンプトを渡せる環境では、画像生成AI用プロンプト本文を渡して画像生成まで実行します。

生成した画像は、次のパスへ画像ファイルとして保存してください。

```text
{{RUN_OUTPUT_DIR}}/graphic-recording.png
```

画像生成ツールが使えない環境、または画像生成ツールがテキストプロンプトを受け取れない環境では、画像生成は実行せず、画像生成AI用プロンプトのパス、みくく描画プロンプトのパス、推奨する画像出力パス、未実行理由を報告してください。

## 最終報告

処理後、保存したファイルのパスを短く報告してください。

- グラレコ制作用整理テキスト
- 選択したみくく描画プロンプト
- 画像生成AI用プロンプト
- グラレコ説明画像、または画像生成ツールへ渡すための入力情報
- 実行単位の出力ディレクトリ

Git 管理外の保存先を確認できない場合は、ファイル保存せず本文を出力してください。

## 注意点

- グラレコ生成は、記事執筆そのものとは別の後工程として扱います。
- 記事の文体調整が必要な場合は、先に [article-writing.md](article-writing.md) を参照します。
- グラレコ向け整理では、要約だけでなく、構造、対比、役割分担、流れ、循環を抽出します。
- 画像生成AI用プロンプトでは、みくく描画プロンプトパスを描画プロンプトとして明示します。
- `index.json` は生成物です。更新が必要な場合は手編集せず、`miku-indexgen` で再生成します。
