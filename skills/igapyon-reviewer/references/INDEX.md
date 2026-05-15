# igapyon-reviewer Reference Index

Use this file as the human-readable navigation map for `igapyon-reviewer`.
Use `../index.json` as the generated discovery index when file inventory,
paths, sizes, or summaries need to be checked mechanically.

## Start Here

- [Project Convention Detection Review](00-start-here/project-convention-detection-review.md)
  decides whether miku-soft / nearby igapyon, igapyon-managed Agent Skill,
  generic OSS, private/proprietary, or unknown conventions apply.
- [Safety and Respect Review](10-perspectives/safety-and-respect/safety-and-respect-review.md)
  is the first check for public, semi-public, interpersonal, user-facing, or
  community-facing text.

## By Target

Use these entries when the review target is clear.

- Text and Japanese writing:
  [AI Text Naturalness](10-perspectives/writing/ai-text-naturalness-review.md),
  [Writing Style](10-perspectives/writing/writing-style-review.md),
  [Japanese Public Text Final Check](10-perspectives/writing/japanese-public-text-final-check.md)
- Markdown:
  [Markdown Structure Review](20-targets/markdown/markdown-structure-review.md)
- Repository:
  [Repository Entrypoint Review](20-targets/repository/repository-entrypoint-review.md)
- Agent Skill:
  [Agent Skill Review](20-targets/agent-skill/agent-skill-review.md),
  [Agent Skill CLI Integration Review](20-targets/agent-skill/agent-skill-cli-integration-review.md),
  [Read-Only Skill Content Format Review](20-targets/agent-skill/read-only-skill-content-format-review.md)
- CLI / tool:
  [CLI and Tool UX Review](20-targets/cli/cli-tool-ux-review.md)
- Docs and examples:
  [Example and Quickstart Review](20-targets/docs-and-examples/example-quickstart-review.md),
  [Cross-Platform Path and Shell Review](20-targets/docs-and-examples/cross-platform-path-shell-review.md)
- Structured data:
  [JSON Agent Grepability Review](20-targets/structured-data/json-agent-grepability-review.md),
  [XML Agent Grepability Review](20-targets/structured-data/xml-agent-grepability-review.md),
  [Structured Data Library Review](20-targets/structured-data/structured-data-library-review.md)
- Artifacts and packages:
  [Generated Artifact Review](20-targets/artifacts/generated-artifact-review.md),
  [Archive and Package Contents Review](20-targets/artifacts/archive-package-contents-review.md)

## By Timing

Use these entries when the review is tied to a workflow moment.

- Draft or publication preparation:
  [Safety and Respect](10-perspectives/safety-and-respect/safety-and-respect-review.md),
  [Writing Style](10-perspectives/writing/writing-style-review.md),
  [Japanese Public Text Final Check](10-perspectives/writing/japanese-public-text-final-check.md),
  [Official Terminology](10-perspectives/provenance-and-officialness/official-terminology-review.md),
  [Public URL and Link Review](10-perspectives/provenance-and-officialness/public-url-link-review.md)
- Commit or handoff:
  [Repository Work Handoff Review](30-timing/handoff/repository-work-handoff-review.md),
  [Secrets and Credentials Review](10-perspectives/privacy-and-secrets/secrets-and-credentials-review.md),
  [Generated Artifact Review](20-targets/artifacts/generated-artifact-review.md)
- Release or completion:
  [Software Completion Review](30-timing/release/software-completion-review.md),
  [Version Consistency Review](30-timing/release/version-consistency-review.md),
  [Archive and Package Contents Review](20-targets/artifacts/archive-package-contents-review.md),
  [Rights and Originality Review](10-perspectives/rights-and-licenses/rights-and-originality-review.md)
- Refactoring pause:
  [Refactoring Need Review](10-perspectives/maintenance/refactoring-need-review.md)

## By Perspective

Use these entries when the review is about a cross-cutting concern.

- Safety, respect, and compliance-adjacent wording:
  [Safety and Respect Review](10-perspectives/safety-and-respect/safety-and-respect-review.md)
- Rights, license, attribution, originality, and OSS redistribution:
  [Rights and Originality Review](10-perspectives/rights-and-licenses/rights-and-originality-review.md)
- Secrets, credentials, private paths, and private data:
  [Secrets and Credentials Review](10-perspectives/privacy-and-secrets/secrets-and-credentials-review.md)
- Official terminology and primary-source links:
  [Official Terminology Review](10-perspectives/provenance-and-officialness/official-terminology-review.md),
  [Public URL and Link Review](10-perspectives/provenance-and-officialness/public-url-link-review.md)
- AI-agent readability and searchability:
  [Markdown Structure Review](20-targets/markdown/markdown-structure-review.md),
  [JSON Agent Grepability Review](20-targets/structured-data/json-agent-grepability-review.md),
  [XML Agent Grepability Review](20-targets/structured-data/xml-agent-grepability-review.md),
  [Read-Only Skill Content Format Review](20-targets/agent-skill/read-only-skill-content-format-review.md)
- Refactoring and accumulated structure:
  [Refactoring Need Review](10-perspectives/maintenance/refactoring-need-review.md)

## miku-soft and igapyon-Specific Checks

Apply these only after convention detection says they are relevant, or when the
user explicitly asks for miku-soft / igapyon conventions.

- Agent Skill conventions:
  [Agent Skill Review](20-targets/agent-skill/agent-skill-review.md),
  [Read-Only Skill Content Format Review](20-targets/agent-skill/read-only-skill-content-format-review.md)
- `index.json` generation and discovery quality:
  [Agent Skill Review](20-targets/agent-skill/agent-skill-review.md),
  [JSON Agent Grepability Review](20-targets/structured-data/json-agent-grepability-review.md),
  [Generated Artifact Review](20-targets/artifacts/generated-artifact-review.md)
- miku-soft source headers, notices, OSS source pairing:
  [Rights and Originality Review](10-perspectives/rights-and-licenses/rights-and-originality-review.md)
- `*-done` branch and handoff workflow:
  [Repository Work Handoff Review](30-timing/handoff/repository-work-handoff-review.md)
- Java / Maven local convention:
  [Cross-Platform Path and Shell Review](20-targets/docs-and-examples/cross-platform-path-shell-review.md),
  [Software Completion Review](30-timing/release/software-completion-review.md)

## Directory Layout

- `00-start-here/`: convention and scope decisions.
- `10-perspectives/`: cross-cutting review viewpoints.
  - `safety-and-respect/`: respect, harm, human-rights, and compliance-adjacent wording.
  - `privacy-and-secrets/`: credentials, private data, and secret leakage.
  - `rights-and-licenses/`: copyright, originality, OSS licensing, notices, and attribution.
  - `provenance-and-officialness/`: official terminology, primary-source URLs, and link trust.
  - `writing/`: writing style, AI-text naturalness, and public Japanese final checks.
  - `maintenance/`: refactoring and accumulated-structure review.
- `20-targets/`: target-specific reviews.
- `30-timing/`: workflow-moment reviews.

Files live in one primary directory, but many reviews are intentionally linked
from several sections above.
