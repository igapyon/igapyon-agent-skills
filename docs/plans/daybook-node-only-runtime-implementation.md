---
title: daybook 同梱 CLI を Node.js だけで実行するための実装計画
description: "YAML 処理を自己完結した ESM として同梱し、依存インストールを不要にする変更・隔離検証・配布確認の計画。"
category: plan
status: complete
created: 2026-11-06
updated: 2026-11-08
---

# daybook 同梱 CLI の Node.js 単独実行対応

## 1. 目的と開始状態

利用者や実行エージェントが `npm install` / `npm ci` を行わずに、配布された `igapyon-miku-daybook` の活動作成・読み取り・更新 CLI を直接実行できるようにする。同じ YAML 処理を利用する day-plan、Issue 取り込み、通知の CLI も、実行時の npm パッケージ解決を不要にする。

2026-11-06 に調査し、次を確認した。

- 開始 HEAD は `8442d6f31ea2f6b9027e52d60e1097a4a4600236`、branch は `devel-tiga1106jcg`。計画編集前の作業ツリーは clean。POM の版は `1.20261106.2`。
- `create-activity.mjs` → `activity-files.mjs` → `day-plan.mjs` → `yaml` という静的 import がある。作成 CLI 自身も日付関数を `day-plan.mjs` から import する。
- `update-activity.mjs` も `activity-files.mjs` を通じて同じ依存を持つ。`issue-import.mjs` は YAML 出力のため `yaml` を直接 import する。
- `assets/daybook/package.json` は `yaml: ^2.8.1` を runtime dependency として宣言し、lockfile は `2.9.1` を固定している。
- 同梱 scripts を `node_modules` のない一時ディレクトリへコピーし、Node.js `v26.12.1` で活動作成・活動更新・day-plan 生成・Issue 取り込みの各 `--help` を実行すると、4件とも `ERR_MODULE_NOT_FOUND` で停止した。再現のための実データ変更は行っていない。
- `day-plan.test.mjs` の CLI 検証は `node_modules/yaml` をコピーするため、追加依存のない配布環境を検証していない。
- `references/operations.md` と `references/issue-import.md` は依存導入を案内し、通知 workflow も npm キャッシュと `npm ci` を要求している。

この節は計画作成時の開始記録である。上記の障害再現を、修正後の成功や対応済みの証拠とは扱わず、実装結果は第7節に分けて記録する。

## 2. 実行契約と対応範囲

### 配布後に保証すること

- スキルの完全なディレクトリを配置すれば、Node.js と同梱ファイルだけでローカル CLI が起動する。対象 daybook に `package.json`、lockfile、`node_modules` がなくても動作する。
- スキルの絶対パスから `--repo-root` を指定する実行と、必要なファイルを対象 daybook へコピーする実行の両方を支持する。任意の作業ディレクトリや対象 repo の依存導入状況によって import の成否が変わらない。
- runtime の import は Node.js 組み込みモジュールと同梱相対ファイルで完結する。自動インストール、実行時ダウンロード、グローバルパッケージ、`NODE_PATH`、対象 repo の依存探索を解決策にしない。
- 完全なスキルまたは手順で指定した一式の配備を前提とする。各 CLI を単一ファイルへ複製・バンドルする要件は設けない。

この契約は JavaScript の実行依存に関するもの。活動採番で使うローカル Git 履歴は従来どおり任意であり、Git がなくても現在のファイルから採番し警告を返す。GitHub への実際の読み書きには既存の接続設定・認可が必要で、Issue 取り込みのリモート操作は引き続き miku-scm に従う。通知の外部通信の意味は変更しない。

### 維持する動作

既存 YAML の解析・出力、front matter の型検証、日付・優先度・Backlog の扱い、活動名の英字連番、名前衝突時の前進、更新時の元内容ハッシュ照合を維持する。YAML の簡易自作パーサーへの置換やデータ形式の変更は行わない。

