---
title: 外部同梱Skill更新確認CLIの自己レビュー5件への対応計画（Luna向け）
status: planned
created: 2026-11-13
---

# 外部同梱Skill更新確認CLI：自己レビュー5件への対応計画

利用者指示：「自己レビューの対応を計画して。Lunaが実施できるレベルで。このターンは実装なし」。
この文書は後続の実装依頼で使う。今回行ったのはsourceの読み取りと計画文書の作成であり、
修正コード・test・上流照会を実行した記録ではない。

## 1. 開始状態と優先範囲

対象repoは `/Users/igapyon/Documents/git/igapyon-agent-skills`。
計画時のbranchは `devel-tiga1113hff`、HEADは
`d8bc1b0966e5920692ea59f521fbc25a52ea850e`、`origin/devel` に対しahead 2。
計画編集前の作業ツリーはclean。POM版は `1.20261113.2`。
後続実装ではbranch、HEAD、差分、適用される `AGENTS.md` を再確認し、開始snapshotへ戻さない。

正本の関連ファイル：

- [初回実装計画](bundled-skill-update-check-node-luna-implementation.md)：BUC-00〜08の全体仕様。
- [初期CLI](../../scripts/check-bundled-updates.mjs)：159行の単一module。import時にもmainが実行される。
- [現行test](../../scripts/bundled-updates.test.mjs)：help、不正jobsの2件。collectorの成功・失敗は未検証。
- [共有入力reader](../../scripts/skill-index-policy.mjs)：POM/policyの読み取りと整合validator。
- [配布ファイル列挙](../../scripts/release-archive-files.mjs)：除外判定とsymlink拒否の既存仕様。

今回の後続修正では、自己レビュー5件と、その修正を証明するtestを優先する。
この5件に関する具体的な状態・入力・検証手順は本計画を優先し、その他は初回計画を引き継ぐ。
5件を修正しても、初回計画全体の完了とはしない。

pair cache、HTTPの全体直列化/rate-limit停止、Git host provider拡張、stdout容量制御、
効果計測、CI追加、DEVELOPMENTの運用接続、実GitHub smoke等の未実装項目は、
初回計画のBUC残件として保持する。今回の修正に必須の範囲を越えて一括実装しない。
pin・版更新、Maven package、ローカル配備、commit/push、tag/Releaseは今回の成果物に含めない。

## 2. 指摘と修正の対応

行番号は開始HEADのsourceを指す。後続では関数名と処理内容から箇所を特定する。

| ID | 問題・現在の根拠 | 修正後の条件 |
| --- | --- | --- |
| SR-1 / 高 | `checkEntry` 79〜129行。HEAD確定後の例外も外側catchが `pinStatus=unknown` に置換する | HEADの判定を保持し、Release/history/sourceの失敗は各資料の状態へ記録。候補数を減らさない |
| SR-2 / 中 | `requestJson` 50〜60行、返却処理127行。JSONであればReleaseをok扱いし、compareのidentityも未検証 | HTTP成功・JSON解析・型/identity検証を通ったデータだけをokとして正規化 |
| SR-3 / 中 | tree処理99〜113行。通常ファイル確認は新側の `SKILL.md` だけ | 配布対象の全pathのtype/modeを検証。symlink/gitlink等を含めたら資料不完全を返す |
| SR-4 / 中 | `requestJson` 57〜58行。全bodyの確保後に16MiBを検査 | stream読取り中に上限を適用し、超過時に読取り・要求を中断。部分JSONを使わない |
| SR-5 / 中 | `main` 139〜150行。別々のreader呼出し、入力hash・最終照合なし | 固定bytesから対象を確定し、開始前・終了時に照合。変化/消失はpartialで報告 |

## 3. ファイルと実装順

今回必要な責務だけをmoduleに分ける。初回計画にあるcache/report全moduleの完成を先に要求しない。

