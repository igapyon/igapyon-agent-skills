---
title: sync実装計画の自己レビュー
status: findings-addressed-in-plan
created: 2026-10-26
updated: 2026-10-26
---

# sync実装計画の自己レビュー

## 結果と対象

[実装計画](2026-10-26-sync-implementation-plan.md)と[合意仕様](2026-10-26-sync-pull-push-spec.md)を、現行helper・Git公式仕様・一時Git fixtureに照合した。5件を見つけ、実装計画へ修正を反映した。runtimeは未実装であり、このレビューは機能の完成判定ではない。

`-done` ではないときにPRマージ確認をしない条件と、`-done` のときに正確なPR証拠を要求する条件は維持した。

| ID | 優先度 | 指摘 | 修正先 |
| --- | --- | --- | --- |
| R01 | P1 | tracking refだけでは既にfetchされたbase書換えを見落とし、削除された旧共有commitを自分の作業として再適用し得る | 第4.1・6節、P09/P10 |
| R02 | P1 | stash対象外のignored fileが、新たなtracked pathにより上書きされる条件が未定義 | 第5節、P11 |
| R03 | P2 | 「空になったcommitは停止」だけでは、Gitのclean cherry-pick事前除外を防げない | 第5・6節、P12/P13 |
| R04 | P1 | prepare/applyのremote名が同じでも、実際のpush先や送信先の数は変わり得る | 第4.2・7節、U08 |
| R05 | P2 | 文案待ちやbase進行による停止でclaimが残ると、commitを重複作成したり必要なpullを妨げたりする | 第4.3・7節、U09/U10/U11/C03 |

## R01：独立した作業開始点の記録

元の計画はfetch直前のtracking SHAを新baseと比較していた。しかしstatus等で先にfetchされていれば、新旧trackingが同じ書換え後SHAになり、この検査だけでは不十分。

一時fixtureでは、旧base `B` に共有commit `old-upstream`、その上の作業branchに `own-work` を置いた。remote baseを共通祖先 `A` から別の `N` へ書き換え、`origin/base` も先に `N` へ更新した。

- trackingの `N → N` 祖先検査：成功。
- `merge-base(HEAD, N)` からHEADまでの再適用候補：`old-upstream` と `own-work` の両方。
- 独立して保存した旧base `B` が新base `N` の祖先か：失敗。

計画にbranch作成時・正常同期時のbase記録を追加した。分岐時のrebaseは記録baseがHEADと新baseの双方に含まれる場合に限定する。作業開始点の根拠がなければ自動rebaseを止め、安全なFF/no-opは可能とする。

開始点不明のahead no-opから新たなbase記録を作らない条件も追加した。初回no-opを使って根拠のないcutoffが確立され、次回のrebaseで同じ問題が再発する経路を防ぐ。

## R02：ignored fileの上書き保護

`stash --include-untracked` はignored fileを退避しない。一方、Git mergeは既定でignored fileの上書きを許す。[Git公式仕様](https://git-scm.com/docs/git-merge)

一時fixtureで、ローカルではignoredの `local.cfg` をincoming branchが追跡し始める状態を作った。

- 通常の `merge --ff-only`：成功し、ローカルのignored内容がincoming内容へ置換された。
- `merge --ff-only --no-overwrite-ignore`：exit 1で停止し、ローカル内容を保持。
- この環境の `switch --no-overwrite-ignore -c ...`：上書きを拒否してexit 1。unknown optionではなかった。
- rebaseの途中のcommitだけが `local.cfg` を追跡し、最終commitでは削除済みのfixture：固定rebase optionでもexit 0で完了したが、ローカルのignored fileは消失した。

計画にFFの固定guardと、branch切替・rebaseでも必要なignored path衝突の事前検査を追加した。rebaseでは最終treeだけでなく、再適用する各commitの途中のpathも調べる。保護機構の全経路とWindowsでの対応は実装時の受入対象であり、このfixtureだけで検証済みとはしない。

## R03：同等patchによるcommit除外

`--empty=stop` で制御できる空commitとは別に、Gitはclean cherry-pickを事前除外する。除外を抑止するには `--reapply-cherry-picks` が必要。[Git公式仕様](https://git-scm.com/docs/git-rebase)

一時fixtureで、自分のbranchと共有baseが別commitとして同じfile・内容を追加した状態を作った。

- `rebase --merge --empty=stop base`：exit 0で終了し、baseとの差分commit列は空になった。
- 計画へ追加した `--reapply-cherry-picks --empty=stop --keep-empty` 等の固定optionと `--onto` による再適用：exit 1で停止した。

元から空のcommitを保持すること、autosquash/autostash/update-refsを無効化することも明示した。空になったcommitの保持・省略は明示選択として扱い、resumeからskipを推測しない。

## R04：実際のpush接続先

[現行publication helper](../scripts/post-recommit-publish.mjs)は `remote get-url <name>` でrepository表示等を解決するが、`git push <name>` はpush URLを使う。GitではURLの取得に `--push` / `--all` があり、`insteadOf` 等の展開後の値を得られる。[Git公式仕様](https://git-scm.com/docs/git-remote)

新しいsyncのplanがremote名だけを保存すると、同名remoteのpush URLがAgentの文案作成中に変更された場合や、複数push URLがある場合に、確認対象と実送信先を対応付けられない。

計画へ展開後のfetch/push URL identityとdigestを追加し、prepare/applyとcore内部の送信直前まで再検証することを明示した。初版は各一つ・同一repositoryの設定に限定し、未確認の送信先へ進めない。ここで変更したのは計画であり、既存publication helperの挙動を修正したことにはしない。

## R05：prepare後の中断とpullの妨害

元の計画にはoperation claimと途中失敗時停止があったが、prepareが正常に文案待ちになった後のlock解放・再開・取消がなかった。また、base進行でpush applyを止めた後、残った準備記録が次のpullを妨げる可能性があった。

計画では、実行中lockと保存済みoperation状態を分離した。文案待ちresumeではcommitを繰り返さず、保存済みevidenceを照合する。apply未開始のcancel/supersedeは記録だけを閉じ、既存commitや変更・文案を残す。新しい `sync pull` は、apply未開始が証明できる古いpush準備を失効させて進める。

remote apply開始後や結果不明のattemptは、この取消経路で解除しない。`work.commit` がpartial等を返した場合に、文案・pushへ進めない条件も明示した。

## 検証の範囲

- 実験環境のGitは `2.54.0 (Apple Git-157)`。Windows上の実験ではない。
- 一時fixtureは `/private/tmp` の新規repositoryで実行し、対象repositoryのbranch・index・作業内容や実remoteへは適用していない。fixtureは実験後に破棄した。
- R01〜R03はGit単体の挙動を再現した。R04/R05は現行sourceと計画の静的照合による指摘。
- 受入ケースは25件から35件へ拡充。新しいsync機能の受入テストを実行した結果ではない。
- 計画・合意仕様・状態文書のローカルリンク64件と `git diff --check`、受入case ID 35件の一意性を確認した。既存のversion更新差分は保持し、runtime・契約・SKILLへ機能実装は追加していない。
