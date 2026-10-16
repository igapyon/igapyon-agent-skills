# 配布ZIPのsource照合・参照欠落検出の補修計画

作成日：2026-10-11。状態：root repoで実装済み（2026-10-11）。想定実装モデル：Luna。

この文書は実装前の詳細計画と、実装後の結果を記録する。利用者の後続指示によりZIP-00からZIP-05をroot repoで実施した。変更はローカルworktreeにあり、commit/push、Release、配備は行っていない。

親計画は [index.json任意化の移行計画](index-json-policy-migration.md)。今回の補修対象は、再自己レビューで見つかったroot内部スキルの配布ZIP欠落検査である。作業状態はrootのTODO.mdとHANDOFF.mdに記録する。

## 1. 問題と目標

### 1.1 再自己レビューで確認した事実

- `scripts/check-release-archive.mjs`の`validateSkill()`は、index未採用スキルについてSKILL.mdとindexの採用状態を確認するが、参照・画像などの配布ファイルの欠落を検査しない。
- 実ZIPの一時コピーから`skills/igapyon-mikuku-agent/references/VERSION.md`を除いた場合も、代表画像`assets/mikuku/mikuku01.png`を除いた場合も、現行checkerはexit 0で成功した。
- 旧checkerと旧みくくindexを使った比較用fixtureでは、完全なZIPがexit 0、VERSION.mdを除いたZIPがexit 1になった。参照ファイルの欠落検出が今回のindex削除で弱まったことを確認した。
- 追加済みの`skill-reference-routing.test.mjs`はsourceを一時directoryへコピーして検査する。ZIPでの欠落を検査するものではなく、現行58件が成功しても上記問題は残る。
- 現物の配布ZIPにはVERSION.mdと代表画像が存在する。今回の問題は、欠落した配布物を検査が受け入れることにある。

### 1.2 この補修の完了状態

1. indexの有無にかかわらず、root内部スキルの配布対象ファイルをsourceから決め、展開したZIPと照合する。
2. 参照、画像、helper、JSON、runtimeなどがZIPから抜けた場合に失敗し、skill名と相対pathを表示する。
3. ファイル名だけでなく内容の一致も確認し、空ファイルや古い内容への置換を検出する。現行assemblyはファイル内容を変換しないため、バイト列の一致を要求できる。
4. 既存の14スキルの代表参照経路を、ZIPから展開した実ファイルでも確認する。
5. index未採用スキルがindexなしで合格し、採用・legacy indexの既存検査も機能する。

## 2. 対象と境界

### 2.1 実装する範囲

- 対象repo：`igapyon-agent-skills`のみ。
- source照合対象：root `skills/`にある内部スキル全件。現在は15件で、暫定保持のQiitaも含む。件数はコードに固定せず、既存の内部スキル列挙結果を使う。
- 参照経路の確認対象：既存`skill-reference-routing.test.mjs`の14スキルと代表path。これは選択した参照への静的な到達確認である。
- 起動入口：既存の`node scripts/check-release-archive.mjs <archive.zip>`を維持する。
- CI入口：既存の`npm run test:skill-index-policy`と、package後のarchive checkerを使う。

### 2.2 別工程として残すもの

- 外部10repoのsource修正、公開、新ref発行、root pin更新は親計画IDX-06の工程。今回、sibling repoを編集しない。
- 外部10スキルの名前・lock・index採用状態・採用indexのJSON/path検査は現行処理を維持する。今回の新しいsource全ファイル照合は内部スキルに限定する。
- 外部の新ref統合では、その固定refの独立したsourceを使う配布照合も別途確認する。今回の成功を「外部を含む全25スキルの全ファイルをsource照合した」と報告しない。
- Qiitaの保持価値の判断とLunaの代表作業比較は未完了のまま。静的・配布検査でその評価を完了扱いにしない。
- スキル配備、version変更、commit/push、PR、tag、Release操作はこの補修の実装範囲に含めない。

## 3. 配布対象を決める規則

### 3.1 正本

内部スキルの期待値は、現在のworktreeの`skills/<skill>/`から取得する。stagingやZIPを期待値の生成元にしない。stagingとZIPの両方から同じ参照が抜けても、sourceとの差で拒否する。

