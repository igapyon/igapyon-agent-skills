# TODO

- [ ] 必要性が明確になったら writer skill を追加する
- [ ] skill 配布先が必要になったら mirror 方針を決める
- [ ] UI metadata が必要になったら skill 用の `agents/openai.yaml` を検討する

## igapyon-reviewer 改善 TODO

- [x] `SKILL.md` に全レビュー共通の短い実行・検証フローを追加する
  - 対象範囲を確定する
  - 必要な reference だけを選択する
  - finding の根拠をファイル、行番号、コマンド結果などで示す
  - 実行していない検証と残余リスクを明示する
  - 2026-07-16: `Core Review Workflow` として反映した
- [x] 汎用 Code Review の reference と `references/INDEX.md` の導線を追加する
  - correctness、regression、error handling、security、test evidence を扱う
  - Software Completion Review との役割の違いを明記する
  - 2026-07-16: `references/20-targets/code/code-review.md` を追加した
- [x] Code Review の forward test で見つかった `.DS_Store` 同期契約の不整合を修正する
  - `scripts/sync-codex-skill.sh` から `--delete-excluded` を外し、除外対象を
    drift として報告・削除しないようにした
  - 一時 Codex home で `--check` と同期後も配備先の `.DS_Store` が残ることを確認した
- [x] project convention の分類を複数軸へ整理する
  - project family、artifact type、公開・ライセンス形態を分離する
  - `igapyon-managed Agent Skill` と OSS / private-proprietary を併記可能にする
  - classification 出力候補から欠落している `igapyon-managed Agent Skill` を修正する
  - miku-soft、Maven、license、Agent Skill 固有規則を個別条件で適用する
  - 2026-07-16: `Project Convention Detection Review` を更新した
- [x] 複数 review lens の出力統合規則を定義する
  - 通常は単一の severity 順 findings に統合する
  - safety-first と全体 severity 順の優先関係を明記する
  - 重複 finding と「問題なし」ブロックの扱いを定める
  - 2026-07-16: `Output Integration` として反映した
- [x] `references/INDEX.md` の参照条件を明確にする
  - AI Text Naturalness は AI らしさが論点の場合に限定する
  - Japanese Public Text Final Check は公開前の最終確認に限定する
  - Agent Skill CLI Integration Review は CLI/runtime がある場合に限定する
  - Read-Only Skill Content Format Review は reference-only の場合に限定する
  - 2026-07-16: target と timing の導線へ条件を追記した
- [x] `igapyon-reviewer` 自体に関する meta work を reviewer workflow の発火対象から除外する
  - 対応する prompt lint Rule: `agent-skill/activation-boundary-mismatch`
  - `skills/igapyon-reviewer/SKILL.md` の frontmatter と本文に、単なる名前の言及、
    存在確認、この skill 自体の説明・レビュー・更新は meta work として扱う境界を追加する
  - should-trigger 例として「`igapyon-reviewer` を使ってコードをレビューする」を確認する
  - should-not-trigger 例として「`igapyon-reviewer` とは何か」、
    「`igapyon-reviewer` の `SKILL.md` をレビュー・更新する」を確認する
  - fresh session または同等の activation matrix で、reviewer workflow と meta work が
    正しく分離されることを検証する
  - 2026-07-16: frontmatter と本文へ meta-work carve-out を追加し、独立した
    activation matrix で should-trigger 2件、should-not-trigger 3件を確認した
- [x] 全 review lens の出力を、単一の再利用可能な統合レポート契約へそろえる
  - 対応する prompt lint Rule: `context/weak-template`
  - `references/templates/consolidated-review-report.md` などに、severity、場所・根拠、
    影響、提案、確認済み／不確実／未確認の区別を含む共通 shape を定義する
  - `SKILL.md` から共通 shape を直接案内し、各 reference の `Review Output` は
    standalone report を要求せず、統合 findings に追加する lens 固有 field だけを示す
  - AI Text Naturalness の `Overall: Low / Medium / High` などの lens 固有 rating は、
    finding severity と混同しない位置づけを明記する
  - safety-first、全体 severity 順、重複 finding の統合、未実施範囲の明示を含む
    multi-lens の最小例を追加する
  - 変更後に Markdown link、`index.json` 再生成差分、代表的な multi-lens 出力を検証する
  - 2026-07-16: canonical template と multi-lens 例を追加し、全 lens の
    `Review Output` を統合契約へ接続した。独立テストで単一レポート、severity 順、
    evidence、lens 統合、未確認範囲の出力を確認した
- [x] Prompt Language Checks を、モデル・runtime・評価根拠がある場合だけ適用する規則へ直す
  - 対応する prompt lint Rule: `context/stale-or-unversioned-context`
  - `references/20-targets/agent-skill/agent-skill-review.md` の
    `Prompt Language Checks` と対応する severity 例を更新する
  - 英語のほうが安定するという判断を使う場合は、対象モデル、reasoning/runtime、
    評価方法、確認日または根拠を記録する
  - 根拠がない場合は Japanese-only を finding にせず、対象環境で比較評価する候補として扱う
  - 日本語のみで書かれた skill を、言語だけを理由に自動で Low finding にしない
    forward-test case を追加する
  - 2026-07-16: model/version、reasoning/runtime、比較 prompt、評価方法、確認日を
    必要な evidence として定義した。no-evidence の独立テストで言語由来の finding が
    出ず、比較性能だけが未確認範囲として残ることを確認した
- [x] [Medium] 統合レポート契約を全 review lens で完全に一本化する
  - 正本は `references/templates/consolidated-review-report.md` とし、finding の field 名と
    並び順を各 reference で再定義しない
  - `references/20-targets/code/code-review.md` の `Review Output` から独自 field 一覧を除き、
    `Lens`、`Issue`、`Why it matters` を含む canonical field を使う指示へそろえる
  - `references/10-perspectives/safety-and-respect/safety-and-respect-review.md` の
    safety-first は「レビュー時に最初に確認する」と「最終出力では同じ severity 内で先に
    並べる」を分けて記述し、`SKILL.md` の全体 severity 順と矛盾させない
  - 各 lens の `Review Output` は canonical template へのリンク、lens 固有の assessment
    notes、review mode の制約だけを残し、共通契約の重複記述を削減する
  - `rg -n 'User or system impact|Report serious safety or respect concerns first' skills/igapyon-reviewer`
    を実行し、旧 field 名と曖昧な優先順位表現が残っていないことを確認する
  - code finding と safety finding を含む multi-lens forward test を実施し、Critical → High →
    Medium → Low、同一 severity では safety-first、全 finding が canonical field を使うことを
    確認する
  - `mvn generate-resources` を実行し、`skills/igapyon-reviewer/index.json` の差分が変更した
    Markdown の size など意図した更新だけであることを確認する
  - 2026-07-17: canonical template を field 名と最終順序の唯一の正本として明記し、
    Code Review の独自 field と Safety Review の曖昧な順序を修正した。28 lens すべての
    template 導線を静的検証し、共通契約の重複記述を削減した
  - 2026-07-17: Codex CLI 0.144.5 / gpt-5.6-sol の fresh session で Code と Safety の
    multi-lens test を実行し、Critical Safety → Critical Code → Medium Code、canonical field、
    `REVIEWER WORKFLOW` を確認した
- [x] [Medium] miku-soft の著作権 header 判定から固定年 `2026` を除く
  - 対象は `references/00-start-here/project-convention-detection-review.md`、
    `references/10-perspectives/rights-and-licenses/rights-and-originality-review.md`、
    `references/30-timing/release/software-completion-review.md` とする
  - header 例は `Copyright <YEAR> Toshiki Iga` などの placeholder にし、年、権利者、SPDX は
    対象 repository の文書化された規約または確認済み既存 header から判定する
  - 単年、年範囲、原著作年を許容し、確認済み規約がない場合は固定年との差を finding にしない
  - `rg -n 'Copyright 2026 Toshiki Iga' skills/igapyon-reviewer` の結果が 0 件になることを
    確認する
  - `2026` 単年、`2026-2027` 年範囲、header 規約不明の3ケースで forward test を実施し、
    確認済み規約との不一致だけが finding になることを確認する
  - `mvn generate-resources` を実行し、`skills/igapyon-reviewer/index.json` を更新する
  - 2026-07-17: 3 reference の固定年を `<YEAR>` と確認済み repository 規約に基づく
    判定へ変更し、固定文字列の残存 0 件と index 更新を確認した
  - 2026-07-17: Codex CLI 0.144.5 / gpt-5.6-sol の fresh session で単年一致、年範囲一致、
    規約不明、確認済み規約との不一致を検証し、不一致ケースだけが finding になることを
    確認した
- [x] [Medium] 修正済み `igapyon-reviewer` をローカル Codex 配備先へ同期して再検証する
  - 上記2タスクの内容と生成済み `index.json` を確定してから実施する
  - `sh scripts/sync-codex-skill.sh igapyon-reviewer` で source を `$CODEX_HOME/skills/` へ同期する
  - `sh scripts/sync-codex-skill.sh --check igapyon-reviewer` が終了コード 0 になることを確認する
  - VS Code の `Developer: Reload Window`、または `codex exec --ephemeral` の fresh session
    で source 版を読み直す
  - should-trigger として「`igapyon-reviewer` を使って別のコードをレビューする」、
    should-not-trigger として単なる名前の言及、存在確認、`igapyon-reviewer` 自体のレビューを
    実行し、reviewer workflow と meta work が分離されることを確認する
  - code と safety の multi-lens review を1件実行し、配備版でも canonical report、severity 順、
    同一 severity の safety-first が守られることを確認する
  - 実施日、同期 check、activation matrix、multi-lens test の結果をこの項目へ追記して完了にする
  - 2026-07-17: source をローカル Codex 配備先へ同期し、`--check` の終了コード 0 を確認した
  - 2026-07-17: Codex CLI 0.144.5 / gpt-5.6-sol の独立した ephemeral session で、別対象の
    明示レビューは `REVIEWER WORKFLOW`、単純言及、存在確認、self-review は `META WORK` と
    なることを確認した。multi-lens test でも canonical report と safety-first を確認した

## AI Agent Current Tasks

This section tracks active work items for AI agents.
Update this section while working. Do not rewrite unrelated TODO items.

### Tasks

- [ ] [Current priority: miku-scm `work.commit` staged diff failure]
  stage済みの正当な変更を固定runnerがcommit前に`partial`として停止し、巨大な
  `git diff --cached` stdoutを結果へ含める不具合を再現して修正する。以下のStep 0から
  Step 4までを順番に実行し、focused testが成功してから次へ進む。
  - 作業境界:
    - この項目の記録だけでは`git commit`、`git push`、Skill配備先への同期、失敗した
      target repositoryでのcommit再実行を許可しない。
    - `git diff`の終了コード1を全Git commandで正常扱いしない。Git公式仕様上、差分を
      1で表すのは`--exit-code`または`--quiet`を指定した場合である。
    - 現行のstaged path一覧とstaged content fingerprintのcheck前後比較、および
      checkがworktreeを変更した場合の停止規則を維持する。
    - 既存の未コミット差分と対象外fileを保持し、自動unstage、restore、retryを行わない。
  - 2026-08-11の確認済み状態:
    - sourceとinstalled Skillの`work-commit.mjs`は一致している。
    - source repositoryは`devel-tiga0811abi`、`origin/devel`との差分なし、worktree clean。
    - staged fingerprint取得は`git diff --cached --binary --full-index --no-ext-diff`を
      check前後に実行するが、`--no-textconv`を指定していない。
    - 提供された失敗記録ではstage後に停止し、HEADは不変、変更はstage済み、
      `git diff --cached --check`は成功していた。runner出力には大量のdiff本文が混入した。
    - Git公式仕様では`git diff`はtextconvを既定で有効にするため、repository固有の
      textconv driverが第一候補である。ただし再現test成功前は確定原因としない。

  - [x] [Step 0 / P0: 再現を固定] 現行runnerの失敗条件をtestで再現する。
    - 変更対象: `skills/igapyon-miku-scm/tests/work-commit.test.mjs`。
    - temp Git repositoryへ、事前stage済みのmodified、added、renamed、binary pathを用意する。
    - repository-local `.gitattributes`とdiff/textconv fixture、または同等の決定的な
      injected Git runnerを使い、`--no-textconv`が無いstaged fingerprint取得だけが
      diff本文をstdoutへ出して非0終了する条件を作る。
    - 修正前は`status: partial`、`stage: stage`、HEAD不変、index保持となることを確認する。
    - 再現できない場合は推測で終了コード1を許容せず、run artifactから実command、
      exit code、signal、spawn error code、stderr、stdout byte数を取得できる診断testを先に作る。
    - 完了条件: 失敗を一つのfocused testで安定再現し、原因となるcommandを一意に示せる。
    - 2026-08-11: 事前stage済みのmodified、added、renamed、binary pathを作るfixtureで、
      textconv相当のstaged fingerprint失敗を注入した。修正前は`partial/stage`、HEAD不変、
      index保持となることをfocused testで確認した。

  - [x] [Step 1 / P0: staged fingerprintを内部diffへ固定] textconvを実行せずcommitまで進める。
    - 変更対象: `skills/igapyon-miku-scm/scripts/work-commit.mjs`とfocused test。
    - check前後の二つの
      `git diff --cached --binary --full-index --no-ext-diff`へ`--no-textconv`を追加する。
    - staged path取得、digestのSHA-256、check前後のpath/digest一致条件、commit後のclean確認は
      変更しない。
    - status 1はglobalに許容しない。`--no-textconv`適用後も非0ならGit失敗として安全停止する。
    - 必須test:
      - Step 0のfixtureが一回の`work.commit`でcommitされ、HEADが一回だけ進み、treeがcleanになる。
      - 通常のtext、rename、binary変更でstaged digestがcheck前後一致する。
      - 本当のGit失敗はcommitせず`partial`を返し、indexを保持する。
    - 完了条件: 正当なstage済み変更ではAI Agentへ戻らずcommitまで完走する。
    - 2026-08-11: check前後のbinary staged diffへ`--no-textconv`を追加した。
      injected textconv fixtureはcommitへ到達し、mixed changesを含むtreeがcleanとなることを確認した。

  - [x] [Step 2 / P1: 失敗診断をboundedにする] diff本文をrunner結果へ埋め込まない。
    - Git subprocess失敗へexit code、signal、spawn error code、bounded stderr、stdout byte数、
      stdout SHA-256を記録する。raw stdoutはエラーmessageへ連結しない。
    - secret候補やstaged file内容を診断へ出さない既存境界を維持する。
    - testでは大きなstdoutを返す失敗を注入し、結果サイズが入力diffサイズに比例せず、
      exit codeとdigestだけで識別できることをassertする。
    - public result schemaを変更する場合だけhuman outputとcontract versionを更新する。
    - 2026-08-11: Git失敗messageへexit code、signal、spawn error code、stdout byte数、
      stdout SHA-256、bounded stderrを追加した。110,000 byteのdiff stdoutを注入するtestで、
      raw staged diffがmessageへ含まれないことを確認した。public result schemaは変更していない。

  - [x] [Step 3 / P1: normative contract更新] 実装と文書を一致させる。
    - `skills/igapyon-miku-scm/references/work-commit.md`へ、staged fingerprintが
      `--no-ext-diff --no-textconv`でrepository固有rendererを無効化することを記載する。
    - `node skills/igapyon-miku-scm/scripts/miku-scm-workflow-contracts.mjs`で生成物を更新し、
      同commandの`--check`でdriftが無いことを確認する。生成物は手編集しない。
    - 2026-08-11: `work-commit.md`へ`--no-ext-diff --no-textconv`とbounded failure diagnosticを
      記録し、workflow contract生成とdrift checkの両方が成功した。

  - [ ] [Step 4 / P0: 全体検証と配備判断] macOSとWindows 11の回帰を確認する。
    - 次の順で実行する:
      1. `node --test skills/igapyon-miku-scm/tests/work-commit.test.mjs`
      2. `npm run test:miku-scm:fast`
      3. workflow contract regenerationと`--check`
      4. `npm run test:miku-scm:full`
      5. `mvn generate-resources`
      6. Skill `quick_validate.py`
      7. `git diff --check`、`git status -sb`、対象diff確認
    - GitHub ActionsのmacOS/Windows matrixで、Step 0の回帰testと既存fixed npm/Maven checkを
      成功させる。hosted CI未実施ならローカル成功と明確に区別して残す。
    - source検証後も、ユーザーの明示指示なしに`~/.codex/skills`へ同期しない。
    - 最終報告へ変更file、再現原因、focused/fast/full件数、contract/Skill検証、
      macOS/Windows CI状態、未commit・未同期状態を記載する。
    - 2026-08-11: focused 30件、fast 160件、full 258件、Maven generate-resources、
      Skill validationはすべて成功した。hosted macOS/Windows CIと`~/.codex/skills`同期は
      この作業では未実施のまま残す。

