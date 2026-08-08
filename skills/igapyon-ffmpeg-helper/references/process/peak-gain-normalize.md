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
- Let the user choose hi-res or lo-res output for the finishing command; default
  to hi-res when the user does not specify.
- Tell the user that hi-res intermediate WAV files will be larger.

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

### Source-Preserving 32-bit Float Master

When the input is PCM 32-bit float and the user explicitly asks to retain that
format, make a separately named master at the source sample rate with
`-sample_fmt flt -c:a pcm_f32le`. For example, a 96 kHz source remains 96 kHz:

```text
-ar 96000 -sample_fmt flt -c:a pcm_f32le
```

Do not substitute the 192 kHz / 24-bit hi-res setting for an explicit
32-bit-float-preservation request. See
[delivery-variants.md](delivery-variants.md) when the user also needs smaller
or mobile-friendly copies.

If the user does not choose, use hi-res and mention that the intermediate WAV
file will be larger. For the default YouTube MP4 video creation step, the
prepared WAV audio is converted to AAC. If the user explicitly asks for the
source-preserving MKV route, the prepared WAV audio can be copied with
`-c:a copy`.

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

Lo-res output:

```sh
ffmpeg -i "workplace/ffmpeg-helper-260114_160901/01_trim.wav" -af "volume=+6.8dB" -ar 44100 -sample_fmt s16 -c:a pcm_s16le "workplace/ffmpeg-helper-260114_160901/01_gain-lores-tp0p5-plain.wav"
```

Hi-res output:

```sh
ffmpeg -i "workplace/ffmpeg-helper-260114_160901/01_trim.wav" -af "volume=+6.8dB" -ar 192000 -sample_fmt s32 -c:a pcm_s24le "workplace/ffmpeg-helper-260114_160901/01_gain-hires-tp0p5-plain.wav"
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
ffmpeg -hide_banner -i "workplace/ffmpeg-helper-260114_160901/01_gain-lores-tp0p5-plain.wav" -af loudnorm=print_format=json -f null - > "workplace/ffmpeg-helper-260114_160901/01_gain-verify-meta.json" 2>&1
```

Check that the verification output contains a numeric `input_tp` close to the
target. If the value is materially different from `-0.5 dBTP`, report it and
ask before applying another gain pass.
