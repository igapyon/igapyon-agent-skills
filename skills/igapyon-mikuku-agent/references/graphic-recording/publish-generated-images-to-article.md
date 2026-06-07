# みくく記事グラレコ画像の公開記事反映手順

この文書は、`igapyon-mikuku-agent` のグラレコ生成結果を、`mikuku-articles` の公開記事ディレクトリへ反映するときの手順です。

対象は、生成済みの `workplace/<YYYYMMDDHHmmss>-graphic-recording/` 配下にある画像と生成元テキストを、記事側の次の構造へ整理する作業です。

```text
YYYY/MM/YYYYMMDD/
  YYYYMMDD-article-slug.md
  images/
    000.png
    001.png
    ...
    src/
      graphic-recording-text.md
      image-prompt.md
      sections/
        001/
          image-prompt.md
          section-text.md
        ...
```

## 前提

- 元記事はすでに公開日ディレクトリへ移動済みである
- 記事ファイル名は `YYYYMMDD-...md` 形式である
- front matter に `release_date: YYYY-MM-DD` がある
- グラレコ生成結果は `workplace/<RUN_ID>-graphic-recording/` 配下にある
- `export-images/` 配下に、代表画像とセクション別画像が存在する

## 基本方針

生成作業ディレクトリ側の記録と、公開記事側の完成形は別物として扱います。

`HANDOFF.md` や `article-image-placement-plan.md` に「元記事へ挿入済み」と書かれていても、実際のリポジトリの記事 Markdown を必ず確認してください。

記事本文や画像配置を変更してよいか曖昧な場合は、推測で反映せず、ユーザーに対象記事と反映範囲を確認してください。

## 画像コピー規則

記事で参照する画像は、記事ディレクトリ直下の `images/` に置きます。

画像ファイル名は説明付きではなく、数字のみの連番にします。

```text
images/000.png
images/001.png
images/002.png
...
```

対応は次の通りです。

- `000.png`: 記事全体の代表画像
- `001.png`: `## はじめに` の画像
- `002.png` 以降: `## はじめに` の後に続く本文セクション画像

`## はじめに` が存在しない記事では、最初の本文 `##` セクションを `001.png` とします。

補足セクションは採番対象外です。元の `export-images/000-whole-article.png` のような説明付きファイル名は、記事側には残しません。

## 記事への画像リンク挿入規則

記事本文には、対応する見出しの直後へ画像リンクを挿入します。

代表画像は、通常 `## はじめに` の直後、または記事タイトル直後に置きます。

例:

```markdown
## はじめに

![記事全体の説明画像](images/000.png)

![はじめに](images/001.png)
```

各セクション画像は、対応する `##` 見出し直後に置きます。

例:

```markdown
## まずは大きく7つに分ける

![まずは大きく7つに分ける](images/002.png)
```

補足セクションには原則として画像を入れません。

画像を入れない代表例:

- `## 執筆担当`
- `## 想定読者`
- `## 使用ツール`
- `## 参考`
- `## 関連する記事`
- `## 関連リンク`

## alt text 方針

alt text は長くしすぎません。

基本は見出し名、または見出しを少し説明した短い文にします。

よい例:

```markdown
![モデル名は、見えるものと見えないものがある](images/003.png)
```

長い説明文を alt text に詰め込みすぎないでください。

## images/src のコピー規則

`images/src/` は、生成元を確認するための最小限のテキストだけを置きます。

直下に置くファイル:

```text
images/src/
  graphic-recording-text.md
  image-prompt.md
```

各セクションには次の 2 ファイルだけを置きます。

```text
images/src/sections/001/
  image-prompt.md
  section-text.md
```

コピーしないファイル:

- `TODO.md`
- `manifest.json`
- `image-index.md`
- `image-inspection-report.md`
- `image-generation-report.md`
- `article-image-placement-plan.md`
- `article-image-snippets.md`
- `note-upload-checklist.md`
- `note-image-url-replacement-table.md`
- `article-link-validation-report.md`
- `checksums.sha256`
- `README.md`
- `section-source.md`

`section-source.md` は `images/src` には入れません。

## 元画像の扱い

`workplace/.../sections/NNN/graphic-recording.png` は、生成作業ディレクトリ側の元画像です。

公開記事側では、本文参照用の画像は `images/NNN.png` として置きます。

必要なら `images/src/sections/NNN/` に `graphic-recording.png` を残す運用もあり得ますが、現在の公開記事反映では必須ではありません。模倣先に合わせる場合は、ユーザーの指示を優先してください。

## 検証

反映後は、次の観点を確認します。

- 記事内の画像リンクが `images/000.png` 形式になっている
- リンク先画像がすべて存在する
- `images/src` に余分なファイルがない
- `section-source.md` が入っていない
- 補足セクションに画像を入れていない

確認コマンド例:

```text
rg -n '^!\[' YYYY/MM/YYYYMMDD/YYYYMMDD-article-slug.md
find YYYY/MM/YYYYMMDD/images -maxdepth 1 -type f | sort
find YYYY/MM/YYYYMMDD/images/src -maxdepth 3 -type f | sort
```

コマンドは例です。環境や対象記事に合わせて、同じ確認観点を満たす方法で検証してください。

## コミット前チェック

コミット前には、変更対象と差分の概要を確認します。

確認コマンド例:

```text
git status --short --untracked-files=all
git diff --stat
```

画像ファイル名変更は、`git mv` が使えない環境では通常の `mv` でよいです。その場合、最後に `git add` すれば Git 側で rename として認識されることがあります。
