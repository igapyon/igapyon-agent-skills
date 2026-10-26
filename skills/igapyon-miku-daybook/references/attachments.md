# Attachment storage and text-first policy

Read this reference before storing supplied files or creating supporting material for a daybook record. Keep the daybook repository small and useful as a text-based record.

## Default: keep useful text

- First decide which information the record needs. Put short facts directly in the record body when that is enough; receiving a file is not by itself a reason to preserve its full contents.
- When a separate attachment is useful, store only the necessary UTF-8 text, normally `.md` or `.txt`. A focused text extraction or transcription is preferred to a source binary.
- Manage original images, audio, video, office files, PDFs, archives, and other binaries elsewhere when possible, and link to a stable source or managed location from the record. Do not upload or move material to another service without an explicit request.
- Do not preserve large or repetitive text dumps by default. Keep only the requested scope and useful content; identify the source and any omitted portions.

## Decide what to retain

1. Identify the purpose of the record and the facts needed to support it.
2. If those facts and a stable reference to the original are sufficient, record them and the reference; do not create an attachment.
3. If source content must be preserved, extract or convert only the needed content to text. Respect an explicit request for a complete transcription or full text, and do not present a partial extraction as complete.
4. If text loses information that matters, explain the limitation and prefer a stable reference to the original. A conversion failure does not make binary storage the default.

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

Place a retained text attachment under the same month as its primary record:

- Task: `YYYY/YYYYMM/attachments/<task-id>/`, where `task-id` is the task's existing front matter `id`.
- Activity: `YYYY/YYYYMM/attachments/activity-YYYYMMDD/`.
- Schedule: `YYYY/YYYYMM/attachments/schedule-YYYYMMDD-name/`.

Use UTF-8 `.md` or `.txt` as appropriate. Preserve a supplied filename when practical, avoid overwriting an existing file, create directories only when needed, and add a relative link from the record. Keep one copy of shared material and link to it from other records. Never copy attachments into generated day-plans.

For extracted text, identify the source and the relevant page, sheet, date range, or other scope. Note the extraction method and material limitations when they affect interpretation. Clearly distinguish extracted text, OCR, and summaries. Do not claim that a conversion retained images, layout, charts, or content absent from its output.

Use a supplied or user-designated stable reference. Do not invent a URL or use a temporary file path or machine-specific absolute path as a permanent reference. If no stable source is available, record the source name and say that its storage location is unspecified; do not imply that it has been archived elsewhere.

## Temporary source and conversion files

Keep source copies, page images, OCR output, and conversion intermediates outside Git-managed paths. A `workplace/` directory may be used only after confirming that the specific path is ignored by Git. If that cannot be confirmed, use a temporary directory outside the repository. Do not rely on the directory name alone.

Do not copy originals or intermediate files into `attachments/` and remove them later; `git add --all` could capture them. Work from the temporary source and place only the final necessary text in the daybook. Do not leave links to temporary files in records.

## Extremely rare binary exception

Keeping an original binary in the daybook's Git history is an extremely rare exception. It may be considered only when all of these conditions hold:

- The user explicitly asks to keep that particular original in the daybook repository; routine wording such as “attach this” or “record this” is not enough.
- The information cannot reasonably be preserved as text and the original cannot reasonably be managed at a stable external or separately managed location.
- Keeping the original in this repository has a clear, durable purpose that outweighs repository growth; convenience or small file size alone is not sufficient.

Apply any exception only to the named file. Record its type, size, and reason briefly, link it from the relevant record, and avoid duplicate copies. If the request does not establish why these conditions are met, explain the tradeoff and clarify the intended storage before adding the binary. Never broaden one exception to other files or future imports.

## Existing attachments

Apply this policy to new attachments and files that the user asks to update. Do not remove or convert existing binary attachments during ordinary record edits. If the user requests cleanup, review tracked files individually for type, size, references, and a usable external source before changing links or deleting files. Removing a file from the current tree does not remove its historical Git copies.