- [ ] [Current priority: miku-scm 高速化の自己レビュー対応] 以下のStep 0から
  Step 8までを番号順に実行する。後続Stepを先行実装しない。各Stepのfocused testが
  成功してから次へ進み、失敗時はそのStep内で修正する。
  - 作業規則:
    - この項目の実装中は、ユーザーが明示するまで`git commit`、`git push`、PR作成、
      merge、tag、Release作成を実行しない。
    - 既存の未コミット差分を保持する。対象外fileをrestore、削除、formatしない。
    - runnerはGit/GitHubの機械的処理だけを担当する。PR本文生成のようなAI判断を
      Node.js runnerへ移さない。
    - 失敗時に自動でunstage、restore、retryしない。HEADと作業treeをそのまま残し、
      `stage`、`blockers`、`next_action`を構造化結果へ返す。
  - 現在の基準状態（2026-08-10）:
    - branchは`devel-tiga0810vdc`、`origin/devel`より2コミット先行。
    - `work.commit`のone-shot化は実装済み。base・draft自動解決のsource修正は
      未コミットで、ユーザー用`~/.codex/skills/igapyon-miku-scm`へ同期済み。
    - fast suite 128件、full suite 226件、workflow contract drift check、
      `mvn generate-resources`、Skill validationは成功済み。
    - 現在branchのread-only recommit preflightはbaseを`origin/devel`へ解決するが、
      branch-matching PR draftは存在しない。

  - [x] [Step 0: 作業開始時の再確認] 既存差分とテスト基準を記録する。
    - `git status -sb`と`git diff --stat`を実行し、上記基準状態との差をこの項目へ追記する。
    - `npm run test:miku-scm:fast`を一度実行する。失敗した場合は新規実装へ進まず、
      失敗test名と既存差分との関係を記録する。
    - 完了条件: 作業開始時のbranch、ahead/behind、変更file、fast suite件数と結果が
      この項目から再現できる。
    - 2026-08-10: `devel-tiga0810vdc`、`origin/devel`より2コミット先行、既存の
      miku-scm source変更と`TODO.md`変更を確認した。`npm run test:miku-scm:fast`は
      128件成功、0件失敗（約4.5秒）。

  - [x] [Step 1 / P0: commit直前のtree不変性] checkがworktreeを変更したら
    commit前に停止する。
    - 変更対象:
      - `skills/igapyon-miku-scm/scripts/work-commit.mjs`
      - `skills/igapyon-miku-scm/tests/work-commit.test.mjs`
      - 結果schemaを変更した場合のみ、CLI contract、manifest、human outputも更新する。
    - 実装仕様:
      - 現在の「staged path一覧」と「staged diff digest」のcheck前後比較を維持する。
      - 全check成功後、`git commit`の直前に次の二条件を追加確認する。
        1. `git diff --name-only -z --no-renames --`の結果が空である。
        2. `git ls-files --others --exclude-standard -z`の結果が空である。
      - どちらかが空でなければcommitを実行せず、`status: partial`、
        `stage: post-check-verify`、変更path、`next_action`を返す。
      - check失敗時と同様に自動unstage、restore、retryを行わない。
    - 必須test:
      - injected checkがstage済みtracked fileをさらに変更するfixture。
      - injected checkが非ignoreのuntracked fileを生成するfixture。
      - 両fixtureでHEADが開始時と同じ、commit件数が不変、元のstage内容が残り、
        結果が`partial/post-check-verify`であることをassertする。
      - 正常fixtureでは従来どおり一回だけcommitされることをassertする。
    - 完了条件:
      - `node --test skills/igapyon-miku-scm/tests/work-commit.test.mjs`が成功する。
      - checkが作った差分を黙ってcommitしたり、commit後に`partial`報告したりしない。
    - 2026-08-10: staged path/digest再照合後にunstaged tracked pathsとnon-ignored
      untracked pathsを検査する処理を実装した。tracked変更・untracked生成の2 fixtureで
      HEAD不変、stage保持、`partial/post-check-verify`を確認。focused test 10件、
      fast suite 130件、contract regeneration/drift checkはすべて成功。

  - [x] [Step 2 / P0: exact `miku-scm pr recommit push`] PR draftが無い通常経路も、
    一つのユーザーturnで完走させる。
    - 変更対象:
      - `skills/igapyon-miku-scm/SKILL.md`
      - `skills/igapyon-miku-scm/references/github-pr-recommit-push.md`
      - `skills/igapyon-miku-scm/tests/miku-scm-pr-routing.test.mjs`
      - `skills/igapyon-miku-scm/tests/pr-recommit-push.test.mjs`
      - AI文章生成はSkill routingに残し、AIを呼ぶ新規Node.js runnerは作らない。
    - exact phraseの処理順を次で固定する:
      1. `pr.recommit.preflight --repo <repo>`をREADONLYで一回実行する。
      2. `PR draft is unresolved or missing`以外のblockerが一つでもあれば停止し、
         draft生成、backup、reset、commit、pushを実行しない。
      3. matching draftがあり他のblockerが無ければ、preflightが返したbaseとdraftを渡して
         `pr.recommit.push --apply`を直ちに一回実行する。
      4. matching draftが無く、唯一のblockerがdraft不在なら、
         `writing.pr.prepare --repo <repo> --target <resolved-base>..HEAD`を一回実行する。
      5. Agentはprepare結果だけを根拠にPR本文を一度生成し、返却された
         `suggested_draft_path`へ保存する。別pathを発明しない。
      6. 保存直後、同じturnでresolved baseと保存pathを渡した
         `pr.recommit.push --apply`を一回実行する。追加承認を求めない。
    - 承認境界:
      - ユーザーのexact phraseに含まれる`push`を、backup branch作成、recommit、
        conditional pushの承認とみなす。
      - runner内部はbackup成功後、recommit、push、remote comparison `0 0`、draftの
        `-done` renameまでAI Agentへ戻さず進める。
      - `-done`は廃止しない。rename失敗はsuccessにせず`partial`で返す。
    - 必須test:
      - routing testで上記1〜6の順序、追加承認なし、AI生成がSkill層であることをassertする。
      - temp repositoryで「既存draftあり → backup → recommit → push → `0 0` →
        `-done`」を実行する。
      - draft不在でrunnerを直接呼んだtestはGitを変更せず`not-applied`を返す。
        exact phraseのSkill routingだけがprepareとdraft生成を補う。
      - 最新branch-matching draftが既存候補から決定的に選ばれること、他blockerあり、
        prepare失敗の各caseでmutation前に停止する。
    - 完了条件:
      - `node --test skills/igapyon-miku-scm/tests/miku-scm-pr-routing.test.mjs`
        および`node --test skills/igapyon-miku-scm/tests/pr-recommit-push.test.mjs`が成功する。
      - exact phraseを一度指示すれば、唯一の不足がdraftである通常caseは追加の
        ユーザー入力なしにpushと`-done`まで到達する。
    - 2026-08-10: exact phraseのroutingをREADONLY preflight起点へ変更した。
      missing draftだけがblockerなら、`writing.pr.prepare`で`<base>..HEAD`のevidenceを
      一度取得し、返却pathへdraftを保存して同一turnのfixed pushへ戻る。runner直接呼出しの
      draft不足は従来どおりnon-mutating `not-applied`。focused test 10件、fast suite
      132件、contract regeneration/drift checkは成功。

  - [x] [Step 3 / P1: remoteとbaseの一貫性] `--remote`で選ばれたremoteだけを
    base解決とpushに使用する。
    - 変更対象:
      - `skills/igapyon-miku-scm/scripts/pr-soft-reset-recommit-preflight.mjs`
      - `skills/igapyon-miku-scm/scripts/pr-recommit-push.mjs`
      - `skills/igapyon-miku-scm/scripts/miku-scm-cli-contracts.mjs`
      - 関連するrecommit/push test、manifest、normative reference。
    - 実装仕様:
      - standalone `pr.recommit.preflight`と`pr.recommit.apply`へoptional
        `--remote <name>`を追加し、defaultを`origin`とする。
      - base resolverは順に`<remote>/HEAD`、`<remote>/devel`、既存branch規約候補を
        同じ`<remote>/` namespaceだけで評価する。内部で`origin`をhard-codeしない。
      - `pr.recommit.push`は同じremote値をpreflight、apply、push、post-push comparisonへ
        必ず渡す。
      - base未解決、remote不存在、remote名不正はbackup作成前に`not-applied`で停止する。
    - 必須test:
      - `origin/HEAD`と`upstream/HEAD`が異なるtemp fixtureを作る。
      - `--remote upstream`でreset base、lease確認、push先、comparisonがすべて
        `upstream`となり、`origin`が一度も採用されないことをassertする。
      - `--remote`省略時は従来どおり`origin`となることをassertする。
    - 完了条件: focused recommit/push testsと`npm run test:miku-scm:fast`が成功する。
    - 2026-08-10: recommit preflight/applyへ`--remote`（default `origin`）を追加し、
      upstream解決、branch名規約、`<remote>/HEAD`、`<remote>/devel`を選択remote内だけで
      評価するよう修正した。origin/upstreamのHEADが異なる実Git fixtureで、`--remote
      upstream`のbase/reset/push/comparisonがupstreamへ揃いoriginへbranchを作らないことを
      確認。focused tests 44件、fast suite 134件、contract regeneration/drift checkは成功。

  - [x] [Step 4 / P1: version increment notice] version increment忘れを通知するが、
    commitの必須条件にはしない。
    - 変更対象:
      - `skills/igapyon-miku-scm/scripts/work-commit.mjs`
      - `skills/igapyon-miku-scm/scripts/miku-scm-human-output.mjs`
      - `skills/igapyon-miku-scm/tests/work-commit.test.mjs`
      - `skills/igapyon-miku-scm/tests/miku-scm-human-output.test.mjs`
      - `skills/igapyon-miku-scm/references/work-commit.md`
    - 判定sourceを`pom.xml`と
      `skills/igapyon-mikuku-agent/references/VERSION.md`の二つに固定する。
    - 構造化結果へ`version_notice`を追加し、値を次で固定する。
      - どちらかのsourceがchanged pathsにある: `increment_observed`。
      - versionは解決できたが両sourceともchanged pathsにない: `increment_not_observed`。
      - versionを解決できないrepository: `not_applicable`。
    - `increment_not_observed`はwarningだけを表示してcommitを続行する。
      二sourceのversion不一致だけは従来どおりblocking errorとする。
    - 必須testはversion-only、version更新を含む通常変更、version更新を含まない通常変更、
      version source無し、二source不一致の5caseとする。
    - 完了条件: JSONとhuman outputの両方で状態を区別でき、increment忘れだけでは
      exit code非0にもcommit中止にもならない。
    - 2026-08-10: `version_notice.increment_status`へ`increment_observed`、
      `increment_not_observed`、`not_applicable`を実装し、human outputで非blocking reminderを
      明示した。version-only、通常変更+version、通常変更のみ、version source無し、coupled
      mismatchの5caseを追加。focused tests 30件、fast suite 138件、contract regeneration/
      drift checkは成功。

  - [x] [Step 5 / P1: commit message] 既知の作業内容がある場合はgeneric messageを
    使用しない。
    - 変更対象:
      - `skills/igapyon-miku-scm/SKILL.md`
      - `skills/igapyon-miku-scm/scripts/work-commit.mjs`
      - `skills/igapyon-miku-scm/tests/miku-scm-pr-routing.test.mjs`または専用routing test
      - `skills/igapyon-miku-scm/tests/work-commit.test.mjs`
    - Skill routing規則:
      - 直前の作業依頼または現在のTODO見出しから、一行で具体化できる場合は
        `work.commit --message <具体的な一行>`を必ず渡す。
      - version sourceだけの変更では`バージョンを<version>へ更新`を使用する。
      - 作業内容を特定できず`--message`も無い場合だけ`作業内容を更新`を許可する。
    - runner結果へ`message_source`を追加し、値を`supplied`、`version_fallback`、
      `generic_fallback`の三つに固定する。runnerに曖昧なtask context推定を実装しない。
    - 必須test:
      - `--message`指定、version-only、省略時genericの各source値をassertする。
      - Skill routing testで既知の作業名が`--message`へ渡されることをassertする。
    - 完了条件: 既知の作業内容がある通常経路で`作業内容を更新`が選ばれない。
    - 2026-08-10: `message_source`を`supplied`、`version_fallback`、
      `generic_fallback`へ固定し、human outputにも表示した。Skill routingは現在request/
      TODO見出しから具体的タイトルが得られる場合に`--message`を必須化。focused tests 32件、
      fast suite 140件、contract regeneration/drift checkは成功。

  - [x] [Step 6 / P2: sensitive path guard] `git add --all`の前に固定denylistで停止する。
    - 変更対象は`work-commit.mjs`、`work-commit.test.mjs`、`work-commit.md`とする。
    - path basenameに対するdenylistを次で固定する。
      - exact: `.env`、`.npmrc`、`.netrc`、`.pypirc`、`id_rsa`、`id_dsa`、
        `id_ecdsa`、`id_ed25519`。
      - prefix: `.env.`。
      - regex: `^(secret|secrets|credential|credentials|token|tokens)([._-].*)?$`
        （大文字小文字を無視）。
      - extension: `.pem`、`.p12`、`.pfx`、`.key`（大文字小文字を無視）。
    - 検出はstage前に行い、該当pathだけを返す。file内容は読まず、stdout/stderrへ
      secret内容を出さない。private-key headerの内容scanはこの実装範囲に含めない。
    - 必須test:
      - 各denylist categoryを最低一件ずつ検出する。
      - `tokenizer.mjs`、`secretary.md`、`monkey.txt`をfalse positiveにしない。
      - 検出時にindexとHEADが不変であることをassertする。
    - 完了条件: denylist判定がmacOS、Linux、Windows path separatorで同じ結果になる。
    - 2026-08-10: exact `.env`/`.npmrc`/`.netrc`/`.pypirc`/private-key basename、`.env.`
      prefix、secret/credential/token regex、key extensionのfixed denylistを実装した。各categoryの
      9 caseでstage/HEAD不変を確認し、`tokenizer.mjs`、`secretary.md`、`monkey.txt`のfalse
      positiveを防止。focused test 26件、fast suite 151件、contract regeneration/drift checkは成功。

  - [ ] [Step 7 / P1: native Windows 11] `work.commit`の実process起動をWindowsで検証する。
    - platform adapterは`work-commit.mjs`から分離したmoduleへ置き、任意command文字列を
      受け取るAPIを作らない。
    - Windowsでは内部allowlistにある`npm.cmd`と`mvn.cmd`だけを
      `process.env.ComSpec || "cmd.exe"`経由で起動する。macOS/Linuxは実行fileとargvを
      shellなしで直接起動する。
    - adapter testでexit code、stdout、stderr、missing executableを確認する。
      command名の文字列変換だけのtestで完了扱いにしない。
    - GitHub Actionsへ`windows-latest` jobを追加し、temp Git repositoryでstage/commit、
      固定npm check、固定Maven checkを実行する。Nodeは24、Javaは17を使用する。
    - `pr.recommit.push`のpublicationはこのStepに含めず、既存macOS-only guardを維持する。
    - 完了条件: local focused tests、macOS job、Windows jobがすべて成功する。
    - 2026-08-10: common platform adapterと`miku-scm-contract.yml` matrix jobを追加した。
      Windowsではallowlist固定の`npm.cmd run check:index`または`mvn.cmd validate`だけを
      `ComSpec /d /s /c`で起動し、任意command文字列を拒否する。exit/stdout/stderr/ENOENTを
      adapter testで、actual Git stage/commit + npm + Maven checkをmacOS local testで確認した。
      local focused tests 29件、fast suite 154件、contract regeneration/drift checkは成功。
      macOS/Windows hosted CI jobの初回成功は、PRまたはdevel push後にこの項目を`[x]`へ更新する。
    - 2026-08-10: hosted CIの初回実行で、UTC hostがbackup名とnext-work branch名を
      JST期待値と異なる時刻で生成する4件の失敗を検出した。未マージの`-done` branchは
      `backup/2026-08-10-2330`へ退避し、`origin/devel`から
      `devel-tiga0810xda`を作成して既存PR内容を引き継いだ。共通JST時刻module、
      regression test、macOS/Windows再検証をこのStep内で実施する。
    - 2026-08-10: Windows hosted CIで`test:github-writer`のworkflow contract driftを
      検出した。Windows checkoutのCRLFをsource digestとgenerated lock比較へそのまま
      入れていたためであり、LF正規化とCRLF注入testを追加して回復branchで再検証する。

  - [x] [Step 8 / P2: contract、全文書、配備の最終同期] 実装完了後に一度だけ行う。
    - 変更に合わせて`SKILL.md`、normative references、CLI contracts、workflow manifest、
      testsを更新する。生成物
      `scripts/miku-scm-workflow-contract-lock.mjs`と
      `references/workflow-contracts.md`は手編集しない。
    - 次のcommandを記載順に実行し、一つでも失敗したら同期へ進まない。
      1. 各Stepに記載したfocused tests。
      2. `npm run test:miku-scm:fast`。
      3. `node skills/igapyon-miku-scm/scripts/miku-scm-workflow-contracts.mjs`。
      4. `node skills/igapyon-miku-scm/scripts/miku-scm-workflow-contracts.mjs --check`。
      5. `npm run test:miku-scm:full`。
      6. `mvn generate-resources`。
      7. `python3 /Users/igapyon/.codex/skills/.system/skill-creator/scripts/quick_validate.py
         skills/igapyon-miku-scm`。
      8. `git diff --check`、`git status -sb`、対象fileの`git diff`。
    - 全確認成功後だけ、
      `sh scripts/sync-codex-skill.sh igapyon-miku-scm`でユーザー用Skillへ同期し、
      `sh scripts/sync-codex-skill.sh --check igapyon-miku-scm`がexit code 0となることを確認する。
    - 最終報告へbranch、ahead/behind、変更file、test件数、同期結果、未commitであること、
      次に実行可能なexact commandを記載する。
    - 完了条件: sourceとinstalled Skillが一致し、全test/validationが成功し、
      ユーザーが明示しない限りcommit/pushは行われていない。
    - 2026-08-10: workflow contractsを再生成してdrift無しを確認。fast suite 154件、
      full suite 252件、`mvn generate-resources`、`quick_validate.py`、`git diff --check`が
      成功した。`sh scripts/sync-codex-skill.sh igapyon-miku-scm`と`--check`でinstalled
      Skillとの一致を確認。branchは`devel-tiga0810vdc`、`origin/devel`より2 commits先行。
      この実装によるcommit/pushは未実行。Step 7のhosted Windows CI初回成功だけは外部実行待ち。

