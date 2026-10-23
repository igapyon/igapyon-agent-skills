# Usage

## Input and output

The bundled CLI accepts one regular `.md` or `.markdown` file encoded as
UTF-8, with or without a UTF-8 BOM. The required `--out` path must end in
`.html`. When no output path is given by the user, use
`workplace/miku-md2html/<input-stem>.html`, where the stem omits `.md` or
`.markdown`.

```sh
node skills/igapyon-miku-md2html/runtime/miku-md2html-0.3.2.mjs \
  ./docs/guide.md \
  --out ./workplace/miku-md2html/guide.html
```

The CLI creates a missing output directory. It refuses an existing output by
default. `--force` replaces only existing regular HTML or report files; it
does not permit symlinks, directories, special files, or collisions with the
input, report, or a referenced image. Do not use `--force` without the user's
explicit replacement instruction.

## Local images

PNG, JPEG, GIF, WebP, and SVG files referenced by the Markdown are embedded in
the HTML. Relative paths are resolved from the Markdown file's directory.
`--asset-root <directory>` can allow local images under another directory;
it does not change how relative paths are resolved. Remote images are never
downloaded. Missing or unsafe image references fail conversion.

## Supported content

The converter supports CommonMark and GitHub Flavored Markdown tables, task
lists, strikethrough, autolinks, and footnotes. It adds stable heading IDs and
a table of contents by default. Recognized fenced code blocks receive syntax
highlighting; unsupported or unlabeled code remains ordinary code. Safe,
display-oriented raw HTML is retained and unsafe constructs are removed with
diagnostics.

The generated HTML embeds its styles and viewer code, so it can be opened
without network access. Ordinary external links remain links and open in the
current tab. The tool does not resize or recompress images.

## Options

- `--title <text>` overrides the front matter title and first H1.
- `--lang <tag>` sets the HTML language; for example `ja`, `en`, or `zh-Hans`.
- `--asset-root <directory>` permits local images under an additional root.
- `--no-toc` omits the table of contents.
- `--max-output-mib <integer>` sets the final HTML cap from 1 to 1024 MiB;
  the default is 100 MiB.
- `--report-json <file>` writes an optional conversion report.
- `--help` and `--version` run without reading or writing conversion files.

The CLI does not write the HTML or JSON report to stdout. It prints one
success summary; warnings and errors go to stderr. Exit code 0 means success,
1 means an expected input, conversion, or file failure, 2 means a usage error,
and 3 means an unexpected internal error. Report success only when the exit
code is 0 and the requested output exists.
