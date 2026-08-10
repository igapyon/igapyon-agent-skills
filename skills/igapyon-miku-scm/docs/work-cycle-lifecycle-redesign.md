# miku-scm Work Cycleライフサイクル再設計案

## 位置づけ

この文書は、通常のmiku-soft開発作業を、作業ブランチの作成から
GitHub Release画面での人間によるtag・Release操作まで、一つのWork
Cycleとして整理し直すための設計ドラフトである。

現行workflowの規範的な仕様を変更する文書ではない。実装に着手する
までは、`references/`、workflow manifest、contract lock、各固定helperを
現行仕様の正本とする。

## 実装状況（2026-08-10）

Phase 2の最初のsliceとして、exact `miku-scm git add commit`に対応する
`work.commit` fixed workflowを実装した。これは、non-ignored変更を速度優先で
一括stageし、recognised pre-commit check、staged digest再確認、local commit、
postconditionを一つのrunner invocationで実行する。conflict、`-done` branch、
secret candidate、coupled version mismatchはstage前に停止する。

Phase 3の最初のsliceとして、exact `pr recommit push`に対応する
`pr.recommit.push` fixed workflowを実装した。これはmacOS上で、remote stateを
backup前に固定し、backup、recommit、publication plan、conditional push、remote
equality確認、`-done` renameを一つのrunner invocationで実行する。remote stateが
変わった場合はpushせず`partial`で止まる。

Windows 11のpublication、cycle artifact、作業開始のone-shot化、PR evidenceの
完全統合は未実装であり、この文書の残りの段階的移行案に従う。

主な目的は次のとおりである。

- 作業開始からRelease handoffまでの状態と責務を一続きにする
- 生成AIによる繰り返しの状態解釈、Git command組み立て、結果再作文を減らす
- 通常のmechanical transitionを原則一つのrunner invocationで完結させる
- Node.js runner内の固定`git`・`gh`・search stepは、期待結果が続く限り連続実行する
- 現行のbackup、digest、approval、conflict、postconditionを弱めない
- `-done`をpublication完了の人間可読markerとして維持する
- local operationでは、明示依頼後の会話上のpreflight待ちを減らす
- 明示された`pr recommit push`では、安全なremote条件を満たせばpushまで連続実行する
- `pr recommit`単独はlocal recommitで停止し、remote mutationを含めない
- GitHub上のPR作成・マージ・tag作成・Release公開を人間作業として明確に分離する

## 対象とする標準フロー

この文書で扱う標準フローは次である。

```text
作業ブランチ作成
  -> 編集とcheckpoint commit
  -> PR文案生成とPR Soft Reset Recommit
  -> feature branch push
  -> 人間によるPR作成・レビュー・マージ
  -> merged baseに対するRelease/tag handoff
  -> 人間によるtag作成・Release公開
```

Release tagは、原則としてfeature branchのpush直後ではなく、PRマージ後の
base commitに対して確定する。push後に出せるtag名は候補であり、Release
handoffの確定情報ではない。

## 現行workflowの対応関係

| 段階 | 現在の実装または規則 | 現在の状態 |
| --- | --- | --- |
| 作業開始 | [`scm-rules.md`](../references/scm-rules.md) のStartup Work Branch Checkout | AgentがGit command列を判断するlegacy経路 |
| version確認 | [`version-increment-confirmation.md`](../references/version-increment-confirmation.md)、`version.status` | READONLY runnerと会話内session recordの組み合わせ |
| version候補計算 | `version.increment.validate` | 固定READONLY runner |
| `git add`・通常commit | `work.commit` | fixed local applyがstage、check、commitを一度に実行 |
| PR evidence収集 | `writing.pr.prepare` | 固定READONLY runner |
| PR文案作成 | [`github-pr-writing.md`](../references/github-pr-writing.md) | 構造化evidenceから生成AIが一度作文 |
| recommit事前確認 | `pr.recommit.preflight` | 固定READONLY runner |
| recommit適用 | `pr.recommit.apply` | backup、soft reset、commitを行う固定local apply |
| push事前確認 | `pr.publish.preflight` | reviewed publication planを保存する固定preflight |
| push適用 | `pr.publish.apply` | push、remote equality確認、local renameを行う固定remote apply |
| PR作成・マージ | GitHub UI | 人間作業 |
| マージ後の次作業 | `repository.post-merge.next-work` | fixed local applyとadvisory tag check |
| tag・Release | [`github-release-tag-handoff.md`](../references/github-release-tag-handoff.md) | GitHub Release UIへの人間handoff |

後半のrecommit、publication、post-mergeは固定runner化されている。一方で、
作業ブランチ作成とライフサイクル全体の状態管理はAgentの会話内判断に残っている。
通常のstage・commitは`work.commit`へ移行済みである。

現行publication applyにはmacOS限定guardがあり、規範文書もmacOSを前提としている。
したがってWindows 11対応は、単なる動作確認ではなく、platform contract、path
validation、artifact write、test matrixを含む明示的なmigrationとして扱う。

## 現状の構造的な課題

### 1. 前半と後半の自動化水準が異なる

recommit以降はreviewed artifact、digest、attempt record、postconditionを
持つが、作業開始と通常commitはMarkdown規則からAgentがGit command列を
再構成する。これにより同じWork Cycleの中で、速度、再現性、監査性が
段階ごとに異なる。

### 2. 状態の正本が分散している

現在の進行状態は、次の複数箇所から推測される。

- 現在branch名と`-done` suffix
- GitのHEAD、upstream、remote branch
- 会話内のversion確認record
- PR draft
- recommit backup branch
- publication planとattempt record
- 人間によるPRマージ報告

