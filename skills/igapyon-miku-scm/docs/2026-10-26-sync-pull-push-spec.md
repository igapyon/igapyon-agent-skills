---
title: miku-scm sync pull / sync push 合意仕様
status: implemented-locally-verified
created: 2026-10-26
updated: 2026-10-26
---

# miku-scm sync pull / sync push

## 状態と目的

2026-10-26の会話で、利用者向けの名称と動作を合意し、その後の実装指示によりsourceへ反映した。[実装計画・検証記録](2026-10-26-sync-implementation-plan.md)と、運用上の正本 [sync pull](../references/sync-pull.md) / [sync push](../references/sync-push.md) を参照。full suite 368/368をローカルで確認した。配備、実GitHub、native Windows、モデル会話確認の完了を意味しない。

複数人が別々の作業branchで開発すると、自分のPRをマージして次のbranchを作った後にも、他の人のマージで共有baseが進む。現在の作業を保ちながら追従する操作と、手元の変更をPR用の作業branchとして送り出す操作を用意する。

ここでいうコマンドは、miku-scmに対する利用者の依頼名である。新しいshell実行ファイルや内部workflow IDの名称は、この合意では定めていない。

## 利用者向けの定義

| 依頼 | 方向 | 完了時に得られる状態 |
| --- | --- | --- |
| `miku-scm sync pull` | 共有base → 手元の作業branch | 取得した共有baseを含み、自分のcommit・編集中の変更を引き継いで作業を続けられる |
| `miku-scm sync push` | 手元の作業branch → GitHub上の作業branch | 必要なcommit、PR文案、recommit、push、検証を終え、ローカルbranchが `-done` になる |

両者は、それぞれ一方向の操作として定義する。`sync push` は作業branchへの送信であり、共有baseへのPRマージは人間がGitHub上で行う。

## sync pull

共有baseの最新状態を取得し、現在の作業branchとの関係を調べ、次の処理を選ぶ。

| 状態 | 動作 |
| --- | --- |
| 取得したbaseをすでに含む | 自分の作業を保ち、取り込み不要として終了 |
| 自分の新しいcommitがなく、baseだけが先へ進んだ | fast-forwardで追従 |
| 自分の未公開commitとbaseの両方が進んだ | backupを作り、自分のcommitを取得したbaseの上へrebase |
| 未commitの変更・未追跡ファイルがある | 必要な変更を退避し、同期後に復元 |
| rebaseまたは変更の復元で競合した | 後続処理を止め、backup・退避データと停止状態を保持して、競合箇所を示す |

取得対象のremoteとbaseは対象repositoryの既存規則に従って解決する。通常の例は `origin/devel` だが、固定値にはしない。完了の基準は、その実行で取得したbaseのcommitとする。完了後に他の人が追加でマージした場合は、再度 `sync pull` できる。

通常の作業branch上では、既存のbackup方針を維持する。公開・共有された履歴の自動書き換えは、この未公開commit向けrebaseの合意範囲に含めない。`-done` branchは、次節の確認付き移行を実装する案として扱う。

### 追加設計：`-done` の入口確認

後続の検討依頼を受け、[実装計画](2026-10-26-sync-implementation-plan.md)では次の分岐を採用案とする。

- 現在branchが `-done` **でなければ**、`github merge done` 相当のPR確認は不要。そのまま通常のfetch・同期へ進む。
- `-done` **なら**、対象PRのマージ状況とrepository・head branch/SHA・baseの対応を固定helperで確認する。
- 正確にマージ済みと確認でき、取得baseにマージ結果が含まれ、作業の保存・次branch作成の条件を満たす場合は、`github merge done` 相当の次branch作成と引き継ぎを冒頭で行う。
- PRが未マージ、確認不能、複数候補、または条件不一致なら、旧branchを保持して停止する。`-done` の名前だけでマージ済みとは判定しない。
- 人間の報告を受ける既存の `github merge done` は残す。自動経路で人間の報告を捏造せず、検証済みPR証拠を受け取る内部経路を追加する。