2026-11-06 の合意で撤回した活動ごとのロック・権限管理を再導入しない。更新の直前確認と保存の間の競合を許容する合意を保つ。

本実装の成果物はこの repo の source skill、生成済み runtime、開発用生成処理、関連資料、検査と配布 ZIP の確認記録。実 daybook やインストール済み skill への反映、既存対象 repo の依存削除、version increment、commit/push、tag/Release、GitHub への投稿や workflow dispatch は別の依頼で扱う。

## 3. 採用する構成

### YAML 処理だけを自己完結した ESM にする

`yaml` の公開 `parse` / `stringify` を入口として esbuild で Node.js 向け ESM を生成し、次の場所へ保存する。

```text
scripts/build-daybook-yaml-runtime.mjs       # repo 保守用の生成・drift 確認
package.json / package-lock.json            # repo 保守用の固定 devDependencies

skills/igapyon-miku-daybook/assets/daybook/
  scripts/
    vendor/
      yaml-runtime.mjs                     # 生成済み、利用者による build 不要
      yaml.LICENSE                         # 採用版のライセンス全文
    day-plan.mjs                           # ./vendor/yaml-runtime.mjs を import
    issue-import.mjs                       # 同じ module を import
    ...                                    # 既存 CLI と共通 module
  package.json                             # 任意の npm test 用、runtime 依存なし
```

全 CLI の再バンドルや、日付・front matter 関数の分離は今回の解決に必須ではない。既存の共通 module 構造を使い、YAML の2か所の import を同じローカル module へ接続する。

### 開発時と配布後の依存を配置で分ける

1. root `package.json` の **devDependencies** に `yaml` と `esbuild` を追加し、root `package-lock.json` で固定する。`yaml` は現行 lock と同じ `2.9.1` を完全一致指定し、同時のライブラリ更新を避ける。esbuild は実装時に生成環境・採用ライセンス・Node.js 互換性を確認した具体版を完全一致指定し、実施記録へ残す。
2. 生成スクリプトは repo root に置き、配布スキル内へ開発依存の必要な `.mjs` を追加しない。root の通常テスト・Maven package・配布 ZIP 検査には、これらの devDependencies の導入を要求しない。
3. `assets/daybook/package.json` から `dependencies.yaml` を削除する。依存がなくなった同 directory の `package-lock.json` は削除する。`package.json` は既存の `npm test` 利用の便宜として残し、CLI 配備の必須ファイルにしない。
4. 対象 daybook へコピーする手順は、その repo の manifest/lockfile を作成・上書き・更新しない。既存の `yaml` が他の用途で使われていても影響しない。

### 生成物の保守

- `build:daybook-yaml-runtime` は生成物と license を更新し、`check:daybook-yaml-runtime` は同じ入力からメモリ上へ生成して、保存済み bytes と比較する。check はファイルを書き換えない。
- `bundle: true`、`platform: node`、`format: esm` を指定し、パッケージを external にしない。既存 runtime の構文互換性を狭めない target を選び、Node.js の新しい API を追加しない。minify と sourcemap は無効とする。
- esbuild の出力 metadata で、残存する外部 import が Node.js 組み込みだけであることを確認する。生成物に未解決の `require('yaml')` 等を残さない。
- 生成物の短いヘッダーに `yaml` と esbuild の具体版、生成コマンド、出典を記録する。ライセンス全文は採用版からコピーし、生成チェックで照合する。上流取得元と integrity は root lockfile で追跡する。
- 日時・一時ディレクトリ・開発者の絶対パスを出力へ埋め込まず、同じ固定入力と設定なら同じ bytes を生成する。生成物を手編集しない。
- `DEVELOPMENT.md` に、生成／drift 確認時だけ root の開発依存を導入する手順を書く。通常の package は保存済み runtime を収録し、生成し直さない。

YAML 自体には第三者の実装を使用するが、配布後の npm パッケージ解決はなくなる。第三者コードの由来・版・ライセンスを含めて配布する方針である。