checkerは現在のpom・policy・sourceに対応するZIPを検査する。過去版のZIPを任意の現在sourceで検査する用途は対象外である。sourceがpackage後に変更された場合は不一致として失敗し、そのsourceからpackageを作り直す。

### 3.2 sourceから除くpath

既存の`prepare-release-staging.sh`と`src/assembly/release.xml`の規則に合わせ、pathの構成要素が次のいずれかであるものを再帰的に除外する。

- `.DS_Store`
- `node_modules`
- `.git`

名前の完全一致で判定する。`.gitignore`、`node_modules-guide.md`、`my.git`などまで除外しない。除外directoryは降りない。

これ以外の拡張子やdirectoryを新たに除外しない。内部スキルのtests、scripts、assets、references、templates、runtime、libなど、現行配布規則に含まれるファイルは照合する。空directoryの有無は比較しない。

### 3.3 型と内容

- スキルrootは通常のdirectoryであることを確認する。
- directoryを再帰し、通常ファイルを比較対象とする。
- sourceの配布対象範囲にsymlinkまたは特殊ファイルがある場合は、pathを示して失敗する。外部を辿ったり無言でskipしたりしない。計画時点の内部配布対象466通常ファイルにはsymlinkがなかった。
- 展開先でも`lstatSync()`で確認し、symlinkを通常ファイルとして扱わない。
- pathはスキルrootからの相対pathを`/`区切りに正規化する。比較用に絶対pathを保存しない。
- source側と展開先側でファイル集合を比較する。展開先の一覧から除外規則を適用して余分なファイルを隠さない。既存のarchive禁止path検査も維持する。
- 集合が一致したファイルについてsizeとSHA-256を比較する。hashは各ファイルの生バイト列から計算し、文字コード・改行・JSONの再整形で正規化しない。
- 期待するpath/hashはchecker実行中のメモリだけで保持する。新しいindex.json、別名の全ファイルJSON、手書きの全件一覧、配布manifestは追加しない。
- indexの採用判定は既存policyを使う。照合処理が独自にindexを生成・除外したり、採用状態を推測したりしない。

## 4. 変更するファイル

| ファイル | 変更内容 |
| --- | --- |
| 新規`scripts/release-archive-files.mjs` | sourceと展開先のファイル集合・型・内容を照合する独立したhelper module。CLI起動・package生成を持たせない。 |
| `scripts/check-release-archive.mjs` | 内部スキルについて上記helperと展開先の代表参照確認を呼ぶ。既存のCLI・metadata・lock・index検査を維持。 |
| 新規`scripts/skill-reference-routes.mjs` | 現在test内にある14件のroutesと`reachableFiles()`を共通moduleへ移す。代表参照のassert関数をexport。 |
| `scripts/skill-reference-routing.test.mjs` | 共通moduleをimport。source単独配置の既存14件とstarter検査を維持。 |
| 新規`scripts/release-archive-files.test.mjs` | source除外規則、ファイル集合、型、内容比較のunit tests。 |
| `scripts/skill-index-policy.integration.test.mjs` | 新moduleをfixtureへコピー。source fixtureを実際の配布内容に合わせ、参照・画像・helper欠落などの実ZIP異常系を追加。 |
| `package.json` | 新unit testを既存`test:skill-index-policy`へ追加。 |
| `README.md`・`docs/maintenance/index-json-migration-inventory.md` | 実装後に、内部source照合・ZIP参照確認の範囲と結果を記述。 |
| `TODO.md`・`HANDOFF.md` | 実装後に各段階の結果と残作業を更新。 |

既存Release workflowは既にsuiteとpackage後checkerを呼ぶため、配線変更は不要。実装時にその呼出順を確認する。スキル本文やmiku-softの規約、assemblyの配布範囲を変更する必要はない。

## 5. helper moduleの実装契約

### 5.1 `release-archive-files.mjs`

exportする関数名と引数を次で固定する。

```js
collectSourceFiles(sourceSkillDir)
collectArchiveFiles(archiveSkillDir)
assertSkillFilesMatchSource({ skillName, sourceSkillDir, archiveSkillDir })
```

