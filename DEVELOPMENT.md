# Development and Repository Operations

この文書は、igapyon-agent-skills の開発・保守・配備・公開作業に使う運用ガイドです。利用者向けの機能一覧と導入案内は、英語の [README.md](README.md) を参照してください。

従来のルート README にあった運用規則を、この文書へ移しています。リポジトリの保守作業では、この文書の該当節と既存の `GOAL.md`、`TODO.md`、`DECISIONS.md`、`HANDOFF.md` を確認します。

## 方針

- skill は `skills/` 配下に置く
- 1 skill = 1 directory
- skill ごとの詳細仕様は各 `SKILL.md` に書く
- skill の追加・削除や用途の変更時は、この文書の構成図と、`README.md`・`src/assembly/README.md` の一覧・詳細説明を揃える
- skill の具体ルール、例、長めの手順は `references/` 配下に置く
- Note 記事 Markdown は、姉妹リポジトリ `../mikuku-articles/` を正本として管理する
- Qiita 記事 Markdown は、`skills/igapyon-qiita-writer/references/` を正本として管理する
- skill の参照資料の探索方針は [reference discovery policy](docs/policies/reference-discovery.md) に従う。`index.json` は共通必須成果物にしない
- repo 全体の保守・運用ルールはこの `DEVELOPMENT.md` に書き、ルート `README.md` は利用者向けの英語案内とする
- 作業メモは repo 直下の `TODO.md` に集約する
- AI agent 作業を再開する前は、`GOAL.md`、`TODO.md`、`DECISIONS.md`、`HANDOFF.md` を確認する
- ローカル作業用に `workplace/` を置き、`workplace/.gitkeep` だけを Git 管理下に入れる
- Java / Maven 開発では `.mvn/jvm.config` を repo に含める

## バージョン更新

この repo 全体のバージョンは、root の `pom.xml` を正本として管理します。

バージョン形式は `1.YYYYMMDD.N` を基本とし、`YYYYMMDD` はその保守更新日、`N` は同じ日付内の更新番号を表します。  
たとえば 2026-05-21 の最初の保守更新では、repo 全体のバージョンを `1.20260521.1` にします。

repo 全体のバージョンを更新するときは、日付部分に合わせて `skills/igapyon-mikuku-agent/references/VERSION.md` の `Version` も更新します。  
`みくく` のバージョンは `YYYYMMDDx` 形式で、`YYYYMMDD` を repo 全体のバージョンの日付部分と揃えます。  
同じ日付内の更新は、`みくく` 側では `a`, `b`, `c` ... と suffix を進め、repo 全体のバージョンでは対応する `N` を `1`, `2`, `3` ... と進めます。

あわせて `skills/igapyon-miku-scm/scripts/miku-scm-run.mjs` と `skills/igapyon-github-writer/scripts/github-writer-workflow-manifest.mjs` の `PRODUCT_VERSION` も同じ値へ更新します。これらは各skillの `--version` 応答に使う連動値です。

バージョン更新時は、次の値が揃っていることを確認します。

- root の `pom.xml`
  - 例: `<version>1.20260604.1</version>`
- `skills/igapyon-mikuku-agent/references/VERSION.md`
  - 例: `Version: 20260604a`
- `skills/igapyon-miku-scm/scripts/miku-scm-run.mjs` と `skills/igapyon-github-writer/scripts/github-writer-workflow-manifest.mjs`
  - 例: `PRODUCT_VERSION = "1.20260604.1"`
- `mvn clean package` で生成される release archive 名
  - 例: `target/igapyon-agent-skills-1.20260604.1.zip`

`みくく` 側だけを更新したい場合でも、repo 全体の保守更新として扱うなら `pom.xml` も同じ日付に更新します。逆に、repo 全体のリリースや保守更新ではない一時的な確認だけなら、バージョンを更新しません。

`mvn validate`、`mvn generate-resources`、`mvn clean package` では、root版、`みくく` の日付・suffix、2つのskill runnerの `PRODUCT_VERSION` が対応していることを確認します。たとえば `1.20260604.1` には `20260604a`、`1.20260604.2` には `20260604b` を対応させます。

## 複数 OS でのテスト

