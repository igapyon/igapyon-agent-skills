# YouTube Manual Upload

Use this process as the final step of the first-cut workflow.

## Policy

The first-cut workflow ends with a YouTube-uploadable video file. Upload is
manual through the YouTube Studio Web UI.

Do not introduce any of the following unless the user explicitly asks to expand
the skill:

- YouTube API upload
- OAuth setup
- scheduled publishing
- title or description automation
- thumbnail API registration
- public/private visibility automation

## Final Message

End the workflow by pointing to the generated upload file:

```text
生成された `workplace/ffmpeg-helper-260114_160901/260114_160901-youtube.mp4` を YouTube Studio から手動アップロードしてください。
```
