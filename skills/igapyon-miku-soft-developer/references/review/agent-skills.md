# Agent Skills Review

Use this review note for miku-soft `40 Agent Skills` repositories.

Agent Skills are workflow packages for AI agents. They should expose upstream
miku product operations through clear activation rules, artifact roles,
diagnostics, and execution backend policy without becoming a replacement
implementation of the upstream product.

## Classification

Apply this review when the target repository or artifact has this shape:

- layer: `40 Agent Skills`
- repository role: agent-facing workflow package
- expected use: explicit agent activation, local workflow guidance, runtime
  execution, or visible handoff
- backend pattern: handoff-only, CLI-backed, MCP-backed, or CLI plus MCP-backed

## Core Contract

A miku-soft Agent Skills repository should satisfy these principles:

- skill activation is explicit and narrow
- upstream product semantics remain owned by the upstream main application
- product operations use upstream public APIs, documented CLI commands, bundled
  runtime artifacts, or aligned MCP tools before skill-local product logic
- artifact roles are named clearly, such as canonical source, state, draft,
  patch, projection, report, diagnostics, runtime artifact, and temporary data
- diagnostics, warnings, hard errors, and handoff points are visible to the
  agent and user
- `SKILL.md` stays lean and points to references for longer workflows

## Backend Policy Checks

Agent Skills may use different execution backends. The policy must be explicit
because it changes local execution, fallback behavior, and network exposure.

Check these points:

- README, `SKILL.md`, or references identify the backend pattern
- strict policies such as `cli-only`, `mcp-only`, and `handoff-only` do not
  silently fall back to another backend
- preferred policies such as `cli-preferred` or `mcp-preferred` state when
  fallback is allowed
- fallback diagnostics state the original backend, fallback backend, and reason
- backend support is represented in operation maps or tests
- unsupported operations fail visibly instead of silently switching semantics
- handoff-only mode never executes product operations

## Network Awareness Checks

CLI-backed Agent Skills normally execute local runtime artifacts. MCP-backed
Agent Skills may call a local stdio MCP server or an HTTP MCP server. The HTTP
case involves network communication and should be visible to the user.

Check these points:

- the skill tells the user when an operation will call MCP over HTTP instead of
  running a local CLI artifact
- the target MCP endpoint or configured server identity is visible enough for
  review
- HTTP MCP fallback is not silent when the expected local CLI backend fails
- user-facing notes distinguish local stdio MCP from HTTP MCP
- private local file paths, input data, generated artifacts, and diagnostics are
  not sent to HTTP MCP unexpectedly
- the skill respects environment restrictions that disallow CLI execution or
  MCP access
- examples and tests cover no-fallback behavior and permitted fallback behavior

If MCP HTTP is used, the skill does not need to duplicate the MCP server's full
security design, but it should warn that the operation communicates with that
server and should not hide the change from local CLI execution.

## Runtime Artifact Checks

For CLI-backed skills, check these points:

- required runtime artifacts live under the skill directory, normally
  `skills/<skill-name>/runtime/`
- Java runtime artifacts are single jars when available
- Node.js runtime artifacts are single `.mjs` files when available
- runtime artifact names are versioned and product-specific
- source archives have a separate review or provenance role and are not needed
  for normal execution unless documented
- runtime lookup checks declared paths before broad repository search
- `--version` and `--help` or equivalent metadata commands are smoke-tested

## Packaging Checks

Check these points:

- installable bundles include `SKILL.md`, needed references, skill-local helper
  files, the generated `index.json` discovery artifact, and required runtime
  artifacts
- bundle tests exclude development-only files such as `tests/`, `bundle/`,
  `node_modules/`, `.DS_Store`, and `workplace/` contents
- structure or validation tests fail when `skills/<skill-name>/index.json` is
  missing
- skill-local helpers live under `skills/<skill-name>/lib/` when they are
  required in installed bundles
- release zip names and bundle paths are product-specific and versioned
- isolated bundle smoke verifies runtime lookup from the installed shape

## Severity Guidance

Use this severity guidance during Review mode:

- Critical: the skill sends private local input or derived artifacts to an HTTP
  backend without making that network execution visible.
- High: backend policy silently falls back from local CLI to MCP HTTP, or from
  strict `*-only` policy to another backend.
- High: the skill reimplements upstream product semantics in skill-local code
  instead of calling upstream APIs, CLI, runtime artifacts, or MCP tools.
- High: required runtime artifacts are missing from the installed bundle.
- Medium: backend policy exists but operation maps, README, tests, or
  diagnostics do not make it understandable.
- Medium: runtime lookup searches broadly before checking declared
  skill-local runtime paths.
- Medium: bundle tests do not verify required files and development-only
  exclusions.
- Medium: `index.json` is missing, stale, or not checked by structure and
  release bundle tests.
- Low: minor naming or documentation issues make artifact roles or backend
  behavior harder to understand.

## Review Output

When this review applies, include a short classification before findings:

```text
Agent Skills Review

Layer: 40 Agent Skills
Backend pattern: handoff-only / CLI-backed / MCP-backed / CLI plus MCP-backed
Network behavior: local CLI / local stdio MCP / HTTP MCP / none
Runtime artifacts: Java jar / Node mjs / none
Activation policy: explicit opt-in
```

Then report findings in severity order. Do not edit files during Review mode
unless the user explicitly asks to switch from review to maintenance work.
