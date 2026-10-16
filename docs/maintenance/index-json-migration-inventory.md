# index.json migration inventory

Status: IDX-00 through IDX-07 are implemented. Fourteen internal inventories were removed; the Qiita writer inventory is retained for optional cross-topic discovery based on the Luna comparison below. All ten external source changes are pinned by immutable commit SHA with `remove` dispositions. The root policy suite, package, and release archive checker pass against those pins. The source commits were pushed through the task's miku-scm workflow; no Release or skill deployment was performed.

## Second self-review and archive repair (2026-10-11)

The second self-review found that the root archive checker accepted an index-free internal skill when a reference or asset was absent from the ZIP. Removing Mikuku's `references/VERSION.md` or representative image from a temporary copy of the actual ZIP produced exit 0. The source-only route suite passed independently of those archive omissions. The original ZIP contained both files.

The [archive repair plan](../plans/release-archive-source-verification.md) was implemented after the user authorized execution. The checker compares all internal skill files against source and checks representative routes in the extracted ZIP. The verification results and scope are recorded below.

## Internal skills

| Skill | Decision | Evidence / action |
| --- | --- | --- |
| `igapyon-agent-state-management` | remove | SKILL routes work through named references; index only precedes multi-reference reads. |
| `igapyon-companion-musicpost-writer` | remove | SKILL names the style and structure references for the relevant task. |
| `igapyon-companion-techpost-writer` | remove | SKILL names the style and structure references for the relevant task. |
| `igapyon-diary-writer` | remove | Confirm direct route in its SKILL and preserve its diary format references. |
| `igapyon-ffmpeg-helper` | remove | SKILL names task-specific runbooks; only its generic discovery footer uses the index. |
| `igapyon-github-writer` | remove | SKILL and task-specific references route the work; preserve its version manifest. |
| `igapyon-miku-daybook` | remove | SKILL has explicit workflow references; its first-read index instruction is auxiliary. |
| `igapyon-miku-scm` | remove | Preserve contract data and SCM safeguards; make index drift a repo-declared check. |
| `igapyon-miku-soft-developer` | remove | SKILL already gives direct workflow routes; change the shared standard and starter first. |
| `igapyon-mikuku-agent` | remove | Preserve VERSION.md, images, and dated articles; remove only its generated root inventory. |
| `igapyon-note-writer` | remove | Confirm direct route to canonical article and metadata guidance. |
| `igapyon-qiita-writer` | retain | Luna's representative comparison found that the index surfaced the application-architecture overview and distinguished it from its companion topic bank; consult it optionally for cross-topic discovery. |
| `igapyon-repo-conventions` | remove | SKILL contains core rules and links to detailed references; generic inventory is optional discovery only. |
| `igapyon-reviewer` | remove | Authored `references/INDEX.md` gives topic-level routes; update review criteria to make root index optional. |
| `igapyon-skill-compactor` | remove | Known direct routes exist; update guidance so target indexes are opt-in rather than assumed. |

The root build regenerates and validates the one retained internal index. All other internal root indexes are absent. Historical examples, product schemas, user data, and JSON files below reference directories are not covered by this table.

## Qiita retention evaluation

- Path: `skills/igapyon-qiita-writer/index.json`.
- Decision: retain for optional broad article discovery. It is not a default first read.
- Consumer and purpose: the article writer may consult paths, directories, and title-like summaries when choosing articles across topic groups or distinguishing a full article from its topic bank. SKILL.md makes this optional and starts known-topic tasks with scoped search.
- Observed contents: 42 entries including SKILL.md and templates. There are no `topics` or `tags` fields. Ten summaries are the generic headings `はじめに` or `掲載先情報`; these do not summarize article meaning.
- Producer: bundled `lib/miku-indexgen-1.6.2.jar`, selected by `scripts/generate-skill-indexes.mjs`; run `mvn generate-resources` at the repository root.
- Update trigger: additions, removals, renames, or changes to the included Markdown/JSON files or their metadata.
- Validation: the declared-generation tests, generated-index check after regeneration/commit, and release archive JSON/path checks. These check artifact integrity, not usefulness.
- Maintenance owner: the igapyon-agent-skills repository maintainer.
- Luna comparison (2026-10-14): three identical representative tasks were run against the same snapshot with and without index use. For the known CLI-template task, both routes reached `templates/patterns/cli-reference-pattern.md`; the index did not change the choice and added one opened file. For the architecture-in-the-AI-era task, index use selected the full article `references/general/20260430-general.md` and identified `20260430-miku-soft-architecture-topic-bank.md` as a topic bank. Without index use, the model selected the related but less direct `20260502-general-repository-engineering.md` and did not inspect the architecture overview, so it missed the overview/topic-bank distinction requested by the task. For the dated-example/current-policy conflict, both routes reached `references/general/20260429-general.md` and `docs/policies/reference-discovery.md`; index use did not change the result.
- Efficiency and limits: the no-index run reported nine search/read invocations and six unique files across all tasks. The index-enabled run did not report a comparable aggregate invocation count. Neither run exposed token or elapsed-time measurements. The comparison supports a narrow selection benefit for optional cross-topic discovery; it does not establish general token or time savings. Generic summaries and the lack of topic/tag fields remain index quality limitations.
- Decision: retain the index as an optional discovery aid for cross-topic article selection. Keep direct links and scoped search as the normal route for known topics, and do not require an index-first read.