- [ ] [Current priority: miku-scm Work Cycle] Decide whether version commit
  `27a2ed7` is published as a standalone PR or kept as the first commit of the
  miku-scm implementation PR.
- [ ] [Current priority: miku-scm Work Cycle] Implement the approved redesign
  in small slices from
  `skills/igapyon-miku-scm/docs/work-cycle-lifecycle-redesign.md`.
  - [x] Add the explicit `pr recommit push` transition and its fixed runner
    contract, retaining exact remote expectations, `force-with-lease`,
    post-push comparison, and the `-done` rename guard.
    - 2026-08-10: macOS fixed runner and success, remote-conflict,
      backup-integrity, and unsupported-platform tests are complete. Windows
      publication remains a safe pre-backup stop until the shared adapter
      migration is implemented. Fast suite: 117; full suite: 215.
  - Move expected fixed checks into the runner while retaining a human pause
    for actual safety boundaries and failed validation.
  - Keep version reminders non-blocking and isolate macOS/Windows differences
    behind adapters; do not require `rg`.
  - Run the miku-scm fast suite while iterating. Before handoff, run its full
    suite and regenerate/check contracts whenever their inputs change.

### Deferred / existing task record

- [ ] Validate and improve the miku-soft type-specific reference system.
  - Scope:
    - `skills/igapyon-miku-soft-developer/references/[0-9][0-9]-*.md`
    - `skills/igapyon-miku-soft-developer/references/miku-soft-basic/`
    - `skills/igapyon-miku-soft-developer/references/review/`
    - local sibling miku-soft repositories used as read-only implementation evidence
  - [x] Inventory the current numbered workflow and basic-design files.
  - [x] Establish that the current numbering mixes product layers with methods
    and migrations: `10/11/20/21/40/50` are product layers, `30` is a
    conversion method, and `31/32` are separation workflows.
  - [x] Select the preferred target direction: retain stable product-layer
    numbers and separate `layers/`, `workflows/`, `methods/`, `migrations/`,
    `review/`, `profiles/`, `catalog/`, and `baselines/` as document roles.
    - Use typed IDs such as `L10`, `W-L10`, method `M-L10-L20`, and migration
      `G-L10-L10+L11`; do not allocate layer numbers to ordinary documents.
    - Treat `00` as ecosystem overview/concept work, not as a product layer.
  - [x] Decide not to rename files before the content-validity audit; preserve
    old paths with small compatibility stubs when migration is eventually approved.
  - [x] Define the claim-evidence matrix contract.
    - Identity: `claim_id`, audit date, source Git revision, source path,
      section heading, and line anchor at the audited revision.
    - Classification: document role (`layer`, `workflow`, `method`,
      `migration`, or `review`), target layer or transition, claim summary,
      normative strength (`must`, `should`, `may`, current-state statement, or
      example), and temporal stability (`stable` or `time-sensitive`).
    - Evidence: required evidence scope, inspected repository revisions,
      implementation observations, counterexamples or exceptions, applicable
      primary-source observations, and verification commands or tests.
    - Result: verdict, confidence, rationale, proposed document action, and any
      product-owner decision still required.
    - Verdict vocabulary: valid, conditionally valid, target-state guidance,
      stale, conflicting, or evidence-insufficient.
    - A `must` needs a safety, interoperability, compatibility, or operational
      invariant and a testable check or explicit manual gate. Otherwise consider
      downgrading it to `should` or documenting its condition.
    - A statement about the normal or prevalent repository shape needs observed
      implementation evidence. A desired future shape that is not prevalent
      must be labeled target-state guidance instead of current practice.
  - [ ] Extract auditable claims from the numbered basic-design, workflow,
    migration, and review documents without treating every recommendation as a
    statement of current implementation prevalence.
    - Expanded matrix created at
      `workplace/miku-soft-reference-audit/claim-matrix.md` with 23 claims
      covering numbering/routing consequences, release policy, Node runtime
      and Actions baselines, Java/Maven layout and compiler compatibility,
      straight-conversion traceability, Agent Skills maturity, MCP authority,
      starter assets, discovery-index scope, and path compatibility.
    - Confirmed high-confidence conflicts: layer 10 and Java release-trigger
      defaults, release review guidance, straight-conversion multi-module Maven
      allowance, and Java 8 compatibility versus source/target-only compilation.
    - Confirmed initial high-confidence stale statements: current
      `miku-xlsx2md-java` multi-module shape and the dated layer 10 repository
      scope list. Node.js 20 is also stale as the maintained starter minimum
      because the official lifecycle lists it EOL since 2026-03-24.
    - Continue extraction before treating the pilot set as complete.
  - [x] Refresh the local-only sibling repository inventory and classify the
    first-pass candidates by naming layer.
    - Checked 2026-07-31 without fetch or sibling-repository mutation.
    - 56 direct sibling candidates: 21 suffixless/support candidates, 3 Web,
      14 Java, 3 Java Maven, 14 Agent Skills, and 1 MCP.
    - The suffix-based count is discovery input, not final product
      classification; `miku-soft-catalog`, `mikuku-articles`, and similar
      support/content repositories must not be silently treated as layer 10.
    - All 56 candidates are local Git repositories. One candidate,
      `miku-readfile-skills`, had two pre-existing worktree entries and is not a
      primary pilot target; preserve those unrelated changes.
  - [x] Select representative, recent, historical-combined, and exceptional
    repositories for the pilot and contrast sets.
    - End-to-end CLI family: `miku-indexgen` (`10/20/21/40`).
    - Web and Maven separation family: `miku-xlsx2md` (`10/11/20/21`).
    - Recent main/Web/Java family: `miku-md2docx` (`10/11/20`).
    - Layer 11 coverage: inspect all three separated Web repositories
      (`miku-docx2md-web`, `miku-md2docx-web`, `miku-xlsx2md-web`).
    - Layer 21 and migration 31 coverage: inspect all three Java Maven
      repositories because the population is only three.
    - Java exception: `miku-javaclass2json-java` has no suffixless layer 10
      companion and tests whether upstream-main assumptions are too absolute.
    - Agent Skills contrasts: `miku-indexgen-skills` for runtime-backed shape,
      `miku-text-file-ops-skills` for a recent shape,
      `miku-ms-office-skills` for aggregate Skill-only shape, and
      `miku-media-proc-skills` for a minimal/reference-oriented shape.
    - Historical combined and MCP evidence: `mikuproject` and its Java, Skills,
      and sole local MCP companions; use `mikuscore` and `miku-abc-player` as
      additional combined/Web-centered contrasts where needed.
    - Layer 50 remains evidence-limited because only `mikuproject-mcp` is
      locally available; do not generalize prevalence from one implementation.
  - [x] Complete the full-read pilot for `00`, `10`, `11`, `20`, `21`, and
    `30`, then perform the first scaling pass for `40` and `50`.
    - Full-read completed for all eight basic design documents and all current
      top-level numbered workflows.
    - Initial implementation evidence gathered for the selected main, Web,
      Java, Java Maven, Agent Skills, and MCP repositories without fetch or
      mutation.
    - The sole local MCP implementation supports feasibility evidence but not
      ecosystem-prevalence claims.
  - [ ] Check document-to-document consistency: architecture router, basic
    design, execution workflow, migration workflow, review note, templates,
    and generated discovery index.
  - [ ] Check implementation fit against sibling repositories without changing
    or fetching them during the initial local-only pass.
  - [x] Audit GitHub Actions across sibling repositories before proposing
    cross-repository normalization.
    - The completed local read-only scope covers 57 direct workflows in 47
      sibling repositories. It now has a profile map, W01–W57 machine-readable
      inventory, exception/control register, producer/consumer evidence, and
      proposed serial backlog. Policy approval and implementation are separate
      remaining tasks.
    - Detailed plan:
      `workplace/miku-soft-reference-audit/github-actions-audit-plan.md`.
    - [x] Complete the first read-only static inventory.
      - 47 of 56 direct sibling candidates have direct workflows: 57 files,
        consisting of 10 CI and 47 release-oriented workflows.
      - The files use 11 workflow filenames and have 54 distinct exact
        contents; only two exact-copy groups cover five files.
      - Initial differences include release events, checkout/ref rules, Action
        generations and pinning, Node/Java roles, permissions, version checks,
        smoke gates, timeout/concurrency controls, and artifact staging.
      - Treat these counts as observations, not findings; repository naming is
        only a discovery hint and workflow absence is not automatically a defect.
    - [ ] Complete the Node.js 20-to-22/24 baseline decision and migration
      inventory as a dedicated part of the workflow audit.
      - The first literal scan found Node 20 on a `node-version` line in 29
        direct sibling workflow files, Node 22 in 3, and Node 24 in 14; counts
        overlap where a matrix names more than one version.
      - Thirteen inspected top-level sibling `package.json` files declare an
        `engines.node` range: 3 use `>=18.19.1`, 5 use `>=20`, 3 use `>=22`,
        and 2 use `>=24 <25`. Confirm applicability before calling older ranges
        defects.
      - The developer references still express Node 20 assumptions in the
        layer 10 and layer 40 workflows, layer 40 basic design, Agent Skills
        and Web `package.json` starters, and the Agent Skills CI starter.
      - Evaluate the preferred maintained default: product minimum `>=22`, CI
        build/test on 22 and 24, release artifact build on 24, and smoke the
        released runtime on 22 as well when `>=22` compatibility is claimed.
      - Evaluate Node 24-only as an explicit product profile or exception, not
        as an accidental consequence of using Node 24 for release builds.
      - Keep product runtime, dependency-install/build runtime, release-build
        runtime, released-artifact runtime, and the internal runtime of
        JavaScript Actions as separate inventory fields and decisions.
      - Decide the migration treatment for existing Node 20 claims: remove
        them from maintained verification, retain only an explicitly
        unsupported compatibility note where useful, or document a bounded
        repository-specific exception with an end condition.
      - Wave C completed the 15-item reference/starter change register. The
        candidate policy is now reviewable as separate product, CI, release
        host, final-artifact smoke, compiler target, and Action-runtime fields;
        the actual public-support decision remains pending.
    - [ ] Audit and design a canonical release-artifact contract by product
      profile, taking the strongest existing patterns from sibling workflows.
      - Initial workflow signals: 13 files stage/copy `.mjs`, 14 stage/copy
        `.jar`, 15 refer to `sources*.tgz`, 10 refer to Skill bundle `.zip`, 3
        use Web asset staging, and 2 use `npm pack`. These categories can
        overlap and do not yet prove that the artifacts have the same role.
      - Only 3 release workflows currently upload `.zip.sha256` sidecars. Audit
        whether every user-downloadable custom asset should receive a SHA-256
        sidecar or whether a multi-file `SHA256SUMS` manifest is preferable.
      - Define distinct roles and required/optional sets for CLI module,
        standalone runtime module, curated source archive, executable Java jar,
        Java sources jar, library bundle, npm package tarball, Agent Skill zip,
        and Web assets. Do not confuse GitHub-generated source archives with a
        custom build-ready `*-sources.tgz`.
      - Define one staged-artifact lifecycle: build with repository scripts,
        verify contents and behavior, copy into a clean `release-assets/`
        directory using final release names, calculate and verify checksums
        from those final bytes, then upload only the declared files.
      - Decide filename grammar and the relationship among package/POM version,
        release tag version including accepted dot suffixes, artifact role,
        extension, and checksum filename.
      - Treat the Release page as a user-facing distribution surface and add a
        filename-UX review, not just a filesystem validity check.
        - Evaluate the preferred miku custom-asset grammar
          `<release-family>[-<role>][-<platform>-<arch>]-<release-version>.<ext>`.
          The release version omits the tag's leading `v` and normally appears
          immediately before the meaningful extension.
        - Keep lowercase kebab-case, one canonical public artifact identity,
          and a controlled role vocabulary such as `runtime`, `sources`,
          `index`, and `manifest`; prohibit accidental synonyms and internal
          directory terms such as `target`, `dist`, or `bundle` in public names.
        - Preserve full parent filenames for companions, for example
          `<asset>.sha256` and `<asset>.mjs.map`, unless one approved aggregate
          `SHA256SUMS` policy is selected.
        - Produce sorted sample Release asset lists for Node, Java, Web, Agent
          Skill, MCP/npm, and library profiles and review their readability as
          a set before adopting the grammar.
        - Compare custom miku naming with ecosystem-owned names from `npm pack`
          and Maven classifiers. Record narrow exceptions rather than making an
          npm or Maven artifact misleading merely for textual uniformity.
        - Scan producer scripts, Web runtime downloaders, Agent Skill runtime
          resolvers, documentation, published articles, and direct Release URLs
          before renaming. Existing `*-runtime-<version>.mjs` and
          `*-sources-<version>.*` patterns already have consumers.
        - Treat published historical asset names as immutable. Decide whether
          future-name migration requires consumer-first updates, a bounded dual
          publication release, or retention of the established grammar.
      - Evaluate a machine-readable release manifest recording source tag and
        commit, product/base/release versions, artifact role, filename, size,
        and SHA-256; avoid inventing it if sidecars and profile metadata already
        provide a simpler sufficient contract.
      - Require deterministic archive inputs, ordering, timestamps, metadata,
        and a repeated-build digest check for profiles claiming reproducible
        archives. Record that SHA-256 proves byte integrity, not publisher
        authenticity.
      - Compare broad `release-assets/*` upload globs with explicit paths or a
        verified manifest. A clean staged directory plus an exact expected-file
        check is required before a wildcard can be considered safe.
      - Use current implementations as focused exemplars: reproducible Skill
        zip/checksum/content tests, explicit Node CLI/runtime/source staging,
        Java build plus minimum-runtime smoke, npm pack surface verification,
        and Web staging. Extract the useful controls rather than copying one
        whole workflow into every repository.
      - Produce an artifact-role matrix, naming/checksum decision, exemplar
        map, sorted Release-page fixtures, consumer compatibility map,
        exceptions, and per-repository migration items before changing release
        assets.
      - Wave C confirmed producer/consumer constraints. In particular,
        miku-ms-office-core versioned .mjs/.map has at least seven direct
        vendor/import consumers, while its current verifier lists only three;
        no producer-only filename migration is safe.
    - [x] Run the read-only GitHub Actions audit in parallel subagent waves.
      - With four total execution slots, use one coordinator and up to three
        independent audit workers at a time.
      - Wave A: Node 20-to-22/24 role inventory; release-artifact and filename
        producer/consumer inventory; workflow event/ref/authority structure
        inventory.
      - Wave B: normalized structural and contract clustering; artifact
        profile/checksum/reproducibility proposal; Node profile and migration
        proposal.
      - Each worker reads sibling repositories only and writes a uniquely named
        report under `workplace/miku-soft-reference-audit/`; no two workers edit
        a central plan, state file, or product workflow concurrently.
      - The coordinator validates evidence, resolves cross-report conflicts,
        updates the shared audit matrix and state files, and decides whether a
        proposed finding is ready for user review.
      - After approval, pilot actual workflow changes one representative
        repository/profile at a time. Do not parallelize mutations that share
        templates, consumer contracts, release names, or external GitHub state.
      - [x] Wave A completed on 2026-07-31 with separate reports for Node
        baseline, artifact/name consumers, and workflow contracts:
        `wave-a-node-baseline.md`, `wave-a-artifact-naming.md`, and
        `wave-a-workflow-contracts.md` under
        `workplace/miku-soft-reference-audit/`.
      - [x] Wave B completed on 2026-07-31: normalized all 57 direct
        workflows into 11 Release and 4 CI profile proposals, prepared the
        Node 22/24 and artifact-contract proposals, and drafted the P0-P3
        backlog. The coordinator integration is
        `wave-b-integration.md`; the supporting reports are
        `wave-b-workflow-profiles.md`, `wave-b-node-migration.md`, and
        `wave-b-artifact-contract.md`.
      - [x] Wave C completed on 2026-07-31: W01–W57 workflow inventory,
        producer/consumer register, exception/control register, and the
        15-item developer reference/starter Node register are integrated in
        wave-c-integration.md. This was read-only evidence work.
      - [x] Promote the durable audit result into the shipped skill under
        `skills/igapyon-miku-soft-developer/docs/maintenance/`. Keep raw
        worker reports in ignored `workplace/`, while the tracked copy owns
        the decision packet, numbering plan, Actions profile plan, and backlog.
      - [x] Define routine maintenance adoption and the urgent/narrow skip
        path in `docs/maintenance/adoption-workflow.md`, then route the
        normative maintenance checklist and durable backlog to it.
      - [x] Add the no-specific-change maintenance branch: for a known target
        repository, select and complete a bounded slice of one or more
        compatible, approved, locally verifiable improvements instead of
        stopping because no defect was named.
    - [x] Produce a machine-readable row per workflow with repository revision,
      pre-existing worktree state, product/profile confidence, event and ref
      contract, permissions, toolchains, install/build/test commands, version
      checks, artifact roles, upload behavior, and verification gaps.
      - wave-c-workflow-inventory.md contains the 13-column W01–W57 TSV; the
        inventory's direct workflow list and row count were cross-checked.
    - [x] Cluster the inventory by exact content, normalized structure, and
      contract fingerprint so product literals do not masquerade as design
      differences and visually similar YAML does not hide semantic conflicts.
      - Wave B maps every direct workflow to one of 11 Release or 4 CI
        profile candidates and records contract conflicts, parameters,
        exceptions, and evidence gaps in
        `canonical-workflow-profiles.md` and
        `wave-b-workflow-profiles.md`.
    - [ ] Classify every material difference as intended profile, repository
      parameter, supported policy option, historical drift, contract conflict,
      missing control, explicit exception, or evidence-insufficient.
    - [ ] Validate a small canonical profile set for Node CI/CLI release, Web
      assets, Java runtime, Java Maven plugin, Agent Skill, MCP, and library
      workflows; keep product runtime, Action-internal runtime, and build
      runtime as separate concepts.
    - [ ] Define shared invariants for least authority, trigger/ref/version/tag
      alignment, reproducible dependency installation, staged and verified
      artifacts, smoke gates, rerun behavior, and release concurrency.
    - [ ] Compare copied templates, versioned reusable workflows, thin local
      wrappers, and generated local workflows only after structural clusters
      are known; record the chosen ownership and versioning model.
    - [ ] Create an exception registry and a P0-P3 per-repository migration
      backlog, then pilot one representative repository per approved profile
      before any family-wide rollout.
      - [x] The evidence-backed registry and proposed backlog are recorded in
        wave-c-exception-control-register.md and migration-backlog.md.
      - [ ] Obtain policy decisions and run only the first explicitly approved
        serial pilot; do not treat the backlog as a bulk-edit instruction.
    - Keep all sibling repositories read-only in this phase. Fetch, workflow
      dispatch, release, push, and sibling edits require separate authorization.
  - [x] Complete the first dated primary-source pass for supported Node.js
    versions, GitHub Actions majors, Maven/Java compiler assumptions, and MCP
    protocol guidance.
    - Checked 2026-07-31 against official Node.js lifecycle pages, official
      GitHub Action repositories, Apache Maven Compiler Plugin documentation,
      JUnit documentation, and MCP specification revision 2025-11-25.
    - Keep future rechecks in dated baseline documents rather than copying
      current versions into every layer document.
  - [ ] Classify each finding as valid, conditionally valid, target-state
    guidance, stale, conflicting, or evidence-insufficient.
    - Evaluate four axes independently before assigning the final verdict:
      internal consistency, implementation fit, design rationale/testability,
      and temporal currency.
    - Record sample coverage and counterevidence; absence of a layer is not a
      defect until the reference states that the layer is required for that
      product shape.
  - [x] Prepare a content revision proposal and a separate path-migration map;
    do not mix semantic edits and bulk moves into one unreviewable change.
    - Structure and typed identifier design:
      `workplace/miku-soft-reference-audit/target-structure.md`.
    - Decision gates, phased change sets, and verification matrix:
      `workplace/miku-soft-reference-audit/revision-plan.md`.
    - A read-only scan found 38 files across 25 sibling repositories naming
      current paths, so additive canonical paths and compatibility stubs are
      required; sibling link changes remain a separate authorized SCM phase.
  - [ ] Obtain product-owner decisions for release defaults, Node minimum,
    artifact roles/naming/checksums, Java compatibility mechanics, and the
    typed taxonomy before semantic edits.
  - [ ] Obtain user approval before broad document moves or compatibility-stub removal.
  - [ ] Apply approved changes, regenerate affected `index.json` files, run
    focused checks and the relevant Maven verification, then review Git status
    and the final diff for unrelated changes.
