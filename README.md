# JLPT Master Deck

A local-first JLPT review tool built from your own study chats or an AI-generated general plan. The app runs as a static Vite site, stores progress in the browser, and can be deployed to Cloudflare Pages.

There are two supported workflows:

1. Personalized review: chat with Codex or Claude Code about material you do not understand, then use `jlpt-chat-review` to structure it.
2. General study generation: give `jlpt-study-generator` a target level, available days, daily study time, and focus modules. No source notes are required.
3. Put selected generated items into `public/data/review-data.json` and practice in the local web app.
4. Your answers and progress stay in browser storage.

## Features

- Vocabulary decks for JLPT words, expressions, and Japanese name readings.
- Module navigation for vocabulary, grammar, listening, reading, and mixed practice.
- Shareable hash routes for each module, question page, word page, About page, and Settings page; browser back and forward navigation work on static hosting.
- Countdown to the next JLPT test date.
- Practice modes for JLPT `文字・語彙`, `言い換え類義`, `表記`, and `漢字読み`.
- Immediate correct/incorrect judging.
- Structured explanations after each answer: full context, why the answer is correct, per-choice distractor analysis, and a memory point with useful comparisons.
- Optional furigana display for review cards and answer explanations. Questions and answer choices stay unannotated.
- Multilingual UI and multilingual data support through `localizations`.
- Local-only progress with `localStorage`.
- Exportable study records for AI analysis and next-plan generation.
- A second skill for generating a general study plan and original practice content without learner-provided notes.
- Visible `AI generated` and `unverified` notices for generated entries that require learner review.
- Static deployment friendly: no login, database, or backend required.

## Local Setup

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually:

```text
http://localhost:5180/
```

Build the static site:

```bash
npm run build
```

The production output is written to `dist`.

Main pages have independent static-friendly addresses, for example:

```text
/#/home
/#/vocabulary/questions
/#/vocabulary/words
/#/grammar/questions
/#/about
/#/settings
```

## Start With Your Own Data

This repository includes an example deck. To use the included sample content, keep `public/data/review-data.json` as-is and run:

```bash
npm install
npm run dev
```

To start from an empty deck without the sample content, run:

```bash
npm run data:blank
npm run dev
```

Then use Codex or Claude Code to add your own study items back into `public/data/review-data.json`.

## Local Tunnel Preview

For a fixed local port:

```bash
npm run dev
```

The app runs on:

```text
http://localhost:5180/
```

If you have Cloudflare Tunnel configured for this host, use:

```bash
npm run dev:tunnel
```

This starts the Vite dev server on port `5180` and runs:

```bash
cloudflared tunnel --config ~/.cloudflared/config.yml run satori-local
```

In this local setup, the tunnel hostname is:

```text
https://jlpt-local.erzhiqian.cc
```

## Data Model

The app reads seed content from:

```text
public/data/review-data.json
```

User progress is not written back to this file. It stays in the learner's browser under these local storage keys:

```text
jlpt-vocab-progress-v1
jlpt-vocab-answers-v1
```

This means a new deployment can update the vocabulary data without deleting each user's local review progress.

Japanese text that contains kanji should include kana support through `reading` and `ruby_terms`. The app has separate settings for showing furigana in review cards and answer explanations.

For multilingual decks, keep Japanese source fields stable and add learner-facing translations under `localizations`, for example `en.meaning`, `ja.core_memory`, or `ko.analysis`.

Each item should include an input timestamp:

```json
{
  "id": "2026-08-27-001",
  "date": "2026-08-27",
  "input_at": "2026-08-27T20:20:00+09:00"
}
```

Per-user review scheduling is stored in browser `localStorage`, not in the public seed data. For each item, the app records:

```json
{
  "firstSeenAt": "2026-08-27T20:20:00.000Z",
  "lastReviewedAt": "2026-08-27T20:25:00.000Z",
  "reviewCount": 2,
  "ease": 2.8,
  "intervalDays": 3,
  "nextReviewAt": "2026-08-30T20:25:00.000Z"
}
```

The review interval follows a simplified Anki/SM-2 style schedule:

- First correct review: next day.
- Second correct review: after 3 days.
- Later correct reviews: previous interval multiplied by the item's ease factor.
- Wrong review: next day again, with a lower ease factor.

This keeps the repository data shareable while each learner's forgetting-curve schedule stays private in their own browser.

## Export Study Records

