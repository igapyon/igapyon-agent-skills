# Audio Trim

Use this process to remove unnecessary beginning and ending portions from a
selected recording.

In the first cut, trim points and file boundaries are human judgment. Strongly
recommend checking the source recording in VLC before deciding start/end times
or where multiple files should join.

## Inputs

Ask for these if missing:

- input WAV path
- start time, optional
- end time, optional
- output WAV path

Use one trim command per selected WAV in multiple-file workflows.

If trim times are missing, ask the user to listen in VLC and provide the start
and/or end times when trimming is needed. Do not infer musical cut points
automatically from silence or waveform assumptions in the first cut.

Trimming supports four cases:

- both start and end are specified: cut leading and trailing margins
- start only: cut leading margin and keep through the source end
- end only: keep from the source beginning and cut trailing margin
- no start and no end: do not trim; either skip this process or copy/re-encode
  into the job directory only if a normalized workflow needs a staged file

## VLC Cut Memo Hand-off

When the user needs to inspect recordings manually, give them a compact memo
format to fill in and return. Prefer this format for a single file:

```text
cut memo:
- input: 260114_160901_TrMic.WAV
- start: 00:01:23
- end: 00:12:34
- output: 01_trim.wav
- note: first movement only
```

For multiple files, ask for one item per source file, in final playback order:

```text
cut memo:
1.
  input: 260114_160901_TrMic.WAV
  start: 00:01:23
  end: 00:12:34
  output: 01_trim.wav
  note: first section
2.
  input: 260114_162430_TrMic.WAV
  start: 00:00:08
  end: 00:09:56
  output: 02_trim.wav
  note: second section
```

Accept these time formats:

- `HH:MM:SS`
- `MM:SS`
- `HH:MM:SS.xxx` or `MM:SS.xxx` for fractional seconds
- seconds, such as `83.5`

Interpret `01:23` as 1 minute 23 seconds. For millisecond-level precision,
prefer `00:01:23.500` or `83.5`.

If the user wants the file to continue to the end, accept `end: end` or an empty
end value and generate a command without `-to`.

If the user wants the file to start from the beginning, accept `start: start`,
`start: 0`, or an empty start value and generate a command without `-ss`.

Treat the item as no-trim when the effective start is the source beginning and
the effective end is the source end. For example, `start` empty, `start: start`,
or `start: 0` combined with `end` empty or `end: end`. Ask whether to skip trim
or stage the file into the job directory if that is not clear.

If the cut memo contains ambiguous or missing fields, ask only for the missing
fields. Do not ask the user to restate confirmed entries.

## Agent Handling of Returned Memos

When the user returns a cut memo:

1. Parse the input, start, end, output, and note fields.
2. Preserve the listed order for multiple files.
3. Generate one trim or staging command per memo item.
4. Write outputs under the current job directory, even if the memo only gives a
   short output file name.
5. Log each generated trim command to `commands.log`.
6. Continue to the measurement phase after trim command generation.

## Command

For leading and trailing margin cuts, prefer:

```sh
ffmpeg -i "input.WAV" -ss 00:01:23 -to 00:12:34 -c:a pcm_f32le "workplace/h4essential-260114_160901/01_trim.wav"
```

For leading-margin-only cuts, omit `-to`:

```sh
ffmpeg -i "input.WAV" -ss 00:01:23 -c:a pcm_f32le "workplace/h4essential-260114_160901/01_trim.wav"
```

For trailing-margin-only cuts, omit `-ss`:

```sh
ffmpeg -i "input.WAV" -to 00:12:34 -c:a pcm_f32le "workplace/h4essential-260114_160901/01_trim.wav"
```

For no-trim staging, use a clear staged output name:

```sh
ffmpeg -i "input.WAV" -c:a pcm_f32le "workplace/h4essential-260114_160901/01_trim.wav"
```

If the source is not 32-bit float WAV or the user wants a simpler command, omit
the explicit codec and let FFmpeg choose an appropriate WAV format:

```sh
ffmpeg -i "input.WAV" -ss 00:01:23 -to 00:12:34 "workplace/h4essential-260114_160901/01_trim.wav"
```

## Notes

- Do not overwrite source recordings.
- Strongly recommend VLC for confirming the cut points before generating final
  trim commands.
- Quote file paths.
- Log the exact trim command to the job directory's `commands.log`.
- Preserve each trimmed file separately in multiple-file workflows.
