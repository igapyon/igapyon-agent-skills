---
title: miku-scm 自己レビュー2件のLuna向け追加対応計画
description: "直接applyにも保存計画を必須化し、異なる未追跡パスのignore判定を標準入力でまとめて実行する。"
category: plan
status: complete
created: 2026-11-05
updated: 2026-11-05
---

# miku-scm 自己レビュー後の追加対応計画・実施記録

## 1. 目的と開始条件

[前回の改善](miku-scm-reliability-performance-luna-implementation.md)は計画範囲の実装とfull 532/532のローカル検証を完了した。その後の自己レビューで残存経路を2件再現し、本書に追加対応を固定した。追加対応もsource、回帰テスト、参照資料、契約を更新し、fast 280/280、full 541/541、workflow contract 37件currentで完了した。詳細は[追加実施記録](miku-scm-self-review-followup-execution.md)を参照。

正本は `skills/igapyon-miku-scm/`。以下の `scripts/`、`tests/`、`references/` は同skillからの相対パス。開始時は最新の利用者指示と実際のGit状態を確認する。

- 計画時HEAD: `4d9b8560666fcdcb60ffbb7a38fbf88e2dc9bb4c`、branch `devel-tiga1103vea`。
- 前回のmiku-scm改善、計画書、TODOは未commit。並行するdaybook等の差分もある。既存差分を保持し、古いHEADへのcheckout/resetや一括restoreをしない。
- 対象はsource、回帰テスト、参照資料、契約、ローカル検証。実GitHubや利用中repositoryへのpushを検証に使わない。
- 配備、製品版数更新、commit/pushはそれぞれの依頼で扱う。Windows未検証をmacOSの結果で完了扱いにしない。

## 2. 再現した問題と採用方針

| ID | 優先度 | 現状と再現 | 採用方針 |
| --- | --- | --- | --- |
| SR1 | P1 | helperの通常preflightが返す `apply_arguments` はbranch/URLを固定しない。同じHEADの別branchへ切り替え、originを別bare remoteに変更してからその引数を適用すると、変更先へpushし `-done` 化まで成功する | CLIとexport関数の公開applyを保存計画経由に統一する。旧引数は移行案内付きで拒否する |
| SR2 | P2 | 同じ未追跡directoryだけの100件はcheck-ignore 1回・約0.053秒。一方、取り込み対象と同名の未追跡ファイルが100件あると101回・約1.2〜1.3秒になる | 検査対象の異なる実pathを集め、NUL区切りstdinでまとめて照会する |

SR1の通常固定runnerは既に `--apply-plan` を必須にしている。問題は直接helper CLIと、exportされた `runPublish()` / `executePublish()` の通常apply経路。正常なsync pushや保存計画の照合を弱めて対応しない。

SR2の時間はmacOS / Git 2.54.0でguard単発の測定。前回の「3,000回→1回」は同じ親だけを繰り返すfixtureの値であり、異なる既存path全般への保証ではない。

計画時に一時repositoryで `git check-ignore --stdin -z --no-index` の挙動を確認した。非ignoredのみはcode 1・出力なし、ignoredを含む場合はcode 0・ignored名のNUL区切り。空白・改行を含むpathを保持し、`!keep.cache` による否定はignored出力に含まれなかった。調査用 `/private/tmp/` scriptを実装・検証の必須入力にしない。

## 3. 作業順

1回の作業は原則1行。回帰条件の固定、実装、対象テスト、該当契約の再生成、差分確認を終えて次へ進む。

