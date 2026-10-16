import assert from "node:assert/strict";
import test from "node:test";
import { auditPrompt } from "./audit-graphic-recording-prompt.mjs";

const graphicText = `# プロンプトと runner の境界設計

## 主題

- 意味と固定処理を分ける

## 図解キーワード

- プロンプト
- workflow ID
- .mjs runner

## 関係・流れ・対比

- プロンプト → workflow ID → .mjs runner

## 図解構造

- layout-family: flow
- primary-relation: プロンプト → workflow ID → .mjs runner
- secondary-relations: 該当なし
- label-priority: プロンプト、workflow ID、.mjs runner

## 役割分担・判断軸

- AI は意味を読む。runner は固定処理を担う

## グラレコ構図案

- 左: プロンプト
- 中央: workflow ID
- 右: .mjs runner
- 最も大きく見せる主図: プロンプトから runner へ流れる矢印
- みくくの表情・視線: 右側から中央の矢印を見る
- 吹き出し: 境界を決めると、実行が安定します

## 正確性メモ

- 記事本文の関係だけを使う

## 共通スタイル契約

- style-profile: mikuku-graphic-recording-v1

## 変更（deviation）

- none
`;

const validPrompt = `# Prompt and runner boundary design

## Style Contract

- style-profile: mikuku-graphic-recording-v1
- 横長 3:2、暖色のベージュ紙、手描きグラレコ
- みくくは説明役として読める大きさで1人、物を持たせない

## Article-specific Design

- Title: プロンプトと runner の境界設計
- 左: プロンプト
- 中央: workflow ID
- 右: .mjs runner
- 主図: プロンプト → workflow ID → .mjs runner
- layout-family: flow
- primary-relation: プロンプト → workflow ID → .mjs runner
- みくくの吹き出し: 境界を決めると、実行が安定します
- みくくは中央の流れを見る

## Deviation Record

- none

Mikuku / みくく, same character, preserve character identity.
`;

test("prompt audit accepts a contract-preserving prompt", () => {
  const result = auditPrompt({ graphicText, imagePrompt: validPrompt });
  assert.equal(result.status, "pass");
  assert.equal(result.checks.some((check) => check.status === "error"), false);
});

test("prompt audit catches omitted speech bubble and tiny character direction", () => {
  const invalidPrompt = validPrompt
    .replace("境界を決めると、実行が安定します", "")
    .replace("みくくは説明役として読める大きさで1人", "みくくは at most 12% の tiny Mikuku");
  const result = auditPrompt({ graphicText, imagePrompt: invalidPrompt });
  assert.equal(result.status, "fail");
  assert.match(result.checks.find((check) => check.name === "speech-bubble-preservation").detail, /ありません/u);
  assert.equal(result.checks.find((check) => check.name === "character-scale-contradiction").status, "error");
});
