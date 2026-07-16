# TODO

- [ ] 必要性が明確になったら writer skill を追加する
- [ ] skill 配布先が必要になったら mirror 方針を決める
- [ ] UI metadata が必要になったら skill 用の `agents/openai.yaml` を検討する

## igapyon-reviewer 改善 TODO

- [x] `SKILL.md` に全レビュー共通の短い実行・検証フローを追加する
  - 対象範囲を確定する
  - 必要な reference だけを選択する
  - finding の根拠をファイル、行番号、コマンド結果などで示す
  - 実行していない検証と残余リスクを明示する
  - 2026-07-16: `Core Review Workflow` として反映した
- [x] 汎用 Code Review の reference と `references/INDEX.md` の導線を追加する
  - correctness、regression、error handling、security、test evidence を扱う
  - Software Completion Review との役割の違いを明記する
  - 2026-07-16: `references/20-targets/code/code-review.md` を追加した
- [x] Code Review の forward test で見つかった `.DS_Store` 同期契約の不整合を修正する
  - `scripts/sync-codex-skill.sh` から `--delete-excluded` を外し、除外対象を
    drift として報告・削除しないようにした
  - 一時 Codex home で `--check` と同期後も配備先の `.DS_Store` が残ることを確認した
- [x] project convention の分類を複数軸へ整理する
  - project family、artifact type、公開・ライセンス形態を分離する
  - `igapyon-managed Agent Skill` と OSS / private-proprietary を併記可能にする
  - classification 出力候補から欠落している `igapyon-managed Agent Skill` を修正する
  - miku-soft、Maven、license、Agent Skill 固有規則を個別条件で適用する
  - 2026-07-16: `Project Convention Detection Review` を更新した
- [x] 複数 review lens の出力統合規則を定義する
  - 通常は単一の severity 順 findings に統合する
  - safety-first と全体 severity 順の優先関係を明記する
  - 重複 finding と「問題なし」ブロックの扱いを定める
  - 2026-07-16: `Output Integration` として反映した
- [x] `references/INDEX.md` の参照条件を明確にする
  - AI Text Naturalness は AI らしさが論点の場合に限定する
  - Japanese Public Text Final Check は公開前の最終確認に限定する
  - Agent Skill CLI Integration Review は CLI/runtime がある場合に限定する
  - Read-Only Skill Content Format Review は reference-only の場合に限定する
  - 2026-07-16: target と timing の導線へ条件を追記した
- [x] `igapyon-reviewer` 自体に関する meta work を reviewer workflow の発火対象から除外する
  - 対応する prompt lint Rule: `agent-skill/activation-boundary-mismatch`
  - `skills/igapyon-reviewer/SKILL.md` の frontmatter と本文に、単なる名前の言及、
    存在確認、この skill 自体の説明・レビュー・更新は meta work として扱う境界を追加する
  - should-trigger 例として「`igapyon-reviewer` を使ってコードをレビューする」を確認する
  - should-not-trigger 例として「`igapyon-reviewer` とは何か」、
    「`igapyon-reviewer` の `SKILL.md` をレビュー・更新する」を確認する
  - fresh session または同等の activation matrix で、reviewer workflow と meta work が
    正しく分離されることを検証する
  - 2026-07-16: frontmatter と本文へ meta-work carve-out を追加し、独立した
    activation matrix で should-trigger 2件、should-not-trigger 3件を確認した
- [x] 全 review lens の出力を、単一の再利用可能な統合レポート契約へそろえる
  - 対応する prompt lint Rule: `context/weak-template`
  - `references/templates/consolidated-review-report.md` などに、severity、場所・根拠、
    影響、提案、確認済み／不確実／未確認の区別を含む共通 shape を定義する
  - `SKILL.md` から共通 shape を直接案内し、各 reference の `Review Output` は
    standalone report を要求せず、統合 findings に追加する lens 固有 field だけを示す
  - AI Text Naturalness の `Overall: Low / Medium / High` などの lens 固有 rating は、
    finding severity と混同しない位置づけを明記する
  - safety-first、全体 severity 順、重複 finding の統合、未実施範囲の明示を含む
    multi-lens の最小例を追加する
  - 変更後に Markdown link、`index.json` 再生成差分、代表的な multi-lens 出力を検証する
  - 2026-07-16: canonical template と multi-lens 例を追加し、全 lens の
    `Review Output` を統合契約へ接続した。独立テストで単一レポート、severity 順、
    evidence、lens 統合、未確認範囲の出力を確認した
