# MCP Server Review

Use this review note for miku-soft `50 MCP` repositories.

MCP servers are protocol adapters over upstream miku product operations. They
should expose tools, resources, prompts, diagnostics, and artifact roles without
becoming the semantic owner of the product.

## Classification

Apply this review when the target repository or artifact has this shape:

- layer: `50 MCP`
- repository role: MCP protocol adapter
- expected use: MCP client access to product operations
- transport: stdio, local HTTP, or network-exposed HTTP
- runtime backend: upstream API, bundled CLI artifact, Java runtime, Node.js
  runtime, or local files

## Core Contract

A miku-soft MCP server should satisfy these principles:

- product semantics remain owned by the upstream main application
- MCP tools and resources preserve upstream vocabulary and artifact roles
- structured inputs, structured results, diagnostics, and hard errors are
  stable and documented
- transport choices do not change product semantics
- local stdio is the first simple transport unless the repository explicitly
  targets HTTP
- HTTP transport has explicit session, storage, authentication, authorization,
  and isolation decisions

## Tool and Resource Checks

Check these points:

- tool names are product-prefixed and operation-specific
- input schemas reject unknown or unsafe shapes where practical
- result shapes preserve artifact roles, diagnostics, warnings, and generated
  file references
- resources have stable URI roles for reusable state, specs, reports,
  generated files, and diagnostics
- prompts are small, product-specific, and aligned with operation vocabulary
- MCP server code does not duplicate product core logic that belongs upstream
- Agent Skills operation maps, when they exist, align with MCP tool and
  resource vocabulary

## Transport Checks

Check these points:

- stdio and HTTP transports are documented as different deployment modes
- local stdio does not imply network exposure
- HTTP transport documents host, port, bind address, base URL, and intended
  exposure level
- default HTTP binding is local-only unless the repository clearly documents a
  network-exposed deployment mode
- HTTP and stdio variants expose aligned tools and result shapes
- transport-specific behavior, such as session IDs or file storage, does not
  redefine product semantics

## HTTP Defense Checks

When an MCP server is exposed through HTTP, some defense is required. The exact
strength depends on whether it is localhost-only, LAN-visible, or internet
visible, but a network-exposed product adapter should not be left as an
unprotected file-processing service.

Check these points:

- authentication and authorization are present, or the server is explicitly
  constrained to local-only use
- bind address defaults to localhost for local development
- public or LAN exposure requires an explicit opt-in configuration
- session model is documented, including session creation, expiration,
  invalid-session behavior, and cleanup
- per-session storage is isolated when user state, uploaded files, or generated
  artifacts are stored
- request body size, file size, output size, and artifact retention limits are
  defined
- CORS, origin checks, or equivalent browser-facing protections are considered
  for HTTP deployments
- TLS or reverse-proxy assumptions are documented when the server is intended
  for non-local access
- logs avoid leaking private file contents, secrets, or large generated
  artifacts
- errors do not expose local absolute paths or server internals unnecessarily
- rate limiting, concurrency limits, or queueing are considered for expensive
  product operations

If the repository intentionally provides only a localhost development server,
review whether README and defaults prevent accidental public exposure.

## File and Artifact Safety Checks

Check these points:

- local file access is scoped by explicit input, configured workspace, or
  session storage
- path traversal, symlink escape, hidden files, and ignored files are handled
  intentionally when the server reads local files
- generated files are written under documented output or session directories
- artifact URLs or resource URIs cannot read arbitrary local paths
- cleanup policy exists for temporary files and session artifacts
- diagnostics identify skipped, unsupported, truncated, or unsafe inputs

## Network and Privacy Notice Checks

MCP HTTP changes the user's privacy model compared with local CLI or stdio
execution. Review whether this is visible.

Check these points:

- README states when the server accepts HTTP requests
- examples distinguish local stdio use from HTTP use
- users are warned before exposing the server beyond localhost
- private local files, uploaded inputs, generated artifacts, and diagnostics are
  described as data handled by the server
- Agent Skills or client docs that call the HTTP server mention the network
  behavior and endpoint configuration

## Severity Guidance

Use this severity guidance during Review mode:

- Critical: an HTTP MCP server can read or process private local files over the
  network without authentication, local-only binding, or explicit exposure
  controls.
- Critical: HTTP endpoints expose arbitrary local file read/write through path
  traversal or unscoped resource URIs.
- High: network-exposed HTTP lacks a documented session, auth, storage, or
  cleanup model.
- High: HTTP fallback from local execution is hidden from users or Agent Skills.
- High: MCP tools redefine upstream product semantics instead of adapting them.
- Medium: stdio and HTTP transports diverge in tool names, result shapes, or
  diagnostics without a documented reason.
- Medium: request and output size limits are missing for file-processing
  operations.
- Medium: README does not warn users about localhost vs network-exposed HTTP
  behavior.
- Low: minor naming, docs, or examples make transport or artifact roles harder
  to understand.

## Review Output

When this review applies, include a short classification before findings:

```text
MCP Server Review

Layer: 50 MCP
Transport: stdio / local HTTP / network-exposed HTTP
Backend runtime: upstream API / Node CLI / Java CLI / local files
HTTP exposure: localhost-only / LAN / internet / unspecified
Auth/session model: documented / missing / not applicable
```

Then report findings in severity order. Do not edit files during Review mode
unless the user explicitly asks to switch from review to maintenance work.
