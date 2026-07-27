# Performance Benchmark

Use `scripts/miku-scm-benchmark.mjs` to measure migrated runner workflows.
The initial scenario is remote-free and uses a deterministic GitHub Issue
fixture, so it never mutates GitHub and does not depend on network latency.

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-benchmark.mjs \
  --scenario github-issue-read \
  --iterations 10 \
  --warmup 2 \
  --save
```

The result keeps these dimensions separate:

- cold process execution and warm same-process execution
- p50, p95, minimum, maximum, and individual samples
- runner invocations and expected Agent tool calls
- fixed `gh` read count and actual network request count
- instruction/reference file count and bytes
- configured warm p50 budget

Instruction/reference bytes are derived from `SKILL.md` plus the selected
workflow's manifest-declared `runtime_references`; they are not a hard-coded
approximation. Design and normative contract documents are intentionally
excluded from normal migrated runtime context.

Input and output token counts are `null` when the execution environment does
not expose them. Do not estimate token counts and present them as measured.

Saved operational results live under:

```text
workplace/miku-scm/benchmarks/
```

Use `--max-warm-p50-ms` for a lightweight regression gate. A failed budget
returns a nonzero process status. Absolute timing depends on the machine, so
compare results produced from the same scenario and environment.

The benchmark must remain remote-free. A future mutation scenario may measure
preflight construction with fakes, but it must never execute a GitHub remote
mutation.