そのため、各段階で同じrepository、base、branch、HEAD、version、remoteを
読み直し、Agentが状態を再解釈しやすい。

### 3. `-done`と実際の状態を併記する必要がある

現行publicationはpushとremote equality確認の直後にlocal branchを
`<branch>-done`へrenameする。しかし、この時点ではPRが未作成または
未マージである可能性がある。

`-done`はpublication完了と以後の変更禁止を示す運用markerとして有用であり、
廃止しない。一方で、PRマージやRelease完了を証明するものではないため、
cycle stateでは`PUBLISHED`、`MERGED`、`RELEASED`を別に記録する。

push後の修正が必要な場合は、`-done`上で作業を再開せず、明示的なrecovery
transitionで新しいwork branchへ移す。

### 4. PR handoffとRelease handoffの時点が混ざっている

push完了時には、PR URLと推奨tagが同時に報告される。推奨tag名の早期表示は
有用だが、Release tagの対象commitはPRマージ後のrefreshed baseから確定する
必要がある。

push後の出力はPR handoff、merge後の出力はRelease handoffとして分離する方が
状態と人間の次作業を誤解しにくい。

### 5. 承認ではない待ち時間が存在する

安全上必要な人間承認とは別に、Agentによるreference読込、状態再取得、
command選択、structured resultの再解釈が待ち時間を増やす。これらは
承認境界を維持したままfixed runnerとcycle stateへ移せる。特にlocal
operationでは、明示依頼そのものを承認として扱える場合にも、preflight結果を
表示してもう一度承認を待つ経路が残っている。

### 6. command単位のAgent往復がtransitionを細切れにする

repository情報の検索やGitHub READONLY確認は決定論的であっても、各commandの
結果をいったんAgentへ返すと、次のcommand選択、結果解釈、tool call生成のたびに
model latencyが加わる。`gh`や`rg`の呼び出し自体より、この往復の方が長くなる
場合がある。

command列と期待結果を固定できるmechanical segmentは、Node.js runnerが内部で
完結させる。Agentはcommandごとのcontrollerではなく、workflowの開始、必要な
作文、承認境界、terminal resultの受領だけを担当する。

## Preflightの再整理

`preflight`には、実際には次の三つの責務が混在している。

1. mutation前のrepository、branch、HEAD、digest、remote状態のvalidation
2. applyが消費するimmutable planまたはhandoffの生成
3. planを人間へ表示し、次の承認発言を待つ会話上の停止

1と2は安全性と再現性のために残す。省略を検討するのは3の会話上の停止で
ある。normal routeでは内部validationをapply runnerの先頭へ統合し、人間が
明示的に「確認だけ」「preflight」と依頼したときだけinspection-only結果を
返す。

| 操作 | 通常の会話上のpreflight | 内部validation | 人間承認の扱い |
| --- | --- | --- | --- |
| work branch作成 | 省略 | 必須 | 明示された作業開始要求でlocal mutationを承認 |
| checkpoint commit | 原則省略 | 必須 | 明示されたcommit要求でexact scopeのlocal mutationを承認 |
| PR recommit | 省略 | 必須 | 明示された`pr recommit`でbackup、reset、commitを一括承認 |
| PR recommitと直後のpush | 省略 | 必須 | exact `pr recommit push`でbackup、reset、commit、安全条件内のpushを一括承認 |
| standaloneまたはrecovery push | 維持 | 必須 | exact HEADとremote planに対する明示承認が必要 |
| tag・Release | miku-scmによるapplyなし | READONLY確認 | GitHub UIで人間が操作 |

scope、base、PR draft、remoteなどを一意に解決できない場合は、preflightを返す
のではなく、mutation前にsafe stopして不足情報だけを尋ねる。

## Node.js runnerによる連続実行

### 基本方針

固定runnerを一つのtransition executorとして扱う。Node.js processは、workflow
contractに列挙された`git`、`gh`、search adapterなどの子processまたはNode処理を
順に起動し、各stepの
終了状態、出力schema、snapshot expectation、postconditionが期待どおりである
限り、Agentへ中間結果を返さず次のstepへ進む。

```text
Agentからfixed workflowを1回起動
  -> Node: git/search/gh step
  -> expectedなら次のNode step
  -> expectedなら次のNode step
  -> ...
  -> completed / approval-required / needs-writing / needs-input / failure
  -> ここで初めてAgentへ返す
```

「Agentへ返さない」はvalidationを省略する意味ではない。結果の評価主体を
生成AIから固定codeへ移し、同一invocation内で評価と次stepを接続する。

### child process contract

共通のfixed command adapterを設け、少なくとも次をworkflow stepごとに固定する。

- executableとargv配列。shell文字列、任意command、任意flag pass-throughを許可しない
- repository rootから解決した固定`cwd`
- timeout、`maxBuffer`、許可する環境変数
- 期待するexit codeまたはsignalなしという条件
- stdoutのformat、JSON schema、最大bytes
- stderrを許容する条件
- step開始前snapshotと成功後postcondition
- failure classificationと、以後のstepを実行してよいか

実装は`spawnSync`または`execFile`相当をargv配列で使い、`shell: true`を使わない。
testではchild process adapterをdependency injectionし、実commandなしで順序、引数、
期待結果、停止位置を検証できるようにする。

### `gh`結果の扱い

Agentは`gh`を直接実行しない。Node.jsの固定helperだけが、allowlistされた
subcommandとfieldを指定して実行する。