## 4. 変更対象

パスの `assets/` は `skills/igapyon-miku-daybook/assets/daybook/`、`references/` は同 skill の参照 directory を表す。

| 対象 | 変更 |
| --- | --- |
| root `package.json`、新規 root `package-lock.json` | 生成用 devDependencies と build/check/test コマンドを追加。既存コマンドは維持 |
| 新規 `scripts/build-daybook-yaml-runtime.mjs` | 固定入力からの生成と `--check`、license 照合、出力 import 確認 |
| 新規 `assets/scripts/vendor/yaml-runtime.mjs`、`yaml.LICENSE` | 自己完結した解析・出力 module と配布 license |
| `assets/scripts/day-plan.mjs`、`issue-import.mjs` | `yaml` の bare import をローカル runtime へ変更 |
| `assets/package.json`、`assets/package-lock.json` | runtime 依存を削除、不要な bundle 内 lockfile を削除 |
| `assets/scripts/day-plan.test.mjs` | CLI 検証時の `node_modules` コピーを vendor 一式のコピーへ変更 |
| 新規 `scripts/check-daybook-runtime.mjs`、`scripts/daybook-runtime.test.mjs` | Node.js 組み込みだけの共有隔離 smoke とその回帰検証 |
| 新規 `scripts/daybook-yaml-compatibility.test.mjs` | 開発依存がある環境で採用版の公開 API と生成物を比較 |
| `scripts/check-release-archive.mjs` | 展開後の daybook に共有隔離 smoke を適用 |
| `scripts/skill-reference-routes.mjs` と関連 tests | daybook の代表経路に YAML runtime と license を加える。本文からの実リンクを設ける |
| 新規 `.github/workflows/daybook-runtime-contract.yml` | PR/manual で npm 不使用の runtime tests と生成物確認を実行 |
| `.github/workflows/release-archive.yml` | Node.js の検証環境を明示し、配布ビルド前に daybook runtime tests を実行 |
| `assets/.github/workflows/day-plan-notify.yml` | `npm ci` と npm cache を削除。既存の生成・投稿処理を維持 |
| skill `SKILL.md`、`references/operations.md`、`issue-import.md`、`notification.md`、`task-date-migration.md`、`task-planning-migration.md` | Node.js 単独実行、runtime/license を含むコピー一覧、対象 repo へ依存を入れない手順に整合 |
| `README.md`、`src/assembly/README.md`、`DEVELOPMENT.md` | 利用者向けの実行前提と保守用生成手順を掲載 |
| `docs/plans/daybook-operation-feedback.md`、`TODO.md`、`HANDOFF.md`、本計画 | 旧 npm ci 改善候補との関係、実装・検証結果、残件を記録 |

実装開始時に `yaml`、`npm ci`、コピー対象のファイル一覧を対象範囲内で検索し、上表以外の現行案内・テストに同じ前提があれば整合させる。過去の実施記録は書き換えず、旧候補を現行方針と誤読する入口に後続計画への案内を付ける。汎用の全 skill スキャナーや新しい索引形式は作らない。

## 5. 実装手順

各手順の結果を本書末尾の実施記録へ残す。作業を別担当へ渡す場合も、以下の順序と完了条件を使う。

### DBN-00: 開始状態と再現を固定する

- Git 状態、既存差分、採用版、依存 import、通知 workflow、配布のファイル除外を確認する。
- 一時領域へ runtime だけをコピーし、4 CLI の既存障害を再現する。対象 repo でのインストールや実データの編集は行わない。
- 既存の活動保護・採番・更新競合テストを把握する。77件という過去の成功件数を今回の実行結果へ転記しない。

完了条件：実装前の失敗と開始状態を記録し、後続テストが検出すべき経路が決まっている。

### DBN-01: 生成処理と YAML runtime を追加する

