# Workspace and Command Log

Use this process before generating conversion commands.

## Workspace Directory

Create a per-job directory under `workplace/`. Prefer a name with the
`ffmpeg-helper-` prefix followed by the recording timestamp or job timestamp:

```text
workplace/ffmpeg-helper-260114_160901/
workplace/ffmpeg-helper-260114_160901-youtube/
workplace/orchestra-20260114-youtube/
```

If multiple recording folders are involved, use the first recording timestamp,
the job timestamp, or a short project name:

```text
workplace/ffmpeg-helper-260114_160901-merged/
```

Do not write generated audio/video files next to source recordings unless the
user explicitly asks.

## Initialize Log

Create `commands.log` in the job directory. It records the exact commands that
were executed or handed to the user. Because this is a working directory, it is
also acceptable and preferred to keep auxiliary logs and diagnostic output files
there.

```sh
mkdir -p "workplace/ffmpeg-helper-260114_160901"
printf '# igapyon-ffmpeg-helper command log\n# Created: %s\n\n' "$(date '+%Y-%m-%d %H:%M:%S %z')" > "workplace/ffmpeg-helper-260114_160901/commands.log"
```

## Mandatory FFmpeg Version Check

Run `ffmpeg -version` before any conversion command and record the exact command
in `commands.log`. Also save the version output for later troubleshooting.

```sh
printf '%s\n' 'ffmpeg -version > "workplace/ffmpeg-helper-260114_160901/ffmpeg-version.txt"' >> "workplace/ffmpeg-helper-260114_160901/commands.log"
ffmpeg -version > "workplace/ffmpeg-helper-260114_160901/ffmpeg-version.txt"
```

If this fails, stop the workflow before generating or running conversion
commands.

## Log a Command

Before running or presenting a command, append it to `commands.log`.

```sh
printf '%s\n' 'ffmpeg -i "input.WAV" -ss 00:01:23 -to 00:12:34 -c:a pcm_f32le "workplace/ffmpeg-helper-260114_160901/01_trim.wav"' >> "workplace/ffmpeg-helper-260114_160901/commands.log"
```

When commands are multi-line for readability, log the exact one-line form that
can be copied and executed.

## Capture Command Output When Useful

For measurement commands, keep both the command log and the measurement output.

Example:

```sh
printf '%s\n' 'ffmpeg -hide_banner -i "workplace/ffmpeg-helper-260114_160901/01_trim.wav" -af loudnorm=print_format=json -f null - > "workplace/ffmpeg-helper-260114_160901/01_gain-meta.json" 2>&1' >> "workplace/ffmpeg-helper-260114_160901/commands.log"
ffmpeg -hide_banner -i "workplace/ffmpeg-helper-260114_160901/01_trim.wav" -af loudnorm=print_format=json -f null - > "workplace/ffmpeg-helper-260114_160901/01_gain-meta.json" 2>&1
```

Do not treat `commands.log` as a full terminal transcript. It is a concise
record of commands. Store measurement JSON, FFmpeg stderr/stdout captures,
version output, verification output, and other troubleshooting data as separate
files in the same job directory.

Suggested auxiliary files:

```text
ffmpeg-version.txt
01_gain-meta.json
01_gain-verify-meta.json
01_trim.log
01_gain.log
youtube-video.log
```
