# Peak-Based Simple Gain Adjustment

Use this process for the first-cut audio normalization policy. It is modeled on
the simple-gain route of the local-html-tools FFmpeg Loudnorm command generator,
but only the volume-only route is used for finishing.

## Policy

- Run FFmpeg twice: measurement phase, then finishing phase.
- Measurement phase: use `loudnorm=print_format=json` to obtain `input_tp`.
- Finishing phase: use `volume=...dB` only.
- Target true peak: `-0.5 dBTP`.
- Do not use compression.
- Do not use limiting.
- Do not use loudness normalization in the finishing command.
- If `input_tp` is already above `-0.5 dBTP`, apply negative gain.
- Let the user choose hi-res or lo-res output for the finishing command.

## Output Resolution Choice

Use these output settings:

```text
hi-res:
  -ar 192000
  -sample_fmt s32
  -c:a pcm_s24le

lo-res:
  -ar 44100
  -sample_fmt s16
  -c:a pcm_s16le
```

If the user does not choose, ask once. For YouTube upload video creation, the
later video step still converts audio to AAC 48 kHz.

## Phase 1: Measurement

Generate a measurement command that writes the loudnorm JSON output to a file.
Prefer redirection over `tee` so command failure is easier to detect.

```sh
ffmpeg -hide_banner -i "workplace/h4essential-260114_160901/01_trim.wav" -af loudnorm=print_format=json -f null - > "workplace/h4essential-260114_160901/01_gain-meta.json" 2>&1
```

Ask the user to paste the JSON measurement output when you cannot run the
command yourself. The required value is `input_tp`.

Before generating a finishing command, verify that the measurement output
contains a parseable JSON object and a numeric `input_tp`. If `input_tp` is
missing or not numeric, stop and inspect the measurement output instead of
guessing a gain value.

## Calculate Gain

Compute gain as:

```text
gain_db = -0.5 - input_tp
```

Round to one decimal place for the generated command, matching the existing
local-html-tools behavior.

Examples:

- `input_tp: -7.3` -> `gain_db = +6.8`
- `input_tp: -1.2` -> `gain_db = +0.7`
- `input_tp: 0.0` -> `gain_db = -0.5`

## Phase 2: Finishing

Generate a `volume=XdB` command. Do not add compression, limiting, or loudnorm
normalization.

Lo-res output:

```sh
ffmpeg -i "workplace/h4essential-260114_160901/01_trim.wav" -af "volume=+6.8dB" -ar 44100 -sample_fmt s16 -c:a pcm_s16le "workplace/h4essential-260114_160901/01_gain-lores-tp0p5-plain.wav"
```

Hi-res output:

```sh
ffmpeg -i "workplace/h4essential-260114_160901/01_trim.wav" -af "volume=+6.8dB" -ar 192000 -sample_fmt s32 -c:a pcm_s24le "workplace/h4essential-260114_160901/01_gain-hires-tp0p5-plain.wav"
```

For multiple WAVs, repeat both phases separately for each trimmed WAV before
concatenation.

Log both the measurement command and the finishing command to the job
directory's `commands.log`.

## Phase 3: Verification Measurement

After finishing, run a verification measurement on the gain-adjusted output.
This is not another processing pass; it only confirms the resulting peak.

Lo-res example:

```sh
ffmpeg -hide_banner -i "workplace/h4essential-260114_160901/01_gain-lores-tp0p5-plain.wav" -af loudnorm=print_format=json -f null - > "workplace/h4essential-260114_160901/01_gain-verify-meta.json" 2>&1
```

Check that the verification output contains a numeric `input_tp` close to the
target. If the value is materially different from `-0.5 dBTP`, report it and
ask before applying another gain pass.
