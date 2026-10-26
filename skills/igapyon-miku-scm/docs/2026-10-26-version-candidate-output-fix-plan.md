# バージョン候補のhuman output表示修正計画

状態: 実装済み。2026-10-26にLunaがsourceへ反映し、検証済み。

## 目的と原因

`version.increment.validate`の構造化結果には正しい候補があるが、human outputが
`Candidate (version): none`と表示する問題を修正する。

原因は`miku-scm-human-output.mjs`の`appendVersion()`が`proposed`を
`{ path, value }`形式の配列として解釈すること。実際の
`miku-scm-version.mjs`の結果schema `miku-scm.version/v1`は次の形式である。

```js
{
  authoritative: [{ path: "pom.xml", value: "1.20261026.4", /* ... */ }],
  coupled: [{ path: "skills/igapyon-mikuku-agent/references/VERSION.md", value: "20261026d", /* ... */ }],
  proposed: {
    authoritative: "1.20261026.5",
    coupled: "20261026e",
    date: "20261026",
    sequence: 5
  }
}
```

`miku-date-coupled`、`content-date`、`semver`はすべて同じ`proposed`オブジェクトを
返す。`content-date`と`semver`は`proposed.coupled`が`null`。
`version.status`は`proposed: null`を返す。
前回レビューにあった「SemVerは文字列を返す」という説明は誤りであり、
本計画ではソースの実際の共通形式を正とする。

## 実装開始時の状態

計画作成時のbranchは`devel-tiga1026wce`、HEADは
`dc4c5b39a527188877ca7a94f8dbdc0e668453d9`。
先行依頼の版数更新が次の4ファイルに未ステージで存在する。

- `pom.xml`: `1.20261026.5`
- `skills/igapyon-mikuku-agent/references/VERSION.md`: `20261026e`
- `skills/igapyon-miku-scm/scripts/miku-scm-run.mjs`: `PRODUCT_VERSION = "1.20261026.5"`
- `skills/igapyon-github-writer/scripts/github-writer-workflow-manifest.mjs`: 同じ`PRODUCT_VERSION`

Lunaは開始時に`git status -sb`を確認し、この4ファイルの先行変更を保持する。
本修正で追加の版数インクリメントは行わない。文中の`.4`→`.5`は不具合が実際に
確認された入力例であり、現在のrepoを再度インクリメントする指示ではない。

## 決定する表示仕様

既存のheader、Repository、Branch、Policy、Current value、Mutation invoked等の
表示を保ち、候補部分だけを次の規則へ置き換える。

1. `proposed.authoritative`が空でない文字列なら、`result.authoritative`の各sourceに
   `Candidate (<source.path>): <proposed.authoritative>`を表示する。
2. `proposed.coupled`が空でない文字列なら、`result.coupled`の各sourceに
   `Candidate (<source.path>): <proposed.coupled>`を表示する。
3. 順序はauthoritative sources、coupled sourcesの順。各配列内の順序を保持する。
4. `proposed`が`null`または未定義なら候補行を表示しない。
5. `date`と`sequence`は計算用metadataなので候補行にしない。
6. 表示には既存の`displayValue()`を使用する。候補値がないときに`none`を作らない。

上の入力例から表示すべき候補部分は正確に次の2行。

```text
Candidate (pom.xml): 1.20261026.5
Candidate (skills/igapyon-mikuku-agent/references/VERSION.md): 20261026e
```

表示schemaを`miku-scm.human-output/v14`から`miku-scm.human-output/v15`へ進める。
構造化結果のschema、版数計算、workflowの引数・認可・Git操作は変更しない。
現在のproducerが返さない`proposed`配列や文字列に対する互換処理は追加しない。

## 変更ファイルと具体的な作業

### 1. 回帰テストを先に用意する

`tests/miku-scm-human-output.test.mjs`に、実際の`proposed`形式を使う表示テストを追加する。
呼び出し先はexport済みの`renderHumanOutput()`とし、非公開の`appendVersion()`を
exportする必要はない。validationの共通入力は次でよい。

```js
{
  workflow: "version.increment.validate",
  status: "success",
  approvalGate: "preflight",
  delegateStatus: "validated",
  mutationInvoked: false,
  result: { /* 下表のsourceとproposed、およびpolicy等 */ }
}
```

候補行を`output.split("\n").filter(line => line.startsWith("Candidate ("))`で抽出し、
下表の期待配列と`assert.deepEqual()`で比較する。これにより欠落・余分な候補・順序を
同時に検証できる。少なくとも通常のmiku-dateケースではCurrent value行も維持されることを確認する。

| ケース | sourceとproposed | 期待する候補行 |
| --- | --- | --- |
| miku-date-coupled | authoritative=`pom.xml`、coupled=`VERSION.md`、候補=`1.20261026.5` / `20261026e` | `Candidate (pom.xml): 1.20261026.5`、`Candidate (VERSION.md): 20261026e` |
| content-date | authoritative=`VERSION.md`、候補=`20261026aa`、coupled=null | `Candidate (VERSION.md): 20261026aa`の1行 |
| semver | authoritative=`package.json`、候補=`1.3.0`、coupled=null | `Candidate (package.json): 1.3.0`の1行 |
| coupledが2ファイル | authoritative=`pom.xml`、coupled=`VERSION.md`、`docs/VERSION.md`、候補は同じ | authoritativeの1行に続き、coupledの2行を入力順で表示 |
| version.status | workflow=`version.status`、delegateStatus=`inspected`、proposed=null | 候補行0件、Current value行は存在 |

テストfixtureを表示側に都合のよい`{path, value}`形式へ変換しない。
少なくとも1件でrender前後のresultをdeepEqual比較し、構造化結果を変更しないことも確認する。
この段階では既存実装に対して候補行の検証が失敗することを確認する。

