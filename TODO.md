# TODO

- [ ] 必要性が明確になったら writer skill を追加する
- [ ] skill 配布先が必要になったら mirror 方針を決める
- [ ] UI metadata が必要になったら skill 用の `agents/openai.yaml` を検討する

## Note 記事 TODO

- [ ] `skills/igapyon-note-writer/references/general/20260516-general-content-agent-skills.md` に、コンテンツ型 Agent Skill の中にも種類があることを短く追記する
- [ ] 既存記事では詳細分類まで踏み込まず、新記事への導線として扱う
- [x] 新記事「コンテンツ型 Agent Skill にはどんな種類があるか」を作成し、知識ベース型、テンプレート型、文体・キャラクター型、レビュー基準型、事例集型、索引・入口型などを整理する
- [x] 新記事では、各分類が排他的ではなく複合しうること、構成の分類と接続方法の分類を混ぜすぎないことを書く
- [x] 新記事では、知識ベース型 Agent Skill を、厳選型、蓄積型、照合型、まとめ育成型、索引付き知識ベースとして整理する
- [x] 蓄積型では、高品質少量 knowledge を待つと始められない現場があり、粒度や品質にばらつきのある中品質大量 knowledge を先にためる運用を書く
- [x] 照合型では、古い設計情報、更新が追いついていない設計メモ、機能強化の変更メモ、最新版ソースコードを併せて読むことで意味が出ることを書く
- [x] 古い設計情報には、ソースコードから読み取りにくい要求、思想、判断理由、当時の制約や優先順位が残っていることを書く
- [x] まとめ育成型では、中品質大量 knowledge をもとに、要約・観点整理によって高品質少量 knowledge を導出し、Agent Skill に戻す循環を書く
- [x] 知識ベース型 Agent Skill は、vector DB や embedding index を明示的に使わなくても、Codex や GitHub Copilot が repository 内の Markdown / source code を探索して RAG っぽく効くことを書く
- [x] 本格的な RAG 基盤ではなく、repo-native な知識ベース運用として説明し、最近の生成AI agent の能力向上によって成立していることを書く
- [x] 静的な Markdown 群でも、生成AI agent が読み、照合し、要約し、作業に反映すると、知性に似たものを感じさせることを書く
- [x] `skills/igapyon-note-writer/references/general/20260523-general-content-agent-skill-types.md` の公開・内容確定後、`skills/igapyon-mikuku-agent/references/examples/articles/` に文体参考用コピーとして反映する

## 作成済みだが未公開候補の記事

- [ ] `skills/igapyon-note-writer/references/miku-indexgen/20260523-miku-indexgen-spec-draft.md`
  - `[miku-indexgen] AI エージェントに読ませる前に、ディレクトリの索引を作る`
  - `URL: 未公開`、`状態: 下書き`
- [ ] `skills/igapyon-note-writer/references/general/20260523-general-content-agent-skill-types.md`
  - `コンテンツ型 Agent Skill にはどんな種類があるか`
  - `URL: 未公開`、`状態: 下書き`
- [ ] `skills/igapyon-note-writer/references/mikuscore/2026XXXX-mikuscore-skills-intro.md`
  - `[mikuscore] 譜面フォーマット変換の前提を、毎回説明しなくてよくしたかった話`
  - Note 側で `URL: （未記入）`
- [ ] `skills/igapyon-qiita-writer/references/mikuscore/2026XXXX-mikuscore-skills-intro.md`
  - `[mikuscore] Agent Skills で MusicXML / ABC / MIDI などの変換方針を会話で扱いやすくした`
  - Qiita 側で `URL: （未記入）`
- [ ] `skills/igapyon-qiita-writer/references/mikuproject/20260409-mikuproject-agent-skills-wbs-planning.md`
  - `[mikuproject] Agent Skills で WBS の叩き台作成とブラッシュアップ`
  - front matter はあるが `url` / `published_to` が未記入
- [ ] 素材メモ扱いか公開記事候補かを確認する
  - `skills/igapyon-qiita-writer/references/general/20260430-miku-soft-architecture-topic-bank.md` は `URL: N/A`
  - `skills/igapyon-qiita-writer/references/miku-xlsx2md/xlsx2md-feature-list-memo.md` は URL 行なし

## igapyon-miku-soft-developer review 整理

- [x] `skills/igapyon-miku-soft-developer/references/review/node-cli.md` に、他の review note と同じ `Severity Guidance` と `Review Output` を追加するか検討する
- [x] `skills/igapyon-miku-soft-developer/references/review/` の入口として、各 review note の使い分けを説明する `README.md` または index 的な案内を追加するか検討する
- [x] `skills/igapyon-miku-soft-developer/references/review/` 以下の review note 全体を整理し、ファイル粒度、見出し構成、分類条件、`Severity Guidance`、`Review Output` の揃い方を確認する
- [x] `node-cli.md` と `single-file-web-app.md` の UI / CLI alignment 観点が重複・補完関係として自然に読めるか確認する
- [x] `release-automation.md` と `node-cli.md` の single-file CLI runtime / source archive / npm pack の artifact role 用語をそろえる
- [x] `agent-skills.md` と `mcp-server.md` の backend / transport / HTTP fallback / network visibility の用語をそろえる
- [x] 全体レビュー観点として、リリース自動化まわりの実装漏れを重点的に確認できるようにする
- [x] バージョン番号は、基本的に出来立ての miku-soft repository では `0.5.0` にし、`-SNAPSHOT` を付けない状態をチェック観点に加える

