---
name: jlpt-chat-review
description: Turn JLPT study content discussed in an AI coding chat into structured review data for this local JLPT review website.
---

# JLPT Chat Review

Use this skill when the user gives Japanese-learning material in chat and wants it organized for this review website. The website is a viewer and practice tool, not the capture UI: the user chats with an AI assistant, the assistant extracts structured records, and the website reads `public/data/review-data.json`.

## Workflow

1. Read `references/review-schema.md`.
2. Ask or infer which output languages the user wants when the request is ambiguous.
3. Extract learnable items from the user's chat or notes.
4. Update `public/data/review-data.json`.
5. Keep raw private chat transcripts out of the website data.
6. Run the project build after editing data.

For Codex installations, copy this folder to `~/.codex/skills/jlpt-chat-review`.

For Claude Code or other coding assistants, tell the assistant to read this `SKILL.md` and follow it as project-specific extraction guidance.

## Capture Rules

For each item:

- Preserve the Japanese surface form.
- Add `input_at` as an ISO 8601 timestamp for when the user provided the item.
- Normalize obvious typos only in a separate field when needed.
- Classify the deck as `n1_vocab`, `grammar_expression`, or `name_reading`.
- Estimate JLPT level only when there is enough evidence; otherwise use `unknown`.
- Write Chinese explanations for review.
- When the user asks for multiple languages, keep the Japanese source fields stable and write translated learner-facing text under `localizations`.
- Include reading, core memory, collocations, examples, comparisons, and analysis when relevant.
- Add kana readings for every Japanese field that contains kanji. Prefer structured `ruby_terms` arrays in data so the app can show or hide furigana without changing the base text.
- Do not add furigana or ruby markup inside quiz prompts, choices, selected answers, or correct answers. Furigana is only for review cards and explanations.
- Put exam-style shortcut reasoning into `analysis`, not into a separate quiz type.

## Practice Expectations

The app can generate these practice modes from each item:

- `文字・語彙`: JLPT-style vocabulary selection in a sentence or meaning prompt.
- Meaning check: choose the correct core meaning for a Japanese word.
- Kana to kanji: choose the kanji word for a kana reading.
- Kanji to kana: choose the kana reading for a kanji word.

Every generated question should support immediate correct/incorrect judging and a full explanation.

Furigana must be display-controlled, not baked into visible plain text. The review app should be able to hide furigana during recall and show it in explanations when the learner wants support. Question prompts and answer choices must stay plain so readings do not leak into the test.

## Boundaries

- Do not include private raw chat logs in public data.
- Do not call external dictionary or translation APIs unless the user explicitly asks.
- Do not invent official JLPT levels for uncertain items.
- Keep user progress out of the seed data; progress belongs in browser local storage.
- Keep review counts, ease factors, intervals, and `nextReviewAt` in browser progress only. Seed data should describe content, not a specific learner's schedule.

## Language Output

Default learner-facing language is Simplified Chinese (`zh-CN`). If the user asks for another language or a multilingual deck, output `localizations` for the requested languages.

Supported language keys should use BCP 47 style tags, for example:

- `zh-CN`
- `zh-TW`
- `ja`
- `en`
- `ko`
- `vi`
- `fr`
- `es`

Do not translate Japanese source fields such as `original`, `reading`, `collocations`, or `examples[].ja`. Translate meanings, memory hints, explanations, comparison notes, question explanations, and learner instructions.