`collectSourceFiles()`と`collectArchiveFiles()`は、相対pathをkey、`{ size, sha256 }`をvalueとするMapを返す。walk順とエラー表示順を安定させるため、directory entriesとpathをsortする。

- source関数だけが第3.2節の除外を行う。
- archive関数は全entryを列挙する。
- `fs.lstatSync()`で型を確認してから再帰・読取する。
- ファイルごとに`fs.readFileSync()`と`crypto.createHash("sha256")`を使う。全スキルのファイル内容を同時にメモリへ保持しない。
- Map生成前にrootの存在と型を確認する。エラーを空Mapへ置換しない。

`assertSkillFilesMatchSource()`の処理順：

1. sourceのMapを作る。
2. 展開先のMapを作る。
3. sourceにだけあるpathを`missing`、展開先にだけあるpathを`unexpected`として求める。
4. 集合の差があれば、両方の差をsortして表示しthrowする。差がある状態で内容比較へ進まない。
5. 同じpathのsize/hashを比較し、異なるpathを`changed`としてまとめてthrowする。
6. 成功時は`{ fileCount: expected.size }`を返す。

エラー本文の例：

```text
igapyon-mikuku-agent: release files differ from source
missing: references/VERSION.md
unexpected: references/old-version.md
```

```text
igapyon-mikuku-agent: release file content differs from source
changed: assets/mikuku/mikuku01.png
```

型不正は`not a regular file`または`not a regular directory`と相対pathを含める。mainの既存catchでexit 1になる。新しい成功・失敗のexit codeを増やさない。

### 5.2 `skill-reference-routes.mjs`

exportするもの：

```js
representativeRoutes
reachableFiles(skillDir)
assertRepresentativeRoutes({ skillName, skillDir })
```

- `representativeRoutes`は既存testのroutesをそのまま移す。14件の対象・代表pathをこの補修の都合で削減しない。
- `reachableFiles()`は現行のMarkdownリンクとbacktick内pathを辿る実装を移す。visited集合による循環回避、skill外を辿らない処理、root indexを入口にしない処理を維持する。
- `assertRepresentativeRoutes()`は該当skillの代表pathがSKILL.mdから到達可能で、通常ファイルとして存在し、sizeが0より大きいことを確認する。
- 失敗時はskill名・代表path・理由を表示する。
- 戻り値は`{ checked: true, targetCount }`。代表contractのないskillは`{ checked: false, targetCount: 0 }`。Qiitaや汎用test fixtureへ存在しないcontractを要求しない。
- 名前に対応するcontractがある場合に、indexの有無を理由にその参照確認をskipしない。
- module読込だけでテスト、CLI、探索が走らないようにする。`node:test`やprojectRootをmoduleに持ち込まない。

この共通moduleは選択した経路を確認するもの。全Markdownリンクの完全監査や、モデルがその資料を適切に選ぶことの証明とは説明しない。

## 6. archive checkerへの組込み順

既存`validateArchive()`の安全なZIP path・重複・禁止物・skill名集合・root必須ファイル・lock検査を維持する。追加処理は、既存のtempDirへ展開したファイルを使う。

各skillのloopで次の順に処理する。

1. 現行`validateSkill()`でSKILL.md、name、index採用状態、採用indexのJSON/pathを確認。
2. `internalNames.has(skillName)`のときだけ、source `projectRoot/skills/<skillName>`と展開先`archiveRoot/skills/<skillName>`を`assertSkillFilesMatchSource()`へ渡す。
3. 同じ内部スキルの展開先を`assertRepresentativeRoutes()`へ渡す。
4. すべて成功した後だけ、現行のarchive成功メッセージを表示する。
5. 既存finallyでtempDirを削除する。途中でthrowした場合も残さない。

既存のindex異常系は、source内容不一致より前に現行validationで拒否する。JSON破損・path逸脱・採用index欠落を汎用の内容不一致エラーへ置き換えない。

成功メッセージの`internal=..., external=..., total=...`は維持する。追加で`source-checked=<内部件数>, representative-routes=<確認skill件数>`を表示して確認範囲を明示する。現状の実packageなら15件と14件になるが、コードにその数字を固定しない。

