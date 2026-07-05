# Note Markdown Table Images

Note のシステム都合で Markdown の表が期待通り表示できない場合は、Note 公開用の後工程として、Markdown 表を PNG 画像に変換して扱います。

この工程は、記事本文の執筆、正本 Markdown の管理、グラレコ画像生成とは分けて扱います。Markdown 表は正本記事の一部として残し、Note へ投入するための画像は一時的な公開補助成果物として扱います。

## Principles

- 正本 Markdown を書き換えない
- Markdown 表を画像リンクへ自動置換しない
- 生成 PNG は Git 管理下へ入れない
- 出力先は `../mikuku-articles/workplace/` 配下など、Git 管理外の作業領域にする
- 画像は Note への手動アップロード用成果物として扱う
- 明示的な依頼なしに、生成画像へのリンクを正本 Markdown へ追記しない

## Existing Helper Script

既存の補助スクリプトとして、姉妹リポジトリ側に `../mikuku-articles/workplace/render-markdown-tables.mjs` がある場合があります。

使用する場合は、Playwright で Markdown 表を HTML 表として描画し、PNG を生成する用途に限ります。

## Source Markdown Safety

このスクリプトや同等の処理を使うときは、元記事を書き換えるオプションを使わないでください。

過去に `--replace` のような置換オプションが存在していても、Note 正本運用では使いません。

実行が必要な場合は、ユーザーが明示的に依頼したときだけ実行し、実行前に対象 Markdown と出力先が Git 管理外であることを確認します。
