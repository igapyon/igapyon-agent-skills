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

## First-Cut Defaults

- Container: MP4.
- Video codec: H.264 via `libx264`.
- Pixel format: `yuv420p`.
- Tune: `stillimage`.
- Resolution: 1920x1080 unless the user requests otherwise.
- Image fit: preserve the entire image and pad to 16:9.
- Audio codec: AAC.
- Audio sample rate: 48 kHz.
- Audio bitrate: 320 kbps.
- MP4 fast start: include `-movflags +faststart`.

## Command

For multiple-file workflows, use the merged gain-adjusted WAV:

```sh
ffmpeg -loop 1 -framerate 2 -i "cover.png" -i "workplace/h4essential-260114_160901/merged_gain-lores-tp0p5-plain.wav" \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
  -c:v libx264 -tune stillimage -pix_fmt yuv420p \
  -c:a aac -b:a 320k -ar 48000 \
  -movflags +faststart \
  -shortest "workplace/h4essential-260114_160901/youtube_upload.mp4"
```

For a single-file workflow, use
`workplace/h4essential-260114_160901/01_gain-lores-tp0p5-plain.wav` instead of
`workplace/h4essential-260114_160901/merged_gain-lores-tp0p5-plain.wav`. For
hi-res workflows, use the corresponding `*-hires-tp0p5-plain.wav` file.

Log the video creation command to the job directory's `commands.log`.