- [x] Initialize lightweight AI agent state files for this repository.
- [x] Fix installed Codex skill visibility issues found on 2026-06-23.
  - Affected source skills in this repository:
    - `skills/igapyon-agent-state-management/agents/openai.yaml`
    - `skills/igapyon-skill-compactor/agents/openai.yaml`
  - Current finding: installed copies exist under `/Users/igapyon/.codex/skills`,
    but these skills are absent from the session's available-skills list.
  - Likely cause: both affected skills contain
    `policy.allow_implicit_invocation: false`, while visible hard-trigger
    skills such as `igapyon-miku-prompt-lint` and `igapyon-ffmpeg-helper` do
    not use that policy field.
  - Proposed fix: remove `policy.allow_implicit_invocation: false` from these
    `agents/openai.yaml` files, relying on `SKILL.md` trigger wording to
    prevent accidental activation.
  - Changed in repository: removed `policy.allow_implicit_invocation: false`
    from both affected `agents/openai.yaml` files.
  - Installed copies updated under `/Users/igapyon/.codex/skills`.
  - Verified in fresh session: `igapyon-agent-state-management` and
    `igapyon-skill-compactor` appear in the loaded skill list.
- [x] Prevent template Agent Skill assets from being loaded as real skills.
  - Current symptom: `skills/igapyon-miku-soft-developer/assets/agent-skills/skills/__SKILL_NAME__/SKILL.md`
    appears in Codex's available-skills list as `__SKILL_NAME__`.
  - Proposed fix: move the template out of any directory shape matching
    `*/skills/*/SKILL.md`, rename the template file so it is not `SKILL.md`, or
    adjust the packaging/install process to exclude nested template skills from
    installed `.codex/skills` discovery.
  - Changed in repository: moved the skeleton from
    `assets/agent-skills/skills/__SKILL_NAME__/` to
    `assets/agent-skills/templates/skill/`, renamed template `SKILL.md` to
    `SKILL.md.template`, and updated workflow references.
  - Installed copy updated under `/Users/igapyon/.codex/skills`.
  - Verified in fresh session: `__SKILL_NAME__` no longer appears in the
    available-skills list.
