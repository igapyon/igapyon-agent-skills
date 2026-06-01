# H4essential Orchestra Recording to YouTube Workflow

Use this workflow for the first-cut `igapyon-ffmpeg-helper` route:

```text
H4essential orchestra recording folders
  -> select WAV tracks
  -> trim unnecessary portions
  -> measurement phase with loudnorm JSON
  -> finishing phase with volume-only gain to target peak -0.5 dBTP
  -> optionally concatenate adjusted files
  -> combine still image + audio into a YouTube-uploadable video
  -> manual upload in YouTube Studio
```

## Scope

This workflow is intentionally personal and narrow:

- Source: ZOOM H4essential recording folders copied to local storage.
- Main use case: orchestra or ensemble rehearsal recording.
- Final target: YouTube-uploadable video file.
- Upload method: manual upload through YouTube Studio.
- Cut points and file boundaries: human judgment in the first cut. Strongly
  recommend checking the recording in VLC before deciding start/end times or
  where multiple files should join.

Do not turn this into a generic FFmpeg workflow unless the user asks to expand
the skill.

For the reasoning behind the YouTube output defaults, see
[../decisions/youtube-output-policy.md](../decisions/youtube-output-policy.md).

## Prerequisites

This workflow requires the `ffmpeg` CLI to be available in the shell. Running
`ffmpeg -version` is mandatory before any workflow command is executed. Record
the command in `commands.log` and save the output as `ffmpeg-version.txt` in the
job directory:

```sh
ffmpeg -version > "workplace/ffmpeg-helper-260114_160901/ffmpeg-version.txt"
```

If `ffmpeg -version` fails or `ffmpeg` is unavailable, stop and ask the user to
install or expose it in `PATH`.

## Initial Confirmation

Confirm the route once at the beginning:

```text
H4essentialのオーケストラ録音から、切り出し、loudnorm JSON測定、-0.5 dBTPピーク基準の単純ゲイン仕上げ、必要なら結合、静止画付きYouTube用動画作成まで進めますか？
```

After confirmation, ask only for missing inputs needed for the next command.

For trim points and file boundaries, do not pretend to infer musical cut points
automatically. Ask the user to confirm times after listening in VLC.
Trimming may cut both margins, only the beginning, only the end, or nothing.

When trim points are unknown, ask the user to inspect the recording in VLC and
return a cut memo using the format in
[../process/audio-trim.md](../process/audio-trim.md). Treat that memo as the
source of truth for trim command generation.

## Modes

Classify the request into one mode:

- Single WAV: one selected recording track becomes one final YouTube video.
- Single WAV, multiple parts: one selected recording track is split into
  several separately named parts such as `260503_113659-part1_trim.wav` and
  `260503_113659-part2_trim.wav`.
- Multiple WAVs: several selected recording tracks are processed individually
  and then concatenated.
- Already trimmed: skip trim and start from the measurement phase.
- No trim needed: skip trim, or stage the source into the job directory if a
  staged file is useful for consistent later commands.
- Already adjusted: skip gain adjustment and start from concat or video
  creation.
- Still-image-only missing: help create or locate the still image if the user
  asks, otherwise request the still image path. Prefer a user-provided image,
  a simple title card, or generated artwork when explicitly requested.
  Mention practical YouTube image-size guidance when useful: 1920x1080 for the
  in-video still image, 3840x2160 for the current official custom thumbnail
  recommendation, and 1280x720 as a lighter practical fallback.
- YouTube upload format: prefer MP4/H.264/AAC by default for official
  recommendation alignment. Offer the local-html-tools-style MKV route only
  when the user explicitly wants to preserve WAV audio with `-c:a copy`.

## Process Order

Use these process runbooks in order:

1. [../process/h4essential-input-discovery.md](../process/h4essential-input-discovery.md)
2. [../process/workspace-and-command-log.md](../process/workspace-and-command-log.md)
3. [../process/audio-trim.md](../process/audio-trim.md)
4. [../process/peak-gain-normalize.md](../process/peak-gain-normalize.md)
5. [../process/audio-concat.md](../process/audio-concat.md), only when multiple
   adjusted WAV files must be joined
6. [../process/still-image-youtube-video.md](../process/still-image-youtube-video.md)
7. [../process/youtube-manual-upload.md](../process/youtube-manual-upload.md)

## Output Naming

Prefer a per-job directory under `workplace/`, following the convention used by
the other igapyon Agent Skills. If the user does not give names, propose names
like these:

```text
workplace/ffmpeg-helper-260114_160901/
  commands.log
  01_trim.wav
  01_gain-meta.json
  01_gain-lores-tp0p5-plain.wav
  02_trim.wav
  02_gain-meta.json
  02_gain-lores-tp0p5-plain.wav
  concat_list.txt
  merged_gain-lores-tp0p5-plain.wav
  260114_160901-merged-youtube.mp4
```

For a single file, use:

```text
workplace/ffmpeg-helper-260114_160901/
  commands.log
  01_trim.wav
  01_gain-meta.json
  01_gain-lores-tp0p5-plain.wav
  260114_160901-youtube.mp4
```

Do not overwrite source recordings. Generated commands should write to
the per-job `workplace/` directory or clearly named output files. Do not use a
generic final upload filename such as `youtube_upload.mp4`; include the
original H4essential recording id, such as `260503_113659`, in the MP4 filename.

## First-Cut Audio Policy

For this workflow:

- Use simple peak-based gain adjustment.
- Run FFmpeg twice for audio adjustment: measurement phase, then finishing
  phase.
- Measurement phase: use `loudnorm=print_format=json` to obtain `input_tp`.
- Finishing phase: use `volume=...dB` only.
- Target peak: `-0.5 dBTP`.
- Do not use compression.
- Do not use loudness normalization for finishing.
- Let the user choose hi-res or lo-res output. If the user does not specify,
  use hi-res:
  - hi-res: 192 kHz / 24-bit WAV.
  - lo-res: 44.1 kHz / 16-bit WAV.
- Tell the user that hi-res intermediate WAV files will be larger.
- For multiple WAV files, normalize each trimmed file before concatenation.

This is a practical workflow choice to preserve the natural sound of the
orchestra recording. Future workflows may use different policies.