- root の devDependencies と lockfile、生成／check コマンドを追加する。
- 3節の仕様で `yaml-runtime.mjs` と license を生成し、生成 metadata と実 import を確認する。
- 同じ入力からの2回の生成が同一 bytes になり、check も成功することを確認する。保存済み runtime または license を一時コピー上で変えた場合、check が書き換えず失敗することも確認する。

完了条件：固定入力・生成方法・出典が追跡でき、配布可能な ESM と license が揃う。

### DBN-02: 共通 module と manifests を切り替える

- `day-plan.mjs` と `issue-import.mjs` をローカル YAML runtime に接続する。
- bundle 内 runtime dependency と不要になった lockfile を取り除く。
- 日付や front matter の関数配置、CLI 引数、出力形式、活動更新の保護方式は維持する。

完了条件：既存 CLI の読み込みが第三者パッケージを解決せずに成功する。

### DBN-03: YAML と既存動作の互換性を確認する

- 既存の day-plan CLI テストのコピー手順を、新しい配布ファイル一式に合わせる。
- YAML 専用の互換検証は root の開発用コマンド `test:daybook-yaml-compatibility` として分け、通常の runtime tests からは実行しない。この検証のみ、root の `yaml` と生成物の `parse` / `stringify` を同じ入力で比較する。
- 代表例は引用された日付・数値・boolean・null、空値、配列/mapping、複数行文字列、コロン・`#`・Unicode、アンカー/エイリアス、不正 YAML・重複キーとする。schema が不適切な型を拒否する既存 tests も維持する。
- stringify の既存指定 `{ lineWidth: 0 }` を保ち、Issue 取り込みの生成 front matter と再読み取りが一致することを確認する。

完了条件：採用版の既存 API と生成物の意味が一致し、活動・day-plan・Issue 取り込み・通知の既存 tests が成功する。

### DBN-04: npm 不使用の隔離検証を追加する

`scripts/check-daybook-runtime.mjs` に共有処理を置く。Node.js 組み込みだけを使い、source bundle と ZIP 展開先の双方を引数で検査できるようにする。`scripts/daybook-runtime.test.mjs` から同じ処理を使う。

1. source checkout の外の一時領域に `installed-skill/`、`daybook/`、`cwd/` を作る。少なくとも一つのパスに空白を含める。runtime と license の一式だけをコピーする。
2. コピー先に `node_modules`、package manifest、lockfile を置かない。Node.js は `process.execPath` の絶対パスで起動し、外部 loader、`NODE_PATH`、対象 repo の依存などに頼らない環境にする。親 directory の依存を拾う配置も避ける。
3. 異なる cwd から、スキル内 CLI の絶対パスと `--repo-root` で下表の実処理を行う。対象 daybook へ scripts/vendor 一式をコピーして実行する経路も確認する。
4. Git が使えない環境での活動作成は別ケースとして実行し、警告付きで採番・作成できることを確認する。
5. 検査後は自分で作った一時領域だけを片付ける。ネットワーク接続や実 GitHub への書き込みを行わない。

| ケース | 確認する結果 |
| --- | --- |
| 5 CLI の `--help` | create/update/generate/import/post が全て exit 0。import error がない |
| 活動作成 | stdin と `--file` が動作。2回の作成が `a`、`b` へ進み、先の内容が不変 |
| 活動読み取り・更新 | `--read` で得た hash で更新成功。元内容を別途変更した後の古い hash では `ACTIVITY_UPDATE_CONFLICT` となり、変更後の内容を保持 |
| day-plan 生成 | planned task、Backlog、schedule を含む小さな fixture で canonical path に出力。元記録は bytes 不変 |
| Issue ローカル取り込み | 既存テストと同じ形式の source/manifest fixture で prepare/apply。出力した YAML を読め、活動/記録が作成される。リモート操作は行わない |
| 通知 dry-run | fixture の day-plan を `post-day-plan.mjs --dry-run` で描画でき、token も通信も不要 |
| 対象依存からの独立 | 別ケースで対象 repo に読み込むと失敗する偽の `yaml` を配置し、同じ CLI がそのコードを読まずに動く |

