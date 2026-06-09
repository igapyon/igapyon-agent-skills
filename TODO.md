# TODO

- [ ] 必要性が明確になったら writer skill を追加する
- [ ] skill 配布先が必要になったら mirror 方針を決める
- [ ] UI metadata が必要になったら skill 用の `agents/openai.yaml` を検討する

## 絶対パス残存の懸念

- [ ] リポジトリ内に残る実環境依存の絶対パスを相対パスまたは環境変数表記へ置き換える
  - [x] `skills/igapyon-skill-compactor/references/agent-skill/frontmatter-templates.md`
    - `$CODEX_HOME` 表記へ修正済み
    - `skills/igapyon-skill-compactor/index.json` は `miku-indexgen` で再生成済み
  - `skills/igapyon-mikuku-agent/references/graphic-recording.md`
  - `skills/igapyon-mikuku-agent/references/graphic-recording/*.md`
  - `skills/igapyon-mikuku-agent/references/graphic-recording/scripts/*.mjs`
    - `igapyon-agent-skills` 内の `workplace/` や `assets/` を絶対パス参照している
    - scripts は実行時に壊れる可能性があるため、相対パス化または `import.meta.url` 起点への修正を検討する
  - `skills/igapyon-ffmpeg-helper/references/decisions/youtube-output-policy.md`
    - sibling repo `local-html-tools` への参照を相対パス化できるか確認する
  - `skills/igapyon-miku-soft-developer/references/existing-miku-soft-repositories.md`
    - sibling checkout 置き場の説明が個人環境の絶対パスになっている
  - この `TODO.md` 内にも過去検証コマンドとして絶対パスが残っている
- [ ] 例示目的の `/Users/<name>/...`、`/home/<name>/...`、`/tmp/example` などは実パスではないため、置換対象から除外してよいか確認する

## igapyon-skill-compactor 次段階

- [ ] `igapyon-skill-compactor` を実際に肥大化した既存 Agent Skill へ適用し、運用上の違和感を確認する
  - 使いにくいチェック項目がないか
  - 過剰に読ませる参照がないか
  - `SKILL.md` から必要な参照へ迷わず辿れるか
  - `distilled/` で十分な場面と元資料へ戻る場面が分かれるか
  - 出力サマリが実務にちょうどよいか
- [ ] 実適用で見つかった違和感を、1件ずつ小さく改善する
- [ ] `distilled/`、`tests/`、`templates/`、`examples/`、`assets/` などのトップ層構造を、他の Agent Skills にも横展開できるか確認する
  - 蒸留済み資料が一級の runtime entry point なら top-level `distilled/` を検討する
  - activation / non-activation / behavior / reference-routing prompts などの検証資産は top-level `tests/` を検討する
  - 既存の `references/distilled/` や参照内テストプロンプトを移動する場合は、`SKILL.md`、`index.json`、参照リンク、README の導線も更新する
  - 小さなSkillやlegacy構造では、移動せず現状維持の方が軽い場合もある

## igapyon-ffmpeg-helper 作業メモ

- [x] `skills/igapyon-ffmpeg-helper/` を新規 Agent Skill として作成した
- [x] hard trigger 方針にした
  - 発火する例: `igapyon-ffmpeg-helper`, `igapyon FFmpeg helper`, `ffmpeg helper`, `FFmpeg helper workflow`, `FFmpeg helper runbook`, `ffmpeg runbook igapyon`, `igapyon ffmpeg runbook`
  - 通常の FFmpeg / H4essential / YouTube / loudnorm / gain / trim 相談では自動発火しない
- [x] `SKILL.md` は入口とガードレールに絞り、詳細は `references/` に分離した
- [x] first cut workflow を `references/workflows/h4essential-orchestra-youtube.md` に作成した
  - H4essential オーケストラ録音フォルダ
  - WAV トラック選択
  - VLC で人間が切れ目確認
  - cut memo を agent に戻す
  - trim
  - loudnorm JSON 測定
  - `volume=...dB` の単純ゲイン仕上げ
  - 必要なら結合
  - 静止画 + 音声で YouTube 用 MP4 作成
  - YouTube Studio で手動アップロード
- [x] process runbook を `references/process/` に分割した
  - `h4essential-input-discovery.md`
  - `workspace-and-command-log.md`
  - `audio-trim.md`
  - `peak-gain-normalize.md`
  - `audio-concat.md`
  - `still-image-youtube-video.md`
  - `youtube-manual-upload.md`
