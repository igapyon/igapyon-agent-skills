---
title: 外部同梱Skillの更新確認をNode.jsへ移す実装計画（Luna向け）
status: in-progress
created: 2026-11-13
---

# 外部同梱Skillの更新確認をNode.jsへ移す実装計画

利用者の指示：「生成AIとの対話とトークン消費を減らし、実行速度を上げるため、
既存の更新確認の定型部分をNode処理にしたい。Lunaが実施可能な詳細さで計画する。
このターンは実装しない」。

この文書は後続の実装依頼で使う仕様と作業順である。計画作成時点では、CLI、
テスト、CIの実装、上流13件の最新版調査、pin更新、ビルドを実施していない。

## 1. 調査済みの現在地

対象の正本は `/Users/igapyon/Documents/git/igapyon-agent-skills`。
計画編集前のbranchは `devel-tiga1113hff`、HEADは
`c9036cc701da649ed5e0f1dc81f1276cad1c2fe7`、作業ツリーはclean。
`pom.xml` の版は `1.20261113.2`。実装開始時は実際のbranch・差分を読み直し、
この開始状態へreset/checkoutしない。

| 既存ファイル | 確認した役割・今回の接続点 |
| --- | --- |
| [DEVELOPMENT.md](../../DEVELOPMENT.md) | 上流の既定ブランチHEAD、コミット・ファイル差分、Release情報を調べ、pinと案内文を更新し、Maven packageとZIP検査へ進む運用 |
| [pom.xml](../../pom.xml) | `external.<id>.repo/ref/skillName` の13組が取得対象と40桁SHAを定義。上流Releaseのtagを採用pinにする運用ではない |
| [config/skill-index-policy.json](../../config/skill-index-policy.json) | 同じ対象のrepo/refとindex採用方針。POMとの一致が必要 |
| [scripts/skill-index-policy.mjs](../../scripts/skill-index-policy.mjs) | `readExternalSkillPins(root)`、`readSkillIndexPolicy(root)`、既存validatorを再利用できる |
| [scripts/prepare-release-staging.sh](../../scripts/prepare-release-staging.sh) | 固定refを取得してSkillをコピーし、`EXTERNAL_SKILLS.lock` を生成。毎回 `target/external` とstagingを作り直す |
| [scripts/release-archive-files.mjs](../../scripts/release-archive-files.mjs) | 配布ファイル列挙・内容照合。`.DS_Store`、`node_modules`、`.git` をパス要素単位で除外 |
| [scripts/check-release-archive.mjs](../../scripts/check-release-archive.mjs) | 内部Skillのsource照合、外部pin/index、代表参照経路等のZIP検査 |
| [README.md](../../README.md)、[src/assembly/README.md](../../src/assembly/README.md) | 前者は固定SHAの上流リンクと機能説明、後者は配布用案内。文章の意味判断が必要 |

trackedな `scripts/` に、上流全件の最新版取得と比較を一括実行するCLIは見つからなかった。
現行の更新確認は `DEVELOPMENT.md` の手順を実行エージェントがたどる構成。
`target/` の取得済みsourceを、更新確認の永続キャッシュとして使わない。

初回調査時、状態文書にはGit履歴より古い「版変更が未commit」等が残っていた。
計画作成中に別の更新commit `10d38974bd466c5157a20bae4a0775fa6d9c3b01`
（引き継ぎ記録の更新）へHEADが進んだことを確認した。この変更を保持している。
後続作業の現在地はGitと最新の状態文書を照合し、本計画の開始snapshotから推定しない。

## 2. 初回実装の範囲と完了後の流れ

初回実装では **現状取得 → 上流照会 → 比較 → 証拠保存 → 短い報告** を1つの
読み取り用CLIにする。入力は既存POMとindex policyであり、取得先の別リストを作らない。
設定で対象が増減すれば自動的に追従する。現在の13という数を実装へ埋め込まない。

```text
AI/人間がCLIを1回起動
  → POMとpolicyを照合
  → 各既定ブランチのHEADを照会（少数並列）
  → 変更対象だけ差分資料を取得・固定SHAでキャッシュ
  → 全件のRelease情報を照会
  → result.json / summary.md / 対象別資料を保存
  → 標準出力は件数・変更/失敗対象・資料の場所
AIは変更対象の資料を必要な範囲だけ読み、取り込みや案内文の修正を判断
  → 既存手順のpin更新・Maven package・ZIP検査へ進む
```

初回CLIの成果は「確認結果」であり、「取り込み済み」ではない。
既存手順の後半であるpin書換え、README等の文章修正、package、ZIP検査は、
既存コマンドを利用して続ける。今回、それらを呼ぶapplyモードは追加しない。

維持する採用方針：

- 採用候補は確認時点の **既定ブランチのHEAD**。最新Release tag、最大semver、
  最新の日付tagをHEADの代わりにしない。