`--help` だけの成功を完了条件にしない。作成・更新したファイルの bytes と、失敗時に既存内容を保持することを確認する。

完了条件：Node.js のみの配置で、スキル直接実行と対象 repo へのコピーの両方が実処理まで成功する。

### DBN-05: 指示・コピー一覧・通知 workflow を整合させる

- `SKILL.md` に Node.js 単独実行を短く記載し、各操作手順へ案内する。メタ依頼と記録操作の発火境界は維持する。
- activity、day-plan、Issue 取り込み、通知、移行手順の各コピー一覧に `scripts/vendor/yaml-runtime.mjs` と `yaml.LICENSE` を含め、実リンクを設ける。
- 利用時の `yaml` import 検査、`npm install yaml`、`npm ci`、対象 manifest の新規作成・統合指示を削除する。CLI 自体の `--help` と実処理で配備確認する。
- 通知 workflow の npm キャッシュとインストール step を削除し、残る step が manifest や lockfile を要求しないことを確認する。
- target に既存 package 定義がある場合は維持し、依存削除を一般の導入手順に追加しない。通知導入時の package.json コピーは任意の test 用に位置付ける。
- `DEVELOPMENT.md` に、生成物更新時の開発依存導入、build、drift/互換検証、通常の npm 不使用実行を説明する。旧改善メモの「必要時だけ npm ci」は、本修正計画へ置き換わる候補として整理する。

完了条件：新しい配布物を使う操作が、インストール案内や古いファイル一式へ誘導されない。

### DBN-06: 配布と CI に検査を接続する

- root `test:daybook` は asset 内の既存 suite と新しい隔離 suite を実行する。開発用 YAML reference tests は含めず、root の依存導入なしで成功させる。
- 新規 PR/manual workflow の runtime job は Node.js 22 / 24 で checkout と `npm run test:daybook` を実行する。これは repo の既存互換性方針に沿う検証対象であり、新たに最低版を引き上げる宣言にはしない。job に `npm ci`、npm cache、生成 step を置かない。
- 別の生成チェック job は Node.js 24 で root `npm ci` を行い、生成物の check と YAML 互換 tests を実行する。runtime job と依存導入を共有しない。
- workflow の対象変更は daybook skill、生成・隔離・配布検査 scripts、root package/lockfile、自身の workflow とする。GitHub の必須チェック設定の変更は行わない。
- Release workflow は検証用 Node.js を明示し、既存の確認に `test:daybook` を加える。Maven package は開発用生成処理を呼ばない。
- ZIP checker は既存の配布ファイル集合・bytes・license の収録を確認した後、展開された daybook に共有隔離 smoke を適用する。source 側の runtime で代替しない。
- 代表参照経路の検査に runtime と license を加え、配布時に欠落すると検出できるようにする。source/ZIP の検査で `node_modules` をコピーしない。

完了条件：npm 不使用の実行が source と配布 ZIP で検証され、生成物の更新漏れは別の生成チェックで検出できる。

### DBN-07: 最終確認と結果記録

- 下の検証を行い、各コマンドの結果と未確認環境を記録する。失敗や追加変更がない限り full suite を繰り返さない。
- この計画のチェック、`TODO.md` と `HANDOFF.md` を実際の source 実装・検証範囲に合わせる。ローカル実行結果と hosted CI の成功を混同しない。
- package 検査まで成功したら source 対応完了として報告する。実データ repo への導入とローカル配備先への同期は別項目として残す。

## 6. 検証コマンドと完了条件

実装時に追加する root コマンドの契約を以下とする。