- [x] Prompt Language Checks を、モデル・runtime・評価根拠がある場合だけ適用する規則へ直す
  - 対応する prompt lint Rule: `context/stale-or-unversioned-context`
  - `references/20-targets/agent-skill/agent-skill-review.md` の
    `Prompt Language Checks` と対応する severity 例を更新する
  - 英語のほうが安定するという判断を使う場合は、対象モデル、reasoning/runtime、
    評価方法、確認日または根拠を記録する
  - 根拠がない場合は Japanese-only を finding にせず、対象環境で比較評価する候補として扱う
  - 日本語のみで書かれた skill を、言語だけを理由に自動で Low finding にしない
    forward-test case を追加する
  - 2026-07-16: model/version、reasoning/runtime、比較 prompt、評価方法、確認日を
    必要な evidence として定義した。no-evidence の独立テストで言語由来の finding が
    出ず、比較性能だけが未確認範囲として残ることを確認した
- [x] [Medium] 統合レポート契約を全 review lens で完全に一本化する
  - 正本は `references/templates/consolidated-review-report.md` とし、finding の field 名と
    並び順を各 reference で再定義しない
  - `references/20-targets/code/code-review.md` の `Review Output` から独自 field 一覧を除き、
    `Lens`、`Issue`、`Why it matters` を含む canonical field を使う指示へそろえる
  - `references/10-perspectives/safety-and-respect/safety-and-respect-review.md` の
    safety-first は「レビュー時に最初に確認する」と「最終出力では同じ severity 内で先に
    並べる」を分けて記述し、`SKILL.md` の全体 severity 順と矛盾させない
  - 各 lens の `Review Output` は canonical template へのリンク、lens 固有の assessment
    notes、review mode の制約だけを残し、共通契約の重複記述を削減する
  - `rg -n 'User or system impact|Report serious safety or respect concerns first' skills/igapyon-reviewer`
    を実行し、旧 field 名と曖昧な優先順位表現が残っていないことを確認する
  - code finding と safety finding を含む multi-lens forward test を実施し、Critical → High →
    Medium → Low、同一 severity では safety-first、全 finding が canonical field を使うことを
    確認する
  - `mvn generate-resources` を実行し、`skills/igapyon-reviewer/index.json` の差分が変更した
    Markdown の size など意図した更新だけであることを確認する
  - 2026-07-17: canonical template を field 名と最終順序の唯一の正本として明記し、
    Code Review の独自 field と Safety Review の曖昧な順序を修正した。28 lens すべての
    template 導線を静的検証し、共通契約の重複記述を削減した
  - 2026-07-17: Codex CLI 0.144.5 / gpt-5.6-sol の fresh session で Code と Safety の
    multi-lens test を実行し、Critical Safety → Critical Code → Medium Code、canonical field、
    `REVIEWER WORKFLOW` を確認した
- [x] [Medium] miku-soft の著作権 header 判定から固定年 `2026` を除く
  - 対象は `references/00-start-here/project-convention-detection-review.md`、
    `references/10-perspectives/rights-and-licenses/rights-and-originality-review.md`、
    `references/30-timing/release/software-completion-review.md` とする
  - header 例は `Copyright <YEAR> Toshiki Iga` などの placeholder にし、年、権利者、SPDX は
    対象 repository の文書化された規約または確認済み既存 header から判定する
  - 単年、年範囲、原著作年を許容し、確認済み規約がない場合は固定年との差を finding にしない
  - `rg -n 'Copyright 2026 Toshiki Iga' skills/igapyon-reviewer` の結果が 0 件になることを
    確認する
  - `2026` 単年、`2026-2027` 年範囲、header 規約不明の3ケースで forward test を実施し、
    確認済み規約との不一致だけが finding になることを確認する
  - `mvn generate-resources` を実行し、`skills/igapyon-reviewer/index.json` を更新する
  - 2026-07-17: 3 reference の固定年を `<YEAR>` と確認済み repository 規約に基づく
    判定へ変更し、固定文字列の残存 0 件と index 更新を確認した
  - 2026-07-17: Codex CLI 0.144.5 / gpt-5.6-sol の fresh session で単年一致、年範囲一致、
    規約不明、確認済み規約との不一致を検証し、不一致ケースだけが finding になることを
    確認した
