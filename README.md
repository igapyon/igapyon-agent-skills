# igapyon-agent-skills

個人用の Agent Skills を管理するためのリポジトリです。

日本語の Note / Qiita 記事作成と、技術・音楽投稿の伴走型ライティング支援に使う skill を置いています。

## 方針

- skill は `skills/` 配下に置く
- 1 skill = 1 directory
- skill ごとの詳細仕様は各 `SKILL.md` に書く
- skill の具体ルール、例、長めの手順は `references/` 配下に置く
- Note 記事 Markdown は、姉妹リポジトリ `../mikuku-articles/` を正本として管理する
- Qiita 記事 Markdown は、`skills/igapyon-qiita-writer/references/` を正本として管理する
- skill を新規作成・更新した後は、`SKILL.md` が必要な `references/` を案内していること、必要に応じて `index.json` を参照することを確認する
- repo 全体の運用ルールはこの `README.md` に書く
- 作業メモは repo 直下の `TODO.md` に集約する
- skill ごとの `index.json` は `miku-indexgen` で生成する
- ローカル作業用に `workplace/` を置き、`workplace/.gitkeep` だけを Git 管理下に入れる
- Java / Maven 開発では `.mvn/jvm.config` を repo に含める

## バージョン更新

この repo 全体のバージョンは、root の `pom.xml` を正本として管理します。

バージョン形式は `1.YYYYMMDD.N` を基本とし、`YYYYMMDD` はその保守更新日、`N` は同じ日付内の更新番号を表します。  
たとえば 2026-05-21 の最初の保守更新では、repo 全体のバージョンを `1.20260521.1` にします。

repo 全体のバージョンを更新するときは、日付部分に合わせて `skills/igapyon-mikuku-agent/references/VERSION.md` の `Version` も更新します。  
`みくく` のバージョンは `YYYYMMDDx` 形式で、`YYYYMMDD` を repo 全体のバージョンの日付部分と揃えます。  
同じ日付内の更新は、`みくく` 側では `a`, `b`, `c` ... と suffix を進め、repo 全体のバージョンでは対応する `N` を `1`, `2`, `3` ... と進めます。

バージョン更新時は、次の両方を確認します。

- root の `pom.xml`
  - 例: `<version>1.20260604.1</version>`
- `skills/igapyon-mikuku-agent/references/VERSION.md`
  - 例: `Version: 20260604a`
- `mvn clean package` で生成される release archive 名
  - 例: `target/igapyon-agent-skills-1.20260604.1.zip`

`みくく` 側だけを更新したい場合でも、repo 全体の保守更新として扱うなら `pom.xml` も同じ日付に更新します。逆に、repo 全体のリリースや保守更新ではない一時的な確認だけなら、バージョンを更新しません。

`mvn generate-resources` や `mvn clean package` では、`pom.xml` の `1.YYYYMMDD.N` と `skills/igapyon-mikuku-agent/references/VERSION.md` の `YYYYMMDDx` が対応していることを `validate` phase で確認します。たとえば `1.20260604.1` には `20260604a`、`1.20260604.2` には `20260604b` を対応させます。

## 記事公開の優先順位

技術記事は、まず Note 向けの記事として作成・公開することを優先します。

Note では、みくく担当のテック主記事を一次公開記事として扱います。  
文体は Qiita 寄りの技術記事文体とし、技術内容、使い方、CLI、仕様、手順、コマンド例などをしっかり含めます。

Qiita では、Note のテック主記事をもとに、技術詳細、手順、CLI リファレンス、設定例、コマンド例などをより参照しやすい形で後追い整理します。

従来型の Note 記事も引き続き作成します。  
こちらはうさぴょん担当とし、Note らしい柔らかい文体で、開発背景、使いどころ、利用イメージ、つまずきや意図などを含めた読み物として整えます。

記事の正本管理は、媒体ごとに分けます。

- Note 向け記事の正本: `../mikuku-articles/`
  - 公開済み記事: `../mikuku-articles/2026/<MM>/<YYYYMMDD>/`
  - 未公開記事: `../mikuku-articles/2026/draft/`
- Qiita 技術記事の正本: `skills/igapyon-qiita-writer/references/`

