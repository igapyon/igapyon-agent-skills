# 引き継ぎ履歴（2026-10-26整理前）

`8d8f68c` 時点の旧 `HANDOFF.md` 本文を保存した履歴です。以下の「最新」「現在」「active」、未commit、承認待ち、次の操作、テスト件数は各作業当時の記述です。現在の作業指示・Git状態・未完了判定には使いません。

現在地と訂正結果は [HANDOFF.md](../../HANDOFF.md) と [TODO.md](../../TODO.md) を参照してください。本文中のコード表記の相対パスは、元のリポジトリルートを基準にしています。Markdownリンクのみ移動先に合わせています。

## 最新作業：miku-scm Issue承認の改善をsource実装（2026-10-23）

利用者の実装指示により、[計画と実施記録](../../skills/igapyon-miku-scm/docs/2026-10-23-issue-approval-implementation-plan.md)のUX-00〜08を実装した。実行状態と検証結果はroot TODOの同題sectionを参照。

- 固定要件：完成した作業案の提示後に `approve` 必須。文面の委任・明確なclose依頼でも確認を省略しない。一つの案の複数操作を一回承認し、通常はID入力不要。
- 対象の固定：review済みID/digest/順序へ束縛し、global pendingから選ばない。コメント一覧は全件の接続件数を検証。partial/unknownを区別し、証明済み未実施だけreceipt付きresume可能。
- 検証：fast 197/197、full 312/312、skill index policy 78/78、Maven validate成功、skill validator有効、contract driftと`git diff --check`成功。
- ローカルworktreeに未commit。モデル会話確認、Windows実機確認、実GitHub操作、配備、version更新、commit/pushは未実施。

以下の「最新作業」やbranch・未commitの記述は過去作業の記録であり、現在の実装指示として扱わない。

## 最新作業：miku-soft Java互換性方針（2026-10-22）

利用者の合意に基づき、miku-soft Java CLIの最低実行環境をJava 8、実行確認先をJava 8と選択したJDK配布元の最新LTSに定めた。build JDKは製品runtimeと分ける。正本のJava設計、straight-conversion workflow、decision / TODO / maintenance recordを更新した。

- 2026-10-22時点の最新LTSはJava 25。JDK配布元ごとにJava 8の更新・サポート期間は異なる。
- この更新ではJava 8 / 25上の実行、Java製品のbuild、GitHub Actionsを実施していない。skill正本は未配備で、commit/pushもしていない。
- 詳細は`skills/igapyon-miku-soft-developer/docs/maintenance/2026-10-22-luna-execution-record.md`のD-JAVA addendumと`DECISIONS.md`を参照。

## 最新作業：Waypointsの仕様とsource実装（2026-10-20）

利用者が`waypoints/`を採用し、保存・再開手順と番号付きサブ作業入口をsource skillへ実装した。[daybook-waypoints.md](../../docs/plans/daybook-waypoints.md)が仕様記録。task・activitiesを正本とし、Waypointsは短い再開案内と参照を持つ。関連スレッドの担当範囲・確認時点を記録し、スレッドの実行管理はハーネス側の役割。

- 状態：新規メモに`type`、`updated_at`、`status: ready | in_use | closed`を使い、task完了とWaypointの役割終了を区別する。既存のfront matterなしメモは未記録として読む。
- サブ作業：`YYYYMMDD-HHMM-<topic>-00001.md`形式で個別の再開入口を作る。全体入口は任意。日時はグループ初回作成時、番号は固定識別で並べ替えない。task・計画書を正本とする。
- 操作方式：再開したセッションが自分で状態を更新する。手順はDaybookスキルに置き、waypoints内READMEやheartbeat等の稼働監視は必須にしない。
- 自己レビュー修正：既存メモは同じパスで更新し、同名回避は新規作成だけに適用。全体・子メモの相互リンクと追加時の案内更新を手順化し、リンク更新では状態を変えない。
- 直前の添付テキスト化仕様案は`fc7a4bd`へcommit済み。今回のWaypoints実装はローカル変更で、commit/pushしていない。実daybookデータは変更していない。
- SCMのローカル再コミットとpushはこれまで未実行。保存済みの古いPR draftには添付仕様案や今回のWaypoints仕様が含まれないため、再開時は実際の対象範囲と依頼を確認する。