- [x] Update bundled skills later.
  - User note on 2026-06-23: bundled skills will need to be updated later.
  - Before starting, identify which bundled skills are meant and whether the
    source of truth is this repository's `skills/` tree, installed
    `/Users/igapyon/.codex/skills`, or plugin/cache-provided skills.
  - After updating, refresh any generated indexes or package artifacts required
    by the affected skills and verify the loaded available-skills list if
    discovery behavior may change.
  - Completed on 2026-06-29 for release-bundled external skills in `pom.xml`.
    Checked upstream tags for all 9 external skill repositories; only
    `miku-ms-office-skills` had a newer tag than the pinned ref.
  - Changed release pin and README list from `miku-ms-office-skills` `v0.4.1`
    to `v0.4.2`.
  - Verified with `mvn package`; release staging and
    `target/igapyon-agent-skills-1.20260629.2.zip` were generated
    successfully.

### Blockers

- なし

### Retry Log

Use this section only when the same task or error is repeated.
If the same failure appears 3 times, stop and ask the user.

- なし

## 絶対パス残存の懸念

- [ ] リポジトリ内に残る実環境依存の絶対パスを相対パスまたは環境変数表記へ置き換える
  - [x] `skills/igapyon-skill-compactor/references/agent-skill/frontmatter-templates.md`
    - `$CODEX_HOME` 表記へ修正済み
    - `skills/igapyon-skill-compactor/index.json` は `miku-indexgen` で再生成済み
  - `skills/igapyon-mikuku-agent/references/graphic-recording.md`
  - `skills/igapyon-mikuku-agent/references/graphic-recording/*.md`
  - `skills/igapyon-mikuku-agent/references/graphic-recording/scripts/*.mjs`
    - `igapyon-agent-skills` 内の `workplace/` や `assets/` を絶対パス参照している
    - scripts は実行時に壊れる可能性があるため、相対パス化または `import.meta.url` 起点への修正を検討する
  - `skills/igapyon-ffmpeg-helper/references/decisions/youtube-output-policy.md`
    - sibling repo `local-html-tools` への参照を相対パス化できるか確認する
  - `skills/igapyon-miku-soft-developer/references/existing-miku-soft-repositories.md`
    - sibling checkout 置き場の説明が個人環境の絶対パスになっている
  - この `TODO.md` 内にも過去検証コマンドとして絶対パスが残っている
- [ ] 例示目的の `/Users/<name>/...`、`/home/<name>/...`、`/tmp/example` などは実パスではないため、置換対象から除外してよいか確認する

## igapyon-skill-compactor 次段階

### 実動作安定化（最優先）

以下は上から順に実施する。少なくとも 1 から 8 まで完了するまでは、現行の
prompt test が成功しても実動作が保証されたとは扱わず、肥大化した実 Skill への
本格適用を開始しない。

- [x] [High] 1. 現行実装の baseline と改善対象を固定する
  - 対象を `skills/igapyon-skill-compactor/` の source 版とし、テスト開始時に
    source 版と配備版の `SKILL.md` hash、Git commit、Codex CLI version、model、
    reasoning mode、sandbox、実行日時を記録する
  - source 版と配備版が一致しない場合はテストを開始せず、drift として失敗させる
  - 現行の制御ケースとして、発火条件、`config/deploy.yaml`、service ID、health URL、
    test、明示確認、deploy、health check、rollback、出力契約を含む小さな
    `deploy-helper` fixture を保存する
  - 現行再現値「入力 1,140 文字から 839 文字、約 26.4% 削減、実行全体
    24,927 tokens」を比較用 baseline として記録する。ただし total tokens は
    system/context/output を含むため、Skill 固有の純増値とは扱わない
  - baseline の raw log と結果は run ID ごとの別ディレクトリへ保存し、後続 run で
    同じ `${id}.json` や `summary.json` を上書きしない

- [x] [High] 2. activation と meta work の境界を一意にする
  - frontmatter `description` と本文の Activation Gate を同じ契約にそろえる
  - 単に `igapyon-skill-compactor` という名前を出しただけでは適用せず、
    「使う」「適用する」または具体的な Agent Skill compaction 依頼がある場合に発火する
  - 存在確認、説明、設計相談、この Skill 自体の review・監査・不具合診断・更新は
    compaction workflow を適用しない meta work として明記する
  - この Skill 自体を実際に compact する依頼だけは、明示的な apply intent があれば
    通常の compaction 対象として扱う
  - activation matrix に最低限、explicit apply、Agent Skill compaction without name、
    mention-only、existence question、self meta review、generic Markdown edit、
    new Skill creation を含める
  - should-trigger、should-not-trigger、mention-only の期待値が frontmatter、本文、
    test case の3箇所で矛盾しないことを確認する

- [x] [High] 3. `SKILL.md` に最小の実行契約を置く
  - conditional reference を読まなくても、次の core loop だけは毎回実行されるようにする
    1. 対象、最適化対象、mode、許容損失、変更可能範囲を確定する
    2. source contract と typed structured inventory を抽出する
    3. keep / move / rewrite / delete / split / no change の placement map を決める
    4. 許可された範囲だけを変更する
    5. 圧縮後から inventory を再抽出し、source inventory と比較する
    6. critical item の欠落を修正してから、測定値と検証結果を報告する
  - source contract には activation、non-activation、入力、出力、必須手順、順序、
    command、path、ID、URL、code example、条件、禁止、例外、fallback、安全境界、
    human confirmation、validation、reference route を含める
  - `conservative` では critical item の欠落を失敗とし、曖昧な項目は削除せず保持する
  - `structural` と `summary` で失ってよい情報を明記し、mode 名だけで許容損失を
    暗黙決定しない
  - architecture、split、toolization、MCP、意味が不明な共通化、critical item の削除だけを
    human-decision point とする。通常の保守的な局所圧縮は不要な確認質問で止めない
  - source が既に十分小さい、または削減効果が参照追加・保守コストを下回る場合は、
    `no change` を正常な完了結果として選べるようにする

- [x] [High] 4. compaction の成功条件を測定可能にする
  - 作業前に、最適化対象を次から明示する
    - always-loaded `SKILL.md`
    - 通常の1回の実行で読む Skill-local context
    - Skill directory 全体
    - end-to-end の input / cached input / output / reasoning / rerun cost
  - before / after で少なくとも UTF-8 bytes、line count、常時ロード対象、追加・削除した
    reference 数を記録する。利用可能なら同一 tokenizer または同一 runtime の token 数も記録する
  - token 測定方法が変わった結果を直接比較しない。model/runtime/tokenizer を結果へ含める
  - 削減量だけでなく、保持した critical inventory、意図的に許容した loss、追加した
    lookup step、通常実行で新たに必要になる reference read を報告する
  - 固定の削減率だけを成功条件にしない。削減が小さくても安全上必要なら保持し、
    将来の反復回数や runtime 経路から利益が見込めない場合は `no change` とする
  - default の最終報告は mode / treatment、before-after、preserved critical contract、
    moved/deleted、validation、remaining risk に絞る。該当しない system decision や
    checklist 項目を儀式的に水増ししない

- [x] [High] 5. reference routing を「必須」と「条件付き」に分離する
  - `SKILL.md` に core loop と critical safeguards を残し、詳細 inventory 候補、mode の
    長い説明、例、checklist、system-level techniques だけを conditional reference にする
  - `references/agent-skill/compaction-modes.md` の案内を「mode 選択」だけにせず、
    structured inventory、code preservation、round-trip の詳細が必要な時に読むことを明記する
  - `references/agent-skill/compaction-workflow.md` は substantial edit、split、tool/MCP、
    architecture などの大きな判断に限定し、小さな局所圧縮では読まない
  - `references/system/token-efficiency-techniques.md` から checklist selector を小さな入口へ
    分離し、既知の Agent Skill compaction で technique catalog 全体を読まない
  - 各 route に「読む条件」と「読まない条件」を書き、既知の direct route がある場合は
    discovery のためだけに `index.json` 全体を読まない
  - 単純な conservative fixture では `README.md`、`tests/`、全 technique catalog、
    無関係な checklist を読まないことを tool event で確認する
  - `index.json` を Skill 全体の file inventory と呼ぶなら `.jsonl`、`.mjs`、`.yaml` も
    生成対象へ含める。含めない場合は Markdown/JSON discovery index と明記し、runner、
    test cases、`agents/openai.yaml` の別導線を用意する

- [x] [High] 6. prompt test runner を raw execution と独立評価の二段に作り直す
  - SUT 実行には `testCase.prompt` だけを渡し、`expected`、`checks`、期待 `target`、
    既知の defect、修正案を渡さない
  - repository-local Skill だけを隔離した一時 Codex environment へ stage し、実行前に
    読み込む `SKILL.md` の locator と hash を検証する。隔離または同一性を証明できない場合は失敗する
  - activation と routing は `--sandbox read-only`、編集 behavior は disposable fixture
    だけを `workspace-write` にし、実 Skill や user workspace を変更しない
  - SUT の JSON events、tool calls、読んだ local file、最終応答、fixture の before/after diff、
    終了コードを run artifact として保存する
  - SUT 完了後にだけ、独立 evaluator へ raw artifact と hidden expectations を渡す
  - runner 自身が output file の存在、JSON parse、schema、`actual === expected`、target、
    各 assertion、diff、禁止された file read を検査する
  - output 欠落、invalid JSON、`pass: false`、wrong actual、wrong target、未評価 assertion、
    critical inventory 欠落のどれか1件でもあれば suite を非ゼロ終了にする
  - subprocess の終了コード 0 を semantic success と同一視しない
  - baseline と post-change は別 run directory に保存し、比較 command と summary を生成する
  - `expected-result-schema.json`、evaluator prompt、`tests/INDEX.md` の optional / required field、
    enum、例を同じ契約にそろえる

- [x] [High] 7. artifact を使う behavior test を追加する
  - classification enum だけでなく、入力 fixture、圧縮後 artifact、source inventory、
    output inventory、inventory diff、測定値を評価対象にする
  - 最低限、次の fixture を用意する
    - ID、URL、command、explicit confirmation、failure stop、rollback を含む deployment workflow
    - code fence、configuration、API shape を含む Skill
    - prose 内に command、path、禁止、fallback が埋め込まれた Skill
    - populated form value、log、test result、concrete evidence を含む Skill
    - tone、audience、禁止表現、output contract を含む writing Skill
    - branching / state transition / fallback を含み、Mermaid の要否を判断する Skill
    - 意味が異なる近似文と、同一 local context の単純重複を両方含む Skill
    - 既に十分小さく、`no change` が正しい Skill
  - 各 fixture で conservative / structural / summary の allowed loss を別々に定義する
  - conservative では command、path、ID、URL、code、禁止、fallback、confirmation、
    validation、activation、output contract の欠落を必ず失敗にする
  - routing test は「読むべき target の自己申告」ではなく、tool event に実際の file read が
    存在することと、不要な file read がないことを検査する

- [x] [High] 8. runner 自体の failure detection を先に検証する
  - `--codex-bin /usr/bin/true` のように終了コード 0 だが output を生成しない stub を使い、
    suite が必ず失敗することを確認する
  - valid JSON だが `pass: false`、wrong `actual`、wrong `target`、assertion 未評価の fixture を
    それぞれ与え、すべて非ゼロ終了になることを確認する
  - critical command、ID、URL、confirmation、rollback を1個ずつ意図的に落とした mutation を
    評価し、各 mutation が対応 assertion で検出されることを確認する
  - expected/checks を SUT input へ混入させた場合に harness validation が失敗する leakage check を追加する
  - read-only case で write event が発生した場合、または disposable root 外への write が
    試みられた場合に失敗する sandbox check を追加する

- [x] [High] 9. fresh session で安定性と context load を受け入れ確認する
  - activation / non-activation / mention-only / meta-work matrix を独立した fresh session で
    最低3回実行し、結果が一致することを確認する
  - conservative の critical preservation fixture と `no change` fixture を独立した fresh session で
    最低2回実行し、inventory diff と treatment が一致することを確認する
  - simple fixture の tool trace で、`SKILL.md` と高々1個の targeted reference だけで
    完了できることを目標とし、余分な `README.md`、tests、全 checklist、全 techniques の読込を
    regression として扱う
  - total tokens だけでなく、Skill-local read bytes、tool call 数、出力 tokens、再試行回数を
    baseline と比較する
  - model 依存で結果が揺れる case は成功扱いにせず、期待を狭める、契約を明確にする、
    deterministic assertion へ移す、または既知の不安定 case として隔離する

- [x] [Medium] 10. source 更新、生成物、配備版を同一 artifact として検証する
  - `SKILL.md`、必要な references、tests、runner、schema、README を更新する
  - `mvn generate-resources` を実行し、`skills/igapyon-skill-compactor/index.json` の差分が
    対象ファイルの追加・削除・size・metadata 変更だけであることを確認する
  - repository validator と新しい prompt test suite を source 版に対して実行する
  - `sh scripts/sync-codex-skill.sh igapyon-skill-compactor` で配備し、
    `sh scripts/sync-codex-skill.sh --check igapyon-skill-compactor` が終了コード 0 になることを確認する
  - fresh session で配備版 locator / hash を記録して acceptance suite を再実行する
  - source 版でテストした artifact と最終配備 artifact の hash が同一であることを確認する
  - 実行日、Codex/model/runtime、source/installed hash、baseline/post の測定値、
    activation matrix、mutation test、残余リスクをこの TODO 項目へ追記して完了にする

#### 完了証跡（2026-07-17、Asia/Tokyo）