これにより、マージ後に `github merge done` を呼び忘れても、条件がそろえば `sync pull` の依頼だけで次の作業へ進める設計とする。現行runtimeは、この追記によって変更しない。

## sync push

次の2つの既存操作をまとめた複合コマンドとする。

```text
miku-scm sync push
  → 必要な場合に miku-scm git add commit
  → miku-scm draft recommit push
```

1. 未commitの変更があれば、既存の `work.commit` と同じ対象範囲・整合チェックでcommitする。通常の非ignore変更を一括で扱う既存規則を引き継ぐ。
2. すでにcommit済みなら、commit段階を省略する。
3. 既存のPR文案準備・再利用規則に従い、対象範囲に対応するPRタイトルと本文を保存する。
4. backup、recommit、作業branchのpush、push後の照合、ローカルbranchの `-done` 化まで進む。
5. 途中で失敗したら、その段階で停止する。すでに成功したcommit等は結果として示し、変更やbackupを保持する。

一連の操作を依頼した場合、各段階の固定チェックが成功する間は、成功のたびに追加の会話確認を挟まない。PR文案の作成は既存どおりAgentが担当し、機械的なGit処理は固定runnerへ委譲する。

`sync push` の定義は上記の2操作の合成であり、`sync pull` の自動実行までは含めない。共有baseが進み、既存のrecommit条件を満たせなければ、停止結果と `sync pull` が必要なことを示す。

既存のbackup、PR文案digest、remoteの期待SHA、`force-with-lease`、push後の照合、`-done` の保証を維持する。成否が不明なpushを自動再試行しない。

## 既存操作との関係

- `git add commit` と `draft recommit push` は引き続き個別に使える。
- 既存の互換名 `pr recommit push` も維持する。
- `sync push` はcommit段階も含む。既存の `draft recommit push` の開始条件や動作範囲は拡張しない。
- PRの作成・マージ後は、従来の `miku-scm github merge done`、または上記の `sync pull` の確認付き移行により、共有baseを取得して次の作業branchへ進む設計とする。
- `sync pull` / `sync push` の依頼だけで、versionの自動増分、tag作成、Release公開は行わない。

普段の利用例は次の流れになる。`sync pull` は共有側の変更を取り込みたい時に使う。

```text
sync pull → 作業 → sync push → GitHubでPR作成・マージ → github merge done
```

## 実装時に詰める事項

以下は、利用者向けの名称・基本動作とは分けて、[実装計画](2026-10-26-sync-implementation-plan.md)で具体化した。各項目は後続実装・検証で確認する。

- 内部workflow ID、CLI引数、結果schema、manifest・help・生成契約の追加方法。
- backupとstashの識別・保持方法、staged / unstaged状態の復元、未追跡ファイル名の衝突、競合後のcontinue / abort経路。
- 公開済みcommit、共有baseの履歴書き換え、進行中のmerge / rebase、submodule等の特殊状態の判定と停止条件。
- 変更も送信対象commitもない場合の結果、PR文案を再利用できる範囲、base更新後のversion整合確認。
- macOS / native Windowsでの共通実行、途中失敗時の状態保存と再開、既存の個別コマンドとの互換性。

現行の規範・実装を読んで具体化し、実装後に通常系・競合・途中失敗を検証する。本書の保存だけで、それらの検証が完了したことにはしない。

実装計画の[自己レビュー](2026-10-26-sync-plan-self-review.md)では、作業開始点の根拠、ignored fileの保護、commitの自動除外防止、実際のpush接続先、中断した準備の再開・取消を補強した。名称と基本動作は維持し、条件の根拠が不足する場合の自動rebaseや送信は停止する。

## 参照

- [現行SKILL](../SKILL.md)
- [SCM規則](../references/scm-rules.md)
- [Work Commit](../references/work-commit.md)
- [Draft Recommit Push](../references/github-pr-recommit-push.md)
- [Work Cycle設計](work-cycle-lifecycle-redesign.md)
- Git公式：[fetch](https://git-scm.com/docs/git-fetch)、[merge](https://git-scm.com/docs/git-merge)、[rebase](https://git-scm.com/docs/git-rebase)、[stash](https://git-scm.com/docs/git-stash)
