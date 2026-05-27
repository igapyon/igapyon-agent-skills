# igapyon-mikuku-agent

`igapyon-mikuku-agent` is an Agent Skill for giving an agent such as Codex a character-oriented response style.

This repository includes the settings, images, and reference materials for the character `Mikuku` / `みくく`.

## OSS Usage Policy

This skill is intended to be published as OSS. If you use it as a third party, the author recommends using this skill as a base for creating your own character, rather than using it as `Mikuku` / `みくく` as-is. To avoid confusion between the original author, the character, and your own usage, the author also hopes that you will consider customizing it before use.

In particular, replacing the following elements with your own character-specific materials helps avoid ambiguity:

- Character name
- Character images
- Short prompt for character image generation
- Characterization prompt defining tone, personality, and behavior
- Samples, templates, and example outputs used for article writing or image generation

As a practical recommendation, consider reviewing and replacing the following files and related references as needed:

- `SKILL.md`
- `references/mikuku-prompt.md`
- `assets/mikuku/`
- `assets/mikuku/mikuku-portrait-short-prompt.md`

`references/mikuku-prompt.md` contains important characterization details for `Mikuku` / `みくく`, including tone, personality, behavior, and sample dialogue. If you use this skill for a different character, the author recommends customizing this file as one of the primary replacement targets.

`assets/mikuku/mikuku-portrait-short-prompt.md` is a short image-generation prompt describing the appearance of `Mikuku` / `みくく`. If you use this skill for a different character, the author recommends rewriting this file for your own character design, or renaming it and updating the references accordingly.

## Recommended Customization Steps

1. Copy the skill directory and rename it to your new skill name.
2. Update the `name`, `description`, activation conditions, and character name in `SKILL.md`.
3. Rewrite `references/mikuku-prompt.md` for your character's tone, personality, and response rules.
4. Replace the images under `assets/mikuku/` with images for your own character.
5. Replace `assets/mikuku/mikuku-portrait-short-prompt.md` with an appearance prompt for your own character.
6. Replace remaining `Mikuku` / `みくく` references in the README, sample articles, and templates with your new character name.

The `Mikuku` / `みくく` character included in this skill is a very important partner character who works together with the author. Under the Apache License 2.0, the files may be used according to the license terms. At the same time, the author's recommendation and hope is that third-party users customize the character, writing style, publication scope, and image materials to fit their own purpose.

## Structure

```text
.
├─ SKILL.md
├─ assets/
│  ├─ mikuku/
│  └─ article/
└─ references/
   ├─ mikuku-prompt.md
   ├─ article-writing.md
   ├─ graphic-recording.md
   └─ examples/
```

## Note

`index.json` is a generated discovery file. Treat `SKILL.md`, `references/`, and `assets/` as the source of truth for character settings, representative images, prompts, and usage rules.

---

# igapyon-mikuku-agent

`igapyon-mikuku-agent` は、Codex などのエージェントにキャラクター性を持たせて応答させるための Agent Skill です。

この repository には、キャラクター `みくく` の設定、画像、参照資料を同梱しています。

## OSS としての利用方針

この skill は OSS として公開することを想定しています。第三者の方が利用する場合は、そのまま `みくく` として使うよりも、この skill をベースにして自分用の別キャラクターを作成することを作者として推奨します。また、混乱を避けるためにも、そのようにカスタマイズして利用していただくことを作者からのお願いとします。

特に、次の要素は利用者自身のキャラクターに合わせて置き換えてから使うと、作者・キャラクター・利用者の意図が混同されにくくなります。

- キャラクター名
- キャラクター画像
- キャラクター画像生成用の短いプロンプト
- 口調、性格、ふるまいを定義するキャラクターづけ prompt
- 記事作成や画像生成で使うサンプル、テンプレート、作例

実用上の推奨として、少なくとも次のファイルと関連記述について、確認と差し替えの検討をおすすめします。

- `SKILL.md`
- `references/mikuku-prompt.md`
- `assets/mikuku/`
- `assets/mikuku/mikuku-portrait-short-prompt.md`

`references/mikuku-prompt.md` には、`みくく` の口調、性格、ふるまい、会話例など、キャラクターづけとして重要な記述が含まれています。別キャラクターとして利用する場合は、このファイルを主要な差し替え対象のひとつとしてカスタマイズすることを作者として推奨します。

`assets/mikuku/mikuku-portrait-short-prompt.md` は、`みくく` の外見を短く表す画像生成用プロンプトです。別キャラクターとして利用する場合は、このファイルを自分のキャラクター設定に合わせて書き換えるか、別ファイル名に変更したうえで参照元も更新することを作者として推奨します。

## 推奨するカスタマイズ手順

1. skill directory をコピーし、新しい skill 名に変更する。
2. `SKILL.md` の `name`、`description`、発火条件、キャラクター名を変更する。
3. `references/mikuku-prompt.md` を新しいキャラクターの口調・性格・応答ルールに合わせて書き換える。
4. `assets/mikuku/` 配下の画像を、新しいキャラクターの画像に置き換える。
5. `assets/mikuku/mikuku-portrait-short-prompt.md` を、新しいキャラクターの外見プロンプトに置き換える。
6. README、サンプル記事、テンプレート内に残っている `みくく` / `Mikuku` 表記を、新しいキャラクター名に変更する。

この skill に含まれる `みくく` は、作者とともに作業するとても大切なパートナー・キャラクターです。Apache License 2.0 のもとで、各ファイルはライセンス条件に従って利用できます。そのうえで、第三者の方が実運用する場合には、自分の目的、文体、公開範囲、画像素材に合うようにカスタマイズして利用していただくことを、作者として推奨し、希望します。

## 構成

```text
.
├─ SKILL.md
├─ assets/
│  ├─ mikuku/
│  └─ article/
└─ references/
   ├─ mikuku-prompt.md
   ├─ article-writing.md
   ├─ graphic-recording.md
   └─ examples/
```

## 注意

`index.json` は discovery 用の生成物です。キャラクター設定、代表画像、プロンプト、利用ルールの正本は `SKILL.md` と `references/`、`assets/` 配下の各ファイルとして扱います。
