# miku-scm Windows 11 publication 実装計画

作成日: 2026-09-12。状態: 実装中（共通実行境界と macOS/Windows allowlist 実装済み、native Windows 11 確認待ち）。
調査時 HEAD: `b91cd1fa32931f0fe2fd185aca0e367d43c832af`。
調査時 branch: `devel-tiga0816jfg`。計画追加前の worktree は clean。

## 目的と対象

native Windows 11 の Node.js と Git for Windows で、`pr.publish.apply`
および `pr.recommit.push` を既存 macOS と同じ安全条件で完走させる。
Luna は下の W00 → W09 を順番に処理し、各項目の完了条件を満たしてから
チェックを付ける。このファイルへ実装と検証の進捗を記録する。

実装開始時に `skills/igapyon-miku-scm/SKILL.md` を読む。
このファイルは実装用の計画であり、現行 runtime の規範を上書きしない。
Work Cycle 全体の再設計、Issue 操作、Release、post-merge の刷新は対象外。
Linux/WSL の publication 有効化も対象外。新しい public workflow ID や
CLI の OS 偽装／任意コマンド引数は追加しない。

## 調査で確認した事実

パスは repository root 基準。以下の scripts/tests/references は特記しなければ
`skills/igapyon-miku-scm/` 配下を指す。

| 対象 | 現状と計画への影響 |
| --- | --- |
| `scripts/pr-recommit-push.mjs:runRecommitPush` | `darwin` と `win32` を allowlist。その他は backup 前に拒否する |
| `scripts/post-recommit-publish.mjs:runPublish` | preflight は OS 非依存、apply は `darwin`/`win32` allowlist |
| 上記 publish と `scripts/pr-soft-reset-recommit-preflight.mjs` | Git は既に `spawnSync("git", argv)`。PowerShell への書換えは不要 |
| `scripts/miku-scm-fixed-command-runner.mjs` | npm/Maven の固定チェック専用。Git を受け付けない。任意 command runner に拡張しない |
| `scripts/miku-scm-operational-path.mjs` | 表示・artifact の区切りを `/` に統一済み。containment は別途必要 |
| publish の `loadPlan` と recommit の `runRecommit` | `path.relative` ベースの containment helper へ移行済み |
| publish の `executePublish` | `open(..., "wx")` で attempt を claim。失敗時の retry 禁止と mutation 不明を維持する |
| `.github/workflows/miku-scm-contract.yml` | macOS/Windows matrix、Node 24、Java 17、full/drift check を実行 |
| publish/recommit-push tests | `platform: "darwin"` 注入がある。Windows ホストでも OS gate を実証できないケースがある |
| `scripts/miku-scm-test-suite.mjs` | publish tests は名前で shard 化。新しい test 名がどの shard にも一致しないと full が失敗する |
| `scripts/miku-scm-workflow-contracts.mjs` | pair は runner/spec の hash。test は存在確認のみ。import 先の共有 module は自動的には hash に入らない |

詳細な設計の根拠:
`skills/igapyon-miku-scm/docs/work-cycle-lifecycle-redesign.md` の
「macOS・Windows 11対応方針」。同文書は大規模な将来設計も含むため、今回は
publication に必要な platform/path/process/artifact の範囲へ限定する。
CI の Windows 成功と native Windows 11 の実機確認は別の証拠として扱う。

## 進行ルール

1. 毎回、この計画と `git status -sb` を確認し、最初の未完了項目から再開する。
2. 実装前に対象ファイルの現在の関数を読む。行番号は調査時の目安である。
3. 一項目ごとに focused test、関連 diff、`git diff --check` を確認する。
4. runner/spec/contract test を変更した項目では契約を再生成し、drift check を行う。
5. 結果は末尾の実行記録に記入する。未実行は成功扱いにしない。
6. 対象外差分を保持する。実リモートへの push、commit、配備先への同期、
   GitHub 設定変更はこの計画だけから実行しない。テストは一時 bare remote を使う。
7. Windows 実行環境がなければ W08 を未完了として証拠不足を記録する。
   macOS で `platform: "win32"` を注入した結果を実機確認と表現しない。