```sh
# 生成物を保守するときだけ使う開発環境
npm ci
npm run build:daybook-yaml-runtime
npm run check:daybook-yaml-runtime
npm run test:daybook-yaml-compatibility

# runtime の検査：別の clean checkout で、npm ci を実行せずに確認する
npm run test:daybook
npm run test:skill-index-policy
git diff --check

# 配布確認：その checkout でも開発用 npm 依存なしで成功させる
mvn package
node scripts/check-release-archive.mjs target/igapyon-agent-skills-<version>.zip
```

`<version>` は実装時の POM の値に置き換える。Maven package の外部 skill 取得には既存どおりネットワークが必要だが、daybook runtime の実行時にはパッケージ取得を行わない。生成済み runtime と license を含む実装差分は clean な検証用 checkout/一時コピーへ持ち込み、root や上位 directory の `node_modules` に助けられていないことを確認する。

編集後の skill 形式は、利用環境にある `skill-creator` の `quick_validate.py` で確認する。計画文書だけの段階では runtime suite、生成、package を実施したことにしない。

- [x] DBN-00：実装開始状態と既存障害を記録した。
- [x] DBN-01：生成処理・固定 devDependencies・生成 runtime・license・drift 確認が揃った。
- [x] DBN-02：配布 runtime の第三者パッケージ解決と bundle 内 runtime dependency がなくなった。
- [x] DBN-03：YAML API の互換検証と既存 suite が成功した。
- [x] DBN-04：依存なしのスキル直接実行・コピー実行で、実処理と競合保護を確認した。
- [x] DBN-05：導入・操作・移行・通知の案内とコピー一覧が新構成に整合した。
- [x] DBN-06：npm 不使用の source 検査・配布 ZIP の実行検査・別 job の生成チェックを接続した。
- [x] DBN-07：形式・参照・差分・package/ZIP の結果と未確認事項を記録した。

## 7. 計画作成時の確認と実装後の記録先

2026-11-06：本計画を作成し、`TODO.md` と `HANDOFF.md` から参照できるようにした。実装コード、依存定義、生成物、workflow は未変更。前段の障害再現以外に runtime suite・生成・package は実行していない。

### 実装・検証結果（2026-11-06）

- DBN-00：開始時 branch `devel-tiga1106jcg`、HEAD `8442d6f31ea2f6b9027e52d60e1097a4a4600236`、POM `1.20261106.2`。先行する TODO/HANDOFF/本計画の差分を保った。
- DBN-01：`yaml@2.9.1` と `esbuild@0.28.2` を root devDependencies に完全固定。esbuild `target: node18` で browser ESM source を bundle し、生成 runtime `199602` bytes、同梱 ISC license `738` bytes。rootでruntime buildを実行し、別の一時 checkout では `npm ci`、`check:daybook-yaml-runtime`、互換 suite が成功。
- DBN-02：`day-plan.mjs` と `issue-import.mjs` の参照を同梱 `vendor/yaml-runtime.mjs` に変更。asset `package.json` の runtime dependency を削除し、asset lockfile を削除。生成物の esbuild metafile に外部 import がないことを確認。Node.js builtin 以外は runtime import に含まれない。
- DBN-03：同梱 parse/stringify を固定 yaml package と比較する2件のテストが成功。daybook runtime suite **78/78** 成功。
- DBN-04：一時の skill 配置と scripts コピー配置で、5 CLI の help、activity の stdin/file 作成、suffix 前進、Git が PATH にない作成、read/guarded update/stale hash、day-plan、local Issue prepare/apply、notification dry-run を確認。`NODE_PATH` を無効な場所にし、コピー先には import すると失敗する偽 `yaml` package を置いたまま通過。package install は使わない。
- DBN-05：SKILL、activity/day-plan/Issue/notification/date/planning migration 手順、README、assembly README、DEVELOPMENT と旧改善メモを更新。Issue import と通知手順から依存確認・npm install/ci 指示を除去。daybook notification workflow から npm cache と install step を削除。
- DBN-06：Node.js 22/24 の runtime job と Node.js 24 の npm ci /生成チェック job を分けて追加。release workflow に Node.js 24 と daybook suite を追加。ZIP checker は展開した daybook bundle を隔離実行し、representative route は runtime と license を検査する。
- DBN-07：`npm run test:skill-index-policy` **79/79**、`npm run test:daybook-yaml-compatibility` **2/2**、`quick_validate.py`、node syntax checks、`git diff --check` が成功。Maven `clean package` 成功し、`target/igapyon-agent-skills-1.20261106.2.zip` の検査は internal 15 / external 12 / 974 timestamped entries と `daybook-runtime=checked` を確認。