- baseline は `tests/baseline-known.json` に固定した。旧 `SKILL.md` hash は
  `7e7d8897...eada`、既知の実行値は 1,140 文字から 839 文字（約 26.4%）、
  run total 24,927 tokens。total は Skill 固有値ではなく比較上の注意値とした。
- runtime は Codex CLI `0.144.5`、model `gpt-5.6-sol`、reasoning は主に `low`
  （baseline と最初の critical run は `medium`）。各 run の正確な metadata、raw event、
  stderr、trace、artifact diff、評価結果は Git 管理外の
  `workplace/skill-compactor-tests/<run-id>/` に保存した。
- activation / non-activation / mention-only / meta-work の 7 ケースを各3回、合計21 fresh
  session で実行し 21/21 成功した（run `20260717T010228707Z-38727`）。
- `deploy-helper` の critical preservation は独立 evaluator 込みで2回成功した。
  command、path、service ID、URL、test failure stop、明示確認、initial request 境界、
  health failure rollback、output contract を保持した。`no change` fixture も2/2成功し、
  両回とも artifact 無変更、Skill-local read は `SKILL.md` だけだった。
- routing 実トレースにより、reference を target workspace 相対で誤解決する欠陥を発見し、
  loaded `SKILL.md` の親 directory 相対へ固定した。6 route の必要 reference read は確認済み。
  route-001/003 は suite 中に CLI が exit 0 と最終応答を返しながら `turn.completed` event
  だけを欠く一過性失敗があり、runner は失敗として検出した。両ケースの独立再実行は成功した。
- runner unit test は15件成功。exit 0 / outputなし、invalid JSON、evaluator `pass:false`、
  wrong/missing assertion、oracle leakage、read-only write、root外 write、command / ID / URL /
  confirmation / rollback の個別 mutation、read detector の誤認を検出する。
- simple case の post 値は input 75,594、cached input 67,328、output 1,660、reasoning 290
  tokens。Skill-local read は `SKILL.md` のみ。旧 total 24,927とは計測境界が異なるため、
  直接の削減率比較はしていない。
- `mvn generate-resources`、repository validator、runner unit test、source prompt tests、
  `sync-codex-skill.sh` と `--check` を完了した。最終 source / installed `SKILL.md` hash は
  ともに `b8674992d2160eba1d1f6afca8cb221b6fd107b68d9926ab3030c07f61c7ef55`。
  hash gate を有効にした配備後 fresh acceptance も成功した
  （run `20260717T045557230Z-53170`）。
- 残余リスクは Codex CLI event stream の一過性 `turn.completed` 欠落と、model/runtime 更新時の
  token・routing 揺れ。runner はいずれも false green にせず、run artifact を残して非ゼロ終了する。

### 既存の改善履歴と候補

- [x] RAG-ready 的な前処理観点として、優先度の高い3件を `igapyon-skill-compactor` に反映した
  - [x] Typed Inventory Schema 相当
    - `Structured Inventory Rule` として、commands / paths / inputs / outputs / constraints / prohibitions / fallbacks / validation / risks / references に加え、tone rules / review criteria / style constraints なども型付き一覧として扱う方針を追加
    - 箇条書きだけでなく、文中に埋まったコマンド、パス、条件、禁止事項、例外、fallback、検証、生成物、文体規則、レビュー基準なども抽出して、近くの明示一覧と統合する方針を追加
  - [x] Importance / Criticality 相当
    - `summary` でも、まず structured inventory を抽出し、重要度を付け、代表要素を残してから要約する方針を追加
    - `conservative` / `structural` / `summary` それぞれで、structured inventory をどう維持・選別するかを明文化
    - Mermaid / 箇条書き / 表 / 短い文章はモードではなく対象構造に基づいて選ぶ、という representation 選択ルールを追加
    - source code examples / code fences / configuration snippets / API examples は structured inventory として扱い、conservative では削除・要約消去せず、保持または明示参照へ移動する方針を追加
  - [x] Round-Trip Check 相当
    - 圧縮後から structured inventory を再抽出し、元の一覧と比較する `Round-Trip Check Rule` を追加
    - `behavior-009` から `behavior-016` として、一覧維持、summary 前の一覧抽出、隣接近接重複の局所統合、文中埋め込み要素の一覧統合、round-trip inventory 比較、非技術の文章スタイル指示の structured inventory 抽出、Mermaid のモード非依存な表現形式選択、conservative でのコード例保持を `codex exec` 実評価で確認
- [ ] RAG-ready 的な前処理観点の残り候補は保留する
  - [ ] Canonical Facts
  - [ ] Provenance
  - [ ] Loss Budget
  - [ ] Retrieval Hints
  - [ ] Contradiction / Duplicate Check
  - [ ] Mode-Specific Golden Examples の拡充
- [ ] `igapyon-skill-compactor` を実際に肥大化した既存 Agent Skill へ適用し、運用上の違和感を確認する
  - 前提: 上記「実動作安定化」の 1 から 10 を完了し、現行 prompt test の
    self-classification ではなく raw execution と artifact diff で検証できる状態にする
  - 使いにくいチェック項目がないか
  - 過剰に読ませる参照がないか
  - `SKILL.md` から必要な参照へ迷わず辿れるか
  - `distilled/` で十分な場面と元資料へ戻る場面が分かれるか
  - 出力サマリが実務にちょうどよいか
- [ ] 実適用で見つかった違和感を、1件ずつ小さく改善する
- [ ] `distilled/`、`tests/`、`templates/`、`examples/`、`assets/` などのトップ層構造を、他の Agent Skills にも横展開できるか確認する
  - 蒸留済み資料が一級の runtime entry point なら top-level `distilled/` を検討する
  - activation / non-activation / behavior / reference-routing prompts などの検証資産は top-level `tests/` を検討する
  - 既存の `references/distilled/` や参照内テストプロンプトを移動する場合は、`SKILL.md`、`index.json`、参照リンク、README の導線も更新する
  - 小さなSkillやlegacy構造では、移動せず現状維持の方が軽い場合もある

## igapyon-ffmpeg-helper 作業メモ

- [x] `skills/igapyon-ffmpeg-helper/` を新規 Agent Skill として作成した
- [x] hard trigger 方針にした
  - 発火する例: `igapyon-ffmpeg-helper`, `igapyon FFmpeg helper`, `ffmpeg helper`, `FFmpeg helper workflow`, `FFmpeg helper runbook`, `ffmpeg runbook igapyon`, `igapyon ffmpeg runbook`
  - 通常の FFmpeg / H4essential / YouTube / loudnorm / gain / trim 相談では自動発火しない
- [x] `SKILL.md` は入口とガードレールに絞り、詳細は `references/` に分離した
- [x] first cut workflow を `references/workflows/h4essential-orchestra-youtube.md` に作成した
  - H4essential オーケストラ録音フォルダ
  - WAV トラック選択
  - VLC で人間が切れ目確認
  - cut memo を agent に戻す
  - trim
  - loudnorm JSON 測定
  - `volume=...dB` の単純ゲイン仕上げ
  - 必要なら結合
  - 静止画 + 音声で YouTube 用 MP4 作成
  - YouTube Studio で手動アップロード
- [x] process runbook を `references/process/` に分割した
  - `h4essential-input-discovery.md`
  - `workspace-and-command-log.md`
  - `audio-trim.md`
  - `peak-gain-normalize.md`
  - `audio-concat.md`
  - `still-image-youtube-video.md`
  - `youtube-manual-upload.md`
- [x] H4essential 入力仕様を記録した
  - 例: `/Volumes/ZOOM_H4E/260114_160901/260114_160901_TrMic.WAV`
  - 実処理は録音フォルダをローカルに複数コピーしてから開始
  - `TrMic`, `TrLR`, `Tr1`, `Tr2` を候補として扱う
  - `TrMic` と `TrLR` が両方ある場合などは勝手に選ばず確認する
- [x] trim 方針を記録した
  - first cut では切れ目・ファイル境界は人間判断
  - VLC 使用を強く推奨
  - cut memo 形式を定義
  - `01:23` は 1分23秒
  - `00:01:23.500`, `83.5` のような小数秒指定も許容
  - 前だけカット、後ろだけカット、両端カット、カットなしに対応
- [x] 音量調整方針を記録した
  - 参照元: `https://igapyon.github.io/local-html-tools/ffmpeg/ffmpeg-loudnorm-cmdline-gen.html`
  - 仕上げ処理としての loudnorm は使わない
  - 測定フェーズでは `loudnorm=print_format=json` で `input_tp` を得る
  - 仕上げフェーズでは `volume=...dB` のみ
  - target true peak は `-0.5 dBTP`
  - コンプなし、リミッターなし
  - hi-res / lo-res を選択可能
    - hi-res: `-ar 192000 -sample_fmt s32 -c:a pcm_s24le`
    - lo-res: `-ar 44100 -sample_fmt s16 -c:a pcm_s16le`
  - 仕上げ後に verification measurement を行う方針を追加した
- [x] 作業フォルダ方針を記録した
  - per-job directory: `workplace/h4essential-260114_160901/` など
  - `commands.log` に実行/提示コマンドを残す
  - 作業フォルダ内にログや測定出力を積極的に保存してよい
  - 例: `ffmpeg-version.txt`, `01_gain-meta.json`, `01_gain-verify-meta.json`, `01_trim.log`, `01_gain.log`, `youtube-video.log`
- [x] `ffmpeg -version` は必須にした
  - conversion command 実行前に必ず実行
  - `commands.log` に記録
  - `ffmpeg-version.txt` に保存
  - 失敗したら workflow を止める
- [x] YouTube 動画作成方針を記録した
  - 静止画 + 音声
  - MP4 / H.264 / yuv420p / AAC 48kHz 320kbps
  - 1920x1080, 画像全体を保持して padding
  - `-movflags +faststart`
  - YouTube API ではなく YouTube Studio から手動アップロード
- [x] 自己レビューして改善した
  - `ffmpeg -version` をログ化
  - 測定コマンドを `tee` ではなく redirection へ寄せた
  - `input_tp` が parse できない場合は次へ進まない
  - 仕上げ後の再測定を追加
  - no-trim 判定の文言を整理
- [x] 検証済み
  - `python3 /Users/igapyon/.codex/skills/.system/skill-creator/scripts/quick_validate.py /Users/igapyon/Documents/git/igapyon-agent-skills/skills/igapyon-ffmpeg-helper`
  - `mvn generate-resources`
- [ ] 再開時の確認候補
  - `commands.log` だけでなく各 ffmpeg 実行ログをどこまで標準化するか
  - `ffmpeg -version` のコマンド自体も `commands.log` に記録する現方針で十分か
  - hi-res / lo-res のデフォルトを決めるか、毎回聞くか
  - verification measurement の許容誤差を明文化するか
  - 無音検知を「VLC確認用の候補出し」として process 化するか
  - `README.md` の skill 一覧説明をさらに詳しくするか

## Note 記事 TODO

- [x] 新記事候補「GPT-5.5とQwen3では、最適なプロンプト / Agent Skills 像が異なる」は記事側リポジトリへ移動済み
  - 主題: コンテンツ型 Agent Skills は共通資産に保ち、GPT-5.5 / Qwen3-Thinking 併用時はモデルの思考特性に合わせて駆動方法や進め方を分ける
- [ ] 旧素材メモ `xxxxxxxx-general-content-agent-skills-token-context.md` から、3本の記事へ未展開だった補助論点を必要なら別記事または追補へ展開する
  - キャッシュやバッチ処理によるトークン消費量抑制
  - 用途に対して過剰に高価なモデルを使わない、というモデル選択の観点
  - 課金体系によっては Web UI のほうが有利な場合もある、という利用形態ごとの注意
  - 扱っているトークン自体の質が高まると、回答や作業の安定感も良くなる、という副産物の表現
  - いずれも `20260530-token-consumption-01-basics.md`、`20260531-token-consumption-02-reduction.md`、`20260531-token-consumption-03-agent-skills-reduction.md` の中心主題からはやや外れるため、現時点では TODO に留める
- [ ] `../mikuku-articles/2026/05/20260516/20260516-content-agent-skills.md` に、コンテンツ型 Agent Skill の中にも種類があることを短く追記する
- [ ] 既存記事では詳細分類まで踏み込まず、新記事への導線として扱う
- [x] 新記事「コンテンツ型 Agent Skill にはどんな種類があるか」を作成し、知識ベース型、テンプレート型、文体・キャラクター型、レビュー基準型、事例集型、索引・入口型などを整理する
- [x] 新記事では、各分類が排他的ではなく複合しうること、構成の分類と接続方法の分類を混ぜすぎないことを書く
- [x] 新記事では、知識ベース型 Agent Skill を、厳選型、蓄積型、照合型、まとめ育成型、索引付き知識ベースとして整理する
- [x] 蓄積型では、高品質少量 knowledge を待つと始められない現場があり、粒度や品質にばらつきのある中品質大量 knowledge を先にためる運用を書く
- [x] 照合型では、古い設計情報、更新が追いついていない設計メモ、機能強化の変更メモ、最新版ソースコードを併せて読むことで意味が出ることを書く
- [x] 古い設計情報には、ソースコードから読み取りにくい要求、思想、判断理由、当時の制約や優先順位が残っていることを書く
- [x] まとめ育成型では、中品質大量 knowledge をもとに、要約・観点整理によって高品質少量 knowledge を導出し、Agent Skill に戻す循環を書く
- [x] 知識ベース型 Agent Skill は、vector DB や embedding index を明示的に使わなくても、Codex や GitHub Copilot が repository 内の Markdown / source code を探索して RAG っぽく効くことを書く
- [x] 本格的な RAG 基盤ではなく、repo-native な知識ベース運用として説明し、最近の生成AI agent の能力向上によって成立していることを書く
- [x] 静的な Markdown 群でも、生成AI agent が読み、照合し、要約し、作業に反映すると、知性に似たものを感じさせることを書く
- [x] `../mikuku-articles/2026/05/20260523/20260523-content-agent-skill-types.md` の公開・内容確定後、`skills/igapyon-mikuku-agent/references/examples/articles/` に文体参考用コピーとして反映する

## 作成済みだが未公開候補の記事

- [x] `../mikuku-articles/2026/05/20260523/20260523-content-agent-skill-types.md`
  - `コンテンツ型 Agent Skill にはどんな種類があるか`
  - 公開済み、`mikuku-articles` 側へ移動済み