## 手順

### W00 — baseline を固定する

- [x] 完了

対象: この計画の実行記録のみ。

実装開始時の branch/HEAD/差分と `node --version`、`git --version` を記録する。
`-done` branch なら既存の SCM 規則に従って作業 branch を解決してから編集する。
次の baseline を実行する。失敗は「既存失敗」と「変更による失敗」を区別する。

```text
npm run test:miku-scm:fast
npm run test:miku-scm:full
node skills/igapyon-miku-scm/scripts/miku-scm-workflow-contracts.mjs --check
```

完了条件: 件数、終了コード、環境、既存失敗の有無を記録した。
実績: Node v26.5.0、Git 2.50.1。変更前の fast 175件、full 269件、
contract drift check が成功した。

### W01 — publication 用 platform/process 境界を追加する

- [x] 完了（依存: W00）

実装: `scripts/miku-scm-command-runner.mjs` と
`tests/miku-scm-command-runner.test.mjs`。
API は `createPublicationPlatform({ platform, spawn })` とし、platform は本番では
`process.platform`、spawn は本番では `spawnSync`、注入は module test 用だけとする。
戻り値には OS 判定、固定 Git 実行、固定 PR lookup 実行、起動結果正規化を置く。
workflow の branch/SHA/approval 判断はこの module へ移さない。

Git/gh を argv 配列と `shell: false` で実行し、Git runner が必要とする
`cwd`、stdin Buffer、allowFailure、stdout/stderr/status を保持する。
missing executable、signal、buffer 超過、timeout を終了コード 0 と区別する。
timeout を導入する場合は固定値とテストを定義し、push 開始後の timeout は
remote state 不明として扱う。自動 retry はしない。資格情報をログに出さない。
Git の固定 `--version` probe は mutation 前、gh は任意依存とする。
gh 不在・失敗時の PR creation URL fallback を維持する。rg は依存に加えない。

既存 npm/Maven adapter の `.cmd` 対応を変更しない。Git/gh の shell fallback も追加しない。
この段階では public な Windows apply guard を維持する。

テスト: argv が shell 文字列にならないこと、stdin bytes が保たれること、
ENOENT/signal/timeout の分類、gh 不在。実 remote は使わない。
完了条件: 共通 interface と失敗時の結果が test で固定され、macOS の挙動を変えていない。
実績: Git/gh を shell なしの argv 実行へ統合し、Windows `windowsHide`、ENOENT、
非 retry を focused test で固定した。

### W02 — path containment と artifact の入力規則を整える

- [ ] 完了（依存: W01）

対象: `scripts/miku-scm-operational-path.mjs`、publish の `loadPlan`、
recommit の `runRecommit`、対応する tests。

共通の containment helper を追加する。root と実在する target を realpath で解決し、
path.relative の結果が絶対パスでなく、`..` でも `..` + separator 開始でもないことを
検証する。空 relative はファイル対象として拒否する。文字列全体の小文字化で
case-sensitive directory を同一視しない。未作成 file は既存 parent を解決して検査する。
別 drive、UNC、junction による repository 外への脱出を許可しない。
UNC は安全な同一 root と判定できたケースだけ許容し、不明なら mutation 前に停止する。

`loadPlan` は plan directory と file の実体を両方検証する。plan directory 自体が
repository 外へ向く junction のケースも検証する。PR draft も同じ規則を使う。
出力 path の `/` 統一と実 FS path を分ける。CLI の `--apply-plan` は既存の `/` 形式を
維持し、単に Windows 対応のためだけに入力 grammar を広げない。

生成 JSON/draft は UTF-8/LF。外部 CRLF draft の現行 intake/validation を先に確認し、
必要なら review 前に別の canonical draft を作る。review 済み bytes は apply 中に変換しない。
CRLF の SHA は実 bytes で比較し、異なる改行の改ざんも検出する。
`0o600` を Windows ACL の保証とは記載しない。ACL 設定コマンドは追加しない。