- 機械判定に使うreadは、可能な限り`--json`または`gh api`のJSONへ固定する
- exit code `0`だけで成功とせず、JSON parseと期待schemaも検証する
- repository、PR、Issue、branch、SHAを呼出前snapshotと照合する
- 空配列や`404`を許容するworkflowでは、それを明示的なexpected stateとして扱う
- authentication、rate limit、malformed JSON、unexpected repositoryはsafe stopする

たとえば「既存PRがない」はPR作成URLのhandoff生成では正常な分岐になり得る。
一方、merge確認では「対象PRがない」は期待外であり、同じ戻り値でもworkflowごとに
判定を変える。

### Search strategyと`rg`結果の扱い

Windows 11で`rg`が導入済みとは限らないため、ripgrepをmiku-scmの必須runtime
dependencyにはしない。検索用途を次の順に設計する。

1. authoritative version sourceなど既知pathはNode.jsで直接読む
2. tracked fileの固定pattern検索は、必須dependencyであるGitの`git grep`を使う
3. untracked fileを含むexact path集合はNode.jsで直接読む
4. `rg`はcapability probeに成功した場合だけ、同じsemantic resultを返す任意の
   accelerationまたはdiagnostic backendとして使う

mutation判断に必要な証拠を`rg`だけへ依存させない。backendの違いをAgentへ露出せず、
relative path、match有無、必要なfield、content digestへ正規化する。pathのsort順も
code point順など一つに固定し、filesystem列挙順へ依存しない。

`git grep`と`rg`は、どちらもno-matchをcommand failureと区別し、exit codeの意味を
step contractへ明示する。

| step expectation | `git grep` / `rg` exit code | 扱い |
| --- | --- | --- |
| required match | `0` | match内容をparse・検証して継続 |
| required absence | `1` | 禁止patternなしとして継続 |
| optional search | `0`または`1` | match有無を構造化して継続 |
| すべて | `0`・`1`以外、またはsignal | command failureとして停止 |

`rg`のpattern、glob、対象path、encodingはfixed codeまたはreviewed artifactから
組み立てる。user textをshell fragmentに埋め込まない。version source検索、
material change coverage、禁止pattern不在確認など、結果の意味を固定できる用途に
限定する。大量のmatch全文をAgentへ返さず、必要なfieldとdigestだけをtransition
resultへ残す。

## macOS・Windows 11対応方針

### 現行実装の監査結果

Windows対応に有利な点として、主要な`git`・`gh` helperはすでにargv配列で
`spawnSync`を使い、shellを介していない。一方で、次は移行前に直す必要がある。

- publication applyが`darwin`以外を明示的に拒否する
- publicationの規範文書がmacOS限定approvalを定義している
- 一部のpath containmentがcanonical pathの文字列prefix比較に依存している
- test fixtureの一部に`/tmp/...`というPOSIX path literalがある
- draftはLF限定であり、Windows editorが作ったCRLF artifactの入口規約が必要である
- file mode `0o600`を使用しているが、Windows ACLの保証にはならない

この設計文書の変更だけではWindows publicationを有効化しない。上記の実装、規範、
contract、testを同じmigrationで更新する。

### 分割判断

workflow単位で`*-macos.mjs`と`*-windows.mjs`を複製する案は採用しない。recommit、
backup、exact lease、attempt record、postconditionを二系統で保守すると、安全仕様の
driftとtest重複が生じるためである。

一方、platform差をworkflow内へ散在させるのも避ける。共通workflowと小さなplatform
adapterへ分割する。

```text
scripts/runtime/
  transition-executor.mjs       # OS非依存のstep/state machine
  command-runner.mjs            # 共通argv、timeout、result contract
  search-adapter.mjs            # direct read / git grep / optional rg
  platform/
    macos.mjs                    # macOS固有のpath・filesystem policy
    windows.mjs                  # native Windows 11固有policy
```

workflow ID、approval、digest、failure classificationは共通codeだけが所有する。
platform moduleはarbitrary commandやworkflow分岐を受け取らず、次の限定interfaceだけを
提供する。

- canonical path identityとcontainment判定
- executable capability probeの補助
- atomic operational-artifact writeのOS固有処理
- timeout後のprocess終了結果の正規化
- filesystem errorのportable classification

OS別moduleの返すschemaは同一とし、workflowは`process.platform`を直接参照しない。
native Windowsは`win32` adapter、macOSは`darwin` adapterをmanifest起動時に一度だけ
選ぶ。WSLはWindows adapterではなくLinux/POSIX環境として別途扱う。

### command execution

macOSとnative Windows 11の両方で、`spawnSync`または`execFile`をargv配列、
`shell: false`で使う。PowerShell、`cmd.exe`、Git Bash、`.command`、`.sh`をworkflow
途中で起動しない。これによりshell quoting差とcommand injection面を避ける。

- `git`、`gh`、任意の`rg`は起動時に固定`--version` probeを一度だけ行う
- tool discoveryに`which`や`where`のtext parseを使わず、実行可否を直接確認する
- bundled Node helperの起動には`node`文字列でなく`process.execPath`を使う
- stdout/stderrはpipeからUTF-8として取得し、console code pageへ依存しない
- executable missing、timeout、signal、Windows固有process errorを共通結果へ正規化する
- command lineとoutputはboundedに保ち、大量pathは任意長の一つのargvへ詰め込まない

`git.exe`、`gh.exe`、`rg.exe`のsuffixは通常PATH resolutionへ任せるが、probe結果に
resolved capabilityを記録する。`.cmd` wrapperしかないtoolをshell経由で実行する
fallbackは設けない。

### path、改行、artifact

