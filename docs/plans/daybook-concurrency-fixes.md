# daybook：並列書き込みの自己レビュー指摘への対応

2026-11-03。状態：スキル同梱版と実daybookへの実装・検証完了、未コミット。

## 対象と合意

[activity分割の実装](daybook-activity-files-and-runtime-alignment.md)後の自己レビューで、既存記録の追記消失、同一Issueの重複取り込み、新規activity作成の無限再試行を再現した。利用者の修正計画に従い、この3経路を修正した。

- activity名は日付直後に小文字連番を付け、`a…z, aa…az, ba…zz, aaa…` と進める。
- 旧日次ファイル、保存済みのschema v1 plan/result、同じplanの途中再開を維持する。
- source側は公開済みの`devel-tiga1101kaa-done`から修正用ローカルブランチ`fix/daybook-concurrent-writes-20261103`を作成した。PRのマージ済み扱いは行っていない。
- 実daybook側は`devel-tiga1103iaa`、開始時HEADは`64e860e2c6ca6021e42f247e6cbbb1ea06c4f44a`で、開始時cleanだった。

## 実装

### 1. 既存task・scheduleへの関連付け

`validateLinkTarget`が一度読み取ったbytesから、本文と`before_hash`を作る。prepareの完了前に現在のファイルと照合し、変更や削除があれば`SOURCE_CONFLICT`で停止する。更新案を作った後で読み直したハッシュを、その案の変更前状態として採用しない。

planの保存形式は変更していない。修正前のruntimeで作成した未適用の`link-existing` planは、元の読み取り状態を後から証明できないため再prepare・再レビューを案内する。途中適用済みのrunは同じplan/resultを保持する。

### 2. 同じIssueの並列取り込み

applyはrepoロックを取得した後、書き込み前に現在の出典を再走査する。対象Issue URLに別の取り込みによる記録があれば、record keyやパスが違っても`SOURCE_CONFLICT`で停止する。別Issueを含むplanでも、競合検出前に正本への部分書き込みを始めない。

同じplanの途中再開とresult消失からの復旧では、パス・record key・import ID・after hashが一致した既存の書き込みを認める。予定パスの内容がbefore/after hashのどちらとも違う場合は、先に`LOCAL_CONFLICT`として扱う。

回帰テストで、旧来のresult復旧が`uncertain`コメントに説明文を保存せず、次の再開で自らの検証に失敗する問題も判明した。復旧時に説明を保存し、旧runtimeが保存した`RESULT_RECOVERED`かつ説明欠落の結果も説明を補って再開できるようにした。コメント投稿の成否は引き続き`uncertain`として保持する。

### 3. activity作成時の名前衝突

`EEXIST`で拒否された候補を、その作成処理内の予約済みパスへ追加する。大文字拡張子などのため正規名の走査で見えない衝突でも、同じ候補を繰り返さず次の英字へ進む。既存ファイルは置換しない。

最大32回の衝突で`ACTIVITY_CREATE_CONFLICT`として停止し、最後の候補パスを示す。成功・失敗のどちらでも一時ファイルを片付ける。

## 反映と検証

- source：runtime 2ファイル、対応tests 2ファイル、operations/issue-importの手順を更新した。
- 実daybook：同じruntime/testsの4ファイルとREADME、計5ファイルを反映した。対象のbranch/HEADと全before hashを確認した後、レビューした内容を適用した。
- 修正前のruntimeに対し、追加した6つの競合テストが失敗することを確認した。修正後は全て成功した。
- source同梱daybook suite：**68/68成功**。
- 実daybook suite：**67/67成功**。件数差は従来の通知メンション設定とtestsの違いによる。
- 参照・配布関連suite：**78/78成功**。skill-creatorの`quick_validate.py`：成功。
- 旧日次append plan、schema v1、通常の再apply、途中再開、result消失時の復旧を既存・追加testsで確認した。
- 大文字拡張子との衝突は、filesystemに依存しない再現と、このmacOSの大文字・小文字を区別しないfilesystemでのCLIの両方で確認した。native Windowsでの実行は未確認。
- 反映・tests後に、source/実daybook間のruntime/tests 4ファイルがbyte単位で一致した。既存のGit管理下の年別記録・添付・waypoints等**104ファイルのSHA-256が不変**だった。
- 両repoの`git diff --check`が成功した。

検証用の書き込みは一時repoを使った。今回の保護対象は、再現した取り込みと新規作成の3経路であり、任意の外部編集との完全な排他を保証するものではない。インストール済みskillへの同期、版数変更、commit/push、GitHub投稿は今回実施していない。
