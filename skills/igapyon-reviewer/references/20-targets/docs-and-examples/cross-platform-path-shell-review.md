# Cross-Platform Path and Shell Review

Use this reference to review whether documented commands, scripts, paths,
examples, and generated artifacts assume one operating system or shell in ways
that may surprise users.

This review is useful for Java, Node.js, CLI, Maven, Gradle, and miku-soft
repositories that may be used on macOS, Linux, Windows, CI, or by AI agents.

## Review Priority

Use this review when README, docs, CLI help, scripts, tests, examples, or
release workflows include shell commands, paths, file operations, environment
variables, or temporary directories.

## Path Checks

Look for:

- hard-coded `/tmp`, `/var`, `/Users/...`, `/home/...`, or drive-specific paths
- path separators that assume only `/` or only `\`
- unquoted paths that break when directories contain spaces
- case sensitivity assumptions that fail on case-insensitive filesystems
- hidden files or dotfiles required on Windows without explanation
- symlink assumptions that may fail on Windows or restricted environments
- commands that require running from one directory without saying so
- absolute paths in examples where relative or placeholder paths would be safer

Prefer examples using repository-relative paths, placeholders, or documented
environment variables when appropriate.

## Shell Command Checks

Check whether commands assume a specific shell:

- POSIX-only syntax in docs intended for Windows users
- Windows-only syntax in docs intended for macOS/Linux users
- `rm`, `cp`, `mv`, `sed`, `grep`, `find`, `xargs`, or shell glob behavior used
  without alternatives when cross-platform use matters
- environment variable syntax such as `FOO=bar command` or `$FOO` without
  Windows guidance
- path expansion such as `~`, `*`, `{a,b}`, or `$(...)` in examples intended for
  broad copy-paste use
- commands chained with `&&` where failure behavior matters but is not
  explained
- scripts requiring executable bits without Windows or Git checkout notes

Do not require every project to support every platform. The review should check
whether platform assumptions are documented and appropriate for the audience.

## Tooling Checks

For Java, Node, and CLI projects, check:

- npm scripts wrap platform-specific commands when possible
- Maven or Gradle commands are shown in a platform-neutral way where practical
- Java / Maven repositories that follow igapyon conventions include
  `.mvn/jvm.config` when Maven JVM networking settings should be repository
  local
- `.mvn/jvm.config` contains the IPv4 preference options when IPv6-related name
  resolution or dependency resolution issues are part of the expected local
  environment:

```text
-Djava.net.preferIPv4Stack=true
-Djava.net.preferIPv6Addresses=false
```

- Node scripts use `path.join`, `path.resolve`, or URL-safe file handling
  instead of manual path string concatenation
- Java code and docs avoid relying on platform default encodings, separators,
  or locale when output is compared
- CI workflows match the documented supported platforms
- examples avoid `sudo` or global install assumptions unless necessary

## Severity Guidance

Use these severity levels:

- High: documented primary usage works only on the author's OS or shell, despite
  being presented as general use.
- Medium: important examples or scripts have avoidable macOS/Linux/Windows path
  or shell assumptions without documentation.
- Medium: Java / Maven repository follows igapyon conventions but lacks
  `.mvn/jvm.config` for required IPv4-preference Maven JVM settings.
- Medium: generated artifacts or tests rely on platform-specific ordering,
  encoding, line endings, or separators that affect user-visible output.
- Low: minor command portability issue where the supported platform is still
  clear.

## Review Output

Contribute findings to the [Consolidated Review Report](../../templates/consolidated-review-report.md). Do not emit a standalone `Cross-Platform Path and Shell Review` section
unless the user explicitly asks for per-lens reports. Use the canonical fields for
every finding.

When material, add only these lens-specific assessment notes:

```text
Platform readiness: broad / documented-specific / risky / not checked
```

Do not change scripts or commands during review mode unless the user asks for
maintenance work.
