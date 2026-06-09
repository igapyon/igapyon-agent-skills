# Design Philosophy

Compaction is not shortening. It is runtime token-efficiency design.

Start from the larger system before editing text. It is fine to read target
skills early to understand the situation, but do not make compaction edits until
the broader workflow and placement choices are clear.

Preserve useful behavior, then reduce repeated context by moving meaning to the
right place:

- human workflow choices
- separate Agent Skills
- the activation description
- concise `SKILL.md` workflow
- conditional references
- deterministic scripts
- reusable assets
- tool calls
- MCP access
- prompt-cache-friendly stable text
- output constraints

When the correct boundary is unclear, talk with the human before compacting.
Ask targeted questions about repeated use, expected outputs, failure tolerance,
trigger intent, and whether the work belongs in skills, tools, MCP, scripts,
templates, or human procedure. Do not silently decide architectural boundaries
from text shape alone.

Sometimes the right place is another skill. When an oversized skill contains
multiple distinct activation intents, audiences, domains, workflows, or output
contracts, consider splitting it into separate Agent Skills instead of forcing
one compacted skill to carry unrelated responsibilities.

Do not delete context merely because it is long. First decide whether it is
required every time, required only for specific cases, better handled by a tool,
belongs in another skill, or obsolete.

The goal is to remove context debt: a skill structure that only works because
large, repeated, unclear instructions are always loaded.

## Search And Reading Ladder

Token efficiency depends on the order used to find meaning.

Prefer a ladder that avoids reading full source material until necessary:

1. Use grep/rg-friendly names, headings, front matter, checklist items, and
   summaries so targeted search can find likely material.
2. Use generated `index.json` so discovery can often happen in one compact file
   before searching or reading many files.
3. Check `distilled/` when a curated runtime summary may already contain the
   needed meaning.
4. Read references or original source material only when the index and distilled
   layer are insufficient.

This is not just convenience. Keeping discovery, distilled meaning, and full
source reading as separate layers reduces repeated input tokens and keeps model
attention focused on the smallest useful context.

## Cache-Friendly Stable Context

Appropriately sized stable files can also support token efficiency across
repeated runs. Even when the same text still has to be processed by the model,
stable repeated context may be treated differently from fresh per-run input by
some platforms or pricing models.

Do not rely on a specific provider's caching behavior without checking the
current product rules. Still, design for cache-friendliness when it does not
harm clarity:

- keep stable instructions stable
- avoid rewriting reference files for cosmetic reasons
- separate changing run-specific input from stable reusable context
- split references by coherent viewpoint so only the needed stable file is read
- avoid mixing volatile notes into otherwise stable references

In practical cost review, a workflow can be treated as lighter when repeated
stable context is likely to shift from fresh input toward cached or otherwise
discounted/stabilized handling, even if the visible text size is unchanged.
Report this as an expected cache-friendliness improvement, not as a guaranteed
billing result.
