# Agent Skill CLI Integration Review

Use this reference to review Agent Skills that bundle or call a local CLI
runtime.

This review checks whether the skill activates narrowly, discovers the bundled
CLI reliably, maps user intents to CLI operations correctly, reports fallback
or failure clearly, and does not silently reimplement product behavior inside
the skill.

## Review Priority

Use this review when an Agent Skill includes, expects, or delegates to:

- bundled CLI runtime files
- Java jars
- Node `.mjs` runtime artifacts
- shell scripts or helper commands
- Maven or Gradle command wrappers
- local product CLIs installed outside the skill directory

Use it together with generated artifact, archive/package contents, CLI/tool UX,
secrets, and software completion reviews.

## Activation and Intent Checks

Check whether:

- skill activation is explicit and narrow
- `SKILL.md` states when the CLI-backed workflow should run
- ordinary requests do not accidentally trigger expensive or write-producing CLI
  operations
- user intent maps to a documented CLI operation
- unsupported operations fail visibly rather than silently doing a different
  operation
- the skill asks for missing required inputs instead of guessing risky paths,
  modes, or output locations

## Runtime Discovery Checks

Check whether the skill can find the intended CLI runtime:

- declared runtime path is documented in `SKILL.md` or references
- bundled runtime path is checked before broad filesystem search
- runtime artifacts are included in skill bundles when required
- runtime artifact names include product and version when practical
- `--version` and `--help` are used as smoke checks when available
- missing runtime produces a clear handoff or setup message
- local absolute paths are not hard-coded into the skill
- fallback to external CLI, MCP, or HTTP is explicit when allowed

## Operation Mapping Checks

Check whether skill instructions define:

- supported operations
- required inputs
- output paths or artifact roles
- safe defaults
- validation failures and diagnostics
- whether the CLI reads from files, stdin, arguments, or config
- whether the CLI writes files, stdout, reports, bundles, or diagnostics
- when `--verbose`, JSON output, or machine-readable modes should be used

For AI-agent workflows, the operation map should be concrete enough that the
agent does not need to infer command syntax from source code.

## Execution Safety Checks

Check whether CLI execution is safe and visible:

- write-producing commands are visible to the user
- network behavior is visible if the CLI can call remote services
- private local files are only read from explicit user-provided paths
- output files are written to documented locations
- stderr/stdout handling is described when parsing output
- failures are surfaced to the user instead of hidden behind fallback behavior
- strict policies such as `cli-only` do not silently fall back
- preferred policies such as `cli-preferred` state permitted fallback conditions

## Skill vs Product Logic Checks

Agent Skills should not become a second implementation of the product.

Flag issues when:

- skill-local code duplicates product semantics that belong in the CLI
- skill instructions ask the agent to manually reproduce CLI behavior
- CLI and skill examples diverge in option names, defaults, or artifact terms
- diagnostics or warnings are invented by the skill rather than passed through
  or mapped from the CLI contract
- generated outputs differ depending on whether the CLI or skill-local logic is
  used

Prefer calling the upstream CLI, documented API, bundled runtime artifact, or
MCP tool instead of reimplementing product behavior in prompt instructions.

## Severity Guidance

Use these severity levels:

- High: bundled CLI is required but missing from the installed skill or bundle.
- High: skill silently reimplements product behavior instead of calling the
  intended CLI/runtime.
- High: strict CLI-backed policy silently falls back to another backend.
- High: skill can read or write unexpected local files because input and output
  paths are not scoped.
- Medium: CLI runtime discovery uses broad filesystem search before declared
  skill-local paths.
- Medium: skill activation or operation mapping is too broad, causing accidental
  CLI execution or wrong operation selection.
- Medium: `--help`, `--version`, or smoke checks are not documented for the
  bundled CLI.
- Medium: README, `SKILL.md`, and CLI help disagree about command syntax,
  defaults, or artifact roles.
- Low: minor naming, wording, or diagnostic mapping issue makes CLI-backed skill
  behavior harder to understand.

## Review Output

Use this format when CLI-backed Agent Skills are in scope:

```text
Agent Skill CLI Integration Review

Backend pattern: cli-only / cli-preferred / mixed / unclear
Runtime discovery: bundled / external / broad search / missing / not checked
Operation mapping: clear / partial / weak / not checked
Execution safety: clear / risky / unclear / not checked

Findings:
- Severity: ...
  Issue: ...
  Why it matters: ...
  Suggested direction: ...
```

Do not edit skill instructions, runtime files, or bundled artifacts during
review mode unless the user explicitly asks to switch to maintenance work.
