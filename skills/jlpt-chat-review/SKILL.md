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
- Choose `question_kinds` from the lexical function and evidence for that item. Do not generate every supported question type automatically.
- For `proper_name` items, use only `kanji_to_kana` when the source establishes one intended reading. If the name has multiple possible readings or only an inferred candidate, set `question_kinds` to an empty array until the reading is verified.
- Add `question_distractors` when a question needs controlled, type-appropriate wrong choices. For name readings, use reading-shaped distractors and never present another valid reading of the same person as wrong.

## Practice Expectations

The app supports these practice modes, but each item should opt into only the suitable modes through `question_kinds`:

- `文法・表現`: choose the form that matches the sentence connection, grammatical function, and context.
- `文字・語彙`: JLPT-style vocabulary selection in a sentence or meaning prompt.
- `言い換え類義`: choose the closest meaning for the target word in a sentence context.
- `表記`: choose the correct kanji form for a kana word in a sentence context.
- `漢字読み`: choose the correct kana reading for a kanji word in a sentence context.

Every generated question should support immediate correct/incorrect judging and a full explanation.

For `漢字読み`, follow the official JLPT booklet structure: keep the task instruction separate from the item, show one complete natural Japanese sentence, visually mark only the target kanji word for underlining, and provide four kana-only choices. Wrong choices should be plausible reading confusions for the same kanji, such as alternate on/kun readings, voicing, gemination, or long-vowel mistakes, rather than readings borrowed from unrelated vocabulary. Do not repeat the target in a meta-prompt such as `次の文の「認定」の読み方...` before the sentence.

For grammar expressions, prefer a sentence with a blank plus controlled distractors that test connection or function. Do not turn a grammar item into an isolated reading, spelling, or dictionary-meaning question unless that was the learner's actual confusion.

Furigana must be display-controlled, not baked into visible plain text. The review app should be able to hide furigana during recall and show it in explanations when the learner wants support. Question prompts and answer choices must stay plain so readings do not leak into the test.

## Exported Study Record Workflow

When the user provides an exported study record JSON from the website settings page:

1. Analyze answer history, item progress, review counts, intervals, and `nextReviewAt`.
2. Identify weak modules, weak question types, overdue items, and high-confusion items.
3. Generate a short study diagnosis in the user's requested language.
4. Create a 7-day review plan based on due items and Anki-style spacing.
5. Generate new practice material for weak points and update `public/data/review-data.json` only when the user asks to write the new content into the site.

Do not treat exported browser progress as public seed data. It is private learner state used for analysis and planning.

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