## 最新作業：daybookの添付をテキスト中心にする仕様検討（2026-10-20）

[daybook-text-first-attachments.md](../../docs/plans/daybook-text-first-attachments.md) に仕様案を作成。利用者はGit管理下の容量増加を抑え、画像・音声・動画を原則格納せず、OfficeとPDFはテキスト化を優先する方針を指定した。保存判断、変換/OCRの制約、作業ファイル、個別例外、既存添付の扱いと反映箇所を整理。現行のsource skillの保存指示への反映は後続工程。

- この仕様検討で作成・更新するのは仕様案とTODO/HANDOFF。実daybookの資料・原本・データは変更していない。
- 直前のBacklog対応と共通版`1.20261019.1`は`f56bccf`へcommit済み。開始時点の`devel-tiga1017lab`は`origin/devel`より1commit先、作業ツリーclean。
- SCMのPR draftは`workplace/miku-scm/pr-drafts/pr-devel-tiga1017lab-202610191702.md`に保存済みで、ローカル再コミットの承認待ちだった。履歴書き換え・pushは未実行。今回の仕様検討文書はそのcommit/draftに含まれないため、再開時は実際の範囲と状態を確認する。

## 最新作業：day-plan の Backlog 分離を実装（2026-10-19）

[daybook-backlog-separation.md](../../docs/plans/daybook-backlog-separation.md) のBLG-00〜05を実装。task は `planning_state: planned | backlog` を持ち、既存の省略属性はplanned扱い。日付に依存しないBacklog欄をday-planへ追加し、日付欄から除外した。Backlog作成時は不明日付を補完せず、Issue manifest、preview、receipt、applyにも反映。旧schema v1 plan/resultの適用・再開をfixtureで確認。

- 変更：`skills/igapyon-miku-daybook/assets/daybook/scripts/day-plan.mjs`、`issue-import.mjs` と両テスト、notification renderer test。`SKILL.md`、records/operations/issue-import/notification/date migration references、新規 `task-planning-migration.md`、root `README.md`、`DEVELOPMENT.md`、TODO、計画書を更新。
- 検証：daybook suite 51/51、`npm run test:skill-index-policy` 77/77。`git diff --check` と文書リンク/範囲照合を実施。
- 対象repoの既存task分類・記録更新、skill/generator配備、version、commit/push、GitHub通知は未実施。旧taskはplanning_state省略のままplannedとして動作する。
- 開始時のcheckout：`devel-tiga1017lab` / `b7c992e`。開始時点に計画/TODO/HANDOFFの既存差分があり保持した。再開時は実際のGit状態を優先する。

下方は過去作業の記録。そこに残る「最新指示」、古いbranch、未commitなどを今回の実装開始指示として扱わない。

## 最新指示：daybook のURL関連 task 探索を実装（2026-10-15）

利用者の後続指示に従い、[daybook-url-task-lookup.md](../../docs/plans/daybook-url-task-lookup.md) の URL-00〜05 を source skill に実装した。

- 振る舞い：関連確認を明示されたとき URL を読み、全年月の task から候補と根拠を返す。URL単独提示や要約依頼では task 探索をしない。
- 変更：`skills/igapyon-miku-daybook/SKILL.md`、新規 `references/url-task-lookup.md`、`references/operations.md`、root `README.md`、TODO、HANDOFF、計画書。
- 確認：U1〜U14 を静的照合。`quick_validate.py` は `Skill is valid!`、`git diff --check` は成功。モデル／tool mock による実行確認はしていない。
- 実 daybook の更新、配備、version 更新、commit／push は未実施。

## 直前の作業：daybook レビュー指摘の修正を実装（2026-10-15）

利用者の指示に従い、[daybook-skill-review-fixes.md](../../docs/plans/daybook-skill-review-fixes.md)のDBR-00〜05を実装した。task 編集の範囲と完了根拠を operations.md に集約し、Issue 取り込み CLI のローカル前提と導入経路を追加した。MIT 出典・task／activities 分担を含む既存差分を保持。

