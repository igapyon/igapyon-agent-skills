# index.jsonを任意にする全体方針への移行計画

作成日：2026-10-10。状態：実装中（2026-10-10に後続指示を受領）。想定実行モデル：Luna。

2026-10-11の再自己レビューで、index未採用の内部skillの参照・画像が配布ZIPから欠けても検査を通る問題を確認した。追加の[配布ZIP補修計画](release-archive-source-verification.md)を作成し、後続の実装指示に従ってroot内部15 skillのsource照合、ZIP展開先の14代表route確認、異常系testを実装した。実測結果と外部照合の境界は計画書およびmaintenance inventoryに記録した。

初回依頼は詳細計画のみだった。後続の実装指示で内部方針・build・14件の内部index削除、外部10source repoのindex依存除去を実施した。自己レビュー後はsource由来のZIP検査と実ZIPの異常系検査を補い、参照の静的到達確認とモデル行動の評価を区別する。Qiitaは比較評価待ちの暫定保持。外部変更は未commitで、root pinsは新ref未発行のためlegacyのまま。Qiitaの最終判断、Luna想定の代表task比較、外部新ref統合後の最終root package検証は未完了。利用者repoのcommit/push、tag、Release、配備は未実施。最新状態はTODO.mdとHANDOFF.mdを参照する。

## 1. 目的と今回の境界

igapyon-agent-skillsとそのmiku-soft関連規約では、スキルの参照資料を探すための`index.json`を、ほぼ共通の前提としてきた。これを用途別の任意選択へ改める。不要な依存を取り除き、不要と判断したスキル付属indexを削除する。具体的な利用価値があるindexと、製品が生成するindexは残す。

利用者が最近のフロンティアモデルで感じている効果の低下やデメリットを、今回の見直しの動機とする。全モデル・全用途でindexの効果がないと一般化しない。参照情報の重複、古い一覧への誘導、初回読取の増加、生成・検査の保守負担を減らし、必要な原資料へ直接到達できる構成にする。

後続の実装指示に基づき、方針文を正本へ反映し、root build・検査経路を変更した。Qiitaの記事集合用indexを暫定保持し、内部14件の補助indexを削除した。外部10 source repoでもskill inventory依存を除去し、各repoの既存build/testを通した。変更はローカルworktreeにあり未commit。現行のroot pinsは旧refのため外部indexをlegacyとして扱う。新refの統合後に行うpackage検証とLuna想定の代表task比較は未完了で、commit/push、tag、Release、配備も行っていない。詳細な状態はTODO.md、HANDOFF.md、maintenance inventoryを参照する。

## 2. 実装時に採用する全体方針

方針の正本を`docs/policies/reference-discovery.md`に作り、root READMEからリンクする。以下を基本文とする。

> igapyon-agent-skillsでは、参照資料の発見を目的とするindex.jsonを全スキル共通の必須成果物にしない。通常はSKILL.mdの具体的な参照先と利用条件を入口にし、必要に応じて対象directoryの一覧・ファイル名検索・本文検索で原資料へ到達する。index.jsonを先に読む手順を共通の既定動作にしない。
>
> index.jsonは、利用する処理、扱う情報、利用する場面、更新責任が明確で、その維持に見合う価値がある場合に採用する。採用したindexの必要性と検査方法は個別に宣言する。採用していないスキルはindex.jsonがなくても作成・利用・配布・検査できる。
>
> 製品が生成するindex.json、利用者が依頼したindex生成、具体的な機械処理に必要なindexは引き続き扱う。生成物を残す判断と、スキル自身の参照一覧を残す判断を分ける。生成物を手修正せず正規の生成手順で更新する規則は、その生成物を採用する場合に適用する。

### 2.1 通常の参照手順

1. SKILL.mdに作業別の入口と、どの場面で読むかを短く書く。
2. 既知の資料へは直接リンクする。初回から全資料を読むことを要求しない。
3. 未知の資料は対象範囲を限定し、一覧・ファイル名・本文の順に必要な探索をする。例は`rg --files`、`git ls-files`、環境に応じたファイル操作API。特定CLIをスキル利用の必須依存にしない。
4. 複数資料の使い分けに意味がある場合は、手書きの主題別ガイドを使ってよい。`references/INDEX.md`もこの用途では残せる。
5. 説明文や判断の正本は原資料とする。既存indexの短縮summaryを根拠の代わりにしない。

