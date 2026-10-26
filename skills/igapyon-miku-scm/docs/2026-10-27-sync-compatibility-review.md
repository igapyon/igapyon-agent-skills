# sync導入とupstream修正の互換性レビュー

2026-10-27。状態：4件ともsourceへ対応済み・macOSで検証済み。以下の再現結果は修正前の記録で、対応内容は末尾に記す。

比較対象はsync導入前のcommit `8d8f68cb031559c7107d766709b752f4c32314e5`、現HEAD `748ebdfdfa66c50cba52318ba492353a883ab32a`、および作業ツリーのupstream修正。レビュー対象と記録を `skills/igapyon-miku-scm/` 内に限定した。利用者の現在branch設定、配備先、commit/pushは変更していない。

## 結果

| ID | 判定 | 対象 | 結果 |
| --- | --- | --- | --- |
| R01 | P2・不具合 | 今回の次branch作成修正 | upstreamを読むpost-checkout hookが、設定前に実行されて失敗する |
| R02 | P2・未説明の互換性差 | syncのfetch | remoteのfetch refspecを上書きし、取得対象外のbranchも取得する |
| R03 | P2・未説明の互換性差 | sync pullと従来のmerge done | 新しいtagをローカルへ自動取得しなくなる |
| R04 | P3・設定互換性の判断が必要 | 今回のupstream修正 | branch.autoSetupMerge=false / inheritでもupstreamを強制設定する |

R02〜R04は実際に再現した動作差である。新しい固定仕様として採用するか、従来のGit設定・操作に合わせるかの判断が必要で、現状のまま「従来と同じ」とは説明できない。

## R01：post-checkout hookが見るupstreamの順序

対象：[post-merge-next-work.mjs](../scripts/post-merge-next-work.mjs) の `createNextWorkBranch()`。

従来は `git switch -c <next> origin/devel` が追跡設定を作ってからpost-checkout hookを実行した。現在の修正はSHAからのswitchを終えた後に `setNextWorkUpstream()` を呼ぶため、hook実行時にはupstreamがない。

一時repoに次のpost-checkout hookを置き、従来のコマンドと現在の共通helperを比較した。

```sh
#!/bin/sh
git rev-parse --symbolic-full-name '@{upstream}' > .git/review-hook-upstream 2> .git/review-hook-error
```

- 従来：switch成功。hookは `refs/remotes/origin/devel` を取得できた。
- 現在：switchがexit 1。hookは `fatal: no upstream configured for branch 'after'`。すでに新branchへ切り替わっているが、後続のupstream設定へ進めない。
- 新しい `sync pull` だけでなく、共通helperを使う既存 `github merge done` にも影響する。

修正案：branchを取得済みSHAで作り、追跡設定・HEADを検証してからswitchする。途中のbranch作成・設定・切替をoperation記録と対応付け、失敗後に同じbranchを再作成しないようにする。hookの無効化や不明なhookの自動再実行で回避しない。hook内でupstreamを参照する一時repoの回帰ケースを追加する。

## R02：remoteのfetch対象を上書きする

対象：[miku-scm-sync-state.mjs](../scripts/miku-scm-sync-state.mjs) の `fetchBase()`。

従来の `github merge done` と既存publicationは `git fetch <remote>` を使う。syncは次の固定refspecを渡すため、remoteに保存されたfetch対象を尊重しない。

```text
git fetch --no-tags <remote> +refs/heads/*:refs/remotes/<remote>/*
```

一時repoで `remote.origin.fetch=+refs/heads/devel:refs/remotes/origin/devel` を設定し、remoteに `devel` と `excluded` を用意した。

- `github merge done`：`origin/excluded` は作られなかった。
- `sync pull`：`origin/excluded` も作られた。

修正案：configured refspecを尊重するか、対応できない設定では取得前に理由を示して停止する。公開済みcommitの検出に必要な証拠を弱める変更は行わず、base取得と公開履歴の検査の両方を確認する。単純に通常fetchへ置き換えて安全性確認を終えた扱いにはしない。

## R03：tagのローカル自動取得が省略される

対象は同じ `fetchBase()` の `--no-tags`。

一時repoで、remoteに版数対応tag `v20261026e` を作り、ローカルには存在しない状態で次branch移行を比較した。

- `github merge done`：移行成功。`tag_status=confirmed`。ローカルのtagも存在した。
- `sync pull`：移行成功。`tag_status=confirmed`。ローカルのtagは存在しなかった。

`confirmed` はremoteのtag照会結果なので、その値自体は誤りではない。ただし従来の操作をsync pullで置き換えると、ローカルのtag参照を使う操作に差が出る。

修正案：従来どおりGitのtag自動取得設定を尊重する。全tagを強制取得する `--tags` ではなく、不要な `--no-tags` 固定の見直しを行う。tag作成・移動・pushとは別の取得動作として説明と回帰ケースを整合させる。