## Verification after self-review

`npm run test:skill-index-policy` now includes actual ZIP fault fixtures, zero/multiple generation, invalid-policy and drift checks, isolated routing for all 14 index-free internal skills, and an instantiated index-free starter. The route tests prove selected source paths are reachable from a standalone skill copy; they do not measure model selection behavior or index usefulness.

The prompt-lint and AI builder ZIP checks now derive expected file sets from the source skill and compare both bundle and ZIP against them. Their fault fixtures cover omissions from both bundle and ZIP, and omissions only from ZIP. Prompt-lint's required-material checks were restored independently of an index.

Verified on 2026-10-10:

| Command / scope | Result |
| --- | --- |
| `npm run test:skill-index-policy` | 58/58 pass: 5 unit, 38 integration/fault cases, 14 isolated routes, 1 instantiated-starter check. The starter check actually runs both bundled tests in a fresh child test context. |
| `mvn clean package` | BUILD SUCCESS; only the provisional internal Qiita index is regenerated. |
| `node scripts/check-release-archive.mjs target/igapyon-agent-skills-1.20261006.1.zip` | Valid: internal=15, external=10, total=25. External content still comes from old legacy pins. |
| `npm run build` in miku-prompt-lint-skills | 10 source tests and 6 bundle tests pass. |
| `npm run build` in miku-ai-assistant-builder-skills | 34 source tests and 5 bundle tests pass. |
| Original omission reproduction in isolated copies | Both verifiers now fail with exit 1 when a source reference is absent from both bundle and ZIP. Tested `references/repository/checkpoints.md` for prompt-lint and `references/instructions/01-input-fields.md` for AI builder. |
| Qiita `quick_validate.py` | Skill frontmatter/naming validation passes. |

Release CI now runs the expanded policy/reference suite before packaging. At this 2026-10-11 checkpoint, model-level representative-task comparisons had not yet run; the later Qiita evaluation is recorded above under the 2026-10-14 retention evaluation.

## Verification after archive repair (2026-10-11)

The root checker now derives each internal skill's expected file set from `skills/<skill>/`, compares relative paths, regular-file types, byte sizes, and SHA-256 content with the extracted archive, then checks the 14 contracted representative routes in that extracted skill. The source walk follows the existing release exclusions (`.DS_Store`, `node_modules`, `.git`); archive-side unexpected files are not hidden by those exclusions. Existing ZIP safety, skill metadata, lock, and adopted-index checks remain enabled.

| Command / scope | Result |
| --- | --- |
| `npm run test:skill-index-policy` | 77/77 pass, including file-set/content helper cases, source-to-ZIP integration faults, and source/ZIP representative-route cases. |
| `mvn package` | BUILD SUCCESS; generated the current root release archive after the earlier sandboxed dependency fetch timed out and the approved retry completed. |
| `node scripts/check-release-archive.mjs target/igapyon-agent-skills-1.20261006.1.zip` | Valid: internal=15, external=10, total=25, source-checked=15, representative-routes=14. |
| Real-ZIP temporary-copy faults | Removing `references/VERSION.md` or `assets/mikuku/mikuku01.png`, and changing `references/article-writing.md`, each failed with exit 1 and the affected relative path. Source and original ZIP were preserved. |
| `git diff --check` | Passed. |

The new source-to-archive byte comparison covers the 15 root-internal skills. External skills receive the lock and adopted-index checks but are not included in this new full-file source comparison. The 14 route checks establish static reachability in the extracted files; the separate Qiita comparison above evaluates model selection for the retained discovery index.

## External ref integration and final root verification (2026-10-14)

All ten migrated external commits were pinned by full SHA in `pom.xml` and `config/skill-index-policy.json`, with `remove` dispositions. `scripts/prepare-release-staging.sh` fetches the exact SHA, checks out detached, and verifies the resolved commit before staging. The Maven package fetched all ten pins and generated `target/igapyon-agent-skills-1.20261006.1.zip`; `EXTERNAL_SKILLS.lock` records the same refs. The archive checker accepted the package with `internal=15`, `external=10`, `source-checked=15`, and `representative-routes=14`.