- pinとHEADが違えば、版だけの更新や、配布Skillの内容が同じmergeも候補に含める。
- Releaseの版情報は案内用の補助情報。ReleaseとHEADが同じcommitとは推定しない。
- 「同梱スキルの更新を確認して」という既存の依頼が更新・packageまでを含む運用は保つ。
  新CLIの実行だけは調査に相当する。AIは既存依頼の範囲でその後の作業へ続ける。
- 同じ結果をhuman/JSONで得るためにCLIを2回走らせない。同じrunの保存済み結果を読む。

初回の対象はPOMに宣言された外部Skillである。`lib/*.jar`、npm/Maven依存、
各外部Skill内のruntime更新は別のinventoryが必要なので初回CLIには含めない。
Maven stagingのNode化、miku-scm側の改修、Skillのローカル配備、親版更新、
commit/push/tag/Releaseもこの実装の成果物に含めない。

## 3. 実行契約

### 3.1 CLI

新規入口は `scripts/check-bundled-updates.mjs`。Node.js組み込みとGitだけで動かす。
`npm ci`、Java/Maven、`gh`、追加npmパッケージを起動条件にしない。
Node.js 22/24で検証する。これは現在のrepoのCI構成に合わせた互換性範囲である。

```sh
node scripts/check-bundled-updates.mjs --repo .
node scripts/check-bundled-updates.mjs --repo . --format json
npm run check:bundled-updates
```

| option | 契約 |
| --- | --- |
| `--repo <path>` | 対象repo。省略時はスクリプトの1階層上。指定した相対pathは呼出元cwd基準。realpath化してGit root、POM、policyを確認 |
| `--format human\|json` | 既定human。JSONも短い要約と資料pathを返す。全応答をstdoutへ展開しない |
| `--jobs <1..4>` | 既定3。repo単位workerの上限。HTTP呼出しも別の全体上限1で直列化する |
| `--help` | 説明のみ。Git・通信・run directory作成を行わず終了0 |

未知option、重複option、不正値、余分な位置引数は終了1。任意コマンド、任意API URL、
任意Git引数、`--apply` は受け付けない。`--repo` は入力先の指定であり、runnerのimport先を変えない。

読み取るrepo内ファイルは入力として扱う。書込みは既存 `.gitignore` が無視する
`workplace/bundled-updates/` のみ。tracked内容、index、branch、tag、remote設定、
`target/`、インストール済みSkillを変更しない。dirtyなrepoでも現行worktreeの入力を
調査できるようにし、その状態と入力hashを記録する。

### 3.2 状態と終了コード

候補の有無と、調査の完了度を独立させる。

| field | 値と意味 |
| --- | --- |
| run `completion` | `complete` 全件で必要情報を取得、`partial` 一部未取得・入力変化あり、`failed` 設定不正等で調査開始不可 |
| entry `pinStatus` | `same` 40桁SHAが一致、`changed` 不一致、`unknown` HEAD未確定 |
| entry `skillChange` | `identical` 配布ファイル集合・OID・modeが一致、`changed` 差あり、`unknown` 必要な資料を取得できない |
| entry `evidenceStatus` | `complete` / `partial` / `error`。HEAD判定と分ける |
| `updatesAvailable` | `pinStatus=changed` が1件以上あればtrue。部分失敗時も既知の候補を残す |
| `allPinsMatch` | 全件 `same` のときだけtrue。`unknown` を一致に数えない |

- 終了0：`completion=complete`。更新候補があっても0。
- 終了2：`partial`。失敗と既知の成功を保存して返す。
- 終了1：`failed` / CLIエラー。作れる場合は失敗resultも保存する。

Release情報や差分取得に失敗しても、既に確認した `pinStatus=changed` を
`same` / `unknown` に戻さない。たとえば「候補3件、差分未取得1件」と報告する。
`pinStatus=same` では `skillChange=identical` とでき、source取得を省略する。

## 4. 調査アルゴリズム

### 4.1 入力を一度読み、通信前に検証する

1. Git root、branch、HEAD、dirty状態を読む。Git rootと `--repo` のrealpathが違えば停止。
2. `pom.xml`、policyの元bytesとSHA-256を取得し、既存の
   `readExternalSkillPins(root)` / `readSkillIndexPolicy(root)` で構成を検証する。
   読んだ元bytesと既存readerが読む内容の一致も確認し、途中変更を見逃さない。
3. checker固有の追加検証を行う。
   - 対象が空でないこと、Skill名が重複しないこと。
   - refは小文字の40桁SHA。tag/ref名や `${...}` をこのCLIで解決しない。
   - Skill名は64文字以内の小文字kebab-caseで、path要素に安全に使えること。
   - repoはcredentials/query/fragmentを含まないHTTPSの `host/owner/repo[.git]`。
     owner/repoをそれぞれ1要素として検証する。
4. `skill` 順に整列。通信順に依存せずresultもこの順に出す。
5. 同じrepoの宣言が複数あればHEAD/Release照会を共有し、差分はSkillごとに作る。