Windowsではdrive letterの大小、case-insensitive path、separator、junction、UNC、
reserved nameがある。文字列の`startsWith(root + path.sep)`だけをcontainment判定に
使わず、`realpath`後の`path.relative`がabsoluteでも`..`開始でもないことを確認する。
repository identityは表示用pathでなく、canonical rootとGit common directoryを
組み合わせて固定する。

- Git filename列は可能な限り`-z` formatで読み、CRLFや空白をdelimiterにしない
- operational JSONと生成draftはUTF-8/LFで新規作成する
- 外部editor由来のCRLF draftはreview前のintakeで一度だけLFへcanonicalizeし、
  canonicalized bytesを表示・保存・digestする
- reviewed artifactはreview後に改行変換せず、byte digestをそのまま再検証する
- worktree fileの改行差を無視してdigest比較せず、Git index/treeの証拠を優先する
- `mode: 0o600`はWindowsのsecurity boundaryとみなさない
- artifact claimは`wx`、同一directoryの一時file、digest、attempt recordを組み合わせる
- antivirusやindexerによる`EPERM`・`EBUSY`はremote mutation前だけbounded retryを許せるが、
  mutation後のfailureを自動再実行しない

### Windows 11での安全なpublication

現行`post-recommit-publish.mjs`のmacOS限定guardを単純に削除してはならない。
Windows adapterと次のcontract testが揃った後に、`darwin`と`win32`を明示allowlistする。

- new branch pushとexact SHA付きforce-with-lease
- push直前remote expectation再検証
- push後fetchと`0 0`比較
- 成功後だけの`-done` rename
- pathに空白、日本語、drive letterを含むrepository
- CRLF設定が有効なworktree
- missing `gh`、missing optional `rg`、authentication failure
- timeout、process起動失敗、push後のverification failure

CIではmacOS runnerとWindows runnerで同じcontract suiteを実行する。CIのWindows環境に
加えて、native Windows 11で少なくともrecommit backup、new-branch publication、
existing-branch lease publicationのsmoke testを行う。Windows側のtestが未整備の間は
macOS限定guardを維持し、未検証のplatformでremote mutationを許可しない。

### Agentへ制御を返す条件

Node.js executorは次のいずれかになるまで処理を継続する。

1. workflow全体が`completed`になった
2. exact planに対する人間承認が必要な`approval-required`へ到達した
3. PR文案など生成AIだけが担当する`needs-writing`へ到達した
4. scopeやbaseを一意に決められない`needs-input`へ到達した
5. `not-applied`、`conflict`、`unresolved`またはunexpected failureになった

notice、期待されたno-match、期待された空のGitHub結果、同一snapshotの再検証成功は
return理由にしない。version increment noticeもexecutorの最終結果へ蓄積するだけで、
処理を止めない。

PR作文が必要な`pr recommit`と`pr recommit push`は、最大二つのmechanical
segmentに分かれる。

1. Node.jsが`git`、search adapter、`gh`によるbounded evidence収集を連続実行し、
   `needs-writing`で一度だけAgentへ返す
2. AgentがPR draftを一度生成して保存した後、Node.jsがdraft validation、backup、
   reset、commitを連続実行する。`pr recommit push`だけは、さらにpush、remote
   equality確認、`-done` renameまで連続実行する

この二つの間に人間承認は要求しない。二つ目のsegmentは、最初のexact commandと、
変更されていないcycle ID、old HEAD、base、evidence digestを再検証してから開始する。
`pr recommit`ならbackup、reset、commit、postconditionまで進み`CANDIDATE_FINAL`で完了する。
`pr recommit push`なら、期待外結果が出ない限りAgentにも人間にも戻さず、さらにpush、
remote equality確認、`-done` renameまで進む。

`pr recommit push`でpost-recommit pushを連続実行できるのは、selected remote、
repository identity、destination branch、recommit前remote branch状態を一意に
固定でき、push直前のfetchでも
remote expectationが変わっていない場合に限る。remote branchがなければnormal new-branch
push、存在すればexact expected SHAを指定したforce-with-leaseを使う。曖昧なremote、
authentication failure、unexpected remote updateではpush前に停止する。

## Version increment notice

version increment忘れは、blocking questionではなく定型の注意として伝える。
通常commit、`pr recommit`、`pr recommit push`を止めず、同じ処理の結果へ次を含める。

```text
Version notice:
- Current version: <version-or-unresolved>
- Coupled version: <version-or-not-applicable>
- Recommended tag: <tag-or-unresolved>
- Latest release tag: <tag-or-unconfirmed>
- バージョンインクリメント忘れがないか確認してください。処理は継続します。
```

人間の返答、acknowledgement、no-increment confirmationを待たない。明示的な
version increment依頼がある場合だけ、別のversion workflowへ移る。

version incrementを要求しないことと、version source同士の整合性を無視する
ことは別である。coupled source mismatch、構文不正、repository-declared
alignment check failureは、通常の整合性failureとしてcommitを停止できる。

## 目標ライフサイクル

```text
READY
  | work.cycle.start
  v
WORKING
  | edit -> work.commit を必要回数
  v
CHECKPOINTED
  | 明示されたpr recommit push
  | evidence収集とPR文案作成
  | internal validation
  | backup成功後は承認待ちなしでreset・commit
  | remote expectationが一致すればpush・remote equality確認・-done rename
  v
PUBLISHED
  | local branchは<work-branch>-done
  | 人間がGitHubでPR作成・レビュー・マージ
  | pr.merge.confirm
  v
MERGED
  | release.handoff
  v
RELEASE_READY
  | 人間がGitHub Release画面でtag作成・Release公開
  v
RELEASED
```