Qiita 側は投稿頻度や下書き作成数に制限がかかる場合があるため、公開は間隔を空けて行います。  
Note 記事の下書きや移行中の記事は、`../mikuku-articles/2026/draft/` に平置きで保持し、公開日が決まった段階で日付ディレクトリへ移します。

## 移行期の writer skill 運用

Note 優先運用への移行期は、掲載媒体ではなく記事タイプで writer skill を選びます。

みくく担当の Note テック主記事は、Note 掲載であっても `igapyon-qiita-writer` を使って作成・整理します。  
これは、文体と情報密度を Qiita 寄りの技術記事として保つためです。

うさぴょん担当の従来型 Note 記事は、`igapyon-note-writer` を使って作成・整理します。  
こちらは、技術詳細を詰め込みすぎず、背景、感触、読み物としての流れを優先します。

記事ファイルの正本配置は、利用した writer skill ではなく掲載媒体に合わせます。  
そのため、`igapyon-qiita-writer` で作成した Note テック主記事でも、Note 掲載用の正本は `../mikuku-articles/` に置きます。

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
また、参照資料の全体像を探す必要がある skill では、`SKILL.md` に `index.json` を discovery index として使う旨を明記します。

Note / Qiita 記事 Markdown は、媒体ごとの正本置き場で管理します。

- Note 記事の正本: `../mikuku-articles/`
- Qiita 技術記事の正本: `skills/igapyon-qiita-writer/references/`

みくく担当の Note テック主記事は、正本を `../mikuku-articles/` に置きます。  
一方で、みくく文体の参照例として使うため、公開済みまたは参照価値の高い記事コピーを `skills/igapyon-mikuku-agent/examples/articles/` に同期して置きます。

このコピーは文体・構成の参照用です。記事本文、URL、掲載用属性を更新する場合は、まず Note 正本側を更新し、その後で `igapyon-mikuku-agent` 側の writing example にコピーして同期します。

`../mikuku-articles/2026/draft/` は、日付未確定または未公開の Note 記事を階層なしで置く場所です。  
公開済み Note 記事は、`../mikuku-articles/2026/<MM>/<YYYYMMDD>/` 配下の記事パッケージとして管理します。

`workplace/*/docs/articles/` やこの repo の旧配置に記事メモや Markdown が残っている場合でも、Note 記事として更新・公開対象にする正本は `../mikuku-articles/` 側です。

## docs/articles 集約状況

記事管理は現在、Qiita 向け記事を `skills/igapyon-qiita-writer/references/`、Note 向け記事を `../mikuku-articles/` に集約し、そこを正本として扱う方針です。

2026-05-06 時点で、`workplace/*/docs/articles/qiita/` 配下の有意な記事本文は、`README.md` と `TEMPLATE.md` を除き、すべて `skills/igapyon-qiita-writer/references/` 側に同一内容で存在することを確認済みです。

対象は次の通りです。

- `miku-abc-player`: 1 件
- `miku-indexgen`: 1 件
- `miku-xlsx2md`: 8 件
- `mikuproject`: 4 件
- `mikuscore`: 2 件

同じく 2026-05-06 時点で、`workplace/*/docs/articles/note/` 配下の有意な記事本文は、`README.md` と `TEMPLATE.md` を除き、いったん `skills/igapyon-note-writer/references/` 側に同一内容で集約済みであることを確認しました。現在は、公開済み記事を含む Note 正本を `../mikuku-articles/` 側へ移しています。

対象は次の通りです。

- `miku-abc-player`: 1 件
- `miku-indexgen`: 1 件
- `miku-xlsx2md`: 3 件
- `mikuproject`: 3 件
- `mikuscore`: 2 件

`mikuscore` の記事は、`workplace/docs-articles/mikuscore-devel/` と `workplace/docs-articles/miku-abc-player-devel/vendor/mikuscore/` の両方に重複して存在する場合があります。  
Note 正本側では、`../mikuku-articles/` に 1 セットとして保持します。

一般記事の Note 下書きは、`../mikuku-articles/2026/draft/` に置きます。

## 構成

