# Reference discovery policy

This policy applies to igapyon-agent-skills and its installable Agent Skills.

## Default route

`index.json` is not a required artifact for every skill and is not the default first read. `SKILL.md` should route the task to the references that matter. Link directly to known material, then use a scoped file listing, filename search, or content search when the needed file is not known. Read only the source material needed for the task.

Use a hand-written topic guide such as `references/INDEX.md` when its explanations help choose between topics. Do not create a complete replacement file inventory merely because a generated index was removed. Keep the source documents as the authority for rules and facts.

## Adopt an index when it earns its maintenance cost

An index may be retained when an actual program consumes its schema, a constrained environment needs it to expose otherwise unavailable discovery, or representative tasks show that its structured metadata materially improves selection. Record its path, consumer, purpose, producer, update trigger, validation, maintenance owner, and evidence in [`../maintenance/index-json-migration-inventory.md`](../maintenance/index-json-migration-inventory.md).

Several reference files, a historic convention, or a build check that only exists to require the index are not sufficient reasons by themselves. A skill without an adopted index must still be buildable, distributable, and usable.

When evidence is insufficient during migration, record the decision as pending and the next evaluation in the maintenance inventory. Temporary retention keeps the existing artifact validated; it does not establish a selection benefit. Qiita's current inventory is in this state.

## Product output is a separate decision

This policy does not remove a product feature that generates `index.json` or `index.md`, change its schema, or prohibit a user from requesting index generation. In particular, miku-indexgen remains an index generator. Decide separately whether a skill's own file inventory is useful. Keep generated artifacts unchanged when a consumer or workflow depends on them; regenerate adopted artifacts with their documented producer.

## Build and review behavior

The root build generates and checks only indexes declared as adopted in [`../../config/skill-index-policy.json`](../../config/skill-index-policy.json). Undeclared skill-root indexes are rejected so a removed inventory cannot quietly return. Indexes in legacy external skill pins remain until their source and pinned revision are migrated.

Reviewers check reachability from `SKILL.md` and usefulness of an adopted index. Missing `index.json` is not a defect when the skill has not adopted one. A declared index that is missing, stale, malformed, or points outside its skill remains a defect.