`pr recommit`単独の場合は、同じ処理をcommit postconditionまで実行して
`CANDIDATE_FINAL`で返す。後続のpushは別の明示操作になる。

tag・Releaseが未完了でも、PRマージ後の次作業branch作成を妨げない。次の
Work Cycle開始とRelease handoffは独立して進められる。

## 状態定義

| 状態 | 意味 | 次に許可される標準操作 |
| --- | --- | --- |
| `READY` | base上または前cycle完了後で、新しい作業を開始できる | work branch作成 |
| `WORKING` | work branch上で編集中 | checkpoint commit、candidate準備 |
| `CHECKPOINTED` | 一つ以上のlocal commitがあり、未commit変更がない | 追加編集、candidate準備 |
| `CANDIDATE_FINAL` | `pr recommit`がlocal完了、またはremote条件不一致などでpush前に停止 | 明示的なpublication |
| `PUBLISHED` | exact feature branchがremoteと`0 0`で一致し、local branchが`-done` | 人間によるPR操作、merge確認 |
| `MERGED` | reviewed PRがbaseへ取り込まれ、merged base SHAを確認済み | Release handoff、次cycle開始 |
| `RELEASE_READY` | exact tag名、対象commit、Release状態を提示済み | 人間によるGitHub Release操作 |
| `RELEASED` | exact tagとGitHub Releaseが確認済み | audit、次cycle継続 |

`conflict`、`not-applied`、`unresolved`は通常状態とは別のterminalまたは
recovery状態として記録する。`unresolved`から自動再試行してはならない。

## Work Cycle artifact

会話やbranch suffixではなく、ignored operational artifactをWork Cycle状態の
正本とする案を採用する。

```text
workplace/miku-scm/cycles/<cycle-id>/
  cycle.json
  snapshots/
  plans/
  attempts/
```

`cycle.json`には少なくとも次を記録する。

- schema versionとcycle ID
- repository identity
- base branchとcycle開始時base commit
- work branchと現在HEAD
- lifecycle state
- authoritative version source、coupled sources、current valueとalignment state
- version noticeの内容、表示時刻、content scope digest
- checkpoint commit一覧
- pre-commit checkと検証対象tree digest
- PR target range、PR draft path、draft digest
- recommit backup branch、recommit前後HEAD
- publication plan pathとdigest
- pushed remote、pushed branch、confirmed remote HEAD
- PR URLとmerge確認情報
- merged base commit
- recommended tag、tag status、Release status
- last successful transition、pending transition、failure classification

各mutation helperのattempt recordは引き続き個別の正本とする。`cycle.json`は
それらを参照するが、mutation attemptの履歴を上書きしない。

## 提案workflow

workflow IDは安全境界を保つため分離し、共通のcycle state libraryを利用する。

### `work.cycle.start`

明示された作業開始要求をlocal mutationの承認として扱うone-shot workflow。

- current branch、dirty state、base、remoteを解決する
- fetch後にlocal baseとremote baseの`0 0`を確認する
- prescribed work branch名の衝突を確認する
- verified remote baseからbranchを作成する
- `cycle.json`を`WORKING`で初期化する
- branchとstatusをpostconditionで確認する

現在のStartup Work Branch Checkoutと
`repository.post-merge.next-work`のbranch作成部分を、同じ実装へ寄せる。

### `work.commit`

明示されたcommit要求を受け、内部validationからcommitまでを一度に行うlocal
apply workflow。確認だけを求められた場合は同じ実装のinspection-only modeを
使うが、normal routeでは別の承認発言を待たない。

- cycle、branch、HEAD、dirty stateを確認する
- Node.js executorが固定searchとrepository checkを中間応答なしで実行する
- stage対象pathを一意に解決し、各内容digestを固定する
- unrelated changeを除外する
- authoritative versionとtag候補をnon-blocking noticeとして表示する
- commit message artifactを固定する
- repository-declared pre-commit checkを解決する
- exact pathだけをstageする
- staged diffを確認する
- fixed pre-commit checkを実行する
- check後に内容が変化していないことを確認する
- reviewed messageでcommitする
- new HEADとcleanまたはexpected dirty stateを確認する
- cycleを`CHECKPOINTED`へ更新する

version increment noticeへの返答を待たず、incrementをcommitの必須条件に
しない。ただし、coupled version sourceの不一致や生成物driftなど、repositoryが
明示した整合性checkは従来どおりcommitを停止できる。

### `pr.recommit`と`pr.recommit.push`

user-facing commandとfixed workflow IDを明確に分ける。

| user-facing command | fixed workflow ID | 到達状態 | remote mutation |
| --- | --- | --- | --- |
| `pr recommit`またはbare `recommit` | `pr.recommit` | `CANDIDATE_FINAL` | なし |
| exact `pr recommit push` | `pr.recommit.push` | 原則`PUBLISHED` | 安全条件内のfeature branch push |

両workflowはPR writing evidence、内部validation、backup、soft reset、commitまで
同じexecutorを使う。pushの有無を曖昧な自然言語から推測せず、manifestがexact
commandを別workflow IDへrouteする。内部的な任意`--push` flagではなく、固定IDで
remote-mutation boundaryを表現する。
PR writing evidence、内部validation、backup、soft reset、commitまでを一つの会話turnで
進め、`pr.recommit.push`だけが同じturnでpublicationまで続行する。

- baseを解決し、`<base>..HEAD`を固定する
- commits、diff、diff stat、version、check evidenceを収集する
- 固定search adapterでversion sourceとmaterial change coverage候補を収集する
- 固定`gh` helperで既存Issue、PR、remote stateの候補を収集する
- 生成AIが一度だけPR文案を作るためのbounded evidenceを返す
- 保存後のPR draft digestをcycleへ関連づける
- material change coverageを固定処理で検証する
- cycle、base、HEAD、PR draft、check resultをmutation直前に再検証する
- `pr.recommit.push`ではselected remote、destination branch、remote branchの有無と
  exact SHAをbackup前に固定する
