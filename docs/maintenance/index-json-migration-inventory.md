# index.json migration inventory

Status: local source changes for IDX-00 through IDX-05 are implemented. Qiita's retention decision is pending a representative-task comparison; the root build temporarily maintains its existing index. Static reference-route checks are separate from model behavior evaluation. All ten external source worktrees have uncommitted index-optional changes; their existing builds/tests pass. Root pins remain `legacy` because they still point to published revisions that include the old skill inventories. A later release/ref update and root package verification are required before these rows can leave legacy status. No changes have been committed or published.

## Second self-review and archive repair (2026-10-11)

The second self-review found that the root archive checker accepted an index-free internal skill when a reference or asset was absent from the ZIP. Removing Mikuku's `references/VERSION.md` or representative image from a temporary copy of the actual ZIP produced exit 0. The source-only route suite passed independently of those archive omissions. The original ZIP contained both files.

The [archive repair plan](../plans/release-archive-source-verification.md) was implemented locally after the user authorized execution. The checker now compares all internal skill files against source and checks representative routes in the extracted ZIP. The verification results and scope are recorded below. External ref integration and model/Qiita evaluations remain pending.

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
| `igapyon-qiita-writer` | pending (temporarily retained) | Existing paths, directories, titles, and first-heading summaries may help cross-topic article discovery. Benefit over scoped search is unmeasured; see the explicit provisional decision below. |
| `igapyon-repo-conventions` | remove | SKILL contains core rules and links to detailed references; generic inventory is optional discovery only. |
| `igapyon-reviewer` | remove | Authored `references/INDEX.md` gives topic-level routes; update review criteria to make root index optional. |
| `igapyon-skill-compactor` | remove | Known direct routes exist; update guidance so target indexes are opt-in rather than assumed. |

The root build regenerates and validates the one temporarily retained internal index. All other internal root indexes must be absent after IDX-03. Historical examples, product schemas, user data, and JSON files below reference directories are not covered by this table.

## Qiita provisional retention

- Path: `skills/igapyon-qiita-writer/index.json`.
- Decision: pending; temporarily retained to allow comparison against the current snapshot. No measured discovery or context-cost advantage is claimed.
- Consumer and purpose: the article writer may consult paths, directories, and titles when choosing examples across article groups. SKILL.md now makes this optional and starts known-topic tasks with scoped search.
- Observed contents: 42 entries including SKILL.md and templates. There are no `topics` or `tags` fields. Ten summaries are the generic headings `はじめに` or `掲載先情報`; these do not summarize article meaning.
- Producer: bundled `lib/miku-indexgen-1.6.2.jar`, selected by `scripts/generate-skill-indexes.mjs`; run `mvn generate-resources` at the repository root.
- Update trigger: additions, removals, renames, or changes to the included Markdown/JSON files or their metadata.
- Validation: the declared-generation tests, generated-index check after regeneration/commit, and release archive JSON/path checks. These check artifact integrity, not usefulness.
- Maintenance owner: the igapyon-agent-skills repository maintainer.
- Next evaluation: compare the same source snapshot with and without index use for (1) locating a known CLI template, (2) choosing an article for an unfamiliar architecture topic, and (3) confirming original text when a dated example conflicts with current policy. Record selected sources, mistakes, redundant reads, steps, and any measurable token/time use. The planned Luna behavioral comparison has not run. Resolve the decision as retain or remove from that evidence.

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

Release CI now runs the expanded policy/reference suite before packaging. Model-level representative-task comparisons remain unperformed; the static route and artifact checks above do not close that item.

## Verification after archive repair (2026-10-11)

The root checker now derives each internal skill's expected file set from `skills/<skill>/`, compares relative paths, regular-file types, byte sizes, and SHA-256 content with the extracted archive, then checks the 14 contracted representative routes in that extracted skill. The source walk follows the existing release exclusions (`.DS_Store`, `node_modules`, `.git`); archive-side unexpected files are not hidden by those exclusions. Existing ZIP safety, skill metadata, lock, and adopted-index checks remain enabled.

| Command / scope | Result |
| --- | --- |
| `npm run test:skill-index-policy` | 77/77 pass, including file-set/content helper cases, source-to-ZIP integration faults, and source/ZIP representative-route cases. |
| `mvn package` | BUILD SUCCESS; generated the current root release archive after the earlier sandboxed dependency fetch timed out and the approved retry completed. |
| `node scripts/check-release-archive.mjs target/igapyon-agent-skills-1.20261006.1.zip` | Valid: internal=15, external=10, total=25, source-checked=15, representative-routes=14. |
| Real-ZIP temporary-copy faults | Removing `references/VERSION.md` or `assets/mikuku/mikuku01.png`, and changing `references/article-writing.md`, each failed with exit 1 and the affected relative path. Source and original ZIP were preserved. |
| `git diff --check` | Passed. |

The new source-to-archive byte comparison covers the 15 root-internal skills. The 10 external skills still receive the existing lock/index checks but are not included in this new full-file source comparison; their new-ref integration remains part of IDX-06. The 14 route checks establish static reachability in the extracted files, not model selection quality. Qiita retention and Luna representative-task evaluation remain open.

## External pinned skills

| Repository | Ref | Skill | State | Next action |
| --- | --- | --- | --- | --- |
| `miku-indexgen-skills` | `v1.6.2` | `igapyon-miku-indexgen` | legacy (source changed; build passed) | Preserve index generation outputs and runtime tests; obtain a new source ref before updating the root pin. |
| `miku-text-bundle-skills` | `v1.6.0` | `igapyon-miku-text-bundle` | legacy (source changed; build passed) | Root inventory removed; publish a migrated ref before updating the root pin. |
| `miku-repo-bundle-skills` | `v0.5.0.1` | `igapyon-miku-repo-bundle` | legacy (source changed; build passed) | Preserve generated text-bundle indexes and class-index inputs; obtain a new ref before updating the root pin. |
| `miku-text-file-ops-skills` | `v0.5.0` | `igapyon-miku-text-file-ops` | legacy (source changed; build passed) | Root inventory removed; the Windows-only test is skipped on this host. Obtain a new ref before updating the pin. |
| `miku-prompt-lint-skills` | `v0.5.0` | `igapyon-miku-prompt-lint` | legacy (source changed; build passed) | Root inventory contract and freshness verifier removed; obtain a new ref before updating the pin. |
| `miku-ai-assistant-builder-skills` | `v0.13.0` | `igapyon-miku-ai-assistant-builder` | legacy (source changed; build passed) | Preserve task-produced `knowledge-index.md`; obtain a new ref before updating the root pin. |
| `miku-ms-office-skills` | `v0.7.1` | `igapyon-miku-ms-office` | legacy (source changed; build passed) | Runtime bundle checks now assert runtime files directly; obtain a new ref before updating the pin. |
| `miku-json2xlsx-skills` | `v0.5.0` | `igapyon-miku-json2xlsx` | legacy (source changed; build passed) | Preserve JSON/JSONL conversion contracts; obtain a new ref before updating the pin. |
| `miku-project-skills` | `v0.12.4` | `igapyon-miku-project` | legacy (source changed; build passed) | Root inventory requirements removed; obtain a new ref before updating the pin. |
| `miku-score-skills` | `v0.6.1` | `igapyon-miku-score` | legacy (source changed; tests passed) | Preserve score assets; obtain a new ref before updating the pin. |

The current legacy state is intentionally strict: the root does not regenerate external indexes, but the current pins still supply the prior indexed source bundle. Change a row to `remove` only when the root points to a new source ref whose archive omits the root inventory and whose release checks pass.
