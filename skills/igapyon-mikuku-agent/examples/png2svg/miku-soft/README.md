# miku-soft PNG to SVG Example

This example records the useful path found while converting the miku-soft
character image `char1.png` to SVG. The goal is not to redraw the character. The
goal is to extract the original linework faithfully while removing noise, then
add semantic construction guides as separate layers when needed.

## Directory Layout

- [00-source](00-source/): original PNG material.
- [01-line-mask](01-line-mask/): reviewed black-and-white line mask.
- [02-linework-svg](02-linework-svg/): SVG generated from the approved mask.
- [03-inferred-guides](03-inferred-guides/): auxiliary inferred geometry such as
  the hidden face outline.

## Flow

### Material

Source image:

- [00-source/char1.png](00-source/char1.png)

The source contains a full diagram. The target subject is the central character
face. Text, arrows, surrounding document icons, background marks, and decorative
non-character elements are not part of the target linework.

### STEP-1: Main-Line Mask

Create a black-and-white mask from the cropped character subject.

Artifacts:

- [01-line-mask/char1-line-mask-v11.pbm](01-line-mask/char1-line-mask-v11.pbm)
- [01-line-mask/char1-line-mask-v11-preview.png](01-line-mask/char1-line-mask-v11-preview.png)

Review points:

- The jaw curve and visible face outline must follow the source image.
- Hairline, bangs, twin tails, ribbons, eyes, and mouth must remain readable.
- Cheek color, watercolor texture, background, arrows, and text should not be
  picked up as linework.
- The top of the head must not be clipped by the crop.

Human review happens at this step before SVG tracing.

### STEP-2: Main-Line SVG

Trace the approved mask into SVG.

Artifact:

- [02-linework-svg/char1-linework-v11.svg](02-linework-svg/char1-linework-v11.svg)

This SVG is still black-and-white linework. It should preserve the original
visible line shape. Do not correct the jaw, hair, or twin-tail shape by
redrawing it as a new illustration.

### STEP-3: Inferred Construction Guide

Add hidden or inferred semantic geometry only as a separate guide layer.

Artifacts:

- [03-inferred-guides/char1-linework-inferred-face-v27.svg](03-inferred-guides/char1-linework-inferred-face-v27.svg)
- [03-inferred-guides/char1-linework-inferred-face-v27-preview.png](03-inferred-guides/char1-linework-inferred-face-v27-preview.png)

During the work, the human provided an ellipse-like guide showing the intended
position and scale of the hidden face outline. `v27` converts that positional
intent into a clean dashed `face-outline-inferred` construction layer on top of
the STEP-2 linework. The temporary human-guide SVG is intentionally not kept in
this example, because the reviewed result is `v27`.

Important rules:

- Visible lines come from the reviewed mask and traced SVG.
- Hidden face outline is inferred geometry, not original visible linework.
- Keep inferred geometry in a separate group such as `face-outline`.
- Use explicit names such as `face-outline-inferred`.
- Do not merge inferred construction paths into the original potrace linework.

## Key Lesson

The successful workflow is:

1. Extract visible linework from the original PNG.
2. Review the black-and-white mask with a human.
3. Trace the approved mask into SVG.
4. Add semantic inferred guides separately when later editing needs them.

This keeps fidelity to the original image while still allowing later SVG work to
understand parts such as face outline, jaw curve, hairline, hair, ribbons, and
twin tails.