miku-scm と GitHub Writer は、GitHub Actions で macOS と Windows の両方に対してテストを実行します。Windows の改行コードの違いを見つけた実例と、この構成の価値を [複数 OS でテストする価値](docs/maintenance/github-actions-cross-platform-testing.md) に記録しています。

## 保守時の確認

ビルド・検査には Node.js / npm、Java / Maven、Git、`sh`、`rsync`、`unzip` を使います。Release CI の Java 設定は [.github/workflows/release-archive.yml](.github/workflows/release-archive.yml)、skill ごとの実行環境や追加依存は各 `SKILL.md` と参照資料で確認します。

変更内容に対応する検査を選びます。

| コマンド | 確認する内容 |
| --- | --- |
| `npm run test:skill-index-policy` | 索引方針、配布ファイル照合、代表参照経路 |
| `npm run test:miku-scm` | miku-scm の full suite |
| `npm run test:github-writer` | GitHub Writer の full suite |
| `mvn generate-resources` | バージョン整合と採用した内部索引の再生成 |
| `mvn clean package` | バージョン整合、索引生成、外部 skill 取得、配布 ZIP 作成 |
| `node scripts/check-release-archive.mjs target/igapyon-agent-skills-<version>.zip` | 生成した配布 ZIP の検査 |

`<version>` は `pom.xml` のプロジェクト版に置き換えます。`mvn clean package` の後に ZIP 検査を実行します。外部 skill の取得にはネットワーク接続を使います。

## 記事公開の優先順位

技術記事は、まず Note 向けの記事として作成・公開することを優先します。

Note 記事の本文は、`igapyon-mikuku-agent` を使ってみくく担当の技術エッセイとして執筆します。技術的な説明に、背景、観察、判断、試行錯誤を含め、みくくの文章執筆規則に沿って整えます。

Qiita では、Note 記事をもとに、技術詳細、手順、CLI リファレンス、設定例、コマンド例などをより参照しやすい形で後追い整理します。

記事の正本管理は、媒体ごとに分けます。

- Note 向け記事の正本: `../mikuku-articles/`
  - 公開済み記事: `../mikuku-articles/2026/<MM>/<YYYYMMDD>/`
  - 未公開記事: `../mikuku-articles/2026/draft/`
- Qiita 技術記事の正本: `skills/igapyon-qiita-writer/references/`

Qiita 側は投稿頻度や下書き作成数に制限がかかる場合があるため、公開は間隔を空けて行います。  
Note 記事の下書きや移行中の記事は、`../mikuku-articles/2026/draft/` に平置きで保持し、公開日が決まった段階で日付ディレクトリへ移します。

## 記事執筆と掲載補助の分担

| 作業 | 担当 skill |
| --- | --- |
| Note 記事の本文執筆・推敲、みくくの文体、グラレコ工程 | [igapyon-mikuku-agent](skills/igapyon-mikuku-agent/SKILL.md) |
| Note 正本の管理、掲載メタデータ、ハッシュタグ、公開状態の整備 | [igapyon-note-writer](skills/igapyon-note-writer/SKILL.md) |
| Qiita 記事の執筆・整理、技術的な構成や手順の整理 | [igapyon-qiita-writer](skills/igapyon-qiita-writer/SKILL.md) |

Note 記事の執筆は `igapyon-mikuku-agent` を入口とし、掲載情報や正本管理を扱う際に `igapyon-note-writer` の規則を使います。利用者が `igapyon-qiita-writer` の補助利用を明示した場合は、技術的な説明順や CLI・仕様・手順の整理にその資料を参考にします。

記事ファイルの正本配置は掲載媒体に合わせます。Note 正本は `../mikuku-articles/`、Qiita 正本は `skills/igapyon-qiita-writer/references/` です。

## .gitignore の扱い

macOS が生成する `.DS_Store` は Git 管理対象外とするため、repo 側の `.gitignore` に記載します。

`workplace/` は clone した外部リポジトリ、展開した zip、生成物、検証用ファイルなどを置くローカル作業フォルダです。  
`workplace/` 配下の作業物は Git 管理対象外とし、ディレクトリを維持するための `workplace/.gitkeep` だけを Git 管理下に入れます。

