---
title: miku-soft developer implementation record
description: "Implementation and verification record for the 2026-10-22 Luna plan."
category: maintenance
status: stable
created: 2026-10-22
updated: 2026-10-22
---

# 2026-10-22 Implementation Record

## Scope and starting state

| Date | Base commit | Worktree at start |
| --- | --- | --- |
| 2026-10-22 | 5a7376da5db640749e7a9e0a9169221aaeea5cb2 | The earlier skill review and this plan were already uncommitted. Seven other modified files belonged to separate miku-scm and repository work and were left untouched. |

Implemented LUNA-00 through LUNA-04 and LUNA-06. The source repository was /Users/igapyon/Documents/git/igapyon-agent-skills. This was maintenance of the skill itself; it did not start a product workflow.

The seven unrelated tracked modifications present at the start were pom.xml and these miku-scm files: references/github-cli-static-helper-policy.md, references/workflow-contracts.md, scripts/github-issue-read.mjs, scripts/miku-scm-workflow-contract-lock.mjs, tests/github-issue-read.test.mjs, and tests/miku-scm-run.test.mjs.

During the work, HEAD advanced from the starting commit to b81bfdd158c8fe5bfc1f4e07bf71cacc780ad3cb (message: save; author: user). A hash comparison against the saved start-of-work snapshot confirms all seven files now match that commit exactly. This agent did not create or amend that commit; its changes remain separate in the worktree.

## Environment

| Tool | Available version | Limitation |
| --- | --- | --- |
| Node.js | v26.12.0 | Node 20, 22, and 24 were not installed for this run |
| npm | 11.20.0 | — |
| Java and javac | OpenJDK 17.0.21 | Java 8 runtime was unavailable |
| Maven | 3.10.0 | Full Java distribution build was not part of this slice |

The previous review on the same date had already checked the starter compiler configuration with Maven Compiler Plugin 3.11.0 on JDK 17: Java 8-compatible APIs compiled, and List.of was rejected with release 8. That check is recorded in 2026-10-22-skill-review.md; it was not repeated here. No Java 8 execution claim is made.

## Work completed

| ID | Implementation |
| --- | --- |
| LUNA-00 | Confirmed the canonical repository, starting commit, existing worktree changes, Node/npm/JDK/Maven versions, and pending decisions. No changes were made to unrelated diffs. |
| LUNA-01 | Added 2026-10-22-rule-ownership.md with owners, workflow callsite summaries, exceptions, and the resulting document decisions. |
| LUNA-02 | Removed the duplicated basic-document inventory from the overview and linked to the architecture selector. Consolidated repeated Agent Skills Node version prose under its basic design owner. Kept existing paths and recorded the approved Node policy in its owning design section. |
| LUNA-03 | Changed isolated runtime smoke to build, extract, and execute from the actual release ZIP. The fixture covers an empty runtime declaration, missing and empty artifacts, a missing second backend, a broken CLI, a renamed ZIP, a corrupted ZIP, and a small file operation from the extracted ZIP. |
| LUNA-04 | Reflected the approved Node 22 floor / Node 24 newest-LTS snapshot in the first-party docs and starter metadata/CI. Added a shared verifier for a supplied staged ZIP and a Release workflow step that switches to Node 22 after staging the final release name. The current checkout has no Node main app or Web Release workflow assets, so no such workflow was added. |
| LUNA-06 | Ran the full skill index/policy and archive suite, the complete routing suite, skill-creator validation, and whitespace checks. Reviewed the final diff and recorded the remaining decision gates below. |

## Verification

