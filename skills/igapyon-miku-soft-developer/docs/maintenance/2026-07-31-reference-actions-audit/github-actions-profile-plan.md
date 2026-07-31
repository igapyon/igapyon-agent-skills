---
title: miku-soft GitHub Actions profile plan
description: "Canonical CI and Release profile proposal, Node 22/24 roles, artifact lifecycle, and high-priority workflow findings."
topics:
  - miku-soft
  - github-actions
  - nodejs
  - release
  - artifacts
category: spec
status: draft
audience:
  - maintainer
  - agent
created: 2026-07-31
updated: 2026-07-31
sources:
  - type: local-file
    role: primary
    path: workplace/miku-soft-reference-audit/wave-c-workflow-inventory.md
    checked: 2026-07-31
  - type: source-code
    role: supporting
    label: 57 direct sibling GitHub Actions workflow files
    checked: 2026-07-31
---

# GitHub Actions Profile Plan

## Evidence Summary

The direct local sibling inventory found:

- 56 candidate sibling repositories;
- 47 repositories with direct workflows;
- 57 workflow files;
- 47 Release workflows and 10 CI workflows;
- 11 workflow filenames;
- 54 distinct exact file contents; and
- only two exact-copy groups covering five files.

The low exact-duplicate rate does not justify one identical template. Product
names and commands are parameters, while event/ref/version/artifact and
verification behavior form the contract.

## Contract Fields

Every workflow should be classified by:

1. event and Release orchestration;
2. source tag/ref and version identity;
3. product compatibility, build runtime, and Action-internal runtime;
4. public artifact roles and final names;
5. build/test, staged artifact smoke, and reproducibility claim; and
6. permissions, staging/upload ownership, rerun, and exception behavior.

## Proposed CI Profiles

| ID | Profile | Candidate contract |
| --- | --- | --- |
| C1 | Node application CI | push/PR, read-only permissions, Node 22/24, product build/test/bundle smoke |
| C2 | Agent Skill CI | push/PR, Node 22/24, embedded runtime and platform checks only when promised |
| C3 | Node library CI | test/build/package, source-map or package-surface checks when applicable |
| C4 | Java library CI | explicit build JDK, Maven test/package, declared consumer checks |

## Proposed Release Profiles

| ID | Profile | Public payload and verification |
| --- | --- | --- |
| R1 | Node CLI | versioned CLI module, conditional curated sources, CLI smoke |
| R2 | Node CLI plus runtime | CLI, runtime, conditional sources, both final artifacts smoke |
| R3 | Node library | bundle with conditional source/map pair and package checks |
| R4 | Web assets | app/index HTML and optional stable public manifest |
| R5 | custom Java executable | executable jar and conditional sources jar, explicit build JDK and runtime smoke |
| R6 | Maven-native Java executable | Maven jar/classifier names, tag/POM gate, runtime smoke |
| R7 | Java library | library jar and optional sources, no invented CLI smoke |
| R8 | Skill attachment | versioned ZIP attached to an existing Release |
| R9 | Skill tag-to-draft | tag/commit/version relation and conditional reproducibility |
| R10 | npm/MCP package | native npm pack tarball and packed-surface proof |
| R11 | Skill tag/default visibility | visibility and owner must be explicitly selected before reuse |

## Shared Invariants

- A manual tag input is checked out and validated before version reading,
  building, or publication.
- Source tag, checkout SHA, package/POM version, public filenames, and target
  Release describe one identity.
- Repository-owned commands are parameters, but staging is clean and the final
  file set is exact.
- Executable/runtime behavior is tested on final staged bytes.
- Checksums are generated after final renames and content rewrites.
- Uploads use explicit files or a wildcard guarded by exact-set checks.
- Product compatibility, Release build host, and Action runtime are separate.
- Exceptions state reason, owner, replacement verification, and exit condition.

## Node Role Proposal

| Role | Candidate |
| --- | --- |
| Product minimum | engines.node >=22 for a Node product |
| Ordinary CI | Node 22 and 24 |
| Release build host | Node 24 |
| Final JavaScript proof | staged artifact smoke on Node 22 when >=22 is claimed |
| Bundle target | node22 only with the same public compatibility decision |
| Action runtime | separately approved Node-24-aware major or immutable pin |

Node 24-only, browser-only, Java-only, and non-Node Skill products remain
explicit profiles or exceptions.

The 2026-07-31 inventory found 42 workflows using setup-node: 27 fixed at 20,
10 fixed at 24, 2 fixed at 22, plus four CI matrices. Root package declarations
and bundle compiler targets must be migrated with their own compatibility
evidence; workflow numbers alone are not product support claims.

## Release Artifact Contract

The candidate lifecycle is:

    validate tag/ref/version
    → build and test
    → recreate a clean stage
    → assign final public names and assert the exact set
    → smoke final bytes
    → generate and verify SHA-256
    → upload only the declared set

The leading future custom name grammar is:

    <release-family>[-<role>][-<platform>-<arch>]-<release-version>.<ext>

Use a small role vocabulary such as runtime, sources, index, and manifest.
Retain Maven classifier names and native npm pack names as explicit profile
exceptions.

The leading integrity recommendation is one SHA256SUMS for future multi-asset
Releases. Existing per-ZIP sidecars remain part of historical Releases. Do not
upload both formats by default.

SHA-256 proves byte integrity. It does not prove publisher identity, signing,
provenance, or reproducibility.

## Evidence-Backed P0/P1 Findings

| Priority | Scope | Finding |
| --- | --- | --- |
| P0 | miku-indexgen-java manual dispatch | input tag is resolved after a default checkout; a different revision can be built |
| P1 | miku-docx2md tag Release | upload is visible but Release creation ownership is absent from YAML |
| P1 | four custom Java CLI workflows | Maven build occurs before an explicit build JDK is selected |
| P1 | mikuproject-mcp | no visible tag-to-nested-package-version relation |

The four Java workflows are miku-grep-java, miku-javaclass2json-java,
miku-readfile-java, and mikuproject-java.

## Consumer-First Naming Constraint

A future producer rename requires a consumer register first.

The highest-impact known surface is the versioned miku-ms-office-core .mjs and
.mjs.map pair. At least seven product source trees import or vendor fixed names,
while the current producer-side verifier names only three consumers.

Other consumer forms include:

- exact filenames plus SHA-256 locks inside Skill bundles;
- regex runtime resolvers with exact fixture expectations;
- Web downloaders that persist selected name, URL, and digest;
- direct GitHub Release URLs in README/examples;
- source-map references that must match the final .mjs filename; and
- released ZIP contents and provenance records.

Existing published names, URLs, digests, metadata, and released bundles are
immutable. Any dual-name bridge must have an approved duration and removal
condition.

## Parallelization Boundary

Parallel work is appropriate for read-only inventories, consumer scans, test
design, and independent profile evidence.

Mutations remain serial when they share:

- a workflow template;
- a public filename or checksum contract;
- an exact downstream consumer;
- the same target GitHub Release; or
- the same repository worktree.

This preserves reviewability and prevents one concurrent change from
invalidating another agent's evidence.