Codex から利用するローカル配備先は `$CODEX_HOME/skills/` です。`CODEX_HOME` が
未指定の場合は `$HOME/.codex` を使います。この repo では `skills/` 配下を正本として
管理し、ローカル配備先のコピーは Git 管理対象外とします。Maven の `package`
フェーズではローカル配備先へ自動コピーしません。

repo 内の `.codex/` は任意のローカル出力用として directory 全体を無視します。

## Codex skill のローカル同期

source とローカル配備先の drift を避けるため、skill 名を一つ指定して同期します。

```sh
sh scripts/sync-codex-skill.sh igapyon-mikuku-agent
sh scripts/sync-codex-skill.sh --check igapyon-mikuku-agent
```

同期は `skills/<skill-name>/` を `$CODEX_HOME/skills/<skill-name>/` へ反映し、source に
ない配備先ファイルを削除します。`.DS_Store` は同期対象外です。`--check` は変更せずに
内容差分、追加、削除の有無を確認します。

別の Codex home を使う場合は明示できます。

```sh
CODEX_HOME=/path/to/codex-home sh scripts/sync-codex-skill.sh igapyon-mikuku-agent
```

スクリプトは skill 名と source の `SKILL.md` を検証し、repository 内の正本から
名前の一致する配備先だけを更新します。

## Codex skills 更新後の反映 tips

Codex skills を更新した後、基本は VS Code のウィンドウ再読み込みで有効になります。

コマンドパレットから実行する場合は、次を実行します。

```text
Developer: Reload Window
```

macOS の通常操作では、次のショートカットでコマンドパレットを開きます。

```text
Cmd+Shift+P
```

その後、`Reload Window` を実行します。

ターミナルから VS Code を操作できる環境では、対象ワークスペースで次のコマンドでも近い動きになります。

```sh
code -r .
```

ただし、`code -r .` は同じウィンドウを再利用して開き直す動きです。拡張や Codex 側の状態更新まで確実に反映したい場合は、VS Code 内の `Developer: Reload Window` を使うのが一番確実です。

## Java / Maven の扱い

Java / Maven を使う repo では、実行時の JVM 設定を repo 側で明示するため、`.mvn/jvm.config` を Git 管理下に入れます。

この repo では、ローカル環境での名前解決やネットワーク挙動を安定させるため、IPv4 を優先する JVM オプションを `.mvn/jvm.config` に記載しています。

## references の扱い

各 skill 配下の `references/` は、skill 利用時に参照しやすいように同梱する参考資料です。

skill を利用する際は、`SKILL.md` を入口とし、具体ルール、例、長めの手順、参照記事、テンプレートなどは必要に応じて各 skill 配下の `references/` を読んで適用します。  
`SKILL.md` には発火条件、基本フロー、参照先の案内を中心に置き、詳細は `references/` 側を利用する方針です。

`skill-creator` などで skill を作成した直後は、必要な具体ルールを `SKILL.md` に詰め込みすぎず、`references/` へ分離します。  
既知の資料へは`SKILL.md`から直接案内し、未知の資料は対象範囲を絞ったファイル一覧・名前検索・本文検索で探します。indexを採用する場合は、用途と保守方法を[全体方針](docs/policies/reference-discovery.md)とbuild設定に記録します。

Note / Qiita 記事 Markdown は、媒体ごとの正本置き場で管理します。

- Note 記事の正本: `../mikuku-articles/`
- Qiita 技術記事の正本: `skills/igapyon-qiita-writer/references/`

みくく担当の Note 記事は、正本を `../mikuku-articles/` に置きます。
一方で、みくく文体の参照例として使うため、公開済みまたは参照価値の高い記事コピーを `skills/igapyon-mikuku-agent/examples/articles/` に同期して置きます。

このコピーは文体・構成の参照用です。記事本文、URL、掲載用属性を更新する場合は、まず Note 正本側を更新し、その後で `igapyon-mikuku-agent` 側の writing example にコピーして同期します。

`../mikuku-articles/2026/draft/` は、日付未確定または未公開の Note 記事を階層なしで置く場所です。  
公開済み Note 記事は、`../mikuku-articles/2026/<MM>/<YYYYMMDD>/` 配下の記事パッケージとして管理します。

