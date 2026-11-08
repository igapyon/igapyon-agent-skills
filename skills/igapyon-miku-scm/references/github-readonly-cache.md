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

Cache schema v3 stores normalized Issue lists with each Issue's complete
`labels` array (`name`, `color`, and `description`). Schema v1 and v2 entries,
plus v3 list entries with missing or malformed labels, are cache misses; they
are not served as stale data. Repository and query identities must match the
cache path and request. A single-Issue entry is complete only after the fixed
paginated GraphQL reader has verified every comment page and the Issue
snapshot. Mutation preflight and apply continue to perform their own fresh
complete reads.

Cache data must never authorize a remote mutation. Mutation preflight and
apply helpers continue to perform their own exact snapshot reads and
mutation-time revalidation.
