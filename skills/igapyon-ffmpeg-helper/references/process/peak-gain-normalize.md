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
- For H4essential PCM 32-bit float input, preserve the source sample rate and
  PCM 32-bit float in the adjusted master by default.
- Make delivery copies directly from that master; see
  [delivery-variants.md](delivery-variants.md) for requested PCM or AAC copies.

## Master Format

Read the selected or trimmed WAV's format before choosing output options:

```sh
ffprobe -v error -show_entries stream=codec_name,sample_fmt,sample_rate,channels -of json "workplace/ffmpeg-helper-260114_160901/01_trim.wav"
```

For PCM 32-bit float input, use `-sample_fmt flt -c:a pcm_f32le` and the measured
source sample rate. For example, a 96 kHz source remains 96 kHz:

```text
-ar 96000 -sample_fmt flt -c:a pcm_f32le
```

Use the actual rate instead of assuming every source is 96 kHz. Keeping this
rate and float format avoids an unnecessary resampling or integer-PCM
quantization step before delivery. The intended gain adjustment still changes
sample values; format preservation does not mean an unmodified recording.

For another source PCM format, inspect its precision and choose an explicit
PCM codec that preserves it. Do not rely on FFmpeg's default WAV encoder.

The YouTube step converts the master directly to 48 kHz AAC. A requested
192 kHz / 24-bit or 44.1 kHz / 16-bit copy is a separate delivery variant,
not the standard input for another encode. An explicitly requested MKV route
can copy the prepared master audio with `-c:a copy`.

## Phase 1: Measurement

Generate a measurement command that writes the loudnorm JSON output to a file.
Prefer redirection over `tee` so command failure is easier to detect.

```sh
ffmpeg -hide_banner -i "workplace/ffmpeg-helper-260114_160901/01_trim.wav" -af loudnorm=print_format=json -f null - > "workplace/ffmpeg-helper-260114_160901/01_gain-meta.json" 2>&1
```

Ask the user to paste the JSON measurement output when you cannot run the
command yourself. The required value is `input_tp`.

Before generating a finishing command, verify that the measurement output
contains a parseable JSON object and a numeric `input_tp`. If `input_tp` is
missing or not numeric, stop and inspect the measurement output instead of
guessing a gain value.

Use the `input_*` fields to describe the source. The `output_*` fields and
`normalization_type` describe loudnorm's output sent to `null`; that processed
audio is discarded. A `dynamic` value here does not mean the saved WAV master
has undergone dynamic normalization.

## User-Facing Note for Low Peaks

When the user asks why an H4essential recording's measured peak is low, explain
briefly in Japanese:

```text
H4essential の 32-bit float 録音では、ピークが低めに見えることは十分あります。32-bit float は後から大きく持ち上げる前提にしやすく、クリップ回避のためのヘッドルームを広く取れるので、小さくても不自然な値ではありません。
```

Use this as supportive context only. It does not change the peak-based gain
calculation or the `-0.5 dBTP` target.

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

Default master for a measured 96 kHz PCM 32-bit float source:

```sh
ffmpeg -i "workplace/ffmpeg-helper-260114_160901/01_trim.wav" -af "volume=+6.8dB" -ar 96000 -sample_fmt flt -c:a pcm_f32le "workplace/ffmpeg-helper-260114_160901/01_gain-f32-tp0p5-plain.wav"
```

Replace `96000` with the measured source rate. Apply the gain once; later
delivery commands read this adjusted master without adding the gain again.

For multiple WAVs, repeat both phases separately for each trimmed WAV before
concatenation.

Log both the measurement command and the finishing command to the job
directory's `commands.log`.

## Phase 3: Verification Measurement

After finishing, run a verification measurement on the gain-adjusted output.
This is not another processing pass; it only confirms the resulting peak.

Measure the adjusted master:

```sh
ffmpeg -hide_banner -i "workplace/ffmpeg-helper-260114_160901/01_gain-f32-tp0p5-plain.wav" -af loudnorm=print_format=json -f null - > "workplace/ffmpeg-helper-260114_160901/01_gain-verify-meta.json" 2>&1
```

Also use `ffprobe` to confirm the saved master retains the source sample rate,
channel count, and `pcm_f32le` codec for float sources.

Check that the verification output contains a numeric `input_tp` close to the
target. If the value is materially different from `-0.5 dBTP`, report it and
ask before applying another gain pass.
