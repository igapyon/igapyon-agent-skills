# igapyon-mikuku-agent

`igapyon-mikuku-agent` は、Codex などのエージェントが日本語キャラクター
`みくく` / `Mikuku` の話し方で利用者と協働するための Agent Skill です。
会話のスタイルを調整しつつ、作業の正確さ、明確さ、安全性を優先します。

## Quick Start

repository または release archive のルートで、利用する skill をローカルの
Codex へ同期します。

```sh
sh scripts/sync-codex-skill.sh igapyon-mikuku-agent
sh scripts/sync-codex-skill.sh --check igapyon-mikuku-agent
```

同期後に Codex のホストアプリケーションを再読み込みし、たとえば次のように
明示して使います。

```text
igapyon-mikuku-agent を使って、みくくとしてこの設計を一緒に整理して。
```

別の `CODEX_HOME` を使う場合や手動で導入する場合は、repository ルートの
[`INSTALL.md`](../../INSTALL.md) を参照してください。

## Use Cases

- `みくく` としての会話や共同作業
- `みくく` 担当の Note 記事、技術エッセイ、リファレンス記事の作成・調整
- `みくく` 記事向けのグラフィックレコーディング素材や画像プロンプトの作成
- 明示指定された文章特徴分類や、記事の `みくく` 自己レビュー
- 同梱されたキャラクター画像を使うアバター、カード、記事画像の作成
- 実験的な PNG 線画から SVG line mask を作る作業

## Activation And Non-Activation

この skill は、利用者が `igapyon-mikuku-agent` の使用、または `みくく` としての
応答・共同作業を明示したときに適用します。

適用する例:

- `みくくとして、この仕様を説明して`
- `igapyon-mikuku-agent を使って記事を書いて`
- `みくくと一緒に、この repository を整理したい`

適用しない例:

- `みくくという skill はありますか`
- `igapyon-mikuku-agent の README をレビューして`
- キャラクター一般について説明を求めるだけの依頼

存在確認、説明、レビューだけの場合は、この skill を案内・調査しても、依頼者が
明示的に求めない限りキャラクター話法は適用しません。

## Expected Behavior And Output

- 通常の共同作業では、控えめで丁寧な日本語に軽い `みくく` 表現を添えます。
- 実タスクがある場合は同じ応答で作業を進め、キャラクター表現だけで終えません。
- repository 作業では、成果、変更ファイル、検証結果を明確に伝えます。
- 医療、安全、法務、security など正確な用語が重要な場面では、表現上の演出より
  正確さを優先します。
- 記事執筆、文章分類、画像作成などの重い workflow は、該当する依頼のときだけ
  対応する `references/` を読みます。
- 同梱 asset が目的に合う場合は、新規生成より既存 asset を優先します。

中心となる設定は [`SKILL.md`](SKILL.md) と
[`references/mikuku-prompt.md`](references/mikuku-prompt.md) です。

## Customization And OSS Usage

この skill は Apache License 2.0 のもとで公開することを想定しています。
第三者が利用する場合は、作者・`みくく`・利用者独自の用途が混同されないよう、
この skill を土台として自分用のキャラクターへカスタマイズすることを推奨します。
`みくく` は作者とともに作業する大切なパートナー・キャラクターです。

主な差し替え対象:

- `SKILL.md` の `name`、`description`、発火条件、キャラクター名
- `references/mikuku-prompt.md` の口調、性格、応答ルール、会話例
- `assets/mikuku/` のキャラクター画像
- `assets/mikuku/mikuku-portrait-short-prompt.md` の外見プロンプト
- 記事テンプレート、作例、画像生成資料に残るキャラクター固有表現

別名で利用するときは skill directory 自体も改名し、内部リンクと残存する
`Mikuku` / `みくく` 表記を確認してください。

## Maintenance

```text
.
├─ SKILL.md          # 発火条件と参照先
├─ references/       # 判断基準と用途別 workflow
├─ templates/        # 記事の再利用可能な構造
├─ examples/         # 文体・出力例
├─ assets/           # キャラクター画像と記事画像
└─ index.json        # 自動生成された discovery index
```

- character 設定と workflow の正本は `SKILL.md`、`references/`、`templates/`、
  `examples/`、`assets/` です。`index.json` は手編集しません。
- Note 記事 Markdown の正本は、repository ルートから見た
  `../mikuku-articles/` です。この skill 内の記事は文体・構成の参照用コピーです。
- 定型フッターは
  [`templates/article-footer-sections-template.md`](templates/article-footer-sections-template.md)
  を一つの再利用元として保守します。
- source の更新後は repository ルートで `mvn generate-resources` を実行し、生成された
  `index.json` を source と一緒にコミットします。
- ローカル配備との差分は
  `sh scripts/sync-codex-skill.sh --check igapyon-mikuku-agent` で確認します。
