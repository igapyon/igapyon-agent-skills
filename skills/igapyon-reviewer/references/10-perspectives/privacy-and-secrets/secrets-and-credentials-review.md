# Secrets and Credentials Review

Use this reference to review whether secrets, credentials, tokens, private
configuration, or personal data may be present in repository changes, release
artifacts, documentation, examples, logs, generated files, or bundles.

This review is especially important before commit, push, package publication,
or GitHub Release asset upload.

## Review Priority

Use this review when reviewing repository work handoff, commit readiness,
release readiness, generated artifacts, examples, docs, or downloadable
archives.

Treat confirmed secrets as blockers until removed, rotated, or explicitly
handled through a safe process.

## Core Checks

Look for:

- API keys, access tokens, refresh tokens, OAuth secrets, GitHub tokens, npm
  tokens, Maven credentials, cloud credentials, SSH keys, private keys, or
  certificates
- `.env`, `.env.local`, `.npmrc`, `settings.xml`, credential stores, local config
  files, or copied secret templates with real values
- passwords, session cookies, authorization headers, bearer tokens, webhook
  secrets, signing keys, or database connection strings
- private URLs, internal hosts, local service endpoints, customer URLs, or
  temporary signed URLs
- personal data such as email addresses, phone numbers, addresses, account IDs,
  user IDs, handles, private paths, or machine names when not needed
- logs, screenshots, JSON, Markdown, test fixtures, or generated reports that
  include credentials or private context
- secrets embedded in release archives, bundles, jars, single-file runtimes,
  generated HTML, or source maps

## Placeholder Checks

Not every token-like string is a secret. Accept clear placeholders such as:

- `<API_KEY>`
- `<TOKEN>`
- `your-token-here`
- `example.com`
- `dummy-secret`
- `00000000000000000000000000000000`

Flag placeholders when they are ambiguous enough to be mistaken for real
credentials, or when examples encourage users to paste secrets into files that
are likely to be committed.

## Repository Checks

For repository work, check:

- `.gitignore` excludes local secret files and generated credential outputs
- committed examples use `.env.example` or placeholders rather than real values
- docs explain secret configuration without exposing actual secrets
- CI workflows use secret stores rather than hard-coded values
- release scripts do not print secrets to logs
- generated artifacts do not inline local config or environment values
- test fixtures avoid real personal or customer data

## Severity Guidance

Use these severity levels:

- Critical: real credential, private key, token, password, customer data, or
  private personal data appears in a file intended for commit or release.
- High: likely secret or sensitive config appears in generated output, logs,
  docs, examples, or release assets.
- Medium: example configuration could lead users to commit secrets, or private
  endpoints and identifiers appear without clear need.
- Low: ambiguous token-like placeholders or harmless private-looking examples
  should be clarified before publication.

## Review Output

Contribute findings to the [Consolidated Review Report](../../templates/consolidated-review-report.md). Do not emit a standalone `Secrets and Credentials Review` section
unless the user explicitly asks for per-lens reports. Use the canonical fields for
every finding.

When material, add only these lens-specific assessment notes:

```text
Visible risk: low / medium / high / critical / unclear
```

If a real secret may have been committed or exposed, recommend removal and
rotation. Do not print the secret value in the review output.