| ファイル | 後続実装で行う変更 |
| --- | --- |
| `scripts/check-bundled-updates.mjs` | 段階別entry処理、集約、snapshotの受渡し、run資料/終了code、import-safeな入口、test用の依存注入 |
| 新規 `scripts/bundled-updates/github.mjs` | body読取り上限、固定GET、Release/compare validatorと正規化 |
| 新規 `scripts/bundled-updates/config.mjs` | bytes取得・hash・固定入力の解析/検証・前後照合 |
| `scripts/skill-index-policy.mjs` | POMの既存解析をpure関数 `parseExternalSkillPins(pomText)` へ抽出。既存readerはそのwrapperとして維持 |
| `scripts/release-archive-files.mjs` | `isExcludedSourcePath(relativePath)` をexportし、既存列挙とcollectorの除外規則を共有 |
| `scripts/bundled-updates.test.mjs` | 既存2件を保持し、状態集約・HTTP・validator・snapshot・treeの契約testを追加 |
| 新規 `scripts/bundled-updates.integration.test.mjs` | 一時Git repo、実tree、fake HTTPを使うcollectorの統合test |
| 既存 `scripts/skill-index-policy.test.mjs`、`scripts/release-archive-files.test.mjs` | 共有関数抽出の既存動作を検証 |
| `package.json` | `test:bundled-updates` にintegration suiteを追加。依存は増やさない |
| 本計画、初回計画、`TODO.md` | 5件の成否・根拠とBUC残件を記録。全体完了と混同しない |

推奨順：

| ID | 作業 | 完了条件 |
| --- | --- | --- |
| FIX-00 | 開始確認と5件の対象照合 | 現在の差分を保持し、対象と未実装範囲を確認 |
| FIX-01 | import-safeな入口、依存注入、回帰fixture | 通信せず関数をimportでき、5件の失敗入力をtestから与えられる |
| FIX-02 | SR-5の固定入力・pure parser・前後照合 | collectorが保存した入力と同じ対象だけを調査し、変更を検知 |
| FIX-03 | SR-4のstream上限 | 読取り中の超過・timeoutを確実に中断 |
| FIX-04 | SR-2のmetadata validator | 不正な型/identityはokにせず、正しいnullable項目を受理 |
| FIX-05 | SR-1の段階別entry処理とrun集約 | metadata/sourceの失敗後もsame/changedを保持 |
| FIX-06 | SR-3の配布material全件検査 | 通常ファイル/除外とsymlink/gitlinkの境界を検証 |
| FIX-07 | 関連suiteとCLI検査、記録 | 第10節の完了条件を満たし、初回計画の残件を保持 |

各修正の回帰testを先に失敗させて原因を確認し、対応後の成功を記録する。
実装途中の失敗と完了時の結果を区別し、旧2件成功を今回の根拠に流用しない。

## 4. testから呼び出せる構造

本番CLIのoptionは初回計画どおり `--repo/--format/--jobs/--help` を維持する。
fake API URL、任意コマンド、test用環境変数を本番optionとして追加しない。

内部APIの推奨形：

```text
collectBundledUpdates({ repoRoot, jobs, executor, fetchImpl, clock })
checkEntry(entry, { repoRoot, runDir, executor, metadataClient, clock })
runCli(argv, { collect, stdout, stderr }) -> Promise<number>
```

`executor` の既定値は現在の固定Git実行関数、`fetchImpl` は組み込みfetch。
`clock` は日時とtimeoutのtestを制御するための内部依存で、通常は実時計を使う。
collectorの引数で受けた依存を内部の関数へ渡し、testだけが使う別実装のcollectorを作らない。

module末尾の無条件 `main()` を外し、CLIとして直接実行されたときだけbootstrapを呼ぶ。
実ファイルとargvのrealpathで入口判定し、通常の絶対path実行とsymlink経由の実行を維持する。
import時はGit・通信・run directory生成をしない。
`runCli` は戻り値として終了codeを返し、bootstrapだけが `process.exitCode` を設定する。

## 5. SR-1：HEAD判定を保持するentry処理

### 5.1 状態を確定した段階で保存する

entryの初期値は `pinStatus=unknown`、`observedHead=null`、`defaultBranch=null`、
`headObservedAt=null`、`skillChange=unknown`。HEADを取得・検証できた段階で
branch/SHA/観測時刻を保存し、same/changedを一度だけ確定する。
観測時刻は通信開始時ではなく、検証成功時に記録する。

その後の例外は、この確定値を変更しない。HEADを再照会して別SHAへ差し替える処理も加えない。

段階を次のように分け、各段階のエラーを捕捉する。

1. HEAD取得：失敗時だけpinStatusはunknownのまま。
2. Release取得・検証：HEADの成功とは独立して実行可能。失敗はrelease状態へ記録。
3. compare取得・検証：HEADがchangedのとき実行。Releaseの成功を前提にしない。
4. Git/source差分：HEADがchangedのとき実行。Release/compareの成功を前提にしない。
5. entryの最終状態を集約。

