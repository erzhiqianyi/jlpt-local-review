# JLPT Master Deck

A local-first JLPT learning record and review tool. Its primary purpose is to capture words, grammar, sentences, audio, or reading points that a learner does not understand, turn those records into focused practice, and make later review, history management, and progress observation straightforward. The app runs with a local Node backend: public study resources stay in JSON, while accounts, sessions, captured questions, settings, answers, and review progress are stored in local SQLite.

The main learning loop is:

1. Record something you do not understand in the web app, or add it through MCP.
2. Let Codex or another MCP client read the pending records and organize them into structured review material.
3. Practice by module or as a mixed review; answers update the local review schedule.
4. Use History to revisit inputs and attempts, and Data to observe workload and accuracy.

General study generation remains available as a secondary workflow: give `jlpt-study-generator` a target level, available days, daily study time, and focus modules when no source notes are available.

## Features

- A focused capture inbox for unclear words, grammar, sentences, listening, and reading material.
- Direct navigation to Home, Vocabulary, Grammar, Listening, Reading, Mixed Practice, and Data Management for quick study access.
- A focused capture inbox reached from the home page, while metrics, captured-input management, and practice history share one Data Management workspace.
- Vocabulary decks for JLPT words, expressions, and Japanese name readings.
- Module navigation for vocabulary, grammar, listening, reading, and mixed practice.
- Personal listening practice with local audio uploads, four-choice questions, answer checking, and optional explanations.
- Shareable hash routes for each module, question page, word page, About page, and Settings page; browser back and forward navigation work on static hosting.
- A quiet review home with due-work status and a compact exam-date reminder.
- A per-account JLPT planning profile with Shin Kanzen Master N1 Grammar, Reading, and Listening as editable defaults. MCP agents turn the profile and recent study evidence into trackable daily calendar tasks.
- Automatic daily summaries combine calendar completion with practice attempts, accuracy, and elapsed study time; missed work marks the plan for agent revision.
- An N1 question-type guide based on the official JLPT categories, covering vocabulary, grammar, reading, and listening with editable personal solving tips.
- A compact home-page preview links to the question-type index; every type has an independent detail route where its full guidance and personal tip can be read or edited.
- Original N1-format samples for grammar, reading, and listening. Each module has a compact sample index and an independent exercise route; sample answers are deliberately excluded from personal progress.
- Level-appropriate, official-style practice for `文脈規定`, `言い換え類義`, `表記`, `漢字読み`, and `文の文法1`, with Japanese instructions and numbered choices.
- Immediate correct/incorrect judging.
- Structured explanations after each answer: full context, why the answer is correct, per-choice distractor analysis, and a memory point with useful comparisons.
- A focused reading page with an in-page furigana switch, Japanese definitions, learner-language definitions, exam quick notes, collocations, and analysis. Questions and answer choices stay unannotated.
- Multilingual UI and multilingual data support through `localizations`.
- Local username/password accounts backed by SQLite.
- Local-only progress stored in `.local/jlpt.sqlite`.
- Review-pack drafts with in-app preview, user annotations, and revision context for MCP/agent optimization.
- A second skill for generating a general study plan and original practice content without learner-provided notes.
- Visible `AI generated` and `unverified` notices for generated entries that require learner review.
- MCP tools for reading and creating learning captures, plus personalized analysis and review-pack generation.

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

## Frontend Structure

- `src/App.tsx` owns application routing, authenticated session state, and page composition.
- `src/features/` contains page-level modules for home, question types, planning, listening, practice, drafts, settings, and the About/MCP guide.
- `src/domain/` contains reusable JLPT item, question-generation, and calendar helpers.
- `src/i18n/` contains multilingual UI copy, while `src/data/` contains static supporting data.
- `src/lib/` contains infrastructure helpers such as the authenticated API client.
- `src/types.ts` defines the shared frontend domain contracts.

## UI Design Principles

Overview pages are for scanning and navigation. Cards and list rows should contain a title, compact status or count, a short summary, and a route to deeper content. Complete explanations, editing, annotations, history, and complex actions belong on an independent detail page or focused workflow.

Do not solve information density by adding more cards. Prefer page sections, dividers, typography, and row lists; do not nest cards or use a large decorative card to wrap an entire page. When a page has more than four similar information-heavy items, or more than three substantial content sections, review whether it should be split into an index and detail route.

See [docs/ui-design-guidelines.md](docs/ui-design-guidelines.md) for the complete page hierarchy, card usage, responsive behavior, routing, and review checklist.

Main pages have independent hash addresses, for example:

```text
/#/capture
/#/home
/#/history
/#/insights
/#/plan
/#/question-types
/#/vocabulary/questions
/#/vocabulary/words
/#/grammar/questions
/#/grammar/samples
/#/reading/samples/reading-short-01
/#/listening/samples/listening-quick-01
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

The same database stores `learning_captures`, the learner's inbox of unclear material. Each record has a category, optional context, an `inbox` / `processed` / `archived` status, and timestamps. Authenticated clients can use `GET /api/captures`, `POST /api/captures`, and `PATCH /api/captures/:id`; MCP clients use `list_learning_captures` and `create_learning_capture`.

The exam-planning document also stays in SQLite. Its `profile` records the target, dates, availability, materials, current position, and constraints. MCP writes validated daily `tasks`; task completion and practice attempts are combined into `dailySummaries` whenever the plan is read.

Uploaded listening audio stays outside Git in a per-user directory:

```text
.local/listening-audio/<user-id>/
```

The question, choices, correct answer, explanation, and audio metadata are stored in SQLite. Authenticated HTTP requests stream the audio to the browser; MCP can read the question metadata without receiving the binary audio.

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

## Question-Type Guide

The home page contains only a compact preview of the official N1 categories. The question-type index uses concise rows for scanning; each row opens an independent detail route containing the full format description and app-provided solving tip. These tips are study suggestions, not official JLPT guidance.

You can replace any default tip with your own notes. Personal overrides are stored in the current account's `user_settings.settings_json` record in `.local/jlpt.sqlite`; clearing an override restores the app default.

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

After practicing in the app, connect the local MCP server and ask Codex to read the authenticated study record directly:

```text
请使用 jlpt_review MCP 登录我的本地账号，调用 get_study_record 分析弱点，
安排未来 7 天复习计划，并把基于错题生成的内容保存为复习草稿。
```

See [docs/local-backend-mcp.md](docs/local-backend-mcp.md) for authentication, tool details, and a Codex configuration example.

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