- local rewrite attempt recordをbackup作成前に保存する
- current HEADを指す新しいbackup branchを作成する
- backup branchがexact old HEADを指すことを確認する
- backup成功後は会話上の承認を挟まず、verified baseへsoft resetする
- verified PR draftでcommitする
- final HEADとstatusを確認する
- `pr.recommit`ではcycleを`CANDIDATE_FINAL`へ更新して完了する
- `pr.recommit.push`ではpublication planとattempt recordを保存する
- `pr.recommit.push`ではpush直前にfetchし、remote branchが固定したabsentまたは
  exact SHAのままか確認する
- `pr.recommit.push`ではabsentならnormal new-branch push、存在すればexact
  force-with-leaseでpushする
- `pr.recommit.push`ではpost-push fetchとlocal/remoteの`0 0`およびexact SHA一致を確認する
- `pr.recommit.push`ではlocal branchを`<work-branch>-done`へrenameする
- `pr.recommit.push`ではcycleを`PUBLISHED`へ更新する

上記のmechanical stepは、結果が各step contractのexpected stateである限り
Node.js executor内で連続実行する。Agentへ返すのはPR作文の一回と、最終結果または
terminal failureだけである。

PR文案の生成でAgentとrunnerの内部境界が複数回必要になっても、人間へ途中
応答して承認を待たない。backup作成後にresetまたはcommitが失敗した場合は、
backup名、old HEAD、現在HEAD、indexとworktree状態を`unresolved`として報告し、
自動再試行しない。

backup作成に失敗した場合は、resetもcommitも実行せず`not-applied`で停止する。
backup作成とold HEAD一致確認の成功を、処理継続の明確な境界とする。

recommit完了後にremote expectationが変化していた場合はpushせず、local状態を
`CANDIDATE_FINAL`として保存して`conflict`を返す。push command自体が失敗した場合は
remoteを再取得し、exact final HEADがremoteに存在すると確認できた場合だけ成功へ
収束させる。それ以外は`unresolved`として自動再試行しない。

現行`pr.recommit.preflight`は、明示的なinspection-only要求、diagnosis、旧経路の
互換用として残せるが、normal `pr recommit`または`pr recommit push` routeの
必須段階にはしない。

### standalone / recovery `pr.publish.apply`

`pr recommit push`はpublicationまで統合する。現行`pr.publish.preflight`と
`pr.publish.apply`は、push前に停止した`CANDIDATE_FINAL`のrecovery、明示的な
standalone push、旧経路の互換用として残し、安全設計を維持する。

- exact saved planとdigestだけを消費する
- local HEAD、clean state、remote expectationを再検証する
- new branch pushまたはexplicit force-with-leaseを使う
- post-push fetchと`0 0`を確認する
- local branchを`<work-branch>-done`へrenameする
- pushed branchとPR URLまたはPR作成URLを報告する
- cycleを`PUBLISHED`へ更新する

`-done`はpublication完了とfrozen状態を示すmarkerとして維持する。cycleの
`PUBLISHED`はその構造化表現であり、`-done`を置き換えない。どちらもPRの
マージ完了を意味しない。

### `pr.merge.confirm`

人間のマージ報告を受け、GitHubとrefreshed baseからmerge状態を確認する。

- cycleに記録されたpushed branchとPRを解決する
- PR state、merge commit、base branchをREADONLYで確認する
- selected remoteをfetchする
- refreshed base commitを確定する
- feature内容がbaseへ反映されたことを確認する
- cycleを`MERGED`へ更新する

人間の報告だけをmergeの技術的な証拠にせず、取得可能なGitHubとGit refを
使って確認する。GitHub確認が利用できない場合の扱いは別途決定する。

### `release.handoff`

merged baseに対する人間作業のhandoffを生成するREADONLY workflow。

- merged base commitからauthoritative versionを読む
- repository-defined conventionからexact recommended tagを導く
- tagの有無とtarget commitを確認する
- GitHub Releaseとexpected asset状態を確認する
- exact tag、target commit、Release作成画面での操作対象を提示する
- tagまたはReleaseが未作成ならcycleを`RELEASE_READY`へ更新する
- 既存tagとReleaseが整合していれば`RELEASED`へ更新する

このworkflowはtagを作成、移動、削除、pushせず、Releaseを公開しない。

## 人間承認境界

通常のWork Cycleでチャット上の人間確認を次へ整理する。

### 1. checkpoint commit要求

- versionとtag候補を注意情報として表示する
- explicit commit要求をlocal mutationの承認とする
- stage対象pathが一意なら別のpreflight承認を求めない

version increment忘れの注意は表示するが、返答を待たず、incrementをcommitの
必須条件にしない。scopeが曖昧な場合だけ、stage前に対象を質問する。

### 2. `pr recommit`要求

- explicit `pr recommit`をbackup、soft reset、commitへの一括承認とする
- base、draft、scopeが一意に解決できない場合はbackup前にsafe stopする
- internal validationとmaterial change coverageは省略しない
- backup作成とold HEAD一致確認が成功したら、追加承認なしでcommit完了まで続行する
- 成功時は`CANDIDATE_FINAL`で返し、pushや`-done` renameを行わない

通常commitの承認をhistory rewriteへ転用することはできない。`pr recommit`の
明示要求自体がlocal history rewriteの承認である。remote mutationへ転用しない。

