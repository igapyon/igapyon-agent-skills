# Runtime and Test Suites

The deterministic runner reuses the exported parsers and implementations of
existing static helpers. Shared runner concerns live in the `miku-scm-*`
modules for workflow metadata, local snapshots, GitHub READONLY cache, run
artifacts, approval handoff, deterministic human output, and benchmark statistics. Workflow-specific mutation contracts
remain in their dedicated helpers.

## Scope

The commands in this document validate miku-scm while developing it from its
source repository. They are not completion checks for an ordinary miku-scm
operation against another repository. Do not run a miku-scm fast or full suite,
or a contract drift check, after recommit, publication, Issue, version, or
maintenance work merely because miku-scm performed that workflow. Those tests
do not validate the target project and can depend on the miku-scm source-tree
layout.

For ordinary SCM work, retain the fixed runner's workflow-specific safety
checks and run only relevant target-project tests that the user requested or
the target repository documents. Report target-project tests separately from
miku-scm source tests.

Use:

```sh
npm run test:miku-scm:fast
```

for the remote-free runner, manifest, snapshot, cache, benchmark, fixed Issue
read, and draft-location feedback loop.

Use:

```sh
npm run test:miku-scm:full
```

before committing or publishing changes to miku-scm itself. `test:miku-scm`
remains a compatibility alias for the full safety suite.

The fixed `miku-scm-test-suite.mjs` runner divides the slow publication and
repository-maintenance files into non-overlapping name shards. It validates
that every test matches exactly one shard before starting concurrent Node
processes. Every sharded case owns a separate temporary Git repository.
Do not shard tests that share a repository, attempt record, cache directory,
mock queue, or mutable process state.

Both suites retain contract assertions for exact command arrays, approval
boundaries, digest conflicts, attempt records, and mutation non-retry.

After changing a migrated runner, normative spec, manifest contract mapping, or
contract test, regenerate and verify the tracked contract artifacts:

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-workflow-contracts.mjs
node skills/igapyon-miku-scm/scripts/miku-scm-workflow-contracts.mjs --check
```

The generated lock is the runtime source for contract identity. The generated
Markdown table is human-facing. Do not edit either by hand.
