# Topics

Read this reference when creating, updating, finding, or consolidating a topic. A topic is a maintained account of the knowledge, specifications, adopted decisions, and current understanding of a theme. It can begin with a short finding and include useful notes, hypotheses, and unresolved questions; these do not need separate record types.

## Responsibilities and scope

Activities retain dated work and how understanding developed. Todos keep separately deferred actions retrievable under [todos.md](todos.md). Tasks manage a particular job's purpose, completion conditions, progress, remaining work, and next actions. Topics hold the thematic understanding and detailed specifications or rationale worth consulting again, even after a task ends. A task keeps the short conclusion needed to act and links to the topic for detail. Do not require the same detailed account to be maintained in both places.

Create or update a topic when the user wants a saved thematic summary or the agreed work includes maintaining it. A request to save knowledge as a record normally selects a topic; an ordinary conversational summary does not by itself request a file. A clear task request still follows [operations.md](operations.md#add-a-task). If the recording type is unclear, keep the episode in its activity; do not make choosing a type or directory a prerequisite for saving.

An activity can lead directly to a topic without creating a task. A topic may concern a single investigation or serve several tasks. Do not create one for every conclusion, task completion, or activity, or create a task just to hold knowledge. Reading or linking a topic does not authorize editing it. Activity-only requests leave topics, tasks, and todos unchanged; when working on a task, update a related topic only if maintaining that topic is also within the agreed scope. Respect any separately designated authoritative specification or result: link to it rather than creating a second maintained copy in daybook.

When consolidating, use the chosen level of detail under [Choose how to consolidate activities](operations.md#choose-how-to-consolidate-activities). Preserve source activities, including attempts, abandoned approaches, mistakes, and corrections, whichever strategy is selected. Existing tasks may retain their detailed accounts; extracting them into topics or shortening them is a requested edit, not an automatic migration.

## Location and discovery

Store topics under the daybook root's `topics/`, outside `YYYY/YYYYMM/`. Use a descriptive lowercase English filename with hyphens, for example `topics/attachment-storage.md`. No date prefix, task-style sequence, or separate topic ID is required; use its actual repository-relative path to identify it. A title or date change does not require a rename.

- Files directly under `topics/` are valid. When no grouping is clear, save there without asking the user to design a hierarchy.
- Use subdirectories when the grouping is already clear and useful, such as `topics/daybook/attachment-storage.md`. No fixed taxonomy or directory depth is required. Create directories only when needed.
- A topic that relates to several areas has one saved home. Express its other relationships with links from relevant records, topics, or an optional navigation page; do not duplicate it into each category.
- A wider subject or a new relationship does not trigger relocation. Reorganize when needed within the requested scope, updating affected relative links. Do not edit older activities merely to add backlinks; preserve their [dated editing rules](activity-capture.md#edit-activities-over-time).

For lookup, search filenames and content across `topics/` recursively; include both its root and nested files. Use the user's subject and known links to narrow candidates before reading them. A directory is a broad storage grouping, not the complete classification of the topic. Follow relevant source activities when the question concerns how the understanding developed; use [history lookup](activity-capture.md#find-and-resume-earlier-work) to establish what work actually happened. A topic summary alone is not evidence that a proposed action was carried out.

## Content and dates

For a new topic, write this front matter using actual Asia/Tokyo dates in `YYYY-MM-DD` form:

```yaml
---
type: topic
created: YYYY-MM-DD
updated: YYYY-MM-DD
---
```

Keep a descriptive Japanese title and organize the useful current understanding, adopted decisions or specifications, applicability, uncertainties, and sources as needed. A fixed set of sections is not required. Distinguish observations from hypotheses and proposals from adopted decisions; do not turn an unsettled finding into an established fact just by summarizing it. Include relative links to the supporting activities and relevant tasks or retained material, plus original source URLs where useful.

`created` records when this topic file was created, even if its sources are older. Preserve it on updates. `updated` records the latest actual content or metadata change; reading or an unchanged save leaves it untouched. The dates do not determine the directory. Preserve existing topic conventions when reading or updating older files, and do not invent unknown historical dates. Topics have no required task status, priority, completion checkbox, or planned dates. A substantive update can replace an outdated current explanation; keep important superseded decisions traceable through source links and concise dated notes when useful. Apply the day-based preservation rule to source activities, not to the maintained topic text.

## Create or update

Follow the skill's README/Git checks. Search existing topics before creating one, including nested directories and related titles, to avoid duplicates. Resolve materially ambiguous record identity before editing; uncertainty about a category alone does not block a new save. Reread the selected file and relevant source activities or task material, including later corrections, before drafting. Use ordinary Markdown editing for topics; the activity CLIs are for activity records only. Check a new path is unused and preserve unrelated contributions when updating.

During active use, record meaningful findings and the topic operation in the episode's activity under [activity-capture.md](activity-capture.md). When both records are writable, save the activity first, then the topic. Link from the topic to its sources, and from the current activity to the topic when permitted by the activity editing rules. Task links or body edits require task-edit scope; a topic update does not imply task completion or a change to its dates. If a write fails, report which records were saved and which remain incomplete; do not claim the group is atomic.

Reuse saved attachment paths under [attachments.md](attachments.md#store-text-attachments); consolidating into a topic does not move or copy its sources or attachments. New supporting artifacts keep the existing task/activity placement policy. The topic itself is a maintained record under `topics/`, not an attachment. Topics stay outside task lists, day-plan selection, and notification scheduling; continue using task and schedule records for planned work.

After editing, verify topic metadata, links from the actual file location, and `git diff --check`. Report the saved path and the relevant changes. A lookup or already-current record need not produce a topic write.
