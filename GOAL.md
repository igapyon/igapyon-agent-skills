---
purpose: ai-agent-goal
read_when:
  - before_starting_work
  - before_finishing_work
  - when_scope_is_unclear
update_when:
  - goal_changes
  - done_conditions_change
  - stop_conditions_change
---

# Goal

## Objective

2026-10-26の合意仕様と自己レビュー済み計画に沿って、`miku-scm sync pull` / `sync push` をsource skillへ実装し、一時Git repositoryで検証する。

## Status

2026-10-26：sync pull/pushに加え、候補版数human output修正をsourceへ実装。human output v15、契約更新、5ケースと実producer接続テストを含み、focused 45/45、full suite 374/374、contract 37件check、`mvn validate`、`git diff --check`が成功。[候補版数修正計画と検証記録](skills/igapyon-miku-scm/docs/2026-10-26-version-candidate-output-fix-plan.md)を参照。現在版は共通 `1.20261026.5` / Mikuku `20261026e`。作業ツリーは未stage・未commit。native Windows/hosted CI再確認、package/配備、commit/pushは未実施。

## Done

- ローカル作業を保持するpullと、必要なcommitを含むprepare/draft/apply型pushを実装する。
- `-done` 以外でPR確認をしない条件と、既存操作の意味を維持する。
- 一時bare remoteと固定PR fixtureで正常系・停止・回復を検証し、契約・配布を整合させる。
- Windows実機、hosted CI、実GitHub、モデル会話確認は実行証拠がなければ完了扱いにしない。
- 既存の版数・状態文書差分を保持し、検証結果と未実施事項を記録する。

## Resume

最終確認：focused 45/45、full 374/374、契約37件check、`mvn validate`、`git diff --check`成功。候補修正のnative Windows/hosted CI確認と現在版 `.5` packageは未実施。

次回は最新の利用者依頼と実際のGit状態から対象を決め、`HANDOFF.md` と `TODO.md` 冒頭を確認する。syncの基本実装を繰り返さず、公開・配備・実機検証は依頼範囲に応じて行う。

旧commit `27a2ed7` の公開方法の選択待ちは解除する。Work Cycleの最初の実装と連動版更新は `0cc8aaa` にまとまり、PR #344（`044734b`）でマージ済みである。

## Stop

- 合意仕様の保存を、runtimeの実装済み・検証済みと読み替えない。
- 計画外の追加動作が必要になった場合は、理由と影響を記録して合意仕様との関係を確認する。
- source実装の依頼から、実repositoryへのsync操作、配備、commit/push、GitHubへの書き込みを開始しない。