- [ ] `../mikuku-articles/2026/draft/20260523-miku-indexgen-spec-draft.md`
  - `[miku-indexgen] AI エージェントに読ませる前に、ディレクトリの索引を作る`
  - `URL: 未公開`、`状態: 下書き`
- [ ] `../mikuku-articles/2026/draft/202606xx-general-agile-thinking.md`
  - `アジャイルという考え方に入門する`
  - `URL: 未公開`、`状態: 下書き`
- [ ] `../mikuku-articles/2026/draft/202606xx-general-modern-agile-terms.md`
  - `現代のアジャイルは、周辺語が多すぎる`
  - `URL: 未公開`、`状態: 下書き`
- [ ] `../mikuku-articles/2026/draft/202606xx-general-object-oriented-thinking.md`
  - `オブジェクト指向という考え方に入門する`
  - `URL: 未公開`、`状態: 下書き`
- [ ] `../mikuku-articles/2026/draft/2026XXXX-mikuscore-skills-intro.md`
  - `[mikuscore] 譜面フォーマット変換の前提を、毎回説明しなくてよくしたかった話`
  - Note 側で `URL: （未記入）`
- [ ] `skills/igapyon-qiita-writer/references/mikuscore/2026XXXX-mikuscore-skills-intro.md`
  - `[mikuscore] Agent Skills で MusicXML / ABC / MIDI などの変換方針を会話で扱いやすくした`
  - Qiita 側で `URL: （未記入）`
- [ ] `skills/igapyon-qiita-writer/references/mikuproject/20260409-mikuproject-agent-skills-wbs-planning.md`
  - `[mikuproject] Agent Skills で WBS の叩き台作成とブラッシュアップ`
  - front matter はあるが `url` / `published_to` が未記入
- [ ] 素材メモ扱いか公開記事候補かを確認する
  - `skills/igapyon-qiita-writer/references/general/20260430-miku-soft-architecture-topic-bank.md` は `URL: N/A`
  - `skills/igapyon-qiita-writer/references/miku-xlsx2md/xlsx2md-feature-list-memo.md` は URL 行なし

## igapyon-miku-soft-developer review 整理

- [ ] Node.js 20 EOL後のスターター互換性方針を更新する
  - 2026-07-20時点でNode.js 20はEOLだが、新規スターターが
    `engines.node: ">=20"`、CIマトリクス `[20, 24]` を採用している
  - 最低対応版をNode.js 22へ引き上げ、`engines.node`、CIマトリクス、
    関連ドキュメントを `>=22` / `[22, 24]` へ同期することを検討する
  - ReleaseビルドのNode.js 24は維持する
  - `actions/checkout@v6`、`actions/setup-node@v6`、
    `actions/setup-java@v5`、`softprops/action-gh-release@v3` は
    Node.js 24対応世代として現行方針と整合している
  - この項目の棚卸し、役割分離、判断基準、移行順序は
    `## AI Agent Current Tasks` の GitHub Actions 監査と
    `workplace/miku-soft-reference-audit/github-actions-audit-plan.md` を正本とする
  - ReleaseをNode.js 24で一度だけ構築し、対応下限を`>=22`とする成果物は
    Node.js 22でもsmokeする案を検証する
- [x] `skills/igapyon-miku-soft-developer/references/review/node-cli.md` に、他の review note と同じ `Severity Guidance` と `Review Output` を追加するか検討する
- [x] `skills/igapyon-miku-soft-developer/references/review/` の入口として、各 review note の使い分けを説明する `README.md` または index 的な案内を追加するか検討する
- [x] `skills/igapyon-miku-soft-developer/references/review/` 以下の review note 全体を整理し、ファイル粒度、見出し構成、分類条件、`Severity Guidance`、`Review Output` の揃い方を確認する
- [x] `node-cli.md` と `single-file-web-app.md` の UI / CLI alignment 観点が重複・補完関係として自然に読めるか確認する
- [x] `release-automation.md` と `node-cli.md` の single-file CLI runtime / source archive / npm pack の artifact role 用語をそろえる
- [x] `agent-skills.md` と `mcp-server.md` の backend / transport / HTTP fallback / network visibility の用語をそろえる
- [x] 全体レビュー観点として、リリース自動化まわりの実装漏れを重点的に確認できるようにする
- [x] バージョン番号は、基本的に出来立ての miku-soft repository では `0.5.0` にし、`-SNAPSHOT` を付けない状態をチェック観点に加える

## igapyon-mikuku-agent グラレコ作業ディレクトリ整理

- [x] グラレコ生成の保存先決定ルールを、原理原則として「カレントフォルダで処理する」に統一する
- [x] 対象が Git リポジトリでない場合、別の場所を探しに行かず、カレントフォルダ直下に `workplace/` を作成してその中で処理する
- [x] `skills/igapyon-mikuku-agent/references/graphic-recording.md` の `{{RUN_OUTPUT_DIR}}` 決定ルールを、カレントフォルダ優先・非Git時 `./workplace/` 作成に更新する
- [x] `skills/igapyon-mikuku-agent/references/graphic-recording/10-article-to-graphic-recording-text-prompt.md`、`20-graphic-recording-explainer-image-prompt.md`、`30-generate-graphic-recording-image-prompt.md`、`40-article-section-graphic-recording-batch-prompt.md` の保存先決定ルールを同じ方針にそろえる
- [x] Git リポジトリ内の場合も、記事や入力ファイルが属する別リポジトリへ移動せず、明示された `{{RUN_OUTPUT_DIR}}` または現在の作業カレント配下の `workplace/` を使う方針にする
- [x] `skills/igapyon-mikuku-agent/references/graphic-recording/scripts/split-article-sections.mjs` を追加し、記事 Markdown から `sections/001/section-source.md` 形式で一括分割できるようにする
- [x] `skills/igapyon-mikuku-agent/references/graphic-recording/scripts/copy-section-image.mjs` を追加し、生成画像を `sections/<NNN>/graphic-recording.png` へ明示コピーして `TODO.md` を更新できるようにする
- [x] `skills/igapyon-mikuku-agent/references/graphic-recording/scripts/validate-run-dir.mjs` を追加し、`TODO.md` と各セクションの4ファイル構成を検証できるようにする
- [x] `skills/igapyon-mikuku-agent/references/graphic-recording/scripts/compose-section-image-prompts.mjs` を追加し、LLM が作成した `section-text.md` とみくく描画プロンプト本文を合成して `image-prompt.md` を作れるようにする

## miku Agent Skills 同梱名の igapyon- prefix 移行

- [x] `miku-indexgen-skills` は同梱時の正式 skill 名、`SKILL.md` frontmatter `name`、展開後ディレクトリを `igapyon-miku-indexgen` にする方針へ移行済み
- [x] `miku-text-bundle-skills` は `v1.0.1` で同梱時の正式 skill 名、`SKILL.md` frontmatter `name`、展開後ディレクトリを `igapyon-miku-text-bundle` にする方針へ移行済み
- [x] `miku-repo-bundle-skills` は `v0.5.0.1` で release archive に同梱する
  - 同梱先: `skills/igapyon-miku-repo-bundle/`
  - status: experimental
- [x] `miku-grep-skills` は `v0.10.1.1` で同梱時の正式 skill 名、`SKILL.md` frontmatter `name`、展開後ディレクトリを `igapyon-miku-grep` にする方針へ移行済み
  - status: experimental
  - 互換 trigger として `miku-grep` は維持する
  - `miku-text-file-ops-skills`への同梱先変更に伴い、release archiveの外部skill同梱対象からは除外する
- [x] `miku-readfile-skills` は`miku-text-file-ops-skills`への同梱先変更に伴い、release archiveの外部skill同梱対象から除外する
- [x] `miku-text-file-ops-skills` `v0.3.5` をrelease archiveに同梱する
  - 同梱先: `skills/miku-text-file-ops/`
- [x] `miku-text-file-ops-skills` `v0.4.2` で正式 skill 名と同梱先を `igapyon-` prefix 付きへ移行する
  - 正式 skill 名: `igapyon-miku-text-file-ops`
  - 同梱先: `skills/igapyon-miku-text-file-ops/`
  - 互換 trigger: `miku-text-file-ops`, `miku-text-file-ops-skills`
- [x] `miku-project-skills` `v0.12.4` を、正式 skill 名 `igapyon-miku-project` として release archive に同梱する
  - 同梱先: `skills/igapyon-miku-project/`
- [x] `miku-score-skills` `v0.6.1` を、正式 skill 名 `igapyon-miku-score` として release archive に同梱する
  - 同梱先: `skills/igapyon-miku-score/`

## miku-soft アーキテクチャ考察メモ

- [x] 再開時はまず `README.md` とこの `TODO.md` を読む
- [x] その後、`workplace/miku-soft/miku-soft-*` を読み込んでから作業を再開する
  - 2026-05-25 時点では `workplace/miku-soft/` は存在しないため、`skills/igapyon-miku-soft-developer/references/miku-soft-basic/` を参照元として作業継続
- [x] 現在の記事シリーズ用ネタ貯蔵庫は `skills/igapyon-qiita-writer/references/general/20260430-miku-soft-architecture-topic-bank.md`
- [x] 今回は記事完成ではなく、Qiita 記事化する前の論点出しとして進めている
- [x] 現在の主題は `miku-soft` のソフトウェアアーキテクチャ
- [x] 中心論点は、`Web App` は人間向け確認 surface、それ以外の `CLI` / `Java runtime` / `Agent Skills` / `MCP` は生成AI・Agent・Automation 向け surface という整理
- [x] `Single-file Web App` を最初の成果物に置くため、基軸言語は TypeScript / JavaScript になる、という言語選択の論点を追記済み
- [x] TypeScript で開発し、JavaScript にトランスパイルし、外部ネットワーク遮断でも動く Single-file Web App として配布する、という方針を追記済み
- [x] 外部ネットワーク遮断と説明可能性のため、外部ライブラリ依存は極力減らし、core 近傍は原則スクラッチ開発とする論点を追記済み
- [x] ただし複雑性・安全性・既存エコシステム接続・描画などの理由がある場合は OSS ライブラリ利用可、という例外方針も追記済み
- [x] `20260430-miku-soft-architecture-topic-bank.md` に、Web UI は人間向け確認 surface、CLI は agent / script / CI 向け実行 surface という対比を追記済み
- [x] `20260430-miku-soft-architecture-topic-bank.md` に、エントリポイントごとの読者を混ぜない整理と、CLI 内包型 Agent Skills の分担を追記済み
- [x] `20260430-miku-soft-architecture-topic-bank.md` に、Single-file Web App 起点でも Web UI 中心主義にしない、という記事化候補を追記済み
- [x] `20260430-miku-soft-architecture-topic-bank.md` に、projection / patch / validate / apply の artifact pipeline 論点を追記済み
- [x] `20260430-miku-soft-architecture-topic-bank.md` に、CLI help を AI-era runtime contract として扱う記事化候補を追記済み
- [x] `20260430-miku-soft-architecture-topic-bank.md` に、MCP server は protocol adapter であり、HTTP 化では transport / server operation policy が増えるという論点を追記済み
- [ ] 次回以降、記事としてまとめる場合は、現在の `20260430-miku-soft-architecture-topic-bank.md` を完成稿ではなく素材メモとして扱い、必要に応じて複数記事へ分割する
- [ ] `生成AI駆動開発における README / docs / TODO / workplace` は `skills/igapyon-qiita-writer/references/general/20260430-general-ai-dev-docs-workplace.md` として執筆開始済み
- [x] 再開時は `20260430-general-ai-dev-docs-workplace.md` の初稿を読み、Qiita 記事としての構成、見出し、説明粒度、画像追加の要否を確認する
  - 公開済み URL は記事内に記録済み: https://qiita.com/igapyon/items/e2002183dcdadf00ec59
- [ ] `20260430-miku-soft-architecture-topic-bank.md` 側では、同テーマを「執筆開始」として更新済み

### miku-soft 候補プロダクト案

- [x] miku-soft 利用範囲限定の Office / OOXML 共通基盤を検討する
  - 名称: `miku-ms-office-core`
  - GitHub repository: https://github.com/igapyon/miku-ms-office-core
  - 状態: リポジトリ作成済み、着手済み
  - 目的: 汎用 Office ライブラリではなく、Microsoft Office 系ファイルについて miku-soft で実際に利用している範囲だけを共通化する
  - 命名理由: `miku-office-core` より Microsoft Office 対象であることが明確で、`miku-msoffice-core` より単語境界が読みやすい
  - 対象候補:
    - `miku-docx2md`
    - `miku-xlsx2md`
    - `miku-md2docx`
    - `miku-md2xlsx`
    - `mikuproject`
    - 将来候補の `miku-pptx2md`
    - 将来候補の `miku-md2pptx`
  - 初期共通化候補:
    - ZIP / OOXML package の読み書き
    - ZIP entry timestamp normalization
    - ZIP entry ordering
    - ZIP compression policy
    - relationships 解決
    - content types / part path の扱い
    - XML helper
    - media 抽出・格納
    - diagnostics 共通形式
    - miku-soft 共通の path normalization / UTF-16 sort 方針
  - 初期非目標:
    - 汎用 OOXML 実装
    - Microsoft Office 互換の完全実装
    - DOCX / XLSX / PPTX / MS Project の意味解釈をすべて一つにまとめること
    - 各プロダクト固有の Markdown 変換方針や出力判断を共通基盤へ押し込むこと
  - 判断メモ:
    - 既存 miku-soft Office 系プロダクトは、基本的にプロジェクト内で Office ファイルの入出力を自前実装してきた
    - PPTX 系列を追加する前に、重複している低層処理だけを miku-soft 内部向けに整理する段階に来ている
    - 共通化対象は「miku-soft が使う範囲」に限定し、汎用ライブラリ化でスコープを広げない
  - 設計エッセンス:
    - `miku-ms-office-core` は Office 文書の意味を知っている汎用ライブラリではなく、miku-soft 各プロダクトが自分の意味解釈に集中するための共通配管とする
    - 共通化する線は、ZIP container、ZIP entry timestamp / ordering / compression、OPC package、relationships、content types、part path、media、XML helper、diagnostics まで
    - ZIP 内ファイルのタイムスタンプ制御は、DOCX / XLSX / PPTX の意味解釈ではなく、再現性ある Microsoft Office 系 package 生成のための低層方針として扱う
    - DOCX の文書解釈、XLSX の表・セル解釈、PPTX のスライド解釈、Markdown 変換判断、Markdown から Office への組み立て判断は各プロダクトの価値として残す
    - この線を超えると既存の汎用 Office / OOXML ライブラリに近づき、miku-soft の小ささ、説明可能性、用途限定性が崩れやすい