## R04：自動追跡を無効にした設定も上書きする

対象：[post-merge-next-work.mjs](../scripts/post-merge-next-work.mjs) の無条件の `--set-upstream-to` と、それを要求する追加テスト。

一時repoで `branch.autoSetupMerge` を `true` / `false` / `inherit`、`branch.autoSetupRebase` を `never` / `remote` にして6組を比較した。

- `autoSetupMerge=true`：従来と現在のremote・merge・rebase設定が一致した。`autoSetupRebase=remote` の `branch.<next>.rebase=true` も保持された。
- `autoSetupMerge=false` / `inherit`：従来はupstream未設定。現在はremote・mergeを設定し、`autoSetupRebase=remote` ならrebase設定も追加した。

今回追加した「自動追跡無効でも追跡を必須にする」テストは、従来との互換性を証明するテストではなく、新しいルールを固定している。

修正案：追跡を常に必須にする方針を採るなら、その設定上書きを意図した仕様として扱う。従来互換を優先するなら、Git設定に応じた追跡作成を復元し、既定設定でupstreamがなくなる今回の不具合と区別してテストする。

## 既存処理の照合結果

- 既存 `work.commit` とwriting evidence生成本体はsync導入で変更されていない。
- recommit/publicationへの追加チェックはsyncから渡す内部callbackに限定され、通常の既存コマンドでは呼ばれない。dirtyを許容するのもsync準備のpreflightだけで、applyのclean条件は保持されている。
- 既存 `github merge done` の人間による確認、staged変更の停止、保持stash、tag助言は残っている。
- Git 2.45要件、`-done`の正確なPR検証、sync側のstaged復元、backup・operation記録、公開済み履歴の停止はsyncの説明済みの仕様。次branch作成のignored上書き防止も、共通化で加わった安全側の変更として区別した。
- version候補表示とhuman output v15は、実producerのschemaに合わせる説明済みの表示修正である。

## 初回レビュー時点の検証範囲

macOSの一時repoとbare remoteで上記を再現し、作成したGit fixtureは削除した。外部GitHub書き込みや利用者のrepo設定変更は行っていない。

直前のupstream修正の全体テスト376/376、対象5件、契約37件、Skill validatorは成功済み。ただし今回のhook・fetch設定・tag比較ケースをその376件が網羅していたわけではない。初回レビューではruntimeを変更せず、同じ全体テストの再実行は行わなかった。後続の利用者依頼による対応と検証を以下に記録する。

## 4件への対応（2026-10-27）

利用者の「対応して」に従い、従来のGit設定を尊重する方針で4件を修正した。既存の版数更新 `1.20261027.1` / `20261027a` を保持した。

- R01：Gitのbranch作成で追跡・rebase設定を先に準備し、取得済みSHAとの一致を作成前後に検証してからcheckoutする。hookは準備済みの設定を参照できる。共有refが途中で変わればcheckout前に停止する。checkout失敗時は作成済みbranchを保持する。
- R01の回復：syncにbranch準備・切替の記録を追加した。正常な準備記録があれば同じbranchへ再開する。準備記録が不完全、またはcheckout/hookの成否が不明なら停止し、明示した解決確認付き `--resume --resolved-next-work` を要求する。すでに次branchへ移っている場合にhookを再実行しない。carryoverの解決確認は別に維持した。
- R02：`git fetch <remote>` を用い、設定済みrefspecを上書きしない。headsから選択remoteのtracking namespaceへのexact/wildcard mappingとnegative refspecを扱う。baseが除外されるかmappingが未対応ならfetch前に停止する。狭い取得範囲でもno-op・FF・検証済み次branch移行は可能で、公開証拠が不足するrebaseはbackup前に停止する。
- R02のpush側：公開が必要な場合はbaseと公開branchの両方を取得できることを通常commit前に確認する。公開不要のclean no-opはbaseのmappingだけで終了する。prepare/apply間のfetch/tag設定変更も拒否する。
- R03：`--no-tags` の固定を除き、通常のtag自動取得と明示された `remote.<name>.tagOpt` の両方を尊重する。
- R04：`branch.autoSetupMerge` のtrue / false / inherit / simple / alwaysと、`branch.autoSetupRebase` のnever / remoteの10組で、通常のGit branch作成と設定が一致することを確認した。追跡無効の設定を強制的に上書きする処理は削除した。

Skill入口、操作reference、CLI/help、生成契約を更新した。今回の修正の実行対象は一時Git repositoryとbare remoteであり、利用者の現在branch設定、commit/push、配備は変更していない。

最終確認：full suite **389/389**、契約37件のdriftなし、Skill validator、`mvn validate`による4値の版数整合、`git diff --check`が成功。今回の追加ケースをWindows CI/実機で実行した結果は未確認。版数更新を含む作業ツリーの変更は未stage・未commit。