sameの場合は `skillChange=identical`、historyは `not-needed` とし、source取得を省略する。
unknownの場合はcompare/sourceを実行せず、HEAD依存の資料を確認できなかったことを残す。
内部のstage状態は `pending/ok/error/not-needed` でよいが、保存時にpendingを残さない。

### 5.2 結果の規則

| 状況 | entry判定 | run判定 |
| --- | --- | --- |
| HEAD不明 | pinStatus=unknown、evidenceStatus=error | partial、終了2 |
| HEAD確定、必要な段階すべて成功 | same/changedを保持、evidenceStatus=complete | 他に問題がなければcomplete、終了0 |
| HEAD確定、Release/history/sourceのいずれか失敗 | same/changedを保持、evidenceStatus=partial | partial、終了2 |
| tree比較完了、配布materialが不正 | skillChangeの比較結果は保持し、evidenceStatus=partial | partial、終了2 |
| 同じSHAだけれどRelease失敗 | same/identicalを保持、evidenceStatus=partial | partial、終了2 |

`counts.changed` はpinStatus=changedの件数、`updatesAvailable` はchangedが1件以上。
`allPinsMatch` は全件sameのときだけtrue。unknownを一致に数えない。
既知の候補がないpartial結果を「更新なしで確認完了」と表現しない。

errorsは `{phase, code, message}` の配列とし、phaseを `head/release/history/source/input`、
codeをtestで照合できる固定識別子にする。例：`http-error`、`metadata-invalid`、
`material-invalid`、`body-too-large`、`input-changed`。messageの文言一致をtestの主根拠にしない。
Releaseが失敗しても正常なhistory・sourceと、それまでに保存した資料を残す。

run全体を停止させる例外は、入力不正、run保存不可等に限定する。
保存自体に失敗した結果をcompleteとしてstdoutへ返さない。

## 6. SR-2 / SR-4：HTTP取得とmetadata検証

### 6.1 bodyを読みながら上限を適用する

HTTP clientは固定GETのURL・header・15秒timeout・redirect拒否を維持し、
読取り後のJSON解析とendpoint別の正規化を分ける。

1. `fetchImpl` にAbortControllerのsignalを渡し、timeoutはheader/bodyの全処理を覆う。
2. HTTP非200では成功bodyを解析しない。404はnot-found、その他はerror。
   不要なbodyをcancelしてから返す。途中のHEAD判定へ影響させない。
3. 200で `Content-Length` が有効な非負整数かつ16MiBを超えるなら、bodyを読まず中断する。
   このheaderがない/小さい場合でも、実際に受け取るbytesで必ず検査する。
4. `response.body.getReader()` を使い、`Uint8Array.byteLength` を加算する。
   `total + chunk.byteLength > 16 * 1024 * 1024` をappend前に判定する。
5. 超過したchunkを保持せず、controllerを即座にabortしてからreaderのcancelを試みる。
   cleanupのcancelを無制限に待って失敗結果が返らなくなる構造にしない。
   固定code `body-too-large` を返す。途中までのJSONは解析・保存済み成功扱いしない。
6. EOFまで上限以内なら連結し、UTF-8としてdecodeしてJSON.parseする。
   不正UTF-8、JSON不正、200でbody欠落はそれぞれerror。
7. すべての経路でtimer解除とreaderのlock解放を行う。cleanupの失敗で元の原因を隠さない。

body上限はfetchが渡すbody bytesに適用する。圧縮時のContent-Lengthだけを根拠にしない。
bufferの連結やJSON.parseにもメモリは必要なので、RSSが厳密に16MiB以内になるとは主張しない。
`arrayBuffer()` / `text()` で全bodyを確保してから上限確認する処理を残さない。

### 6.2 Release validator

`normalizeRelease(data, expectedRepo)` は純粋関数にし、検証完了後だけ `status=ok` の結果を作る。
未知の追加fieldは許容し、利用するfieldを検証する。

