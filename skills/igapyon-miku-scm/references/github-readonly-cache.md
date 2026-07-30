# GitHub READONLY Cache and Batch

Use the `github.read.batch` runner workflow to resolve fixed Issue and label
queries in one invocation.

Supported query IDs are:

- `labels`
- `issue:<positive-number>`
- `issues:open`
- `issues:closed`
- `issues:all`

The runner removes duplicate query IDs, executes independent misses with
bounded concurrency, and stores only complete fixed-helper results under:

```text
workplace/miku-scm/github-readonly-cache/<owner>/<repo>/
```

The default TTL is ten minutes. `--refresh` bypasses a fresh entry but replaces
it only after a complete read. When refresh fails, an existing entry is
returned only as `source: stale-cache` with `stale: true` and the error. A
failed query without cache produces `status: not-applied`; stale fallback
produces `status: degraded`.

Cache data must never authorize a remote mutation. Mutation preflight and
apply helpers continue to perform their own exact snapshot reads and
mutation-time revalidation.