### 2. `appendVersion()`を修正する

`scripts/miku-scm-human-output.mjs`の既存`if (result.proposed)`ブロックを置換する。
実装の流れは次のとおり。

```text
proposed = result.proposed
proposedがnull/未定義なら候補処理終了

proposed.authoritativeが空でないstringなら:
  result.authoritativeが配列の場合だけ、その各sourceについて
    Candidate (<displayValue(source.path, "version")>): <displayValue(proposed.authoritative)>
    をlinesへ追加

proposed.coupledが空でないstringなら:
  result.coupledが配列の場合だけ、その各sourceについて
    Candidate (<displayValue(source.path, "coupled version")>): <displayValue(proposed.coupled)>
    をlinesへ追加
```

既存のCurrent valueループと`appendGeneric()`はそのまま使う。
policy名による分岐や、候補を再計算する処理は不要。

同ファイル先頭の`HUMAN_OUTPUT_SCHEMA_VERSION`を`v15`へ更新し、
`tests/miku-scm-human-output.test.mjs`と`tests/miku-scm-benchmark.test.mjs`の
schema完全一致の期待値も`v15`へ更新する。

### 3. 実producerとの接続を1件確認する

`tests/miku-scm-version.test.mjs`へ`renderHumanOutput`のimportを追加する。
既存test `miku date validation checks coupling and computes the same-day candidate`で
得られる実際の`inspectVersion()`結果を、加工せず`renderHumanOutput()`のresultへ渡す。
期待する候補行は既存fixtureに合わせて次の2行。

```text
Candidate (pom.xml): 1.20260727.5
Candidate (VERSION.md): 20260727e
```

既存の固定日時・一時ファイル・collectSnapshot injectionをそのまま利用できる。
この接続確認に新しいGit repositoryやremoteは不要。
`scripts/miku-scm-version.mjs`の計算結果・schemaは変更しない。

### 4. 生成契約を更新する

human-outputモジュール全体の内容をruntime fingerprintへ含めるworkflowがあるため、
表示修正後にgeneratorを実行する。

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-workflow-contracts.mjs
node skills/igapyon-miku-scm/scripts/miku-scm-workflow-contracts.mjs --check
```

更新される生成ファイルは次の2つ。手編集しない。

- `scripts/miku-scm-workflow-contract-lock.mjs`
- `references/workflow-contracts.md`

本計画どおりの変更なら、hash更新が必要なworkflowは
`github.issue.handoff.list`、`github.issue.handoff.review`、
`github.issue.handoff.apply`、`github.issue.handoff.batch.apply`の4件。
共有ファイル全体をhashする現行設計による更新であり、Issue操作の意味は変わらない。
`ISSUE_APPROVAL_CONTRACT_VERSION`、manifest/CLI、version helperには変更を加えない。
別のworkflowのhashも変わった場合は、先行変更によるものかをdiffで確認する。

## 検証コマンドと完了条件

実装時は上記のテスト追加→失敗確認→表示修正→生成物更新の順で進め、
最後に対象の検証を行う。計画作成時にはこれらを実行していない。

```sh
node --test skills/igapyon-miku-scm/tests/miku-scm-human-output.test.mjs skills/igapyon-miku-scm/tests/miku-scm-version.test.mjs skills/igapyon-miku-scm/tests/miku-scm-benchmark.test.mjs skills/igapyon-miku-scm/tests/miku-scm-workflow-contracts.test.mjs
node skills/igapyon-miku-scm/scripts/miku-scm-workflow-contracts.mjs --check
mvn validate
git diff --check
git status -sb
```

commit/publishへ進む場合は、repoの`runtime-and-test-suites.md`に従って
`npm run test:miku-scm:full`も成功させる。

完了条件:

- 3方式とも実際のcandidate文字列が対応sourceのパス付きで表示される。
- coupled=nullやversion.statusに不要な候補行を出さない。
- `Candidate (version): none`と`[object Object]`が正常結果に出ない。
- human output schemaは`v15`、構造化version schemaは`miku-scm.version/v1`のまま。
- 対象テスト、契約drift確認、repo版数整合性、diff checkが成功する。
- 先行する4ファイルの版数変更が保持されている。

## 実装・検証結果（2026-10-26）

- `appendVersion()`を実producerの`proposed.authoritative` / `proposed.coupled`とsource配列に対応させ、human output schemaをv15へ更新した。human-output、benchmarkのschema期待値も更新。
- human output unit testに5ケースを追加し、content-date/SemVerは`coupled: []`、`proposed.coupled: null`のproducer形状を使用。miku-date通常系はCurrent value保持とresult不変も検査する。
- 実`inspectVersion()`結果をhuman rendererへ渡す接続検査を追加。
- workflow contract generatorでlock/tableを再生成。候補のhuman output変更によりhandoff 4 workflowが更新され、既存の未commit sync仕様変更によりsync pull/push関連契約も更新された。手編集なし。
- focused tests: **45/45 passed**。generator `--check`: **37 contracts current**。`mvn validate`: BUILD SUCCESS、`1.20261026.5 / 20261026e`を含む4値の整合OK。full suite: **374/374 passed**。`git diff --check`: 成功。
- full suite実行中にfixture形状を`coupled: []`へ正確化し、その後focused testsを再実行して変更を検証した。
- branch `devel-tiga1026wce`、HEAD `dc4c5b39a527188877ca7a94f8dbdc0e668453d9`。既存差分を保持し、すべて未commit。製品版 `.5` / Mikuku `20261026e` を維持。commit、push、配備、追加version incrementは未実施。
- native Windows/hosted CIの今回の修正確認は未実施。
