# TODO

- [ ] 必要性が明確になったら writer skill を追加する
- [ ] skill 配布先が必要になったら mirror 方針を決める
- [ ] UI metadata が必要になったら skill 用の `agents/openai.yaml` を検討する

## igapyon-miku-soft-developer review 整理

- [x] `skills/igapyon-miku-soft-developer/references/review/node-cli.md` に、他の review note と同じ `Severity Guidance` と `Review Output` を追加するか検討する
- [x] `skills/igapyon-miku-soft-developer/references/review/` の入口として、各 review note の使い分けを説明する `README.md` または index 的な案内を追加するか検討する
- [x] `skills/igapyon-miku-soft-developer/references/review/` 以下の review note 全体を整理し、ファイル粒度、見出し構成、分類条件、`Severity Guidance`、`Review Output` の揃い方を確認する
- [x] `node-cli.md` と `single-file-web-app.md` の UI / CLI alignment 観点が重複・補完関係として自然に読めるか確認する
- [x] `release-automation.md` と `node-cli.md` の single-file CLI runtime / source archive / npm pack の artifact role 用語をそろえる
- [x] `agent-skills.md` と `mcp-server.md` の backend / transport / HTTP fallback / network visibility の用語をそろえる
- [x] 全体レビュー観点として、リリース自動化まわりの実装漏れを重点的に確認できるようにする
- [x] バージョン番号は、基本的に出来立ての miku-soft repository では `0.5.0` にし、`-SNAPSHOT` を付けない状態をチェック観点に加える

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
