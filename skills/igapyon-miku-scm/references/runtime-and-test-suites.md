# Runtime and Test Suites

The deterministic runner reuses the exported parsers and implementations of
existing static helpers. Shared runner concerns live in the `miku-scm-*`
modules for workflow metadata, local snapshots, GitHub READONLY cache, run
artifacts, and benchmark statistics. Workflow-specific mutation contracts
remain in their dedicated helpers.

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

before commit or publication. `test:miku-scm` remains a compatibility alias
for the full safety suite.

The fixed `miku-scm-test-suite.mjs` runner divides the slow publication and
repository-maintenance files into non-overlapping name shards. It validates
that every test matches exactly one shard before starting concurrent Node
processes. Every sharded case owns a separate temporary Git repository.
Do not shard tests that share a repository, attempt record, cache directory,
mock queue, or mutable process state.

Both suites retain contract assertions for exact command arrays, approval
boundaries, digest conflicts, attempt records, and mutation non-retry.
