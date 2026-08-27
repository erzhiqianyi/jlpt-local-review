---
name: jlpt-study-generator
description: Generate a general JLPT study plan and AI-created practice content from a target level, available days, daily study time, and focus modules when the learner has no source notes. Do not use for organizing the learner's own questions or exported progress; use jlpt-chat-review for those personalized workflows.
---

# JLPT Study Generator

Use this skill when the learner wants to start without supplying vocabulary, notes, or mistakes. Produce a level-appropriate plan and original JLPT-style practice material from the learner's constraints.

This is a general generation workflow, not a diagnosis. State that the output is less personalized than material created from the learner's own questions or study-record export.

## Inputs

Determine these parameters from the request:

- Target JLPT level: `N5`, `N4`, `N3`, `N2`, or `N1`.
- Study duration: start date or number of available days.
- Daily study time. Default to 45 minutes when omitted.
- Focus modules: vocabulary, grammar, listening, reading, or mixed. Default to balanced coverage.
- Learner-facing output languages. Default to `zh-CN`.
- Desired output: plan only, content only, or both. Default to both.

Ask only for a missing target level or duration when neither can be inferred. For other missing values, use the defaults and list the assumptions before generating.

## Workflow

1. Read [references/study-plan-schema.md](references/study-plan-schema.md) before writing a plan file or website data.
2. Build a schedule for the full duration, divided into foundation, consolidation, mixed practice, and final review phases. Scale the phases to the available days instead of forcing every phase into very short plans.
3. Keep each day's workload within the daily time budget. Increase the requested focus modules while preserving some mixed retrieval practice.
4. Generate only the first seven days of detailed content by default. Keep the remaining days as a plan outline so future batches can react to actual progress. Generate the full duration only when the user asks.
5. For importable vocabulary and grammar entries, follow `../jlpt-chat-review/references/review-schema.md` and mark every item with the AI-generation metadata defined in the plan schema.
6. Generate reading, listening, and mixed-practice material in the plan pack. Do not add unsupported item types to monthly archives under `public/data/review-data/YYYY/MM.json` until the website schema supports them.
7. Update the matching monthly archive only when the user explicitly asks to import the generated material. Merge by `id`; do not replace existing user-created items or SQLite progress.
8. Run the project build after changing website data.

## Content Rules

- Create original JLPT-style material. Never describe it as an official JLPT question, past paper, or official syllabus item.
- Match vocabulary, kanji, grammar, sentence length, and distractor difficulty to the target level. When level placement is uncertain, set `jlpt_level` to `unknown` or lower `level_confidence`.
- Every question needs one defensible answer, immediate correct/incorrect judging data, and a complete explanation of the answer and distractors when relevant.
- Do not put furigana in question prompts, choices, selected answers, or correct answers. Add structured readings for review cards and explanations.
- Listening practice without audio must be labeled `script_based`. Do not imply that text-to-speech or a generated script measures authentic listening ability.
- Avoid copying long passages or questions from textbooks, websites, or commercial preparation books. Generate original content.
- Keep learner-specific scheduling state out of public seed data. SQLite owns review counts, intervals, ease, and `nextReviewAt`.

## Human Review Boundary

All generated plans and content are drafts that the learner must judge. Include a visible warning in the requested output language and use:

```json
{
  "content_origin": "ai_generated",
  "verification_status": "unverified",
  "level_confidence": "medium"
}
```

Do not silently change `verification_status` to `verified`. Only a user-requested review or an explicit user confirmation can do that. Surface uncertain readings, meanings, answer keys, and JLPT-level assignments instead of hiding uncertainty.

## Relationship To Personalized Review

- Use this skill for a general starting curriculum when the learner has no source content.
- Use `jlpt-chat-review` to structure the learner's own questions, notes, mistakes, or exported study records.
- If both are available, prioritize due and weak personalized items, then use generated content to fill coverage gaps.