index削除の代償として、同じ全ファイル一覧をINDEX.md、別名JSON、SKILL.mdへ機械的に移植しない。主題別ガイドは資料を選ぶために必要な説明だけを持ち、全ファイル列挙を必須にしない。すべてのreferencesをSKILL.mdへ展開する変更も避ける。

### 2.2 残す条件

次のいずれかについて具体的な証拠がある場合に残す候補とする。

- 実際のプログラム・連携先がschemaを読んで動作し、廃止すると機能が失われる。
- 大きい資料集合などで、本文検索だけでは扱いにくい分類・属性・選択情報を提供し、代表作業で有用と確認できる。
- ファイル探索ができない配布・取込環境で、実際に利用する入口として必要である。
- miku-indexgenの出力など、index生成・利用そのものが製品や利用者の依頼の目的である。

「参照ファイルが複数ある」「従来の規約にある」「チェックを通すため」「将来使うかもしれない」だけでは残す理由にしない。数値の件数閾値だけで決めない。

残すものは対象path、consumer、用途、生成元・command、更新契機、検査、保守責任、判断の証拠を記録する。証拠不足でまだ決められないものは`pending`とし、暫定保持の理由と次の確認を記録する。判断不能を永久の例外にしない。

## 3. 調査時点の事実と変更範囲

### 3.1 基準点

計画作成時の読取ではbranchは`devel-tiga1006hfc`、HEADは`3eb211f`、worktreeはclean。rootにindex.jsonはなく、追跡されているスキル付属indexは15件、合計78,842 bytes。実装開始時にはbranch・HEAD・差分を再確認する。この基準点を理由に利用者の後続変更を戻さない。

rootの15スキルに加え、release stagingは10個の外部skill repoから固定refを取り込む。インストール先`~/.codex/skills`は配備コピーであり、編集の正本にしない。

### 3.2 内部15スキルの判断案

これは調査結果に基づく初期案。IDX-00でconsumerと参照到達性を確認して確定する。

| `skills/`直下の名前 | 自身のindexの案 | 本文・周辺で確認する点 |
| --- | --- | --- |
| igapyon-agent-state-management | 削除 | 複数references参照前にindexを使う案内を具体的な参照先へ変更 |
| igapyon-companion-musicpost-writer | 削除 | discovery案内を削除し、既存の作業別参照を維持 |
| igapyon-companion-techpost-writer | 削除 | 同上 |
| igapyon-diary-writer | 削除 | 日記の原資料・書式への直接経路を確認 |
| igapyon-ffmpeg-helper | 削除 | runbookへの経路を確認。FFmpeg処理や素材ファイルは変更しない |
| igapyon-github-writer | 削除 | referencesの原文を正本とする経路、version manifestを維持 |
| igapyon-miku-daybook | 削除 | SKILL.mdの「indexを先に読む」を変更。記録JSONとIssue intakeは別機能 |
| igapyon-miku-scm | 削除 | precommitのindexチェックを採用repoに限定。contract JSONは維持 |
| igapyon-miku-soft-developer | 削除 | 規約、雛形、starter tests、運用docsの必須規則を先に修正 |
| igapyon-mikuku-agent | 削除 | 本文・README・現行referenceの規則を修正。version/画像/記事への経路を維持 |
| igapyon-note-writer | 削除 | Note metadata・canonical記事への経路を確認 |
| igapyon-qiita-writer | 保持価値を評価 | 記事集合への選択情報が検索より役立つかを代表作業で確認 |
| igapyon-repo-conventions | 削除 | 任意discoveryの案内を修正。repo規則の原文を維持 |
| igapyon-reviewer | 削除 | 主題別`references/INDEX.md`で到達可能。対象skillのindex必須判定も修正 |
| igapyon-skill-compactor | 削除 | 自身のindexと、対象skillへのindex新設・再生成推奨を用途別へ変更 |

対象は各directory直下の`index.json`。表だけを根拠に削除を開始しない。資料中のJSON、schema、fixtures、製品出力を同名という理由で削除しない。

### 3.3 indexが復活する経路と検査依存