- [x] H4essential 入力仕様を記録した
  - 例: `/Volumes/ZOOM_H4E/260114_160901/260114_160901_TrMic.WAV`
  - 実処理は録音フォルダをローカルに複数コピーしてから開始
  - `TrMic`, `TrLR`, `Tr1`, `Tr2` を候補として扱う
  - `TrMic` と `TrLR` が両方ある場合などは勝手に選ばず確認する
- [x] trim 方針を記録した
  - first cut では切れ目・ファイル境界は人間判断
  - VLC 使用を強く推奨
  - cut memo 形式を定義
  - `01:23` は 1分23秒
  - `00:01:23.500`, `83.5` のような小数秒指定も許容
  - 前だけカット、後ろだけカット、両端カット、カットなしに対応
- [x] 音量調整方針を記録した
  - 参照元: `https://igapyon.github.io/local-html-tools/ffmpeg/ffmpeg-loudnorm-cmdline-gen.html`
  - 仕上げ処理としての loudnorm は使わない
  - 測定フェーズでは `loudnorm=print_format=json` で `input_tp` を得る
  - 仕上げフェーズでは `volume=...dB` のみ
  - target true peak は `-0.5 dBTP`
  - コンプなし、リミッターなし
  - hi-res / lo-res を選択可能
    - hi-res: `-ar 192000 -sample_fmt s32 -c:a pcm_s24le`
    - lo-res: `-ar 44100 -sample_fmt s16 -c:a pcm_s16le`
  - 仕上げ後に verification measurement を行う方針を追加した
- [x] 作業フォルダ方針を記録した
  - per-job directory: `workplace/h4essential-260114_160901/` など
  - `commands.log` に実行/提示コマンドを残す
  - 作業フォルダ内にログや測定出力を積極的に保存してよい
  - 例: `ffmpeg-version.txt`, `01_gain-meta.json`, `01_gain-verify-meta.json`, `01_trim.log`, `01_gain.log`, `youtube-video.log`
- [x] `ffmpeg -version` は必須にした
  - conversion command 実行前に必ず実行
  - `commands.log` に記録
  - `ffmpeg-version.txt` に保存
  - 失敗したら workflow を止める
- [x] YouTube 動画作成方針を記録した
  - 静止画 + 音声
  - MP4 / H.264 / yuv420p / AAC 48kHz 320kbps
  - 1920x1080, 画像全体を保持して padding
  - `-movflags +faststart`
  - YouTube API ではなく YouTube Studio から手動アップロード
- [x] 自己レビューして改善した
  - `ffmpeg -version` をログ化
  - 測定コマンドを `tee` ではなく redirection へ寄せた
  - `input_tp` が parse できない場合は次へ進まない
  - 仕上げ後の再測定を追加
  - no-trim 判定の文言を整理
- [x] 検証済み
  - `python3 /Users/igapyon/.codex/skills/.system/skill-creator/scripts/quick_validate.py /Users/igapyon/Documents/git/igapyon-agent-skills/skills/igapyon-ffmpeg-helper`
  - `mvn generate-resources`
- [ ] 再開時の確認候補
  - `commands.log` だけでなく各 ffmpeg 実行ログをどこまで標準化するか
  - `ffmpeg -version` のコマンド自体も `commands.log` に記録する現方針で十分か
  - hi-res / lo-res のデフォルトを決めるか、毎回聞くか
  - verification measurement の許容誤差を明文化するか
  - 無音検知を「VLC確認用の候補出し」として process 化するか
  - `README.md` の skill 一覧説明をさらに詳しくするか

## Note 記事 TODO

- [ ] 旧素材メモ `xxxxxxxx-general-content-agent-skills-token-context.md` から、3本の記事へ未展開だった補助論点を必要なら別記事または追補へ展開する
  - キャッシュやバッチ処理によるトークン消費量抑制
  - 用途に対して過剰に高価なモデルを使わない、というモデル選択の観点
  - 課金体系によっては Web UI のほうが有利な場合もある、という利用形態ごとの注意
  - 扱っているトークン自体の質が高まると、回答や作業の安定感も良くなる、という副産物の表現
  - いずれも `20260530-token-consumption-01-basics.md`、`20260531-token-consumption-02-reduction.md`、`20260531-token-consumption-03-agent-skills-reduction.md` の中心主題からはやや外れるため、現時点では TODO に留める
- [ ] `../mikuku-articles/2026/05/20260516/20260516-content-agent-skills.md` に、コンテンツ型 Agent Skill の中にも種類があることを短く追記する
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
- [x] `../mikuku-articles/2026/05/20260523/20260523-content-agent-skill-types.md` の公開・内容確定後、`skills/igapyon-mikuku-agent/references/examples/articles/` に文体参考用コピーとして反映する