```text
.
├─ skills/
│  ├─ igapyon-qiita-writer/
│  │  ├─ SKILL.md
│  │  └─ references/
│  ├─ igapyon-note-writer/
│  │  ├─ SKILL.md
│  │  └─ templates/
│  ├─ igapyon-companion-techpost-writer/
│  │  └─ SKILL.md
│  ├─ igapyon-companion-musicpost-writer/
│  │  └─ SKILL.md
│  ├─ igapyon-github-writer/
│  │  ├─ SKILL.md
│  │  └─ references/
│  ├─ igapyon-diary-writer/
│  │  ├─ SKILL.md
│  │  └─ references/
│  ├─ igapyon-ffmpeg-helper/
│  │  ├─ SKILL.md
│  │  └─ references/
│  ├─ igapyon-agent-state-management/
│  │  ├─ SKILL.md
│  │  ├─ references/
│  │  └─ templates/
│  ├─ igapyon-miku-soft-developer/
│  │  ├─ SKILL.md
│  │  └─ references/
│  ├─ igapyon-mikuku-agent/
│  │  ├─ SKILL.md
│  │  ├─ assets/
│  │  ├─ references/
│  │  ├─ templates/
│  │  └─ examples/
│  ├─ igapyon-repo-conventions/
│  │  ├─ SKILL.md
│  │  └─ references/
│  ├─ igapyon-reviewer/
│  │  ├─ SKILL.md
│  │  └─ references/
│  └─ igapyon-skill-compactor/
│     ├─ SKILL.md
│     └─ references/
├─ pom.xml
├─ TODO.md
└─ README.md
```

## 現在の skill

- `igapyon-qiita-writer`

  Qiita 向けの日本語技術記事の作成、整理、改善向け。明示的に指定した場合、または Qiita 記事化の意図が明確な場合に利用する。

- `igapyon-note-writer`

  Note 向けの日本語記事の作成、整理、改善向け。明示的に指定した場合、または Note 記事化の意図が明確な場合に利用する。

- `igapyon-companion-techpost-writer`

  技術系日本語投稿の伴走、最小整理、全文再構成向け。明示的に指定した場合、または伴走型の最小整理が明確に求められた場合に利用する。

- `igapyon-companion-musicpost-writer`

  音楽系日本語投稿の伴走、最小整理、全文再構成向け。明示的に指定した場合、または伴走型の最小整理が明確に求められた場合に利用する。

- `igapyon-github-writer`

  GitHub PR、GitHub Release、GitHub About に貼る文章の作成向け。明示的に指定した場合に利用する。作文した Markdown は、通常の応答に加えて、ローカルの `workplace/github-writer/` に保存する。`workplace/` がなく `temp/` がある場合のみ `temp/github-writer/` を使い、どちらもなければ `workplace/github-writer/` を作成する。明示指示がある場合に限り、作成済み PR 文面をローカル Git commit message に反映する workflow も扱う。

- `igapyon-diary-writer`

  igapyon diary repository の日記エントリ作成・更新向け。明示的に指定した場合、または diary repository の作業が明確な場合に利用する。

- `igapyon-ffmpeg-helper`

  H4essential のオーケストラ録音から、切り出し、単純ゲイン調整、必要なら結合、静止画付き YouTube 用動画作成までの個人用 FFmpeg ワークフロー向け。明示的に指定した場合に利用する。

- `igapyon-agent-state-management`

  AI エージェント作業用の `GOAL.md`、`TODO.md`、`DECISIONS.md`、`HANDOFF.md` による軽量な状態管理ファイルの作成・整理・運用向け。発火は `igapyon-agent-state-management` の明示、または `igapyon 状態管理`、`igapyon 作業状態`、`igapyon 作業再開`、`igapyon goal`、`igapyon todo`、`igapyon handoff` などの `igapyon` 付き合言葉を基本とする。`igapyon 作業再開` では、状態管理ファイルを新規作成せず、まず既存の repo 状態、`TODO.md`、`GOAL.md`、`DECISIONS.md`、`HANDOFF.md` などを読んで再開ポイントを整理する。

  名前を思い出せない場合は、`igapyon 状態管理` または `igapyon 作業再開` を合言葉として使う。

- `igapyon-miku-soft-developer`

  miku-soft project の新規作成・既存保守ワークフロー向け。skill の利用を明示的に指定した場合のみ利用し、miku-soft 作成・保守の相談だけでは存在案内に留める。