- 変更：root README、daybook SKILL.md、operations.md、records.md、issue-import.md、notification.md、TODO.md、HANDOFF.md、計画書。
- 検証：S1/S3/S5/S6 は成功。S2/S4 は `--help` とエラー分類を確認したが、`npm install --offline` は ENOTCACHED のため依存取得と lock 更新が未検証。詳細は計画書。
- `quick_validate.py` は `Skill is valid!`、`git diff --check` は成功。C1〜C8 は規則へ静的照合。
- 実 daybook、GitHub、スキル配備、version 更新、commit/push は未実施。現在の変更はローカル差分。

下方は過去の別作業。今回の指示として再開しない。

## 最新指示：配布ZIPのsource照合補修を実装（2026-10-11）

利用者の実装指示に従い、[release-archive-source-verification.md](../../docs/plans/release-archive-source-verification.md)のZIP-00〜05をroot repoに実装した。詳細なtaskと検証記録は[TODO.md](../../TODO.md)冒頭。

- `scripts/release-archive-files.mjs`が内部skillのsourceとZIP展開先を、相対path・通常file型・size・SHA-256で照合する。`.DS_Store`、`node_modules`、`.git`は従来の配布規則どおりsource側で除外する。
- 14代表参照routeを`skill-reference-routes.mjs`へ共通化し、source単独testとZIP展開先の両方から確認する。root内部15 skillだけを全file照合する。外部10 skillは現行pinに対するlock/index検査を維持する。
- 検証：`npm run test:skill-index-policy` 77/77 pass、`mvn package` BUILD SUCCESS、archive checkerはinternal=15 / external=10 / source-checked=15 / representative-routes=14。実ZIP一時コピーでVERSION.md・代表画像の欠落、同サイズ内容変更をそれぞれexit 1で検出。`git diff --check`成功。
- 外部10件の新ref統合後も、source-to-ZIP全file比較の対象はroot内部15件。外部10件はfull-SHA lock/ref/index検査と実ZIP package確認を通過している。Qiita比較とroot package検証は親移行計画で完了。Release・配備は行わない。

## 親計画：index.json方針移行の実装（2026-10-10）

利用者は当初Luna想定の詳細計画を依頼し、その後、計画に従う実装を明示指示した。計画正本は[index-json-policy-migration.md](../../docs/plans/index-json-policy-migration.md)、task一覧と進捗は[TODO.md](../../TODO.md)冒頭。

- 方針：index.jsonを全skill共通の必須・先読前提から外し、具体的なconsumerと維持価値があるもの、製品出力は残す。新しい全件INDEX.mdへの置換も必須にしない。
- 内部14件の補助indexを削除。Qiita indexはLunaの3代表task比較で、アプリケーションarchitecture記事のoverviewとtopic bankを区別しやすくしたため、任意のcross-topic discovery用途でretain。known-topic taskの既定経路は直接参照・scoped searchのまま。indexにtopics/tagsはなく、一般的なsummaryもある。token/time削減は測定していない。
- 自己レビュー後、実ZIPの欠落・混入・不正path・symlink・lock検査、ゼロ/複数生成、policy拒否、生成差分、単独配置14skillの静的参照到達性、indexなしstarterの検査を58件へ拡充。モデルの選択行動やtoken削減を測った検査ではない。Release workflowでもこのsuiteを実行する。
- `mvn clean package`成功。外部10repoの追跡差分は74 source path（以前の73は誤り）。既存build/testは全repoで成功済み、今回変更したprompt-lintは10 source＋6 bundle tests、AI builderは34 source＋5 bundle testsを再検証。両repoのZIP検査はsourceから期待集合を作り、bundleとZIPで同じ参照が抜けた場合も検出する。text-file-opsのWindows専用test 1件はskip。
- 外部10source repositoryは3作業列で並行移行し、各repoの既存build/test確認後にmiku-scm draft recommit pushを実行した。root pinsとpolicy dispositionを新しいfull SHAへ更新し、policy suite 77/77、`mvn clean package`、実ZIP checker（internal=15、external=10、source-checked=15、representative-routes=14）が成功。全refとrepo別test数はmaintenance inventoryに記録。
- IDX-00〜07の作業・記録・検証は完了。miku-indexgenの製品生成機能、mikuku画像・記事・version正本、他製品JSON、配布provenanceを維持。利用者指定のmiku-scm draft recommit push方式でGitHub反映を進める。Release、tag、skill配備は対象外。

