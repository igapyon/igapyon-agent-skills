---
title: daybook の HANDOFF 起動・指示待ちの Luna 向け実装計画
description: "HANDOFF を引き継ぎの入口にし、具体的な操作指示の有無で daybook の待機と再開を決めるための source 更新手順。"
category: plan
status: complete
created: 2026-11-05
updated: 2026-11-05
---

# daybook の HANDOFF 起動・指示待ちの実装計画

## 1. 到達点と開始状態

利用者との合意は、HANDOFF.md に書いた引き継ぎ指示から daybook を利用でき、具体的な操作指示がない単独起動ではデータリポジトリを先読みせずに待つこと。Luna は本書に沿って source skill と関連する説明を更新する。

判断の中心は一つにする。

> 現在のユーザー指示を優先し、会話や HANDOFF にある有効な操作指示を引き継ぐ。具体的な操作指示がなければ、準備できたことを短く伝えて次の指示を待つ。

本書作成時点で、単独起動時の指示待ちなどの初期変更はすでに作業ツリーにある。HANDOFF からの起動・操作指示を受け取る更新は未実装である。

2026-11-05の計画レビューにより、次の3点を実装へ反映する。

- 単独起動の待機条件は、会話・引き継ぎにも有効な操作指示がない場合とする。現在の明示的な待機指示は以前の再開指示に優先する。
- 対話検証の配置と開始メッセージを定め、HANDOFF やスキル本文を最初からモデルへ渡して起動経路を省略しない。
- 操作するか待つかの判断は SKILL.md の一段落に集約し、Waypoint 資料には再開手順と短い入口例を置く。

- 調査時 HEAD: `01be845dafc048540509546268a67c4b65a5e502`。
- 計画作成前から `TODO.md`、`skills/igapyon-miku-daybook/SKILL.md`、同 `references/waypoints.md` に未commit変更がある。
- 実装時は実際の Git 状態を読み、これらの変更と本計画を保持して更新する。HEAD の強制復元や既存差分の破棄は行わない。
- 今回の成果物は source skill、関連説明、ローカル検証結果。実 daybook の記録、配備先 `~/.codex/skills/`、バージョン、GitHub の状態は今回の実装対象に含めない。

## 2. 二つの入口の分担

### リポジトリ側: HANDOFF を読む

スキルが読み込まれる前のリポジトリ探索を、daybook スキル自身から開始することはできない。利用するリポジトリの通常の入口（`AGENTS.md` など）に、次の短い指示を置く構成にする。

```markdown
作業開始時に HANDOFF.md があれば読み、現在のユーザー指示に沿って、そこに書かれた引き継ぎ指示に従う。
```

これは作業開始時の読み方であり、エディタのファイルオープンを監視する機能ではない。既存の入口が同じ指示を持っていれば追加不要。

今回、この例を daybook の既存参照資料に載せる。対象の利用リポジトリは指定されていないため、他リポジトリの AGENTS.md/HANDOFF.md は編集しない。この source リポジトリにも、説明例を実装したつもりで新しい AGENTS.md を作らない。実運用への適用時には、利用リポジトリの入口にこの読み取り指示があることを確認する。

### daybook 側: 引き継いだ操作指示に従う

HANDOFF の現在の引き継ぎ指示に `igapyon-miku-daybook` の利用が書かれていれば、スキルを読み込む。その指示に操作が含まれていれば続行し、含まれていなければ待つ。

| 与えられた指示 | 期待する動き |
| --- | --- |
| ユーザーがスキル名だけを指定し、会話・引き継ぎにも有効な操作指示がない | スキルを読み、短く準備完了を伝えて待つ |
| HANDOFF はスキル利用のみを指定し、現在の依頼・会話にも具体的な操作指示がない | スキルを読み、具体的な操作指示を待つ |
| HANDOFF にスキル名と指定 Waypoint からの再開指示 | スキル、Waypoint、必要な参照先を読み、その作業を再開する |
| ユーザーが具体的な追加・更新を依頼 | その操作に必要な範囲を読む |
| ユーザーが daybook 作業の再開を依頼 | 「Waypoint」という単語がなくても Waypoint の手順を使う |

