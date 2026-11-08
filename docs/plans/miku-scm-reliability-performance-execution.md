# miku-scm 改善の実施記録

計画: [Luna向け改善計画](miku-scm-reliability-performance-luna-implementation.md)

## 開始状態（LUNA-00）

- 2026-11-05、branch `devel-tiga1103vea`、HEAD `4d9b856`。
- 既存差分は計画書とTODOの計画追記。保持して実装する。
- Node v26.12.1、Git 2.54.0（Apple Git-157）、macOS。
- 開始時contract 37件current、fast baselineは247/247成功。
- 対象: LUNA-01〜09。実repositoryへの公開・配備と製品版数更新は別操作。

## 実装・検証

### LUNA-01〜02: ignored保護の性能

`guardIgnored()` の1回の呼び出し内で、実pathごとのignore判定とparent directoryごとの正規化済み名前一覧を再利用する。stash前後・別operationのcacheは共有しない。check-ignoreの異常終了は非ignoredとして扱わず停止する。

新規 `miku-scm-sync-guard.test.mjs` の4ケースは修正前に失敗し、修正後に4/4成功。実pullでも100個の新規対象ファイルと既存の未追跡作業を統合し、check-ignoreが1回、未追跡内容が保全されることを検証した。case alias、symlink、既存ignored衝突の回帰はfull suiteで確認する。

同じ構成の一時repositoryを作り直し、レビューと同じ計測scriptで再計測した。macOS、Git 2.54.0、guard1回の単発値。実pull全体の時間ではない。

| 条件 | 件数 | 変更前 | 変更後 | check-ignore process数の前→後 |
| --- | ---: | ---: | ---: | ---: |
| 全件追跡済み、ignorecase=true | 100 | 0.061秒 | 0.040秒 | 0→0 |
| 全件追跡済み、ignorecase=true | 1,000 | 0.790秒 | 0.062秒 | 0→0 |
| 全件追跡済み、ignorecase=true | 3,000 | 6.286秒 | 0.116秒 | 0→0 |
| 取り込み先と重なる未追跡directoryあり | 100 | 1.229秒 | 0.051秒 | 100→1 |
| 同上 | 1,000 | 11.897秒 | 0.070秒 | 1,000→1 |
| 同上 | 3,000 | 35.428秒 | 0.128秒 | 3,000→1 |

追加の読取回数計測では100/1,000/3,000件のすべてでrootとincomingのreaddirは各1回、check-ignoreは1回。full実行中の計測値は0.065/0.122/0.253秒だった。CPU/IO負荷や測定用wrapperで時間は変わるため、CIの完了基準は回数と保護結果とする。

### LUNA-03〜04: 公開計画

- 保存計画のbranchを適用開始時、fetch後、callback後、push直前、rename前の状態へ結び付ける。
- 展開後のfetch/push URL配列のSHA-256を計画schema 2へ保存し、同じ境界で照合する。旧schemaは新しいpreflightを案内して停止する。
- recommit前後の公開preflightでもbranchとURL digestを照合し、変更後の対象で公開計画を作り直さない。
- 別branchへの切替、fetch/push URL・配列の変更、fetch中・callback中の変更、旧schemaを一時bare remoteで確認。対象外のremoteへのpushは0回。claim後の停止は既存のunresolved扱いを維持する。

### LUNA-05: work.commit

- detached HEADをstaging前に拒否。staging前とcommit直前に開始branch/HEADを照合する。
- commit後はbranch、単一親、予定index treeを検査。hookや別操作で変化した場合はpartialとし、実測した最終branchと現在HEADを報告する。
- check中の通常branch/-done branchへの切替、空commitによるHEAD変化、hookによるtree変化、detached HEADを回帰テストへ追加。
- 公開・commit関連の最初のfocused検証は100/100成功。その後追加した境界ケースは最終fullへ含める。

### LUNA-06: check失敗後の再準備

未公開・同一branch/HEADで、通常commitのcheck前後に停止した証拠が揃う1件だけをsupersededにし、新しいplain sync pushで通常check・sensitive path確認をやり直す。失敗原因と次コマンドを最初の結果へ保持する。

