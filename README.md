# igapyon-agent-skills

個人用の Agent Skills を管理するためのリポジトリです。

日本語の Note / Qiita 記事作成と、技術・音楽投稿の伴走型ライティング支援に使う skill を置いています。

## 方針

- skill は `skills/` 配下に置く
- 1 skill = 1 directory
- skill ごとの詳細仕様は各 `SKILL.md` に書く
- skill の具体ルール、例、長めの手順は `references/` 配下に置く
- Note / Qiita 記事 Markdown は、各 writer skill 配下の `references/` を正本として管理する
- skill を新規作成・更新した後は、`SKILL.md` が必要な `references/` を案内していること、必要に応じて `index.json` を参照することを確認する
- repo 全体の運用ルールはこの `README.md` に書く
- 作業メモは repo 直下の `TODO.md` に集約する
- skill ごとの `index.json` は `miku-indexgen` で生成する
- ローカル作業用に `workplace/` を置き、`workplace/.gitkeep` だけを Git 管理下に入れる
- Java / Maven 開発では `.mvn/jvm.config` を repo に含める

## 記事公開の優先順位

技術記事は、まず Note 向けの記事として作成・公開することを優先します。

Note では、みくく担当のテック主記事を一次公開記事として扱います。  
文体は Qiita 寄りの技術記事文体とし、技術内容、使い方、CLI、仕様、手順、コマンド例などをしっかり含めます。

Qiita では、Note のテック主記事をもとに、技術詳細、手順、CLI リファレンス、設定例、コマンド例などをより参照しやすい形で後追い整理します。

従来型の Note 記事も引き続き作成します。  
こちらはうさぴょん担当とし、Note らしい柔らかい文体で、開発背景、使いどころ、利用イメージ、つまずきや意図などを含めた読み物として整えます。

記事の正本管理は従来どおり、媒体ごとに分けます。

- Note 向け記事の正本: `skills/igapyon-note-writer/references/`
- Qiita 技術記事の正本: `skills/igapyon-qiita-writer/references/`

Qiita 側は投稿頻度や下書き作成数に制限がかかる場合があるため、公開は間隔を空けて行います。  
大量の記事移行や連続公開が必要な場合でも、まずこの repo の `references/` に正本を保持し、公開作業は媒体側の制限に合わせて進めます。

## 移行期の writer skill 運用

Note 優先運用への移行期は、掲載媒体ではなく記事タイプで writer skill を選びます。

みくく担当の Note テック主記事は、Note 掲載であっても `igapyon-qiita-writer` を使って作成・整理します。  
これは、文体と情報密度を Qiita 寄りの技術記事として保つためです。

うさぴょん担当の従来型 Note 記事は、`igapyon-note-writer` を使って作成・整理します。  
こちらは、技術詳細を詰め込みすぎず、背景、感触、読み物としての流れを優先します。

記事ファイルの正本配置は、利用した writer skill ではなく掲載媒体に合わせます。  
そのため、`igapyon-qiita-writer` で作成した Note テック主記事でも、Note 掲載用の正本は `skills/igapyon-note-writer/references/` に置きます。

## .gitignore の扱い

macOS が生成する `.DS_Store` は Git 管理対象外とするため、repo 側の `.gitignore` に記載します。

`workplace/` は clone した外部リポジトリ、展開した zip、生成物、検証用ファイルなどを置くローカル作業フォルダです。  
`workplace/` 配下の作業物は Git 管理対象外とし、ディレクトリを維持するための `workplace/.gitkeep` だけを Git 管理下に入れます。

`.codex/skills/` は Codex から利用するためのローカル配備先です。  
この repo では `skills/` 配下を正本として管理し、`.codex/skills/` 配下のコピーは Git 管理対象外とします。

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

Note / Qiita 記事 Markdown は、各 writer skill 配下の `references/` を正本として管理します。

- Note 記事の正本: `skills/igapyon-note-writer/references/`
- Qiita 技術記事の正本: `skills/igapyon-qiita-writer/references/`

`references/general/` は、特定の `miku` 系プロダクトに分類されない一般記事用の置き場です。  
`miku` 系プロダクトの記事は、各 writer skill の `references/<project>/` に置きます。

`workplace/*/docs/articles/` などに記事メモや旧配置の Markdown が残っている場合でも、記事として更新・公開対象にする正本は writer skill 配下の `references/` です。

## docs/articles 集約状況

記事管理は、Qiita 向け記事を `skills/igapyon-qiita-writer/references/`、Note 向け記事を `skills/igapyon-note-writer/references/` に集約し、そこを正本として扱う方針です。

2026-05-06 時点で、`workplace/*/docs/articles/qiita/` 配下の有意な記事本文は、`README.md` と `TEMPLATE.md` を除き、すべて `skills/igapyon-qiita-writer/references/` 側に同一内容で存在することを確認済みです。

対象は次の通りです。

- `miku-abc-player`: 1 件
- `miku-indexgen`: 1 件
- `miku-xlsx2md`: 8 件
- `mikuproject`: 4 件
- `mikuscore`: 2 件

同じく 2026-05-06 時点で、`workplace/*/docs/articles/note/` 配下の有意な記事本文は、`README.md` と `TEMPLATE.md` を除き、すべて `skills/igapyon-note-writer/references/` 側に同一内容で存在することを確認済みです。

対象は次の通りです。

- `miku-abc-player`: 1 件
- `miku-indexgen`: 1 件
- `miku-xlsx2md`: 3 件
- `mikuproject`: 3 件
- `mikuscore`: 2 件

`mikuscore` の記事は、`workplace/docs-articles/mikuscore-devel/` と `workplace/docs-articles/miku-abc-player-devel/vendor/mikuscore/` の両方に重複して存在する場合があります。  
集約先の `references/mikuscore/` では 1 セットとして保持します。

`references/general/` 配下の記事は、`workplace/*/docs/articles/` 由来ではない一般記事を、この repo 側で集約管理するための置き場です。

## 構成

```text
.
├─ skills/
│  ├─ igapyon-qiita-writer/
│  │  ├─ SKILL.md
│  │  └─ references/
│  ├─ igapyon-note-writer/
│  │  ├─ SKILL.md
│  │  └─ references/
│  ├─ igapyon-companion-techpost-writer/
│  │  └─ SKILL.md
│  ├─ igapyon-companion-musicpost-writer/
│  │  └─ SKILL.md
│  ├─ igapyon-github-writer/
│  │  ├─ SKILL.md
│  │  └─ references/
│  ├─ igapyon-miku-soft-developer/
│  │  ├─ SKILL.md
│  │  └─ references/
│  ├─ igapyon-mikuku-agent/
│  │  ├─ SKILL.md
│  │  ├─ assets/
│  │  └─ references/
│  └─ igapyon-repo-conventions/
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

  GitHub PR、GitHub Release、GitHub About に貼る文章の作成向け。明示的に指定した場合に利用する。

- `igapyon-miku-soft-developer`

  miku-soft project の新規作成・既存保守ワークフロー向け。skill の利用を明示的に指定した場合のみ利用し、miku-soft 作成・保守の相談だけでは存在案内に留める。

- `igapyon-mikuku-agent`

  日本語キャラクター agent `みくく` として応答するための会話スタイル向け。明示的に指定した場合に利用する。

- `igapyon-repo-conventions`

  Git / GitHub repository の `.gitignore`、`workplace/`、`.codex/skills/`、Java / Maven 設定、README 運用ルールの整理向け。明示的に指定した場合に利用する。

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