| Command or check | Environment | Result |
| --- | --- | --- |
| node --test --test-name-pattern='instantiated index-free starter' scripts/skill-reference-routing.test.mjs | Node v26.12.0 | Passed after correcting the fixture so the dual-backend case reaches the missing-JAR check |
| npm run test:skill-index-policy | Node v26.12.0 | Passed: 78 tests, 0 failures |
| node --test scripts/skill-reference-routing.test.mjs | Node v26.12.0 | Passed: 16 tests, 0 failures |
| GitHub Actions verification design | CI runs `npm run build` on push/PR with Node 22 and 24; Release builds on 24 and checks the staged ZIP on 22 before upload | Workflow files and triggers inspected; Actions were not run in this task |
| python3 /Users/igapyon/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/igapyon-miku-soft-developer | Python environment provided by the installation | Passed: Skill is valid |
| git diff --check | Git worktree | Passed |
| Relative Markdown links in the changed and new maintenance documents | Local source files | Checked after the execution record was added |

The shared ZIP verifier checks archive integrity, safe entry paths, required and forbidden entries, extracts the supplied ZIP to a temporary directory, and runs every declared CLI version check there. It does not rebuild the supplied archive. The release test passes the renamed ZIP and corrupted ZIP directly to this verifier; the fixture's count-lines operation also succeeds from the extracted ZIP.

## Decision gates and work not performed

- D-NODE is approved and reflected as described in the addendum below.
- D-JAVA is approved and reflected in the Java application design and straight-conversion workflow, as described in its addendum. This documentation update did not execute Java 8 or Java 25.
- D-PATH remains pending. No file paths were moved, deleted, or replaced with compatibility stubs.
- D-INTEGRITY remains pending. Public asset names and checksum formats were not changed; no public checksum was introduced.
- D-DEPLOY was not requested. The canonical source was not synchronized to the local Codex skill directory.
- D-EVAL was not requested. No independent Luna/model behavior evaluation was performed.
- Local Node 22/24 execution is not required by the adopted verification strategy. GitHub Actions is the authoritative Node version check: push/PR CI tests Node 22 and 24, and Release smoke-checks the Node 24-built staged ZIP on Node 22 before upload. Those Actions runs were not triggered in this task, so their results remain unverified. Java 8/25 execution, full Java distribution packaging, Release upload, commit, and push were also not performed.

The canonical source contains the implementation. The installed copy at /Users/igapyon/.codex/skills/igapyon-miku-soft-developer remains unsynchronized.

## Addendum: D-NODE decision and follow-up

After the recorded implementation, the user approved the Node compatibility
policy: use the oldest Node.js LTS line still maintained upstream as the
product floor, verify that floor and the newest LTS, and include maintained
LTS lines between them when practical. The 2026-10-22 starter snapshot is
Node.js 22 as the floor and Node.js 24 as the newest LTS / Release build host.
The Web starter's Node.js requirement remains a separate build-tool contract
and uses Node.js 24.

The shared Node workflows, Agent Skills design, Web workflow note, and starter
metadata/CI values were updated accordingly. The Agent Skills Release workflow
builds on Node 24, stages the final release-named ZIP, then invokes
`scripts/verify-release-zip.mjs` on Node 22 before upload. The same verifier is
exercised by the local starter suite with normal, renamed, and corrupted
archives. GitHub Actions is the formal cross-version verification environment;
local Node 22/24 installations are not required. The push/PR matrix and Release
workflow are configured, but no Actions run was triggered in this task, so
cross-version runtime results remain pending. The installed skill copy remains
unsynchronized.

## Addendum: D-JAVA decision and follow-up

On 2026-10-22, the user approved Java 8 as the default minimum runtime for
miku Java CLI products and the newest LTS as a forward-compatibility check.
Verify packaged behavior on Java 8 and the newest LTS of the declared JDK
distribution. Keep the build JDK as a separate project choice, use Java 8
API targeting when compiling on a newer JDK, and name the distribution when a
support claim depends on its lifecycle.

As of this decision, Java 25 is the newest LTS; Oracle lists Java 29 as the
next planned LTS for September 2027. Eclipse Temurin lists Java 8 availability
through at least December 2030. These are dated, distribution-specific facts;
check the selected vendor roadmap when refreshing the baseline.

The Java application design and straight-conversion workflow now own and apply
this policy. This follow-up changed shared skill guidance and tracking
documents only. Java 8/25 execution, product packaging, and GitHub Actions
were not run. The installed skill copy remains unsynchronized.
