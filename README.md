# JLPT Master Deck

A local-first JLPT review tool built from your own study chats or an AI-generated general plan. The app now runs with a local Node backend: public study resources stay in JSON, while accounts, sessions, settings, answers, and review progress are stored in local SQLite.

There are two supported workflows:

1. Personalized review: chat with Codex or Claude Code about material you do not understand, then use `jlpt-chat-review` to structure it.
2. General study generation: give `jlpt-study-generator` a target level, available days, daily study time, and focus modules. No source notes are required.
3. Put selected generated items into monthly files under `public/data/review-data/YYYY/MM.json` and practice in the local web app.
4. Your answers and progress stay in `.local/jlpt.sqlite`.

## Features

- Vocabulary decks for JLPT words, expressions, and Japanese name readings.
- Module navigation for vocabulary, grammar, listening, reading, and mixed practice.
- Shareable hash routes for each module, question page, word page, About page, and Settings page; browser back and forward navigation work on static hosting.
- Countdown to the next JLPT test date.
- Level-appropriate, official-style practice for `文脈規定`, `言い換え類義`, `表記`, `漢字読み`, and `文の文法1`, with Japanese instructions and numbered choices.
- Immediate correct/incorrect judging.
- Structured explanations after each answer: full context, why the answer is correct, per-choice distractor analysis, and a memory point with useful comparisons.
- A focused reading page with an in-page furigana switch, Japanese definitions, learner-language definitions, exam quick notes, collocations, and analysis. Questions and answer choices stay unannotated.
- Multilingual UI and multilingual data support through `localizations`.
- Local username/password accounts backed by SQLite.
- Local-only progress stored in `.local/jlpt.sqlite`.
- Exportable study records for AI analysis and next-plan generation.
- Review-pack drafts with in-app preview, user annotations, and revision context for MCP/agent optimization.
- A second skill for generating a general study plan and original practice content without learner-provided notes.
- Visible `AI generated` and `unverified` notices for generated entries that require learner review.
- MCP-ready backend boundary for future personalized analysis and review-pack generation.

## Local Setup

```bash
npm install
npm run dev
```

`npm run dev` starts both the local backend and the Vite app. Open:

```text
http://localhost:5191/
```

The backend runs on:

```text
http://localhost:8791/
```

Create any local username and password from the login screen. The account is local to this machine.

Build the frontend:

```bash
npm run build
```

The production output is written to `dist`.

Main pages have independent hash addresses, for example:

```text
/#/home
/#/vocabulary/questions
/#/vocabulary/words
/#/grammar/questions
/#/about
/#/settings
```

## Start With Your Own Data

This repository includes an example deck. To use the included sample content, keep the monthly files under `public/data/review-data/` as-is and run:

```bash
npm install
npm run dev
```

To start from an empty deck without the sample content, run:

```bash
npm run data:blank
npm run dev
```

Then use Codex or Claude Code to add your own study items into the matching monthly file under `public/data/review-data/YYYY/MM.json`. Personal answers and progress are stored separately in SQLite.

## Local Tunnel Preview

For a fixed local port:

```bash
npm run dev
```

The app runs on:

```text
http://localhost:5191/
```

If you have Cloudflare Tunnel configured for this host, use:

```bash
npm run dev:tunnel
```

This starts the Vite dev server on port `5191` and runs:

```bash
cloudflared tunnel --config ~/.cloudflared/config.yml run satori-local
```

In this local setup, the tunnel hostname is:

```text
https://jlpt-local.erzhiqian.cc
```

## Data Model

The backend reads seed resource content from:

```text
public/data/review-data/YYYY/MM.json
```

User progress is not written back to this file. It stays in local SQLite:

```text
.local/jlpt.sqlite
```

This means a new deployment can update the vocabulary data without deleting each user's local review progress.

Japanese text that contains kanji should include kana support through `reading` and `ruby_terms`. Each item should also include `meaning_ja` for its Japanese dictionary-style definition. The reading page has a direct furigana switch, while answer explanations keep their separate setting.

For multilingual decks, keep Japanese source fields stable and add learner-facing translations under `localizations`, for example `en.meaning`, `ja.core_memory`, or `ko.analysis`.

Each item should include an input timestamp:

```json
{
  "id": "2026-08-27-001",
  "date": "2026-08-27",
  "input_at": "2026-08-27T20:20:00+09:00"
}
```

Per-user review scheduling is stored in SQLite, not in the public seed data. For each item, the app records:

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

This keeps the repository data shareable while each learner's forgetting-curve schedule stays private on their own machine.

See [docs/local-backend-mcp.md](docs/local-backend-mcp.md) for the backend and MCP design.

## Export Study Records

Open `设置` / `Settings` and use `导出学习记录` to download a JSON file assembled by the local backend. The export includes:

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

## Draft Review Packs

Open `草稿` / `Drafts` to preview review packs generated by the backend or MCP. A draft can collect user annotations such as "reduce question count", "make explanations more detailed", or "replace unnatural examples".

The revision context endpoint combines the draft, annotations, study record, and an optimization prompt:

```text
GET /api/drafts/:id/revision-context
```

MCP clients can use `get_draft_revision_context` to read the same context and generate the next draft revision without directly changing the monthly resource files.

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
整理下面这些 JLPT 学习内容，生成适合本项目月度归档结构的 review-data JSON。
输出语言：zh-CN, ja, en。
```

Paste your notes, vocabulary explanations, sentences, or JLPT-style questions. Ask Codex to update the matching monthly file under `public/data/review-data/YYYY/MM.json`, then run:

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
5. Ask it to update the matching monthly JSON file only when you want generated vocabulary or grammar imported.
6. Run `npm run build`.

Example prompt:

```text
Read skills/jlpt-chat-review/SKILL.md and use it as the data extraction guide.
Convert the following JLPT vocabulary notes into the matching monthly file under public/data/review-data/YYYY/MM.json.
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
