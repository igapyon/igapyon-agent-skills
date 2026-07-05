# PNG to SVG Examples

This directory contains concrete examples for the experimental PNG-to-SVG
workflow used by the Mikuku agent.

The important distinction is:

- visible linework is extracted from the original PNG;
- inferred or hidden geometry is kept as a separate construction layer;
- color work is a later step and is not mixed into the line-mask review.

## Examples

- [miku-soft](miku-soft/): character-face PNG to black-and-white SVG linework, with an
  inferred face-outline guide.