`workplace/*/docs/articles/` やこの repo の旧配置に記事メモや Markdown が残っている場合でも、Note 記事として更新・公開対象にする正本は `../mikuku-articles/` 側です。

旧 `workplace/*/docs/articles/` からの記事集約については、[2026-05-06 時点の確認記録](docs/maintenance/article-source-migration-2026-05-06.md)を参照してください。

## 構成

```text
.
├─ .github/workflows/       CI・Release workflow
├─ .mvn/jvm.config          Maven 実行時の JVM 設定
├─ skills/
│  ├─ igapyon-agent-state-management/
│  ├─ igapyon-companion-musicpost-writer/
│  ├─ igapyon-companion-techpost-writer/
│  ├─ igapyon-diary-writer/
│  ├─ igapyon-ffmpeg-helper/
│  ├─ igapyon-github-writer/
│  ├─ igapyon-miku-daybook/
│  ├─ igapyon-miku-scm/
│  ├─ igapyon-miku-soft-developer/
│  ├─ igapyon-mikuku-agent/
│  ├─ igapyon-note-writer/
│  ├─ igapyon-qiita-writer/
│  ├─ igapyon-repo-conventions/
│  ├─ igapyon-reviewer/
│  └─ igapyon-skill-compactor/
├─ config/                 索引の採用方針
├─ docs/                   方針・計画・保守記録
├─ scripts/                同期・索引生成・配布検査
├─ lib/                    同梱 generator
├─ src/assembly/           配布用 README と ZIP 収録定義
├─ target/                 staging・ZIP などの生成物
├─ workplace/              ローカル作業物
├─ package.json            Node.js の検査コマンド
├─ pom.xml                 全体バージョンと配布ビルド定義
├─ INSTALL.md              配布 ZIP からの導入手順
├─ DEVELOPMENT.md          開発・保守・配備・公開の運用規則
├─ GOAL.md
├─ TODO.md
├─ DECISIONS.md
├─ HANDOFF.md
└─ README.md               利用者向けの英語案内
```

## daybookの記録モデルと参考資料

