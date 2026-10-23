# igapyon-agent-skills

Agent Skills for turning everyday work into concrete results: readable articles,
connected task records, reviewable GitHub changes, reusable knowledge files,
Office document text, portable HTML conversions, project plans, and score or
audio deliverables.

The release bundle contains **26 skills**: **16 maintained in this repository**
and **10 bundled from pinned upstream repositories**. Each skill combines
instructions for an AI agent with the references, templates, assets, or
executable helpers needed for its workflow. Many writing workflows target
Japanese content; the catalog explains their purpose in English.

Download the bundle from [GitHub Releases](https://github.com/igapyon/igapyon-agent-skills/releases)
to choose from all 26 skills. A source checkout contains the 16 internal skill
directories; external skills are incorporated when the release bundle is built.

## Skill Catalog

Both tables describe the complete set shipped in the release bundle. Use a skill
name to jump to its detailed explanation, expected results, and example.

### Maintained In This Repository (16)

| Skill | What it helps you achieve |
| --- | --- |
| [igapyon-agent-state-management](#igapyon-agent-state-management) | Resume repository work with clear goals, decisions, unfinished tasks, and next actions. |
| [igapyon-companion-musicpost-writer](#igapyon-companion-musicpost-writer) | **Experimental.** Make a Japanese music post easier to read while keeping it recognizably yours. |
| [igapyon-companion-techpost-writer](#igapyon-companion-techpost-writer) | **Experimental.** Turn rough technical observations into a readable Japanese post while preserving your voice. |
| [igapyon-diary-writer](#igapyon-diary-writer) | Turn daily notes into diary source ready for igapyon's existing publishing process. |
| [igapyon-ffmpeg-helper](#igapyon-ffmpeg-helper) | Turn an orchestra recording into a retained WAV master and a YouTube-ready video. |
| [igapyon-github-writer](#igapyon-github-writer) | Give reviewers a clear explanation of your changes and save a ready-to-use GitHub draft. |
| [igapyon-miku-daybook](#igapyon-miku-daybook) | Keep current tasks, the reasons behind decisions, and the next work plan connected. |
| [igapyon-miku-md2html](#igapyon-miku-md2html) | Convert a Markdown file and local images into one portable HTML document that works offline. |
| [igapyon-miku-scm](#igapyon-miku-scm) | Carry completed work through a repeatable Git/GitHub cycle with a reviewable PR draft. |
| [igapyon-miku-soft-developer](#igapyon-miku-soft-developer) | Turn an application idea or maintenance request into a project following miku-soft's design rules. |
| [igapyon-mikuku-agent](#igapyon-mikuku-agent) | Create Japanese technical essays and explanatory visuals with Mikuku's recognizable voice. |
| [igapyon-note-writer](#igapyon-note-writer) | **Experimental.** Keep a Note article's publishable Markdown, metadata, and publication state in sync. |
| [igapyon-qiita-writer](#igapyon-qiita-writer) | **Experimental.** Turn development knowledge into a technical article that readers can understand and try. |
| [igapyon-repo-conventions](#igapyon-repo-conventions) | Give a repository predictable local-work, configuration, and contribution conventions. |
| [igapyon-reviewer](#igapyon-reviewer) | Identify concrete issues before merging or publishing, with evidence and a clear fixing order. |
| [igapyon-skill-compactor](#igapyon-skill-compactor) | Make an Agent Skill easier to load and maintain while checking what behavior is preserved. |

### Bundled From Upstream Repositories (10)

| Skill | What it helps you achieve |
| --- | --- |
| [igapyon-miku-ai-assistant-builder](#igapyon-miku-ai-assistant-builder) | Turn a mixed folder into reviewable knowledge files and instructions for a Copilot agent or Gemini Gem. |
| [igapyon-miku-indexgen](#igapyon-miku-indexgen) | Make a directory easier to navigate or consume through a generated file catalog. |
| [igapyon-miku-json2xlsx](#igapyon-miku-json2xlsx) | Turn JSON records into an inspectable Excel workbook with an explicit account of the data layout. |
| [igapyon-miku-ms-office](#igapyon-miku-ms-office) | Make Word, Excel, and PowerPoint content available to text-based AI workflows, and prepare basic Office outputs from Markdown. |
| [igapyon-miku-project](#igapyon-miku-project) | Turn project ideas or existing plans into a structured WBS, revise them through conversation, and share Gantt charts and reports. |
| [igapyon-miku-prompt-lint](#igapyon-miku-prompt-lint) | Find instruction and context problems that can make an agent choose the wrong task or execute it inconsistently. |
| [igapyon-miku-repo-bundle](#igapyon-miku-repo-bundle) | Prepare a portable repository reference package with source, documentation, and provenance. |
| [igapyon-miku-score](#igapyon-miku-score) | Move a score between supported formats, prepare AI-editable score text, and inspect a rendered result. |
| [igapyon-miku-text-bundle](#igapyon-miku-text-bundle) | Turn a directory of text files into manageable Markdown parts for AI handoff or knowledge preparation. |
| [igapyon-miku-text-file-ops](#igapyon-miku-text-file-ops) | **Experimental.** Search and edit encoding-sensitive text without silently changing its encoding or line-ending conventions. |

## Get Started

1. Download `igapyon-agent-skills-<version>.zip` from [GitHub Releases](https://github.com/igapyon/igapyon-agent-skills/releases) and extract it.
2. Choose a skill from the tables above and read its detailed description below.
3. Follow [INSTALL.md](INSTALL.md) from the extracted archive root to install or update the complete selected `skills/<skill-name>/` directory in your Codex skills directory.
4. Read the skill's `SKILL.md` for its invocation rules, setup, and required tools, then request the workflow you want to run.

For example, `Use miku-ms-office to extract this DOCX into Markdown` requests
Office text extraction, while `Use miku-project to prepare an Excel Gantt for
this release plan` requests a project-planning deliverable. Use the exact
activation rules documented by the selected skill.

Some workflows require programs such as Node.js, Java, FFmpeg, or GitHub CLI.
Supporting references, scripts, runtimes, templates, and assets belong to the
skill directory and should be copied together during installation.

## Release Bundle Contents

| Path | Contents |
| --- | --- |
| `README.md` | A guide to the 26 skills and how to choose one. |
| `INSTALL.md` | Installation, update, and drift-check instructions. |
| `skills/` | Complete installable skill directories, each with a `SKILL.md` entry point. |
| `EXTERNAL_SKILLS.lock` | The upstream repositories, pinned commit SHAs, and names included in that release bundle. |
| `LICENSE` | The distribution license; preserve additional licenses and attribution within skills. |

For Note articles, `igapyon-mikuku-agent` handles the article body, and
`igapyon-note-writer` supports publishing metadata and canonical article
management. The documented `miku-scm draft recommit push` workflow belongs to
`igapyon-miku-scm`.

## Detailed Skill Descriptions

### igapyon-agent-state-management

**When it helps**

A repository task spans several sessions and you need to recover what was decided, what remains open, and where to continue. The result is a small set of shared notes that both you and the next agent can use without reconstructing the entire conversation.

**What you can achieve**

- Keep objectives and completion conditions in `GOAL.md`, active tasks and blockers in `TODO.md`, decisions and reasons in `DECISIONS.md`, and the current handoff in `HANDOFF.md`.
- Resume work by checking those notes against the actual repository state and produce a focused account of the next steps and unresolved decisions.
- Record reusable build, test, package, and comparison procedures so a later session can follow an established execution decision.

**Example:** Use igapyon-agent-state-management to resume this repository, explain what is unfinished, and prepare a handoff for the next session.

[Full workflow, setup, and invocation rules](skills/igapyon-agent-state-management/SKILL.md).

### igapyon-companion-musicpost-writer

**Status:** Experimental.

**When it helps**

You have impressions from a rehearsal, concert, instrument adjustment, or listening session and want help making them readable while keeping your own expressions and observations. It supports a conversation in which you accept and adjust small changes.

**What you can achieve**

- Turn fragments and rough paragraphs into a lightly polished Japanese post about performance, practice, instruments, recordings, or music.
- Improve wording, paragraph flow, and line breaks while retaining accepted phrasing, parenthetical remarks, and the experience you actually described.
- Apply focused replacements and assemble the latest full draft when requested. Receive the edited text with a brief comment, making each change easy to assess.

**Example:** Use igapyon-companion-musicpost-writer to polish these violin rehearsal notes, keep my parenthetical remarks, and show the complete post after our revisions.

[Full workflow, setup, and invocation rules](skills/igapyon-companion-musicpost-writer/SKILL.md).

### igapyon-companion-techpost-writer

**Status:** Experimental.

**When it helps**

You have an observation about AI coding, a development experiment, or a personal project and want to publish it in your own words. The workflow helps shape the thought through small edits while retaining the author's level of certainty and personal perspective.

**What you can achieve**

- Organize fragments, social posts, blog drafts, and development notes into a coherent reading order.
- Clarify wording and paragraph boundaries, keeping accepted expressions, parenthetical comments, and the distinction between observations and established facts.
- Apply requested changes and present the assembled current text, so you can judge the whole post as it develops.

**Example:** Use igapyon-companion-techpost-writer to turn these notes about an AI coding experiment into a short post, keeping the tentative parts tentative.

[Full workflow, setup, and invocation rules](skills/igapyon-companion-techpost-writer/SKILL.md).

### igapyon-diary-writer

**When it helps**

You want events, technical work, release activity, or personal observations recorded in igapyon's own diary. It connects the writing task to the diary's actual file format and processing conventions so the entry fits the existing site.

**What you can achieve**

- Create or revise a diary source entry such as `diary/YYYY/igYYMMDD.src.md` from supplied facts and notes.
- Apply the diary's date, section, keyword, and directive conventions, using the normal entry and year-index templates where useful.
- Check how source content relates to generated Markdown, indexes, keywords, and other igapyonv3 processing when an entry's published form needs investigation.

**Scope and prerequisites:** This workflow targets the `diary` repository. Mikuku-authored Note articles use their own article workflow and canonical repository.

**Example:** Use igapyon-diary-writer to record today's release work and what I learned as a diary entry that fits the existing site.

[Full workflow, setup, and invocation rules](skills/igapyon-diary-writer/SKILL.md).

### igapyon-ffmpeg-helper

**When it helps**

You have a copied ZOOM H4essential rehearsal recording and want to preserve a useful master while preparing something people can listen to or watch online. The skill supplies a repeatable sequence from source inspection to checked delivery files.

**What you can achieve**

- Select trim ranges, inspect audio properties, measure peaks, and apply simple gain adjustment while retaining the source sample rate and 32-bit float WAV master by default.
- Join selected recordings after trimming and adjustment, and create requested listening or sharing variants from the retained master.
- Combine the audio with a still image to produce a YouTube-ready video, then check duration, audio format, bitrate, and decoded true peak.

**Scope and prerequisites:** FFmpeg must be installed. The normal workflow produces the upload-ready file; YouTube Studio upload is performed manually.

**Example:** Use igapyon-ffmpeg-helper to cut the concert pieces from this rehearsal, retain adjusted WAV masters, and make a still-image video for YouTube.

[Full workflow, setup, and invocation rules](skills/igapyon-ffmpeg-helper/SKILL.md).

### igapyon-github-writer

**When it helps**

The implementation is available in a local repository, but its purpose and effect still need to be explained to another person. The skill turns the relevant commit or branch evidence into text that can be reviewed before being used on GitHub.

**What you can achieve**

- Draft a PR title and body for a commit or branch range, Release notes for a selected range, or About text describing a repository.
- Save and validate the Markdown draft so the reviewed text remains available for a later publishing step.
- When explicitly requested through this skill, inspect local branch status, create a backup branch, or rebuild local commits using the reviewed PR text as the commit message.

**Scope and prerequisites:** The skill works with local evidence and drafts. The compound `miku-scm draft recommit push` workflow is handled by `igapyon-miku-scm`.

**Example:** Use github-writer to explain this branch's change to a reviewer who has not seen our conversation, and save the PR draft.

[Full workflow, setup, and invocation rules](skills/igapyon-github-writer/SKILL.md).

### igapyon-miku-daybook

**When it helps**

You need both a current view of your work and a dated account of how you reached it. The daybook separates task state from activity history, then derives a day-plan from the records so you can see what needs attention.

**What you can achieve**

- Create and update tasks, activities, and schedules with priorities, planned periods, current conclusions, next actions, and links to supporting material.
- Save short Waypoints that resume a task or an independently resumable subtask across sessions.
- Generate day-plan snapshots from those source records, or explicitly check whether a supplied URL relates to an existing task.
- Keep date-planned work separate from a dedicated Backlog section; Backlog tasks can remain undated until they are scheduled.
- Bring named GitHub Issues into the documented intake workflow and prepare the bundled GitHub Actions notification workflow when requested.

**Scope and prerequisites:** Markdown records are the source of truth. Issue receipts and closure follow the miku-scm steps; notification delivery requires setup in the target repository.

**Example:** Use igapyon-miku-daybook to record why we changed approach today, update the task's next action, and regenerate today's plan.

[Full workflow, setup, and invocation rules](skills/igapyon-miku-daybook/SKILL.md).

### igapyon-miku-md2html

**When it helps**

You have a Markdown document that should be shared or viewed as one portable
HTML file, including its local images, without requiring an internet
connection.

**What you can achieve**

- Convert one UTF-8 Markdown file into a self-contained HTML document with
  embedded CSS, viewer code, SVG, and supported local images.
- Keep the document's Markdown input intact and save the HTML at a requested
  path or under `workplace/miku-md2html/`.
- Use the bundled Node.js runtime locally; the converter does not download
  remote images or require npm dependencies at conversion time.

**Scope and prerequisites:** Requires Node.js 22 or newer. Remote images are
not fetched; the converter reports missing or unsafe local image references.

**Example:** Use miku-md2html to convert this Markdown guide and its local
images into one offline HTML file under `workplace/`.

[Full workflow, usage, and runtime provenance](skills/igapyon-miku-md2html/SKILL.md).

### igapyon-miku-scm

**When it helps**

You want miku-soft's documented source-control process applied consistently, from local work and backups through publication preparation and the next work branch. Fixed runners carry the mechanical steps and checks, while the draft explains the change to a reviewer.

**What you can achieve**

- Prepare GitHub text, make local commits and backups, inspect branches, and perform the documented recommit/push and post-merge transitions.
- Run supported Issue creation, editing, label, comment, and closure workflows with their required preflight and approval steps.
- Update date-based or Semantic Versions, check coupled values, maintain repositories, and inspect tags, Releases, and assets.

**Scope and prerequisites:** `draft recommit push` saves the PR text and performs its documented branch-push transition. The human creates and merges the PR on GitHub.

**Example:** Use miku-scm draft recommit push to prepare the completed branch for review, then use the post-merge workflow after the PR has been merged.

[Full workflow, setup, and invocation rules](skills/igapyon-miku-scm/SKILL.md).

### igapyon-miku-soft-developer

**When it helps**

You want to create or maintain a miku-soft project and need its repository shape, product boundaries, and implementation approach to follow the shared design conventions. It connects a concept or requested repair to the relevant project workflow and starter assets.

**What you can achieve**

- Clarify the application concept and repository name, select a project type, and use the corresponding creation workflow.
- Guide Node.js CLI and web projects, Java/Maven conversion work, Maven-plugin or web separation, Agent Skills, and MCP servers.
- Inspect an existing project, carry out a bounded maintenance change, and use the relevant build and verification procedures.

**Scope and prerequisites:** Use the skill through an explicit miku-soft developer request. The selected project references define the concrete architecture and implementation rules.

**Example:** Use igapyon-miku-soft-developer to turn this conversion-tool idea into a miku-soft CLI project with the appropriate source and repository structure.

[Full workflow, setup, and invocation rules](skills/igapyon-miku-soft-developer/SKILL.md).

### igapyon-mikuku-agent

**When it helps**

You want to develop an article through a conversation with Mikuku, retaining the character's observations and expression while explaining a technical subject. The same skill can guide the text and visual material used to present that article.

**What you can achieve**

- Write and revise Note technical essays from supplied facts, experiences, and ideas, then check tone, expression density, or text characteristics when requested.
- Prepare whole-article or section graphic-recording material, use bundled character assets, and guide image generation and integration into the article.
- Render Markdown tables to PNG, and use the experimental PNG-to-SVG workflow for black-and-white linework with separately identified construction guides.

**Scope and prerequisites:** Activate the requested character or workflow explicitly. Image creation and rendering use the tools available in the execution environment.

**Example:** Use igapyon-mikuku-agent to turn this development experience into a Note essay, then prepare illustrations that explain the main ideas.

[Full workflow, setup, and invocation rules](skills/igapyon-mikuku-agent/SKILL.md).

### igapyon-note-writer

**Status:** Experimental.

**When it helps**

A Mikuku essay is being prepared or updated for Note, and its title, hashtags, canonical file, and public URL need to stay consistent. The skill handles the publishing information around the article so those details remain traceable as the draft changes.

**What you can achieve**

- Prepare Note front matter, title and hashtag proposals, draft/publication status, and confirmed URLs.
- Create or update the canonical Markdown in `mikuku-articles`, carrying relevant factual changes from another medium while preserving existing publishing data and the author's voice.
- Check paragraph flow and publication preparation, and route article illustrations or table images to the Mikuku visual workflows.

**Scope and prerequisites:** `igapyon-mikuku-agent` handles the article body and character voice. This skill provides Note-specific management and publishing preparation.

**Example:** Use igapyon-note-writer to prepare the metadata for this finished Mikuku essay and update its canonical file after I provide the published URL.

[Full workflow, setup, and invocation rules](skills/igapyon-note-writer/SKILL.md).

### igapyon-qiita-writer

**Status:** Experimental.

**When it helps**

You have code, a README, or development notes and want readers to grasp the tool's purpose, reproduce its usage, and understand its limits. The skill shapes that material for Qiita's technical-article context.

**What you can achieve**

- Produce an outline or full Japanese article with an appropriate title, tags, and Qiita front matter.
- Explain what the software achieves, how to use it, important commands and configuration, design decisions, and known limitations in a useful reading order.
- Use general article, CLI reference, and CLI/Maven-plugin patterns, drawing on the relevant canonical examples found through scoped search or the optional article index.

**Scope and prerequisites:** Note publishing metadata is handled by `igapyon-note-writer`. Supplementary use for a Note article requires an explicit request.

**Example:** Use igapyon-qiita-writer to turn this CLI README into an article that explains the problem it solves and lets readers reproduce the main workflow.

[Full workflow, setup, and invocation rules](skills/igapyon-qiita-writer/SKILL.md).

### igapyon-repo-conventions

**When it helps**

You want a repository to follow igapyon's established operating rules, with a clear place for scratch work and documentation of how the repository is maintained. It helps keep local outputs and repository configuration deliberate.

**What you can achieve**

- Apply ignore rules for `.DS_Store`, local Codex output, and scratch material, and set up the documented `workplace/.gitkeep` arrangement.
- Maintain Java/Maven JVM settings and explain repository operation rules in the root README.
- Use contribution and attribution-document templates, or inspect direct child Git repositories for uncommitted work while excluding scratch and vendored directories.

**Example:** Use igapyon-repo-conventions to prepare this repository's ignore rules and local workspace, then document the operating conventions.

[Full workflow, setup, and invocation rules](skills/igapyon-repo-conventions/SKILL.md).

### igapyon-reviewer

**When it helps**

You want to know what could prevent a software or writing artifact from working well for its intended audience. The result is a prioritized report you can act on, with confirmed issues distinguished from uncertain concerns.

**What you can achieve**

- Review code, repositories, packages, Agent Skills, articles, documentation, social posts, and GitHub, UI, or CLI text.
- Apply the relevant review perspectives for the target's conventions, audience, and stage of work.
- Receive consolidated findings with severity, file/line references or other evidence, the practical impact, and targeted alternatives where useful.

**Scope and prerequisites:** This is a review workflow. Editing or implementation begins only when explicitly requested as a subsequent phase.

**Example:** Use igapyon-reviewer to identify what would confuse a first-time reader of this README and show the most important fixes first.

[Full workflow, setup, and invocation rules](skills/igapyon-reviewer/SKILL.md).

### igapyon-skill-compactor

**When it helps**

A skill has become large or repetitive and is read often enough that its organization matters. You want a smaller or better-routed instruction set, together with evidence of what changed and which operational requirements remain intact.

**What you can achieve**

- Inventory activation, inputs, outputs, examples, paths, safeguards, and validation requirements before editing.
- Deduplicate or rewrite instructions, move conditional material into references, and compare the resulting contract with the original.
- Select conservative, structural, or explicitly agreed summary treatment, then report size/structure changes, critical behavior preserved, accepted loss, and added lookup cost.

**Scope and prerequisites:** The workflow can conclude that no change is justified. General token or time savings require appropriate measurement.

**Example:** Use igapyon-skill-compactor to reduce this frequently read SKILL.md, preserve its workflow boundaries, and report the tradeoffs.

[Full workflow, setup, and invocation rules](skills/igapyon-skill-compactor/SKILL.md).

### igapyon-miku-ai-assistant-builder

**When it helps**

You have documents, notes, source text, and structured data that you want to use as an assistant's knowledge. This beta workflow prepares a deliberate set of input files and instructions, and leaves a repeatable job for future content updates.

**What you can achieve**

- Inventory a selected folder, identify text-bundle and JSON/JSONL conversion candidates, and make room for manually supplied material.
- Review JSON-to-XLSX mappings, bundle supported text, and prepare the Markdown or DOCX knowledge files appropriate to the selected service.
- Generate a conversion job, an upload folder, assistant input-field Markdown, and preparation/execution records. Reuse the job when the content changes but the agreed configuration stays fixed.

**Scope and prerequisites:** Targets Microsoft 365 Copilot Agent Builder or Google Gemini Gem Classic. The user reviews and uploads the files with a compatible account. Node.js 22+ is required; the optional Java backend also requires Java 17+.

**Example:** Use miku-ai-assistant-builder to prepare these project documents and JSON records as knowledge for a Gemini Gem, with a job I can rerun next month.

[Full workflow, setup, and invocation rules](https://github.com/igapyon/miku-ai-assistant-builder-skills/blob/cf1f0bbe42ca9ea8af9a1c6f09c2956a85224b80/skills/igapyon-miku-ai-assistant-builder/SKILL.md).

### igapyon-miku-indexgen

**When it helps**

A directory needs a structured inventory for browsing or for a tool that consumes file metadata. The skill creates the catalog from the actual files, allowing it to be regenerated after additions, moves, or edits.

**What you can achieve**

- Create or refresh `index.json` for a selected directory using the supported scan options.
- Produce optional `index.md` for human browsing, with file paths, metadata, and summaries where the generator supplies them.
- Regenerate an existing adopted index through the product runtime, keeping the inventory aligned with the directory rather than manually editing generated entries.

**Scope and prerequisites:** Adoption is optional. Generated title-like summaries should be checked against the original document when choosing material.

**Example:** Use miku-indexgen to create JSON and Markdown catalogs of this documentation directory so people and tools can locate its files.

[Full workflow, setup, and invocation rules](https://github.com/igapyon/miku-indexgen-skills/blob/cc6578a2aea71aea71955398231e249a96561e29/skills/igapyon-miku-indexgen/SKILL.md).

### igapyon-miku-json2xlsx

**When it helps**

You have JSON or JSONL that is awkward to review as raw text and want to inspect it in sheets and columns. The beta workflow first exposes the structure and assumptions, then creates a workbook using the chosen mapping.

**What you can achieve**

- Inspect paths, types, arrays, missing/null values, and bounded samples before deciding how the workbook should represent the data.
- Use automatic mapping for a file input, or review an explicit mapping to control columns and child sheets. Automatic mapping keeps arrays in JSON columns.
- Receive an XLSX with an English `README` data dictionary and the mapped sheets, plus diagnostics and an optional saved automatic mapping for reuse.

**Scope and prerequisites:** The output target and material assumptions are reviewed before writing; replacement of an existing workbook requires explicit authorization.

**Example:** Use miku-json2xlsx to turn these order records into an Excel workbook, with orders on one sheet and explicitly mapped line items on a child sheet.

[Full workflow, setup, and invocation rules](https://github.com/igapyon/miku-json2xlsx-skills/blob/aab690d54a55022a7366b5325b103a5832d85a99/skills/igapyon-miku-json2xlsx/SKILL.md).

### igapyon-miku-ms-office

**When it helps**

Information you want to analyze is inside Office files. This skill gives the agent a readable Markdown representation that can be searched, compared, summarized, or reused alongside other text. It can reduce the need to manually copy document, table, or slide text into a conversation.

**What you can achieve**

- Extract text from Word documents, Excel workbooks, and PowerPoint presentations into Markdown using the corresponding miku-soft converter.
- Use the extracted Markdown as the input to the agent's next task: explain a specification, review tabular text, compare terminology across documents, or prepare a summary from slide content.
- Create experimental DOCX, XLSX, or PPTX outputs from Markdown when you specify the target format, allowing text prepared with the agent to become an Office deliverable.
- Select the appropriate bundled Node.js or Java converter and preserve its diagnostics. The conversion step runs locally without LLM/API calls.

| Starting material | File you receive | What it enables |
| --- | --- | --- |
| A Word specification (`.docx`) | Markdown (`.md`) | Ask the agent to explain requirements, compare passages, or turn the extracted text into another document. |
| An Excel workbook (`.xlsx`) | Markdown (`.md`) | Inspect the extracted sheets and tables as text that the agent can read and discuss. |
| A PowerPoint presentation (`.pptx`) | Markdown (`.md`) | Review slide text, compare messages across presentations, or draft a briefing from the extracted material. |
| Markdown you prepared | Experimental `.docx`, `.xlsx`, or `.pptx` | Share a basic Office-format deliverable, subject to the selected converter's content support. |

**Scope and prerequisites:** Extraction is text-focused. Layout, charts, images, and other visual content have converter-specific limits, and round-trip fidelity is not guaranteed. Summarization and analysis are subsequent agent tasks; the converter produces the text representation.

**Example:** Use miku-ms-office to extract this Word specification and PowerPoint briefing to Markdown, then use the extracted text to compare their terminology and draft a summary.

[Full workflow, setup, and invocation rules](https://github.com/igapyon/miku-ms-office-skills/blob/1b2dbd8ea7e7d7681664a0f12a954b61d8130e17/skills/igapyon-miku-ms-office/SKILL.md).

### igapyon-miku-project

**When it helps**

You want a planning conversation to result in a usable project plan: phases and tasks, their relationships, and a schedule that can be reviewed and shared. The skill works with miku-project's structured plan so different reports can come from the same state instead of being maintained as separate plans.

**What you can achieve**

- Develop a work breakdown structure (WBS) from goals or deliverables, organize phases and tasks, and record the dependencies needed to discuss the order of work.
- Revise an existing plan through targeted changes: split a large task, adjust the schedule, or change dependencies. Validate changes against the current state and compare the before/after plan.
- Create reports that make the plan useful to other people, including an Excel WBS/Gantt, schedule images, readable Markdown, or a complete report bundle.
- Import or export MS Project XML, structural XLSX, and workbook JSON when exchanging or continuing a plan. The editable structural workbook and the presentation-oriented Excel WBS report have distinct roles.

| What you need | What you can produce |
| --- | --- |
| A plan to review or share in Excel | A WBS XLSX report, including the documented Excel Gantt workflow. |
| A schedule image for discussion | Daily or weekly SVG reports, or monthly-calendar SVG entries. |
| A plan to include in repository documentation | WBS Markdown or Mermaid Gantt text. |
| A set of presentation/report files | A report-bundle ZIP generated from the current plan. |
| Data for another edit or compatible tool | Structural workbook XLSX, workbook JSON, or MS Project XML through supported import/export operations. |

**Scope and prerequisites:** The skill helps structure, edit, exchange, and present the plan. The user reviews its business validity and practical feasibility; browser-side visual review remains useful. Available operations follow the selected runtime/backend.

**Example:** Use miku-project to plan a small website release, break it into design, implementation, and testing tasks with dependencies, then produce an Excel Gantt and a weekly SVG for our planning discussion.

[Full workflow, setup, and invocation rules](https://github.com/igapyon/miku-project-skills/blob/7a855f3695d1f8143db6e8ce6fe0c50362d98566/skills/igapyon-miku-project/SKILL.md).

### igapyon-miku-prompt-lint

**When it helps**

A prompt, Agent Skill, or repository instruction set seems ambiguous, overbroad, or hard to follow. This workflow reviews the supplied material for concrete contract and context problems and gives you evidence-based changes to consider.

**What you can achieve**

- Assess the prompt, surrounding context, Agent Skill, and supplied repository/harness material at the levels actually present.
- Report documented checkpoint and anti-pattern findings with rule identifiers, evidence, practical impact, and suggested corrections.
- Follow up with focused rewrite guidance or an appropriate prompt skeleton when requested, while leaving unknown requirements visible.

**Scope and prerequisites:** Use the exact skill or product name to invoke it. Missing prerequisites are reported as unassessed rather than inferred.

**Example:** Use miku-prompt-lint to check why this skill activates for unrelated requests and identify the instructions that need tightening.

[Full workflow, setup, and invocation rules](https://github.com/igapyon/miku-prompt-lint-skills/blob/2e5bb9e76a56f7bf1a3fde8d196526234d8d0f7f/skills/igapyon-miku-prompt-lint/SKILL.md).

### igapyon-miku-repo-bundle

**When it helps**

You want to hand a repository's relevant material to an AI workflow or another reader as a coherent set. This experimental assembler organizes the selected source and documentation together with metadata describing what was included.

**What you can achieve**

- Collect repository metadata, source text, repository documents, and selected external documentation in a documented reference-folder layout.
- Create source/documentation text bundles, a manifest, artifact notes, and checksums, with explicitly selected JAR sidecars or optional class indexes where supported.
- Receive a reference folder and diagnostics that make its scope and artifact provenance inspectable.

**Scope and prerequisites:** The assembler uses existing selected material. Building a repository and uploading the result to an AI service are separate operations.

**Example:** Use miku-repo-bundle to package this Java project's source, design notes, and selected existing JAR as a reference folder for a separate review.

[Full workflow, setup, and invocation rules](https://github.com/igapyon/miku-repo-bundle-skills/blob/f2bf8522f8ec87ff261bbe4d0ebf1d6a790c9089/skills/igapyon-miku-repo-bundle/SKILL.md).

### igapyon-miku-score

**When it helps**

You want to exchange a score with another tool or an AI workflow and then inspect what the conversion produced. MusicXML is the canonical score source, while ABC is the current full-score text format for AI exchange.

**What you can achieve**

- Run documented routes including ABC/MusicXML exchange, ABC-to-MIDI, MIDI-to-MusicXML, and supported MuseScore conversions.
- Produce an SVG score preview through the supported render path, helping you inspect the result rather than relying only on raw notation text.
- Prepare ABC-based AI handoff and report warnings, preservation limits, and conversion loss. Distinguish experimental MEI/LilyPond routes and partial ABC coverage from established operations.

**Scope and prerequisites:** Format coverage follows the bundled specification. It is a conversion/rendering workflow with diagnostics rather than a complete score-engraving editor.

**Example:** Use miku-score to prepare this MusicXML score as ABC for an AI revision, then convert the revised text back and render an SVG for inspection.

[Full workflow, setup, and invocation rules](https://github.com/igapyon/miku-score-skills/blob/f40727cb87df3123ea26e055fe616d421860d423/skills/igapyon-miku-score/SKILL.md).

### igapyon-miku-text-bundle

**When it helps**

You want to pass a collection of files to an AI conversation or knowledge workflow without copying each file individually. The runtime collects and divides the selected text into the documented output parts and their navigation material.

**What you can achieve**

- Create handoff prompt/content/index artifacts, or choose knowledge-source mode for neutral knowledge parts and a separate management index.
- Control part size, input-file limits, directory and extension exclusions, and UTF-8 or Shift_JIS input handling through supported options.
- Receive the generated Markdown parts and a report of skipped files and diagnostics, using the bundled Java runtime or documented Node.js fallback.

**Example:** Use miku-text-bundle to prepare this documentation folder as neutral knowledge-source parts with a chosen character limit.

[Full workflow, setup, and invocation rules](https://github.com/igapyon/miku-text-bundle-skills/blob/4fbe80c649f084fd6dbff1ca0944adda6892cbe7/skills/igapyon-miku-text-bundle/SKILL.md).

### igapyon-miku-text-file-ops

**Status:** Experimental.

**When it helps**

A file uses Windows-31J or another non-UTF-8 encoding, a repository mixes encodings, or ordinary text tools produce decode errors or mojibake. The skill uses the product's explicit encoding and update rules for precise local work.

**What you can achieve**

- Search and read text under a selected project root through structured requests to the bundled standalone CLI.
- Create, update, or delete files according to the runtime's path, patch, and revision semantics.
- Apply the documented encoding, BOM, and newline policy, including explicit conversion when requested, and report decoding or unsupported-operation diagnostics.

**Scope and prerequisites:** The pinned runtime requires Node.js 22 or newer. Use its launcher and encoding policy for the exact supported operations.

**Example:** Use miku-text-file-ops to find a configuration value in these Windows-31J files and update it while preserving the repository's encoding and line endings.

[Full workflow, setup, and invocation rules](https://github.com/igapyon/miku-text-file-ops-skills/blob/cd270f0736c9a7b5760a6a2b28942e6ddb1c5692/skills/igapyon-miku-text-file-ops/SKILL.md).

## Provenance And Licenses

External skill sources are pinned by full commit SHA in [pom.xml](pom.xml).
Their detailed workflow links above point to those upstream revisions. Each
release bundle includes `EXTERNAL_SKILLS.lock` so its external contents can be
identified independently of later upstream changes.

The root [LICENSE](LICENSE) covers this distribution. Preserve license and
attribution files included within individual skills.

## Development And Repository Operations

See [DEVELOPMENT.md](DEVELOPMENT.md) (Japanese) for repository layout, version
alignment, tests and builds, release packaging, upstream updates, local skill
synchronization, canonical article storage, and daybook record conventions.
The [reference discovery policy](docs/policies/reference-discovery.md) explains
how skill references and optional indexes are maintained.

For repository maintenance, follow that developer guide and read the existing
`GOAL.md`, `TODO.md`, `DECISIONS.md`, and `HANDOFF.md` before resuming work.
