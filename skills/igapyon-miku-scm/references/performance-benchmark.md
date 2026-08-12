# Performance Benchmark

Use `scripts/miku-scm-benchmark.mjs` to measure migrated runner workflows.
All scenarios are remote-free and use deterministic fixtures, so they never
mutate GitHub and do not depend on network latency.

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-benchmark.mjs \
  --scenario github-issue-read \
  --iterations 10 \
  --warmup 2 \
  --save
```

Run all three workflow classes to compare the AI boundary:

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-benchmark.mjs \
  --scenario github-issue-read --iterations 10 --warmup 2
node skills/igapyon-miku-scm/scripts/miku-scm-benchmark.mjs \
  --scenario writing-issue-prepare --iterations 10 --warmup 2
node skills/igapyon-miku-scm/scripts/miku-scm-benchmark.mjs \
  --scenario writing-issue-update-prepare --iterations 10 --warmup 2
node skills/igapyon-miku-scm/scripts/miku-scm-benchmark.mjs \
  --scenario writing-issue-comment-prepare --iterations 10 --warmup 2
node skills/igapyon-miku-scm/scripts/miku-scm-benchmark.mjs \
  --scenario github-issue-create-preflight --iterations 10 --warmup 2
node skills/igapyon-miku-scm/scripts/miku-scm-benchmark.mjs \
  --scenario github-issue-label-preflight --iterations 10 --warmup 2
node skills/igapyon-miku-scm/scripts/miku-scm-benchmark.mjs \
  --scenario github-issue-close-preflight --iterations 10 --warmup 2
```

These represent `mechanical`, operation-aware `writing`, and `approval` paths.
Create, update, and comment retain one expected model invocation after writing
evidence; create, label, and close preflight retain zero. Each result exposes
the same comparison dimensions: expected model invocations
after the runner, expected Agent tool calls, elapsed-time statistics, and
observed failure rate. Writing retains one expected model invocation for the
prose draft; mechanical and approval output require none after the runner.

The result keeps these dimensions separate:

- cold process execution and warm same-process execution
- p50, p95, minimum, maximum, and individual samples
- runner invocations and expected Agent tool calls
- structured result bytes and deterministic `human_output` bytes
- fixed `gh` read count and actual network request count
- expected model invocations after the runner and observed failure rate
- instruction/reference file count and bytes
- configured warm p50 budget

Instruction/reference bytes are derived from `SKILL.md` plus the selected
workflow's manifest-declared `runtime_references`; they are not a hard-coded
approximation. Design and normative contract documents are intentionally
excluded from normal migrated runtime context.

Input and output token counts are `null` when the execution environment does
not expose them. Do not estimate token counts and present them as measured.
Model invocation count is likewise `null` when the environment does not expose
it. `expected_agent_tool_calls_per_sample` describes the fixed Agent-to-runner
boundary; it is not a measured model invocation count.

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