HANDOFF をすでに読んだ後のスキル起動でも、操作指示をもう一度ユーザーに言わせない。現在のユーザー指示が HANDOFF の再開指示を変更していれば、その変更に従う。過去の経緯・引用・スキル自体の説明は、現在の操作指示として扱わない。

## 3. 変更するファイル

| ファイル | 変更内容 |
| --- | --- |
| `skills/igapyon-miku-daybook/SKILL.md` | HANDOFF 経由の利用を activation に含め、指示の有無で待機・実行を決める短い規則に整理 |
| `skills/igapyon-miku-daybook/references/waypoints.md` | HANDOFF を入口として扱い、指定された再開指示を参照先まで引き継ぐ。入口設定と HANDOFF の短い例を掲載 |
| `README.md` | daybook の説明に HANDOFF 経由の起動と単独起動時の指示待ちを一文追加 |
| `src/assembly/README.md` | daybook の同じ説明へ同じ一文を追加 |
| `TODO.md` | 本計画の進捗と実行した検証を既存の daybook 項目へ記録 |

変更は Markdown の指示と説明で完結する。CLI、イベント監視、設定フラグ、状態ファイル形式、専用ルーター、索引、依存パッケージは不要。`agents/openai.yaml` の invocation policy も変更不要。

## 4. Luna が行う編集

### LUNA-01: 開始確認

1. 適用されるリポジトリ指示、`DEVELOPMENT.md` の保守規則、`TODO.md` 冒頭、本書を確認する。
2. `git status --short`、`git diff --stat` と変更対象ファイルの diff を読み、前述の初期変更を把握する。
3. daybook の `SKILL.md` と `references/waypoints.md` を読む。実 daybook のデータリポジトリは調査対象にしない。

### LUNA-02: SKILL.md を整理する

以下の箇所だけを更新する。英語で書かれたスキル本文は英語のまま保つ。

1. front matter の `description` に、リポジトリの引き継ぎがこのスキルの利用を指示する場合も対象になることを短く加える。既存の記録操作と用途の境界を保つ。
2. `Activation and boundaries` 冒頭に、ユーザーからの直接指定に加えて、現在のリポジトリ引き継ぎ指示による利用も含める。メタ質問・汎用 TODO・公開日記などの除外条件は保つ。
3. 現在の `Startup and request routing` の最初の段落を、次の趣旨に置き換える。既存段落への但し書き追加で長くしない。

```text
The current user's instructions take precedence over earlier conversation and
repository handoff instructions. Carry forward any still-applicable operation
from those sources. If an operation is specified, proceed within that scope;
otherwise briefly acknowledge readiness and wait, deferring target-daybook
discovery, README/Git checks, record reads, and operation-specific references.
```

4. 同節の再開ルートと必要な記録だけ読む規則は保つ。単独起動時に README/Git/記録を先読みしないことが、上記の `target-daybook inspection` に含まれるよう確認する。
5. `Required checks for a concrete operation` は操作が決まった後の規則として保つ。スキルを読んだだけでこのチェックを実行しない。
6. Core workflow から Waypoint への既存リンクは保つ。「明示的な再開依頼」を「直近のユーザーメッセージで再発言された依頼」に狭めない。

スキル内で HANDOFF.md を毎回探索・再読するチェックリストを追加しない。起動条件、指示待ち、再開、読む範囲を同じ意味で何度も繰り返さない。

### LUNA-03: Waypoint の参照資料を整える

