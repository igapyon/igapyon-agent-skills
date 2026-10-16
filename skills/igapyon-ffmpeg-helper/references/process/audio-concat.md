# Audio Concatenation

Use this process when multiple gain-adjusted WAV files should become one audio
file.

## Policy

For the first-cut H4essential workflow, concatenate only after each selected WAV
or selected part has already been trimmed and gain-adjusted.

Inspect the adjusted masters before concatenation. Stream copy requires the
same PCM codec, sample rate, channel count, and channel layout. For matching
H4essential float sources, keep the native-rate `pcm_f32le` masters.

## File List

Create `concat_list.txt` in the job directory:

```text
file '01_gain-f32-tp0p5-plain.wav'
file '02_gain-f32-tp0p5-plain.wav'
file '03_gain-f32-tp0p5-plain.wav'
```

For multiple parts cut from one source WAV, prefer names that preserve the
recording id and part number:

```text
file '260503_113659-part1_gain-f32-tp0p5-plain.wav'
file '260503_113659-part2_gain-f32-tp0p5-plain.wav'
```

## Command

After confirming that the files have matching formats, concatenate with stream
copy, preserving their sample rate and PCM representation:

```sh
ffmpeg -f concat -safe 0 -i "workplace/ffmpeg-helper-260114_160901/concat_list.txt" -c:a copy "workplace/ffmpeg-helper-260114_160901/merged_gain-f32-tp0p5-plain.wav"
```

## When Formats Differ

Choose a common rate and channel layout from the actual inputs and intended
output, and explain the choice. Retain each native-rate master. Create separately
named common-format working WAVs with an explicit PCM codec before putting them
in the concat list; for float sources use `pcm_f32le`. Convert only the inputs
that need it, then verify that the working files match and concatenate by copy.

Do not feed mismatched WAVs to the concat demuxer and assume an output `-ar`
will fix them. Do not fall back automatically to 44.1 kHz / 16-bit or
192 kHz / 24-bit. If copy fails for matching files, inspect the error before
choosing another command.

## Notes

- Keep the adjusted per-source WAV files.
- Use the merged file as input for YouTube video creation.
- Verify the merged file's format and that its duration matches the sum of the
  selected parts before creating a delivery encode.
- Log the concat command to the job directory's `commands.log`.