既存共有readerはtag指定を使うfixtureも支えている。40桁制約を共有readerへ追加して
既存testを壊さず、checkerの入口だけで制約を適用する。新しいXML parserや別inventoryは作らない。
現行のPOM propertiesを読む既存readerの範囲に合わせ、Maven式評価を実装しない。

### 4.2 既定ブランチHEADを取得する

repoごとに次の固定argvを `spawn`、`shell:false` で1回実行する。

```text
git ls-remote --symref --exit-code <validated-repo-url> HEAD
```

`ref: refs/heads/<branch>\tHEAD` と `<40桁SHA>\tHEAD` を厳密に対応させ、
既定ブランチ名・観測SHA・UTC観測時刻を保存する。`main` / `master` を決め打ちしない。
複数の矛盾するHEAD、symrefなし、空応答、不正SHAを成功にしない。
ブランチは `git check-ref-format` で確認する。

取得したSHAをこのrunの対象として固定する。後続fetchはブランチ名で再解決せず、
そのSHAを要求する。途中で上流HEADが進んでも別SHAへ差し替えない。
各repoの `headObservedAt` を残し、全repoを同一瞬間に観測したようには表示しない。

Gitのプロセスtimeoutは45秒、stdout/stderrは各1MiB上限。
`GIT_TERMINAL_PROMPT=0` を子プロセスへ設定する。失敗・timeoutはentryへ記録し、
他repoを処理する。自動再試行と無制限待機は加えない。

### 4.3 Releaseとコミット比較の固定API照会

初回HTTP providerは、現在の全取得元で使われる公開 `github.com` を対象とする。
次の匿名GETのみを組み込み `fetch` で実行する。

```text
https://api.github.com/repos/<owner>/<repo>/releases/latest
https://api.github.com/repos/<owner>/<repo>/compare/<oldSha>...<observedHeadSha>?per_page=100
```

- Releaseは全repoで毎回照会する。compareはSHA変更時のみで、後述の固定pair cacheに
  完全な保存済み応答があれば再利用する。同じrepo/SHA pairの重複照会をまとめる。
- GETのheaderは `Accept: application/vnd.github+json`、
  `X-GitHub-Api-Version: 2026-03-10`、固定の `User-Agent`。
  tokenの読出し、`gh` 起動、認証設定は行わない。
- HTTP全体は同時1件。1要求timeout15秒、body上限16MiB。上限超過やJSON不正を成功にしない。
- redirectは無条件追従せず、別repo/hostへの移動は `repository-moved` として記録する。
  設定の取得先を黙って書き換えない。
- releaseの `tag_name/name/html_url/published_at/created_at/draft/prerelease/body` を保存。
  `draft=false`、`prerelease=false`、期待するrepo URLを確認する。
  `target_commitish` を40桁commitの証拠に使わない。
- compareは固定request URL、返却 `base_commit.sha` と旧SHA、返却URLのrepo identityを検証し、
  `status/ahead_by/behind_by/total_commits` と
  取得したcommitのSHA・件名・URLを保存する。`behind` / `diverged` は要確認として目立たせる。
  responseに存在しない `head_commit` fieldを要求しない。新SHAのcommit identity自体はGit取得で確認する。
- compareのcommit一覧に続きがあれば `history.complete=false` と明示する。
  100件を超えて追跡するページングは初回では実装しない。完全なcommit履歴を見たとは報告しない。
  この「明示された履歴の省略」自体ではrunをpartialにせず、AIの確認事項へ含める。
- APIのfiles/patch一覧を配布差分の完全性判定には使わない。ファイル差分の正本は次節のGit tree比較。

その他のHTTPS Git hostも、GitによるHEADとファイル比較は同じhostに対して行える。
初回ではそのhostのREST規約を推定せず、Release/historyは `unsupported-provider`、runはpartialとする。
`github.com` のAPIへ取り違えて問い合わせない。GHES等のprovider追加は後続の拡張点とする。

### 4.4 変更対象のsource資料を取得する

1. `oldSha != observedHeadSha` の対象だけ差分cacheを探す。
2. cache missでは、このrun配下に一意なbare repoを作成し、次の固定argvで取得する。
   同じSHA pairを扱うSkillが複数あれば取得を共有する。

   ```text
   git init --bare <run内の一時git-dir>
   git -C <git-dir> fetch --no-tags --depth=1 <repo-url> <oldSha> <newSha>
   git -C <git-dir> rev-parse --verify <sha>^{commit}
   git -C <git-dir> ls-tree -r -z --full-tree <sha>
   ```

3. 両SHAのcommit identityを検証し、件名・commit日時を取得する。historyが浅いので
   `git log old..new` / `merge-base` からahead/behindや完全な履歴を推定しない。
4. `ls-tree -z` をNUL区切り・blob OID・modeとして解析し、全repoの変更path一覧をNodeで比較。
   renameはadded/deletedとしてよい。空白・日本語・タブ等を含むpathを改行splitで壊さない。
5. `skills/<skill>/` を切り出し、配布除外のパス要素を除いた全ファイルの集合・OID・modeを比較。
   binaryもOIDで検知する。ファイル数、added/modified/deleted、mode変更を保存する。