## 作成済みだが未公開候補の記事

- [x] `../mikuku-articles/2026/05/20260523/20260523-content-agent-skill-types.md`
  - `コンテンツ型 Agent Skill にはどんな種類があるか`
  - 公開済み、`mikuku-articles` 側へ移動済み
- [ ] `../mikuku-articles/2026/draft/20260523-miku-indexgen-spec-draft.md`
  - `[miku-indexgen] AI エージェントに読ませる前に、ディレクトリの索引を作る`
  - `URL: 未公開`、`状態: 下書き`
- [ ] `../mikuku-articles/2026/draft/202606xx-general-agile-thinking.md`
  - `アジャイルという考え方に入門する`
  - `URL: 未公開`、`状態: 下書き`
- [ ] `../mikuku-articles/2026/draft/202606xx-general-modern-agile-terms.md`
  - `現代のアジャイルは、周辺語が多すぎる`
  - `URL: 未公開`、`状態: 下書き`
- [ ] `../mikuku-articles/2026/draft/202606xx-general-object-oriented-thinking.md`
  - `オブジェクト指向という考え方に入門する`
  - `URL: 未公開`、`状態: 下書き`
- [ ] `../mikuku-articles/2026/draft/2026XXXX-mikuscore-skills-intro.md`
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
- [x] `skills/igapyon-mikuku-agent/references/graphic-recording/scripts/split-article-sections.mjs` を追加し、記事 Markdown から `sections/001/section-source.md` 形式で一括分割できるようにする
- [x] `skills/igapyon-mikuku-agent/references/graphic-recording/scripts/copy-section-image.mjs` を追加し、生成画像を `sections/<NNN>/graphic-recording.png` へ明示コピーして `TODO.md` を更新できるようにする
- [x] `skills/igapyon-mikuku-agent/references/graphic-recording/scripts/validate-run-dir.mjs` を追加し、`TODO.md` と各セクションの4ファイル構成を検証できるようにする
- [x] `skills/igapyon-mikuku-agent/references/graphic-recording/scripts/compose-section-image-prompts.mjs` を追加し、LLM が作成した `section-text.md` とみくく描画プロンプト本文を合成して `image-prompt.md` を作れるようにする

## miku Agent Skills 同梱名の igapyon- prefix 移行

- [x] `miku-indexgen-skills` は同梱時の正式 skill 名、`SKILL.md` frontmatter `name`、展開後ディレクトリを `igapyon-miku-indexgen` にする方針へ移行済み
- [x] `miku-text-bundle-skills` は `v0.9.0.1` で同梱時の正式 skill 名、`SKILL.md` frontmatter `name`、展開後ディレクトリを `igapyon-miku-text-bundle` にする方針へ移行済み
- [x] `miku-grep-skills` は `v0.10.1.1` で同梱時の正式 skill 名、`SKILL.md` frontmatter `name`、展開後ディレクトリを `igapyon-miku-grep` にする方針へ移行済み
  - 互換 trigger として `miku-grep` は維持する
- [ ] `miku-readfile-skills` もいずれ外部管理 miku-soft 系 skill として release archive に同梱する
  - 同梱時は GitHub latest release と skill directory 名を確認し、`pom.xml` の `external.*` properties と `README.md` の同梱一覧を更新する
- [ ] `mikuproject-skills` も同梱時の正式 skill 名、`SKILL.md` frontmatter `name`、展開後ディレクトリに `igapyon-` prefix を付ける方針へ移行する
  - 現状の同梱先: `skills/mikuproject/`
  - 移行候補: `skills/igapyon-mikuproject/`
  - 互換 trigger として `mikuproject` は維持する
- [ ] `mikuscore-skills` も同梱時の正式 skill 名、`SKILL.md` frontmatter `name`、展開後ディレクトリに `igapyon-` prefix を付ける方針へ移行する
  - 現状の同梱先: `skills/mikuscore/`
  - 移行候補: `skills/igapyon-mikuscore/`
  - 互換 trigger として `mikuscore` は維持する

## miku-soft アーキテクチャ考察メモ

- [x] 再開時はまず `README.md` とこの `TODO.md` を読む
- [x] その後、`workplace/miku-soft/miku-soft-*` を読み込んでから作業を再開する
  - 2026-05-25 時点では `workplace/miku-soft/` は存在しないため、`skills/igapyon-miku-soft-developer/references/miku-soft-basic/` を参照元として作業継続