1. 冒頭は Waypoint 操作・daybook 作業再開の適用条件だけを短く示す。待機・実行の起動判断は SKILL.md に集約し、この資料へ同じ規則を再掲しない。
2. 現在の「GOAL.md / HANDOFF.md は supplementary」という段落を更新する。HANDOFF は起動・再開指示を渡す入口にもなり、作業の現在状態は task/activity/Waypoint から復元する、と役割を示す。HANDOFF の読み取りを禁止したり、入口指示を無視したりする表現にしない。
3. `Saving, updating, and selecting an entry` の再開説明で、引き継ぎによる指定もファイル選択に使い、必要な参照先をたどって指定範囲の作業まで進むことを明確にする。「Waypoint を読みました」という報告だけで止まらない。
4. 親の Waypoint が対象の子を明示している場合は、親の task/activity を読む前に指定された子をたどって再開範囲を確定し、その範囲に必要な task/activity/計画を読む。番号順に全件を読む処理や、全リンク先を再帰的に実行する規則は作らない。対象がなお曖昧な場合の既存の確認手順を使う。
5. 同資料に短い `Entering from a repository handoff` 節を置き、2節の AGENTS.md の一文と、次の二つの HANDOFF 例を載せる。新しい参照ファイルや HANDOFF 専用書式は作らない。

準備までの例:

```markdown
この作業には igapyon-miku-daybook スキルを使います。
```

再開まで進める例:

```markdown
igapyon-miku-daybook スキルを使い、../daybook/waypoints/20261105-0900-example-00001.md から作業を再開してください。
```

後者の相対パスは利用リポジトリの HANDOFF.md から解決する例と明記する。実際にはユーザーが指定したリポジトリや既存の参照先を使い、上記のディレクトリ名を固定の探索先にしない。

既存の Waypoint 状態遷移は維持する。読むだけならメタデータ不変、作業開始時は対象を `in_use` にし、子を再開しただけで親・兄弟を変更しない。task の完了や activity 記録の範囲も既存規則に従う。

### LUNA-04: 利用者向け説明を揃える

`README.md` と `src/assembly/README.md` の `igapyon-miku-daybook` 節の `Scope and prerequisites` に、次の趣旨の一文を追加する。

```text
Repository handoff instructions can name the skill and direct a Waypoint resume;
without a concrete operation, the skill waits for instructions.
```

この説明に長い設定手順を展開しない。手順と例は既存の Full workflow リンクから `SKILL.md`、`waypoints.md` へたどれる。二つの README に存在する今回と無関係な説明差分は、今回の作業で全面同期しない。

## 5. 検証

### 形式・参照・差分

実装後、次を一度実行して結果を記録する。`quick_validate.py` は利用環境の `skill-creator` に同梱されたものを使う。下のパスは本書作成環境の例である。

```sh
python3 /Users/igapyon/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/igapyon-miku-daybook
npm run test:skill-index-policy
git diff --check
```

これらは形式と参照の検査であり、モデルが正しい順序で読むことの証明にはならない。指示文の完全一致や見出しの存在だけを検査する新しいテストは追加しない。

### 操作の意味と読み取り範囲

以下を本文レビューの受け入れ条件にする。対話検証が可能なら、実データを使わず、一時ディレクトリの小さな作業 repo と daybook repo、および更新した source skill を使って確認する。配備済みの古いスキルを検証対象にしない。

対話検証の開始条件は次のように固定する。

1. 一時領域に `project/`、`daybook/`、`skills/igapyon-miku-daybook/` を並べる。前二つをローカル Git repo とし、最後には今回の source をコピーする。
2. `project/AGENTS.md` に2節の入口の一文を置く。C02〜C05・C10・C11の `project/HANDOFF.md` に各ケースの指示を置き、相対パスは `../daybook/waypoints/...` とする。
3. `daybook/README.md`、対象と対象外の task/activity、親・指定された子・対象外の兄弟 Waypoint、および再開後の短い計画を置く。レコード形式は既存の `references/records.md` と `waypoints.md` に合わせる。
4. 新しい検証セッションの作業ディレクトリを `project/` とし、検証用スキルを利用可能なカタログの名前・descriptionとして公開する。スキル本文・HANDOFF本文・Waypoint本文・正解の手順は初期プロンプトへ埋め込まない。実際の配備先は変更しない。
5. C02〜C04の開始メッセージは、操作を依頼しない中立的な「このリポジトリを開きました。」とする。C01・C11はスキル名だけ、C05は別の追加・更新の具体的依頼、C10は「daybook を準備して、今は操作せず待ってください。」とする。
6. ケースごとに新しいセッションと未変更のfixtureを使い、先行ケースで読み込んだ内容や書き込みを持ち越さない。利用環境が検証用カタログに対応しない場合、本文を先渡しした代替試験を activation 検証の成功と数えない。

