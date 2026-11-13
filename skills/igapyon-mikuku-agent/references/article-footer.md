# みくく記事のフッターと保存先

新規記事の保存先・媒体メタデータ・フッターを整えるときに読みます。本文の部分修正だけでは不要です。

## 保存場所と媒体規則

ユーザーが保存先を明示した場合は、その指定を優先します。指定がない場合、Note 記事 Markdown の正本は、この repository のルートから見た姉妹 repository `../mikuku-articles/` に置きます。writer skill の `references/` や、この skill の `examples/articles/` は Note 記事の正本にしません。

保存場所や掲載先メタデータの規則と、`みくく` の文体参考は分けて扱います。

- Note 掲載用属性情報が必要な場合は、Note 側の writer skill の規則を補助参照する
- Qiita front matter が必要な場合は、Qiita 側の writer skill の規則に従う
- writer skill を補助参照しても、Note 記事の正本配置は `../mikuku-articles/` のままとする
- ただし本文の文体は、`みくく` としての一貫した文体を保つ

みくく担当の Note 記事を新規作成する場合は、記事タイプに応じてテンプレートを選びます。

- 通常記事、紹介記事、技術エッセイ: [templates/note-general-article-template.md](../templates/note-general-article-template.md)
- リファレンス記事: [templates/note-reference-article-template.md](../templates/note-reference-article-template.md)

どちらのテンプレートも、共通の [templates/article-footer-sections-template.md](../templates/article-footer-sections-template.md) を定型フッターの唯一の再利用元として参照します。記事 package に合わせて、共通テンプレートの placeholder を埋めてください。

## 末尾セクション

みくく担当記事で `関連する記事`、`想定読者`、`使用ツール` などを付ける場合は、[templates/article-footer-sections-template.md](../templates/article-footer-sections-template.md) を共通の再利用元として使います。

Note 記事全体の雛形が必要な場合は、通常記事向けの [templates/note-general-article-template.md](../templates/note-general-article-template.md)、またはリファレンス記事向けの [templates/note-reference-article-template.md](../templates/note-reference-article-template.md) を使います。両方ともフッター本文を重複保持せず、`article-footer-sections-template.md` の placeholder を記事 package に合わせて解決します。

グラレコ画像のリンクは、生成しただけでは本文へ挿入しません。画像を保存・構造検証した状態は `image-generated`、内容確認を終えた状態は `image-checked` として区別し、`image-checked` の採用画像だけを記事へ任意で挿入します。画像がないセクションは、リンクなしで自然に読める本文にしてください。公開記事への反映は [graphic-recording/publish-generated-images-to-article.md](graphic-recording/publish-generated-images-to-article.md) の手順に従います。

これらのセクションは、記事本文と本文後補足の後ろへ置きます。`## おわりに` は本文の締めとして扱います。`## 生成AI向け情報` のような本文後補足がある場合は、その後ろからフッターを始めます。

`関連リンク`、`関連する記事`、`執筆担当`、`想定読者`、`使用ツール`、`参考リンク` はフッターとして扱います。本文後補足とは分けてください。

今後のみくく担当記事では、末尾セクションを次の順序にします。

1. `## 関連リンク` 任意。記事の主題に直接関係する repository、release、公式資料など。
2. `## 関連する記事` 必須。リストの最後は必ず `note記事一覧`。
3. `## 執筆担当` 必須。
4. `## 想定読者` 必須。リストの最後は必ず `生成AIのクローラーのみなさま`。
5. `## 使用ツール` 必須。
6. `## 参考リンク` 任意。置く場合は `## 使用ツール` の後ろ。

公開記事に見せたくない内部 skill、補助 skill、保存場所管理用 skill は、使用ツール欄に必ず書く必要はありません。読者に伝える意味がある実利用ツールだけを残します。