| 場所 | 現行動作 | 移行後 |
| --- | --- | --- |
| `pom.xml`の`generate-skill-indexes` | generate-resourcesでskills親directory全体を生成 | 宣言された保持対象だけを生成。ゼロなら生成をskip |
| `scripts/prepare-release-staging.sh`末尾 | staging内の内部・外部skillすべてを再生成 | 内部の明示対象だけ生成し、外部は固定sourceの内容と宣言を照合 |
| `scripts/check-generated-indexes.sh` | 全`skills/*/index.json`の変更を確認 | 宣言対象のdrift確認＋未宣言root indexの混入検出 |
| `scripts/check-release-archive.mjs` | 全skillにSKILL.mdとindex.jsonを要求 | SKILL.mdは維持。indexは宣言された保持対象だけ必須 |
| `README.md` | 生成、commit、bundle、stagingで全indexを前提 | 全体方針と条件付き生成・検査に更新 |
| `.github/workflows/release-archive.yml` | Maven packageとarchive検査を実行 | 変更後の既存経路を使用。検査自体を外さない |
| `src/assembly/release.xml` | stagingからskillsを配布 | index任意化後もruntime・references・lockを欠落させない |

archive検査のfrontmatter/name、ZIP path・重複・許可entry、期待skill集合、EXTERNAL_SKILLS.lockのprovenance、index内pathの実在・逸脱防止は維持する。index必須を外す変更に便乗して他の検査を弱めない。

### 3.4 外部10スキル

| source repo | 現行pin | skill |
| --- | --- | --- |
| miku-indexgen-skills | v1.6.2 | igapyon-miku-indexgen |
| miku-text-bundle-skills | v1.6.0 | igapyon-miku-text-bundle |
| miku-repo-bundle-skills | v0.5.0.1 | igapyon-miku-repo-bundle |
| miku-text-file-ops-skills | v0.5.0 | igapyon-miku-text-file-ops |
| miku-prompt-lint-skills | v0.5.0 | igapyon-miku-prompt-lint |
| miku-ai-assistant-builder-skills | v0.13.0 | igapyon-miku-ai-assistant-builder |
| miku-ms-office-skills | v0.7.1 | igapyon-miku-ms-office |
| miku-json2xlsx-skills | v0.5.0 | igapyon-miku-json2xlsx |
| miku-project-skills | v0.12.4 | igapyon-miku-project |
| miku-score-skills | v0.6.1 | igapyon-miku-score |

上表のsourceを個別に調査し、自身のinventory、生成処理、bundle test、本文の依存を記録する。名前にJSONを含む製品でも、業務JSONとskill inventoryは別用途。rootで外部sourceの古いタグ内容を加工して移行済みとしない。source修正→検証→新しいrelease/ref→root pin更新の順とする。

外部repoの正本変更やrelease権限が実装環境にない場合も、内部の移行は進められる。外部は期限・次作業を記録した`legacy`例外として旧indexを保持できるが、全体移行完了とは報告しない。

## 4. 保持対象と移行状態の管理設計

### 4.1 決定記録

IDX-00で`docs/maintenance/index-json-migration-inventory.md`を作る。各発見箇所に以下を記録する。

- repo/ref、path、分類（runtime consumer／生成・検査／discovery／製品出力・schema・fixture／歴史資料）。
- 判断（remove／retain／legacy／pending）、根拠、consumerまたは参照経路。
- 依存しているproducer・validator・docs・tests、変更task ID。
- 完了証拠、未完理由と次の確認。補助一覧の有無だけで完了にしない。

歴史資料と製品の生成例は残存箇所として記録し、検索結果がゼロになることを完了条件にしない。

### 4.2 ビルドが読む宣言

実装時に`config/skill-index-policy.json`を新設する。これは配布スキルを列挙するreference indexではなく、生成・検査を一致させる小さいbuild設定である。読者の探索入口にはしない。

設定は`schemaVersion: 1`、内部保持対象の`internal`配列、外部10skillの判断を持つ`external`配列とする。内部未登録skillの既定値は「root inventoryなし」。外部は固定sourceを扱うため、期待する全10skillを明示し、欠落・重複をエラーにする。

- internal entry：`skill`、`indexPath`（初期は`index.json`だけ）、`reason`、`consumer`、`evidence`（判断記録への参照）。
- external entry：`skill`、`repo`、`ref`、`disposition`（`remove`／`retain`／`legacy`）、`reason`、`evidence`。legacyは`nextAction`も必須。
- 未知key、未知schema、空理由、重複、未知skill、policyとpom pinの不一致、directory外pathは拒否する。glob、任意shell command、全対象自動追加は受け付けない。
- internal retainは正規generatorを単一skillに適用する。実装前にCLIの単一対象引数を現在のruntime/specで確認する。policyにcommand文字列を保存して実行する仕組みは作らない。
- external retain/legacyはsourceが持つindexを検査する。stagingで再生成してsourceとの差を隠さない。removeはsourceにroot indexがあれば停止し、source/refの移行を要求する。

