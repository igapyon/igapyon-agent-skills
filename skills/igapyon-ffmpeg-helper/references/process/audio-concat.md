# Audio Concatenation

Use this process when multiple gain-adjusted WAV files should become one audio
file.

## Policy

For the first-cut H4essential workflow, concatenate only after each selected WAV
or selected part has already been trimmed and gain-adjusted.

Use the same output resolution choice for all files before concatenation. Do not
mix hi-res and lo-res adjusted files in one concat list.

## File List

Create `concat_list.txt` in the job directory:

```text
file '01_gain-lores-tp0p5-plain.wav'
file '02_gain-lores-tp0p5-plain.wav'
file '03_gain-lores-tp0p5-plain.wav'
```

For multiple parts cut from one source WAV, prefer names that preserve the
recording id and part number:

```text
file '260503_113659-part1_gain-hires-tp0p5-plain.wav'
file '260503_113659-part2_gain-hires-tp0p5-plain.wav'
```

## Command

Try stream copy first when the files have matching formats:

```sh
ffmpeg -f concat -safe 0 -i "workplace/ffmpeg-helper-260114_160901/concat_list.txt" -c copy "workplace/ffmpeg-helper-260114_160901/merged_gain-lores-tp0p5-plain.wav"
```

If `-c copy` fails because formats differ, fall back to re-encoding:

```sh
ffmpeg -f concat -safe 0 -i "workplace/ffmpeg-helper-260114_160901/concat_list.txt" -ar 44100 -sample_fmt s16 -c:a pcm_s16le "workplace/ffmpeg-helper-260114_160901/merged_gain-lores-tp0p5-plain.wav"
```

## Notes

- Keep the adjusted per-source WAV files.
- Use the merged file as input for YouTube video creation.
- Log the concat command to the job directory's `commands.log`.
- For hi-res workflows, use the corresponding `*-hires-tp0p5-plain.wav` names
  and `-ar 192000 -sample_fmt s32 -c:a pcm_s24le` for the re-encode fallback.