| field | 条件 |
| --- | --- |
| root | null/array以外のobject |
| `id` | 正のsafe integer |
| `tag_name` | 空白だけでないstring。semverだけに制限しない |
| `draft` / `prerelease` | booleanで、latest full releaseの結果として両方false |
| `url` | HTTPS `api.github.com/repos/<owner>/<repo>/releases/<id>`。期待repoとidに対応 |
| `html_url` | HTTPS `github.com/<owner>/<repo>/releases/tag/...`。期待repoとrouteに対応 |
| `created_at` / `published_at` | 有効なISO日時string。公開済みlatestの結果としてpublished_atの欠落/nullは拒否 |
| `name` / `body` | stringまたはnull。省略時はnullへ正規化。空文字も許容。他の型は拒否 |

URLは `new URL()` でscheme/host/credentials/path/query/fragmentを検査する。
owner/repoはpath要素単位で一致させ、GitHubのowner/repoの大文字小文字差は同一として扱う。
`startsWith('https://github.com/owner/repo')` だけで `repo-other` を受理しない。
tag名のslash等はURLエンコードを考慮し、未知hostへのfallbackを加えない。

返却値は既存の `release.status/tag/name/url` を維持し、必要な時刻・bodyを追加して保存する。
不正なmetadataの一部だけを抜き出してokにしない。
`target_commitish` とtag名を新SHAの証明や採用pinの代用にしない。

### 6.3 compare validator

`normalizeCompare(data, {owner, repo, oldSha, newSha}, responseHeaders)` を純粋関数にする。

- rootはobject、`base_commit.sha === oldSha`。新SHAは固定requestとGit側のcommit検証へ結び付ける。
- responseのAPI `url` は期待repoのcompare endpointと要求したold/new SHA pairに対応すること。
  `html_url` も期待repoのcompare routeを指すこと。
  返ってこない `head_commit` fieldを必須にしない。
- `status` は `ahead/behind/diverged/identical` のいずれか。
  `ahead_by/behind_by/total_commits` は非負safe integer。
- `commits` は配列で、要求したper_page=100以内。各要素のSHAは40桁、
  commit.messageはstring、html_urlは同repoの `/commit/<そのSHA>`。SHA重複を拒否。
- `total_commits < commits.length` 等の明らかな矛盾は拒否する。
- `history.complete` は `commits.length === total_commits` かつnext pageなしのときtrue。
  99/100/101件相当を検証し、「ちょうど100件」を常に不完全にする現行判定を修正する。
- 続きがある正常応答は `history.complete=false` と要確認理由を残す。
  省略を明示した履歴は初回計画どおり扱い、それだけでrunをpartialにしない。
  壊れた応答と省略された正常応答は区別する。
- APIのfiles/patchは配布ファイル比較の完全性判定に使わない。

通信/型/identity検証が失敗したらそのmetadataをerrorとし、SR-1の状態規則へ渡す。
raw response全体をstdoutへ出さない。validatorのerrorにはfield名と期待条件を含める。

## 7. SR-3：配布materialの全件検査

既存の `ls-tree -r -z --full-tree` の取得とNUL解析を利用し、選択したSkillの
**除外後の全entry** を検査する。

1. `isExcludedSourcePath(relativePath)` を `release-archive-files.mjs` に追加する。
   `/` 区切りのpath要素が `.DS_Store/node_modules/.git` ならtrue。
   既存 `collectFiles` のsource除外も同じ関数を使い、archive側の列挙は従来どおり除外しない。
2. fetchしたold/new SHAをそれぞれ `git rev-parse --verify <sha>^{commit}` で解決し、
   結果が要求した40桁SHAと一致することを確認する。tree/blobのSHAをcommitの代わりにしない。
   treeを解析する際、mode/type/OID/pathの必須部分を確認する。
   選択したSkillの配布対象では `type=blob` かつmodeが `100644` / `100755` だけを通常ファイルとする。
3. `120000` のsymlink、`160000` / type=commitのgitlink、想定外の組合せを全件集める。
   `SKILL.md` 以外のreferences/assets/scriptsも対象にする。
4. 配布対象の `SKILL.md` が通常ファイルとして存在することを確認する。
   Skill rootがsymlink/gitlinkの場合も、通常のSkill directoryとして扱わない。
5. before/afterの両方を検査し、`changes.json` に
   `invalidMaterials: [{side, path, mode, type, code}]` を追加する。
   beforeだけが不正でafterが正常でも、sideを示してpartialとし、改善を含む候補として残す。
