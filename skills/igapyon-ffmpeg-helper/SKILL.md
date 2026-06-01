---
name: igapyon-ffmpeg-helper
description: "Use only on hard trigger: the user explicitly names igapyon-ffmpeg-helper, says to use/apply the FFmpeg helper skill, or uses a specific activation phrase such as igapyon FFmpeg helper, ffmpeg helper workflow, FFmpeg helper runbook, ffmpeg runbook igapyon, or igapyon ffmpeg runbook. This skill is for igapyon's personal FFmpeg runbooks, including the H4essential orchestra recording to YouTube workflow. Do not use for ordinary FFmpeg questions, H4essential mentions, YouTube/video/audio conversion questions, loudnorm/gain questions, or generic workflow discussion unless the user explicitly triggers this skill."
---

# igapyon-ffmpeg-helper

This skill guides igapyon's personal FFmpeg workflows. Use it as a
conversational command generator and runbook navigator.

Do not build a Web UI unless the user separately asks for implementation.

## Activation

Use this skill only on a hard trigger. Valid triggers include:

- `igapyon-ffmpeg-helper`
- `igapyon FFmpeg helper`
- `ffmpeg helper`
- `FFmpeg helper workflow`
- `FFmpeg helper runbook`
- `ffmpeg runbook igapyon`
- `igapyon ffmpeg runbook`
- `igapyon's FFmpeg helper workflow`
- an explicit request to use or apply this Agent Skill

Do not activate this skill for:

- ordinary FFmpeg questions
- ordinary H4essential questions
- ordinary YouTube/video/audio conversion questions
- mentions of `loudnorm`, gain adjustment, trimming, concatenation, or still
  image video creation
- vague descriptions of a similar workflow

If the user only asks whether such a skill exists, mention this skill as an
available option, but do not apply it until the user asks to use it.

## Workflow Selection

The first-cut workflow is:

- [references/workflows/h4essential-orchestra-youtube.md](references/workflows/h4essential-orchestra-youtube.md)

When more workflows are added, choose the closest workflow from
`references/workflows/`. If no workflow matches, use the process runbooks in
`references/process/` only as modular command guidance.

For the first-cut workflow, confirm the route once at the start:

```text
H4essentialのオーケストラ録音から、切り出し、loudnorm JSON測定、-0.5 dBTPピーク基準の単純ゲイン仕上げ、必要なら結合、静止画付きYouTube用動画作成まで進めますか？
```

After the route is confirmed, keep moving and ask only for the missing input
needed for the next concrete command.

## Process Runbooks

Use these process files as reusable command building blocks:

- [references/process/h4essential-input-discovery.md](references/process/h4essential-input-discovery.md)
- [references/process/workspace-and-command-log.md](references/process/workspace-and-command-log.md)
- [references/process/audio-trim.md](references/process/audio-trim.md)
- [references/process/peak-gain-normalize.md](references/process/peak-gain-normalize.md)
- [references/process/audio-concat.md](references/process/audio-concat.md)
- [references/process/still-image-youtube-video.md](references/process/still-image-youtube-video.md)
- [references/process/youtube-manual-upload.md](references/process/youtube-manual-upload.md)

Use `index.json` as the discovery index when you need to confirm available
reference files, but treat `SKILL.md` and files under `references/` as the
source of truth.

For the reasoning behind the current YouTube output defaults, see
[references/decisions/youtube-output-policy.md](references/decisions/youtube-output-policy.md).

## Prerequisites

Running generated commands requires the `ffmpeg` CLI to be available in the
user's shell. `ffmpeg -version` is mandatory before executing any workflow
command on the user's machine:

```sh
ffmpeg -version
```

If `ffmpeg -version` fails or `ffmpeg` is unavailable, stop command execution
and ask the user to install or expose `ffmpeg` in `PATH`.

## First-Cut Guardrails

Unless the user explicitly changes the first-cut workflow:

- Use copied ZOOM H4essential recording folders as the source.
- Assume orchestra or ensemble rehearsal recording.
- Treat trimming as expected and usually required.
- Use a two-phase simple-gain route: measurement first, finishing second.
- Use `loudnorm=print_format=json` only for measurement JSON.
- Use `volume=...dB` only for finishing; do not use loudness normalization in
  the finish command.
- Target peak is `-0.5 dBTP`.
- Do not use compression.
- Let the user choose hi-res or lo-res output for the finish command; default
  to hi-res when the user does not specify.
- Tell the user that hi-res intermediate WAV files will be larger.
- For multiple WAVs, trim and gain-adjust each selected WAV first, then
  concatenate.
- End at a YouTube-uploadable video file.
- Upload manually through the YouTube Studio Web UI.
- Do not introduce YouTube API upload, OAuth, scheduled publishing, or metadata
  automation unless the user explicitly asks to expand the skill.

## Response Style

When using this skill:

- Prefer Japanese explanations for this user's workflow unless the user switches
  language.
- Show concrete commands in execution order.
- Clearly label the two FFmpeg runs: measurement phase and finishing phase.
- Ask the user to paste the loudnorm JSON measurement output back when you
  cannot run the measurement command yourself.
- Preserve source files and avoid destructive commands.
- Use quoted paths in generated shell commands.
- Put generated working files under a per-job directory such as
  `workplace/ffmpeg-helper-260114_160901/` by default.
- Keep a command log such as `workplace/ffmpeg-helper-260114_160901/commands.log`
  and record the exact commands that are executed or handed to the user.
- It is acceptable and preferred to write auxiliary logs, measurement outputs,
  and troubleshooting files inside the per-job `workplace/` directory.
- Do not silently choose between plausible H4essential tracks when the recording
  source is ambiguous.