- `igapyon-mikuku-agent`

  日本語キャラクター agent `みくく` として応答するための会話スタイル向け。明示的に指定した場合に利用する。

- `igapyon-repo-conventions`

  Git / GitHub repository の `.gitignore`、`workplace/`、`.codex/skills/`、Java / Maven 設定、README 運用ルールの整理向け。明示的に指定した場合に利用する。

- `igapyon-reviewer`

  コード、記事、ドキュメント、UI 文言、CLI 文言などのレビュー向け。明示的に `igapyon-reviewer` の利用を指定した場合に利用する。

- `igapyon-skill-compactor`

  肥大化した Agent Skill の token-efficiency 設計、分割、参照化、蒸留、チェックリスト化、tool 化判断向け。明示的に指定した場合、または Agent Skill の compact / slim / token bloat reduction が明確な場合に利用する。

## index.json の更新

各 skill の `index.json` を更新する場合は、次のコマンドで `skills/` 配下をまとめて再生成します。

```sh
mvn generate-resources
```

ビルド全体とあわせて更新する場合は、次のコマンドでも `index.json` を更新できます。

```sh
mvn clean package
```

生成された `index.json` は、skill と一緒にコミットします。

生成後の drift 確認は次を実行します。

```sh
sh scripts/check-generated-indexes.sh
```

この drift 確認は、タグ作成前のローカル確認や通常の開発フローで利用します。
release workflow は `mvn clean package` で archive 内の `index.json` を再生成するため、
commit 済み index との差分だけを理由に release を停止しません。

## Release archive

GitHub Release に添付する利用者向け archive は、次のコマンドで作成します。

```sh
mvn clean package
```

生成物は `target/igapyon-agent-skills-<version>.zip` です。

archive には `README.md`、`INSTALL.md`、`LICENSE`、`pom.xml`、`.mvn/`、`lib/`、
`src/assembly/`、`skills/`、`scripts/`、`EXTERNAL_SKILLS.lock` を含めます。
利用者は archive を展開し、`INSTALL.md` の手順で利用する skill 名を指定して自分の
Codex skills directory へ同期します。

release archive には、この repo の `skills/` に加えて、外部管理の miku-soft 系 skill も同梱します。
外部 skill は `mvn package` の `prepare-package` フェーズで `target/release-staging/skills/` に取得し、archive 化します。
生成した `EXTERNAL_SKILLS.lock` に repository、ref、skill 名を記録します。展開済み archive から同じ POM で再 package する場合は、lock と一致する同梱済み外部 skill を再利用します。
release staging に全 skill をそろえた後、同梱した index generator で staging 内の `index.json` を一括更新し、外部 skill も含めた archive 内の discovery index を整合させます。
取得元は `pom.xml` の `external.*` properties で固定します。

同梱する外部 skill は次の通りです。

- `miku-indexgen-skills` `v1.6.2`: `skills/igapyon-miku-indexgen/`
- `miku-text-bundle-skills` `v1.6.0`: `skills/igapyon-miku-text-bundle/`
- `miku-repo-bundle-skills` `v0.5.0.1` (experimental): `skills/igapyon-miku-repo-bundle/`
- `miku-grep-skills` `v0.10.1.1` (experimental): `skills/igapyon-miku-grep/`
- `miku-prompt-lint-skills` `v0.5.0`: `skills/igapyon-miku-prompt-lint/`
- `miku-ai-assistant-builder-skills` `v0.13.0`: `skills/igapyon-miku-ai-assistant-builder/`
- `miku-ms-office-skills` `v0.7.1`: `skills/igapyon-miku-ms-office/`
- `miku-json2xlsx-skills` `v0.5.0`: `skills/igapyon-miku-json2xlsx/`
- `miku-readfile-skills` `v0.5.0.2`: `skills/miku-readfile/`
- `mikuproject-skills` `v0.8.1.1`: `skills/mikuproject/`
- `mikuscore-skills` `v0.1.0`: `skills/mikuscore/`

GitHub では `v*` tag が push されたときに GitHub Actions で `mvn clean package` を実行し、
生成された zip を GitHub Release asset として添付します。archive 内の `index.json` は
package 処理で再生成されます。

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
