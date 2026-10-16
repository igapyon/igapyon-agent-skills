# 見出し単位グラレコ画像 検品プロンプト

`50-generate-section-graphic-recording-images-prompt.md` で生成したセクション別グラレコ画像を確認し、生成品質、保存状態、画像内テキストの崩れ、再生成要否を整理してください。

このプロンプトは検品専用です。記事本文、`section-source.md`、`section-text.md`、`image-prompt.md` を書き換えないでください。
画像内テキストの崩れ、alt text の追加、記事への画像リンク挿入、本文校正が必要に見える場合でも、元記事へ直接書き込まず、検品レポートや別ファイルに提案として記録してください。
元記事本文は、ユーザーが明示的に本文修正を依頼した場合だけ、別作業として変更してください。

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
- `image-checked`（再検品または記録の補完）
- `graphic-recording.png` が存在するセクション

次の状態は検品対象外です。

- `image-pending`
- `image-pending: image-tool-unavailable`
- `image-pending: character-prompt-not-embedded`
- `image-pending: mikuku-prompt-missing`
- `image-generated-unsaved`
- `image-generation-failed`
- `image-prompt-missing`

---

# 確認項目

各セクションについて、次を確認してください。

## ファイル確認

- `graphic-recording.png` が存在する
- ファイルサイズが 0 バイトではない
- PNG として構造的に読み取れる
- 対象セクションのディレクトリに保存されている

## 内容確認

- 対象セクションの主題と明らかに一致している
- 別セクションの内容が主題になっていない
- みくくが説明する構図になっている
- 顔の輪郭、髪型、髪色、目の描き方、ツインテール、髪留めが `mikuku-portrait-short-prompt.md` の内容から大きく変わっていない
- 顔の向きや視線方向の変更は、記事内容や説明対象の配置に合っていれば問題として扱わない
- キャラクターが別人に見える場合は、内容が良くても再生成候補として扱う
- 横長ポスター構図として成立している
- 手描きグラレコ風、ホワイトボード解説風になっている
- 文字量が多すぎない
- 手指は、ペンや持ち物、握り、重なり、ペンの裏側などで隠れている指として自然に説明できる場合は問題として扱わない
- 見えている指を数えて6本以上ある場合、または隠れている指として説明できない余分な指がある場合は、再生成候補として扱う

## 背景と文字コントラスト

各保存画像に [style-contract.md](style-contract.md) の透明度検査を適用し、全画素不透明の確認結果を記録してください。透過が原因で暗く見える場合は背景合成による修正候補として記録し、不透明化した画像の再検品が完了するまでは `image-checked` にしません。RGBA という形式名だけで再生成を要求しないでください。

[style-contract.md](style-contract.md) の「生成後の可読性確認」を各画像に適用してください。四隅・上下端・小さな注記まで確認し、背景の暗い色かぶりや陰影、淡い文字で読みにくい箇所があれば `regenerate-recommended` として記録します。プロンプト監査の pass や、前の候補より明るくなったことを画像の合格理由にしないでください。

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

記事へ画像を反映する場合は、対象セクションの状態が `image-checked` であることを確認してください。`image-generated` のままの画像は保存・構造検証済みでも、記事への反映対象にしないでください。

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