### 3. `pr recommit push`要求

- exact `pr recommit push`をbackup、soft reset、commit、条件付きpushへの一括承認とする
- base、draft、scope、remote、destination、remote expectationをbackup前に固定する
- backup成功後は期待外結果がない限り、追加承認なしでpush完了まで続行する
- remoteがpush直前に変化していたらforceせず`CANDIDATE_FINAL`で停止する
- successful remote equality確認後だけ`-done`へrenameする

`push` tokenがremote mutationの明示境界である。`pr recommit`、bare `recommit`、
「recommitして」などからpushを推測しない。この承認もPR作成、マージ、tag、Releaseを
含まない。

### 4. standalone / recovery publication確認

- exact final HEAD
- pushed branchとremote
- new branchまたはforce-with-leaseの別
- existing remote SHAまたはbranch absence
- reviewed publication plan digest

`pr recommit push`にはこの追加確認を挟まない。`pr recommit`後のstandalone push、
またはfailure後のrecoveryだけがexact publicationへの別の明示要求を必要とする。
その承認をPR作成、マージ、tag、Releaseへ転用しない。

### 5. GitHub上の人間作業

- PR作成
- PRレビューとマージ
- GitHub Release画面でのtag作成または既存tag選択
- Release公開とdistribution asset確認

miku-scmはexact URL、branch、commit、tag、Release evidenceを渡すが、通常の
標準フローではこれらを自動mutationしない。

## `-done`とcycle stateの併用

pushとremote equality確認が成功したら、現行どおりlocal branchを
`<work-branch>-done`へrenameする。同時にcycleを`PUBLISHED`へ更新する。

- `-done`: 人間が見て分かるpublication完了とfrozen marker
- cycle state: PR、merge、Releaseを区別する構造化状態

cycle artifactがない既存`-done` branchにも現行のfrozen branch ruleを適用する。
artifactがある場合も`-done` branchへ新しい変更を加えない。PR未マージの修正は
明示的なrecovery transitionで新しいwork branchへ移す。

repository maintenanceはcycle evidenceを利用できるが、branch naming fallbackを
廃止しない。既存branchを一括renameまたは削除しない。

## 維持する安全不変条件

再設計後も次を維持する。

- AI Agentは`gh`を直接実行しない
- `gh`と任意の`rg`はfixed Node.js helperからargv配列で実行し、shellを介さない
- `rg`を必須dependencyまたは唯一のmutation evidenceにしない
- workflow safety logicをmacOS用とWindows用へ複製しない
- OS差は同一schemaを返す限定platform adapterへ隔離する
- child processのexit codeだけでなく、signal、stderr policy、出力schema、
  snapshot、postconditionを検証する
- expected resultの間はNode.js executor内で進み、command単位でAgentへ戻さない
- free-form shell、command fragment、arbitrary pass-throughをrunnerへ渡さない
- inspection-only resultはmutationを許可しない
- 明示された`pr recommit`はlocal rewriteだけを承認し、remote mutationを含めない
- exact `pr recommit push`だけがlocal rewriteと、固定した同一feature branchへの
  post-recommit pushを一括承認する
- `pr recommit push`承認を別branch、別remote、PR作成、merge、tag、Releaseへ転用しない
- soft reset直前にbackup branchを作成する
- `pr recommit push`ではbackup成功後、同一invocation内でreset、commit、
  安全条件内のpushまで継続する
- base ancestry、clean state、exact HEADをmutation直前に再検証する
- pushはexact destinationとexplicit force-with-leaseを使う
- push直前にremote expectationを再取得し、変化していればpushしない
- fixed artifactとdigestをmutation時に再構成しない
- attempt recordをmutation直前に確定する
- postconditionを確認する
- `unresolved`を自動再試行しない
- tag・Release mutationを通常のpush承認へ含めない
- version increment noticeをcommitのblocking gateにしない
- unrelated working-tree changeを保存し、暗黙にstageしない

## 機敏さの受け入れ条件

速度評価はNode runner単体ではなく、Agentを含むtransition全体を対象とする。

- normal mechanical transitionはSkill読込後、一つのAgent tool callで完結する
- 一つのmechanical segmentに含まれる`git`、`gh`、searchを一つのNode invocationで実行する
- child command数とAgent tool call数を別々に計測し、command数増加をAgent往復数へ
  波及させない
- mechanical result後の生成AIによる再要約を0回にする
- unchanged cycle snapshotから同じrepository factsを再収集しない
- PR prose以外の通常経路で追加model invocationを要求しない
- PR proseはbounded evidenceから一回だけ生成する
- human approvalが必要な状態だけで会話を停止する
- normal `pr recommit`と`pr recommit push`で会話上のpreflight承認を要求しない
- `pr recommit push`ではbackup成功後からpush、remote確認、`-done` renameまで追加の
  Agent応答または人間承認を挟まない
- version increment noticeへの返答待ちを発生させない
- runnerのcold p95とwarm p50を継続計測する
- `SKILL.md`とruntime referenceのbytesを継続計測する
- branch作成、commit、candidate、publish、merge、releaseの各transitionに
  failure-path fixtureを持つ

実行時間を減らすためにapproval、digest、attempt record、conflict check、
postconditionを削ってはならない。安全処理は生成AIから決定論的実装へ移す。

## 段階的な移行案

### Phase 1: cycle state基盤