6. tree差分が最後まで比較できたなら、material不正があっても比較済みの
   `skillChange=changed/identical` と変更pathを保持する。sourceの確認はpartialにする。
   tree取得/解析自体が不完全ならskillChangeはunknown。
7. 不正なmaterialを通常ファイルの資料として抽出しない。symlinkのリンク文字列を
   正しいSKILL本文と扱わず、gitlinkをcheckout/fetchして補完しない。

除外規則の適用をmaterial検査より先にする。例えば `node_modules/link` のsymlinkは
配布対象から除かれるのでエラーにしない。`.DS_Store.txt` や `node_modules-guide.md` は通常どおり検査する。
対象Skillの外にあるsymlinkまで配布不正として数えない。
同じSHAのsource取得省略は維持し、この修正だけで既存pin全件の再監査を始めない。

## 8. SR-5：固定入力と前後hash照合

### 8.1 設定を保存したbytesから解析する

`config.mjs` は `pom.xml`、`config/skill-index-policy.json` をBufferで一度取得し、
そのbytesのSHA-256と、そのbytesから解析した対象一覧をsnapshotにまとめる。

- `parseExternalSkillPins(pomText)` は既存 `readExternalSkillPins` の解析部分を抽出するだけ。
  `readExternalSkillPins(root)` はreadして新関数へ渡すwrapperとして残す。
  共有parserへ40桁SHA等のchecker固有制約を追加しない。tagを使う既存fixtureを維持する。
- captured policyをJSON.parseし、既存 `validateSkillIndexPolicy` へ
  `externalSkills: capturedInventory` と `internalSkills: listInternalSkills(root)` を明示して渡す。
  validation中にPOMを再読するdefault引数へ依存しない。
- checker固有のSHA/URL/Skill名等の検証は、全entryに対して通信前に済ませる。
  不正入力はfailed/終了1であり、1件ずつ上流へ問い合わせながら入力不正を発見しない。
- collectorはこのsnapshotのinventoryだけを使い、途中でreaderを呼んで一覧を差し替えない。

### 8.2 記録と照合の境界

`inputs.json` に少なくとも次を保存する。

```text
schemaVersion: igapyon-agent-skills.bundled-update-inputs/v1
repoRoot, branch, head, dirty, capturedAt
files: [{path, sha256, byteLength}]
entries: [{repo, ref, skill}]
beforeDispatch: {checkedAt, stable, files: [{path, sha256|null, readStatus}]}
afterCollection: {checkedAt, stable, files: [{path, sha256|null, readStatus}]}
```

1. 入力を確定し、run directoryとinputsの初期記録を保存する。
2. workerへ渡す直前に2ファイルを再読し、captured bytesとhashを照合する。
3. 開始前に変化/消失した場合は通信0回。`inputChanged=true`、partial/終了2、
   元の対象全件はunknown・調査未実施として保存する。新しい入力へ自動追従しない。
4. 通信・entry資料保存の後、result/summaryを確定する直前に2ファイルを再読し、開始hashと比較。
5. 変化/消失/read errorがあれば `inputChanged=true`、run errorsへ原因を記録し、partial/終了2。
   完了したentryの判定と元のinput hashを保持し、調査をやり直さない。

resultには `inputChanged`、`errors`、入力hash、inputs artifactのpathを追加する。
summaryとJSON要約にもinputChangedと入力変更の理由を出し、AIがresult全体を開かずに
「現在の設定としては再確認が必要」と分かるようにする。

`counts.incomplete` はentryの未完了数。全entryがcompleteでも、入力変更だけでrunはpartialになる。
`allPinsMatch=true` は開始時のpinに対する事実として維持できるが、inputChanged=trueなら
「現在の設定もすべて最新」と表現しない。

空白・改行だけの変更もbytes/hash差として検知する。通信先等の設定をロックしたり、
元のbytesへ書き戻したりしない。hash照合は最後の読取り時点の検査であり、
照合後に始まる別操作の変更まで防ぐtransactionとは扱わない。

## 9. 回帰testと実行手順

### 9.1 testの作り方

通常testはNode組み込みだけで動かし、外部GitHub、認証、実データ、installed Skillに依存させない。

- state/validator/stream：injectしたexecutor/fetchImpl/clockで制御する。
- stream：fake readerでchunkとcancel/abortの観測を行う。arrayBufferを呼ぶと失敗するfakeも用意する。
  timeoutはfake clockまたは内部依存で短い期限を使い、15秒待ちをtestへ入れない。
