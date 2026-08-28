# Local Backend And MCP Design

This branch moves the app from browser-only storage to a local backend.

## Storage Split

- `public/data/review-data/YYYY/MM.json` stays as the seed resource layer for vocabulary, grammar, question source material, examples, explanations, tags, and generated practice content.
- `.local/jlpt.sqlite` stores personal state: users, sessions, display settings, answers, review scheduling, mastery status, exam plans, and future private notes.
- `.local/listening-audio/<user-id>/` stores user-uploaded listening audio. Its question metadata and ownership stay in SQLite.
- Generated AI review packs should first be written as drafts, then promoted into the JSON resource layer after review.
- Review-pack drafts, user annotations, and revision context are stored in SQLite so a user can preview a generated pack, leave notes, and send those notes back to an agent for improvement.

This keeps public learning resources portable while private learning records remain local and ignored by Git.

## Local Auth

The first version uses local username/password accounts. A user can choose any username and password that match the local validation rules. Passwords are salted and hashed with `scrypt`; sessions use bearer tokens stored by the browser.

This is intended for localhost. A future remote deployment should replace it with OAuth 2.1 or a trusted identity provider and scoped authorization.

## HTTP API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`
- `GET /api/review-data`
- `GET /api/study-state`
- `PUT /api/study-state/settings`
- `GET /api/study-plan`
- `PUT /api/study-plan/profile`
- `POST /api/study-plan/generated`
- `PATCH /api/study-plan/tasks/:id`
- `POST /api/answers`
- `GET /api/study-record`
- `GET /api/analysis/weak-points`
- `GET /api/listening-questions`
- `POST /api/listening-questions`
- `GET /api/listening-questions/:id/audio`
- `DELETE /api/listening-questions/:id`
- `GET /api/drafts`
- `POST /api/drafts`
- `GET /api/drafts/:id`
- `POST /api/drafts/:id/annotations`
- `GET /api/drafts/:id/revision-context`

All study data endpoints require `Authorization: Bearer <token>`.

Local development uses frontend port `5191` and backend port `8791` on this branch.

## MCP Tools

The local MCP server is `server/mcp-server.mjs`. It uses the same JSON resources and SQLite state as the HTTP backend.

Implementation details:

- `server/mcp-server.mjs` is a STDIO JSON-RPC MCP server. It handles `initialize`, `tools/list`, and `tools/call`.
- `server/storage.mjs` is shared by the HTTP API and MCP server, so both surfaces aggregate the same monthly JSON resources and SQLite user data.
- Authentication is local-session based. The MCP client calls `login` with the app username and password, then passes the returned token to personal-data tools.
- Generated review material is saved as a draft in SQLite. User annotations are attached to the draft, and `get_draft_revision_context` returns the draft, annotations, study record, and optimization prompt for the next agent pass.

Planned tool boundary:

- `login`: authenticate locally and return a token.
- `get_review_data`: read seed resources.
- `get_study_record`: read the combined personal study record.
- `get_study_plan`: read the current profile, generated tasks, completion state, and automatic daily summaries.
- `get_plan_generation_context`: read the basic profile together with weak points, recent attempts, current tasks, and automatic daily summaries.
- `save_generated_study_plan`: write a validated daily calendar plan. Task dates must stay within the study period, IDs must be unique, and each day's total must stay within the saved time limit.
- `list_due_reviews`: find items that need review.
- `list_listening_questions`: read personal listening prompts, choices, answers, explanations, and audio metadata without returning audio bytes.
- `analyze_weak_points`: summarize weak vocabulary, wrong-answer patterns, due items, and mastery.
- `generate_daily_review_pack`: create a personalized daily review-pack draft.
- `create_review_pack_draft`: save generated review-pack content as a draft for in-app preview.
- `list_review_pack_drafts`: list saved drafts.
- `get_review_pack_draft`: read a draft with user annotations.
- `add_draft_annotation`: attach user feedback to a draft.
- `get_draft_revision_context`: read the draft, annotations, study record, and optimization prompt for the next agent revision.

Write-capable MCP tools are limited to review drafts and the private calendar plan. Promotion into official monthly files under `public/data/review-data/YYYY/MM.json` still requires an explicit user review step.