- [x] 現在の記事シリーズ用ネタ貯蔵庫は `skills/igapyon-qiita-writer/references/general/20260430-miku-soft-architecture-topic-bank.md`
- [x] 今回は記事完成ではなく、Qiita 記事化する前の論点出しとして進めている
- [x] 現在の主題は `miku-soft` のソフトウェアアーキテクチャ
- [x] 中心論点は、`Web App` は人間向け確認 surface、それ以外の `CLI` / `Java runtime` / `Agent Skills` / `MCP` は生成AI・Agent・Automation 向け surface という整理
- [x] `Single-file Web App` を最初の成果物に置くため、基軸言語は TypeScript / JavaScript になる、という言語選択の論点を追記済み
- [x] TypeScript で開発し、JavaScript にトランスパイルし、外部ネットワーク遮断でも動く Single-file Web App として配布する、という方針を追記済み
- [x] 外部ネットワーク遮断と説明可能性のため、外部ライブラリ依存は極力減らし、core 近傍は原則スクラッチ開発とする論点を追記済み
- [x] ただし複雑性・安全性・既存エコシステム接続・描画などの理由がある場合は OSS ライブラリ利用可、という例外方針も追記済み
- [x] `20260430-miku-soft-architecture-topic-bank.md` に、Web UI は人間向け確認 surface、CLI は agent / script / CI 向け実行 surface という対比を追記済み
- [x] `20260430-miku-soft-architecture-topic-bank.md` に、エントリポイントごとの読者を混ぜない整理と、CLI 内包型 Agent Skills の分担を追記済み
- [x] `20260430-miku-soft-architecture-topic-bank.md` に、Single-file Web App 起点でも Web UI 中心主義にしない、という記事化候補を追記済み
- [x] `20260430-miku-soft-architecture-topic-bank.md` に、projection / patch / validate / apply の artifact pipeline 論点を追記済み
- [x] `20260430-miku-soft-architecture-topic-bank.md` に、CLI help を AI-era runtime contract として扱う記事化候補を追記済み
- [x] `20260430-miku-soft-architecture-topic-bank.md` に、MCP server は protocol adapter であり、HTTP 化では transport / server operation policy が増えるという論点を追記済み
- [ ] 次回以降、記事としてまとめる場合は、現在の `20260430-miku-soft-architecture-topic-bank.md` を完成稿ではなく素材メモとして扱い、必要に応じて複数記事へ分割する
- [ ] `生成AI駆動開発における README / docs / TODO / workplace` は `skills/igapyon-qiita-writer/references/general/20260430-general-ai-dev-docs-workplace.md` として執筆開始済み
- [x] 再開時は `20260430-general-ai-dev-docs-workplace.md` の初稿を読み、Qiita 記事としての構成、見出し、説明粒度、画像追加の要否を確認する
  - 公開済み URL は記事内に記録済み: https://qiita.com/igapyon/items/e2002183dcdadf00ec59
- [ ] `20260430-miku-soft-architecture-topic-bank.md` 側では、同テーマを「執筆開始」として更新済み

## miku-indexgen-java / miku-indexgen-java-maven 分離反映

- [x] `skills/igapyon-qiita-writer/references/miku-indexgen/20260509-miku-indexgen-usage.md` の差分を確認する
- [x] Qiita の `[miku-indexgen] CLI / Maven plugin リファレンス` をローカル差分どおりに更新する
- [x] `skills/igapyon-qiita-writer/references/general/20260515-general-miku-soft-repository-map.md` の `miku-indexgen-java-maven` 反映を確認する
- [x] Qiita の miku-soft リポジトリマップ記事を更新するか判断し、必要なら反映する
- [x] `skills/igapyon-qiita-writer/references/miku-indexgen/20260428-miku-indexgen-intro.md` の Java CLI / Maven plugin 分離説明を確認する
- [x] Qiita の miku-indexgen 紹介記事を更新するか判断し、必要なら反映する
- [x] `../mikuku-articles/2026/04/20260428/20260428-miku-indexgen-intro.md` の Note 向け差分を確認する
- [x] Note 記事は Qiita 側から上書きせず、文体と長さを見ながら差分を手動反映する
- [x] `skills/igapyon-miku-soft-developer/references/miku-soft-basic/miku-soft-20-javaapp-design.md` の分離後設計説明を確認する
- [x] 公開記事の反映後、必要なら URL や掲載メモをローカル Markdown に追記する
- [x] 最後に `mvn generate-resources` または `mvn clean package` を再実行し、`index.json` の再生成状態を確認する
