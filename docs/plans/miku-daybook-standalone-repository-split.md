# miku-daybook 独立リポジトリ化計画

## 方針

正本は公開 GitHub リポジトリ `igapyon/miku-daybook-skills` に置き、既定ブランチを `devel` とする。
親リポジトリ `igapyon-agent-skills` の既存ビルドは、上流から認証なしで取得できる
40桁のコミットSHAで daybook を固定する。利用者向けZIPでは、
`skills/igapyon-miku-daybook/` の配置と導入手順を維持する。

独立版は `0.1.0` から始め、SemVerを採用する。版数は上流のルート `package.json` を正本とし、
ロックファイルと揃える。リリースタグは `v<version>` とする。ライセンスは現行の Apache-2.0 を引き継ぎ、
同梱 YAML runtime の ISC ライセンスを保存する。

GitHub のブランチ作成は利用者が担当する。独立先のリポジトリに初期コミットが必要な場合は
READMEで初期化し、そのコミットから `devel` を作って既定ブランチに設定する。

## 1. 上流の初版を整える

1. 着手時の親リポジトリで移行対象のコミットを確定し、初回取り込みコミットの説明に元のSHAを記録する。
   そのコミットの `skills/igapyon-miku-daybook/` を、同じ相対パスと内容で上流へ取り込む。
   親の履歴は親リポジトリで参照できる。実際の活動記録や設定は利用者の daybook に置く。
2. CLI、参照資料、同梱テスト、通知テンプレートは従来の構成で移す。親ルートの
   `build-daybook-yaml-runtime.mjs`、`check-daybook-runtime.mjs`、
   `daybook-runtime.test.mjs`、`daybook-yaml-compatibility.test.mjs`、
   固定した `yaml`・`esbuild` 開発依存、daybook専用CIを、上流の開発用ファイルとして移す。
   Issue取り込みには引き続き導入済みの miku-scm を使い、独立版の導入案内にその前提を記載する。
3. 上流で既存の CLI suite、YAML生成差分、YAML互換性、Node.js 22/24 のCIを確認する。
   単体配布ZIPから展開したCLIを、利用者側の依存インストールなしで実行できることを確認する。

## 2. 親リポジトリの同梱を切り替える

上流の初版ソースが `devel` に入ったら、その時点のHEADを確認する。
同じSHAを認証なしで取得できることを確かめてから切り替える。
上流の初回タグとRelease公開は別工程として扱う。

1. 同じ変更で親の内部コピーを削除し、POMの `external.*` と取得引数、
   `config/skill-index-policy.json` に上流URL・固定SHA・スキル名を登録する。
   スキルの補助索引は既存の外部スキルと同じ `remove` 方針とする。
2. ルートREADMEの参照は上流の固定SHAへ、ZIP内READMEの参照はZIP内の相対パスへ向ける。
   `DEVELOPMENT.md` の現行保守手順と `INSTALL.md` の案内を確認し、現在の参照先を揃える。
   親の過去の実装記録は履歴として利用する。
3. 親から上流へ移管した開発依存、専用コマンド、専用CIを整理する。親のZIP検査では
   展開済み daybook の代表参照経路と、依存インストールなしでサンプルの予定から
   day-plan を生成できることを確認する。
   現行の `check-release-archive.mjs` は内部スキルの分岐で両方を検査しているため、
   その分岐から切り離す。親のローカルソースを読む参照テストは内部スキルを対象とし、
   外部 daybook の参照検査はZIPに対して行う。
4. 親の `npm run test:skill-index-policy`、`mvn clean package`、配布ZIP検査を実行する。
   `EXTERNAL_SKILLS.lock` のdaybookのSHAがPOMと一致し、
   ZIPに内部12・外部15の計27スキルとdaybookが一つだけ入ることを確認する。
   初回切替では、ZIP内のdaybookのファイル一覧と内容を移行元の固定コミットと照合する。

移行の差分は、親リポジトリにある作業中の版数変更と区別してレビューする。
親の配布切替後に修正が必要になった場合は、上流で修正して親のpinを更新する。