| ケース | 入力・状況 | 期待結果 |
| --- | --- | --- |
| C01 | ユーザーがスキル名だけを指定し、会話・引き継ぎにも有効な操作指示がない | 短く準備完了を伝えて待つ。daybook データ repo の探索、README/Git確認、task/activity/Waypoint 読み込みは始めない。通常のリポジトリ入口での HANDOFF 読み取りは妨げない |
| C02 | リポジトリ入口から読んだ HANDOFF がスキル名だけを指定し、現在の依頼・会話にも操作指示がない | HANDOFF と SKILL.md を読み、データ repo の先読みをせず待つ。すでに行った HANDOFF 読み取りは妨げない |
| C03 | HANDOFF がスキル名と一つの Waypoint からの再開を指定 | ユーザーへの再開の再確認を挟まず、操作時の必要なチェック、対象 Waypoint と必要な参照先、指定作業へ進む |
| C04 | HANDOFF → 親 Waypoint → 明示された一つの子 → task/計画 | 親の task/activity を読む前に指定された子をたどり、範囲を確定して必要な資料と作業へ進む。兄弟を一括で読み込んだり、親・兄弟の状態を変更したりしない |
| C05 | HANDOFF に以前の再開指示があるが、現在のユーザーが別の追加・更新を指定 | 現在の依頼を実行。以前の Waypoint 再開を先に実行しない |
| C06 | ユーザーが daybook の作業を再開したいと依頼し、対象が会話から明確 | 「Waypoint」という単語を要求せず、該当する再開手順へ進む |
| C07 | 再開対象が不明で複数候補がある | 候補を必要な範囲で絞り、なお不明なら候補名を示して確認。全 task/activity は読み込まない |
| C08 | HANDOFF がない、または daybook 利用指示がなく、直接の daybook 利用依頼もない | daybook の利用を強制せず、HANDOFF の自動生成もしない |
| C09 | スキル自体を説明・修正する依頼 | メタ作業として扱い、daybook の記録操作を始めない |
| C10 | HANDOFF に再開指示があるが、現在のユーザーが明示的に準備と待機だけを指示 | 現在の指示どおり待つ。引き継ぎの再開指示を実行しない |
| C11 | ユーザーがスキル名だけを指定し、HANDOFF には有効な Waypoint 再開指示がある | 引き継ぎの指示を使って再開する。ユーザー発言に操作名がないことだけを理由に待機しない |

対話検証では返答文だけから読み取りを推定せず、実際のツール呼び出し・読み取りファイル・差分を確認する。検証のための常設 trace や新しい監視機能は追加しない。

C03/C04 は、架空の task と既存形式の Waypoint、短い計画を用意し、計画の次の行動を「一時作業 repo の `workplace/resume-result.md` に決められた短文を書き、その時点で止まる」とする。生成物まで確認し、参照先を読むだけで止まっていないことを確かめる。読む必要のない別 topic の task/activity と兄弟 Waypoint も少数置き、そこへの読み取り・書き込みがないことを確認する。

対話検証を実行できない環境では、ケースごとの本文レビュー結果と対話未検証を区別して記録する。形式検査の成功を、対話検証の成功として報告しない。

## 6. 完了条件と記録

