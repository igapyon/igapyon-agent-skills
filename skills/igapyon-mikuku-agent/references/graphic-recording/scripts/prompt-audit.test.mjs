import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

const hiddenHandsDirective = "- Keep Mikuku's hands and fingers outside the frame.";
const sourceHandException = "- 手指を描く。理由: 手の位置を説明するためにどうしても必要。";
const promptHandException = "- hands visible; reason: depicting the finger positions is essential to explain this topic.";

const validPrompt = `# Prompt and runner boundary design

## Style Contract

- style-profile: mikuku-graphic-recording-v1
- 横長 3:2、暖色のベージュ紙、手描きグラレコ
- みくくは説明役として読める大きさで1人、物を持たせない
${hiddenHandsDirective}

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

test("no held objects or empty hands do not satisfy the hidden-hand default", () => {
  for (const replacement of ["", "- Mikuku has empty hands resting naturally at the lower edge."]) {
    const result = auditPrompt({ graphicText, imagePrompt: validPrompt.replace(hiddenHandsDirective, replacement) });
    assert.equal(result.status, "fail");
    assert.equal(result.checks.find((check) => check.name === "hands-outside-frame").status, "error");
  }
});

test("an explicit ban on visible hands and fingers also satisfies the default", () => {
  const result = auditPrompt({
    graphicText,
    imagePrompt: validPrompt.replace(hiddenHandsDirective, "- No hands, fingers, palms, wrists or forearms may be visible."),
  });
  assert.equal(result.status, "pass");
});

test("necessary hands are allowed when the design reason is carried into the final prompt", () => {
  const imagePrompt = validPrompt
    .replace(hiddenHandsDirective, "- Mikuku shows the essential finger positions.")
    .replace("- none", promptHandException);
  const source = graphicText.replace("- none", sourceHandException);
  const allowed = auditPrompt({ graphicText: source, imagePrompt });
  assert.equal(allowed.status, "pass-with-warnings");
  assert.equal(allowed.checks.find((check) => check.name === "hands-outside-frame").status, "warn");

  for (const inputs of [
    { graphicText, imagePrompt },
    { graphicText: source, imagePrompt: validPrompt },
  ]) {
    const result = auditPrompt(inputs);
    assert.equal(result.status, "fail");
    assert.equal(result.checks.find((check) => check.name === "hands-outside-frame").status, "error");
  }
});

test("composed section prompts pass audit with the default or preserve a justified hand exception", async () => {
  const composeScript = path.join(path.dirname(fileURLToPath(import.meta.url)), "compose-section-image-prompts.mjs");
  for (const hasException of [false, true]) {
    const root = await mkdtemp(path.join(tmpdir(), "mikuku-hand-contract-"));
    const sectionDir = path.join(root, "sections/001");
    await mkdir(sectionDir, { recursive: true });
    const source = hasException ? graphicText.replace("- none", sourceHandException) : graphicText;
    await writeFile(path.join(sectionDir, "section-text.md"), source);
    await writeFile(path.join(root, "TODO.md"), "# TODO\n\n- [ ] 001: 境界設計 - image-pending\n");
    const canonical = path.join(root, "mikuku.md");
    await writeFile(canonical, "Mikuku, chestnut twin-tails, black ribbons with deep-red trim.\n");
    execFileSync(process.execPath, [composeScript, "--run-dir", root, "--mikuku-prompt", canonical], { stdio: "pipe" });
    const imagePrompt = await readFile(path.join(sectionDir, "image-prompt.md"), "utf8");
    const result = auditPrompt({ graphicText: source, imagePrompt });
    assert.equal(result.status, hasException ? "pass-with-warnings" : "pass");
    assert.equal(result.checks.some((check) => check.status === "error"), false);
    if (hasException) {
      assert.doesNotMatch(imagePrompt, /Keep Mikuku's hands and fingers outside the frame/u);
      assert.doesNotMatch(imagePrompt, /手指は原則画面外に置き/u);
    } else {
      assert.match(imagePrompt, /Keep Mikuku's hands and fingers outside the frame/u);
    }
  }
});
