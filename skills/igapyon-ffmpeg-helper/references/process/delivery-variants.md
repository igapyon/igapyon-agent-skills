# Delivery Variants

Use this process after trimming and gain adjustment when the user wants more
than one delivery purpose. Preserve the adjusted WAV master before making any
lossy delivery file.

## Output Roles

Choose only the variants the user needs:

- Master: the adjusted WAV retained for archive, later editing, and future
  encodes. For H4essential PCM 32-bit float input, preserve that format and the
  source sample rate by default.
- YouTube: the MP4/H.264/AAC route in
  [still-image-youtube-video.md](still-image-youtube-video.md).
- Share: an audio-only M4A with AAC-LC for Android, iPhone, and lightweight
  download or Drive sharing.
- Requested PCM copy: a separate WAV with an explicitly requested sample rate
  and bit depth, including the legacy hi-res or lo-res choices below.

Do not call the M4A a master and do not delete or overwrite the WAV master.

## Source-Preserving Master

The default master is created by
[peak-gain-normalize.md](peak-gain-normalize.md). For a measured 96 kHz PCM
32-bit float source, its command is:

```sh
ffmpeg -i "input.WAV" -af "volume=+6.8dB" -ar 96000 -sample_fmt flt -c:a pcm_f32le "workplace/ffmpeg-helper-260114_160901/260114_160901_gain-f32-tp0p5-plain.wav"
```

Use the actual input sample rate in place of `96000`. Reuse an existing adjusted
master; do not apply the gain again when making delivery copies. Feed the
native-rate master directly into each delivery encode, rather than making one
delivery copy from another.

## Requested PCM Copies

Create these only when requested, retaining the native-rate float master.
The legacy names describe the requested file formats, not an improvement to
the source recording's resolution. A 192 kHz copy can be substantially larger.

Hi-res copy (192 kHz / 24-bit):

```sh
ffmpeg -i "workplace/ffmpeg-helper-260114_160901/260114_160901_gain-f32-tp0p5-plain.wav" -ar 192000 -sample_fmt s32 -c:a pcm_s24le "workplace/ffmpeg-helper-260114_160901/260114_160901_delivery-hires.wav"
```

Lo-res copy (44.1 kHz / 16-bit):

```sh
ffmpeg -i "workplace/ffmpeg-helper-260114_160901/260114_160901_gain-f32-tp0p5-plain.wav" -ar 44100 -sample_fmt s16 -c:a pcm_s16le "workplace/ffmpeg-helper-260114_160901/260114_160901_delivery-lores.wav"
```

Use the retained master for YouTube and M4A creation even when one of these
copies is also requested.

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

Report the requested bitrate and the file's reported bitrate separately. Also
measure the decoded AAC audio's true peak, because the encoded file can differ
from the master:

```sh
ffmpeg -hide_banner -nostats -i "workplace/ffmpeg-helper-260114_160901/260114_160901_share-aac384.m4a" -map 0:a:0 -af "ebur128=peak=true:framelog=verbose" -f null - > "workplace/ffmpeg-helper-260114_160901/share-audio-verify.log" 2>&1
```

Read the summary's `True peak` section. Report unexpected peaks before
proposing a revised gain; do not silently add compression or a limiter.

## Response

Report the master and each requested delivery variant separately. State that the
M4A is lossy while the WAV master remains available.
