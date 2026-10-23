---
name: igapyon-miku-md2html
description: Convert a UTF-8 Markdown file and its local images into one portable, self-contained HTML file with the bundled miku-md2html CLI. Use when asked for miku-md2html or Markdown-to-HTML conversion. Requires Node.js 22 or newer.
---

# igapyon-miku-md2html

Convert one Markdown file into a standalone HTML document with its CSS,
JavaScript, SVG, and supported local images embedded. The output can be opened
offline.

## Workflow

1. Read [usage.md](references/usage.md) for the supported input and output
   behavior.
2. Keep the Markdown input unchanged. Use the output path requested by the
   user, or default to `workplace/miku-md2html/<input-stem>.html`, where the
   stem omits `.md` or `.markdown`.
3. Confirm Node.js 22 or newer is available. Use the bundled runtime at
   `runtime/miku-md2html-0.3.2.mjs`; do not download dependencies or build the
   upstream source during conversion.
4. Run the CLI with the input and required `--out <file.html>` argument. Add
   `--asset-root <directory>` only when the user wants local images outside
   the Markdown file's directory to be available.
5. Do not pass `--force` unless the user explicitly asks to replace an
   existing output. Report the generated path and any diagnostics.

The converter does not download remote images. If the user needs an image that
is only available remotely, explain that it must first be provided as a local
file. For runtime provenance and licensing, see [upstream.md](references/upstream.md).
