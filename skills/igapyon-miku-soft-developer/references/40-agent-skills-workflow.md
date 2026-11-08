# Agent Skills Workflow

Use this workflow for creating or maintaining a miku-soft Agent Skills package.

Detailed design guidance lives in [miku-soft-basic/miku-soft-40-agentskills-design.md](miku-soft-basic/miku-soft-40-agentskills-design.md). Keep this file as the execution checklist.

## Required Initial Input

First distinguish an upstream-product adapter from a Skill-only product
described below. The upstream repository and runtime requirements in this
section apply to adapters; a Skill-only product may have neither. Apply only
the starter files and checks that fit the chosen deliverable.

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
  - `engines.node` declares the supported product runtime minimum. Keep the
    package range aligned with the CI matrix and follow the current numeric
    baseline in [the Agent Skills design](miku-soft-basic/miku-soft-40-agentskills-design.md).
  - Replace `__REPO_NAME__` and `__VERSION__`.
  - Set `skillRuntimeArtifacts` to the exact required executable CLI paths,
    relative to the installed skill, such as `runtime/<product>-<version>.mjs`
    or `runtime/<product>-<version>.jar`. Keep `[]` only when the workflow
    requires no bundled CLI. List both backends when both are required.
- `scripts/build-skill-bundle.mjs`
  - Builds `bundle/<repo-name>/skills/<skill-name>/...` from
    `skills/<skill-name>/`.
  - Fails before packaging if a declared CLI artifact is missing or empty.
  - Excludes `.DS_Store` and the skill-root scratch directories `tmp`,
    `output`, and `state`; same-named directories inside references or assets
    remain eligible for packaging.
- `scripts/build-skill-bundle-zip.mjs`
  - Builds the installable bundle first, then creates a release zip such as
    `bundle/igapyon-<repo-name>-<version>.zip`.
  - Adjust the zip name if the target repository already has a release naming
    convention.
- `tests/release-bundle-contents.test.mjs`
  - Verifies required skill files are included and development-only files are
    excluded from the release zip.
  - Verifies files that are required by the skill's declared bundle policy;
    include an adopted index only when that skill uses one.
- `tests/isolated-bundle-smoke.test.mjs`
  - Copies the generated bundle to a temporary directory and verifies the
    installed bundle shape.
  - Smoke-tests every declared CLI artifact with `--version`; runtime
    discovery must not silently skip a missing required backend.
- `.github/workflows/release-build.yml`
  - Standard release asset workflow template for building the skill bundle zip
    and attaching it to a GitHub Release.
  - Copy for new `-skills` repositories by default, then adapt runtime artifact
    declarations and zip naming to the target skill. The build and isolated
    tests verify the declared CLI files before upload.
  - Omit only when the repository intentionally does not use GitHub Release
    assets, and record that reason.
- `.github/workflows/ci.yml`
  - Tests the oldest maintained LTS declared by the product and the newest
    LTS independently, following the baseline in the Agent Skills design.
    Include maintained LTS lines between them when the matrix cost is
    reasonable.
  - Keep the matrix synchronized with `package.json` compatibility claims.
- `templates/skill/`
  - Minimal skill skeleton to copy to `skills/<skill-name>/`, with
    `SKILL.md.template`, optional `agents/openai.yaml`, `references/INDEX.md`,
    `lib/`, and `runtime/`.
  - Rename `SKILL.md.template` to `SKILL.md` after copying it into the target
    skill directory. The template does not use the literal `SKILL.md` filename
    inside this repository so Codex skill discovery will not load it as a real
    installed skill.
  - Decide whether a generated inventory has a concrete consumer and selection
    value. Generate it with `miku-indexgen` only when the skill adopts one.

After copying these templates, place `templates/skill/` at
`skills/<skill-name>/`, then replace `__REPO_NAME__`, `__SKILL_NAME__`,
`__SKILL_TITLE__`, `__SKILL_DESCRIPTION__`, `__PRODUCT_NAME__`, and `__VERSION__`.
Use a 25–64 character UI description for `__SKILL_DESCRIPTION__` when keeping
the optional `agents/openai.yaml`. Its `interface` fields describe the UI, and
`policy.allow_implicit_invocation: false` preserves the starter's explicit-only
activation. Remove optional metadata when the target environment does not use it.

The starter's two test files both rebuild the same bundle directory, so
`npm test` runs them serially. Keep that serialization until each test owns
an independent output directory. Keep `skillRuntimeArtifacts` synchronized with
the skill's documented runtime contract; presence checks alone do not prove the
product operation works, so add a small real operation when appropriate.

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

Keep the product runtime contract separate from the GitHub Actions runtime.
The Agent Skills design owns the current product, CI, and release-host version
values. The Action majors themselves must support the selected Actions runtime.
Do not use `ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION` or
`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` as the maintained solution when supported
Action majors are available.

## First Reads

