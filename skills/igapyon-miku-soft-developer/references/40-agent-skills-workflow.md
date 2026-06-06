# Agent Skills Workflow

Use this workflow for creating or maintaining a miku-soft Agent Skills package.

Detailed design guidance lives in [miku-soft-basic/miku-soft-40-agentskills-design.md](miku-soft-basic/miku-soft-40-agentskills-design.md). Keep this file as the execution checklist.

## Required Initial Input

At the beginning of a new Agent Skills creation task,
require the upstream miku main application GitHub repository URL: the product
repository whose behavior, APIs, CLI contracts, runtime artifacts, diagnostics,
and limitations the skill should expose to agents.

Also confirm the upstream branch, tag, release, commit, or received runtime
artifact version that should be treated as the compatibility source. When the
exact upstream state is unknown, use the GitHub repository URL as the first
anchor and record the follow-up needed to pin the precise source revision or
artifact version.

For CLI-backed work, require the needed upstream runtime artifacts to be placed
by a human under `skills/<skill-name>/runtime/` before runtime wiring,
packaging, or smoke-test work. These artifacts should normally be downloaded
from the upstream GitHub Releases page or another documented upstream release
channel, then renamed to the skill's declared versioned runtime artifact names.

Require a sister-reference check before scaffolding or initial file design. Ask
for one or more similar existing miku `-skills` sister project source checkout
paths under `workplace/`, or inspect the target repository's `workplace/` for
likely checkouts. If no sister checkout exists locally, record that explicitly
before proceeding. These are practical shape references for the Agent Skills
layer, not replacements for the upstream product source.

## Starter Assets

Bundled starter templates are available under `assets/agent-skills/`:

- `package.json`
  - Starter npm metadata for build, test, and bundle orchestration.
  - Keep `private: true` unless the repository explicitly chooses npm
    publication.
  - Replace `__REPO_NAME__` and `__VERSION__`.
- `scripts/build-skill-bundle.mjs`
  - Builds `bundle/<repo-name>/skills/<skill-name>/...` from
    `skills/<skill-name>/`.
  - Excludes `.DS_Store` and nested temporary `tmp`, `output`, and `state`
    contents.
- `scripts/build-skill-bundle-zip.mjs`
  - Builds the installable bundle first, then creates a release zip such as
    `bundle/igapyon-<repo-name>-<version>.zip`.
  - Adjust the zip name if the target repository already has a release naming
    convention.
- `tests/release-bundle-contents.test.mjs`
  - Verifies required skill files are included and development-only files are
    excluded from the release zip.
- `tests/isolated-bundle-smoke.test.mjs`
  - Copies the generated bundle to a temporary directory and verifies the
    installed bundle shape.
  - When runtime artifacts are present, smoke-tests the matching jar or mjs
    with `--version`.
- `.github/workflows/release-build.yml`
  - Standard release asset workflow template for building the skill bundle zip
    and attaching it to a GitHub Release.
  - Copy for new `-skills` repositories by default, then adapt runtime artifact
    verification and zip naming to the target skill.
  - Omit only when the repository intentionally does not use GitHub Release
    assets, and record that reason.
- `skills/__SKILL_NAME__/`
  - Minimal skill skeleton with `SKILL.md`, optional `agents/openai.yaml`,
    `references/INDEX.md`, `lib/`, and `runtime/`.

After copying these templates, replace `__REPO_NAME__`, `__SKILL_NAME__`,
`__SKILL_TITLE__`, `__PRODUCT_NAME__`, and `__VERSION__`.

For newer miku-soft Agent Skills naming, distinguish repository naming from
installable skill naming before replacing placeholders. A repository and
package may remain `<product>-skills`, and the release zip may remain
`igapyon-<product>-skills-<version>.zip`, while the installed Agent Skill name,
`SKILL.md` frontmatter `name`, and archive directory use `igapyon-<product>`.
In that shape, runtime artifacts belong under
`skills/igapyon-<product>/runtime/`, and compatibility triggers such as
`<product>` and `<product>-skills` may be documented in `SKILL.md` without
creating additional skill directories.

## Release Asset Workflow

`.github/workflows/release-build.yml` is a standard starter asset for new
Agent Skills skeletons. Treat it as a local release asset workflow preparation
file, not as a GitHub operation.

For new `-skills` repository creation, inspect sister `-skills` repositories
for their GitHub Actions release asset workflow and normally add or adapt the
local release workflow during initial scaffolding. Omit it only when the user
explicitly does not want GitHub Actions release support, or when the repository
has a documented non-GitHub release path. If it is not added during initial
creation, record why.

The agent may create or edit the local workflow file. Creating GitHub releases,
pushing tags or branches, publishing packages, and uploading release assets
remain human GitHub or registry operations as described in
[repo-operations.md](repo-operations.md).

## First Reads

1. Read [activation-policy.md](activation-policy.md) for strict activation behavior.
2. Read [architecture-rules.md](architecture-rules.md).
3. Read the Agent Skills basic document.
4. Inspect the upstream product README, runtime artifacts, CLI/API contracts, existing skill files, references, assets, tests, README, docs, TODO, and generated indexes.
5. For new creation, inspect existing `-skills` sister application checkouts under `workplace/` for the same maturity pattern, especially `SKILL.md`, `runtime/`, `lib/`, `scripts/`, `tests/`, `.github/workflows/`, `references/runtime/`, and bundle output. If no checkout is available, write down that absence and the closest public or documented reference before designing files.
6. For new creation, before scaffolding or initial file design, summarize which sister project was used, which maturity pattern it represents, and which concrete repository-shape decisions were adopted or rejected.

## Checklist

1. Keep the skill as a workflow adapter over upstream product behavior.
2. Do not duplicate product logic in `SKILL.md` or references.
3. Keep `SKILL.md` lean and put detailed workflow material under `references/`.
4. Define activation behavior narrowly when the skill can affect broad repository work.
5. Treat `-skills` as the standard companion deliverable for miku-soft products that provide Node.js or Java CLI runtime artifacts.
6. Prefer CLI-backed or CLI plus MCP-backed maturity when runtime artifacts exist; use `handoff-only` mainly for early MVPs or explicitly CLI-less workflows.
7. Fix the upstream URL and compatibility source before designing runtime lookup or tests.
8. For CLI-backed work, confirm that required runtime artifacts have been placed under `skills/<skill-name>/runtime/`.
9. Decide the implementation maturity pattern: handoff-only, CLI-backed, or CLI plus MCP-backed.
10. Fix repository/package/release zip naming separately from the installed Agent Skill name, `SKILL.md` frontmatter `name`, archive directory, and runtime directory.
11. For new `-skills` repositories, create `build:bundle` and `build:bundle:zip` from the initial skeleton stage.
12. Put required skill helpers under `skills/<skill-name>/lib/`, not root-level `lib/`, unless the repository explicitly owns a separate root tool.
13. Describe runtime artifact lookup, artifact roles, diagnostics, and handoff points when relevant.
14. Keep backend policy strict: `*-only` policies must not silently fallback, and `handoff-only` must not execute runtime operations.
15. Verify bundle contents include required skill files and runtime artifacts while excluding development-only files.
16. Add isolated bundle smoke when the skill depends on runtime artifacts.
17. Treat the sister-reference summary as required implementation context for new creation work.
18. Use sister projects as shape references only; do not copy `workplace/` contents into the target repository wholesale.
19. Add the local GitHub Actions release asset workflow from the starter template by default, or record the explicit reason for omitting it.
20. Update indexes and validation output after adding or changing skill files.