下方には過去の別作業の状態が残っている。そこにあるbranch・未commit・優先作業の記述を、この移行の現在状態として扱わない。

## Daybook Issue受信のローカル実装（2026-10-06）

利用者の実装指示に基づき、ISSUE-00→A→B→C→D→E→F→Gを実施した。チェックリストと詳細仕様は[TODO.md](../../TODO.md)と[daybook-issue-import.md](../../../daybook/docs/plans/daybook-issue-import.md)。

- daybookの`planned_dates_status`対応、Issue source正規化・検証、manifest/plan/preview生成、task/schedule/activityのローカル適用、result journalと再開CLIを追加。resultコメント／closeの操作手順は新しいdaybook referenceに記載。
- daybook READMEとskill SKILL.md/referencesを更新し、skill indexを再生成した。daybook側とskill bundle側の6スクリプト／テストを一致させた。miku-scmソース・通知workflowには変更を加えていない。
- 検証：skill bundleの`node --test skills/igapyon-miku-daybook/assets/daybook/scripts/*.test.mjs`は42/42成功。daybookの`npm test`は41/41成功。両repoの`git diff --check`も成功。
- 実GitHub取得・投稿・close、認証、skill配備、commit/pushは未実施。Issue取込の実運用は後続の明示依頼で行う。
- worktreeにはこの作業以外の利用者変更がある。特に`pom.xml`、miku-scm/GitHub Writer、Mikuku VERSION、既存の別TODOおよび過去作業handoffをこの作業に含めず保持する。

次の操作：差分を確認したうえで、必要なら別途skill配備または実Issue取り込みを明示依頼する。commit/pushは行っていない。

## Priority Resume Context — miku-scm Work Cycle (2026-08-10)

This is the active user-directed work; the older miku-soft reference-audit
context below is preserved but deferred.

- Objective: implement the responsive Work Cycle direction in
  `skills/igapyon-miku-scm/docs/work-cycle-lifecycle-redesign.md` without
  weakening `-done`, backup, remote-expectation, or publication safeguards.
- Completed: the design was merged by PR #343 (`origin/devel` = `af623c4a`).
  The first implementation slice, `pr.recommit.push`, is now present but
  uncommitted: it runs the macOS backup/recommit/publication sequence in one
  fixed invocation. It verifies that the backup still points to the reviewed
  HEAD before reset, and has success, remote-conflict, backup-integrity, and
  platform-stop tests.
- Current branch: `devel-tiga0810udh`. Local commit `27a2ed7` increments the coupled versions to
  `1.20260810.1` / `20260810a`; it is one commit ahead of `origin/devel`, with
  no push or PR. The worktree contains the `pr.recommit.push` implementation,
  generated contracts/index, and this state update; inspect and commit them
  deliberately before publication.
- First decision: publish `27a2ed7` as its own PR or include it in the
  implementation PR. Do not increment the version again on resume.
- Next implementation slice: move the remaining expected fixed checks into
  runners while keeping genuine human authorization boundaries. The completed
  `pr recommit push` slice retains exact remote checks, `force-with-lease`,
  post-push comparison, and the `-done` rename guard.
- Platform rule: one Node.js core with OS adapters; `rg` is optional so Windows
  11 is supported without a full script split.
- Verification: this implementation passed `npm run test:miku-scm:fast`
  (117 tests), `npm run test:miku-scm:full` (215 tests),
  `mvn generate-resources`, contract drift check, and `git diff --check`.
- Release note: `v20260809a` currently targets `42e557b`, not merged base
  `af623c4a`. Do not move or create tags automatically; GitHub tag/Release
  actions remain human work.

## Historical State — miku-soft reference audit (deferred)

- AI agent state management has been initialized for this repository.
- Root `TODO.md` remains the repository's existing task memo.
- `GOAL.md`, `DECISIONS.md`, and `HANDOFF.md` provide agent-oriented state, decisions, and resume context.
- The then-active objective was the validity audit and structural improvement
  of `skills/igapyon-miku-soft-developer/references/`.