checkerからMaven、generator、Git clone、外部APIを呼ばない。ZIPが不一致なら失敗し、自動補完や再生成で合格させない。

## 7. fixtureの修正とテスト要件

### 7.1 既存integration fixtureの整合

現行fixtureはsourceにSKILL.mdしか作らず、ZIPへ`references/workflow.md`と採用indexを追加している。厳密な照合を追加すると正常ケースも不一致になるため、先にfixtureを整える。

1. `fixture()`で、内部各skillのsourceにSKILL.mdと`references/workflow.md`を作る。ZIPへ入れるdataと同じ値を使う。
2. 採用内部skillのsourceにはindexも作る。既存index JSONの形を維持する。
3. helper/画像の異常系用に、内部sourceに小さいmjsファイルとバイナリassetを追加する。PNGテストdataは非空のBufferでよい。画像の視覚品質の検査はこのfixtureでは行わない。
4. `entriesFor()`で内部sourceの用意したdataに対応するZIP entriesを作る。index adoptionとexternal remove/retain/legacyの分岐は維持する。
5. 新helperの実装時にfixtureへコピーするscripts一覧を更新する。ZIP-02で`release-archive-files.mjs`、ZIP-03で`skill-reference-routes.mjs`を追加する。ZIP-00では未作成moduleをコピーしない。
6. generatorゼロ・複数、policy拒否、driftのtestsがfixture修正で変わる場合は、sourceの作成条件を調整する。失敗assertを消して通す対応はしない。
7. 故障はtemp fixtureだけへ入れる。現実の`skills/`を削除・改変して再現しない。

### 7.2 unit testの最低要件

| ケース | 期待結果 |
| --- | --- |
| 同じsource/展開先 | 成功、正しいfileCount |
| 除外名がroot・深い階層にある | sourceから除外し、そのdirectoryへ降りない |
| `.gitignore`等の似た名前 | 比較対象に残る |
| Markdown以外のmjs/json/png/jar相当バイナリ | 比較対象に残る |
| 空directoryだけの差 | 合格 |
| 展開先の参照欠落 | missingで失敗 |
| 展開先への余分なファイル追加 | unexpectedで失敗 |
| 同じpath・sizeで内容が異なる | SHA-256不一致で失敗 |
| 内容が空へ変わる | 内容不一致で失敗 |
| 通常ファイルがdirectoryまたはsymlinkへ変わる | 集合または型不正で失敗 |
| sourceの配布対象symlink | 追跡せず失敗 |
| 展開先の除外名ファイル | actual一覧で隠さず検出 |

### 7.3 実ZIP integration testの最低要件

各故障caseはcheckerをchild processで起動し、exit 1と対象skill/pathをassertする。正常caseはexit 0と確認件数をassertする。既存38件の意味を維持する。

| ケース | 期待結果 |
| --- | --- |
| indexなし内部skillを含む完全ZIP | 合格、indexは新設されない |
| 採用indexがある内部skillの完全ZIP | 合格、index validationも実行される |
| indexなしskillの参照だけをZIPから除く | missingで失敗 |
| indexなしskillの画像だけをZIPから除く | missingで失敗 |
| helperだけをZIPから除く | missingで失敗 |
| stageとZIPの両方から同じ参照を除き、sourceには残す | missingで失敗。stageを期待値に使わないことを確認 |
| ZIP内の参照を同サイズの異なる内容へ置換 | changedで失敗 |
| 余分な内部skillファイルをZIPへ追加 | unexpectedで失敗 |
| 同じpathをdirectoryへ置換 | missingまたは型不正で失敗 |
| indexなしskillの未索引assetを外向きsymlinkへ置換 | 型不正で失敗 |
| `.DS_Store`等の禁止物がZIPへ入る | 現行の禁止物検査で失敗 |
| 採用index欠落・不正JSON・path逸脱・lock不一致 | 既存の対応するエラーで失敗 |

stage欠落caseではtempの`target/release-staging/skills/`へ不完全なstageも作り、sourceは完全なままにする。checkerへの引数は実ZIP一つだけとし、期待値にstageを渡さない。

### 7.4 みくくの代表経路fixture