共通reader/validatorを`scripts/skill-index-policy.mjs`に置き、生成・drift・archive検査で同じ解釈を使う。CLI呼出しはshell展開を使わず引数配列で行う。`scripts/generate-skill-indexes.mjs`を生成入口とし、既存shell check入口は互換wrapperとして残せる。

この設定にすべての資料path、summary、descriptionを追加しない。generator jarのroot同梱を続けるかは、内部保持対象が決まった後に判断する。保持生成がなくなっても、miku-indexgen skillが提供するJava/Node runtimeを巻き添えで削除しない。

## 5. 対象ごとの変更内容

### 5.1 miku-softの規約・雛形

以下を「必須index」から「用途を確認して採用」に変更する。

- `skills/igapyon-miku-soft-developer/references/40-agent-skills-workflow.md`：skeleton後生成、既存index先読、bundle必須、欠落test、変更のたび再生成という一連の規則。
- `references/miku-soft-basic/miku-soft-40-agentskills-design.md`：成果物一覧、directory例、bundle例、生成・発見・更新の説明。
- `references/review/agent-skills.md`：index欠落を一律の不備にする判定を廃止。
- `references/repo-operations.md`、`docs/maintenance/README.md`：生成対象変更時だけ更新する運用。
- `assets/agent-skills/templates/skill/SKILL.md.template`：index先読の指示と必須参照を外し、作業別の直接参照例にする。
- `assets/agent-skills/tests/release-bundle-contents.test.mjs`、`isolated-bundle-smoke.test.mjs`：indexなしのstarterが成立する検査へ変更。

実装時に上記以外の同内容を検索してinventoryへ追加する。starterに空indexや「あとで生成」の必須TODOを残さない。採用した場合の生成・検査例は条件付きの例として維持してよい。

### 5.2 miku-indexgen

製品の役割は維持する。`index.json`と任意の`index.md`の生成、flat files array、metadata/frontmatter、summary/description、generation情報、JSON pointer等の既存contractを、この方針変更だけで変更しない。

source `../miku-indexgen-skills`で変更する候補：

- `skills/igapyon-miku-indexgen/SKILL.md`：生成する目的・対象を先に確認し、他skillへindexを一律追加しない方針を記載。自分のroot indexへの入口を外す。
- `references/workflow/agent-skill-index-workflow.md`：共通必須の作成手順をopt-inの手順へ書き直す。既存の主題別`references/INDEX.md`は有用な経路なら維持。
- `examples/maven-index-generation.md`、`templates/pom-single-skill.xml`、`pom-multi-skill.xml`とtemplate README：明示採用時だけ配線する例であることを記載。
- source `pom.xml`：自分のskill inventoryを自動生成する処理を外すか保持対象限定へ変更。
- `tests/release-bundle-contents.test.mjs`：自分のroot index必須assertを外し、SKILL・references・runtimeの検査を維持。
- 自分のskill直下indexを削除。build bundleが復活させないことを確認。

`tests/generate-smoke.test.mjs`の生成先index.jsonの存在・内容検査は残す。runtime smoke、runtime artifacts、isolated bundleのNode/Java動作も残す。`../miku-indexgen`本体はpolicy説明の必要性を確認するが、生成機能削除やCLI schema変更は今回の目的に含めない。

### 5.3 mikuku-agent

`skills/igapyon-mikuku-agent/SKILL.md`とREADMEのinventory説明、`references/graphic-recording.md`等の現行作業手順を変更する。代表画像、各視覚資料、記事、version referenceへの直接経路を確認してからroot indexを削除する。

VERSIONの正本は引き続き`references/VERSION.md`。代表画像とversionをindexから推定しない。画像ファイルを削除・再生成しない。新しい巨大な記事一覧をSKILL.mdへ埋め込まない。

`examples/articles/`内の公表済み・日付付き文章は、当時の例として原則維持する。現行規則としてリンクされている古い記事だけ、入口側に歴史資料であることや新方針の参照を足す。記事本文のindex例を一括置換しない。

### 5.4 reviewer、skill-compactor、SCM