- The numbered references have been classified: product-layer codes are
  `10/11/20/21/40/50`; `30` is a conversion method; `31/32` are separation
  workflows; `00` is overview/concept work rather than a product layer.
- The preferred future direction keeps layer numbers stable and separates
  layers, workflows, methods, migrations, reviews, profiles, catalogs, and
  dated baselines into explicit document roles. Typed IDs such as `L10`,
  `M-L10-L20`, and `G-L10-L10+L11` remove cross-role ambiguity.
- No product reference has been renamed or semantically changed yet. Content
  validity is to be audited before any path migration.
- The claim-evidence matrix contract and pilot repository set are now recorded
  under `TODO.md`.
- The local-only inventory found 56 direct sibling candidates. The primary
  pilots are the `miku-indexgen`, `miku-xlsx2md`, and `miku-md2docx` families,
  with explicit Java-only, Skill-only, minimal-Skill, combined-Web, and MCP
  contrasts.
- Detailed ignored working evidence is stored in
  `workplace/miku-soft-reference-audit/`; the matrix currently contains 23
  claims, with target structure, phased revision plan, and decision brief in
  separate files.
- Full reads are complete for all `00/10/11/20/21/30/40/50` basic documents
  and all top-level numbered workflows.
- High-confidence conflicts include layer 10 and Java release defaults,
  release-review wording, straight-conversion multi-module Maven allowance,
  and Java 8 compatibility versus source/target-only compilation.
- High-confidence stale findings include the `miku-xlsx2md-java`
  multi-module note, volatile product inventories, and Node.js 20 as the
  maintained starter minimum.
- Dated primary-source checks were completed for Node.js lifecycle, current
  GitHub Action lines, Maven/JUnit Java compatibility, and MCP specification
  revision 2025-11-25.
- A read-only compatibility scan found 38 files across 25 sibling repositories
  naming current reference paths; old-path stubs are therefore required for
  any later migration.
- GitHub Actions normalization is now an explicit audit track. The initial
  read-only scan found 57 direct workflows in 47 of 56 sibling candidates:
  10 CI and 47 release-oriented files, with 54 distinct exact contents.
  Differences must be classified by product profile and contract before they
  are treated as drift or defects.
- The workflow plan defines a per-workflow inventory, normalized structural and
  contract clustering, canonical profile candidates, shared invariants, an
  exception registry, and a P0-P3 migration backlog. No sibling workflow has
  been changed, fetched, dispatched, or published.
- Node.js baseline migration is a named sub-track. A literal scan found Node 20
  on `node-version` lines in 29 direct sibling workflow files, compared with
  Node 22 in 3 and Node 24 in 14; matrix files can appear in two counts. The
  shared policy is approved: choose the oldest upstream-maintained LTS as the
  product floor and verify it plus the newest LTS, adding intermediate LTS
  lines when practical. The 2026-10-22 starter snapshot is minimum 22, CI
  22/24, and Release build 24. Sibling applicability and rollout remain open.
- Release artifact normalization is also a named sub-track. Initial signals
  include 13 workflows staging/copying `.mjs`, 14 staging/copying `.jar`, 15
  referring to `sources*.tgz`, 10 referring to Skill bundle `.zip`, and only 3
  uploading `.zip.sha256`. Counts overlap and artifact meaning still requires
  profile-level classification.
- The candidate lifecycle is build, verify, stage under final names, checksum
  final bytes, verify the expected set, then upload. Reproducible Skill zip,
  Node module/source staging, Java minimum-runtime smoke, npm pack surface
  verification, and Web staging are exemplar controls rather than one universal
  workflow template.
- Release-page filename quality is now an explicit design concern. Node custom
  assets mostly use role-before-version names, while Java sources jars mix
  role-before-version and Maven-style version-before-classifier forms. Existing
  download scripts, runtime resolvers, docs, and articles consume these names,
  so filename cleanup requires a producer/consumer compatibility map.
- The leading custom-asset grammar to evaluate is
  `<release-family>[-<role>][-<platform>-<arch>]-<release-version>.<ext>`, with
  sorted per-profile Release-page fixtures and narrow npm/Maven exceptions.
