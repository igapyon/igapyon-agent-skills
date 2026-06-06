# Diary Structure Reference

This reference summarizes the `diary` repository structure observed from `../diary/2025/` and `../diary/2026/`.

## Repository Shape

- Year directories contain diary source and generated files.
- Source entries are `YYYY/igYYMMDD.src.md`.
- Generated Markdown is `YYYY/igYYMMDD.md`.
- Generated fake HTML Markdown is `YYYY/igYYMMDD.html.md`.
- Year indexes are `YYYY/index.src.md`, `YYYY/index.md`, and `YYYY/index.html.md`.
- Year directories also contain `atom.xml`.

For source-only writing, edit only `.src.md`.

## Naming

Date `YYYY-MM-DD` maps to:

```text
../diary/YYYY/igYYMMDD.src.md
```

Examples:

- `2025-04-12` -> `../diary/2025/ig250412.src.md`
- `2026-01-03` -> `../diary/2026/ig260103.src.md`

## Entry Structure

The normal source entry starts with a first `## ` heading:

```markdown
## Entry title

Body paragraph.

<@lastmodified date="YYYY-MM-DD"/>
```

Observed 2025/2026 entries usually have:

- one first `## ` heading as the entry title
- optional `### ` subsections for procedure notes and longer explanations
- optional `## タグ`
- optional `## 関連する日記` or `### 関連する日記`
- final `<@lastmodified date="YYYY-MM-DD"/>`

There are existing exceptions without a first `## ` heading, but new entries should include a first `## ` heading because generated titles and index behavior depend on it.

## Common Sections

Short memo:

```markdown
## Title

Short factual diary text.

<@lastmodified date="YYYY-MM-DD"/>
```

Procedure memo:

~~~~markdown
## Title

### Step or topic

- Bullet point.

```text
command or sample
```

### 関連する日記

- <@linkdiary date="YYYY-MM-DD" />

<@lastmodified date="YYYY-MM-DD"/>
~~~~

## Related Diary Section

`関連する日記` is a characteristic section in recent diary entries. It appears as either `### 関連する日記` inside a procedure memo or `## 関連する日記` near the end of larger entries.

Use this shape:

```markdown
## 関連する日記

- <@linkdiary date="YYYY-MM-DD" />
- <@linkdiary date="YYYY-MM-DD" />
```

For smaller procedure notes, `### 関連する日記` is also seen.

`<@linkdiary date="YYYY-MM-DD" />` looks up the generated root `atom.xml` and expands to a Markdown link using the target diary title and URL. If the target date is not present in `atom.xml`, generation emits an error text. Prefer linking only to diary entries that already exist or will exist after generation.

Photo entry:

~~~~markdown
## Title

Intro paragraph.

## 写真

### Photo caption

Description.

![alt](https://www.igapyon.jp/igapyon/diary/images/YYYY/file.jpg)

## タグ

- `#Tag`

## 関連する日記

- <@linkdiary date="YYYY-MM-DD" />

<@lastmodified date="YYYY-MM-DD"/>
~~~~

## Year Index

Year index source pattern:

```markdown
<#assign localYear="YYYY" />
<@localyearlist /> / [keyword](../keyword/index.html) / [memo](../memo/index.html)

## いがぴょんの日記：YYYY年の日記

<@localrss filename="atom.xml" />
```

Use this for new year directories. Do not rewrite existing year indexes unless asked.

## igapyonv3 Directives Seen

- `<@lastmodified date="YYYY-MM-DD"/>`
- `<@linkdiary date="YYYY-MM-DD" />`
- `<@localyearlist />`
- `<@localrss filename="atom.xml" />`
- `<#assign localYear="YYYY" />`

Preserve existing spacing around directives unless there is a clear reason to change it.

## igapyonv3 Custom Directives

Primary reference: `https://igapyon.jp/igapyon/diary/keyword/igapyonv3.html`, especially the section titled `[igapyonv3] の [Markdown] 中で利用可能なカスタム ディレクティブ一覧`.

Source reference: `../diary/2017/ig170114.src.md`, included by `../diary/keyword/igapyonv3.src.md`.

Implementation reference: `../igapyonv3/src/main/java/jp/igapyon/diary/igapyonv3/mdconv/freemarker/IgapyonV3FreeMarkerUtil.java`.

Use the published list as the writing guide. Use source code only to confirm exact names and parameters.

### Settings

These are for `settings.src.md`, not ordinary diary body text:

- `${showSettings()}`: shows current settings.
- `${setVerbose("false")}`
- `${setAuthor("Toshiki Iga")}`
- `${setBaseurl("https://igapyon.github.io/diary")}`
- `${setSourcebaseurl("https://github.com/igapyon/diary/blob/gh-pages")}`

The code also registers additional settings methods such as `setDebug`, `setGeneratetodaydiary`, `setDuplicatefakehtmlmd`, `setConvertmarkdown2html`, `setGeneratekeywordifneeded`, and `setSitetitle`. Treat them as settings-file operations unless the user is editing `settings.src.md`.

### Link Output

Search:

- `<@linksearch word="いがぴょん" />`
- `<@linksearch title="いがぴょん検索サイト内" word="いがぴょん" site="https://www.igapyon.jp/" />`
- `<@linksearch title="いがぴょんTwitter" word="伊賀" engine="twitter" />`

SNS:

- `<@linkshare word="${current.title}" tags="igapyon,diary,いがぴょん" />`

Navigation:

- `<@linktop />`
- `<@linktarget />`
- `<@linksource />`
- `<@linkprev />`
- `<@linknext />`
- `<@navlist />`

Navigation tags normally belong to generated headers/footers or templates, not ordinary diary body text.

Other link helpers:

- `<@link value="https://www.igapyon.jp/igapyon/diary/index.html" />`
- `<@linkdiary date="YYYY-MM-DD" />`
- `<@linkamazon title="JDBC本" dp="4839913935" />`
- `<@linkmap word="mapテスト" lat="35.6722478" lon="139.7214164" />`
- `<@lastmodified date="YYYY-MM-DD" />`

For ordinary diary entries, the most common helpers are `<@lastmodified ... />`, `<@linkdiary ... />`, and sometimes `<@link ... />`.

### List Expansion

- `<@rssfeed url="https://www.publickey1.jp/atom.xml" maxcount="0" />`
- `<@localrss />`
- `<@localyearlist />`
- `<@keywordlist />`

Year indexes in recent `diary` use `<@localrss filename="atom.xml" />` and `<@localyearlist />`.

### Include

- `<@include file="ig170103.src.md" />`

Use include only for keyword/memo/composed pages or when an existing nearby file shows the same pattern. Avoid it in normal daily entries unless there is a concrete reason.

### Keyword Markers

- `[[Keyword]]` marks a keyword. During conversion, the keyword is collected and converted to a Markdown link.
- `[Keyword]` in titles is also treated as a keyword source by the pre-parse flow.