| 順番 | ID | 作業 | 主な対象 | 完了条件 |
| --- | --- | --- | --- | --- |
| 0 | SREV-00 | 現状と追加回帰条件を固定 | 実施記録、対象tests | 元の問題を再現でき、既存差分とbaselineが記録される |
| 1 | SREV-01 | 公開applyを保存計画経由に限定 | `post-recommit-publish.mjs`、publication tests | 旧CLI・export関数でpush不可、保存計画による正常公開は成功 |
| 2 | SREV-02 | 引数出力・移行案内・参照資料を揃える | 同helper、publication reference、`scm-rules.md` | 返却引数をそのまま使える安全な往復が成立する |
| 3 | SREV-03 | guardの候補収集とstdin照会を実装 | `miku-scm-sync-worktree.mjs`、guard tests | 異なる100pathを1回で照会し、保護・異常停止条件を保つ |
| 4 | SREV-04 | 実pull・特殊path・性能の検証 | guard / pull tests、実施記録 | stash前後の再検査、ファイル保全、process数、実測を確認 |
| 5 | SREV-05 | 契約・full検証と受け渡し | manifest、生成物、TODO、実施記録 | full成功、contract current、未確認環境を明示 |

SREV-00〜05を完了した。計画の回帰条件と同じ候補構成で性能を計測し、contract 37件current、fast 280/280、full 541/541、`git diff --check` 成功を確認した。未確認環境と外部操作の範囲は[追加実施記録](miku-scm-self-review-followup-execution.md)に記録した。

実装開始時に `docs/plans/miku-scm-self-review-followup-execution.md` を作り、各IDの変更、検証コマンド、結果、残件を記録する。

## 4. SREV-00: 開始確認

- `DEVELOPMENT.md`、適用される `AGENTS.md`、root TODOの本件、前回の実施記録、本書を確認する。
- branch / HEAD、status、staged / unstaged diffの概要、Node/Git版を記録する。計画時の値を現状と決めつけない。
- contract checkと担当focused testsをbaselineにする。前回の532件成功を追加変更の成功証拠に流用しない。
- SR1は新旧branchと2つのローカルbare remote、SR2は実Gitへ委譲するcounting wrapperで再現する。返却値だけを作るmockで済ませない。

## 5. SREV-01: 保存計画を必須にする

変更箇所は `scripts/post-recommit-publish.mjs`。既存の実apply本体をprivateな内部関数へ分け、次の入口に固定する。

1. `runPublish(options, dependencies)` は公開preflight専用にする。truthyな `options.apply` はGit操作前に拒否し、`mutationInvoked=false` と保存計画への案内を持つ例外にする。不正型のapply値も内部applyへ渡さない。同期prepare・recommit前後のpreflight呼び出しは現状どおり使える。
2. `executePublish()` も通常引数の `--apply` 相当をGit操作前に拒否する。parseを通らない直接呼び出しでも同じ制約にする。`parseArgs()` とusageにも同じ制約を反映する。
3. privateな実apply関数は、`executePublish()` が計画を読み、SHA-256・契約・schemaを検証した経路からだけ呼ぶ。計画のbranch / URL digestを必須の内部引数にし、欠落を現在値で補わない。
4. 公開オプションやdependencyに `allowUnsafeApply` のような迂回フラグを追加しない。内部apply関数もexportしない。
5. 現行schema 2、branch/HEAD/URL/cleanの再照合、明示lease、attemptの一回性を保つ。claim前の失敗は未消費、claim後の不確実性はunresolvedのままにする。

**回帰条件:**

- 旧CLI `--expected-head ... --expect-new-remote-branch --apply` は分かる移行案内で停止し、branch/remote不変。
- parseを迂回した `runPublish({apply:true,...})`、`executePublish({apply:true,...})` も同様に停止する。Git runnerを呼べば失敗するfixtureで、入口での拒否も確認する。
- branchのみ変更、fetch URLのみ変更、push URLのみ変更、branch+URL変更を分け、保存計画applyはいずれもpush 0回。
- 無変更の保存計画は1回だけ公開成功。既存remoteへの明示lease、失敗時のattempt扱い、recommit push、sync pushの成功・停止を維持する。

