# Contract CIの実行回数・待ち時間の改善

## 観測

Miku SCM Contract #134（run `40957787747`）は成功し、全体11分42秒だった。
macOS jobは2分36秒、Windows jobは11分38秒。Windowsのfull suiteは
442件成功・失敗0件で、旧`regular`グループが632,789.718msを占めた。
PR作成時の#133とdevelへのmerge後の#134がそれぞれ全件検証を実行していた。
Release archiveは40秒で終わり、Contract完了を待つ依存関係はなかった。

## 変更

- Contractは`pull_request`と`workflow_dispatch`で実行し、devel pushによる再実行を除く。
- workflow全体のpath filterを除き、PR変更ファイルをページング取得して対象skillを判定する。
  rename元も対象。API取得失敗は失敗扱い、不完全な一覧は全件検証へ進む。
- 対象外のPRも最終判定を返す。対象のテスト失敗・取消・skipや変更判定の失敗を成功扱いしない。
- PR番号・workflowごとのconcurrencyで古い実行を取消する。手動実行は別グループで必ず全件検証する。
- macOS/Windowsの検証jobに20分、変更判定と最終判定に5分の上限を設ける。
- miku-scmの従来`regular`にまとめていたテストをファイル単位で計測する。
  既存の独立したname shardと合わせて既定4プロセスまで実行する。
  開始・終了・失敗を即時表示し、30秒ごとに実行中ファイルと待機数を表示する。
  `--full --jobs 2` / `--full --jobs 4`で同じWindows環境の比較が可能。
- ローカル計測で最長だったsync pullを、独立fixtureの4グループへ分割する。
  各patternをテスト名のprefixへ限定し、Nodeのファイルcontainerに一致して
  全ケースを重複実行することを防ぐ。分割前後のfull suite総件数も照合する。

これはWindows高速化のための計測・並列制御の実装であり、Windowsでの速度改善を
確認した記録ではない。次のWindows CIでファイル別時間を取得し、長いファイルの
分割または同時実行数を選ぶ。テストケース数・失敗検出を維持して比較する。

## ローカル検証

macOS / Node.js v26.12.1で確認した。CIのNode.js 24 / Windowsでの確認は未実施。

- 同時実行上限4・ファイル別計測導入後、sync pull分割前はfull suite **445/445**、
  全体158.862秒。sync pull単体152.222秒、sync push単体58.057秒だった。
- sync pullの4分割後はfull suite **445/445**、全体76.250秒。
  sync pullの各groupは46.191 / 27.837 / 28.860 / 34.220秒。
  単発比較で約52%短縮したが、Windowsの改善率や再現性を示すものではない。
- suite制御の追加3ケースを含む445件で、変更前442件のケースを維持。
- GitHub Writer full suite **34/34**、CI変更判定・最終gate **3/3** 成功。
- workflow契約37件のdriftなし、YAML・inline JavaScript構文、差分検査に成功。
- workflowのGitHub配備と必須チェック設定、Windows CI計測はこのローカル検証に含まない。

## GitHub側の適用手順

1. この変更を含むPRで新workflowのmacOS/Windowsと最終判定の成功を確認する。
2. develのrulesetまたはbranch protectionで、PR経由のmergeを要求し、次の2つを
   必須チェックに登録する。workflow内の`required` jobの名前である。
   - `Miku SCM required`
   - `GitHub Writer required`
3. 古い`macos-latest` / `windows-latest`を必須登録している場合は置き換える。
   これらは対象外変更で省略されるjobなので、必須にするのは最終判定だけとする。
4. base更新時には最新baseとの検証を要求する設定を使用する。merge queueを将来
   導入する場合は、先に`merge_group`の起動・変更判定対応を追加する。
5. 以後はPRの必須チェック成功 → merge → tag → Release archiveの順に進める。
   tagの対象はそのmerge結果とし、未検証の直接pushを公開対象にしない。

rulesetはリポジトリのファイルではなくGitHubの設定である。YAMLの`required`という
job名だけではmergeは制限されない。変更の配備、ruleset設定、Windows上の計測は
それぞれ実際の結果を確認してから完了とする。Release archive自体にはContract待機を
追加していないため、タグを先行させると従来通り配布処理が起動する。

## 2026-11-12 Miku SCM待ち時間の再調査

再調査の結論と実装順は[テストとCIの負荷を見直す計画](../plans/contract-ci-balance-plan.md)を参照。
PRではMiku SCMとGitHub Writerのfull suiteをmacOS/Windowsの両方で維持する。
Miku SCMで最も遅かった`sync-push.test.mjs`は、動的テストを名前で選別せず、独立した4ファイルへ分割する。
GitHub Writerの反復benchmarkはPRから外し、手動workflowへ分離する。

GitHub Actionsの実測では、#154のMiku SCM full suiteは541/541、57ジョブ、並列数4。
macOSは188秒、Windowsは516秒で、`sync-push.test.mjs`だけでそれぞれ172.0秒と476.7秒を使った。
GitHub Writer #115のfull suiteはmacOS 8秒、Windows 24秒。benchmarkはさらに8秒、28秒だった。

以前の試案でWindows fullをPRから外す判断は採らない。fast suiteにはsync fixtureとGit公開・復旧の実ケースが
含まれず、既知のWindows改行問題への継続確認が弱くなるためである。Java/Maven setupも維持する。
`work-commit.test.mjs`はfixture上で実際に`mvn validate`を起動する。

変更後、macOS / Node.js v26.12.1のMiku SCM full suiteは541/541成功、60ジョブ、
同時実行数4、107.152秒。sync-push、preflight、continuation、recovery群は
26.737、38.273、18.722、54.716秒だった。
GitHub Writerは34/34成功。selector 3/3、Miku SCM workflow contract 37件、
GitHub Writer workflow contract 12件も成功し、対象workflow 3つのYAML構文とtriggerを確認した。
固定Maven checkと`git diff --check`も成功。変更後のWindows hosted CIはまだ実行していない。