1. Read [activation-policy.md](activation-policy.md) for strict activation behavior.
2. Read [architecture-rules.md](architecture-rules.md).
3. Read the Agent Skills basic document.
4. Follow task-specific links from each `SKILL.md`. For an unknown reference, inspect or search the relevant directory; read an adopted index only when it helps the current task.
5. Inspect the upstream product README, runtime artifacts, CLI/API contracts, existing skill files, references, assets, tests, README, docs, TODO, and generated outputs declared by the repository.
6. For new creation, inspect existing `-skills` sister application checkouts under `workplace/` for the same maturity pattern, especially `SKILL.md`, `runtime/`, `lib/`, `scripts/`, `tests/`, `.github/workflows/`, `references/runtime/`, and bundle output. Consider an index only where that sister skill has an identified use. If no checkout is available, write down that absence and the closest public or documented reference before designing files.
7. For new creation, before scaffolding or initial file design, summarize which sister project was used, which maturity pattern it represents, and which concrete repository-shape decisions were adopted or rejected.

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
12. Decide whether this skill should adopt a generated `index.json`; record its consumer, selection benefit, producer, update trigger, and validation. Do not require it by default.
13. Put required skill helpers under `skills/<skill-name>/lib/`, not root-level `lib/`, unless the repository explicitly owns a separate root tool.
14. Describe runtime artifact lookup, artifact roles, diagnostics, and handoff points when relevant.
15. Keep backend policy strict: `*-only` policies must not silently fallback, and `handoff-only` must not execute runtime operations.
16. Verify bundle contents against the required references, skill files, runtime artifacts, and any adopted generated index while excluding development-only files.
17. Test the declared index policy: an adopted index must be present and current; a skill without one must still pass structure and bundle checks.
18. Add isolated bundle smoke when the skill depends on runtime artifacts.
19. Before scaffolding, record the sister-reference summary required above; use
    sister projects as shape references and adapt only the needed patterns.
20. Add the local GitHub Actions release asset workflow from the starter
    template by default, or record the explicit reason for omitting it.
21. Keep `engines.node`, the CI matrix, the release build host, and Action
    internal runtimes as separate but synchronized contracts; use the current
    numeric values from the Agent Skills design.
22. After bundled files change, regenerate an adopted
    `skills/<skill-name>/index.json` with `miku-indexgen --refresh-index
    skills/<skill-name>/index.json` or the repository's documented equivalent.
    Do not create or refresh an index for a skill that has not adopted one.

## Skill-only Product Convention

Use this convention when the product's sole user-facing deliverable is one or
more Agent Skills. It does not provide a standalone Node/Java CLI, library,
MCP server, or bundled runtime artifact. A Skill-only product is still a
versioned product repository; it is not merely an unmanaged local
`~/.codex/skills/` copy.

The product may depend on, document, or orchestrate separate foundation
libraries and other miku-soft tools. Those dependencies do not make the Skill
package itself a CLI or library product. Classify the product by its own
user-facing deliverable and release contract; for example,
`miku-ms-office-skills` remains Skill-only even when it uses Office conversion
libraries and individual conversion tools.

This classification describes the current delivered surfaces, not a permanent
product prohibition. If a separate user-facing surface such as
`miku-ms-office-web` is introduced later, reassess the product as a
multi-surface miku-soft product and apply the relevant Web workflow alongside
the Skill-only rules. Do not retroactively claim that the existing Skill
package already provides that future surface.

### Repository and Bundle Shape

- Keep the product source of truth in `skills/<skill-name>/`, including
  `SKILL.md`, references, and deterministic helpers when required. Include a
  generated `index.json` only when the skill adopts one.
- Keep `workplace/` and local Codex deployment copies out of Git. Provide a
  documented, named synchronization command for the user deployment target.
- Use `package.json` only when it contributes reproducible test, index, or
  bundle commands. Do not add an npm publication contract solely because the
  product is JavaScript-authored.
- Do not create a `runtime/` directory, runtime smoke test, or release runtime
  asset when no runtime exists. State `Skill-only` explicitly in the README or
  product documentation so this omission is intentional.
- A release ZIP is optional. When distributed, it must contain the installable
  `skills/<skill-name>/` tree and its required files, including an adopted
  `index.json` when applicable, not a user-local `.codex` directory or
  development `workplace/` data.

### Versioning, Verification, and Maintenance

- Define the authoritative product version, matching Git tag convention, and
  any coupled Skill version source. Keep those sources aligned before commit.
- Test deterministic helper behavior and the structural bundle shape. A
  runtime smoke test is not required for a Skill-only product.
- Regenerate affected adopted indexes after changing their inputs, then run
  the repository's documented generated-file and version-alignment checks.
- Preserve the same Issue, PR, Release, and human-approval boundaries as
  other miku-soft products. A local user synchronization is deployment support,
  not GitHub publication, tag creation, or Release publication.

### Bundled Runtime `--help` Compatibility

When an Agent Skill bundles or selects both Node.js and Java CLI artifacts,
check their `--help` contracts as part of runtime smoke and backend-selection
testing. Use exact UTF-8 byte equality when the Skill presents them as
interchangeable implementations of one CLI contract. Capture exit status,
stdout, stderr, final newline, and the complete byte sequence.

When backend-specific capabilities are intentional, use a documented
similarity check instead: shared commands, options, arguments, defaults, and
usage vocabulary must remain compatible, while explicitly listed
backend-specific lines may differ. The test output must make an unexpected
difference visible. Do not silently accept drift merely because the Skill can
fall back to another runtime.

### Creation and Maintenance Checklist

1. Declare the product as Skill-only and identify the installed skill name.
2. Create or verify `SKILL.md`, detailed references, and any adopted generated index.
3. Document the supported Codex deployment/synchronization command and keep
   that destination outside repository tracking.
4. Add focused tests for bundled helpers and structural checks for required
   Skill files; omit runtime checks only because no runtime is part of the
   product contract.
5. For dual Node/Java runtime Skills, add `--help` exact-parity or documented
   similarity checks according to the backend contract.
6. Define the version, tag, optional ZIP, and GitHub Release expectations.
7. On maintenance, update documentation, regenerate indexes, run checks, and
   use the normal reviewed PR and human-release workflow.
