# Java Straight Conversion Workflow

Use this workflow for creating or maintaining a Java straight-conversion version of a miku-soft Node.js / TypeScript upstream project.

Detailed design guidance lives in:

- [miku-soft-basic/miku-soft-20-javaapp-design-v20260501.md](miku-soft-basic/miku-soft-20-javaapp-design-v20260501.md)
- [miku-soft-basic/miku-soft-30-straight-conversion-v20260425.md](miku-soft-basic/miku-soft-30-straight-conversion-v20260425.md)

Keep this file as the execution checklist.

## First Reads

1. Read [architecture-rules.md](architecture-rules.md).
2. Read the Java application and straight conversion basic documents.
3. Inspect upstream evidence, existing Java source, mapping documents, tests, build files, README, docs, TODO, and workplace instructions.

## Checklist

1. Confirm the upstream source and target Java repository before editing.
2. Preserve upstream-following ability and avoid Java-first redesign unless the user explicitly asks for a separate extension.
3. Keep upstream-derived behavior and Java-side original extensions documented separately.
4. Maintain or create mapping notes when file/class responsibility tracking matters.
5. Prefer focused regression commands that compare behavior, CLI contracts, diagnostics, or generated artifacts.
6. Update README, docs, TODO, tests, build files, and indexes when conversion assumptions change.
