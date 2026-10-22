---
title: miku-soft developer skill review
description: "Review findings and focused repairs to task routing, starter validation, release staging, and Java compatibility."
category: review
status: stable
created: 2026-10-22
updated: 2026-10-22
---

# 2026-10-22 Skill Review

This is a review record, not an additional product policy. The user requested
a fresh review of the existing skill and corrections to inconsistencies.
The installed skill and repository source matched before the review. Work was
prepared in an isolated source snapshot; unrelated source work was excluded.

## Findings and Repairs

| Priority | Finding | Evidence and repair |
| --- | --- | --- |
| P1 | Tag-derived text became shell code in the Agent Skills release starter. | `release-build.yml` interpolated step output directly into `run`. A valid Git tag with a shell command substitution passed the version guard and executed a harmless marker command locally. Pass versions through `env` and expand quoted shell variables. The regression test rejects execution with the old template and passes with the repair. |
| P2 | The starter's normal `npm test` could race over one bundle directory. | Both test files rebuilt `bundle/<repo>/`. A fixture with 400 reference files failed on its first run with `ENOTEMPTY`. Serialize the shared-output tests and have the repository integration test use the shipped npm entry point rather than imposing serialization externally. |
| P2 | Runtime discovery could skip a required missing backend. | The release and isolated smoke templates searched for whatever jar/mjs happened to exist. Declare exact required executable CLI paths in `package.json` as `skillRuntimeArtifacts`; reject missing/empty files before packaging, assert their ZIP entries, and execute every declared installed CLI. An empty list is for workflows requiring no bundled CLI. |
| P2 | Java 8 bytecode targeting did not constrain Java SE APIs. | With the old POM compiler settings on JDK 17, `List.of` compiled for target 1.8. Add a JDK 9+ profile setting `maven.compiler.release=8`; the same source is rejected and a Java 8-compatible API compiles. Preserve the JDK 8 source/target path. |
| P2 | Review and meta requests had no clear route and could be treated as maintenance. | The entry point offered three project modes, while separate review notes required another explicit mode switch before fixes. Add review routing, distinguish work about this skill, and allow corrections already requested by the user. An inspection request alone does not trigger maintenance opportunity selection. |
| P2 | Maintainer document authority was ambiguous. | The entry point and maintenance README called maintainer documents non-normative, while maintenance required the adoption workflow in that directory. Distinguish the operative adoption workflow from dated evidence and pending proposals. Require current rules or a recorded user decision before adopting a proposal. |
| P3 | Optional agent metadata used unsupported top-level fields. | The starter contained top-level `name` and `description`. Use `interface.display_name`, `interface.short_description`, and the existing explicit-only policy. Document the UI description placeholder and its length. |
| P3 | Reference prerequisites disagreed with their fallback and exception paths. | The Node workflow required asking for sister sources despite its documented fallback; the Agent Skills workflow required upstream runtimes before classifying Skill-only products. Scope prerequisites to the relevant case and use available references before asking. Repository convention application is for repository creation/edits. |
| P3 | Small descriptions had drifted from their implementation. | Correct root versus nested scratch-directory exclusions, remove a duplicated Java sentence, and state how user scope, repository contracts, basic documents, workflows, assets, sister examples, and dated audits relate. |

The release injection mechanism is described by
[GitHub's script injection documentation](https://docs.github.com/en/actions/concepts/security/script-injections).
The Java compiler distinction and JDK-activated profile approach are documented
in the [Maven Compiler Plugin release guide](https://maven.apache.org/plugins/maven-compiler-plugin/examples/set-compiler-release.html).
Agent metadata was checked against the locally installed `skill-creator`
reference, `references/openai_yaml.md`.

## Verification

- `npm run test:skill-index-policy`: 78 tests passed, including the new release
  staging regression and the instantiated starter's actual npm commands.
- Starter cases include no-runtime packaging, missing declared CLI rejection,
  a working installed CLI, and a present but broken CLI failing isolated smoke.
- The release regression was also run against the original template and failed
  as expected. The probe uses temporary files and no GitHub execution.
- `skill-creator/scripts/quick_validate.py`: passed.
- Local Markdown relative links and instantiated agent metadata: checked.
- Maven Compiler Plugin 3.11.0 on JDK 17: old source/target accepts `List.of`,
  repaired settings reject it, and `Arrays.asList` compiles. The compiler
  fixture retained the template's compiler settings and profiles while omitting
  unrelated dependencies and distribution plugins.

The Node checks ran on the available Node 26 runtime. CI execution on Node
20/24, a full Java distribution build, Java 8 runtime execution, remote Release
upload, and independent model-based workflow evaluation were not performed.
Static reference reachability does not establish model behavior.

## Further Improvements

- Keep the Node 22/24 migration, public asset/checksum naming, Web manifest
  publication, and reference-path migration in the existing dated decision
  packet. Those are explicit pending policy choices, not discrepancies to
  silently resolve during this review.
- Runtime declaration, ZIP presence, and `--version` smoke are a starter
  baseline. A product should add representative operations and final-byte
  integrity checks where its distribution contract requires them.
- The basic documents contain substantial repeated cross-layer explanations.
  A later restructuring can assign each rule one owner and retain existing
  public paths. The current review preserves those paths and the layered
  product model rather than attempting a wholesale taxonomy migration.
- Preserve explicit activation, local-first operation, upstream semantic
  ownership, and human-owned GitHub publication. These are deliberate product
  choices; a newer model alone is not a reason to replace them.