- [x] [Medium] 修正済み `igapyon-reviewer` をローカル Codex 配備先へ同期して再検証する
  - 上記2タスクの内容と生成済み `index.json` を確定してから実施する
  - `sh scripts/sync-codex-skill.sh igapyon-reviewer` で source を `$CODEX_HOME/skills/` へ同期する
  - `sh scripts/sync-codex-skill.sh --check igapyon-reviewer` が終了コード 0 になることを確認する
  - VS Code の `Developer: Reload Window`、または `codex exec --ephemeral` の fresh session
    で source 版を読み直す
  - should-trigger として「`igapyon-reviewer` を使って別のコードをレビューする」、
    should-not-trigger として単なる名前の言及、存在確認、`igapyon-reviewer` 自体のレビューを
    実行し、reviewer workflow と meta work が分離されることを確認する
  - code と safety の multi-lens review を1件実行し、配備版でも canonical report、severity 順、
    同一 severity の safety-first が守られることを確認する
  - 実施日、同期 check、activation matrix、multi-lens test の結果をこの項目へ追記して完了にする
  - 2026-07-17: source をローカル Codex 配備先へ同期し、`--check` の終了コード 0 を確認した
  - 2026-07-17: Codex CLI 0.144.5 / gpt-5.6-sol の独立した ephemeral session で、別対象の
    明示レビューは `REVIEWER WORKFLOW`、単純言及、存在確認、self-review は `META WORK` と
    なることを確認した。multi-lens test でも canonical report と safety-first を確認した

## AI Agent Current Tasks

This section tracks active work items for AI agents.
Update this section while working. Do not rewrite unrelated TODO items.

### Tasks

- [x] Initialize lightweight AI agent state files for this repository.
- [x] Fix installed Codex skill visibility issues found on 2026-06-23.
  - Affected source skills in this repository:
    - `skills/igapyon-agent-state-management/agents/openai.yaml`
    - `skills/igapyon-skill-compactor/agents/openai.yaml`
  - Current finding: installed copies exist under `/Users/igapyon/.codex/skills`,
    but these skills are absent from the session's available-skills list.
  - Likely cause: both affected skills contain
    `policy.allow_implicit_invocation: false`, while visible hard-trigger
    skills such as `igapyon-miku-prompt-lint` and `igapyon-ffmpeg-helper` do
    not use that policy field.
  - Proposed fix: remove `policy.allow_implicit_invocation: false` from these
    `agents/openai.yaml` files, relying on `SKILL.md` trigger wording to
    prevent accidental activation.
  - Changed in repository: removed `policy.allow_implicit_invocation: false`
    from both affected `agents/openai.yaml` files.
  - Installed copies updated under `/Users/igapyon/.codex/skills`.
  - Verified in fresh session: `igapyon-agent-state-management` and
    `igapyon-skill-compactor` appear in the loaded skill list.
- [x] Prevent template Agent Skill assets from being loaded as real skills.
  - Current symptom: `skills/igapyon-miku-soft-developer/assets/agent-skills/skills/__SKILL_NAME__/SKILL.md`
    appears in Codex's available-skills list as `__SKILL_NAME__`.
  - Proposed fix: move the template out of any directory shape matching
    `*/skills/*/SKILL.md`, rename the template file so it is not `SKILL.md`, or
    adjust the packaging/install process to exclude nested template skills from
    installed `.codex/skills` discovery.
  - Changed in repository: moved the skeleton from
    `assets/agent-skills/skills/__SKILL_NAME__/` to
    `assets/agent-skills/templates/skill/`, renamed template `SKILL.md` to
    `SKILL.md.template`, and updated workflow references.
  - Installed copy updated under `/Users/igapyon/.codex/skills`.
  - Verified in fresh session: `__SKILL_NAME__` no longer appears in the
    available-skills list.
