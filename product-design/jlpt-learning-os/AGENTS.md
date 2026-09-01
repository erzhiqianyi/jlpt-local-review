# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

## Durable Product Direction

- Use the selected "Today learning runway" concept as the visual source of truth.
- Keep JLPT learning modules primary; organize records, plans, persistent learning memory, data, and MCP settings as supporting workflows.
- The web app has no embedded AI. External Agents read scoped data and write proposals through MCP; the UI must show provenance, permissions, sync time, evidence, and an explicit confirmation gate.
- Expand the concept into a complete multi-page interactive prototype rather than a single dashboard mock.
- The learner talks directly with Codex or another external Agent and receives the answer there. After the conversation, the Agent pushes a structured learning summary into this product through MCP. The product must not present its own chat input or imply that it runs AI; it is the receiving, review, storage, practice, and persistent-memory layer. Agent summaries remain proposals until the learner confirms them.
- The study plan should be grounded in the learner's three N1 textbooks (grammar, reading, and listening), with traceable chapter/page tasks. It must include a textbook-foundation phase, a weak-point intensive phase, and a final timed true-test-format simulation phase with next-day analysis and same-type remediation.
- Every calendar date must resolve to date-specific tasks for all three study tracks. Grammar, reading, and listening titles, scopes, reasons, IDs, and later-stage remediation must change with the selected date; never leave reading or listening on a shared fallback task.
- Treat the three New Complete Master books as editable defaults, not a hardcoded plan boundary. Any grammar, reading, or listening book can join the schedule through a structured table of contents; alternate multiple books in the same module, show the source book on every generated task, and accept the same catalog structure from manual entry or MCP write-back.
- Vocabulary records belong to vocabulary notebooks, not question types. Show the notebook as a first-class list column and provide a working notebook filter; question-type analysis belongs to practice/history rather than the vocabulary library.
- Keep vocabulary practice entry inside the “练习” tab. Do not duplicate it with a page-header “开始专项练习” action; the header retains only the vocabulary-record action.
- The Plan page is focus-first: on initial entry, make today's ordered tasks and next action dominant. Keep the exam roadmap, textbook progress, and late-stage schedule available through progressive disclosure instead of expanding every planning layer at once.
- The Today page separates three workflows: Anki-style due memory cards for vocabulary and grammar, the existing textbook plan as a checkbox todo list without a timeline, and external-Agent targeted questions received through MCP. Memory review is recall, not question practice; targeted questions must retain Agent provenance and confirmation state.
- Keep the Today page as an overview. Starting memory review must open a dedicated distraction-free route with no sidebar, utility header, plan todos, or Agent practice content; the focused route owns card reveal and recall rating.
- Keep every learning module list-first, using the vocabulary page as the shared shell: common page actions, four tabs, search/filter/sort toolbar, compact table, and a focused detail preview. Put module-specific players and question interfaces under the “练习” tab instead of making them the default page.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.
