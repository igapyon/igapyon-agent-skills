# H4essential Input Discovery

Use this process when the user provides a copied H4essential recording folder,
multiple recording folders, or a parent directory containing copied recording
folders.

## Expected Structure

The H4essential source structure commonly looks like this:

```text
/Volumes/ZOOM_H4E/260114_160901/
  260114_160901_TrMic.WAV
```

In real use, processing starts after one or more recording folders such as
`260114_160901` have been copied locally.

## Discovery Steps

1. Inspect the directory before generating final commands.
2. Recursively find `.WAV` and `.wav` files.
3. Group candidates by recording folder when possible.
4. Prefer H4essential track-name awareness over treating every WAV as equal.
5. Show the detected candidates and ask the user to confirm the track choice and
   order before proceeding when multiple plausible files exist.
6. Inspect the selected files' PCM codec, sample rate, sample format, and channel
   layout with `ffprobe`. Save the result once the job directory is initialized.
   Carry the actual source rate through trimming and the adjusted master;
   retain PCM 32-bit float for H4essential float sources.

Useful discovery command:

```sh
find "<input-dir>" -type f \( -iname '*.WAV' -o -iname '*.wav' \)
```

After selecting a file and initializing its job directory with
[workspace-and-command-log.md](workspace-and-command-log.md), record its format
before trimming, for example:

```sh
ffprobe -v error -show_entries format=duration:stream=codec_name,sample_fmt,sample_rate,channels,channel_layout,bits_per_sample,bits_per_raw_sample -of json "260114_160901/260114_160901_TrMic.WAV" > "workplace/ffmpeg-helper-260114_160901/01_source-info.json"
```

## Track Names

Use these H4essential track-name meanings:

- `TrMic`: built-in XY microphone.
- `Tr1`: input track 1.
- `Tr2`: input track 2.
- `TrLR`: stereo mix of tracks.

Default candidate ordering:

1. `*_TrMic.WAV` / `*_TrMic.wav` for built-in mic workflows.
2. `*_TrLR.WAV` / `*_TrLR.wav` when the user used external inputs or wants the
   stereo mix.
3. `*_Tr1.WAV`, `*_Tr2.WAV`, and other tracks when explicitly relevant.
4. Other `.WAV` / `.wav` files only as fallback candidates.

When candidates include both `TrMic` and `TrLR`, do not silently choose between
them unless the user has already stated the recording source. For external mic
or line-input work, expect that `TrMic` may not be the desired file.

## Candidate Presentation

Present candidates grouped by recording folder:

```text
260114_160901
  - 260114_160901_TrMic.WAV  built-in XY microphone
  - 260114_160901_TrLR.WAV   stereo mix
  - 260114_160901_Tr1.WAV    input track 1
  - 260114_160901_Tr2.WAV    input track 2
```

Ask the user to confirm:

- which track to use for each folder
- whether the file order is correct
- whether any detected file should be skipped