- [x] Update bundled skills later.
  - User note on 2026-06-23: bundled skills will need to be updated later.
  - Before starting, identify which bundled skills are meant and whether the
    source of truth is this repository's `skills/` tree, installed
    `/Users/igapyon/.codex/skills`, or plugin/cache-provided skills.
  - After updating, refresh any generated indexes or package artifacts required
    by the affected skills and verify the loaded available-skills list if
    discovery behavior may change.
  - Completed on 2026-06-29 for release-bundled external skills in `pom.xml`.
    Checked upstream tags for all 9 external skill repositories; only
    `miku-ms-office-skills` had a newer tag than the pinned ref.
  - Changed release pin and README list from `miku-ms-office-skills` `v0.4.1`
    to `v0.4.2`.
  - Verified with `mvn package`; release staging and
    `target/igapyon-agent-skills-1.20260629.2.zip` were generated
    successfully.

### Blockers

- なし

### Retry Log

Use this section only when the same task or error is repeated.
If the same failure appears 3 times, stop and ask the user.

- なし

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

- [x] RAG-ready 的な前処理観点として、優先度の高い3件を `igapyon-skill-compactor` に反映した
  - [x] Typed Inventory Schema 相当
    - `Structured Inventory Rule` として、commands / paths / inputs / outputs / constraints / prohibitions / fallbacks / validation / risks / references に加え、tone rules / review criteria / style constraints なども型付き一覧として扱う方針を追加
    - 箇条書きだけでなく、文中に埋まったコマンド、パス、条件、禁止事項、例外、fallback、検証、生成物、文体規則、レビュー基準なども抽出して、近くの明示一覧と統合する方針を追加
  - [x] Importance / Criticality 相当
    - `summary` でも、まず structured inventory を抽出し、重要度を付け、代表要素を残してから要約する方針を追加
    - `conservative` / `structural` / `summary` それぞれで、structured inventory をどう維持・選別するかを明文化
    - Mermaid / 箇条書き / 表 / 短い文章はモードではなく対象構造に基づいて選ぶ、という representation 選択ルールを追加
    - source code examples / code fences / configuration snippets / API examples は structured inventory として扱い、conservative では削除・要約消去せず、保持または明示参照へ移動する方針を追加
  - [x] Round-Trip Check 相当
    - 圧縮後から structured inventory を再抽出し、元の一覧と比較する `Round-Trip Check Rule` を追加
    - `behavior-009` から `behavior-016` として、一覧維持、summary 前の一覧抽出、隣接近接重複の局所統合、文中埋め込み要素の一覧統合、round-trip inventory 比較、非技術の文章スタイル指示の structured inventory 抽出、Mermaid のモード非依存な表現形式選択、conservative でのコード例保持を `codex exec` 実評価で確認
- [ ] RAG-ready 的な前処理観点の残り候補は保留する
  - [ ] Canonical Facts
  - [ ] Provenance
  - [ ] Loss Budget
  - [ ] Retrieval Hints
  - [ ] Contradiction / Duplicate Check
  - [ ] Mode-Specific Golden Examples の拡充
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

- [x] 新記事候補「GPT-5.5とQwen3では、最適なプロンプト / Agent Skills 像が異なる」は記事側リポジトリへ移動済み
  - 主題: コンテンツ型 Agent Skills は共通資産に保ち、GPT-5.5 / Qwen3-Thinking 併用時はモデルの思考特性に合わせて駆動方法や進め方を分ける
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
- [x] `miku-text-bundle-skills` は `v1.0.1` で同梱時の正式 skill 名、`SKILL.md` frontmatter `name`、展開後ディレクトリを `igapyon-miku-text-bundle` にする方針へ移行済み
- [x] `miku-repo-bundle-skills` は `v0.5.0.1` で release archive に同梱する
  - 同梱先: `skills/igapyon-miku-repo-bundle/`
  - status: experimental