reviewerの以下を条件付きの判定へ変更する。

- `references/20-targets/agent-skill/agent-skill-review.md`：存在・生成・参照の必須判定、bundle必須、欠落Medium、report status。
- `references/20-targets/artifacts/archive-package-contents-review.md`：index欠落Highを一律適用しない。
- `generated-artifact-review.md`、Markdown関連review、`read-only-skill-content-format-review.md`、`references/INDEX.md`：採用indexの品質と、indexなしの到達性を区別。

reportでは`not adopted`／`adopted and valid`／`adopted but missing/stale`／`not checked`を区別する。未採用の欠落は不備にしない。採用している生成物の古さ・path不備を見逃さない。

skill-compactorのREADME、`references/system/design-philosophy.md`、`token-efficiency-techniques.md`、`references/checklists/agent-skill.md`、`distilled/token-efficiency-design-essence.md`では、複数referencesならindex新設という推奨を外す。直接参照・限定探索・意味のある主題別ガイドを優先し、対象skillにindexを持たせる場合だけ更新手順を扱う。

SCMの`references/repository-precommit-checks.md`では、repoが宣言した生成物チェックを行う規則にする。indexなしrepoへ生成を要求しない。SCMの契約snapshot、version alignment、backup、承認、force-with-lease等は変更しない。

## 6. Luna向け実行順序

各taskの開始時に関連ファイルを読み直し、完了時に差分と証拠をinventory/TODOへ記録する。初回計画の後、2026-10-10に実装指示を受けてIDX-00から着手した。

### IDX-00：基準と判断の確定

前提：実装開始指示。root規則と利用者変更の確認。

1. `git status --short`、branch/HEAD、対象repoの規則を確認。root内、外部source10件、配布script、testsで`index.json`と実際のJSON readerを調査する。
2. `git ls-files`と対象を絞った`rg`で、追跡indexと参照箇所を列挙。target、installed copies、runtime fixturesを正本と混同しない。
3. 第4.1節のinventoryを作成。15内部と10外部を分類し、依存producer/consumer/validatorを結ぶ。
4. qiita等の候補を第7節で評価。remove/retain/legacy/pendingを確定する。
5. 実装可能なrepoとrelease/pin更新が可能な範囲を記録。pendingは削除しない。

完了条件：全25skillに判断・根拠・担当taskがあり、製品出力と補助inventoryを識別できる。削除はまだ行わない。

### IDX-01：全体方針と作成規約

前提：IDX-00。

1. 第2節を方針正本へ反映し、READMEに短い全体方針とリンクを追加する。
2. miku-soft規約とstarter templateを更新。参照経路を具体化し、indexなしstarterの検査を用意する。
3. reviewer・compactor・SCMの横断規則を修正し、未採用indexの欠落を不備扱いしない。
4. root README、INSTALL.md、`src/assembly/README.md`、maintenance docsから必須・一律再生成の案内を除去する。履歴を現行規則と区別する。

完了条件：新skillをindexなしで設計でき、横断規約同士の矛盾がない。現行indexはこの段階では残っていてよい。

### IDX-02：生成・検査の任意化

前提：IDX-00の判断、IDX-01の方針。

1. 第4.2節のpolicy設定と共通readerを作る。移行途中は削除前の内部indexを「移行待ち」としてdrift checkで別報告できるが、最終検査を無効化しない。
2. Maven生成入口を明示対象限定に変更。対象ゼロ、複数retain、無効設定をfixtureで検査する。
3. stagingの全件生成を外し、sourceごとの期待状態とprovenanceを検査する。
4. archive検査を「採用対象だけ必須」に変更。残すindexは既存のpath検査を適用する。
5. `check-generated-indexes.sh`の入口を維持しつつ保持対象のdriftと未宣言root indexを検出する。削除差分を「再生成して戻せ」と案内しない。
6. archive用設定はrootのbuild入力として読み、extractされたZIPの値を無条件に信用しない。自動Release workflowが同じ判定を使うことを確認する。

完了条件：削除後に生成されない構造が用意され、indexなしskillの配布と採用indexの厳格検査が両立する。

### IDX-03：内部skillの入口修正と確定ファイル削除

前提：IDX-01・02。

