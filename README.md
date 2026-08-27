# JLPT Master Deck

A personal JLPT vocabulary review tool built from your own study chats. The app runs as a static Vite site, stores progress in the browser, and can be deployed to Cloudflare Pages.

The intended workflow is simple:

1. Chat with Codex or Claude Code about words, sentences, grammar, or JLPT questions you do not understand.
2. Use the included skill prompt to turn those chats into structured review data.
3. Put the generated data into `public/data/review-data.json`.
4. Practice in the local web app. Your answers and progress stay in browser storage.

## Features

- Vocabulary decks for JLPT words, expressions, and Japanese name readings.
- Practice modes for JLPT `文字・語彙`, meaning checks, kana-to-kanji, and kanji-to-kana.
- Immediate correct/incorrect judging.
- Full explanations after each answer.
- Optional furigana display for review cards and answer explanations. Questions and answer choices stay unannotated.
- Multilingual UI and multilingual data support through `localizations`.
- Local-only progress with `localStorage`.
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

## Using Codex

Install or copy the included skill from:

```text
skills/jlpt-chat-review/
```

If you use Codex with local skills, copy it into your Codex skills directory:

```bash
mkdir -p ~/.codex/skills
cp -R skills/jlpt-chat-review ~/.codex/skills/
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

## Using Claude Code

Claude Code does not need the Codex skill system. Use the same instructions manually:

1. Open this repository in Claude Code.
2. Tell Claude Code to read `skills/jlpt-chat-review/SKILL.md`.
3. Give it your study chat or notes.
4. Ask it to update `public/data/review-data.json` following `skills/jlpt-chat-review/references/review-schema.md`.
5. Run `npm run build`.

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