汎用fixtureと別に、内部skill名`igapyon-mikuku-agent`の小さいfixtureを用意する。sourceとZIPの両方へ以下を置く。

- SKILL.md：下記3pathへの直接リンクを持つ最小本文。
- `references/VERSION.md`：非空のversion文字列。
- `assets/mikuku/mikuku01.png`：非空のバイナリ。
- `references/article-writing.md`：非空の本文。

検査すること：

1. 完全fixtureはsource照合と展開先の代表参照確認がともに成功する。
2. ZIPからVERSION.mdだけを除くと失敗する。
3. ZIPから代表画像だけを除くと失敗する。
4. sourceとZIPの両方からVERSION.mdを除くと、ファイル集合は一致していても代表参照contractで失敗する。
5. sourceとZIPの両方でSKILL.mdからversionへのリンクを外すと、ファイルは存在していても代表参照到達確認で失敗する。

第4・5caseは、source照合だけでは確認できない選択済みの必須経路を確認する。実スキルをfixtureに丸ごとコピーする必要はない。

## 8. Luna向け実装順序（実施済み）

以下の順序で実装した。各段階の完了状態はTODOの対応taskへ記録した。

### ZIP-00：基準確認とfixture準備

前提：利用者による実装開始指示（受領済み）。

1. README、TODO/HANDOFFの今回の節、この文書、第4節の対象ファイルを読む。
2. `git status --short`で先行移行の未commit差分を確認し、その差分を保持する。
3. 既存suiteを実行し、現在の58件の結果を基準として記録する。現行実ZIPを再生成する作業はまだ必要ない。
4. 第7.1節に従ってfixtureのsourceとZIPを揃える。新検査をまだ入れない状態で既存testsが成功することを確認する。
5. 第7.3節の「indexなし参照欠落」「画像欠落」を追加し、現行checkerでは失敗を見逃すためtestが失敗することを確認する。

完了条件：既存正常caseを壊さず、新しい2件の失敗が今回の問題を再現する。

### ZIP-01：source照合helper

前提：ZIP-00。

1. 第5.1節のmoduleを実装する。
2. 第7.2節のunit testsを追加する。
3. 新unit testだけを実行し、missing・unexpected・changed・型不正の検出を確認する。

完了条件：一覧も内容もsource由来の独立した期待値で検査でき、indexの生成処理がない。

### ZIP-02：checkerへの組込み

前提：ZIP-01。

1. 既存checkerへsource照合を追加する。対象分岐とsource/展開先pathは第6節に従う。この段階では第6節のstep 2だけを追加し、step 3の参照moduleのimport・呼出しはZIP-03で行う。fixtureのコピー一覧にsource照合moduleを追加する。
2. ZIP-00の2件を合格させる。故障ZIPに対するcheckerのexitが1になったことをassertする。
3. 第7.3節の残りの故障casesを追加する。
4. 既存index異常系のexit・エラー分類が保持されていることを確認する。

完了条件：内部全skillに照合が入り、stageとZIPの同時欠落も拒否する。

### ZIP-03：展開先の代表参照確認

前提：ZIP-02。

1. 第5.2節に従いroutesと探索関数を共通化する。
2. 既存source単独配置14件とstarterを共通化後も通す。starterの子testから`NODE_TEST_CONTEXT`を除く処理と、実際に2件を実行したassertを保持する。
3. archive checkerから展開先を使って代表参照確認を呼ぶ。fixtureのコピー一覧に参照moduleを追加する。
4. 第7.4節の5casesを追加し、到達性が実ファイル存在とは別に確認されることを検査する。

完了条件：sourceだけを読む検査と、ZIP展開先を読む検査が両方存在する。

### ZIP-04：suite・CI・実package確認

前提：ZIP-03。

1. `package.json`の既存suiteへ新unit testを追加する。
2. Release workflowの既存suite→Maven package→archive checker→uploadの順を確認する。uploadの前で不一致を拒否できる構成を維持する。
3. 第9節の正常検証と実ZIP故障再現を実施する。
4. 実ZIPに内部15・外部10があり、内部source照合15件・代表経路14件の確認が成功したことを記録する。