テスト: 空白/日本語 root、兄弟 prefix、`..`、別 drive、Windows separator、
junction 外部脱出、CRLF draft の digest 変更、`core.autocrlf=true` の worktree。
path.win32 の単体テストと native FS テストを区別する。junction を実行できなければ
そのケースを未検証と記録し、別の文字列テストだけで完了としない。
完了条件: draft/plan の脱出拒否と bytes 一致が両 OS 用のテストで定義されている。
進捗: `path.relative` ベースの containment と Windows drive/sibling/`..` の単体テストは実装済み。
native junction、実 Windows filesystem、CRLF intake の実機確認は未完了。

### W03 — publication を共通 adapter へ移行する

- [x] 完了（依存: W02）

対象: `scripts/post-recommit-publish.mjs`、`tests/post-recommit-publish.test.mjs`。
createGitRunner/createGhRunner を W01 へ接続し、既存の export と dependency injection を
維持する。adapter を一度選び、nested call でも同じものを使う。
本番 guard は `darwin` と `win32` を明示許可する。共通処理は test 注入と native platform test で検証する。

処理順は remote expectation 固定 → fetch → local/remote 再確認 → attempt claim →
push → fetch → `0 0` → `-done` rename。新規 branch と既存 branch の argv を維持する。
既存 branch は `--force-with-lease=<ref>:<reviewed-sha>`、暗黙 lease は使わない。
同一 plan の二回目は claim で拒否し、push 呼出回数が増えないことを検証する。
claim file は必ず close する。EPERM/EBUSY などに新しい retry は追加せず停止する。
push 開始後の失敗は既存の unresolved/非 retry 契約を保持する。

完了条件: 下の受入テスト表の P01–P09 が通り、順序・引数・停止位置を確認した。
実績: publication focused test で新規 branch、explicit lease、競合、fetch/push/post-push
停止、Windows 経路を確認し、契約を再生成した。

### W04 — recommit から publication まで同じ境界を接続する

- [x] 完了（依存: W03）

対象: `scripts/pr-recommit-push.mjs`、`scripts/pr-soft-reset-recommit-preflight.mjs`、
`tests/pr-recommit-push.test.mjs`、`tests/miku-scm-recommit.test.mjs`。
backup より前に platform/capability を確認し、同じ adapter を recommit と publish に渡す。
base、draft digest、祖先関係、backup SHA の検証を維持する。
backup 検証後だけ reset/commit、remote が途中で変われば publication 前に partial。
missing draft の文章生成は既存 Skill 側に残す。runner 内で文章生成しない。

完了条件: P10–P12 が通る。bare recommit に push が混入しない。
実績: macOS、注入した win32、native platform 経路で backup/recommit/push/`0 0`/`-done`
を確認した。Linux 等は引き続き拒否する。

### W05 — 実 OS で動く contract test と smoke entry を整備する

- [ ] 完了（依存: W04）

対象: 上記 tests、`scripts/miku-scm-test-suite.mjs`、必要なら新規
`tests/windows-publication-smoke.test.mjs`。native platform smoke は既存の
publication/recommit test に追加した。
共通処理の injection test と、platform を指定しない native test を分ける。
本番 guard を維持している段階の Windows native test は停止を確認する。
候補コードで gate を変更する W08 では、同じ test を成功条件へ切り替える。
環境変数や CLI の「強制許可」オプションで guard を迂回する仕組みは追加しない。

smoke は一時 directory と bare remote を自分で作り、Node API で片付ける。
新規 push、既存 SHA lease push、backup/recommit を実行し、remote ref と backup SHA を
実 Git で照合する。日本語/空白 path、CRLF のケースも入れる。
外部 GitHub や実利用 repository を使わない。
新規 test 名を shard に一意に割当てるか、非 shard の新規ファイルへ配置する。

完了条件: focused test と full の test discovery が成功し、native smoke の
単一コマンドを実行記録に記載した。mock の成功を native の成功に混ぜていない。
進捗: focused test と full の test discovery は macOS で成功。Windows 11 native smoke の
単一コマンド実行記録は未取得であり、mock/injected win32 の成功とは分けて扱う。

### W06 — 既存 CI を拡張する