- The next audit execution is intentionally parallel: one coordinator plus up
  to three read-only subagents per wave. Workers receive disjoint scopes and
  unique ignored reports; only the coordinator merges results. Actual workflow
  changes remain serial representative pilots after approval.
- Wave A is complete and integrated in
  `workplace/miku-soft-reference-audit/wave-a-integration.md`. Its three
  reports confirm the Node/asset/workflow evidence tracks and identify two
  contract candidates for follow-up: manual tag checkout in `miku-indexgen-java`
  and tag-driven Release creation in `miku-docx2md`.
- Wave B is complete and integrated in
  `workplace/miku-soft-reference-audit/wave-b-integration.md`. It groups all
  direct workflows into 11 Release and 4 CI profile proposals, separates P0
  source-identity corrections from estate policy gates, and records a
  candidate Node/artifact/naming contract plus serial pilot order. The
  candidate defaults remain unapproved; no sibling has been mutated.
- Wave C is complete and integrated in the ignored audit workspace. It provides
  a cross-checked W01–W57 workflow TSV, P0/P1 exception/control register,
  producer/consumer evidence, and a 15-item Node reference/starter register.
  The highest-impact naming finding is miku-ms-office-core: at least seven
  fixed vendor/import consumers exist while its producer verifier names only
  three. No public artifact name may be changed producer-first.
- The durable audit/roadmap summary is now tracked under
  `skills/igapyon-miku-soft-developer/docs/maintenance/2026-07-31-reference-actions-audit/`.
  Raw Wave reports remain ignored workplace provenance; ordinary project
  workflows continue to use `references/` as the normative source.
- Routine miku-soft maintenance now includes an uplift check for approved,
  adjacent improvements. Urgent, minimal, or explicitly narrow work may skip
  only that additional uplift pass; the requested change and its verification
  remain required. Public compatibility changes stay in dedicated migrations.
- When maintenance mode has a known target repository but no named change, it
  now selects and completes a bounded slice of one or more mutually compatible,
  approved, locally verifiable improvements. The slice is limited by coherence
  and verification rather than item count. If none is ready, it performs a
  read-only assessment and identifies the exact pending decision instead of
  claiming there is no maintenance work.
- 2026-06-23 skill discovery maintenance is implemented, copied into `/Users/igapyon/.codex/skills`, and verified in a fresh Codex session.
- `policy.allow_implicit_invocation: false` was removed from `igapyon-agent-state-management` and `igapyon-skill-compactor` `agents/openai.yaml` files.
- The miku-soft Agent Skill starter skeleton was moved from `assets/agent-skills/skills/__SKILL_NAME__/SKILL.md` to `assets/agent-skills/templates/skill/SKILL.md.template`.
- `DECISIONS.md` records the durable policy: avoid hidden discovery controls and keep skill templates outside discovery shapes.
- 2026-06-29 release-bundled external skill refs were checked against upstream tags.
  Only `miku-ms-office-skills` needed an update; `pom.xml` and README now pin
  it at `v0.4.2`.

## Historical Next Action — miku-soft reference audit (deferred)

- Wave C is complete. Review the integrated decision packet in
  `workplace/miku-soft-reference-audit/wave-c-integration.md`: Node roles,
  checksum shape, custom/native naming rules, Web JSON visibility, Action
  pinning, and Release ownership.
- If authorized, prepare only the standalone P0 `miku-indexgen-java`
  source-identity correction first; its acceptance fixture must bind manual
  input tag, checkout SHA, POM version, staged names, and Release target.
- After policy approval, update this repository's developer references/starters
  as one coherent Node baseline change, then run exactly one serial profile
  pilot. Do not parallelize sibling mutations that share templates, consumers,
  release names, or GitHub state.
- Continue systematic extraction for remaining product-specific/current-state
  claims, but do not delay obvious conflict classification already backed by
  the matrix.
- After decisions, prepare semantic edits at current paths as a separate diff;
  do not start the path migration in the same change set.

## Relevant Files