ローカル実行は Node.js `v26.12.1`。Node.js 22/24 と hosted Actions の実行結果は未確認で、対応 workflow による検証待ち。実 daybook/配備先へのコピー、版数 increment、commit/push、tag/Release、GitHub 操作は行っていない。

### 自己レビュー2件への対応（2026-11-08）

開始時 HEAD は初回実装 commit `b2840761ce9bc5eaed3a5907043af5a871b8714f`、branch は `devel-tiga1106jcg`、作業ツリーは clean。自己レビューで次の2件を再現し、回帰テストが修正前に失敗することを確認した。

1. Browser ESM source は `!!binary` を `Uint8Array` に変換し、従来の Node.js 版 `Buffer` と異なる。`planned_action: !!binary SGVsbG8=` が `Hello` ではなく `72,101,108,108,111` になっていた。
2. CLI の起動判定が字面のパスを比較するため、macOS の `/tmp` やディレクトリの別名経由では exit 0・出力なし・ファイル未作成となる。初回 smoke の `realpathSync(scriptPath)` がこの問題を隠していた。

対応内容：

- YAML 生成元を同じ `yaml@2.9.1` の Node.js 配布コードへ変更し、`buffer` と `process` の require を組み込み default object への静的 ESM import に接続した。生成済み runtime は `263964` bytes。外部 import は `node:buffer` と `node:process` のみで、未解決 dynamic require は生成時に拒否する。
- create/update/import/post の4 CLI と開発用 smoke CLI の起動判定を実パス比較へ変更した。新しい配備用 companion file は追加していない。
- smoke は呼び出しパスを変換せず実行し、通常配置と symlink/junction 配置の両方で5 CLI の help 本文を確認する。別名経由の活動作成/読み取り/更新/古い hash 拒否、Issue prepare/apply、day-plan 生成、通知 dry-run まで実行する。隔離 fixture の `!!binary` も `Hello` と表示されることを確認する。
- Node 版との `Buffer` 型・日本語を含む UTF-8 値・binary 出力と再解析の互換テスト、day-plan の表示回帰を追加した。

ローカル Node.js `v26.12.1` で `test:daybook` **79/79**、`test:daybook-yaml-compatibility` **4/4**、`test:skill-index-policy` **79/79**、生成物の `--check`、skill 形式、`git diff --check` が成功。macOS の `/tmp` 経由でも exit 0 と実ファイル作成を個別確認した。Maven `clean package` と `target/igapyon-agent-skills-1.20261106.2.zip` の検査も成功し、展開した runtime の別名実行・binary fixture を検証した。ZIP は internal 15 / external 12 / 974 entries、timestamp `2026-11-08T00:00:00Z`、`daybook-runtime=checked`。Node.js 22/24 の hosted CI、実 daybook/配備先への反映、version increment、今回の修正の commit/push は未実施。

## 参考

- [Node.js ESM の解決仕様](https://nodejs.org/api/esm.html#resolution-algorithm-specification)：パッケージ解決は import 元の URL を基準に行う。
- [esbuild の bundle](https://esbuild.github.io/api/#bundle)：依存をまとめた JavaScript の生成に使う。
- [yaml 公開 API](https://eemeli.org/yaml/)：既存の parse/stringify と配布ライセンスの確認先。実際の採用 source は固定した lockfile を基準にする。