`igapyon-miku-daybook` の task と activities の役割整理では、MIT OpenCourseWare の [Guidelines for Keeping a Laboratory Notebook](https://ocw.mit.edu/courses/7-16-experimental-molecular-biology-biotechnology-ii-spring-2005/b4c64ac11fc0a68466af7e025e29bf3e_lab_notebook.pdf) を参考にしています。これは [7.16 Experimental Molecular Biology: Biotechnology II（Spring 2005）](https://ocw.mit.edu/courses/7-16-experimental-molecular-biology-biotechnology-ii-spring-2005/) の公開教材です。

daybook では、課題管理に研究ノートと意思決定記録を組み合わせ、次のように役割を割り付けます。

- **task**：仕事ごとの目的、現在の結論・採用方針、最新状態、未解決事項、次の行動を管理します。重要な変更の短い履歴と、関連する活動へのリンクを含めます。
- **activities**：日付ごとに、取り組んだこと、試した方法、うまくいかなかったこと、検討した案、判断理由、その時点の到達点を記録します。結論が出なかった検討も活動です。読みやすい量の試行錯誤は同じ項目に収め、長い詳細は資料へ分けてリンクします。

教材の記録要素と、スキルの編集規則・既存ファイル構成の対応は次のとおりです。

| 教材の記録要素 | daybookでの対応 |
| --- | --- |
| 日付・題名 | `activities/activity-YYYYMMDD.md` 内に、一つの作業や出来事を一項目として記録 |
| 目的 | task に継続する目的を置き、activities にその日に取り組んだ目的を必要に応じて記載 |
| 方法・手順と変更 | activities に試した方法と変更の経緯を記録し、参照した手順や資料へリンク |
| 観察・結果 | activities に実行結果、失敗、不確かな結果を記録 |
| 考察・結論 | activities に当時の判断と理由を残し、task に現在採用している結論を反映 |
| 次にすること | activities にその時点の残課題を残し、task の次の行動を更新 |
| データや資料の添付 | 既存の `attachments/<record-key>/` に資料を置き、記録から相対リンク |

この分担は [SKILL.md](skills/igapyon-miku-daybook/SKILL.md) と [operations.md](skills/igapyon-miku-daybook/references/operations.md#task-and-activity-responsibilities) のエージェント向け編集指示として実装しています。本文に経緯や理由を記述し、既存の task ID と相対リンクで関連づけます。方針が変わったときは task を最新化し、以前の activities は当時の経緯として保持します。記録内容は会話や確認できた結果に基づいてまとめます。

task を最新状態として別管理すること、優先度・進捗・予定期間の管理、Markdown 記録間のリンクは daybook 側で加えた設計です。day-plan は task と schedule から既存の生成スクリプトが作る予定のスナップショットであり、教材にある週次の振り返りを自動化するものではありません。

task の `planning_state` は `planned` と `backlog` を分けます。planned の task は従来どおり日付をもとに「今日の作業」などへ表示し、Backlog は専用欄へ表示します。Backlog は進捗 `status` と別の属性で、日付なしでも登録できます。新しい task は `planned` を明記し、既存 task で属性が省略されている場合も planned として読み取ります。未着手や日付なしだけを理由にBacklogへ一括分類しません。

利用者は「録音整理を日付なしのBacklogとして登録して」「Backlogのこのtaskを10月20日に予定して」のように依頼できます。既存taskを予定化する時は同じIDの分類・予定日を更新し、別taskを重複作成しません。既存データを分類するときは、対象daybookのgeneratorを更新した後に明示された記録だけを変更します。手順は [task planning migration guide](skills/igapyon-miku-daybook/references/task-planning-migration.md) を参照してください。

GitHub Issue を daybook に取り込む場合のローカル CLI の前提確認と導入手順は、[Issue 取り込み手順](skills/igapyon-miku-daybook/references/issue-import.md#1-check-local-cli-prerequisites-and-prepare-the-intake-files)を参照してください。

### URLから関連する task を探す

「このURL、関連する task があるかな？」と頼むと、URLの内容を読み、daybook 内の候補と関連する理由を探します。URLを読む・要約するだけの依頼から task の探索や記録変更は始めません。記録も希望する場合は、「関連 task を探して、この資料を task に紐づけ、今日の活動にも調べた経緯を記録して」のように依頼してください。手順は[URLと関連 task の確認](skills/igapyon-miku-daybook/references/url-task-lookup.md)を参照してください。

## daybook taskの日付項目の移行

2026-10-05、このリポジトリの `igapyon-miku-daybook` source に予定期間の日付項目と移行用の読み取り処理を実装しました。対象daybookのデータ移行前に、導入済みのスキルとdaybook側の `scripts/day-plan.mjs` / `scripts/generate-day-plan.mjs` の両方が新しい項目に対応していることを確認してください。

新しいtaskでは、包含的な予定期間を `planned_start_date` と `planned_end_date` で表します。1日だけの予定は同じ日付を使い、実際の完了は従来どおり `status` と `completed` で記録します。

| 旧項目・情報 | 新しい扱い |
| --- | --- |
| `planned_date` | `planned_start_date` へ移行 |
| `due` | 意味を確認して `planned_end_date` の候補へ移行。実際の締切情報は本文・履歴にも保持 |
| `due_month` / `planned_week` | そのまま保持し、日付へ推測変換しない |

旧仕様にあった期限キーは `due` で、`due_date` ではありません。day-plan生成処理は移行中に旧2項目を別名として読み取りますが、taskファイルを自動変更しません。新旧項目が両方あり値が異なる記録は生成時にエラーとして示します。

利用者が行う具体的な確認、バックアップ、既存taskの編集、別出力先でのday-plan確認については、配布スキルの [task date migration guide](skills/igapyon-miku-daybook/references/task-date-migration.md) を参照してください。planning state の導入・分類手順は [task planning migration guide](skills/igapyon-miku-daybook/references/task-planning-migration.md) にあります。対象daybookのデータとスクリプトの変更は、利用者が更新版を導入した後に別途行います。

## 採用したindex.jsonの更新

`config/skill-index-policy.json`に採用と記録した内部skillだけを、次のコマンドで再生成します。

```sh
mvn generate-resources
```

現在、内部skillでは `igapyon-qiita-writer` の記事選択用indexを、任意の横断的な記事探索に使うため保持しています。2026-10-14の代表3課題の比較では、アプリケーション構成の全体記事とtopic bank（題材集）を選び分ける場面で効果が見られました。既知の題材は直接参照・範囲を絞った検索から探し、複数の記事群を見渡す際にindexを補助として使います。比較の範囲と結果は[保持判断の記録](docs/maintenance/index-json-migration-inventory.md#qiita-retention-evaluation)を参照してください。token数や所要時間の削減は測定していません。

ほかのskill rootに `index.json` を置く場合は、先に[全体方針](docs/policies/reference-discovery.md)に照らして採用理由とconsumerを決めてください。

リリース用packageの中でも、採用対象だけを再生成します。

```sh
mvn clean package
```

採用した生成物は、正規のgeneratorで更新し、skillと一緒にコミットします。未採用indexはbuildやstagingで自動生成しません。

生成後の drift 確認は次を実行します。

```sh
sh scripts/check-generated-indexes.sh
```

この確認は、タグ作成前のローカル確認や通常の開発フローで利用します。採用したindexのdriftと、未宣言のskill root indexを検出します。

## Release archive

GitHub Release に添付する利用者向け archive は、次のコマンドで作成します。

```sh
mvn clean package
```

生成物は `target/igapyon-agent-skills-<version>.zip` です。

再現性を保つため、ZIP内の全エントリの更新日時は `2020-01-01 00:00:00 UTC` に固定します。

archive には `skills/`、配布用の `README.md` と `INSTALL.md`、`LICENSE`、
`EXTERNAL_SKILLS.lock` を含めます。ビルド用ソースはリポジトリとGitHubの標準ソース
アーカイブから参照し、このRelease assetは選択したスキルをCodex skills directoryへ
導入するための配布物として扱います。

ZIP内の `README.md` は [src/assembly/README.md](src/assembly/README.md) をコピーした導入案内です。ルート `README.md` は利用者向けに機能と導入方法を説明し、保守・運用ルールはこの `DEVELOPMENT.md` にまとめます。

release archive には、この repo の `skills/` に加えて、外部管理の miku-soft 系 skill も同梱します。
外部 skill は `mvn package` の `prepare-package` フェーズで `target/release-staging/skills/` に取得し、archive 化します。
生成した `EXTERNAL_SKILLS.lock` にrepository、ref、skill名を記録します。各skillの採用状態に沿ってsourceから配布し、外部skillのskill root indexも `config/skill-index-policy.json` に従って検査します。現在の外部11 skillは、補助的なファイル一覧indexを削除したsourceを固定SHAで同梱しています。stagingでは全skillのindexを再生成しません。製品が出力するindexは、各製品の仕様に従って扱います。
取得元は `pom.xml` の `external.*` properties で固定します。

同梱する外部 skill は次の通りです。

版表記は確認済みの上流Release・版情報です。実際に取り込むsourceは、`pom.xml` と生成した `EXTERNAL_SKILLS.lock` のコミットSHAで特定します。

- `miku-indexgen-skills` `v1.7.1`: `skills/igapyon-miku-indexgen/`
- `miku-text-bundle-skills` `v1.6.0`: `skills/igapyon-miku-text-bundle/`
- `miku-repo-bundle-skills` `v0.6.0` (experimental): `skills/igapyon-miku-repo-bundle/`
- `miku-text-file-ops-skills` `v0.6.0`: `skills/igapyon-miku-text-file-ops/`
- `miku-prompt-lint-skills` `v0.8.0`: `skills/igapyon-miku-prompt-lint/`
- `miku-ai-assistant-builder-skills` `v0.14.0`: `skills/igapyon-miku-ai-assistant-builder/`
- `miku-ms-office-skills` `v0.7.3`: `skills/igapyon-miku-ms-office/`
- `miku-md2formats-skills` `v0.3.6`: `skills/igapyon-miku-md2formats/`
- `miku-json2xlsx-skills` `v0.5.0`: `skills/igapyon-miku-json2xlsx/`
- `miku-project-skills` `v1.1.2`: `skills/igapyon-miku-project/`
- `miku-score-skills` `v0.6.1`: `skills/igapyon-miku-score/`

GitHub では `v*` tag が push されたときに GitHub Actions で `mvn clean package` を実行し、
生成されたzipの内容を検査してからGitHub Release assetとして添付します。archiveのindex要件は採用状態に従い、未採用indexをpackage処理で生成しません。配布zipからMaven packageを再実行する構成ではありません。
archive検査では、内部15 skillの配布ファイル集合と内容をsourceと照合し、展開したZIP内で14 skillの代表参照経路も確認します。外部11 skillは現行pinのlock・index検査を行いますが、外部sourceとの全ファイル照合は新ref統合時の別工程です。

## 同梱スキル・ライブラリの更新確認と取り込み

このリポジトリで「同梱スキルの更新を確認して」「同梱ライブラリの更新状況をチェックして」
などと依頼された場合は、上流の更新確認、更新がある取得元の設定反映、配布 ZIP の生成・検査までを
依頼の範囲として扱います。更新がなければ、その確認結果を報告します。
利用者が「調査だけ」「変更不要」などと明示した場合は、その指定に従います。

1. 現在のブランチと作業ツリー、`pom.xml` の `external.*` properties、
   `config/skill-index-policy.json` の対応する pin を確認します。
2. 同梱対象の各上流リポジトリについて、既定ブランチの最新 HEAD と現在の pin を照合し、
   コミットとファイルの差分、確認できる最新 Release・版情報を調べます。
   この repo の取得元は既定ブランチの確認時点の最新コミットを使い、40桁の SHA で固定します。
3. HEAD が pin と異なる対象は、`pom.xml` と `config/skill-index-policy.json` を同じ SHA へ更新します。
   バージョン番号だけの更新や、同梱ファイルの内容が変わらない merge による HEAD 更新も取り込み対象です。
   この文書の外部 skill の版表記は、確認できた最新 Release・版情報に合わせます。
   `README.md` と配布用 `src/assembly/README.md` の skill 一覧・用途・成果物の説明も、取得した各 `SKILL.md` に合わせます。
   ルート `README.md` の外部 skill 参照リンクも、更新後の固定SHAを指すように揃えます。
4. 設定を更新したら `mvn package` で staging と配布 ZIP を生成し、
   生成された `EXTERNAL_SKILLS.lock` が更新後の pin を記録していることを確認します。
   続いて `node scripts/check-release-archive.mjs target/igapyon-agent-skills-<version>.zip`
   を実行します。`<version>` は現在の `pom.xml` のプロジェクト版に置き換えます。
5. `git diff --check` と関連差分・作業ツリーを確認し、更新した同梱対象、確認時点、
   生成 ZIP、検証結果を報告します。取り込みと検証が完了してから、同梱対象を最新化したと報告します。

この手順では、依頼時に確認した最新コミットを固定して取り込みます。
親リポジトリのバージョン更新、commit、push、tag、Release 公開、ローカル skill 配備は、
それぞれの利用者指示と対応する運用ルールに従います。

## 厳選 text bundle

AI へ渡す参照素材や、Web UI インタフェースへ内容をコピー＆ペーストして利用するための軽量な確認用 bundle として、厳選した skill だけを text bundle 化できます。

```sh
scripts/build-text-bundle-selection.sh
```

このスクリプトは、release staging 内の `igapyon-miku-text-bundle` runtime を使い、選んだ skill directory だけを `workplace/text-bundle-dist/` に text bundle として出力します。  
あわせて、取り回しやすい zip として `workplace/igapyon-agent-skills-bundle-selection-<version>.zip` も生成します。

現在の厳選対象は次の通りです。

- `skills/igapyon-mikuku-agent/`
- `skills/igapyon-skill-compactor/`
- `skills/igapyon-agent-state-management/`
- `skills/igapyon-github-writer/`

`igapyon-miku-text-bundle` runtime がまだ release staging にない場合は、スクリプト内で `mvn package` を実行して staging を準備します。通常の release archive は利用者向けの skill 配布物であり、この厳選 text bundle はブラウザ上のチャットや Web UI へ貼り付けて使いやすくするための、AI 参照・確認・持ち運び用の小さな補助成果物です。
