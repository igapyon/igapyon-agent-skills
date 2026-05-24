# 見出し単位グラレコ画像 検品プロンプト

`50-generate-section-graphic-recording-images-prompt.md` で生成したセクション別グラレコ画像を確認し、生成品質、保存状態、画像内テキストの崩れ、再生成要否を整理してください。

このプロンプトは検品専用です。記事本文、`section-source.md`、`section-text.md`、`image-prompt.md` を、画像内テキストの崩れだけを理由に書き換えないでください。

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

`{{TODO_PATH}}` が未指定の場合は、次を使ってください。

```text
{{RUN_OUTPUT_DIR}}/TODO.md
```

---

# 対象

次の状態のセクションを検品対象にします。

- `image-generated`
- `graphic-recording.png` が存在するセクション

次の状態は検品対象外です。

- `image-pending`
- `image-pending: image-tool-unavailable`
- `image-pending: mikuku-image-missing`
- `image-generated-unsaved`
- `image-generation-failed`
- `image-prompt-missing`

---

# 確認項目

各セクションについて、次を確認してください。

## ファイル確認

- `graphic-recording.png` が存在する
- ファイルサイズが 0 バイトではない
- 対象セクションのディレクトリに保存されている

## 内容確認

- 対象セクションの主題と明らかに一致している
- 別セクションの内容が主題になっていない
- みくくが説明する構図になっている
- 横長ポスター構図として成立している
- 手描きグラレコ風、ホワイトボード解説風になっている
- 文字量が多すぎない

## 画像内テキスト確認

画像内の日本語テキストは、生成AIの都合で崩れることがあります。

画像内テキストに誤字、崩れ、読みにくさがある場合は、記事本文や `section-source.md` を修正せず、再生成候補として記録してください。

記録例:

```markdown
- section: 001
- issue: image-text-unstable
- note: 画像内の短いラベルが崩れているため再生成候補
```

---

# 出力

検品結果は、次のファイルへ保存してください。

```text
{{RUN_OUTPUT_DIR}}/image-inspection-report.md
```

形式:

```markdown
# 画像検品レポート

## Summary

- inspected:
- ok:
- regenerate-recommended:
- missing:

## Items

### 001: テキストファイルとは

- status: ok
- image: sections/001-text-file/graphic-recording.png
- notes:
```

---

# TODO.md 更新

検品結果に応じて、`TODO.md` の状態を更新してください。

問題なし:

```markdown
- [x] 001: テキストファイルとは - image-checked
```

再生成推奨:

```markdown
- [ ] 001: テキストファイルとは - image-regenerate-recommended
```

画像ファイル不足:

```markdown
- [ ] 001: テキストファイルとは - image-missing
```

---

# 注意

- 画像内テキストの崩れは、元記事の TYPO として扱わないでください。
- 元記事本文は、ユーザーが明示的に本文修正を依頼した場合だけ変更してください。
- 再生成が必要な場合は、`image-prompt.md` に短い正確表記を増やすか、画像内テキストをさらに減らす方向で調整してください。