1. 第3.2節の順にSKILL/README/referenceの入口を更新。mikukuとqiitaは記事・画像・versionの代表経路を個別確認する。
2. remove確定の`skills/<name>/index.json`だけを明示pathで削除する。retain/pendingのファイルに触れない。
3. 各skillを一時directoryへ単独copyし、SKILLと必要なreferences/assetsだけで代表作業に到達できることを確認する。
4. 規約変更後のstarter testsを実行し、root・skillの未採用index残存を確認する。

完了条件：内部remove対象にindex・必須指示・自動復活経路がなく、retain理由と参照到達性が記録されている。

### IDX-04：miku-indexgen skillの移行

前提：source repoの編集権限とIDX-01。rootとの連携判断はIDX-02。

1. 第5.2節のskill本文・workflow・Maven例・自身のbuild/testを変更。
2. 自身の補助index削除後、bundleとisolated runtime testsを検査する。
3. 製品出力index.json/index.md生成が既存contractで動くことをNode/Javaの既存testsで確認する。
4. source差分、version/release必要事項、root pin候補を記録する。releaseが未実施ならlegacyとして残す。

完了条件：indexを生成する製品機能を保ったまま、自分のskill inventoryへの依存がなくなる。

### IDX-05：残り9外部skillの移行

前提：各sourceの編集権限、IDX-00・01。独立repoは1件ずつ処理する。

1. 自身のindexのconsumerと生成・bundle検査を確認し、内部と同じ基準で判断。
2. removeなら本文→producer/validator→単独bundle→明示削除の順に変更する。
3. 製品のJSON/XLSX/score/変換契約と固有runtimeは維持する。
4. sourceごとの検証結果とrelease/pin更新待ちを記録。旧refは改変しない。

完了条件：9件すべてに結果があり、未完はlegacy/pendingとして理由と次作業が明示されている。

### IDX-06：新ref統合と最終package検証

前提：使用する外部refが用意されている。取得やreleaseに追加権限が必要ならその時点で扱う。

1. sourceの新refを確認し、pom pin・policyのrepo/ref・expected external listを同時更新。
2. `mvn generate-resources`と`mvn clean package`を行い、削除対象がsource/staging/ZIPで復活しないことを確認する。
3. `node scripts/check-release-archive.mjs <実際の単一ZIP path>`、generated check、対象testsを実行する。
4. 正常ZIPと欠損・不正path・index混入fixtureの検査結果を記録する。
5. 方針正本、README、配布README、設定、inventory、実際のarchiveを照合する。

完了条件：外部legacyがなく、期待する全skillを含むZIPが合格し、remove対象のindexが復活しない。legacyが残る場合は「内部移行完了・外部統合待ち」までの報告とする。

### IDX-07：評価・報告・配備の引継ぎ

前提：IDX-03〜06の実装可能部分。

1. 第7・8節の証拠をまとめ、残すindexの価値と保守方法を確認する。
2. `git diff --check`、変更path、不要なversion/素材/業務JSON変更がないことを確認。
3. TODO/HANDOFFへ完了・未完・実行したcommand・結果を記録する。
4. 配備は別途指示がある場合だけ。`scripts/sync-codex-skill.sh`はrsync `--delete`を使用するので、dry-runでindex削除を含む差分を確認する。手作業でinstalled copiesを先に削除しない。
5. commit/push・PR・Release・tag操作は、その時点の依頼とrepo規則に従う。計画を実行したというだけで公開まで進めない。

## 7. 保持価値と参照到達性の確認方法

### 7.1 小さい比較

qiita等の保持候補は、同一の代表作業3〜5件と同一の資料snapshotで比較する。例：既知のtemplateへ到達、未知の主題に合う記事を選択、特定属性の資料を抽出、例と規約が競合する時に原文を確認。実際の利用場面にない課題をindexのために作らない。

indexを使用する経路と、直接参照・限定検索の経路それぞれで、到達した原資料、誤選択、読んだ資料数、重複読取、手順数、取得可能ならtoken/時間を記録する。モデル比較をする場合はまず想定実行モデルLunaで行い、一般的な全モデルの性能主張へ拡大しない。追加モデル・API呼出しは別途の実行範囲がある場合に限る。

成功率が同等でindexの追加負担だけが残るなら削除案を採る。必要な属性がindexでしか得られない、探索制約のある環境で確実に役立つ等の具体的な利点があれば保持する。単発の時間差だけで結論を出さず、測定不能項目は未測定と書く。

### 7.2 各skillの最低確認