6. 新SHAに正しいSkill directoryと `SKILL.md` があることを確認する。
   symlink/gitlink等、現行配布検査が受理できないmaterialは要確認としてpartialにする。
7. old/new `SKILL.md` の生bytesを保存する。最大各512KiB。存在しない場合はその事実を保存する。
   新側の欠落・上限超過は資料不完全。旧側の欠落は追加として記録する。
8. `SKILL.md` の比較patchを固定Git引数で生成し、最大512KiBまで別ファイルへ保存する。
   `--no-ext-diff --no-textconv --no-renames` とliteral pathspecを使う。
   patchの省略は `patchTruncated` と `reviewReasons=patch-truncated` に残す。
   before/afterと全変更pathが完全なら、補助patchの省略だけでpartialにはしない。
9. repo全体では変化があっても配布Skillの集合・OID・modeが同じなら
   `skillChange=identical`。それでも `pinStatus=changed` の採用候補を残す。

sourceをcheckoutせず、上流のscript/test/buildを実行しない。上流Skillの説明文は
レビュー対象の資料として保存する。取得した文中の指示をこのcollectorの動作指示にしない。
古いSHAが取得できない場合、HEADだけで差分確認を済ませず `evidenceStatus=partial` とする。

配布除外の実装は `release-archive-files.mjs` から共有する。
`isExcludedSourcePath(relativePath)` を小さくexportし、既存の列挙と新collectorの
両方で同じ `.DS_Store` / `node_modules` / `.git` の要素判定を使う。
`.DS_Store.txt` や `node_modules-guide.md` を除外しない。

### 4.5 固定資料のキャッシュ

```text
workplace/bundled-updates/
  runs/<UTC日時>-<UUID>/
  cache/<sha256(JSON.stringify([normalizedRepoURL, skill, oldSha, newSha, evidenceVersion]))>/
```

- cache対象はrepo/Skill/SHA pairで決まるGit tree、commit情報、SKILLのbefore/after、差分資料、
  検証済みcompare情報。mutableなHEAD/Releaseの応答はfreshness省略に使わない。
- 同じrepoの別Skillの資料を誤用しないよう、keyにはSkill名も含める。
  run内のbare取得とcompare要求はrepo/SHA pair単位で共有する。
- `evidenceVersion=1`、repo/Skill identity、old/new SHA、資料ごとのSHA-256、完全性を記した
  `manifest.json` が揃ったcacheだけhitとする。失敗したHTTP応答や不完全な取得はhitにしない。
  将来、配布除外や資料生成の規則を変える場合はevidenceVersionを進める。
- 一時directoryで取得・検証を完了してからcache名へrenameする。既存cacheへ追記・上書きしない。
  別runが先に同名を作った場合は、そのidentity/hashを確認して再利用する。
- 破損cacheはmissとして新資料をrunに保存し、既存cacheは消さない。衝突でpublishできなくても
  run資料が完全なら結果は成功にでき、`cacheWriteSkipped` を記録する。
- runの資料はcacheから通常ファイルとしてコピーして自己完結させる。
  後日のcache整理でrunの説明資料が消えないようにする。bare git objectはcache側に保持してよい。
- HEAD/Releaseは必ず再照会する。通信失敗時に過去のlatest応答で穴埋めしない。
  初回はTTL、offline、ETag、cache削除CLI、共有bare repoのロック管理を実装しない。

Gitの取得・差分処理は各runの一時bare repoを使うため、異なるrunが同じGit directoryへ
同時fetchしない。repo workerの上限3はrun内の並列度であり、全件の無制限 `Promise.all` は避ける。

## 5. 保存形式と標準出力

### 5.1 runの配置

```text
runs/<run-id>/
  result.json
  summary.md
  inputs.json
  evidence/<skill>/
    head.json
    release.json
    compare.json
    changes.json
    SKILL.before.md
    SKILL.after.md
    SKILL.diff
  tmp/                         # 取得用。資料pathに使わない
```

欠けた情報は空の成功ファイルで埋めない。entryのerrorとartifact一覧で有無を表す。
全entryにHEAD/Releaseの調査状態が必要。SHA一致時はbefore/after/compareの省略が正常である。
保存は同じdirectoryの一時ファイルからrenameし、resultの存在だけで成功判定しない。
`completion` とentryの状態が正本である。

`inputs.json` は対象repoのrealpath、branch、HEAD、dirty有無、入力2ファイルのhash、
最初に確定した対象一覧を記録する。最終処理で入力2ファイルのbytes/hashを読み直し、
変化していれば `inputChanged=true`、runはpartial。資料を捨てず、元の入力の観測結果として残す。
run全体が一括の最新snapshotとは主張せず、entryごとの観測時刻を持つ。

### 5.2 result.json の契約

schemaは `igapyon-agent-skills.bundled-update-check/v1` とする。
以下は構造例。`<...>` は説明用placeholderであり、保存値は実値/null/定義したenumである。