- [x] 完了（依存: W05）

対象: `.github/workflows/miku-scm-contract.yml`、必要な場合だけ `package.json`。
既存 matrix、Node 24、Java 17、read-only permissions を維持する。
両 OS で契約 drift check と full を実行する。fast と full の重複を減らすなら
CI は full を基本にし、開発者用 fast script は残す。
新しい action の版更新や CI 全体の改装は行わない。
CI ログに OS/Node/Git の版を残す。Windows runner の名称から Windows 11 と断定しない。

完了条件: 両 OS で対象 test が省略されず実行される定義になった。
実際の hosted CI 実行結果は W08/W09 に記録する。workflow 編集だけを CI 成功としない。
実績: `windows-latest`/`macos-latest` matrix を維持し、full suite、contract drift、
`git diff --check` を両 OS で実行する定義へ変更した。hosted CI の実行結果は未取得。

### W07 — 契約・文書を実装とそろえる

- [x] 完了（依存: W06）

対象: `references/github-post-recommit-publish.md`、`references/github-pr-recommit-push.md`、
`references/scm-rules.md`、`references/runtime-and-test-suites.md`、
`docs/work-cycle-lifecycle-redesign.md`、必要な `SKILL.md` の案内。
ここでは `win32` allowlist 実装済み、native Windows 11 のリリース判定待ちという状態を正確に記載する。
Windows の必須依存、任意 gh、path/CRLF、結果不明時の非 retry を説明する。

共有 module の更新が contract pair に自動で入らない点を処理する。
今回の最小方針は、変更ごとに影響する runner/spec を同時更新して pair を変え、
旧 plan を再 preflight 必須にすること。依存 hash 全体の設計変更は別課題とする。
契約版を変更する場合は manifest が現在共通版であることを確認し、影響を記録する。
生成 lock/table を手編集しない。下記の再生成と drift check を行う。
skill 配下 Markdown の変更後は `mvn generate-resources` で index を更新し、
対象外 index に差分が出た場合は原因を調べて勝手に巻き戻さない。

完了条件: 旧 plan 拒否 test、契約 drift check が成功し、文書と実装の有効化状態が一致。
実績: normative references、Work Cycle 設計、contract lock/table、skill index を更新した。

### W08 — Windows 11 候補検証とリリース判定

- [ ] 完了（依存: W07、native Windows 11 環境）

platform allowlist の `darwin`/`win32` 変更は W03/W04 で実装済みである。
公開前の候補として Windows 11 上で W05 の native smoke と full を実行する。
allowlist 変更済みの candidate が安全条件を満たすことを実機で確認する。
Windows 実機がなければ候補を対応済みとして完了させず、必要な command と残件を残す。
本番用 override は作らない。Linux/WSL などは引き続き mutation 前に拒否する。

OS の edition/build、Node/Git の版、test command、終了コードを記録する。
Windows の `win32` 判定だけでは OS が Windows 11 である証拠にならない。
Windows CI と macOS CI でも実際の成功を確認する。
新規 bare remote smoke は認証を検証しないため、その限界も記録する。
認証失敗時の停止は注入テストで保証し、実 GitHub への push は別途明示された場合だけ行う。

完了条件: native Windows 11 smoke、両 OS のテスト成功、未対応 OS 拒否を確認。
文書を対応済みへ更新し契約を再生成。candidate で失敗した場合は W08 未完了。

### W09 — 最終検証と引継ぎ

- [ ] 完了（依存: W08）

最終変更後に full、契約 drift check、`git diff --check` を実行する。
同一内容で成功済みなら、不必要に全テストを繰り返さずその実行結果を参照する。
変更ファイル、テスト環境、未検証範囲、旧 plan は再 preflight が必要なことを報告する。
この計画の全項目と実行記録を更新する。配備・commit・push の実施は別の依頼に従う。

## 受入テスト表

