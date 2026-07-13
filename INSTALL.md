# Install

This archive contains igapyon's Agent Skills.

## Contents

- `skills/`: Agent Skill source directories
- `scripts/`: deterministic skill sync, generated-index checks, and build helpers
- `EXTERNAL_SKILLS.lock`: pinned provenance for bundled external skills
- `README.md`: repository overview and operating rules
- `LICENSE`: license information
- `pom.xml`, `.mvn/`, `lib/`, and `src/assembly/`: runnable build metadata and local index generator

## Install Or Update One Skill

Run the sync helper from the repository or extracted archive root. It uses
`$CODEX_HOME/skills`; when `CODEX_HOME` is unset, it defaults to
`$HOME/.codex`.

```sh
sh scripts/sync-codex-skill.sh igapyon-mikuku-agent
```

The command mirrors only the named `skills/<skill-name>/` directory. Files no
longer present in the source are removed from that skill's installed directory,
and `.DS_Store` files are excluded. Repeat the command with another skill name
to install or update that skill.

To target a different Codex home:

```sh
CODEX_HOME=/path/to/codex-home sh scripts/sync-codex-skill.sh igapyon-mikuku-agent
```

## Check For Drift

Check an installed skill without changing it:

```sh
sh scripts/sync-codex-skill.sh --check igapyon-mikuku-agent
```

The check exits successfully only when file contents, additions, and removals
match the repository source. It does not compare filesystem timestamps.

## Manual Fallback

If the helper is unavailable, use `rsync` with the same exact-mirror behavior.
Set the two variables explicitly before running it.

```sh
SKILL_NAME=igapyon-mikuku-agent
CODEX_HOME=${CODEX_HOME:-"$HOME/.codex"}
mkdir -p "$CODEX_HOME/skills/$SKILL_NAME"
rsync -a --delete --delete-excluded --exclude='.DS_Store' \
  "skills/$SKILL_NAME/" "$CODEX_HOME/skills/$SKILL_NAME/"
```

## Reload And Verify

Reload the Codex host application after syncing. Then verify the expected skill
directory and run the non-writing drift check:

```sh
CODEX_HOME=${CODEX_HOME:-"$HOME/.codex"}
test -f "$CODEX_HOME/skills/igapyon-mikuku-agent/SKILL.md"
sh scripts/sync-codex-skill.sh --check igapyon-mikuku-agent
```
