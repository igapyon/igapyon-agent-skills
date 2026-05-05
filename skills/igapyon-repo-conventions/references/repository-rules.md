# Repository Rules

Detailed repository conventions for `igapyon-repo-conventions`.

## .gitignore

Manage common local files in the repo-side `.gitignore`.

### Common

Include `.DS_Store` so macOS metadata files are excluded for every clone.

### Node.js / frontend

For Node.js or frontend repositories, include dependency and build output directories:

```gitignore
node_modules/
.npm-cache/
dist/
bundle/
coverage/
*.log
npm-debug.log*
```

If a repository intentionally commits generated distribution files, document that exception in `README.md`.

### Java / Maven

For Java or Maven repositories, include Maven build output:

```gitignore
target/
```

### VS Code MCP

Ignore local VS Code MCP configuration by default:

```gitignore
.vscode/mcp.json
```

If MCP settings should be shared, place a sanitized example such as `.vscode/mcp.example.json` or documentation under `docs/` instead of committing the local `.vscode/mcp.json`.

### workplace/

For local work areas, use `workplace/` with a tracked `.gitkeep`:

```gitignore
workplace/*
!workplace/.gitkeep
```

Create `workplace/.gitkeep` if `workplace/` is part of the repository convention and the file does not exist.

## workplace/

Treat `workplace/` as a local scratch area for cloned external repositories, extracted archives, generated files, and verification artifacts.

Do not add `workplace/` contents to Git, except for `workplace/.gitkeep`.

## .codex/skills/

Treat `.codex/skills/` as a local deployment or copy destination for Codex skills.

When the repository keeps skill source files elsewhere, such as `skills/`, keep `.codex/skills/` out of Git. The source directory remains the canonical copy.

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
- how generated files are regenerated
- Java / Maven runtime settings, when applicable

Keep the README focused on repository operation. Avoid broad tutorials.

Use `TODO.md` as the repository-level place for working notes, pending tasks, and follow-up items.

Keep `TODO.md` practical and lightweight. Do not scatter long-running repository task notes across unrelated files when `TODO.md` is the established location.