```json
{
  "schemaVersion": "igapyon-agent-skills.bundled-update-check/v1",
  "runId": "<UTC日時-UUID>",
  "repoRoot": "<realpath>",
  "startedAt": "<ISO UTC>",
  "finishedAt": "<ISO UTC>",
  "completion": "complete",
  "inputChanged": false,
  "errors": [],
  "updatesAvailable": true,
  "allPinsMatch": false,
  "counts": { "total": 13, "same": 10, "changed": 3, "unknown": 0, "incomplete": 0 },
  "entries": [
    {
      "skill": "igapyon-miku-example",
      "repo": "https://github.com/igapyon/miku-example-skills.git",
      "currentPin": "<40桁SHA>",
      "defaultBranch": "<branch>",
      "observedHead": "<40桁SHA>",
      "headObservedAt": "<ISO UTC>",
      "pinStatus": "changed",
      "skillChange": "changed",
      "evidenceStatus": "complete",
      "release": { "status": "ok", "tag": "v1.2.3", "observedAt": "<ISO UTC>" },
      "history": { "status": "ahead", "complete": true, "totalCommits": 2 },
      "changes": { "repositoryFiles": 4, "distributedSkillFiles": 2, "skillDefinitionChanged": true },
      "cache": { "hit": false, "evidenceVersion": 1 },
      "reviewReasons": ["skill-definition-changed"],
      "artifacts": { "changes": "evidence/igapyon-miku-example/changes.json" },
      "errors": []
    }
  ],
  "metrics": {
    "elapsedMs": 0,
    "gitHeadQueries": 13,
    "gitFetches": 3,
    "httpRequests": 16,
    "pairCacheHits": 0,
    "peakRepoWorkers": 3,
    "peakHttpRequests": 1,
    "stdoutBytes": 0
  }
}
```

`release.status` は `ok/not-found/error/unsupported-provider`。
latest endpointの404を、private化等と区別できないのに「Releaseなし」と断定しない。
`not-found` と説明し、そのrunはpartialにする。200かつ型とidentityの検証が成功した場合だけok。
`history.status` は `ahead/behind/diverged/identical/error/not-needed/unsupported-provider`。
`same` はhistory `not-needed`、SHA変更時はAPIのstatusを使う。
run直下の `errors` は入力変化等のrun全体の問題、entryの `errors` は対象ごとの問題を持つ。
`counts.incomplete` は `evidenceStatus!=complete` のentry数である。run全体の入力変化だけなら
incompleteが0でもcompletionはpartialになる。未確定のbranch/SHA等はnullとし、推測値を入れない。

`reviewReasons` は機械で確定できる事実だけを入れる。
`skill-definition-changed`、`distributed-files-changed`、`outside-skill-only`、
`history-diverged`、`history-behind`、`history-truncated`、`patch-truncated`、
`evidence-incomplete` を定義する。
「互換性あり」「安全に更新できる」「記事説明も正しい」は生成しない。
別途、READMEの固定SHAリンク更新とSkill説明確認が必要なことを `summary.md` に案内する。

run内artifact pathはrun rootからの相対pathにし、`..` / symlinkで外へ出るものを作らない。
cached資料の生成時刻と、今回のHEAD/Releaseの観測時刻を混同しない。

### 5.3 AIへ渡す短い出力

human/JSONとも、件数、候補、失敗、result/summaryの絶対pathを返す。
候補はSkill名、old/new短縮SHA、配布ファイル変更数、要確認理由だけにする。
stdoutへRelease本文、commit一覧、SKILL全文、patch、Gitの進捗を流さない。
詳しいstderrもentry資料へ保存し、stdoutのerrorはphase/code/短い説明に絞る。

```text
外部Skill確認: 13件 / HEAD一致10 / 更新候補3 / 未完了0
確認完了。取り込みは未実施。
- igapyon-...: abcdef123456 → 123456abcdef / 配布変更2 / SKILL変更あり
結果: <run>/result.json
要約: <run>/summary.md
```

stdoutは最大16KiB、対象行は最大20行まで。省略件数と完全な資料pathを残す。
JSONは `{schemaVersion, runId, completion, updatesAvailable, allPinsMatch, counts,
candidates, errors, omittedCounts, resultPath, summaryPath}` の要約envelopeであり、
result全体の再出力ではない。formatを変えて再調査する必要をなくす。
短いerror文もUTF-8で最大160bytesとし、必要なら配列の後方要素を減らして16KiBへ収める。
JSONの途中を文字数で切って無効なJSONを返さない。
`metrics.stdoutBytes` は最終出力bytesを数え、JSON envelopeにmetrics自体を含めず循環を避ける。

`summary.md` は全件の状態表、変更対象の資料リンク、要確認理由、次の既存手順への案内を持つ。
更新なしは短く終了し、AIに全件のSKILL本文を読ませない。

## 6. エラー・上限・復帰の仕様

