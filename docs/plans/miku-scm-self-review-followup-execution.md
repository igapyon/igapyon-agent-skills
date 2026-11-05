# miku-scm 自己レビュー追加対応の実施記録

計画: [Luna向け追加対応計画](miku-scm-self-review-followup-luna-implementation.md)

## 対象と実施範囲

2026-11-05、前回の自己レビューで確認した2件を修正した。

- 保存計画なしの通常preflight引数で、branchやremote URLを変更した後にhelperへapplyすると別の公開先へpushできる経路。
- 異なる既存未追跡pathを個別に照会するため、100件で101回check-ignore processが起動する経路。

実装開始時はbranch `devel-tiga1103vea`、HEAD `4d9b8560666fcdcb60ffbb7a38fbf88e2dc9bb4c`。共有作業ツリーの他作業と前回miku-scm改善の差分を保持した。Node v26.12.1、Git 2.54.0（Apple Git-157）、macOS。

## 変更

### 公開applyを保存計画に限定

- helper CLIの通常 `--apply`、`runPublish({ apply: true })`、`executePublish({ apply: true })` をGit操作前に拒否する。
- 通常preflightは `save_plan_arguments` と次の操作案内を返し、適用可能な `apply_arguments` を返さない。
- 保存済み計画だけが返す引数はcanonical repository root、plan path、plan SHA-256を含む `--repo … --apply-plan … --expected-plan-sha256 …`。呼び出し元cwdに依存せず、そのまま使える。
- 既存のschema 2計画によるbranch、remote URL、HEAD、clean state、lease、attemptの検証を維持した。
- publication資料、直接applyの移行案内、通常runnerの説明と回帰test shardを更新した。

追加回帰は旧CLI引数、export関数への直接指定、branchとremote URLを変更した後の旧引数、保存計画での正常applyを確認する。既存のpush・fetch・remote検証失敗ケースも保存計画apply経由で実行する。

### ignore保護照会を一括化

- guardが実path候補を重複排除してから `git check-ignore --stdin -z --no-index` に渡す。
- chunkは最大512 path、UTF-8入力256 KiB。path末尾のNULもbyte上限へ含む。超過pathと異常出力はfail closedで停止する。
- Gitのcode 1は空stdoutのみ、code 0はNUL終端の入力済みignored pathのみを受理する。path単位のprocess fallbackは設けない。
- case-folded directory cacheとignore候補はguard 1回の範囲だけ。stash前後とcheckout前に新しい証拠を集める。
- 異なる既存file 100件を実pullへ通し、一括照会、stash衝突時の停止、元内容を含む正確なstash SHA、backup branchを確認する。
- 特殊path、否定ignore rule、2chunk目のignored衝突、UTF-8 byte上限、候補0件、不正Git出力をテストする。

### workflow契約

| Workflow | 変更前 | 変更後 |
| --- | ---: | ---: |
| `pr.publish.preflight` | 2 | 3 |
| `pr.publish.apply` | 2 | 3 |
| `repository.sync.pull` | 2 | 3 |

manifestとmanifest testを更新し、workflow lock/tableをgeneratorで再生成した。37件がcurrent。

## 性能計測

同じmacOS / Node v26.12.1 / Git 2.54.0環境で、対象treeが既存の未追跡leaf、全件non-ignored、`core.ignorecase=true`のguard単発を測定。旧方式はguardが収集する親directoryとleafごとに `git check-ignore --quiet --no-index -- <path>` を1回実行。新方式は実際の `guardIgnored()` とcounting Git wrapperを使用した。測定は単発で、CI完了基準には秒数を使わない。

| distinct candidates | 旧process数 | 旧時間 | batch process数 | stdin path数 | readdir数 | 新時間 |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 101 | 101 | 1.181秒 | 1 | 101 | 2 | 0.052秒 |
| 1,001 | 1,001 | 11.730秒 | 2 | 1,001 | 2 | 0.089秒 |
| 3,001 | 3,001 | 35.511秒 | 6 | 3,001 | 2 | 0.195秒 |

各サイズで全候補が実Gitへ照会され、chunk上限を超えないことを確認した。既レビューの100件測定約1.2〜1.3秒とも整合する。

## 検証

- `node --check` で両変更helperの構文を確認。
- guard / sync-pull focused testsを実施し、100件の実pullケース、stashとbackup保持、特殊path、否定rule、複数chunk、fail-closed条件を確認。
- publication focused testsを実施。直接apply拒否と保存計画の正常・異常境界を確認。
- `node skills/igapyon-miku-scm/scripts/miku-scm-workflow-contracts.mjs --check` は37件current。
- `npm run test:miku-scm:fast`: 280/280成功。
- `npm run test:miku-scm:full`: 541/541成功、失敗0、57 job、155.574秒。
- `node skills/igapyon-miku-scm/scripts/miku-scm-workflow-contracts.mjs --check`: 37件current。
- `git diff --check`: 成功。

## 制限と運用

Windows実機・hosted CIは未検証。実GitHubへの書き込み、利用中repositoryのsync、配備、製品版数更新、commit、pushは行っていない。
