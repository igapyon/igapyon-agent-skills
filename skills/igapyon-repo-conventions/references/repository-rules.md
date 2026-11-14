# Repository Rules

Detailed repository conventions for `igapyon-repo-conventions`.

## .gitignore

Manage local files in the repo-side `.gitignore` according to their role. Exclude machine-local configuration, dependencies, scratch material, and disposable generated output. Keep files needed by other clones, including shared configuration, lockfiles, sanitized examples, fixtures, and intentionally distributed artifacts. Generated files can also be shared artifacts.

### Selection and scope

Inspect existing root and relevant nested `.gitignore` files, tracked paths, README instructions, manifests, and build settings. Select rules from configuration or established operation even if an output directory does not exist yet. Keep discovery within the requested repositories and relevant project files; dependency trees and sibling repositories do not need a general scan.

Add only missing coverage. Preserve comments, rule order, and negations; equivalent existing rules do not need normalization or duplication. Avoid blanket exclusions such as `*.json`, `.vscode/`, `.codex/`, `local-data/`, or `runtime/` unless their entire scope is confirmed machine-local or disposable.

Use root-anchored paths for root-only areas, such as `/workplace/` and `/release-assets/`. Keep dependency rules such as `node_modules/` effective in child projects. For multiple applications, select configuration and output paths for each application instead of assuming that every directory with the same name is disposable.

Preserve shared exceptions in the effective Git rules, as well as documenting them in `README.md`. A child exception cannot reopen an excluded parent directory. When keeping a file in an otherwise generated directory, ignoring its contents permits an exception such as:

```gitignore
/bundle/*
!/bundle/cli.mjs
```

Adapt the path and filename to the actual shared artifact. Check relevant ancestor and nested rules before changing an existing exception.

### Common

Include `.DS_Store` so macOS metadata files are excluded for every clone.

### Node.js / frontend

For Node.js or frontend repositories, exclude dependencies, repository-local npm cache, and npm debug logs:

```gitignore
node_modules/
.npm-cache/
npm-debug.log*
```

Select build, coverage, and local log rules from the actual configuration or documented operation. For root output directories, typical candidates are:

```gitignore
/dist/
/bundle/
/coverage/
*.log
```

Use the actual output paths for child applications. Preserve intentionally shared distribution files or log fixtures with suitable exceptions.

### Java / Maven

For Java repositories, exclude compiled bytecode while preserving intentionally shared class fixtures:

```gitignore
*.class
```

For Maven repositories, also exclude build output, including that of child modules:

```gitignore
target/
```

Add `bin/` or another output directory when Java build or IDE settings identify it as generated output. Keep shared JARs and IDE project settings according to the repository's operation.

### Local environment files

When configuration, code, or documentation establishes use of local environment files, exclude actual local settings and keep sanitized examples. For an application at the repository root:

```gitignore
/.env
/.env.*
!/.env.example
!/.env.*.example
```

For child applications, scope these rules to their application roots. Preserve any existing shared profiles, such as a sanitized `.env.test`, with explicit exceptions when they are part of the repository's operation. Report paths and roles rather than environment values.

### Release staging

When release scripts or documentation use a directory for disposable generated release files, exclude that directory. The common root staging convention is:

```gitignore
/release-assets/
```

This rule applies across technology stacks. If the staging directory contains files intentionally distributed through Git, use the contents-and-exceptions pattern above to keep those files available.

### Tool-specific caches

Add cache rules when the selected tooling generates them. Examples include `/.cache/` for a root cache and `*.tsbuildinfo` for TypeScript incremental build metadata. Match the actual configured paths and preserve shared fixtures; a Node.js or frontend label alone does not establish these outputs.

### VS Code MCP

Ignore local VS Code MCP configuration by default:

```gitignore
/.vscode/mcp.json
```

If MCP settings should be shared, place a sanitized example such as `.vscode/mcp.example.json` or documentation under `docs/` instead of committing the local `.vscode/mcp.json`.

### workplace/

For local work areas, use `workplace/` with a tracked `.gitkeep`:

```gitignore
/workplace/*
!/workplace/.gitkeep
```

Create `workplace/.gitkeep` if `workplace/` is part of the repository convention and the file does not exist.

### Verification and reporting

For changed ignore rules:

- Compare untracked paths before and after the edit within the affected scope, so newly hidden source or shared files are noticed. Summarize the relevant differences rather than dumping dependency trees.
- Use `git check-ignore -v --no-index -- <paths>` to check representative excluded paths and protected exceptions. Paths need not be created solely for this check. A matched pattern starting with `!` denotes an exception; verbose output alone does not mean the path is ignored. Check the reported rule source so personal global exclusions do not substitute for repository rules.
- Confirm applicable shared paths remain eligible for Git: source, lockfiles, environment examples, `workplace/.gitkeep`, and any retained fixtures or distribution files. Account for relevant nested ignore files.
- Inspect tracked paths with `git ls-files`. Ignore rules do not stop tracking existing files. Report tracked local outputs or configuration; changing ignore rules alone does not authorize deleting files or removing them from the index.
- Report added rules and their reasons, retained exceptions, and any tracked files that still need a separate decision. For inspection requests, report proposed changes only.

## workplace/

Treat `workplace/` as a local scratch area for cloned external repositories, extracted archives, generated files, and verification artifacts.

Do not add `workplace/` contents to Git, except for `workplace/.gitkeep`.

## .codex/skills/

Treat `.codex/skills/` as a local deployment or copy destination for Codex skills.

When the repository keeps skill source files elsewhere, such as `skills/`, keep `.codex/skills/` out of Git. The source directory remains the canonical copy.

```gitignore
/.codex/skills/
```

When `.codex/skills/` itself contains canonical skill source, keep it available to Git. Preserve other shared `.codex/` configuration according to its role.

## Java / Maven

For Java or Maven repositories, keep `.mvn/jvm.config` under Git when JVM runtime settings are part of the user's local development standard.

When IPv4 preference is needed, use:

```text
-Djava.net.preferIPv4Stack=true
-Djava.net.preferIPv6Addresses=false
```

Do not add Java/Maven settings to non-Java repositories unless the user explicitly asks.

## Repository Documents

Create `README.md` as a basic repository file unless the repository has a clear reason not to use it.

Create `TODO.md` when the repository already uses it, when the user asks for a repository-level work log, or when there are concrete follow-up items that should be kept outside issue trackers and source files. Do not create an empty or speculative `TODO.md` just to satisfy the convention.

Keep these files at the repository root:

- `README.md`
- `TODO.md`
- `LICENSE`
- `CONTRIBUTING.md`
- `CONTRIBUTORS.md`
- `THIRD_PARTY_NOTICES.md`

For templates for `CONTRIBUTING.md`, `CONTRIBUTORS.md`, and `THIRD_PARTY_NOTICES.md`, see [template/](template/).

Use `docs/` for developer-oriented documentation, design notes, implementation notes, operational details, and other supporting documents.

Keep the repository root tidy. Do not place too many standalone documents at the root when they can live under `docs/`.

Use `README.md` for concise repository overview and operational rules. When changing repository conventions, update `README.md`.

Typical README topics:

- where canonical skill or source files live
- how `workplace/` is used
- what is intentionally ignored by Git
- where sanitized environment examples live and which shared artifacts are exceptions
- how generated files are regenerated
- Java / Maven runtime settings, when applicable

Keep the README focused on repository operation. Avoid broad tutorials.

Use `TODO.md` as the repository-level place for working notes, pending tasks, and follow-up items.

Keep `TODO.md` practical and lightweight. Do not scatter long-running repository task notes across unrelated files when `TODO.md` is the established location.