- 既知の代表作業をSKILLから開始し、必要な原資料へ到達できる。
- 未知の資料をdirectory/list/searchで発見でき、index不在を作業停止理由にしない。
- 不要なreferences全読取を新たに要求していない。
- packaged単独skillでも、root全体方針が同梱されていなくても動作条件が分かる。
- 残すindexは本当に利用するconsumerから読まれ、schemaと更新手順が一致する。

## 8. 実装時の検証表

以下は実装の検証要件。実装後の自己レビューで不足していた実ZIP・生成経路・静的参照到達性のtestsを補った。各commandと結果はmaintenance inventory、TODO、HANDOFFに記録する。モデル行動と保持価値の比較は別の未完了項目として残す。

| ケース | 期待結果 |
| --- | --- |
| 未採用skillのindexなしbundle | 生成・archive検査・単独利用が成功 |
| 未採用skillにroot indexが混入 | 最終checkが失敗し対象pathを示す |
| retain index欠落 | 失敗。未採用と誤認してskipしない |
| retain index生成後のdrift | generated check失敗。正規再生成でのみ解消 |
| retain indexの不正JSON/files/basePath/path | 既存validation相当の失敗 |
| index pathの`..`、絶対path、symlink逸脱 | 失敗。抽出dir外を読まない |
| policyの未知skill・重複・未知key・pin不一致 | 生成/検査の開始前に失敗 |
| 内部retainゼロ | 全件生成へfallbackせずskip |
| external removeで旧sourceにindexあり | provenanceを保持して統合停止 |
| external legacy | 明示理由付きで保持。全体完了扱いしない |
| Maven再実行 | remove indexがsourceにもstagingにも復活しない |
| archiveのSKILL欠落・name不一致・ZIP traversal・duplicate | index任意化後も失敗 |
| external lock欠落・repo/ref/name不一致 | 従来どおり失敗 |
| starter templateからindexなしskill作成 | release/isolated starter tests成功 |
| miku-indexgenのNode/Java生成 | 生成先index.jsonと任意index.mdが従来契約どおり |
| mikuku代表画像・version・必要article | indexなしで正しい原資料へ到達 |
| 記事/fixture/schemaにindex.jsonという文字列 | 許可用途なら維持。全件置換しない |

新しいpolicy/packaging testsは一時directoryと架空fixtureを使う。故障fixtureで現実のskill sourceを破壊しない。既存testsの削除・assert緩和だけで成功扱いにせず、indexなしの成功と保持対象の失敗検出を両方確認する。

## 9. 完了条件と残る境界

### 全体完了

- 全体方針とmiku-soft規約・starter・review規則が一致する。
- 15内部・10外部について判断記録が確定し、pending/legacyが残っていない。
- remove対象は本文依存・producer依存・validator依存がなく、該当root indexがsource/staging/ZIPにない。
- retain対象には具体的な価値、更新手順、検査があり、その生成・drift・path検査が機能する。
- miku-indexgenの製品機能、他skillの固有JSON/runtime、version alignment、配布provenanceが維持される。
- README・配布資料に「全skillはindex必須」「変更ごと全indexを生成」が残っていない。
- indexなしの単独利用と代表参照経路を確認済み。歴史資料・製品出力等の残存箇所は説明できる。

### 最終報告の形式

変更したrepo/path、削除一覧、保持一覧と理由、歴史/製品用途の残存一覧、実行した検証と結果、未完と次作業を報告する。配備・公開していなければその状態を明示する。indexの総件数をゼロにすることや単なる検索ヒット減少を成果指標にしない。

## 10. Lunaへ渡す開始指示の雛形

> docs/plans/index-json-policy-migration.mdに従ってindex.json任意化を実装する。最初にIDX-00で対象とretain/remove判断を確定し、TODO/HANDOFFへ証拠を記録する。依存する規約・生成・検査を変更してから、確定pathの補助indexを削除する。miku-indexgenの出力機能、保持対象、歴史記事、業務JSON、runtime、配布provenanceを維持する。外部repoは正本と権限を確認し、旧refを加工しない。legacyが残れば部分完了として報告する。利用者変更を保持し、無差別削除・一括置換・全件index再生成を行わない。配備と公開は今回の実装指示に含まれる場合だけ行う。

実装の段階ごとにこの文書の該当節と具体的なファイルを読ませる。モデルへの入力に全references・全inventoryを常時展開しない。既存TODO/HANDOFF下方の別作業を、この移行指示に混ぜない。