| External repository | Pinned commit | Build/test evidence |
| --- | --- | --- |
| `miku-indexgen-skills` | `1bf6ce8506583a1ac101614a27671a6b7005e122` | npm test 8/8; Node/Java product generation checks retained. |
| `miku-text-bundle-skills` | `6b5b8e00383d8e22bada7bf8d2c503c99c2f9838` | npm test 9/9. |
| `miku-repo-bundle-skills` | `ccfe1d57754623ec3ae7eb60eb89b28cb339a98a` | npm test 6/6; product-generated indexes retained. |
| `miku-text-file-ops-skills` | `461af935838ede6d96d9767570d139dcf41af75c` | 34 tests passed; one Windows-only test skipped. |
| `miku-prompt-lint-skills` | `f040a3a9627e2537d08bcf9b91de65768e334c8f` | Source tests 10/10; bundle/ZIP tests 6/6. |
| `miku-ai-assistant-builder-skills` | `861eebfd788bbb3934558d8b11cc831247b1688c` | Source tests 34/34; bundle/ZIP tests 5/5; reproducibility check passed. |
| `miku-ms-office-skills` | `97b6a2bfe9f5b2d1a308bb53a8967b04032a2af2` | npm test 9/9; build passed. |
| `miku-json2xlsx-skills` | `870bc32b30762d1e1f9df325122da9163728eea2` | npm test 10/10; bundle, runtime, and ZIP checks passed. |
| `miku-project-skills` | `ae2b629b27d1f0805b7626957a02d2aaea506967` | Build passed; 41/41 tests and release ZIP checks passed. |
| `miku-score-skills` | `6abdda090d88ad9a036089e6e39ba415d9e79bc7` | Build passed; upstream tests 693/693; isolated bundle smoke and release ZIP passed. |

| Root command / artifact | Result |
| --- | --- |
| `npm run test:skill-index-policy` | 77/77 pass with the SHA pins. |
| `mvn -f pom.xml clean package` | BUILD SUCCESS; all ten exact commits fetched and staged. |
| `node scripts/check-release-archive.mjs target/igapyon-agent-skills-1.20261006.1.zip` | Valid: internal=15, external=10, source-checked=15, representative-routes=14. |
| `sh -n scripts/prepare-release-staging.sh` and `git diff --check` | Passed. |

## External pinned skills

| Repository | Ref | Skill | State | Next action |
| --- | --- | --- | --- | --- |
| `miku-indexgen-skills` | `1bf6ce8506583a1ac101614a27671a6b7005e122` | `igapyon-miku-indexgen` | remove | Exact migrated commit pinned and included in the verified archive; product index generation remains. |
| `miku-text-bundle-skills` | `6b5b8e00383d8e22bada7bf8d2c503c99c2f9838` | `igapyon-miku-text-bundle` | remove | Exact migrated commit pinned and included in the verified archive. |
| `miku-repo-bundle-skills` | `ccfe1d57754623ec3ae7eb60eb89b28cb339a98a` | `igapyon-miku-repo-bundle` | remove | Exact migrated commit pinned; generated text-bundle indexes and class-index inputs remain. |
| `miku-text-file-ops-skills` | `461af935838ede6d96d9767570d139dcf41af75c` | `igapyon-miku-text-file-ops` | remove | Exact migrated commit pinned and included; one Windows-only test is skipped on this host. |
| `miku-prompt-lint-skills` | `f040a3a9627e2537d08bcf9b91de65768e334c8f` | `igapyon-miku-prompt-lint` | remove | Exact migrated commit pinned; bundle/ZIP source checks passed. |
| `miku-ai-assistant-builder-skills` | `861eebfd788bbb3934558d8b11cc831247b1688c` | `igapyon-miku-ai-assistant-builder` | remove | Exact migrated commit pinned; task-produced `knowledge-index.md` remains. |
| `miku-ms-office-skills` | `97b6a2bfe9f5b2d1a308bb53a8967b04032a2af2` | `igapyon-miku-ms-office` | remove | Exact migrated commit pinned; runtime bundle checks passed. |
| `miku-json2xlsx-skills` | `870bc32b30762d1e1f9df325122da9163728eea2` | `igapyon-miku-json2xlsx` | remove | Exact migrated commit pinned; JSON/JSONL conversion contracts remain. |
| `miku-project-skills` | `ae2b629b27d1f0805b7626957a02d2aaea506967` | `igapyon-miku-project` | remove | Exact migrated commit pinned and included in the verified archive. |
| `miku-score-skills` | `6abdda090d88ad9a036089e6e39ba415d9e79bc7` | `igapyon-miku-score` | remove | Exact migrated commit pinned; score runtime/assets remain. |

The migrated pins are immutable commit SHAs. The root does not regenerate external indexes; every `remove` pin supplies a source bundle without the skill-root inventory. Product-generated indexes, runtime data, schemas, and user-facing outputs remain governed by their own contracts.
