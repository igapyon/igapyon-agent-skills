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

2026-10-26：両機能をfixed helper、runner、manifest、CLI/help、human output v14、契約、SKILLとreferencesへ実装。full suite 368/368、skill index policy 78/78、validator、版整合を確認。[実装計画と検証記録](skills/igapyon-miku-scm/docs/2026-10-26-sync-implementation-plan.md)を参照。後続の明示依頼で共通版を `1.20261026.4` / Mikukuを `20261026d` にincrementし、`mvn validate`で確認した。実装・版更新は未stage・未commit。実repoへのsync、配備、commit/push、GitHubへの書き込みは行っていない。

## Done

- ローカル作業を保持するpullと、必要なcommitを含むprepare/draft/apply型pushを実装する。
- `-done` 以外でPR確認をしない条件と、既存操作の意味を維持する。
- 一時bare remoteと固定PR fixtureで正常系・停止・回復を検証し、契約・配布を整合させる。
- Windows実機、hosted CI、実GitHub、モデル会話確認は実行証拠がなければ完了扱いにしない。
- 既存の版数・状態文書差分を保持し、検証結果と未実施事項を記録する。

## Resume

最終確認：実装時点のfast 204/204、契約37件のdriftなし、ローカルリンク45件、差分検査が成功。increment前の `1.20261026.3` ZIPは27スキルとsourceを照合済み。現在版 `.4` のpackageは未実施。

次回は最新の利用者依頼と実際のGit状態から対象を決め、`HANDOFF.md` と `TODO.md` 冒頭を確認する。syncの基本実装を繰り返さず、公開・配備・実機検証は依頼範囲に応じて行う。

旧commit `27a2ed7` の公開方法の選択待ちは解除する。Work Cycleの最初の実装と連動版更新は `0cc8aaa` にまとまり、PR #344（`044734b`）でマージ済みである。

## Stop

- 合意仕様の保存を、runtimeの実装済み・検証済みと読み替えない。
- 計画外の追加動作が必要になった場合は、理由と影響を記録して合意仕様との関係を確認する。
- source実装の依頼から、実repositoryへのsync操作、配備、commit/push、GitHubへの書き込みを開始しない。
