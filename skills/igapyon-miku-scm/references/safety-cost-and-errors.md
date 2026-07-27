# Safety Cost and Error Paths

## Check Catalog

| Check | Protected invariant | Reuse | Mutation-time requirement | Cost evidence |
| --- | --- | --- | --- | --- |
| workflow manifest gate | only a fixed workflow and safety level can run | process/session | required before every workflow | runner duration |
| argument parser | no unknown option or command fragment | no | required before every workflow | runner parse phase |
| local snapshot | branch, HEAD, index, worktree, version state | same unchanged run | refresh HEAD/branch/dirty before mutation | `subprocess_count` and benchmark |
| GitHub READONLY batch | complete fixed remote query result | TTL/session | never substitutes mutation revalidation | cache/read counters |
| reviewed digest | approved bytes and metadata are unchanged | reviewed plan only | required | delegate preflight/apply |
| conflict check | remote snapshot is unchanged | no | required immediately before mutation | delegate READONLY calls |
| attempt record | mutation is never silently repeated | no | required immediately before mutation | delegate attempt record |
| postcondition | exact requested state exists | no | required after mutation | delegate verification attempts |

Do not remove a check unless the same invariant is established by an atomic
snapshot and a contract test compares failure detection before and after the
change.

## Structured Failure

Every runner error records:

- workflow
- phase
- command ID
- classification
- mutation invocation state (`false` or `null` when unknown)
- retryability
- stable SHA-256 signature

Errors before delegate execution have `mutation_invoked: false`. Uncertainty
inside an apply delegate remains `null` and `do-not-retry`; it is never guessed
safe.

Run:

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-error-report.mjs
```

to group operational `error-event.json` records by stable signature. Expected
safe stops and implementation/environment failures remain distinct.