Open `设置` / `Settings` and use `导出学习记录` to download a JSON file from the current browser. The export includes:

- Current content version and item summary.
- Answer history.
- Correct and wrong counts.
- Review count, ease factor, interval, and `nextReviewAt`.
- A ready-to-paste AI prompt.

Give this exported JSON to Codex, Claude Code, or another AI assistant and ask it to:

- Analyze weak modules and weak question types.
- Find items that are due or overdue.
- Generate a 7-day review plan.
- Create new JLPT-style questions and explanations from the weak points.

The export stays local. The app does not upload learning records by itself.

## Using Codex

Install or copy the two included skills from:

```text
skills/jlpt-chat-review/
skills/jlpt-study-generator/
```

If you use Codex with local skills, copy it into your Codex skills directory:

```bash
mkdir -p ~/.codex/skills
cp -R skills/jlpt-chat-review ~/.codex/skills/
cp -R skills/jlpt-study-generator ~/.codex/skills/
```

Then chat naturally with Codex:

```text
$jlpt-chat-review
整理下面这些 JLPT 学习内容，生成适合本项目的 review-data.json。
输出语言：zh-CN, ja, en。
```

Paste your notes, vocabulary explanations, sentences, or JLPT-style questions. Ask Codex to update `public/data/review-data.json`, then run:

```bash
npm run build
```

After practicing in the app, export your study record from `设置` and send it back to Codex:

```text
$jlpt-chat-review
这是我导出的学习记录 JSON。请分析弱点、安排未来 7 天复习计划，并基于错题生成新的 JLPT 练习内容。
```

## Generate A Plan Without Your Own Notes

Use `jlpt-study-generator` when you want AI to create a general curriculum and study material from scratch. Provide:

- Target level, such as `N1`.
- Approximate number of study days.
- Daily available time.
- Focus modules: vocabulary, grammar, listening, reading, or mixed.
- Output languages.

Example:

```text
$jlpt-study-generator
目标 N1，距离考试还有 100 天，每天 45 分钟。
重点练习单词和阅读，输出简体中文和英语。
请生成完整阶段计划和前 7 天的学习内容，并把可用的单词、语法条目合并到网站数据。
```

The skill creates a full-duration outline and generates only the first seven days of detailed content by default. This keeps later batches adjustable instead of locking the whole course before any progress data exists.

AI-generated material is deliberately marked with:

```json
{
  "content_origin": "ai_generated",
  "verification_status": "unverified",
  "level_confidence": "medium"
}
```

It is not official JLPT material. The learner must verify readings, meanings, answer keys, distractors, and JLPT-level assignments. The website displays a warning on generated entries until they are explicitly verified.

## Using Claude Code

Claude Code does not need the Codex skill system. Use the same instructions manually:

1. Open this repository in Claude Code.
2. For your own notes, tell Claude Code to read `skills/jlpt-chat-review/SKILL.md`.
3. For a general plan without notes, tell it to read `skills/jlpt-study-generator/SKILL.md`.
4. Give it the relevant notes, or just your target level, days, daily time, and focus modules.
5. Ask it to update `public/data/review-data.json` only when you want generated vocabulary or grammar imported.
6. Run `npm run build`.

Example prompt:

```text
Read skills/jlpt-chat-review/SKILL.md and use it as the data extraction guide.
Convert the following JLPT vocabulary notes into public/data/review-data.json.
Do not include raw private chat transcripts. Keep only structured study records and explanations.
```

## Cloudflare Pages

Use Cloudflare Pages with GitHub integration:

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: leave empty or use `/`
- Node version: `22.13.0` or newer

Cloudflare Pages will rebuild automatically after each push to the configured branch.

See [docs/cloudflare-pages-deploy.md](docs/cloudflare-pages-deploy.md) for the step-by-step deployment notes.

## Repository Name

The repository name is:

```text
jlpt-master-deck
```

It describes the project more clearly than `JLPT`: this is a JLPT-focused deck and review tool, not a general JLPT repository.

## Copyright

Copyright © 2026 Itsuki. All rights reserved.

This repository is public so others can inspect the approach and build their own personal learning tool. No open-source license has been granted yet. Add a `LICENSE` file if you want to allow reuse, modification, or redistribution under a specific license.

Contact:

- X: [@itsuki_maer](https://x.com/itsuki_maer)
- Email: [jlpt@erzhiqian.cc](mailto:jlpt@erzhiqian.cc)
