# PNG to SVG Linework Prompt (experimental, WIP)

This reference is experimental and work in progress.

Use this prompt for the early linework stages of PNG-to-SVG vectorization:
creating and reviewing the black-and-white main-line mask, tracing that approved
mask into SVG, and adding clearly separated inferred construction guides when
needed. Do not use this prompt to create the final colored SVG.

## Core Principle

Do not redraw the image as a new illustration.

Extract the original image lines faithfully while removing noise. Preserve the
shape, curve, connection, and visual meaning of lines that a human would
recognize as intentional linework.

## Goal

Create human-reviewable black-and-white linework artifacts from a PNG image.

The workflow is intentionally staged:

- STEP-1: create and review the black-and-white main-line mask.
- STEP-2: create the black-and-white linework SVG from the approved mask.
- STEP-3: add semantic grouping or inferred construction guides as separate SVG
  layers when needed.

Color extraction, color cleanup, and final colored SVG composition are later
steps and remain outside this prompt.

## Output

Produce these artifacts with incremented filenames:

- `*-line-mask-vNN.pbm`: black-and-white line mask for tracing.
- `*-line-mask-vNN-preview.png`: human-reviewable preview of the mask.
- `*-linework-vNN.svg`: STEP-2 SVG generated from the approved mask.
- `*-linework-inferred-*-vNN.svg`: optional STEP-3 SVG with inferred
  construction guides kept in separate groups.

Do not overwrite a previous accepted version. Create a new incremented version
for each attempt.

For a concrete WIP example, consult
`examples/png2svg/miku-soft/` before starting a similar task.

## Workflow

1. Crop the PNG to the target subject with enough margin.
2. Mask out unrelated elements such as text, arrows, decorations, background
   marks, or nearby objects.
3. Convert the crop to grayscale.
4. Apply only light denoising, such as a small blur, before thresholding.
5. Threshold to a black-and-white line mask.
6. Create a preview PNG of the mask.
7. Stop for human review.
8. After the human approves the mask, run `potrace` to create the STEP-2
   linework SVG.
9. If semantic or hidden contours are needed, add them as separate inferred or
   construction groups, not as edits to the traced visible linework.

## Human Review Gate

Before running `potrace`, ask the human to review the preview image.

The human should check:

- Whether important contours are missing.
- Whether the head, face outline, jaw curve, hairline, eyes, mouth, ribbon, and
  other intended lines are preserved.
- Whether text, arrows, background marks, cheeks, watercolor texture, or other
  non-line artifacts were accidentally included.
- Whether the crop cuts off any part of the subject.
- Whether the line mask preserves the meaning of parts, not just the visual
  silhouette.

If the human points out an issue, adjust the crop, masks, blur, or threshold and
produce a new preview. Do not proceed to SVG until the mask is approved.

## Semantic Layer Awareness

During STEP-1, reason about the meaning of the drawing parts. A useful line mask
is not merely black pixels. It should allow later SVG work to preserve or
separate semantic layers such as:

For example, for a human face icon or character face:

- face outline
- jaw curve
- hair outline
- hairline and bangs
- twin tails
- ribbons
- eyes
- mouth
- decorative marks
- noise or non-line artifacts

When a mark is ambiguous, do not silently decide. Surface the ambiguity during
the human review.

## STEP-2: SVG From Approved Mask

Create the SVG directly from the human-approved mask. The SVG itself is
reviewable, so do not create extra PNG previews unless they help compare or
debug a specific issue.

Preserve the visible line identity from the approved mask. Do not use this stage
to "improve" a face outline, jaw curve, hair shape, ribbon shape, or twin-tail
shape by redrawing it from scratch.

## STEP-3: Inferred Construction Lines

Visible linework and inferred construction lines must not be mixed.

If a later SVG step needs to infer a hidden semantic contour, such as a face
outline hidden behind hair, keep it in a separate layer or group. Mark it
explicitly as inferred, construction, hidden, or auxiliary. Do not merge inferred
geometry into the traced original linework.

For a human face icon or character face, this may include an inferred full face
oval behind bangs or hair. The visible jaw curve should still come from the
approved line mask. The inferred outline is only a semantic guide for later
part separation, color work, or editing.

When a human provides a guide shape, such as an ellipse drawn over the SVG, treat
it as positional intent. Convert it into a clean reviewable auxiliary stroke
when useful, but preserve its role as an inferred guide rather than original
linework.

## Suggested Commands

Example only. Adjust crop, mask rectangles, blur, and threshold per image.

```sh
magick input.png \
  -crop 500x330+380+470 +repage \
  -resize 1091x665! \
  -background white -flatten \
  subject-guide-v01.png
```

```sh
magick subject-guide-v01.png \
  -fill white \
  -draw 'rectangle 0,0 70,665 rectangle 1020,0 1091,665 rectangle 0,0 1091,65' \
  -colorspace Gray \
  -blur 0x0.6 \
  -threshold 48% \
  subject-line-mask-v01.pbm
```

```sh
magick subject-line-mask-v01.pbm subject-line-mask-v01-preview.png
```

After human approval:

```sh
potrace subject-line-mask-v01.pbm \
  --svg \
  --output subject-linework-v01.svg \
  --turdsize 18 \
  --alphamax 0.8 \
  --opttolerance 0.3
```

## Stop Condition

The linework stage is complete when:

- the human-approved black-and-white line mask exists;
- the STEP-2 linework SVG has been generated from that approved mask;
- any inferred construction guides are explicitly separated from visible
  linework;
- the agent has not started color work.

Color extraction, color layer cleanup, and final SVG composition belong to
later color stages.