- snapshot：一時repoへPOM/policyを配置し、stage境界のfake処理中に設定を書き換える。
  hash関数そのものを偽装して変化を再現したことにしない。
- Git material：一時repoで通常ファイルとsymlinkをcommitし、gitlinkは
  test内の `git update-index --add --cacheinfo 160000,<commit>,<path>` 等でindexへ置く。
  sourceを外部へ配備せず、実際の `ls-tree -z` の結果をcollectorの本番parserに渡す。
  symlink作成に制約がある環境でも、Git indexの120000 modeを使うfixtureで判定を検証する。
- integration：入力に書くHTTPS URLは維持し、test executorだけが固定URLをlocal originへ対応付ける。
  本番にfile URL/任意API許可を追加しない。
- 実行前後のtracked bytes/index/HEADが、test内で意図的に変えた入力以外は不変であることを確認する。

### 9.2 必須ケース

| ID | 入力・故障 | 期待する結果 |
| --- | --- | --- |
| R1-a | HEADはchanged、Releaseが503、compare/treeは正常 | changed/observedHeadを保持、source資料あり、partial、更新候補1 |
| R1-b | HEADはchanged、compareのJSON不正、tree正常 | changedを保持、history error、source資料あり、partial |
| R1-c | HEADはchanged、旧SHAのfetch失敗 | changedを保持、skillChange unknown、source error、partial |
| R1-d | HEADはsame、Release失敗 | same/identical、history not-needed、partial |
| R1-e | HEAD取得失敗、Release正常 | unknown、Release情報を保持、更新なしと断定しない、partial |
| R1-f | 2対象のうち1成功1失敗 | 両方のentryを保存し、件数が各状態と一致、終了2 |
| R2-a | Releaseが `{}` / null / array / tag null / draft true / prerelease true | metadata-invalid、ok/completeにならない |
| R2-b | 正常Release、name/bodyはnullまたは省略 | 受理、任意の追加fieldがあっても成功 |
| R2-c | Releaseが別repo/host、repo名prefixだけ同じ | identity不一致、partial |
| R2-d | compareのbase SHAが旧SHA以外、別repo URL | identity不一致。更新候補は保持 |
| R2-e | compareのcountsが負数、commitsが非配列、不正SHA/重複SHA | metadata-invalid、historyを成功にしない |
| R2-f | compareが99/100/101件相当、behind/diverged | 100件ちょうどはtotal一致かつnextなしでcomplete。続きは明示。statusを保持 |
| R3-a | 新側のassets/referenceのsymlink | path/side/modeを記録、比較結果を保持、partial |
| R3-b | scripts配下のgitlink | submoduleを取得せずmaterial-invalid、partial |
| R3-c | before側だけ不正、afterは通常ファイルへ修正 | beforeの要確認と改善の差分を残し、changed候補を保持、partial |
| R3-d | 実行可能な通常file100755、binary100644 | 受理し、mode/content差を検出 |
| R3-e | 除外directory内のsymlink、対象Skill外のsymlink | そのmaterialだけでpartialにしない |
| R3-f | 除外名と似たfile名、日本語/空白を含むpath | 省略せず検査し、正しいpathを報告 |
| R4-a | chunked bodyで上限ちょうど/1byte超過 | 前者はJSONが正しければ受理、後者はbody-too-large、cancel/abort |
| R4-b | Content-Lengthなし/小さく偽装し、実streamが上限超過 | 実bytesで拒否。残りchunkを成功bodyへ蓄積しない |
| R4-c | Content-Lengthが上限より大きい | body read前に拒否しcancel/abort |
| R4-d | body読取り中のtimeout、stream error、不正UTF-8/JSON | 固定error、timer/reader解放。正常entryへ影響させない |
| R5-a | 入力の変更なし | inputs hashと保存した開始bytesのhashが一致、inputChanged false |
| R5-b | worker開始前にPOM/policyを変更・削除 | 通信0回、入力変化を記録、partial/終了2 |
| R5-c | 調査中にPOMだけ、policyだけ、両方を変更 | 元のinventoryで取得を完了し、inputChanged true、partial/終了2 |
| R5-d | 終了時に設定削除、または読めない | 未処理例外で結果を失わず、元のentryとhashを保存、partial |
| R5-e | 改行のみ変更、共有readerのtag fixture | 改行差は検知。checker固有制約を共有parserへ漏らさず旧fixtureも成功 |
| CLI | moduleをimport、help/不正jobs、runCliのpartial/complete | importで副作用なし。既存挙動を保持し、戻り値とstdoutの分類が一致 |