成功までの通常commitは1件、checkは再実行されることを確認。新規sensitive path、branch/HEAD変更、commit段階の停止、公開結果不明は安全な再準備と区別する。

### LUNA-07: 初期化lockの取消

lock schema 2のinitializing/operation-recordedを保存し、同じID・rootの終了済みprocessで、operation directoryが存在しない初期化だけを明示abort/cancelで取消可能にした。既存operationのapply/resumeはoperation-recordedとして取得する。

実child processをlock取得直後に終了させ、pullのabortとpushのcancel、その後の新規pull成功を確認。live PID、別root/ID、旧形式、壊れたJSON、記録済みphase、directoryだけ存在する状態、resumeでの迂回を拒否する。復旧中に新operationへ進んだ場合もlockへ新IDを記録する。

### LUNA-08: 原因診断

Gitのexit/signal/spawn codeと固定分類・案内を返す。認証、DNS、接続、repository不在、権限、timeoutを区別し、stderr本文やURL認証情報を診断へコピーしない。partial/unresolvedの復旧案内を通信エラーの再実行案内で上書きしない。

実pullの存在しないremoteと分類表を検証。401/403、資格情報を含むURL・Authorization等の非露出も確認。human outputと診断のfocused検証は31/31成功。

## LUNA-09: 統合検証

- fast baseline: 247/247。
- 改善後fast checkpoint: 272/272。
- check再準備・lock・診断・既存sync pushのfocused検証: 59/59。
- 最初のfull: 531/531、失敗0、約151秒。
- 最終のlock ID更新・途中停止時HEAD表示を含むfocused: 43/43。
- **最終full: 532/532、失敗0、57ジョブ、152.347秒。** LUNA-00〜09を実装・ローカル検証完了。
- contract 37件を再生成し、チェックがcurrent。`git diff --check` と新規文書のローカルリンク・改行・末尾空白チェックも成功。

検証コマンドは計画記載のfocused tests、`npm run test:miku-scm:fast`、`npm run test:miku-scm:full`、workflow-contract generatorと`--check`、`git diff --check`。最初のfull後にlock IDと表示の補強を行ったため、追加回帰と最終fullを再実行した。

採用方式は計画どおり、guard内cache、保存公開計画schema 2、初期化lock schema 2、既知のcheck停止だけの再準備、固定分類による診断。計画の新規公開機能への拡張は行っていない。

Windows実機・hosted CIの結果は未取得。実GitHubへの書き込み、実利用repositoryのsync、配備、版数変更、commit/pushは実施していない。

## 後続の自己レビュー（2026-11-05）

保存計画を使わない直接helper applyでは、同じHEADの別branchと別remoteへ切り替えると変更先への公開が成功した。固定runnerは保存計画を必須にしており、この残存経路と区別する。

また、取り込み対象と同名の未追跡ファイル100件ではcheck-ignoreが101回、約1.2〜1.3秒だった。前記の高速化値は同じ親directoryへの重複照会を減らせたfixtureの結果であり、異なる既存pathの大量照会は別途対応が必要。

この2件の[Luna向け追加対応計画](miku-scm-self-review-followup-luna-implementation.md)に沿って、直接applyを保存計画経由に限定し、異なる未追跡pathの照会をstdin batchへ変更した。前記LUNA計測は同じparent-directory条件を対象としており、異なるleafを大量に含むpath構成はこの追加計測で別に確認した。[追加実施記録](miku-scm-self-review-followup-execution.md)に詳細を記載。異なるpath 101 / 1,001 / 3,001件のprocess数は101 / 1,001 / 3,001回から1 / 2 / 6回へ、時間は1.181 / 11.730 / 35.511秒から0.052 / 0.089 / 0.195秒へ減少した。追加分のfast 280/280、full 541/541、contract 37件current。

元のLUNA-00〜09の範囲と、追加対応で解消した残存経路は引き続き別記録として扱う。Windows実機・hosted CI・実GitHub・配備は未確認。
