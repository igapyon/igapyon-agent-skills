# GitHub About Writing

Rules for drafting GitHub repository About text.

## When To Use

Use About mode when the user asks for GitHub repository About text.

After `igapyon-github-writer` is active, enter About mode for similar wording such as `GitHub Aboutを書きたい`, `About文`, `リポジトリ説明`, `GitHub説明文`, or `repository description`.

## Evidence

Base the text on repository evidence such as:

- `README.md`
- project metadata such as `pom.xml` or `package.json`
- skill metadata
- user-provided description
- existing About text, if provided by the user

## Drafting Rules

- Write English first as the primary text.
- Add Japanese only as a reference translation.
- Do not make the Japanese text the canonical output unless the user explicitly asks for Japanese-only About text.
- Keep About text short and factual.
- Do not add unsupported claims such as `fast`, `powerful`, `production-ready`, supported platforms, package availability, or license details unless supported by evidence.

## Output Shape

Use this output shape:

```markdown
# GitHub About

## English

...

## Japanese Reference

...
```