| 状況 | 処理 |
| --- | --- |
| POM/policy不一致、40桁以外、重複、入力なし | 通信前にfailed。入力pathと理由を返す |
| 特定repoのHEAD取得失敗 | そのpinStatusはunknown。他repoは継続、全体partial |
| HEADは違うが旧pin取得失敗 | changedを維持し、差分はunknown/partial。上流が消えた等を推定で埋めない |
| new SHAのSkill/必須SKILL欠落 | changedを維持し、要確認。更新の実行成功とはしない |
| Release/compare API timeout、5xx、JSON/identity不正 | 該当資料をerror、全体partial。他repoのGit処理は継続 |
| 403/429かつrate-limit証拠あり | Retry-After、X-RateLimit-Reset等の既知headerを記録。HTTPキューを止め、未照会をrate-limited扱い。Git調査は継続 |
| 上記以外の403 | access-errorを記録。再認証や匿名以外へのfallbackは行わない |
| 404 | not-foundとしてpartial。成功件数や「更新なし」へ数えない |
| compareの履歴一覧が100件で不足 | history.complete=false、要確認。Git treeのファイル差分は全件で比較する |
| cache破損 | missとして再取得。破損記録を保持し、旧cacheを消さない |
| 調査中の入力変更 | 元の入力hashを残してpartial。最新設定の結果とは扱わない |
| SIGINT等 | worker/childを終了し、作成済み資料を保持。可能ならpartial resultを保存。次回は別run |

自動再試行・長時間sleep・全件再実行・global latest runの自動選択は加えない。
再実行は新しいrunとして行う。固定pair cacheだけが再利用対象である。
ネットワーク要求を1回失敗しただけで、上流に変更がないとは報告しない。

## 7. 変更ファイルと責務

以下は後続実装で新設/変更するファイル。本計画作成ターンでは作らない。

| ファイル | 内容 |
| --- | --- |
| 新規 `scripts/check-bundled-updates.mjs` | CLI parser、workerの開始、最後の入力再確認、run resultと短い出力。importだけで実行しない |
| 新規 `scripts/bundled-updates/config.mjs` | 既存readerを使うinventory、checker固有制約、入力snapshot |
| 新規 `scripts/bundled-updates/git.mjs` | timeout付きasync spawn、固定argv、HEAD解析、bare取得、tree/Skill資料作成 |
| 新規 `scripts/bundled-updates/github.mjs` | 固定GET、HTTP直列化、identity/型/上限検証、rate-limit停止 |
| 新規 `scripts/bundled-updates/cache.mjs` | SHA pair key、manifest/hash照合、一時directoryからのpublish、hit/miss |
| 新規 `scripts/bundled-updates/report.mjs` | status集約、run資料、summary、human/JSON envelope、計測値 |
| `scripts/release-archive-files.mjs` と既存test | 除外path判定の小さな共有exportと既存動作の保持 |
| 新規 `scripts/bundled-updates.test.mjs` | pure関数とfake transport/executorの契約検証 |
| 新規 `scripts/bundled-updates.integration.test.mjs` | ローカルGit originとfake HTTPを使うCLI/coreの統合検証 |
| `package.json` | `check:bundled-updates` と `test:bundled-updates` を追加。依存を増やさない |
| 新規 `.github/workflows/bundled-update-check.yml` | 関連pathのPR/manual、Node22/24、外部通信不要test。GitHub最新版調査をCIでは走らせない |
| `.github/workflows/release-archive.yml` | `npm run test:bundled-updates` のoffline fixture検査を追加 |
| `DEVELOPMENT.md` | 更新確認の前半を1コマンドに置換、調査CLIと後半の取り込み手順、資料の読み方を記載 |
| `TODO.md` と本計画 | 実装・検証の事実を記録。計画と実施結果を区別 |

実装の骨格は `collectBundledUpdates({repoRoot, jobs, executor, transport, clock})` の
非公開module APIとし、テストでexecutor/transport/clockを差し替えられるようにする。
本番CLIから任意endpointや実行コマンドを注入するoptionは公開しない。
coreの依存注入はテスト用であり、AIが任意APIを実行する汎用runnerにしない。

`miku-scm-skills` や配備済み `igapyon-miku-scm` のworkflow manifest/contractsは変更しない。
新collectorはこのrepoの保守CLIであり、既存miku-scm runnerを複製しない。

## 8. Luna向け実装順

