# Attachment storage and text-first policy

Read this reference before retaining supplied files, generated results, or supporting material for a daybook record. Keep the daybook repository small and useful as a text-based record.

## Choose where information belongs

Use the following preference order within the requested recordkeeping scope:

1. **Activity body:** Keep the work account, attempts, observations, findings, decision reasons, and remaining questions together while readable. Include enough context to understand the work without opening every linked artifact. Length alone does not require a separate file. Task-only and schedule-only requests still update only those records; this preference does not create an activity automatically.
2. **Durable storage outside daybook:** For material that needs a separate home, prefer a user-designated managed location outside this repository, including another Git repository. This applies to original material and valuable generated or human-edited results, whether text or binary. Keep the relevant findings and a stable reference in daybook.
3. **Daybook attachments:** Choose a necessary text artifact when keeping it versioned with the record has a concrete benefit: for example, a dated investigation snapshot that supports a decision, or a compact reproduction script. An explicit request for an in-repository text attachment is sufficient. Neither receiving a file nor lacking an external destination automatically requires an attachment. Record the purpose briefly where it is not evident from the account or link label.

Use an existing designated storage convention; do not invent an archive root, directory taxonomy, service, or reference scheme. A request to record work does not itself authorize moving or uploading source files. Carry out storage operations when covered by the user's instructions; otherwise record the retention need and known location. Routine recording does not scan or migrate unrelated stored material.

## Decide what to retain

Identify the facts needed to understand the work and the artifacts worth retaining. Temporary source copies, caches, previews, and reproducible intermediates may remain in working storage. Original material, an adopted final result, and human corrections may require durable retention. A rerun command alone does not preserve editorial decisions or the exact result used at the time.

Keep only the useful or requested scope. Do not preserve large or repetitive text dumps by default. When extraction is needed, retain the relevant text and identify its source and omitted portions. Respect an explicit request for a complete transcription or full text; the storage preference does not authorize shortening that deliverable. If text loses information that matters, explain the limitation and prefer a stable reference to the original. A conversion failure does not make binary storage the default.

The following describes content treatment; use the preference order above to choose its storage location.

| Supplied material | Default handling |
| --- | --- |
| Markdown or plain text | Retain the necessary content as text; avoid unnecessary full copies. |
| CSV, JSON, logs, and other structured text | Select only the needed scope; do not copy a large source wholesale by default. |
| Images, including SVG | Keep a stable reference and a short description or requested text extraction. Treat SVG as an image for this policy. |
| Audio or video | Keep a stable reference and relevant notes; save a requested transcript as text. |
| XLSX, DOCX, PPTX | Prefer a stable reference. If text preservation is needed, consider the supported converter in `igapyon-miku-ms-office` when that skill is explicitly in scope; inspect the actual output and retain only necessary Markdown. |
| PDF | Prefer a stable reference. If text is needed, extract the requested pages and use OCR only for necessary scanned pages; note method, scope, and limits. |
| Other binary or archive | Prefer a stable reference and relevant facts. Do not store the binary by default. |

File extensions do not determine whether content is text. Do not use base64, `data:` URLs, embedded media, binary-as-text JSON, or archives to bypass this policy. A `.md` file containing a large encoded binary is still treated as that binary.

## Store text attachments

After choosing an in-repository text attachment, place it under the same month as its primary record:

- Task: `YYYY/YYYYMM/attachments/<task-id>/`, where `task-id` is the task's existing front matter `id`.
- Activity: `YYYY/YYYYMM/attachments/activity-YYYYMMDD/`.
- Schedule: `YYYY/YYYYMM/attachments/schedule-YYYYMMDD-name/`.

Use UTF-8 text, normally `.md` or `.txt`; preserve a useful native text format for reproduction scripts or selected command logs. Preserve a supplied filename when practical, avoid overwriting an existing file, create directories only when needed, and add a relative link from the record. Keep one copy of shared material and link to it from other records. Never copy attachments into generated day-plans.

For extracted text, identify the source and the relevant page, sheet, date range, or other scope. Note the extraction method and material limitations when they affect interpretation. Clearly distinguish extracted text, OCR, and summaries. Do not claim that a conversion retained images, layout, charts, or content absent from its output.

## Durable references and undecided storage

Use a supplied or user-designated stable reference. Identify what the artifact is, its role (original, adopted result, or supporting evidence), and the date, version, or scope needed to distinguish it. For evidence from a changing repository, use a revision-specific reference when known and relevant. Preserve known source URLs. Do not invent a URL or use a temporary path or machine-specific absolute path as a permanent reference.

If a known working copy exists but no durable destination has been established, record its name and current local location as working context, explicitly labeled temporary or local-only, with `長期保管先未確定`. Do not present it as a permanent result link or claim that archiving has happened. If even the current location is unknown, say so. Preserve known paths needed to resume the work rather than replacing them with a fictitious archive reference. Ask for a destination only when carrying out the requested retention operation needs one; ordinary activity recording can finish with the unresolved storage state stated.

Keep retention state separate from task completion. A completed transcription may still have undecided long-term storage. Do not reopen a task, add an archival task, or add a new completion condition automatically; apply the existing task-scope and completion rules. If retention is explicitly part of the task's completion conditions, evaluate that condition too.

## Temporary source and conversion files

Keep source copies, page images, OCR output, and conversion intermediates outside Git-managed paths. A `workplace/` directory may be used only after confirming that the specific path is ignored by Git. If that cannot be confirmed, use a temporary directory outside the repository. Do not rely on the directory name alone.

Do not copy originals or intermediate files into `attachments/` and remove them later; `git add --all` could capture them. Work from the temporary source and retain only the text selected under the preference order above. A file in `workplace/` remains a working copy even if its name says “final” or the task is done. Record an unresolved durable destination as described above; a working path does not substitute for a permanent reference. This policy does not authorize deleting working copies.

## Extremely rare binary exception

Keeping an original binary in the daybook's Git history is an extremely rare exception. It may be considered only when all of these conditions hold:

- The user explicitly asks to keep that particular original in the daybook repository; routine wording such as “attach this” or “record this” is not enough.
- The information cannot reasonably be preserved as text and the original cannot reasonably be managed at a stable external or separately managed location.
- Keeping the original in this repository has a clear, durable purpose that outweighs repository growth; convenience or small file size alone is not sufficient.

Apply any exception only to the named file. Record its type, size, and reason briefly, link it from the relevant record, and avoid duplicate copies. If the request does not establish why these conditions are met, explain the tradeoff and clarify the intended storage before adding the binary. Never broaden one exception to other files or future imports.

## Existing attachments

Apply this policy to new material and files that the user asks to update. Do not relocate existing attachments or workplace results, or remove or convert existing binaries, during ordinary record edits. When an in-scope record depends on temporary material, state its retention status without starting a migration. If the user requests cleanup, review tracked files individually for type, size, references, and a usable external source before changing links or deleting files. Removing a file from the current tree does not remove its historical Git copies.