- [x] 「次はなに」と問われたら、次の miku-soft 候補として PPTX 系列を進める
  - 第一候補: `miku-pptx2md`
  - 第二候補: `miku-md2pptx`
  - 理由: `miku-docx2md` / `miku-xlsx2md` / `miku-md2docx` / `miku-md2xlsx` と自然につながる Office 文書変換系列であり、AI-friendly Markdown / JSON への橋渡しとして価値が分かりやすい
  - 進め方: まず `miku-pptx2md` の名前確認、姉妹リポジトリ調査、最小仕様の確定から始める
- [x] `miku-pptx2md` の実現性を検討する
  - 位置づけ: `miku-docx2md` / `miku-xlsx2md` の姉妹となる 10 main application
  - 目的: PowerPoint `.pptx` をローカルで読み、スライド構造を AI-friendly / script-friendly / human-reviewable な Markdown と JSON に抽出する
  - 入力: `.pptx`
  - 出力候補:
    - `output.md`: スライド単位の Markdown
    - `output.json`: スライド、テキスト、画像、ノート、diagnostics の構造化データ
    - `media/`: 画像を書き出す場合の抽出先
  - 初期 CLI 案: `miku-pptx2md input.pptx output.md [options]`
  - 初期スコープ:
    - スライドごとに `## Slide N: <title>` を生成する
    - タイトル、本文、箇条書き、テキストボックスを抽出する
    - speaker notes を抽出できる場合は `### Notes` として出力する
    - 画像は `![alt](media/...)` として参照する
    - 表は可能なら Markdown table にする
    - 未対応要素、読み飛ばし、欠落、変換ロスは diagnostics に出す
  - 初期非目標:
    - PowerPoint の完全な視覚レイアウト再現
    - SmartArt、グラフ、埋め込みオブジェクト、アニメーション、複雑な重なり順の完全変換
  - 判断メモ:
    - PPTX は ZIP + OOXML なので実装可能性は高い
    - 見た目再現ではなく意味構造の抽出に絞ると miku-soft の方針と合う
    - 正式決定前に GitHub 上の `miku-pptx2md` 名の現況確認が必要
- [x] `miku-md2pptx` の実現性を検討する
  - 位置づけ: `miku-md2docx` / `miku-md2xlsx` の姉妹となる 10 main application
  - 目的: Markdown から実用的な PowerPoint `.pptx` をローカル生成し、AI や人間が作ったアウトラインをプレゼン資料の初稿へ橋渡しする
  - 入力: Markdown
  - 出力候補:
    - `output.pptx`: 生成した PowerPoint ファイル
    - `output.json`: Markdown から解釈した slide model と diagnostics
  - 初期 CLI 案: `miku-md2pptx input.md output.pptx [options]`
  - 初期スコープ:
    - `---` または見出しレベルでスライドを分割する
    - slide title、箇条書き、本文、画像、speaker notes を基本要素として扱う
    - テーマ、ページ比率、フォント、余白などは少数の安全な既定値から始める
    - 変換不能な Markdown 要素や、収まりきらないテキストは diagnostics に出す
    - 生成前の slide model JSON を保存できるようにする
  - 初期非目標:
    - 任意の Markdown を美しい商用スライドへ自動デザインすること
    - PowerPoint の全レイアウト機能、アニメーション、複雑な図形、SmartArt、グラフの完全生成
    - 入力 Markdown の曖昧な意図を過剰に推測すること
  - 判断メモ:
    - `miku-pptx2md` より「出力仕様をどう絞るか」が重要
    - OOXML の PPTX 生成を完全自前にするのは初期版では重いため、PPTX 書き出しライブラリ採用を検討する余地がある
    - ただし Markdown 解析、slide model、diagnostics、AI-facing 出力は miku 側の責務として持つのがよい
    - `miku-pptx2md` と対になるが、同一リポジトリにまとめず別アプリとして考える方が miku-soft の命名と責務に合う
    - 正式決定前に GitHub 上の `miku-md2pptx` 名の現況確認が必要

## miku-indexgen-java / miku-indexgen-java-maven 分離反映

- [x] `skills/igapyon-qiita-writer/references/miku-indexgen/20260509-miku-indexgen-usage.md` の差分を確認する
- [x] Qiita の `[miku-indexgen] CLI / Maven plugin リファレンス` をローカル差分どおりに更新する
- [x] `skills/igapyon-qiita-writer/references/general/20260515-general-miku-soft-repository-map.md` の `miku-indexgen-java-maven` 反映を確認する
- [x] Qiita の miku-soft リポジトリマップ記事を更新するか判断し、必要なら反映する
- [x] `skills/igapyon-qiita-writer/references/miku-indexgen/20260428-miku-indexgen-intro.md` の Java CLI / Maven plugin 分離説明を確認する
- [x] Qiita の miku-indexgen 紹介記事を更新するか判断し、必要なら反映する
- [x] `../mikuku-articles/2026/04/20260428/20260428-miku-indexgen-intro.md` の Note 向け差分を確認する
- [x] Note 記事は Qiita 側から上書きせず、文体と長さを見ながら差分を手動反映する
- [x] `skills/igapyon-miku-soft-developer/references/miku-soft-basic/miku-soft-20-javaapp-design.md` の分離後設計説明を確認する
- [x] 公開記事の反映後、必要なら URL や掲載メモをローカル Markdown に追記する
- [x] 最後に `mvn generate-resources` または `mvn clean package` を再実行し、`index.json` の再生成状態を確認する

## char1 SVG 化メモ

- [x] `workplace/char1-transparent-v09.svg` の作成手順を記録する
  - 目的:
    - `workplace/char1.png` の中央キャラクターを SVG 化する
    - 手描きのノイズ、水彩ムラ、線の微細なガタつきは落とす
    - ただし、顔の輪郭、顎のカーブ、前髪、ツインテールなど「線として認識できる形」は勝手に描き直さず、元画像の線を忠実に追う
  - 失敗した方向:
    - `v01` から `v08` までは、SVG の `path` / `ellipse` で手描き風に再構成した
    - 線はきれいになったが、顎のカーブ、顔の縦横比、前髪、リボン、ツインテールの部品配置が別絵になった
    - 教訓: 「クリーンなベジェで描き直す」のではなく、「元画像の主線を抽出して滑らかにトレースする」必要がある
  - `v09` の基本方針:
    - 色面と主線を分けて処理する
    - 主線は `potrace` で元線ベースに SVG 化する
    - 色面は `autotrace` で少数色に簡略化する
    - 最後に、色面の上に `potrace` の主線を濃い茶色で重ねる
  - 貴重な到達ステップ:
    - `v09` で初めて「似たキャラクターを描き直す」方向から、「元画像で線として認識できるものを忠実に拾う」方向へ切り替わった
    - 特に顔の輪郭と顎のカーブは、手作業のベジェ再構成では印象が大きく変わるため、主線抽出と `potrace` に任せるのが有効だった
    - このステップは今後の同種作業でも再利用価値が高い
    - 判断基準:
      - ノイズ、水彩ムラ、線の微細なガタつきは捨てる
      - ただし、主線として読める曲線、輪郭、接続関係は勝手に再解釈しない
      - 「きれいな SVG に描き直す」より「元絵の線を整理して SVG 化する」を優先する
  - 入力:
    - 元画像: `workplace/char1.png`
  - 中間ファイル:
    - `workplace/char1-character-tight-guide.png`
      - 元画像から中央キャラクター部分を切り出し、`1091x665` にリサイズしたガイド
    - `workplace/char1-trace-tight-clean.png`
      - 左右端の矢印や上端の不要線を白でマスクした色面用入力
    - `workplace/char1-line-mask.pbm`
      - 暗い主線だけを抽出した白黒マスク
    - `workplace/char1-line-mask-preview.png`
      - 主線マスク確認用 PNG
    - `workplace/char1-line-potrace.svg`
      - `potrace` で主線を SVG パス化したもの
    - `workplace/char1-color-autotrace-tight.svg`
      - `autotrace` で色面を少数色 SVG 化したもの
  - 実行した主なコマンド:
    - キャラ部分の切り出し:
      - `magick workplace/char1.png -crop 500x285+380+500 +repage -resize 1091x665! -background white -flatten workplace/char1-character-tight-guide.png`
    - 色面用の不要要素マスク:
      - `magick workplace/char1-character-tight-guide.png -fill white -draw 'rectangle 0,0 60,665 rectangle 1028,0 1091,665 rectangle 0,0 1091,35' workplace/char1-trace-tight-clean.png`
    - 主線マスク生成:
      - `magick workplace/char1-character-tight-guide.png -fill white -draw 'rectangle 0,0 60,665 rectangle 1028,0 1091,665 rectangle 0,0 1091,35' -colorspace Gray -blur 0x0.6 -threshold 48% workplace/char1-line-mask.pbm`
    - 主線マスク確認 PNG:
      - `magick workplace/char1-line-mask.pbm workplace/char1-line-mask-preview.png`
    - 主線の SVG 化:
      - `potrace workplace/char1-line-mask.pbm --svg --output workplace/char1-line-potrace.svg --turdsize 18 --alphamax 0.8 --opttolerance 0.3`
    - 色面の SVG 化:
      - `autotrace workplace/char1-trace-tight-clean.png -output-file workplace/char1-color-autotrace-tight.svg -output-format svg -color-count 10 -despeckle-level 10 -corner-threshold 100`
  - 合成処理:
    - `workplace/char1-color-autotrace-tight.svg` から白背景パス `fill:#fcf6ed` の全面矩形を削除する
    - `workplace/char1-line-potrace.svg` の `<g>` を取り出す
    - 主線の `fill="#000000"` を `fill="#4b3327"` に置換する
    - 色面 SVG の末尾 `</svg>` の直前に、主線 `<g id="linework" ...>` を挿入する
    - 出力: `workplace/char1-transparent-v09.svg`
  - 確認:
    - `rsvg-convert -w 1091 -h 665 workplace/char1-transparent-v09.svg -o /tmp/char1-v09-rsvg.png`
    - `magick /tmp/char1-v09-rsvg.png -background white -flatten workplace/char1-transparent-v09-preview-white.png`
    - `magick workplace/char1-character-tight-guide.png workplace/char1-transparent-v09-preview-white.png +append workplace/char1-compare-guide-v09.png`
  - 現時点の評価:
    - `v09` は、顎のカーブや前髪などの主線が元画像ベースになり、`v01` から `v08` より方向性が良い
    - 色面、リボンの赤線、頬の塗りはまだ粗い
    - 次に改善するなら、`v09` の `potrace` 主線は維持し、色面だけを整理する
- [x] SVG 化では白黒主線マスクの人間レビューを工程に入れる
  - 判断:
    - SVG 化の品質を大きく左右するのは、色面より先に主線マスクである
    - `potrace` 後に違和感を直すより、`potrace` 前の白黒マスク段階で人間レビューを挟む方が効率がよい
    - 今後は、いきなり最終 SVG を作らず、まず白黒主線マスクをレビュー対象として出す
  - 標準工程案:
    - 元画像から対象部分を切り出す
    - 不要な文字、矢印、背景線を白でマスクする
    - 主線だけを白黒化する
    - 白黒マスク PNG を人間レビューする
    - 必要なら、切り出し範囲、マスク範囲、ぼかし、しきい値を調整する
    - OK が出た白黒マスクを `potrace` する
    - その後で色面を作る
    - 色面と主線を合成する
  - レビュー対象ファイル例:
    - `workplace/char1-line-mask-v10-preview.png`
  - 白黒マスクで確認する観点:
    - 頭頂部が切れていないか
    - 顔の輪郭と顎のカーブが元絵どおりか
    - 前髪の線が欠けていないか
    - リボンやツインテールの輪郭が潰れていないか
    - 文字、矢印、青い装飾線など不要な線が混ざっていないか
    - 頬や水彩ムラなど、主線ではないものを拾いすぎていないか
  - 命名案:
    - 次版からは `v11-line-mask-preview.png` のように、まず白黒レビュー用ファイルを作る
    - 人間レビューで OK が出た白黒マスクをもとに、対応する `v11.svg` を生成する
- [x] `workplace/char1-linework-inferred-face-v27.svg` を推定顔輪郭補助線の到達版として記録する
  - 目的:
    - 髪で隠れている顔の輪郭を、後続のセマンティック分割や色面整理で使える補助線として保持する
    - 元画像に見えている主線とは区別し、`inferred` / `construction` 扱いの別レイヤーにする
  - 到達版:
    - `workplace/char1-linework-inferred-face-v27.svg`
    - 確認用: `workplace/char1-linework-inferred-face-v27-preview.png`
  - 元になった判断:
    - `workplace/char1-linework-inferred-face-v26b.svg` に人間が追加した青い楕円ガイドが、位置情報としてよかった
    - `v26b` の青い塗り楕円をそのまま残すのではなく、`v11` の主線 SVG に dashed stroke の補助線として載せ直した
  - 座標変換:
    - `v26b` は Pixelmator Pro 由来で `viewBox="0 0 1454 886"`、主線座標が展開済み
    - `v11` は `viewBox="0 0 1091 665"` で、`potrace` の元主線を保持している
    - `v26b` の大楕円は `cx=736.5, cy=488, rx=398.5, ry=289` 相当
    - `v11` 座標では概ね `cx=552.5, cy=366.2, rx=299.0, ry=216.9` として扱った
  - 実装:
    - `v11` をコピーして `v27` を作成
    - `</svg>` 直前に `<g id="face-outline" data-step="inferred-face-outline">` を追加
    - `face-outline-inferred` は塗りなし、青系 dashed stroke、`opacity="0.9"` の補助線にした
    - SVG 要素としては楕円そのものではなく、4本の cubic Bezier による閉じた楕円近似パスにした
  - 教訓:
    - 見える線は `potrace` で元線を忠実に拾う
    - 見えない輪郭を補完する場合は、元線と混ぜず、必ず `inferred` の別レイヤーにする
    - 補助線は「描き直し」ではなく、後工程で意味を保持するための construction guide として扱う
    - 人間が示した楕円・ガイド線は、そのまま採用するのではなく、座標と意図を読み取り、レビューしやすい補助線へ変換する