| ID | ケース | 必須の観測結果 |
| --- | --- | --- |
| P01 | 新規 branch | exact destination に push、remote SHA 一致後だけ rename |
| P02 | 既存 branch | reviewed SHA を明示 lease に使い、recommit 後 HEAD と一致 |
| P03 | remote が変更/出現/消失 | 不一致検出後 push しない、後続処理なし |
| P04 | local HEAD/dirty/frozen/done 衝突 | push/rename しない |
| P05 | fetch 失敗 | push 呼出しゼロ |
| P06 | push 失敗/timeout | rename しない、remote を未変更と決めつけない、retry しない |
| P07 | push 後 fetch 失敗/比較不一致 | remote が更新済みでも rename しない、結果不明を保持 |
| P08 | digest/契約変更/同一 plan 再適用 | push しない、既存 attempt を消さない |
| P09 | gh 不在/不正 JSON/認証失敗 | PR lookup は unconfirmed、creation URL、成功した push を再実行しない |
| P10 | recommit 正常 | backup SHA=旧 HEAD、reset/commit 後の新 HEAD を publication に渡す |
| P11 | recommit 後 remote 競合 | partial、backup/candidate を残す、push しない |
| P12 | draft 不在/脱出/変更、base 非祖先 | backup/reset/push の前に拒否 |
| P13 | 空白/日本語 root、CRLF、drive/junction | 正常 path は動作、脱出は拒否、digest 不一致は停止 |
| P14 | unsupported OS、Git 起動失敗 | backup と remote mutation の前に拒否 |

## 共通の検証コマンド

repository root で実行する。PowerShell でも改行継続記号を不要にするため一行で記載。

```text
node --test skills/igapyon-miku-scm/tests/post-recommit-publish.test.mjs skills/igapyon-miku-scm/tests/pr-recommit-push.test.mjs skills/igapyon-miku-scm/tests/miku-scm-recommit.test.mjs
npm run test:miku-scm:fast
node skills/igapyon-miku-scm/scripts/miku-scm-workflow-contracts.mjs
node skills/igapyon-miku-scm/scripts/miku-scm-workflow-contracts.mjs --check
npm run test:miku-scm:full
git diff --check
```

新規 platform/path/smoke test の command は、ファイル作成時にここへ追記する。
契約を変更した段階では再生成を tests より先に実行し、古い lock による失敗を避ける。

## 実行記録

| 手順 | 状態 | 変更・判断 | 検証（環境、command、終了コード） | 次の作業/未解決 |
| --- | --- | --- | --- | --- |
| 計画 | 完了 | 現行コード・CI・設計を再調査して記録 | 実装前 baseline を確認 | W00 |
| W00 | 完了 | baseline 固定 | Node v26.5.0 / Git 2.50.1、fast 175件、full 269件、contract current | W01 |
| W01 | 完了 | 共通 `miku-scm-command-runner.mjs`、Git/gh argv 境界 | focused test 成功、ENOENT と no retry を確認 | W02 |
| W02 | 進行中 | `isPathWithin` と draft/plan containment を導入 | Windows path 単体 test 成功、native junction/CRLF intake 未確認 | W05 の native 環境で再開 |
| W03 | 完了 | publication に共通 runner と `darwin`/`win32` allowlist を接続 | publication focused test 成功 | W04 |
| W04 | 完了 | recommit push へ Windows 経路を接続 | macOS・win32 注入・native platform test 成功 | W05 |
| W05 | 進行中 | Windows/native smoke test を追加 | macOS で focused/full 278件成功、Windows 11 実機未実行 | W08 |
| W06 | 完了 | GitHub Actions matrix を full + drift check へ拡張 | workflow 定義を確認、hosted run 未取得 | W08 |
| W07 | 完了 | normative docs、contract lock/table、index を更新 | contract current、`mvn generate-resources` 成功 | W08 |
| 最終検証 | 部分完了 | unsupported OS の停止と最終 test を追加 | full 278件成功、contract 33件 current、`git diff --check` 成功、native Windows 11/hosted CI 未実行 | W08/W09 |

再開用依頼例:

> WINDOWS11-PUSH-PLAN.md に従い、最初の未完了手順から実装してください。
> 各手順のテストと実行記録を更新し、Windows 実機未確認は未完了として残してください。