完了条件：既存入口で新検査が実行され、実際のpackageでもレビュー再現を拒否する。

### ZIP-05：説明・進捗の更新

前提：ZIP-04。

1. READMEのRelease説明へ、内部ファイルのsource照合と展開先参照確認を短く追記する。
2. maintenance inventoryへ今回の補修・実行command・結果・外部照合の境界を記録する。
3. TODO/HANDOFFへZIP-00〜05の完了、変更path、残作業を記録する。
4. 第10節の完了条件を一つずつ確認する。

完了条件：テスト件数や対象範囲が実際の結果に一致し、親計画の未完を取り消していない。

## 9. 実施した検証（2026-10-11）

### 9.1 正常検証

```sh
npm run test:skill-index-policy
mvn package
node scripts/check-release-archive.mjs target/igapyon-agent-skills-1.20261006.1.zip
git diff --check
```

`mvn clean package`の初回実行は外部依存取得のネットワークtimeoutで失敗した。clean後の再実行は、許可されたネットワーク実行で`mvn package`を行い成功した。実行suiteは77/77件pass。複数ZIPをglobで一つのcheckerへ渡していない。

### 9.2 実ZIPのレビュー再現

小さいfixtureの検査とは別に、実packageから作った一時コピーでVERSION.md欠落、代表画像欠落、参照内容変更を検査した。いずれもcheckerはexit 1となり、相対pathを報告した。sourceと元ZIPは変更せず、一時コピーを削除した。

削除するentryは、現行版ではそれぞれ次になる。

```text
igapyon-agent-skills-1.20261006.1/skills/igapyon-mikuku-agent/references/VERSION.md
igapyon-agent-skills-1.20261006.1/skills/igapyon-mikuku-agent/assets/mikuku/mikuku01.png
```

内容変更では`references/article-writing.md`のバイト列を変更し、`changed`として拒否されることを確認した。故障ZIPのexit 1を検出成功として記録した。

## 10. 完了チェックリストと報告

- [x] 内部スキル全件の期待集合がsourceから作られ、stage/ZIPから作られていない。
- [x] 現行の配布除外3種と一致し、実装の都合で除外が増えていない。
- [x] missing・unexpected・内容不一致・通常ファイル型の検査が機能する。
- [x] indexなしskillの参照・画像・helper欠落を、実ZIP fixtureで拒否する。
- [x] stage/ZIPで同じ参照が欠けても拒否する。
- [x] 採用indexの既存validationと外部lock検査が維持されている。
- [x] 共通化後もsource単独14件・starterの検査が実際に動く。
- [x] ZIP展開先の代表経路確認が動き、source/ZIP両方の必須path欠落も検出する。
- [x] 実packageが合格し、VERSION.md・代表画像を抜いた実ZIPコピーは失敗する。
- [x] index.jsonや代わりの全件一覧生成物を追加していない。
- [x] source・素材・製品runtime・version・既存利用者差分を保っている。
- [x] 実行した件数・command・結果、内部照合と外部既存検査の範囲が報告されている。
- [x] Qiita最終判断、Luna比較、新ref統合は別の未完了項目として残している。

最終報告は、今回の補修結果、正常/故障の実ZIP結果、suite結果、変更repo、外部とモデル評価の残作業を短く述べる。この補修が終わっても、親計画全体を完了扱いにしない。

## 11. 実装時に使ったLuna向け指示のひな型

> docs/plans/release-archive-source-verification.mdをZIP-00から順番に実装する。先行のindex任意化差分を保持し、root repoだけを編集する。内部スキルは現在sourceの配布対象ファイルから期待値を作り、実ZIPの展開先と集合・型・生バイト内容を照合する。staging/ZIPを期待値に使わない。既存の14代表経路を共通化して展開先でも確認する。fixtureのsourceをZIPと整合させたうえで、参照・画像・helper欠落、stage/ZIP同時欠落、内容差、代表経路欠落の異常系を追加する。既存index/lock/ZIP安全性検査を維持する。suiteと実package、実ZIPの故障コピーで確認し、TODO/HANDOFFへ実測結果を記録する。外部新ref統合、Qiita判断、モデル評価、公開・配備は別工程として残す。
