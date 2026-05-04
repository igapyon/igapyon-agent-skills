# igapyon-agent-skills

個人用の Agent Skills を管理するためのリポジトリです。

日本語の Qiita / Note 記事作成と、技術・音楽投稿の伴走型ライティング支援に使う skill を置いています。

## 方針

- skill は `skills/` 配下に置く
- 1 skill = 1 directory
- skill ごとの詳細仕様は各 `SKILL.md` に書く
- skill の具体ルール、例、長めの手順は `references/` 配下に置く
- skill を新規作成・更新した後は、`SKILL.md` が必要な `references/` を案内していること、必要に応じて `index.json` を参照することを確認する
- repo 全体の運用ルールはこの `README.md` に書く
- 作業メモは repo 直下の `TODO.md` に集約する
- skill ごとの `index.json` は `miku-indexgen` で生成する
- ローカル作業用に `workplace/` を置き、`workplace/.gitkeep` だけを Git 管理下に入れる
- Java / Maven 開発では `.mvn/jvm.config` を repo に含める

## .gitignore の扱い

macOS が生成する `.DS_Store` は Git 管理対象外とするため、repo 側の `.gitignore` に記載します。

`workplace/` は clone した外部リポジトリ、展開した zip、生成物、検証用ファイルなどを置くローカル作業フォルダです。  
`workplace/` 配下の作業物は Git 管理対象外とし、ディレクトリを維持するための `workplace/.gitkeep` だけを Git 管理下に入れます。

`.codex/skills/` は Codex から利用するためのローカル配備先です。  
この repo では `skills/` 配下を正本として管理し、`.codex/skills/` 配下のコピーは Git 管理対象外とします。

## Java / Maven の扱い

Java / Maven を使う repo では、実行時の JVM 設定を repo 側で明示するため、`.mvn/jvm.config` を Git 管理下に入れます。

この repo では、ローカル環境での名前解決やネットワーク挙動を安定させるため、IPv4 を優先する JVM オプションを `.mvn/jvm.config` に記載しています。

## references の扱い

各 skill 配下の `references/` は、skill 利用時に参照しやすいように同梱する参考資料です。

skill を利用する際は、`SKILL.md` を入口とし、具体ルール、例、長めの手順、参照記事、テンプレートなどは必要に応じて各 skill 配下の `references/` を読んで適用します。  
`SKILL.md` には発火条件、基本フロー、参照先の案内を中心に置き、詳細は `references/` 側を利用する方針です。

`skill-creator` などで skill を作成した直後は、必要な具体ルールを `SKILL.md` に詰め込みすぎず、`references/` へ分離します。  
また、参照資料の全体像を探す必要がある skill では、`SKILL.md` に `index.json` を discovery index として使う旨を明記します。

特に、`references/` 以下の `miku` から始まるディレクトリ内のファイルは、ほかのリポジトリに正本がある記事やメモを、この repo で利用しやすいようにコピーしたものです。  
この repo では、それらのコピーを skill と一緒に `.codex/skills/` へ複写して利用する前提です。

正本側の更新を取り込む必要がある場合は、必要なタイミングでこの repo 側のコピーを更新します。

一方、`references/general/` は、この repo を正本として管理する一般記事用の置き場です。  
`miku` 系プロダクトに分類されない Qiita / Note 記事は、必要に応じて各 writer skill の `references/general/` に置きます。

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