既存publication testsには `runPublish(...apply:true)` が多数ある。該当成功・故障注入テストを実 `executePublish()` の保存計画経由へ移す。拒否テストに置き換えて元のfetch/push/検証失敗のカバレッジを削らない。注入する故障は計画作成後のapply側に設定する。

## 6. SREV-02: 出力と移行手順

`preflightApplyArguments()` が作る旧形式の公開引数を廃止し、返却値を次に揃える。

| 呼び出し | 返却する次手順 |
| --- | --- |
| 保存しない `runPublish()` / 通常preflight | `save_plan_arguments` と `next_action`。危険な `apply_arguments` は返さない |
| `--save-plan` / `savePublicationPlan()` | 保存した実plan path・digest・対象repoを含む `apply_arguments` |
| 旧形式の通常apply | 新しいpreflightを `--save-plan` 付きで取得し、その計画を確認して適用する案内 |

保存後の `apply_arguments` は `--repo <canonical-root> --apply-plan <returned-path> --expected-plan-sha256 <returned-digest>` とする。`--apply` は付けない。呼び出し元cwdがrepo外でも正しく動くようにし、現在のURLやbranchから適用計画を自動再生成しない。

- `usage`、`references/github-post-recommit-publish.md`、`references/scm-rules.md` のpublication節を更新する。古い「apply_argumentsにさらに--applyを付ける」説明を除く。
- `SKILL.md` と `references/deterministic-workflow-runner.md` の既存runner案内と矛盾しないか確認する。compound sync pushは依頼済みの同一実行内で継続し、新しい会話確認を追加しない。
- preflight → 保存 → 返却apply引数の利用を、実helper CLIと固定runnerの両方で確認する。raw URL・資格情報を追加出力しない。
- contract更新後の旧計画は既存の契約不一致で新preflightへ案内する。既存attemptがある公開を自動再送しない。

## 7. SREV-03: 異なるpathのignore判定をまとめる

`scripts/miku-scm-sync-worktree.mjs` のguard内部を、候補の収集と一括照会へ分ける。

1. 既存の木の列挙、case alias解決、`lstat`、managed判定を使い、現状 `ignored(relative)` を呼ぶ場所で実pathを `Set` に追加する。tracked pathを新たな候補にしない。
2. symlink / 通常ファイルでの走査中断、ENOENT / ENOTDIR、曖昧なcaseの停止、submodule拒否、既存directoryのignored子孫検査を保つ。ignored依存directoryを再帰全走査しない。
3. 候補0件ならcheck-ignoreを呼ばない。同じ実pathは1回だけ入力する。directory alias cacheは従来どおりguard内に限定する。
4. private helperで候補を最大512件、UTF-8入力最大256 KiBのchunkへ分ける。各pathの末尾NULもbyte数に含め、どちらかの上限で分割する。単一pathが上限を超える場合は検査不能として停止する。
5. 各chunkに固定argv `['check-ignore', '--stdin', '-z', '--no-index']`、`input: names.join('\0') + '\0'`、`allowFailure:true` で実Gitを呼ぶ。`--quiet` は使わない。異常時にpath単位のprocessへfallbackしない。
6. code 1はstdoutが空なら全件非ignored。code 0はNUL終端の出力をparseし、入力に含まれるignored pathが1件以上あれば既存形式の衝突エラーで停止する。code 0の空出力、code 1の非空出力、未知の出力path、NUL終端欠落、code 0/1以外は検査失敗として停止する。raw stdoutを `trim()` しない。
7. 全chunkの保護確認が成功するまでguardを完了しない。stash前後・checkout前の呼び出しはその都度収集・照会し直す。走査段階の安全エラーを早く返すことは許すが、ignored判定を未実行のままmutationへ進まない。

`tests/miku-scm-sync-guard.test.mjs` の現在の `args.at(-1) === 'incoming'` 等はstdinの中身を確認する形へ変更する。実Gitへ委譲したうえで、件数・NUL入力・重複の有無を数える。