- [x] HANDOFF からのスキル利用指示が activation の対象に含まれる。
- [x] 直接依頼・引き継ぎの双方で、具体的な操作指示があれば進み、なければ待つ規則になっている。
- [x] 既読の HANDOFF にある具体的な再開指示だけで、指定された参照先と作業まで進むよう本文を更新した。
- [x] 単独起動時の先読み抑制と、リポジトリ入口での HANDOFF 読み取りが矛盾しない。
- [x] HANDOFF の入口例が短く、スキルの専用設定や新しい探索機構を要求しない。
- [x] README 二か所の今回の説明、形式検査、参照検査、差分検査が揃っている。
- [x] 操作範囲、既存 Waypoint 状態遷移、外部操作に関する既存の境界が保たれる。
- [x] `TODO.md` の該当項目に、変更内容、実行コマンドと結果、対話検証の有無、残件を記録した。

本文レビューと実行できた検証が完了したら、source 更新の完了を報告する。対話未検証、実運用リポジトリ側の入口設定、配備先への同期は、それぞれ実施したかどうかを明記する。本書の `status` は実装前には `planned` のままにし、完了時は実際の検証範囲と合わせて更新する。

## 7. 実装・検証結果（2026-11-05）

source 更新を完了した。起動判断は `SKILL.md` の `Startup and request routing` に集約し、front matter と activation には引き継ぎ経由の利用を加えた。Waypoint 資料には入口設定・HANDOFF の短い例と、指定された子・必要な参照先をたどって作業へ進む手順を置いた。README 二か所の今回の説明も揃えた。

計画レビューの3点を反映し、C01 の待機条件を限定、C10 の明示的待機と C11 の引き継ぎ再開を追加した。対話検証の配置・開始メッセージも5節に定めた。入口例は設定方法の説明として記載し、通常の再開中に AGENTS.md を作成・変更する操作は加えていない。

| 実行したコマンド | 結果 |
| --- | --- |
| `python3 /Users/igapyon/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/igapyon-miku-daybook` | 成功、`Skill is valid!` |
| `npm run test:skill-index-policy` | 79件成功、失敗0件 |
| `git diff --check` | 成功 |

以下は実際の対話実行ではなく、変更後の本文とケースを照合したレビュー結果である。

| ケース | 本文上の確認結果 |
| --- | --- |
| C01・C02 | 有効な操作指示がなければ待機し、daybook の探索・README/Git・記録・操作別参照の読み込みを延期する。入口での HANDOFF 読み取りは禁止していない |
| C03・C04・C06・C11 | 既存の引き継ぎ指示を利用し、再開は Waypoint へ進む。指定された子と必要な参照先を読み、対象作業へ続行する |
| C05・C10 | 現在のユーザー指示を、以前の会話・引き継ぎより優先する |
| C07 | ファイル名等で候補を絞り、なお曖昧なら task/activity を読み込む前に確認する |
| C08 | activation の用途を保ち、HANDOFF や入口ファイルの自動生成処理を追加していない |
| C09 | スキル自体への質問を記録操作の起動対象から除外する既存境界を維持した |

対話実行による activation・読み取り順・生成物の検証は未実施。上記の79件は形式・参照・配布に関する既存テストであり、対話動作の検証件数には含めていない。実利用リポジトリの入口設定、実データ編集、ローカル配備先への同期、版数更新、commit/push は行っていない。

### 自己レビュー指摘の対応

- 子 Waypoint が指定されている場合は、先にその子をたどって再開範囲を確定し、その範囲に必要な task/activity 等を読む順序に修正した。
- C02〜C04 の開始文を「このリポジトリを開きました。」へ変更した。操作依頼を含めず、HANDOFF の指示だけによる待機・再開を検証する条件に揃えた。
- 2節の期待動作表と C02 に、会話・引き継ぎにも有効な操作指示がない場合に待機する条件を明記した。

修正後に `quick_validate.py`、`npm run test:skill-index-policy`（79件成功）、`git diff --check` を再実行して成功した。対話実行による検証は引き続き未実施。