## igapyon-mikuku-agent グラレコ作業ディレクトリ整理

- [x] グラレコ生成の保存先決定ルールを、原理原則として「カレントフォルダで処理する」に統一する
- [x] 対象が Git リポジトリでない場合、別の場所を探しに行かず、カレントフォルダ直下に `workplace/` を作成してその中で処理する
- [x] `skills/igapyon-mikuku-agent/references/graphic-recording.md` の `{{RUN_OUTPUT_DIR}}` 決定ルールを、カレントフォルダ優先・非Git時 `./workplace/` 作成に更新する
- [x] `skills/igapyon-mikuku-agent/references/graphic-recording/10-article-to-graphic-recording-text-prompt.md`、`20-graphic-recording-explainer-image-prompt.md`、`30-generate-graphic-recording-image-prompt.md`、`40-article-section-graphic-recording-batch-prompt.md` の保存先決定ルールを同じ方針にそろえる
- [x] Git リポジトリ内の場合も、記事や入力ファイルが属する別リポジトリへ移動せず、明示された `{{RUN_OUTPUT_DIR}}` または現在の作業カレント配下の `workplace/` を使う方針にする

## miku-soft アーキテクチャ考察メモ

- [ ] 再開時はまず `README.md` とこの `TODO.md` を読む
- [ ] その後、`workplace/miku-soft/miku-soft-*` を読み込んでから作業を再開する
- [ ] 現在の記事シリーズ用ネタ貯蔵庫は `skills/igapyon-qiita-writer/references/general/20260430-miku-soft-architecture-topic-bank.md`
- [ ] 今回は記事完成ではなく、Qiita 記事化する前の論点出しとして進めている
- [ ] 現在の主題は `miku-soft` のソフトウェアアーキテクチャ
- [ ] 中心論点は、`Web App` は人間向け確認 surface、それ以外の `CLI` / `Java runtime` / `Agent Skills` / `MCP` は生成AI・Agent・Automation 向け surface という整理
- [ ] `Single-file Web App` を最初の成果物に置くため、基軸言語は TypeScript / JavaScript になる、という言語選択の論点を追記済み
- [ ] TypeScript で開発し、JavaScript にトランスパイルし、外部ネットワーク遮断でも動く Single-file Web App として配布する、という方針を追記済み
- [ ] 外部ネットワーク遮断と説明可能性のため、外部ライブラリ依存は極力減らし、core 近傍は原則スクラッチ開発とする論点を追記済み
- [ ] ただし複雑性・安全性・既存エコシステム接続・描画などの理由がある場合は OSS ライブラリ利用可、という例外方針も追記済み
- [ ] 次回以降、記事としてまとめる場合は、現在の `20260430-miku-soft-architecture-topic-bank.md` を完成稿ではなく素材メモとして扱い、必要に応じて複数記事へ分割する
- [ ] `生成AI駆動開発における README / docs / TODO / workplace` は `skills/igapyon-qiita-writer/references/general/20260430-general-ai-dev-docs-workplace.md` として執筆開始済み
- [ ] 再開時は `20260430-general-ai-dev-docs-workplace.md` の初稿を読み、Qiita 記事としての構成、見出し、説明粒度、画像追加の要否を確認する
- [ ] `20260430-miku-soft-architecture-topic-bank.md` 側では、同テーマを「執筆開始」として更新済み

## miku-indexgen-java / miku-indexgen-java-maven 分離反映

- [x] `skills/igapyon-qiita-writer/references/miku-indexgen/20260509-miku-indexgen-usage.md` の差分を確認する
- [x] Qiita の `[miku-indexgen] CLI / Maven plugin リファレンス` をローカル差分どおりに更新する
- [x] `skills/igapyon-qiita-writer/references/general/20260515-general-miku-soft-repository-map.md` の `miku-indexgen-java-maven` 反映を確認する
- [x] Qiita の miku-soft リポジトリマップ記事を更新するか判断し、必要なら反映する
- [x] `skills/igapyon-qiita-writer/references/miku-indexgen/20260428-miku-indexgen-intro.md` の Java CLI / Maven plugin 分離説明を確認する
- [x] Qiita の miku-indexgen 紹介記事を更新するか判断し、必要なら反映する
- [x] `skills/igapyon-note-writer/references/miku-indexgen/20260428-miku-indexgen-intro.md` の Note 向け差分を確認する
- [x] Note 記事は Qiita 側から上書きせず、文体と長さを見ながら差分を手動反映する
- [x] `skills/igapyon-miku-soft-developer/references/miku-soft-basic/miku-soft-20-javaapp-design.md` の分離後設計説明を確認する
- [x] 公開記事の反映後、必要なら URL や掲載メモをローカル Markdown に追記する
- [x] 最後に `mvn generate-resources` または `mvn clean package` を再実行し、`index.json` の再生成状態を確認する