- [x] `miku-grep-skills` は `v0.10.1.1` で同梱時の正式 skill 名、`SKILL.md` frontmatter `name`、展開後ディレクトリを `igapyon-miku-grep` にする方針へ移行済み
  - status: experimental
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

### miku-soft 候補プロダクト案

- [x] miku-soft 利用範囲限定の Office / OOXML 共通基盤を検討する
  - 名称: `miku-ms-office-core`
  - GitHub repository: https://github.com/igapyon/miku-ms-office-core
  - 状態: リポジトリ作成済み、着手済み
  - 目的: 汎用 Office ライブラリではなく、Microsoft Office 系ファイルについて miku-soft で実際に利用している範囲だけを共通化する
  - 命名理由: `miku-office-core` より Microsoft Office 対象であることが明確で、`miku-msoffice-core` より単語境界が読みやすい
  - 対象候補:
    - `miku-docx2md`
    - `miku-xlsx2md`
    - `miku-md2docx`
    - `miku-md2xlsx`
    - `mikuproject`
    - 将来候補の `miku-pptx2md`
    - 将来候補の `miku-md2pptx`
  - 初期共通化候補:
    - ZIP / OOXML package の読み書き
    - ZIP entry timestamp normalization
    - ZIP entry ordering
    - ZIP compression policy
    - relationships 解決
    - content types / part path の扱い
    - XML helper
    - media 抽出・格納
    - diagnostics 共通形式
    - miku-soft 共通の path normalization / UTF-16 sort 方針
  - 初期非目標:
    - 汎用 OOXML 実装
    - Microsoft Office 互換の完全実装
    - DOCX / XLSX / PPTX / MS Project の意味解釈をすべて一つにまとめること
    - 各プロダクト固有の Markdown 変換方針や出力判断を共通基盤へ押し込むこと
  - 判断メモ:
    - 既存 miku-soft Office 系プロダクトは、基本的にプロジェクト内で Office ファイルの入出力を自前実装してきた
    - PPTX 系列を追加する前に、重複している低層処理だけを miku-soft 内部向けに整理する段階に来ている
    - 共通化対象は「miku-soft が使う範囲」に限定し、汎用ライブラリ化でスコープを広げない
  - 設計エッセンス:
    - `miku-ms-office-core` は Office 文書の意味を知っている汎用ライブラリではなく、miku-soft 各プロダクトが自分の意味解釈に集中するための共通配管とする
    - 共通化する線は、ZIP container、ZIP entry timestamp / ordering / compression、OPC package、relationships、content types、part path、media、XML helper、diagnostics まで
    - ZIP 内ファイルのタイムスタンプ制御は、DOCX / XLSX / PPTX の意味解釈ではなく、再現性ある Microsoft Office 系 package 生成のための低層方針として扱う
    - DOCX の文書解釈、XLSX の表・セル解釈、PPTX のスライド解釈、Markdown 変換判断、Markdown から Office への組み立て判断は各プロダクトの価値として残す
    - この線を超えると既存の汎用 Office / OOXML ライブラリに近づき、miku-soft の小ささ、説明可能性、用途限定性が崩れやすい
- [x] 「次はなに」と問われたら、次の miku-soft 候補として PPTX 系列を進める
  - 第一候補: `miku-pptx2md`
  - 第二候補: `miku-md2pptx`
  - 理由: `miku-docx2md` / `miku-xlsx2md` / `miku-md2docx` / `miku-md2xlsx` と自然につながる Office 文書変換系列であり、AI-friendly Markdown / JSON への橋渡しとして価値が分かりやすい
  - 進め方: まず `miku-pptx2md` の名前確認、姉妹リポジトリ調査、最小仕様の確定から始める
