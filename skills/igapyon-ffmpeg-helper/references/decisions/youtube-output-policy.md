# YouTube Output Policy Decision

This note records the reasoning behind the current YouTube output defaults for
`igapyon-ffmpeg-helper`.

## Context

This skill started from the FFmpeg tools under:

```text
/Users/igapyon/Documents/git/local-html-tools/docs/ffmpeg
```

The source tool `ffmpeg-youtube-mkv-gen` used two routes:

- YouTube preset: `.mkv`
- General video preset: `.mp4`

That local tool is still useful context, especially because the MKV route can
preserve prepared WAV audio with `-c:a copy`.

However, this skill is a runbook for producing a file that is likely to upload
cleanly through YouTube Studio. For that purpose, YouTube's current official
recommendations carry more weight than the historical local default.

## Decision

Use MP4/H.264/AAC-LC as the default YouTube upload route.

Keep MKV as an explicit source-preserving option only when the user asks to
avoid audio re-encoding or specifically wants the local-html-tools-style MKV
route.

## Rationale

YouTube's recommended upload settings currently name:

- Container: MP4
- Video codec: H.264
- Progressive scan
- High Profile
- 2 B-frames
- Closed GOP, with GOP length half the frame rate
- Chroma subsampling: 4:2:0
- Audio codec: AAC-LC, Opus, or Eclipsa Audio
- Audio sample rate: 48 kHz
- Stereo audio bitrate: 384 kbps
- SDR color space: BT.709

YouTube's supported file format list includes MP4 but does not list MKV. This
does not prove that every MKV upload will fail, but it makes MP4 the safer
default for routine manual uploads.

## Current Default Command Shape

The default still-image video command therefore uses:

```text
MP4 container
H.264 / libx264
High Profile
30 fps
closed GOP with -g 15
2 B-frames
yuv420p
BT.709 tags via x264 parameters
AAC-LC audio
48 kHz audio sample rate
384 kbps stereo audio bitrate
faststart moov atom
```

## Frame Rate Philosophy

The default frame rate is 30 fps even for a static-image video.

A lower frame rate such as 2 fps can work technically because the picture does
not move. It may also reduce video data. However, the purpose of this skill is
not to minimize every byte; it is to generate a predictable YouTube upload file
with conservative compatibility.

For that reason, 30 fps is the default:

- It matches YouTube's common upload frame-rate examples.
- It keeps the still-image video close to ordinary YouTube video expectations.
- It makes the GOP rule simple: with 30 fps, half-frame-rate GOP is `-g 15`.
- It avoids making a special low-fps file unless the user explicitly wants that
  tradeoff.

If a lower frame rate is used, adjust GOP length to half the chosen frame rate
where practical, and explain that 30 fps remains the safer YouTube compatibility
default.

## Duration Philosophy

Static-image videos use `-loop 1`, which makes the image input effectively
endless. `-shortest` is useful, but it should not be the only duration control
when an exact YouTube upload duration matters.

The observed failure mode is:

```text
audio duration: 10:35
MP4/container duration: 11:04.50
```

This can happen because the video stream is synthesized from an endless still
image input, and FFmpeg/libx264 has frame timestamps, encoder lookahead, B-frame
reordering, and frame-rate rounding to resolve at the end of the file. Low frame
rates such as 2 fps make each video timestamp coarser, which can make this kind
of mismatch more visible.

The robust rule is:

- Measure the prepared audio duration with `ffprobe`.
- Add `-t AUDIO_DURATION` to the still-image video command.
- Keep `-shortest` as an extra guard.
- Verify the final MP4 duration with `ffprobe`.

With the current 30 fps default, this problem is less likely than with 2 fps,
but explicit `-t` is still the cleaner rule when the audio duration is known.

## Audio Philosophy

The audio workflow preserves natural orchestra recording dynamics by using
simple peak-based gain:

- measure with `loudnorm=print_format=json`
- compute gain from `input_tp`
- finish with `volume=...dB`
- target true peak: `-0.5 dBTP`
- no compression
- no loudness normalization in the finishing pass

Preserve the measured source sample rate and PCM 32-bit float in H4essential
trimmed files and adjusted WAV masters by default. For a 96 kHz float source,
the standard route is:

```text
96 kHz / 32-bit float source
  -> trim and fixed gain at 96 kHz / 32-bit float
  -> retain adjusted master
  -> encode directly to 48 kHz AAC-LC for MP4
```

Use the actual source rate; `96 kHz` is an example. Saving the adjusted float
master retains a reusable archive without adding an intermediate sample-rate
or integer-bit-depth conversion. Apply gain only when creating that master.

The former default created a 192 kHz / 24-bit intermediate. Upsampling does
not add source information, and its later conversion to 48 kHz introduces
unnecessary processing. The current route avoids that conversion and the
intermediate float-to-integer quantization. This is a workflow simplification,
not a guarantee of an audible improvement or a claim that 192 kHz is harmful.
Both routes encode to AAC once; the reduced steps are PCM transformations.

Create 192 kHz / 24-bit or 44.1 kHz / 16-bit copies only when requested as
separate delivery files. Generate MP4 and M4A directly from the retained master.
Matching masters can be concatenated by stream copy. Mixed formats require an
explicit common working format, as described in the concat runbook.

Verify both the master and decoded final AAC true peak. Report the nominal
bitrate request separately from the final file's reported bitrate.

## Image Philosophy

For the in-video still image, use 16:9 at 1920x1080 by default. This matches the
default 1080p video command.

For custom thumbnails, tell the user the current official recommendation is
3840x2160 at 16:9. A lighter 1280x720 16:9 thumbnail remains a practical
fallback when the user wants a smaller image.

Keep important text and faces away from the edges because YouTube UI overlays
and cropping can hide edge content.

## Operational Rule

When answering the user, be direct:

```text
YouTube 公式推奨に寄せるなら MP4/H.264/AAC が無難です。MKV は WAV 音声を再エンコードせずに入れやすい利点がありますが、アップロード互換性の安全側では MP4 を既定にします。
```

Do not turn this into a generic FFmpeg policy unless the user asks to expand the
skill.
