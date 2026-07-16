# XML Agent Grepability Review

Use this reference to review whether XML files are formatted so AI agents and
line-oriented tools such as `rg` or `grep` can inspect them effectively.

This review is about operational readability, searchability, diffs, and stable
generated output. It does not replace XML validity, schema validation, or
library-choice review.

## Review Priority

Use this review when the target includes:

- generated XML
- XML configuration files
- XML metadata, manifests, reports, or indexes
- Maven `pom.xml` or plugin descriptors
- XML examples in README or docs
- XML emitted by CLI tools or build scripts
- XML files expected to be inspected by AI agents

Use it together with structured data library, generated artifact, version
consistency, repository handoff, and completion reviews when XML is part of the
product or release workflow.

## Line-Oriented Search Checks

Check whether XML line breaks make search hits useful.

Good XML for agent grepability usually:

- puts one logical element on one line when the element is the useful search
  unit
- keeps short attributes on the same line as the element name when a hit should
  show the identifier and key metadata together
- breaks repeated sibling elements onto separate lines
- avoids one giant line containing many unrelated elements
- avoids splitting a short element so widely that a hit on the tag name loses
  the useful text or attributes
- keeps parent/child indentation stable enough to understand context from a
  nearby snippet

For example, repeated dependency-like entries are usually easier to search when
each meaningful leaf value or compact item has predictable line placement:

```xml
<dependency>
  <groupId>org.example</groupId>
  <artifactId>example-lib</artifactId>
  <version>1.2.3</version>
</dependency>
```

For compact record-like XML, this can also be acceptable when each entry is
small and searched as one unit:

```xml
<file name="SKILL.md" path="SKILL.md" type="md" />
<file name="README.md" path="README.md" type="md" />
```

## Indentation and Size Checks

Check whether indentation fits the file's role.

Prefer:

- two-space indentation for XML that is generated, reviewed, and committed often
- stable indentation for nested structure
- no unnecessary blank lines inside repeated generated entries
- trailing newline at EOF
- deterministic attribute ordering when diffs and grep results matter

Avoid:

- deep indentation that adds size without improving context
- formatter churn that changes many lines without content changes
- minified XML when humans or agents are expected to inspect it
- excessive line wrapping that separates identifiers from values
- inconsistent indentation that makes generated XML look hand-edited

Compactness is useful, but do not compact XML so far that schema errors,
namespace declarations, or important attributes become hard to review.

## Attribute and Text Placement Checks

Check whether tag text and attributes are placed for searchability.

Good placement depends on what agents search for:

- if agents search by `id`, `name`, `path`, `artifactId`, or similar
  identifiers, keep the identifier near the element name or on a predictable
  child line
- if text content is the main value, avoid splitting short text across multiple
  lines
- if attributes are long, wrap them consistently rather than randomly
- if namespaces are important, keep namespace declarations visible near the root
  or relevant element
- if comments explain generated sections, place them before the section they
  describe

Do not force every XML file into the same shape. A Maven `pom.xml`, an XML
manifest, and a generated search index may have different best line units.

## Generated XML Checks

For generated XML, check:

- formatting is deterministic across runs
- generated output is not hand-edited
- the generator uses an XML library/writer for escaping and encoding
- pretty/compact settings are intentional and documented when important
- tests or golden files account for the chosen formatting when diffs matter
- large XML output does not sacrifice streaming behavior just to pretty-print
  the entire document

If the XML is very large, prefer streaming-friendly formatting and stable record
boundaries over expensive whole-document pretty-printing.

## Severity Guidance

Use these severity levels:

- High: XML is invalid, generated with unsafe escaping, or minified in a way
  that prevents required inspection before release.
- Medium: line breaks or indentation make important records, IDs, paths,
  versions, or dependency entries hard for agents to search and interpret.
- Medium: generated XML formatting is unstable, causing noisy diffs or weak
  review confidence.
- Medium: pretty-printing requires whole-document buffering where streaming
  generation is needed for realistic file sizes.
- Low: indentation or wrapping could be more compact or consistent but does not
  block use.

## Review Output

Contribute findings to the [Consolidated Review Report](../../templates/consolidated-review-report.md). Do not emit a standalone `XML Agent Grepability Review` section
unless the user explicitly asks for per-lens reports. Use the canonical fields for
every finding.

When material, add only these lens-specific assessment notes:

```text
Target: ...
Primary use: config / metadata / report / manifest / generated output / example / unclear
Line-oriented search readiness: good / partial / weak / not checked
Formatting stability: stable / noisy / unclear / not checked
```

Lens-specific notes and ratings never replace finding severity, status, or
location and evidence. When this lens finds no material issue, do not emit a
separate no-issue block; preserve checked scope, verification, and residual risk
in the consolidated assessment notes.

Do not reformat XML during review mode unless the user explicitly asks to switch
to maintenance work.