| ID | 実施内容 | 次へ進む条件 |
| --- | --- | --- |
| BUC-00 | 現在branch、status、関連差分、適用AGENTS、既存手順を再確認。計画との差をメモ | sourceの場所・既存変更を把握。frozen `-done` branchなら編集しない |
| BUC-01 | config module、CLI option、出力schema、status集約を先に実装 | 設定不正は通信0回、same/changed/unknownとpartialを区別できる |
| BUC-02 | HEAD取得、worker上限、timeout付きGit executor、HEADのfake検査 | 既定branch非固定、観測SHA固定、未知結果を一致扱いしない |
| BUC-03 | 匿名HTTP provider、Release/compare正規化、rate-limit停止 | 固定GETのみ、別host取り違えなし、型不正と未取得を記録 |
| BUC-04 | bare source取得、全tree比較、配布除外共有、SKILL before/after/patch | binary/削除/日本語path/配布外だけの変更を正しく区別 |
| BUC-05 | immutable pair cache、run資料、短いhuman/JSON出力を接続 | 1回のCLIで資料まで揃う。warm時は同pairのfetch/compareを省略 |
| BUC-06 | integration fixtureと計測 | 同じ入力に対する結果、部分失敗、無変更、副作用境界を検証 |
| BUC-07 | DEVELOPMENT、npm、CI、TODOを整合 | AIが短い出力から必要対象だけ読み、既存後半手順へ接続できる |
| BUC-08 | 関連test、限定した実repo smoke、差分確認、実施記録 | 第10節の完了条件を満たし、未確認項目を明記 |

各段階で関連するtestだけを実行し、失敗の原因を直してから次へ進む。
全体が未実装の間に、TODOや本計画のstatusをcompleteへ進めない。

## 9. 検証ケースと実行手順

### 9.1 通信を使わない必須ケース

`node:test` とNode組み込みを用い、通常CIは外部GitHubへ接続しない。
既存のindex-policy integration fixtureの作り方を参考に、`mkdtemp` 配下へ
Git repo・POM・policy・Skillを配置する。実データやinstalled Skillをfixtureにしない。

| 領域 | 必須ケース |
| --- | --- |
| inventory | 現行13件と一致、14件目追加・削除に追従、重複/不完全/policy差/非SHA/式/不正URL/不正Skill名の通信前拒否 |
| CLI | helpの無通信・無書込み、未知/重複option拒否、cwdがrepo外、空白入りpath、human/JSONで同じ分類 |
| HEAD | defaultがdevel等、symbolic HEAD不正、SHA欠落/重複、repo単位の失敗、timeout |
| update | 全件同じ、1件更新、全件更新、版だけ、Skill同一のmerge、配布外READMEだけの変更を候補に残す |
| material | binary追加/変更、削除、mode変更、SKILL欠落、symlink/gitlink、空白/日本語/改行を含むGit pathのNUL解析 |
| exclusions | 除外3要素、似た別名は保持、全repo差分には残るが配布差分から除く。既存collectSourceFilesと同じファイル集合 |
| API | ReleaseとHEADが違う、Releaseなし相当404、403/429、5xx、timeout、巨大body、不正JSON、不正identity/redirect、behind/diverged |
| history | 100件超過でtruncated明示、API filesが300件で切れてもGit tree比較は300件超を全検出 |
| cache | cold/warm、一致対象のfetch省略、pair違い、schema違い、hash破損、途中取得不採用、同名publish競合、毎回HEAD/Releaseを再照会 |
| concurrency | fakeの13repoでpeak worker<=jobs、HTTP peak=1、同repoの重複照会なし、完了順を変えてもentry順不変 |
| report | errorsと候補を併存、unknownをsameにしない、最大stdoutと省略表示、既知partialのexit2、資料path/hashとsummaryの一致 |
| source変化 | 調査中にPOM/policyを変えたらpartial、元のinput hashを維持 |
| 副作用 | 実行前後でtracked bytes/index/HEAD/refが不変、targetと既存workplaceファイルを保持、失敗でも成果物を書き戻さない |

fake transport/executorで接続先とargvを検査する。
実Gitの統合検証では、test側executorが検証済みHTTPS repo URLをfixtureのlocal origin URLへ
対応付け、実際のGitをargv配列で呼ぶ。fetch/tree/binary/差分cacheの挙動を確認する。
本番CLIへ `--api-base` や任意 `file://` の許可を足してfixture対応しない。
CLI orchestrationは `runCli(argv, {collect, stdout, stderr})` としてexportし、
in-processでcollectorを差し替えて終了コード・JSON出力・資料pathを検査する。
entry bootstrapだけが戻り値を `process.exitCode` へ設定する。
child processでもhelpと不正optionのexit/stdoutを検査し、通信しないことを確かめる。

### 9.2 コマンド

後続実装時に追加するnpm script：

```json
{
  "check:bundled-updates": "node scripts/check-bundled-updates.mjs",
  "test:bundled-updates": "node --test scripts/bundled-updates.test.mjs scripts/bundled-updates.integration.test.mjs"
}
```

通常の実装検証は次を行う。

```sh
npm run test:bundled-updates
npm run test:skill-index-policy
npm run test:version-alignment
git diff --check
```

Node22/24のCIでも新規suiteを実行する。今回は保守CLIと配布除外の共有だけなので、
daybook全suite、miku-scm自体のsuite、`mvn clean package`、上流13repoのtestを
毎回の検証に加えない。新たな変更・失敗が配布に影響すると分かった場合だけ検証範囲を広げる。

