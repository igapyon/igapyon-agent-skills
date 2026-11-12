# テストとCIの負荷を見直す計画

作成日: 2026-11-12。状態: 手順1・2を実装し、ローカル検証済み。
手順3は分割後のhosted CI計測を見てから判断するため保留。

## 採用する方針

Miku SCMの実装に関わるPRは、macOSとWindowsの両方でfull suiteを実行する。
まず最も遅いテストファイルを分割し、同じケースを既存の並列枠で実行して待ち時間を減らす。
変更と関係の薄い全件実行と、性能測定の繰り返しも減らす。
Windowsを一律fast suiteへ置き換える方針は採用しない。

GitHub Writerのfull suiteも両OSで維持する。通常のPRから反復benchmarkを外し、
性能を調べるときの手動実行へ移す。利用目的の決まっていない定期実行は追加しない。

## 判断の根拠

直近の成功したhosted CIからstep時間を取得した。待ち行列や後処理を含むworkflow全体の
時間とは分けて扱う。コードの異なる3実行なので、厳密な同条件比較ではない。

| 実行 | Miku SCM macOS full | Miku SCM Windows full |
|---|---:|---:|
| [#154 / 11月12日](https://github.com/igapyon/igapyon-agent-skills/actions/runs/43145493985) | 188秒 | 516秒 |
| [#152 / 11月10日](https://github.com/igapyon/igapyon-agent-skills/actions/runs/42830571085) | 176秒 | 480秒 |
| [#151 / 11月10日](https://github.com/igapyon/igapyon-agent-skills/actions/runs/42821671160) | 165秒 | 646秒 |

#154は両OSとも541件成功、57ジョブ、同時実行数4。ログのファイル別計測では、
`sync-push.test.mjs`単体がmacOSで172.0秒、Windowsで476.7秒だった。
どちらもsuite全体の経過時間の約92%に相当し、この未分割ファイルが完了を引き延ばしている。
`sync-pull.test.mjs`などは既に分割されている。

[GitHub Writer #115](https://github.com/igapyon/igapyon-agent-skills/actions/runs/43145493992)は、
full suiteがmacOSで8秒、Windowsで24秒。別stepのbenchmarkはそれぞれ8秒、28秒だった。
benchmarkを外す価値はあるが、数分かかる主原因はMiku SCMにある。

現行のfast suiteはファイル名で選択しており、`sync-fixture.test.mjs`、
`sync-pull.test.mjs`、`sync-push.test.mjs`、`post-recommit-publish.test.mjs`を含まない。
過去のWindows CRLF問題に関係する実Git操作もここにあるため、件数だけでfullの代替としない。

また、[最新の外部skill更新commit](https://github.com/igapyon/igapyon-agent-skills/commit/a4047cb8aefa778dcbf861587a8113a09c98ad0a)
でも両skillの全件が起動していた。両runnerの変更は`PRODUCT_VERSION`の1行のみで、
`pom.xml`には共通版数と外部skillの固定参照先の変更があった。
版数や同梱参照の整合は必要だが、それだけでGit公開・復旧の全ケースを回す効率は低い。

## 実装順と進捗

### 1. sync pushのテストを独立した4ファイルへ分ける

対象は[現在のsync-pushテスト](../../skills/igapyon-miku-scm/tests/sync-push.test.mjs)。
正常系・参照先、変更検出・停止、準備の継続、公開前停止からの復旧を目安に4群へ移す。
各ケースが一時repositoryを独立して作ることを確認し、共有helperは状態を持たない関数に限定する。
テスト数と期待値を維持し、製品側の処理はこの高速化で変更しない。

このファイルには`for (...) test(...)`で動的に生成するケースがある。
既存shard検査の`extractTestNames()`はその形式を抽出しないため、現在の正規表現方式へ
そのまま追加するのは避ける。物理的にファイルを分ければ、既存full runnerの自動収集に乗り、
動的ケースもそのまま全件実行できる。テスト名の分類表を新設する必要もない。

実施済み: `sync-push.test.mjs`、`sync-push-preflight.test.mjs`、
`sync-push-continuation.test.mjs`、`sync-push-recovery.test.mjs`へ4分割した。
登録ブロックの配分は6・10・6・6。動的loopを含む元の28ブロックをすべて移し、
full suiteで541件を維持した。手元のmacOSでは60ジョブ、同時実行数4、107.152秒で
541/541成功。Windows上の分割後所要時間はhosted CIで確認する。

同時実行数は既存の4を使う。最初の計測後も長いgroupが残る場合だけ配分を調整する。
小さいテストの大量分割や、並列数の引き上げは先に行わない。

### 2. PRの検出範囲を保ち、benchmarkを手動へ移す

| 変更・用途 | 実行内容 |
|---|---|
| Miku SCMの実装・テスト・契約変更 | macOS / Windowsともfull |
| GitHub Writerの実装・テスト・契約変更 | macOS / Windowsともfull |
| ローカルでの修正反復 | 変更箇所のfocused test。必要に応じてfast |
| 影響する実装の最終確認 | fullを一度実行。変更や失敗がなければ同じ検証を繰り返さない |
| 性能比較 | 手動benchmark。比較するOS・Node・Git等の条件を記録 |

前回の試案にある「PR Windowsはfast」「週次に両OS full」は取り消す。
PRでfullを両OSに残すため、それを補う目的の週次実行も追加しない。
GitHub Writerの新benchmark workflowは手動専用とし、月次scheduleを取り除く。
既存のbenchmark単体テストは3シナリオを各1回確認しており、PRでの機能検証として残す。

実施済み: Miku SCMはPRと手動実行で両OSのfullを実行する。
GitHub WriterはPRで両OSのfullを実行し、benchmarkは`workflow_dispatch`だけの別workflowへ移した。
新workflowはYAML parseと実行内容を検査した。

Java 17 setupは維持する。[work-commitテスト](../../skills/igapyon-miku-scm/tests/work-commit.test.mjs)
は実際にnpm/Mavenを起動する。#154でsetup-java自体は両OSとも1秒未満で、削除すべき
ボトルネックではなかった。今後軽量化する場合も、この実行確認をmockに置き換えない。

### 3. 版数・同梱参照だけの変更を適切な整合検査へ振り分ける（保留）

手順1〜2の効果を確認してから着手する。既存の変更判定を小さく拡張し、別の判定基盤は作らない。
Windows hosted CIで新分割を一度確認し、full suiteの時間と失敗検出を比べてから実装する。

- 4つの共通版数sourceについて、許可した版数値だけの変更かをbase/headの全文で確認する。
  `PRODUCT_VERSION`を持つファイル全体を対象外にせず、他の1行でも変わればfullへ戻す。
- POMの固定された外部skill参照値だけの変更は、参照形式・既存の同梱policy検査と版数整合へ送る。
  repo URL、skill名、build/plugin設定などの変更を同じ例外に含めない。
- 軽量経路でも共通版数の一致と両skillの生成契約checkを実行する。
  同梱policyが変わった場合は既存のpolicy・配布対象検査を実行する。
- `.github/`全体を一律共有とせず、各workflowと共通selectorの依存関係を明示する。
  既知の別skill専用変更で、無関係な両skillのfullを起動しない。
- skillのMarkdownを拡張子だけで一律除外しない。契約specや指示文の変更も検証対象になり得る。
- rename元、一覧の不完全さ、API失敗、PRのhead/base変更の確認は維持する。
  軽量扱いを証明できない場合はfullへ進むか判定失敗とし、未検証を成功扱いしない。
- `Miku SCM required` / `GitHub Writer required`の名前と失敗伝播を維持する。

分類ルールのテストは、版数変更にコード変更を1行混ぜる、POMのbuild設定を変える、
renameで対象を移す、不完全な一覧を渡す、といった実際に誤skipを起こし得る境界に絞る。

## 確認と完了条件

1. 既存のshard/worker検査、変更判定の境界検査、workflow YAMLの構文を確認する。
2. 分割したsync push群と最終fullを照合し、既存541件のケース・動的な生成ケースを保持する。
   新しい検査を加えた場合はその分だけ件数増を説明する。失敗とspawn異常が成功にならないことも確認する。
3. ローカルで対象skillの最終fullと必要な契約checkを一度実行する。
   Maven package、外部skill全件、全repositoryのテストを一律に追加しない。
4. 実装を含む最初のPRで両OS fullの成功とファイル別時間を確認する。
   hosted Windowsでの速度改善は、その結果が得られてから報告する。
5. 以後の通常PRで得られる3回分程度の結果を集め、中央値と最大値を記録する。
   計測のためだけに同じfullを繰り返さない。最初の目標はWindowsのtest step中央値5分以内、
   macOSは2分以内とする。これは改善の目安であり、共有runnerの秒数でPRを落とす閾値にはしない。
6. 待ち時間と両OSの実行時間合計を比較する。fixtureの分離、ケースの検出範囲、失敗検出を
   維持できたことを確認し、保守記録と両skillの実行案内を最終構成へ揃える。

手順1・2の検証結果: Miku SCM full 541/541・60ジョブ、GitHub Writer full 34/34、
共有CI selector 3/3、Miku SCM workflow contract 37件、GitHub Writer contract 12件が成功。
YAML parse / trigger確認、`git diff --check`も成功した。Miku SCM test suite内の固定Maven checkも成功。

新分割のWindows hosted CIは未実施で、Windowsの性能改善は未確認。手順3、GitHub側の設定、
commit/pushは別段階。先行作業を含む現在の共通版数は`1.20261112.3` / `20261112c`。