- cycle schemaとstate transition validatorを実装する
- fixed child process adapterとtransition executorを実装する
- macOS・Windows 11 platform adapterを共通interfaceで実装する
- direct read、`git grep`、optional `rg`を統合するsearch adapterを実装する
- `gh` JSON schemaとsearch expectationの共通判定を実装する
- expected chain、各step failure、timeout、signal、malformed outputのfixtureを追加する
- `cycle.status`をREADONLYで追加する
- 現行runner resultからcycleへ参照を記録できるようにする
- legacy branchを変更せず診断する

### Phase 2: 作業開始と通常commit

- `work.cycle.start`を固定runner化する
- [x] one-shotの`work.commit`を追加する
- [x] `work.commit`のversion increment確認をnon-blocking noticeへ変更する
- [x] recognised repository-declared checksを内部commit planへ固定する

### Phase 3: PR candidate統合

- `writing.pr.prepare`までの`git`・search・`gh` evidence収集を一つのNode segmentへ統合する
- PR draft保存後のvalidation、backup、reset、commit、publication planを一つの
  Node segmentへ統合する
- PR draftの一回生成を維持する
- `pr recommit`をlocal-only、`pr recommit push`をpublication込みの固定IDへ分離する
- `pr recommit`成功時は`CANDIDATE_FINAL`で返す
- exact `pr recommit push`だけをlocal rewriteと条件付きpushへの一括承認とする
- `pr recommit push`ではbackup成功後に承認待ちせずreset、commit、条件付きpushへ進む
- `pr recommit push`ではrecommit成功時にpublication planを同時生成し、安全なら
  同じsegmentでpushする
- remote equality確認と`-done` renameまで同じsegmentで完了する
- 既存`pr.recommit.preflight`をoptional inspectionとcompatibility routeにする

### Phase 4: publication state修正

- macOSとWindowsの同一publication contract suiteを追加する
- native Windows 11 smoke test後にpublicationのplatform allowlistへ`win32`を加える
- standalone / recovery publicationだけに独立approvalを残す
- remote expectation conflictから`CANDIDATE_FINAL`へ停止する経路を固定する
- publication成功時の`-done` renameを維持する
- `-done`とcycleの`PUBLISHED`を同時に記録する
- PR handoffからRelease/tag handoffを分離する

### Phase 5: mergeとRelease handoff

- `pr.merge.confirm`を追加する
- merged baseからRelease candidateを確定する
- `release.handoff`を追加する
- next-work branch作成とRelease handoffを独立transitionにする

### Phase 6: promptとruntime contextの縮小

- `SKILL.md`をactivation、safety kernel、runner entryへ縮小する
- exact transition routingをmanifestとfixed codeへ移す
- normal migrated executionでdesign referenceを読まない
- end-to-end latency profileを回帰gateにする

## 未決事項

- cycle IDを時刻、branch、UUIDのどれから生成するか
- checkpoint commit messageを誰がどのevidenceから作るか
- commit planでuntracked fileをどのように明示選択するか
- GitHub PR merge確認が利用できない場合に人間報告だけを許容するか
- squash merge、merge commit、rebase mergeをどう同定するか
- push後にfeature branch上で修正が必要になった場合の標準transition
- backup成功後にresetまたはcommitが失敗した場合の標準recovery command
- versionが変わらないPRでRelease handoffを省略する条件
- version increment noticeを毎commit、cycle初回、candidate作成時のどこで表示するか
- `RELEASED`をtag存在、published Release、asset整合のどこまで要求するか
- cycle artifactと既存run、plan、attempt directoryの参照関係
- fixed child process adapterを同期実行と非同期実行のどちらに統一するか
- native Windows 11 smoke testを手動、self-hosted CI、release前gateのどれで維持するか

## 非目標

この再設計は、次を標準フローへ追加するものではない。

- Agentによる自動PR作成または自動マージ
- local tag作成またはtag push
- GitHub Releaseの自動公開
- existing tagの移動、置換、削除
- force pushの安全境界緩和
- version policyの数値形式からの推測
- repository-declared checkの省略

## 完了条件

再設計を完了とみなすには、少なくとも次を満たす。

- 標準フローの全段階がmanifest上の固定workflow IDへ対応する
- cycle state transitionがversioned schemaとcontract testで固定される
- 作業開始と通常commitでAgentがGit command列を組み立てない
- `pr recommit push`ではrecommit成功からpublication plan、pushまでが一続きになる
- normal `pr recommit`と`pr recommit push`が別のpreflight承認を要求しない
- `pr recommit`はlocal commit後に`CANDIDATE_FINAL`で止まり、pushしない
- `pr recommit push`はbackup成功後にreset、commit、安全なpush、remote確認、
  `-done` renameまで同一処理で進む
- remote expectationが変わった場合はpushせず`CANDIDATE_FINAL`で停止する
- push成功をPRマージ完了と誤認しない
- Release tagがmerged base commitから確定される
- publication成功時の`-done` renameとfrozen ruleが維持される
- version increment注意がcommitをblockしない
- 人間承認点が明示commit要求、明示`pr recommit`、明示`pr recommit push`、
  standalone / recovery publication、GitHub UI作業へ整理される
- mechanical transitionが原則一つのAgent tool callで完結する
- fixed Node.js runnerがexpectedな`gh`・`rg`結果のたびにAgentへ戻らない
- `rg`未導入のnative Windows 11でも同じsemantic search resultを得られる
- `rg`の`0`、`1`、`2以上`がstep expectation別にcontract testで固定される
- `gh`のexit code、JSON schema、repository identity、snapshot expectationが検証される
- macOSとWindows 11で同じworkflow ID、approval、digest、failure schemaを使う
- Windows 11 publicationはplatform contract testとnative smoke testの完了後だけ有効になる
- 現行安全不変条件とlegacy workflow互換性がcontract testで維持される