- [x] `miku-pptx2md` の実現性を検討する
  - 位置づけ: `miku-docx2md` / `miku-xlsx2md` の姉妹となる 10 main application
  - 目的: PowerPoint `.pptx` をローカルで読み、スライド構造を AI-friendly / script-friendly / human-reviewable な Markdown と JSON に抽出する
  - 入力: `.pptx`
  - 出力候補:
    - `output.md`: スライド単位の Markdown
    - `output.json`: スライド、テキスト、画像、ノート、diagnostics の構造化データ
    - `media/`: 画像を書き出す場合の抽出先
  - 初期 CLI 案: `miku-pptx2md input.pptx output.md [options]`
  - 初期スコープ:
    - スライドごとに `## Slide N: <title>` を生成する
    - タイトル、本文、箇条書き、テキストボックスを抽出する
    - speaker notes を抽出できる場合は `### Notes` として出力する
    - 画像は `![alt](media/...)` として参照する
    - 表は可能なら Markdown table にする
    - 未対応要素、読み飛ばし、欠落、変換ロスは diagnostics に出す
  - 初期非目標:
    - PowerPoint の完全な視覚レイアウト再現
    - SmartArt、グラフ、埋め込みオブジェクト、アニメーション、複雑な重なり順の完全変換
  - 判断メモ:
    - PPTX は ZIP + OOXML なので実装可能性は高い
    - 見た目再現ではなく意味構造の抽出に絞ると miku-soft の方針と合う
    - 正式決定前に GitHub 上の `miku-pptx2md` 名の現況確認が必要
- [x] `miku-md2pptx` の実現性を検討する
  - 位置づけ: `miku-md2docx` / `miku-md2xlsx` の姉妹となる 10 main application
  - 目的: Markdown から実用的な PowerPoint `.pptx` をローカル生成し、AI や人間が作ったアウトラインをプレゼン資料の初稿へ橋渡しする
  - 入力: Markdown
  - 出力候補:
    - `output.pptx`: 生成した PowerPoint ファイル
    - `output.json`: Markdown から解釈した slide model と diagnostics
  - 初期 CLI 案: `miku-md2pptx input.md output.pptx [options]`
  - 初期スコープ:
    - `---` または見出しレベルでスライドを分割する
    - slide title、箇条書き、本文、画像、speaker notes を基本要素として扱う
    - テーマ、ページ比率、フォント、余白などは少数の安全な既定値から始める
    - 変換不能な Markdown 要素や、収まりきらないテキストは diagnostics に出す
    - 生成前の slide model JSON を保存できるようにする
  - 初期非目標:
    - 任意の Markdown を美しい商用スライドへ自動デザインすること
    - PowerPoint の全レイアウト機能、アニメーション、複雑な図形、SmartArt、グラフの完全生成
    - 入力 Markdown の曖昧な意図を過剰に推測すること
  - 判断メモ:
    - `miku-pptx2md` より「出力仕様をどう絞るか」が重要
    - OOXML の PPTX 生成を完全自前にするのは初期版では重いため、PPTX 書き出しライブラリ採用を検討する余地がある
    - ただし Markdown 解析、slide model、diagnostics、AI-facing 出力は miku 側の責務として持つのがよい
    - `miku-pptx2md` と対になるが、同一リポジトリにまとめず別アプリとして考える方が miku-soft の命名と責務に合う
    - 正式決定前に GitHub 上の `miku-md2pptx` 名の現況確認が必要

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

## char1 SVG 化メモ

