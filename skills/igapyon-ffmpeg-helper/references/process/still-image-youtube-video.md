# Still Image + Audio YouTube Video

Use this process to create a YouTube-uploadable video from one still image and
one audio file.

## Inputs

Ask for these if missing:

- still image path
- normalized audio path
- output video path

The still image may be a jacket, cover, title card, or other manually prepared
image.

## Output File Naming

Do not use a generic final name such as `youtube_upload.mp4` unless the user
explicitly asks for it. Name the upload file so the original H4essential
recording identifier is visible from the filename.

Prefer one of these patterns:

```text
<recording-id>-youtube.mp4
<recording-id>-<short-piece-or-project>-youtube.mp4
<first-recording-id>-merged-youtube.mp4
```

Examples:

```text
workplace/ffmpeg-helper-260503_113659/260503_113659-youtube.mp4
workplace/ffmpeg-helper-260503_113659/260503_113659-dvorak-youtube.mp4
workplace/ffmpeg-helper-260503_113659/260503_113659-merged-youtube.mp4
```

Derive the recording id from the source recording folder or source WAV stem,
for example `260503_113659` from `260503_113659_TrMic.WAV`. If the user provides
a title or piece name, append a short lowercase ASCII slug after the recording
id. If multiple recording ids are involved, use the first recording id plus
`merged`, unless the user gives a better short project name.

## When No Still Image Exists

If the user has no still image, support one of these routes:

- Use an existing photo, poster, flyer, score image, or venue image provided by
  the user.
- Create a simple title-card image for the job.
- Generate a new bitmap image when the user explicitly wants generated artwork.

For a simple title card, ask only for the missing fields needed to make a usable
1920x1080 image:

- title
- subtitle, optional
- date or venue, optional
- preferred mood or colors, optional

Save created or generated still images inside the current job directory, for
example:

```text
workplace/ffmpeg-helper-260114_160901/cover.png
```

Tell the user that YouTube thumbnails and the in-video still image can be
separate files if they want a different upload thumbnail later.

## YouTube Image Size Guidance

When helping with a still image or title card, give practical size guidance:

- In-video still image: use 16:9 at 1920x1080 by default, matching the video
  command in this runbook.
- YouTube custom thumbnail: 3840x2160 is the current official recommended
  target, with 16:9 aspect ratio. 1280x720 is an acceptable practical fallback
  when a lighter image is preferred.
- Keep important text and faces away from the edges so YouTube UI overlays and
  cropping do not hide them.
- It is acceptable to create one 1920x1080 title card for the video and export
  a separate 3840x2160 or 1280x720 thumbnail later if needed.

Do not over-explain this unless the user asks. A short note is enough:

```text
静止画は動画内では 1920x1080 の 16:9 を基本にします。YouTube のサムネイル用は公式推奨なら 3840x2160、軽めに作るなら 1280x720 の 16:9 が目安です。端の文字は切れたり UI に重なったりしやすいので、少し内側に置くのが無難です。
```

## Format Choice

The original local-html-tools YouTube generator used an MKV route for its
YouTube preset and an MP4 route for its general video preset. For this skill,
prefer the MP4 route by default because YouTube's current recommended upload
encoding settings name MP4 as the recommended container.

Use these routes:

- Default YouTube upload route: MP4 (`.mp4`) with H.264 video and AAC audio.
- Source-preserving route: MKV (`.mkv`) with H.264 video and copied WAV audio,
  only when the user explicitly wants to avoid audio re-encoding or asks for
  the local-html-tools MKV-style route.

Tell the user the tradeoff briefly when choosing:

```text
YouTube 公式推奨に寄せるなら MP4/H.264/AAC が無難です。MKV は WAV 音声を再エンコードせずに入れやすい利点がありますが、アップロード互換性の安全側では MP4 を既定にします。
```

## First-Cut Defaults

- Container: MP4.
- Video codec: H.264 via `libx264`.
- Video profile: High.
- Preset: `medium`.
- Quality: `-crf 18`.
- Frame rate: 30 fps for still-image videos by default. A lower frame rate can
  work for a static-image video, but 30 fps is the compatibility-oriented
  default for YouTube upload.
- GOP: closed GOP; use a GOP length of half the frame rate. With the default
  30 fps command, use `-g 15`.
- B-frames: 2.
- Pixel format: `yuv420p`.
- SDR color space: BT.709.
- Tune: `stillimage`.
- Resolution: 1920x1080 unless the user requests otherwise.
- Image fit: preserve the entire image and pad to 16:9.
- Audio codec: AAC-LC.
- Audio sample rate: 48 kHz.
- Audio bitrate: 384 kbps for stereo.
- MP4 fast start: include `-movflags +faststart`.
- Duration: when the audio duration is known, add `-t AUDIO_DURATION` to make
  the MP4 container duration match the audio reliably. Keep `-shortest` as an
  additional guard.

## Command

For default YouTube upload workflows, use MP4. First measure the prepared audio
duration:

```sh
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "workplace/ffmpeg-helper-260114_160901/merged_gain-lores-tp0p5-plain.wav"
```

Then pass that duration with `-t`. For example, if the measured duration is
`635.000000`:

```sh
ffmpeg -loop 1 -framerate 30 -i "cover.png" -i "workplace/ffmpeg-helper-260114_160901/merged_gain-lores-tp0p5-plain.wav" \
  -t 635.000000 \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p" \
  -c:v libx264 -profile:v high -preset medium -tune stillimage -crf 18 -g 15 -bf 2 \
  -x264-params colorprim=bt709:transfer=bt709:colormatrix=bt709:open-gop=0 \
  -c:a aac -profile:a aac_low -b:a 384k -ar 48000 \
  -movflags +faststart \
  -shortest "workplace/ffmpeg-helper-260114_160901/260114_160901-merged-youtube.mp4"
```

For a single-file workflow, use
`workplace/ffmpeg-helper-260114_160901/01_gain-lores-tp0p5-plain.wav` instead of
`workplace/ffmpeg-helper-260114_160901/merged_gain-lores-tp0p5-plain.wav`. For
hi-res workflows, use the corresponding `*-hires-tp0p5-plain.wav` file.

If the user explicitly prefers a lighter static-image video, a lower frame rate
such as 2 fps is acceptable. In that case, adjust the GOP length to half the
chosen frame rate where practical, and explain that 30 fps remains the safer
YouTube compatibility default.

For a looping still-image input, do not rely on `-shortest` alone when exact
duration matters. `-loop 1` creates an effectively endless video input, and
encoder lookahead, B-frames, frame timestamps, and low frame rates can leave the
video stream or container duration slightly longer than the audio. Using `-t`
with the measured audio duration prevents the common "audio is 10:35 but MP4
shows 11:04.50" style mismatch.

For the source-preserving MKV route, use `-c:a copy` and output `.mkv`.

Log the video creation command to the job directory's `commands.log`.