実装完了時に対象repoで調査CLIを1回実行し、続けて同条件で1回だけwarm実行する。
これは読み取りsmokeであり、pin/source/版を更新しない。両runのexact pathを記録する。
network権限が必要なら環境の承認手続に従う。失敗時は原因と未確認項目を残し、
fixture成功を実GitHub確認の成功として扱わない。再試行は原因を解消した場合だけにする。

### 9.3 効果の計測

- cold/warmの経過ms、Git HEAD/fetch回数、HTTP回数、cache hit、stdout bytesを保存する。
- 同じfixtureのjobs1とjobs3を、同じdelay・別cache状態で比較する。結果は時刻とmetrics以外で一致すること。
- 同じ旧/new SHA pairのwarm実行でGit fetchとcompare HTTPが0回になることをassertする。
  HEADとReleaseは再照会されることもassertする。
- 実時間の「何%高速」は外部通信に左右されるのでCIの固定合格率にしない。観測値を報告する。
- 標準出力と保存した全資料のbyte量を比較する。byte数をtoken数とは呼ばない。
  token削減率はモデル・tokenizerを使った測定がない限り主張しない。
- 期待する対話は「collectorを1回起動→要約を読む→変更対象の必要資料だけ読む」。
  1repoごとの起動/応答読込みや、全件SKILL全文のモデル投入を標準手順から外す。

## 10. 完了条件とハンドオフ

- [ ] `node scripts/check-bundled-updates.mjs --repo .` の1回で、全宣言対象の調査・資料保存・短い要約が返る。
- [ ] 設定の二重管理を作らず、最新HEADとReleaseを区別し、SHAだけの更新も候補になる。
- [ ] 不明・部分失敗・差分未取得を更新なしと報告しない。
- [ ] 配布ファイルの完全な差分はGit treeで検証し、APIのfiles上限で欠落しない。
- [ ] cold/warmで固定資料を再利用し、mutableなHEAD/Releaseは毎回確認する。
- [ ] 追加runtime依存なし、Node22/24、fake/local Git suiteが成功する。
- [ ] tracker/index/ref、POM/policy、target、既存ローカル資料をCLIが書き換えない。
- [ ] AIが標準出力の要約から必要な変更対象だけ確認する手順をDEVELOPMENTに記載する。
- [ ] 実repo smokeと効果計測の成否・run path・制約を記録する。

Lunaの完了報告には、変更ファイル、成功した検証、未確認事項、cold/warmの数値と資料pathを含める。
調査結果として得た更新候補を、このCLIの実装作業に混ぜて取り込まない。

実装開始時の依頼例：

> `docs/plans/bundled-skill-update-check-node-luna-implementation.md` の
> BUC-00〜08を実装してください。初回範囲は読み取りcollectorです。
> 実行結果と制約を記録し、同梱pinの更新は別作業として残してください。

## 11. 参照した外部仕様

2026-11-13に公式資料を確認した。将来の実装で仕様変更が疑われる場合だけ再確認する。

- [Git ls-remote](https://git-scm.com/docs/git-ls-remote)：symref HEADとOIDの取得。
- [GitHub Release API](https://docs.github.com/en/rest/releases/releases#get-the-latest-release)：latestは公開full Releaseの定義であり、既定ブランチHEADとは別。
- [GitHub Compare API](https://docs.github.com/en/rest/commits/commits#compare-two-commits)：commit一覧のページングと、files一覧の最大300件という制約。完全な配布ファイル比較に使わない理由。
- [GitHub API version](https://docs.github.com/en/rest/about-the-rest-api/api-versions)：固定headerの `2026-03-10` を採用。
- [GitHub API rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)：匿名枠を考慮してHTTPを直列化し、rate-limit時は無理に再試行しない。

## 12. 実施記録

自己レビュー5件の修正は
[Luna向け対応計画](bundled-update-check-self-review-fixes-luna-implementation.md)を優先する。
この対応計画は修正内容と回帰検証を具体化したものであり、BUC残件全体の完了を表さない。

2026-11-13、後続の実装指示を受けてBUC-00〜01相当を開始。

- `scripts/check-bundled-updates.mjs` にCLI、POM/policy reader接続、既定HEAD・Release・compare取得、
  Git treeの配布Skill差分、SKILL前後資料、短いhuman/JSON summaryを実装。
- 自己レビュー対応でconfig snapshot/hash照合、stream byte上限、Release/compare検証、段階別partial分類、
  Git tree material検査、共有除外規則、inputs/result artifactと回帰fixtureを追加。
- `package.json` にcheck/test scriptを追加。
- 成功: `node --check scripts/check-bundled-updates.mjs`、`npm run test:bundled-updates` (8/8)、
  `npm run test:skill-index-policy` (77/77)、`npm run test:version-alignment` (5/5)、`git diff --check`。
- 未完了: BUC-02〜08全体の完了、特にpair cache、保存形式の全契約、完全fixture/runtime検証、
  CI/DEVELOPMENT接続、実repo smokeと計測。
- この記録更新時点では実GitHub照会・pin更新・Maven packageは未実施。