- [x] `workplace/char1-transparent-v09.svg` の作成手順を記録する
  - 目的:
    - `workplace/char1.png` の中央キャラクターを SVG 化する
    - 手描きのノイズ、水彩ムラ、線の微細なガタつきは落とす
    - ただし、顔の輪郭、顎のカーブ、前髪、ツインテールなど「線として認識できる形」は勝手に描き直さず、元画像の線を忠実に追う
  - 失敗した方向:
    - `v01` から `v08` までは、SVG の `path` / `ellipse` で手描き風に再構成した
    - 線はきれいになったが、顎のカーブ、顔の縦横比、前髪、リボン、ツインテールの部品配置が別絵になった
    - 教訓: 「クリーンなベジェで描き直す」のではなく、「元画像の主線を抽出して滑らかにトレースする」必要がある
  - `v09` の基本方針:
    - 色面と主線を分けて処理する
    - 主線は `potrace` で元線ベースに SVG 化する
    - 色面は `autotrace` で少数色に簡略化する
    - 最後に、色面の上に `potrace` の主線を濃い茶色で重ねる
  - 貴重な到達ステップ:
    - `v09` で初めて「似たキャラクターを描き直す」方向から、「元画像で線として認識できるものを忠実に拾う」方向へ切り替わった
    - 特に顔の輪郭と顎のカーブは、手作業のベジェ再構成では印象が大きく変わるため、主線抽出と `potrace` に任せるのが有効だった
    - このステップは今後の同種作業でも再利用価値が高い
    - 判断基準:
      - ノイズ、水彩ムラ、線の微細なガタつきは捨てる
      - ただし、主線として読める曲線、輪郭、接続関係は勝手に再解釈しない
      - 「きれいな SVG に描き直す」より「元絵の線を整理して SVG 化する」を優先する
  - 入力:
    - 元画像: `workplace/char1.png`
  - 中間ファイル:
    - `workplace/char1-character-tight-guide.png`
      - 元画像から中央キャラクター部分を切り出し、`1091x665` にリサイズしたガイド
    - `workplace/char1-trace-tight-clean.png`
      - 左右端の矢印や上端の不要線を白でマスクした色面用入力
    - `workplace/char1-line-mask.pbm`
      - 暗い主線だけを抽出した白黒マスク
    - `workplace/char1-line-mask-preview.png`
      - 主線マスク確認用 PNG
    - `workplace/char1-line-potrace.svg`
      - `potrace` で主線を SVG パス化したもの
    - `workplace/char1-color-autotrace-tight.svg`
      - `autotrace` で色面を少数色 SVG 化したもの
  - 実行した主なコマンド:
    - キャラ部分の切り出し:
      - `magick workplace/char1.png -crop 500x285+380+500 +repage -resize 1091x665! -background white -flatten workplace/char1-character-tight-guide.png`
    - 色面用の不要要素マスク:
      - `magick workplace/char1-character-tight-guide.png -fill white -draw 'rectangle 0,0 60,665 rectangle 1028,0 1091,665 rectangle 0,0 1091,35' workplace/char1-trace-tight-clean.png`
    - 主線マスク生成:
      - `magick workplace/char1-character-tight-guide.png -fill white -draw 'rectangle 0,0 60,665 rectangle 1028,0 1091,665 rectangle 0,0 1091,35' -colorspace Gray -blur 0x0.6 -threshold 48% workplace/char1-line-mask.pbm`
    - 主線マスク確認 PNG:
      - `magick workplace/char1-line-mask.pbm workplace/char1-line-mask-preview.png`
    - 主線の SVG 化:
      - `potrace workplace/char1-line-mask.pbm --svg --output workplace/char1-line-potrace.svg --turdsize 18 --alphamax 0.8 --opttolerance 0.3`
    - 色面の SVG 化:
      - `autotrace workplace/char1-trace-tight-clean.png -output-file workplace/char1-color-autotrace-tight.svg -output-format svg -color-count 10 -despeckle-level 10 -corner-threshold 100`
  - 合成処理:
    - `workplace/char1-color-autotrace-tight.svg` から白背景パス `fill:#fcf6ed` の全面矩形を削除する
    - `workplace/char1-line-potrace.svg` の `<g>` を取り出す
    - 主線の `fill="#000000"` を `fill="#4b3327"` に置換する
    - 色面 SVG の末尾 `</svg>` の直前に、主線 `<g id="linework" ...>` を挿入する
    - 出力: `workplace/char1-transparent-v09.svg`
  - 確認:
    - `rsvg-convert -w 1091 -h 665 workplace/char1-transparent-v09.svg -o /tmp/char1-v09-rsvg.png`
    - `magick /tmp/char1-v09-rsvg.png -background white -flatten workplace/char1-transparent-v09-preview-white.png`
    - `magick workplace/char1-character-tight-guide.png workplace/char1-transparent-v09-preview-white.png +append workplace/char1-compare-guide-v09.png`
  - 現時点の評価:
    - `v09` は、顎のカーブや前髪などの主線が元画像ベースになり、`v01` から `v08` より方向性が良い
    - 色面、リボンの赤線、頬の塗りはまだ粗い
    - 次に改善するなら、`v09` の `potrace` 主線は維持し、色面だけを整理する