**回帰条件:** 同じ親のみ100件は1回、異なる既存leaf100件も1回、候補0件は0回。513以上の候補とbyte上限を超える合計入力で分割を確認し、最後のchunkのignored衝突も取り逃さない。異常code / 不正出力を停止させる。

## 8. SREV-04: 保護・実pull・性能

- ignored / 非ignoredの混在、否定rule、nested `.gitignore`、tracked生成物、case違い、Unicode、空白・タブ・改行を含むpath、symlinkを確認する。OSで作れない名前はread境界のfixtureと実Gitで扱えるケースを分け、skip理由を記録する。
- guard間でignore ruleやdirectory内容を変更し、再検査で検出することを確認する。既存の曖昧aliasとsymlink保護を維持する。
- `sync-pull.test.mjs` に実pull経由の代表ケースを追加する。対象と同名の未追跡ファイルが多いfixtureではrestore衝突があり得るため、単なる成功を要求せず、停止時も元内容・正確なstash・backupが保持されることを検査する。
- 各guardの保護照会と、初期化・stash等が行う別目的のcheck-ignoreを分けて数える。guard呼び出し回数を減らして数値を達成しない。
- 100 / 1,000 / 3,000件について、同じ親のみ、異なる既存leaf、追跡済みcase照合の3条件を手動計測する。candidate数、chunk数、check-ignore数、readdir数、guard単発時間を記録する。
- byte上限に達しないfixtureでは、異なる既存leaf3,000件＋親1件を6回以下にする。CIの合否は絶対秒数でなくchunk数と保護結果で判定する。前回値と新値の条件を揃える。

## 9. SREV-05: 契約と最終確認

本計画による契約versionの更新値を次に固定する。実装開始時の現行値が違えば理由を先に確認する。

| Workflow | 現在 | 追加対応後 |
| --- | ---: | ---: |
| pr.publish.preflight | 2 | 3 |
| pr.publish.apply | 2 | 3 |
| repository.sync.pull | 2 | 3 |

manifestの該当entryと `miku-scm-workflow-manifest.test.mjs` の期待値を揃える。共有defaultを一括変更しない。schema 2のpublication計画は維持し、runner全体・製品版数の変更は本件から自動で行わない。他workflowへ波及するsource/spec digestはgeneratorで更新する。

focused testsは変更単位で次から選ぶ。

```sh
node --test skills/igapyon-miku-scm/tests/post-recommit-publish.test.mjs skills/igapyon-miku-scm/tests/pr-recommit-push.test.mjs skills/igapyon-miku-scm/tests/sync-push.test.mjs
node --test skills/igapyon-miku-scm/tests/miku-scm-sync-guard.test.mjs skills/igapyon-miku-scm/tests/sync-pull.test.mjs
```

publication / pull testの追加名は `miku-scm-test-suite.mjs` のshard規則に合わせ、fullへ必ず1回だけ含める。新しい名前が対象外なら適切な既存prefixを使うか、重複のないshard更新とその検証を行う。

最終handoff前に契約再生成、fast、fullを実施する。合格後にsourceが変わらなければ同じfullを繰り返さない。

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-workflow-contracts.mjs
node skills/igapyon-miku-scm/scripts/miku-scm-workflow-contracts.mjs --check
npm run test:miku-scm:fast
npm run test:miku-scm:full
git diff --check
git status -sb
```

実施記録とTODOには実測、通過した検証、未実施環境を記録する。公開制約とstdin/特殊pathは既存macOS/Windows CIでも確認対象にする。Windowsの結果が得られていない段階ではローカル検証完了として報告し、両OS完了とは書かない。

受け渡し条件は、旧直接applyの拒否、安全な返却引数の往復、保存計画の成功・一回性、異なるpathのprocess削減、保護条件、契約、full成功が揃うこと。個別項目の実装だけでSR1/SR2全体を解決済みと報告しない。
