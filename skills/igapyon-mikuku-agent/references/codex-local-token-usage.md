# Codex CLI Local Token Usage Investigation

This reference describes how to reproduce a local Codex token-usage investigation from the Codex state SQLite database.

## Scope

This method is for Codex CLI and local Codex app environments that write state under `CODEX_HOME`, usually `~/.codex`.

It is not a Web UI usage investigation method. The ChatGPT / Codex Web UI does not expose the local filesystem path `~/.codex/state_*.sqlite` to the assistant, so this method cannot inspect Web UI-only usage. Treat all results as local history estimates, not official account usage, billing usage, weekly quota, or remaining allowance.

## When to Use

Use this reference when the user asks about local Codex token consumption and mentions words such as:

- `トークン消費`
- `消費状態`
- `週間の消費量`
- `週次消費`
- `tokens_used`
- `state_*.sqlite`
- `Codex CLI usage`
- `ローカル履歴`

## Investigation Prompt

Use or adapt the following prompt to reproduce the investigation in a later session:

```text
Codex CLI のローカル状態DBから、トークン消費状況を調べてください。

重要:
- この方法は Codex CLI / ローカル Codex アプリ環境専用です。
- ChatGPT / Codex Web UI だけの利用量調査には使えません。
- 公式な週次上限・残量・課金利用量ではなく、このマシンのローカル Codex 履歴に記録された tokens_used の集計です。

目的:
- ~/.codex/state_*.sqlite の threads テーブルを確認し、tokens_used / created_at / updated_at を使って利用量を集計してください。
- SQLite が WAL モードの場合があるので、DB本体だけでなく .sqlite-wal の更新時刻も確認してください。

やってほしいこと:
1. codex doctor --json などで CODEX_HOME と state DB の場所を確認する。
2. state DB のスキーマを sqlite3 .schema で確認する。
3. threads テーブルに tokens_used, created_at, updated_at があるか確認する。
4. 最新スレッド上位を表示する。
5. JST基準で「今週」「先週」「直近7日」「その前の7日」の tokens_used 合計を出す。
6. DBファイル本体、-wal、-shm の更新時刻を確認する。
7. 結果には「これはローカル履歴ベースであり、公式のアカウント利用量や上限対比ではない」と明記する。

使うコマンド例:
- codex doctor --json
- sqlite3 ~/.codex/state_5.sqlite .schema
- sqlite3 -header -column ~/.codex/state_5.sqlite "select datetime(updated_at,'unixepoch','localtime') as updated, datetime(created_at,'unixepoch','localtime') as created, tokens_used, id, title from threads order by updated_at desc limit 10;"
- sqlite3 -header -column ~/.codex/state_5.sqlite "select date(updated_at,'unixepoch','localtime') as day, count(*) as threads, sum(tokens_used) as tokens from threads where updated_at >= strftime('%s','now','-14 days') group by day order by day desc;"
- ls -l ~/.codex/state_5.sqlite*
- stat ~/.codex/state_5.sqlite*
```

## Notes for the Assistant

- Prefer discovering the actual state DB path from `codex doctor --json` instead of assuming `state_5.sqlite`.
- If `codex doctor --json` is unavailable or too noisy, inspect `~/.codex/state_*.sqlite` candidates.
- On macOS, `stat -f '%Sm %m %N' FILE` gives readable and epoch mtimes. On Linux, use `stat FILE` or `stat -c '%y %Y %n' FILE`.
- SQLite may return data newer than the main DB file mtime because committed changes can still be in the `-wal` file.
- Use absolute dates when explaining week boundaries, especially when the user asks about `今週`, `先週`, `今日`, or `昨日`.
- Do not present the result as official OpenAI, ChatGPT, billing, or quota usage.
