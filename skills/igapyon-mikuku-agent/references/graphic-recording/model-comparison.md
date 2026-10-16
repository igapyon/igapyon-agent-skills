# グラレコ画像モデル比較シート

同じ記事から作る画像の差を、プロンプト生成の差と画像生成モデルの差に分けて確認するための記録様式です。

## 比較条件

- article-path:
- graphic-recording-text:
- image-prompt:
- prompt-sha256:
- style-profile: mikuku-graphic-recording-v1
- style-reference-image:
- prompt-generator-model:
- image-generator-model-a:
- image-generator-model-b:
- compared-at:

同じ記事、同じ `graphic-recording-text.md`、同じ `image-prompt.md` を使い、画像生成モデルだけを変える比較を基本とします。
プロンプトが異なる候補を比べるときは、先に `prompt-audit.md` とプロンプト差分を記録し、画像生成モデルだけの差だと断定しないでください。

## 0〜2 の採点

- 0: 契約または記事設計を満たさない
- 1: 一部を満たすが、修正が必要
- 2: そのまま採用候補

| 評価軸 | A | B | メモ |
| --- | ---: | ---: | --- |
| 記事の主図・関係を保持 |  |  |  |
| 重要ラベルの正確さ |  |  |  |
| 情報密度と主図の大きさ |  |  |  |
| みくくの同一性・大きさ |  |  |  |
| 吹き出しの存在・意味 |  |  |  |
| 暖色手描きグラレコの統一感 |  |  |  |
| 背景の明るさ・注記までの文字コントラスト |  |  |  |
| 余計な風景・装飾の少なさ |  |  |  |
| 合計（16点満点） |  |  |  |

## 判断

- selected:
- rejected:
- prompt-related-difference:
- image-model-related-difference:
- next-action:

Sol/Lunaなど既存画像を参照するときは、画像そのものだけでなく、対応する `image-prompt.md`、
プロンプト生成モデル、画像生成モデルを分けて確認します。片方のプロンプトにだけ3カード、
吹き出し、みくくの大きさなどが書かれている場合、その差は画像モデルの性能ではなく、まず
プロンプト設計の差として記録します。
