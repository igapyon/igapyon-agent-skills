# Delivery Variants

Use this process after trimming and gain adjustment when the user wants more
than one delivery purpose. Preserve the adjusted WAV master before making any
lossy delivery file.

## Output Roles

Choose only the variants the user needs:

- Master: the adjusted WAV retained for archive, later editing, and future
  encodes. Preserve PCM 32-bit float at the source sample rate when the input
  is 32-bit float and the user asks to keep it that way.
- YouTube: the MP4/H.264/AAC route in
  [still-image-youtube-video.md](still-image-youtube-video.md).
- Share: an audio-only M4A with AAC-LC for Android, iPhone, and lightweight
  download or Drive sharing.

Do not call the M4A a master and do not delete or overwrite the WAV master.

## Source-Preserving Master

When the selected source is 96 kHz PCM 32-bit float and the user requests
32-bit float preservation, keep that format in the adjusted or trimmed master:

```sh
ffmpeg -i "input.WAV" -af "volume=+6.8dB" -ar 96000 -sample_fmt flt -c:a pcm_f32le "workplace/ffmpeg-helper-260114_160901/260114_160901_gain-f32-tp0p5-plain.wav"
```

Use the actual input sample rate in place of `96000`. This source-preserving
master is distinct from the workflow's hi-res and lo-res delivery choices.

## AAC/M4A Share Copy

Use an M4A share copy only when the user asks for a smaller file, mobile
playback, or sharing. Use AAC-LC, 48 kHz, stereo, and a nominal 384 kbps target
unless the user chooses a lower bitrate:

```sh
ffmpeg -i "workplace/ffmpeg-helper-260114_160901/260114_160901_gain-f32-tp0p5-plain.wav" -map 0:a:0 -c:a aac -profile:a aac_low -b:a 384k -ar 48000 -ac 2 -movflags +faststart "workplace/ffmpeg-helper-260114_160901/260114_160901_share-aac384.m4a"
```

AAC output can have an actual average bitrate below its nominal target. Measure
the finished file rather than promising a size from the target bitrate. When a
user needs to stay below a size limit, verify the result and offer a lower-rate
share copy only if it misses the limit.

Use a clearly role-specific name such as:

```text
<recording-id>_share-aac384.m4a
```

## Verify

Keep the verification result in the job directory:

```sh
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,profile,sample_rate,channels,bit_rate -of json "workplace/ffmpeg-helper-260114_160901/260114_160901_share-aac384.m4a" > "workplace/ffmpeg-helper-260114_160901/share-m4a-info.json"
```

Confirm:

- duration matches the selected master;
- codec is AAC with LC profile;
- audio is 48 kHz stereo; and
- the actual file size meets any user-specified sharing limit.

## Response

Report the master and each requested delivery variant separately. State that the
M4A is lossy while the WAV master remains available.