- `GOAL.md`: Current agent objective, done conditions, and stop conditions.
- `TODO.md`: Existing repository TODO plus AI agent current tasks.
- `DECISIONS.md`: Important decisions and reasons.
- `HANDOFF.md`: Compact resume notes.
- `README.md`: Repository operating rules and conventions.
- `skills/igapyon-miku-soft-developer/SKILL.md`: Workflow router.
- `skills/igapyon-miku-soft-developer/references/architecture-rules.md`: Basic-document selector and shared architecture rules.
- `skills/igapyon-miku-soft-developer/references/miku-soft-basic/`: Current type-specific design documents.
- `skills/igapyon-miku-soft-developer/references/review/`: Current review notes.
- `workplace/miku-soft-reference-audit/claim-matrix.md`: Detailed audit claims.
- `workplace/miku-soft-reference-audit/target-structure.md`: Candidate taxonomy
  and target tree.
- `workplace/miku-soft-reference-audit/revision-plan.md`: Phased implementation
  and verification plan.
- `workplace/miku-soft-reference-audit/decision-brief.md`: Pending product-owner
  choices and recommendations.
- `workplace/miku-soft-reference-audit/github-actions-audit-plan.md`:
  Cross-repository workflow inventory, classification, profile, and migration
  plan.

## Watch Outs

- Do not rewrite unrelated existing `TODO.md` sections while updating agent task state.
- Keep state files concise; use repository documentation for durable project rules.

## Last Verification

- 2026-07-31: Read the numbered workflows, architecture router, new-project
  router, current basic-document map, Git history for numbered workflows, and
  the local sibling miku-soft directory inventory. Confirmed the worktree was
  clean before updating these state files.
- 2026-07-31: Completed full reads through layers 40/50, inspected bundled
  starters and representative Skill/MCP repositories, checked current primary
  sources, and scanned sibling hard links. Product references and sibling
  repositories remain unmodified.
- 2026-07-31: Completed the first read-only GitHub Actions inventory across all
  56 direct sibling candidates and recorded the normalization audit plan.
- 2026-07-31: Added the Node 20-to-22/24 decision track and recorded the first
  workflow, package-engine, reference, and starter-assumption counts.
- 2026-07-31: Added the release-artifact normalization track and recorded the
  initial module, source, jar, Skill zip, Web, npm pack, and checksum patterns.
- 2026-07-31: Elevated Release-page filename consistency to a public UX/API
  contract and added producer/consumer compatibility planning.
- 2026-07-31: Added the parallel subagent execution protocol: parallel
  read-only evidence waves, serial integration, and serial mutation pilots.
- 2026-07-31: Completed and integrated Wave A. The detailed reports and
  evidence reconciliation are retained in the ignored audit workspace.
- 2026-07-31: Completed and integrated Wave B. Its canonical-profile proposal,
  migration backlog, and product-owner decision gates are retained in the
  ignored audit workspace; the completed Wave C registers supply the remaining
  machine-readable evidence.
- 2026-07-31: Completed and integrated Wave C. The audit/design phase now has
  complete direct-workflow rows and focused public-asset consumer evidence;
  the next state-changing step needs an explicit decision packet and named
  serial pilot authorization.
- 2026-07-31: Added the routine maintenance adoption workflow and connected it
  to the normative maintenance checklist, dated roadmap, and implementation
  backlog, including the urgent/narrow uplift skip boundary.
- 2026-07-31: Added Maintenance Opportunity Selection for maintenance sessions
  with a known repository but no specific requested change.
- 2026-06-22: Inspected `git status --short`, `README.md`, existing `TODO.md`, and state-management templates.
- 2026-06-23: `mvn generate-resources` and `mvn package` passed.
- 2026-06-23: Source and installed copies were checked: no `allow_implicit_invocation` remained in the two affected skills.
- 2026-06-23: Source and installed `igapyon-miku-soft-developer/assets/agent-skills` trees were checked: no real `SKILL.md` template remained under the starter assets.
- 2026-06-23: Fresh Codex session skill list includes `igapyon-agent-state-management` and `igapyon-skill-compactor`, and does not include `__SKILL_NAME__`.
- 2026-06-29: `mvn package` passed after updating the release-bundled
  `miku-ms-office-skills` ref to `v0.4.2`; the generated zip includes
  `skills/igapyon-miku-ms-office/runtime/miku-xlsx2md-1.2.3.mjs`.