testの期待値は単独validatorだけでなく、collectorが保存するresult・summary・入力artifactにも適用する。
各errorが表示されるだけでなく、候補数・観測SHA・partial/終了codeが保たれることをassertする。

### 9.3 後続実装時に実行する検査

`test:bundled-updates` を次へ更新する。

```text
node --test scripts/bundled-updates.test.mjs scripts/bundled-updates.integration.test.mjs
```

実装中は対象testに絞り、全修正後に次を実行する。

```sh
node --check scripts/check-bundled-updates.mjs
npm run test:bundled-updates
npm run test:skill-index-policy
npm run test:version-alignment
git diff --check
```

共有parser/除外の影響は `test:skill-index-policy` 内の既存testで確認する。
Node22/24で新suiteが動くことを確認し、利用できないruntimeは未確認として残す。
今回の5件はfake/local Gitで検証できるため、実GitHub照会を修正の合格条件に加えない。
実GitHub smokeは初回計画のBUC-08で実施する。
新たな変更・失敗の根拠がない限り、daybook/miku-scm全suiteやMaven packageへ検査を広げない。

## 10. 完了判定と記録

- [x] SR-1：HEAD確定後の失敗は段階別errorとして残し、pin/SHA/候補数を保持する。
- [x] SR-2：Release/compareの型とrepo identityを検証。不正metadataは成功扱いしない。
- [x] SR-3：selected Skill treeの通常blob modeを検査し、symlink/gitlink等をside/path/mode付きで記録する。
- [x] SR-4：stream中にbyte上限を適用し、超過時はabort/cancelして累積読込を止める。
- [x] SR-5：設定bytesを一度captureし、hash付きinputs artifactと開始前・終了時の照合を保存する。
- [x] collectorの保存結果・JSON要約・終了codeを含む回帰testを追加。共有parser/除外suiteとversion alignmentも成功。
- [x] 実施記録と初回計画/TODOを更新。BUC-02〜08の未完了項目を残す。

記録する項目は、実装したFIX、変更ファイル、実行環境、実際のtest件数と結果、
計画から変更した点と理由、未確認のruntime/挙動、初回計画へ残す作業。
「自己レビュー5件の対応完了」と「外部Skill更新確認CLI全体の完成」を分けて報告する。

## 11. 外部仕様と実施記録

APIの利用field・compareのページングは、2026-11-13に
[Release API](https://docs.github.com/en/rest/releases/releases) と
[Compare API](https://docs.github.com/en/rest/commits/commits) の公式資料を確認した。
validatorの成功fixtureは実際のresponse構造に合わせ、存在しないfieldを作って合格させない。

### 2026-11-13 実施記録

- `scripts/check-bundled-updates.mjs` をimport-safeなcollector/CLIへ整理し、依存注入可能なentry検査、段階別error、入力snapshotと前後hash照合、保存result/summaryを実装。
- `scripts/bundled-updates/config.mjs` にcaptured bytesからのparser/validator接続、`scripts/bundled-updates/github.mjs` にstream上限・Release/compare validatorを追加。
- 共有 `parseExternalSkillPins` と `isExcludedSourcePath` をexportし、release archiveとcheckerで同じ除外規則を利用。
- `scripts/bundled-updates.integration.test.mjs` とnpm scriptを追加。HTTP stream上限、metadata identity、changed pinの保持、調査中POM変更、HEAD失敗後のRelease証拠保持、symlink material記録、CLI help/引数を確認。
- 成功: `npm run test:bundled-updates` (8/8), `npm run test:skill-index-policy` (77/77), `npm run test:version-alignment` (5/5), Node構文確認、`git diff --check`。
- 制約: Node 22/24、実GitHub照会、Gitlink/binary/Content-Length/timeout全境界の個別fixtureは未確認。実repo smokeは初回計画BUC-08へ残す。回帰suiteは必須仕様の全組み合わせを網羅するものではない。
- 初回計画BUC-02〜08のうちpair cache、DEVELOPMENT/CI接続、広いruntime・fixture検証、実repo smokeと計測は未完了。今回の自己レビュー対応をCLI全体完成とは扱わない。