- [x] SVG 化では白黒主線マスクの人間レビューを工程に入れる
  - 判断:
    - SVG 化の品質を大きく左右するのは、色面より先に主線マスクである
    - `potrace` 後に違和感を直すより、`potrace` 前の白黒マスク段階で人間レビューを挟む方が効率がよい
    - 今後は、いきなり最終 SVG を作らず、まず白黒主線マスクをレビュー対象として出す
  - 標準工程案:
    - 元画像から対象部分を切り出す
    - 不要な文字、矢印、背景線を白でマスクする
    - 主線だけを白黒化する
    - 白黒マスク PNG を人間レビューする
    - 必要なら、切り出し範囲、マスク範囲、ぼかし、しきい値を調整する
    - OK が出た白黒マスクを `potrace` する
    - その後で色面を作る
    - 色面と主線を合成する
  - レビュー対象ファイル例:
    - `workplace/char1-line-mask-v10-preview.png`
  - 白黒マスクで確認する観点:
    - 頭頂部が切れていないか
    - 顔の輪郭と顎のカーブが元絵どおりか
    - 前髪の線が欠けていないか
    - リボンやツインテールの輪郭が潰れていないか
    - 文字、矢印、青い装飾線など不要な線が混ざっていないか
    - 頬や水彩ムラなど、主線ではないものを拾いすぎていないか
  - 命名案:
    - 次版からは `v11-line-mask-preview.png` のように、まず白黒レビュー用ファイルを作る
    - 人間レビューで OK が出た白黒マスクをもとに、対応する `v11.svg` を生成する
- [x] `workplace/char1-linework-inferred-face-v27.svg` を推定顔輪郭補助線の到達版として記録する
  - 目的:
    - 髪で隠れている顔の輪郭を、後続のセマンティック分割や色面整理で使える補助線として保持する
    - 元画像に見えている主線とは区別し、`inferred` / `construction` 扱いの別レイヤーにする
  - 到達版:
    - `workplace/char1-linework-inferred-face-v27.svg`
    - 確認用: `workplace/char1-linework-inferred-face-v27-preview.png`
  - 元になった判断:
    - `workplace/char1-linework-inferred-face-v26b.svg` に人間が追加した青い楕円ガイドが、位置情報としてよかった
    - `v26b` の青い塗り楕円をそのまま残すのではなく、`v11` の主線 SVG に dashed stroke の補助線として載せ直した
  - 座標変換:
    - `v26b` は Pixelmator Pro 由来で `viewBox="0 0 1454 886"`、主線座標が展開済み
    - `v11` は `viewBox="0 0 1091 665"` で、`potrace` の元主線を保持している
    - `v26b` の大楕円は `cx=736.5, cy=488, rx=398.5, ry=289` 相当
    - `v11` 座標では概ね `cx=552.5, cy=366.2, rx=299.0, ry=216.9` として扱った
  - 実装:
    - `v11` をコピーして `v27` を作成
    - `</svg>` 直前に `<g id="face-outline" data-step="inferred-face-outline">` を追加
    - `face-outline-inferred` は塗りなし、青系 dashed stroke、`opacity="0.9"` の補助線にした
    - SVG 要素としては楕円そのものではなく、4本の cubic Bezier による閉じた楕円近似パスにした
  - 教訓:
    - 見える線は `potrace` で元線を忠実に拾う
    - 見えない輪郭を補完する場合は、元線と混ぜず、必ず `inferred` の別レイヤーにする
    - 補助線は「描き直し」ではなく、後工程で意味を保持するための construction guide として扱う
    - 人間が示した楕円・ガイド線は、そのまま採用するのではなく、座標と意図を読み取り、レビューしやすい補助線へ変換する
