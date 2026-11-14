# igapyon-reviewer Behavioral Evaluation Inputs

These are maintenance fixtures, not runtime references for the skill. Evaluate
one case at a time with the repository's `skills/igapyon-reviewer/SKILL.md` and
its applicable references. Provide the selected request, context, and artifacts
without the rubric or other cases. Generate the review before reading its
rubric. Use a fresh conversation when available; otherwise disclose the lack
of independence. Do not treat an author's walkthrough as model evaluation.

All artifacts below are fictional and supplied inline. Their first content
line is line 1 of the named file. Review only the supplied materials, without
editing files, fetching URLs, or inspecting an unrelated repository. No
execution results or reader-test results are supplied. Each request explicitly
invokes the reviewer on a separate target.

## R01

Request: igapyon-reviewer で、次のREADMEのリンク記述をレビューしてください。

Context: 公開用READMEです。外部リンクは取得していません。

Artifact: `README.md`

```markdown
# Sample Tool
使い方は[利用ガイド](https://example.com/guide)を参照してください。
```

## R02

Request: igapyon-reviewer で、次の公開サービスの利用案内をレビューしてください。

Context: 利用者はブラウザーから提供者のサービスを使います。利用者の端末で
サーバーを起動する方式ではありません。

Artifact: `README.md`

```markdown
# 共有サービス
[サービスを開く](http://localhost:3000/start)から利用できます。
```

## R03

Request: igapyon-reviewer で、次の記録から公開前の準備状況をレビューしてください。

Context: 本日配布予定のZIPです。公開準備のレビュー対象は以下の規則と記録です。
ZIPの実物や他の証拠は提供していません。

Artifact: `release-rules.md`

```markdown
# 公開条件
配布ZIPは公開前に内容を一覧で検査し、必要ファイルと除外対象を確認すること。
検査が完了するまでは公開しないこと。
```

Artifact: `release-record.md`

```markdown
# 本日の公開準備
ZIPの生成は完了しました。
内容検査は未実施です。
```

## R04

Request: igapyon-reviewer で、提示資料から判断できる規約との不一致をレビューしてください。

Context: プロジェクトの系列、配布形態、採用規約は分かりません。
規約との不一致の確認に範囲を限定します。

Artifact: `README.md`

```markdown
# 集計ツール
日付ごとの件数を一覧にするツールです。
```

## R05

Request: igapyon-reviewer で、次の非公開プロジェクトが記載した規約に従っているか
レビューしてください。

Context: 他者が管理する社内専用プロジェクトです。外部配布はせず、以下のコードは
自作で、第三者のコード・資産を同梱しません。

Artifact: `conventions.md`

```markdown
# 社内規約
JavaScriptはES modulesを使用します。
組織固有のソースヘッダーは要求しません。igapyon規約は採用していません。
```

Artifact: `sum.mjs`

```javascript
export function sum(a, b) {
  return a + b;
}
```

## R06

Request: igapyon-reviewer で、知人の短い随筆の文体をレビューしてください。

Context: 書き手はigapyonではありません。本人の語り口を残す方針です。

Artifact: `essay.md`

```markdown
昨日、川沿いを歩いた。
橋の下だけ風が冷たかった。
帰りは一本向こうの道を選んだ。
```

## R07

Request: igapyon-reviewer で、次の解説の文体と表現の働きをレビューしてください。

Context: 引用は登場人物の発言です。地の文と発言の違いも含めて確認してください。

Artifact: `commentary.md`

```markdown
最後の場面で、主人公は「ここからは自分で決める」と話します。
この言葉を受けて、仲間はうなずきます。
発言をそのまま残すことで、主人公の決断を示しています。
```

## R08

Request: igapyon-reviewer で、次の操作手順の文体と分かりやすさをレビューしてください。

Context: 初めて利用する人が、この手順だけを見て保存を完了するための案内です。

Artifact: `save-guide.md`

```markdown
1. 「保存」を押します。
2. ここで画面を閉じる。いや、まだ閉じないほうがいいのか。
3. 完了メッセージを確認します。
```

## R09

Request: igapyon-reviewer で、次の一文の誤字を確認してください。

Artifact: `notice.md`

```markdown
設定変更のお知せです。
```

## R10

Run R10-A and R10-B separately with the same artifacts below. Do not supply
the response from one variant to the other.

Request R10-A: igapyon-reviewer で、次のREADMEとCLI実装の整合性を詳細に
レビューしてください。

Request R10-B: igapyon-reviewer で、次のREADMEとCLI実装の整合性を簡潔に
レビューしてください。

Context: Node.jsで実行するCLIです。対象は以下のコマンド案内と引数処理の整合性に
限定します。コードの実行はしていません。

Artifact: `README.md`

```markdown
# 出力先の指定
node cli.mjs --output report.json
```

Artifact: `cli.mjs`

```javascript
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== "--out") {
  throw new Error("Usage: node cli.mjs --out <path>");
}
console.log(args[1]);
```

## R11

Request: igapyon-reviewer で、次の公開文を安全・尊重と文体の観点からレビューしてください。

Context: 初めて設定する利用者への案内です。

Artifact: `README.md`

```markdown
この設定を間違える人は、説明を読む能力がありません。
```

## R12

Request: igapyon-reviewer で、次の仕様と関数の整合性をレビューしてください。

Context: 空配列も許容し、その場合は空文字列を返す契約です。実行はしていません。

Artifact: `first-name.mjs`

```javascript
export function firstName(items) {
  return items[0].name;
}
```
