# Product Design QA

- Source visual truth: `design-qa/source-target.png`
- Implementation screenshot: `design-qa/implementation-home-1440-pass2.png`
- Full comparison: `design-qa/home-comparison-pass2.png`
- Mobile evidence: `design-qa/implementation-home-mobile-390.png`, `design-qa/implementation-mobile-menu-390.png`
- Viewport: 1440 × 1024 CSS pixels, device scale factor 1
- Source pixels: 1487 × 1058, normalized to 1440 × 1024 for comparison
- Implementation pixels: 1440 × 1024
- State: desktop Today page, Agent plan awaiting confirmation

## Full-view comparison evidence

The second comparison keeps the selected concept's major composition: a 264px persistent left navigation, 78px utility header, editorial date heading, dominant chronological study runway, compact evidence rail, warm ivory base, indigo primary action, matcha completion state, and lightweight separators instead of nested card grids. The revised implementation adds the weekday badge and restores the larger primary study action and duration label from the source.

## Focused region comparison evidence

- Header and page title: typography, utility status, profile placement, weekday badge, primary action, and hierarchy match the selected direction.
- Agent proposal and confirmation gate: provenance, evidence count, sync time, review link, confirmation action, and persistence explanation remain visible before the study route.
- Learning runway: time labels, numbered timeline, task reasons, source rows, duration, and module tags preserve the same order and density.
- Right rail: weekly completion, evidence summary, and MCP scope remain secondary and compact.
- Secondary pages: all 16 registered routes were opened successfully and retained the same typography, tokens, navigation, row, status, and provenance patterns.

## Required fidelity surfaces

- Fonts and typography: passed. Georgia provides the editorial date treatment; system CJK sans-serif fallbacks keep Chinese and Japanese body text readable. Hierarchy, wrapping, line height, and weights are consistent with the source.
- Spacing and layout rhythm: passed. Major columns, utility header, content padding, task rhythm, dividers, and right-rail density match the source intent without overflow at 1440px.
- Colors and visual tokens: passed. Ivory, charcoal, muted indigo, matcha green, pale sage, amber pending state, and warm-gray separators map consistently. No decorative gradients remain.
- Image quality and asset fidelity: passed. The selected design contains no photographic or illustrative assets. All UI icons use the Phosphor icon library; no placeholder images, custom SVG drawings, emoji, or CSS illustrations are used.
- Copy and content: passed. The interface consistently describes Agent proposals as MCP write-backs, exposes evidence and permissions, and does not claim that the web app calls AI.
- Responsiveness and accessibility: passed. The 390 × 844 evidence shows a usable off-canvas navigation, readable content, keyboard-reachable semantic controls, focusable inputs, reduced-motion support, and no horizontal page clipping.

## Interaction evidence

- Confirmed the Agent plan, then opened the comprehensive review route.
- Selected answer 3 and verified that the answer submission action became enabled and returned the correct-result notice.
- Opened Agent Sync and verified that no web chat composer is present; the screen receives a completed external-Agent summary only.
- Confirmed a pushed summary and verified the `已写入学习记忆` success state.
- Confirmed a proposed learning memory and verified the success state.
- Rechecked MCP status and verified the visible success notice.
- Opened vocabulary, grammar, listening, reading, question types, mixed review, mock exams, drafts, plan, captures, history, mistakes, memory, data, and MCP settings.
- Browser console warnings/errors checked: none.

## Comparison history

### Pass 1

- P2: the implementation omitted the weekday badge and made the primary study action too small, weakening the source hierarchy.
- P2: the duration and task count below the primary action were missing.
- Fix: added the weekday badge, restored a 270px × 56px primary action, and added the 38-minute / 3-task label.

### Pass 2

- Post-fix comparison shows no remaining actionable P0, P1, or P2 differences.
- Remaining P3: implementation body text is slightly smaller and the study runway has marginally more open space than the generated source. This is acceptable for legibility and responsive reuse across the complete page system.

## Final result

final result: passed

## Plan functional-copy audit

- Step 1 — Before: needs improvement. Screenshot: `design-audit/plan-copy/01-before.png`.
- Step 2 — After: passed. Screenshot: `design-audit/plan-copy/02-after.png`.
- Comparison: `design-audit/plan-copy/03-before-after.png`.

### Problem observed in Step 1

- The page explained how to use the page before exposing the task state, including instructions to finish today's work first, expand later, follow task order, and tick completed work.
- Repeated process explanations also appeared in plan settings, calendar guidance, task descriptions, Agent provenance, and the late-stage note.
- These sentences duplicated information already expressed by hierarchy, buttons, checkboxes, ordering, labels, and status values.

### Resolution verified in Step 2

- Removed the instructional page subtitle and focus-banner paragraph.
- Reduced the focus banner to learner data: selected date, current phase, planned time, completion count, and the optional full-cycle disclosure.
- Kept task order visible through layout and the `下一项` state instead of describing the order in prose.
- Removed generic evidence-recording suffixes from task descriptions; retained chapter scope, learning focus, source book, and duration.
- Shortened plan settings, calendar, Agent provenance, and late-stage copy to labels or actual plan data.
- Verified the named explanatory strings are absent while date, stage, duration, task scope, sources, and actions remain present. Browser console errors: none.

### Accessibility and evidence limits

- Visible controls retain text labels, task checkboxes, status values, and non-color cues after copy removal.
- Screenshot and DOM inspection do not establish full keyboard order, screen-reader announcement quality, or color-contrast conformance. Dedicated accessibility testing is still required for those claims.

final result: passed

## Plan first-entry focus audit

- Step 1 — Initial plan page: needs improvement before the change. Screenshot: `design-audit/plan-focus/01-before.png`.
- Step 2 — Focus-first plan page: passed after the change. Screenshot: `design-audit/plan-focus/02-after.png`.
- Comparison: `design-audit/plan-focus/03-before-after.png`.

### Findings tied to Step 1

- The exam roadmap, three phases, four textbook progress blocks, calendar, daily tasks, completion evidence, and late-stage schedule were all expanded at once.
- The primary learner question, “What should I do now?”, did not receive a dominant answer until the lower half of the first viewport.
- The page used a consistent visual system, but six similarly weighted information layers competed for attention.

### Resolution verified in Step 2

- The first viewport now leads with `今天先看这里`, one prominent `开始今天学习` action, the selected date, stage, duration, and completion count.
- Calendar and ordered tasks form the primary two-column workspace. The first unfinished task is marked `下一项` and receives the only tinted task background.
- The exam roadmap and textbook progress are hidden by default behind `查看全周期与教材`; the control expands and collapses the original content successfully.
- Completion evidence is reduced to a three-value strip. Late-stage intensive and mock scheduling remains available in a native disclosure section below the daily workflow.
- Date switching updates the focus banner and task content; the primary start action provides visible feedback; browser console errors: none.

### Accessibility and evidence limits

- Positive visible signals: semantic buttons, `aria-expanded` on the cycle disclosure, native `details/summary` for late-stage information, and text labels in addition to color.
- Screenshot and DOM inspection do not establish full keyboard order, screen-reader announcement quality, or color-contrast conformance. Those require dedicated accessibility testing.

final result: passed

## Learning tabs consistency update

- Reference: `design-audit/learning-tabs-before/overview.png`
- Implemented overview: `design-audit/learning-tabs-after/overview.png`
- Side-by-side evidence: `design-audit/learning-tabs-after/before-after.png`
- Mobile evidence: `design-audit/learning-tabs-after/listening-mobile.png` and `design-audit/learning-tabs-after/reading-mobile.png`
- Viewports: 1440 × 1024 and 390 × 844 CSS pixels.

### Audit finding and resolution

- Before: vocabulary and grammar used a list-first information architecture, while listening opened as a KPI/audio dashboard and reading opened directly inside one exercise. Colors and typography matched, but page anatomy and entry behavior did not.
- After: all four learning modules share the vocabulary page shell: paired header actions, four tabs, search/filter/sort toolbar, compact data table, and a focused detail preview.
- Listening-specific audio, waveform, progress metrics, and type practice remain under `练习`; reading-specific article, strategy rail, furigana toggle, and answer selection remain under `练习`.
- `解析` and `资料` are now visible, functional destinations across all learning modules instead of inactive labels.

### Interaction and responsive evidence

- Listening defaults to `材料列表`; search is visible; `练习` opens the audio studio; play changes to pause.
- Reading defaults to `文章列表`; search is visible; `练习` opens the article; furigana changes from ON to OFF; an answer can be selected and exposes `aria-pressed=true`.
- At 390 × 844, headings, paired actions, tabs, search, filters, and the first three table columns remain readable. The data table intentionally scrolls horizontally for the remaining metadata columns.
- Typography, colors, icons, spacing, separators, states, and focus hierarchy match the existing vocabulary language. No new image assets or decorative card system were introduced.

### Findings

- No actionable P0, P1, or P2 issue remains.
- P3: mobile tables require horizontal scrolling to expose all five fields. This matches the existing vocabulary table behavior and preserves a genuinely comparable cross-module layout.

final result: passed

## Agent Sync scoped update

- Implementation screenshot: `design-qa/implementation-agent-sync-1440.png`
- Mobile evidence: `design-qa/implementation-agent-sync-mobile-390.png`
- Design-system comparison: `design-qa/agent-sync-system-comparison.png`
- Tested state: Codex has already answered externally; a structured learning summary has been pushed through MCP and is awaiting learner confirmation.
- Architecture copy: passed. The page explicitly says the answer was given in Codex, the learning product does not host chat or call AI, and the MCP write-back is a summary draft.
- Core action: passed. `确认入库` changes to `已写入学习记忆`; Ignore, Edit Summary, Refresh, and Copy Source Link provide visible feedback.
- Responsive behavior: passed at 1440 × 1024 and 390 × 844. On mobile, the selected sync record leads into the source and summary before the non-sticky review controls, avoiding an overlaid action bar.
- Visual consistency: passed. The scoped screen reuses the selected system's navigation, editorial typography, ivory surface, indigo selection, matcha sync state, thin separators, compact evidence rail, and low-radius controls. The comparison uses different product states, so it supports system-level consistency rather than pixel equivalence.

## Three-textbook plan scoped update

- Source visual truth: `design-qa/source-target.png` plus the learner-provided existing Plan-page screenshot.
- Implementation screenshot: `design-qa/implementation-plan-textbooks-1440.png`
- Mobile evidence: `design-qa/implementation-plan-textbooks-mobile-390.png`
- Full design-system comparison: `design-qa/plan-system-comparison.png`
- Viewports: 1440 × 1024 and 390 × 844 CSS pixels, device scale factor 1.
- State: 14-week N1 plan, phase 1 selected, September 1 selected, no tasks completed.

### Full-view comparison evidence

The implementation keeps the selected concept's persistent navigation, compact utility header, editorial page heading, ivory base, indigo primary state, matcha completion evidence, thin separators, compact calendar, and three-column planning workspace. The new information hierarchy intentionally expands above the calendar to expose the examination target, three phases, and the three source textbooks before day-level tasks.

### Focused region evidence

- Roadmap: textbook foundation, intensive training, and true-test-format simulation are visible as a single ordered sequence with dates and week counts.
- Textbook sources: grammar, reading, and listening each show exact book scope, pacing, and progress without promotional card treatment.
- Calendar: September contains only valid dates 1–30; weekly intensive days use a distinct amber marker.
- Daily tasks: September 1 and 2 resolve to concrete grammar pages/lessons, reading skills/pages, listening work, duration, and evidence expectations.
- Final preparation: the right rail shows intensive dates, three timed simulations, next-day error analysis, and the final taper.

### Interaction evidence

- Switched to 真题模拟 and verified it opened November 16 with the 110-minute language/reading block, 55-minute listening block, and 20-minute quick review.
- Used month navigation to return to October 19 and verified the intensive-training task set.
- Selected September 2 and verified its different chapter-level task set.
- Completed one task and verified progress changed to 1 / 3 and 30 minutes.
- Verified the three source books and all three phases are visible at 390 × 844 without horizontal clipping.

### Findings and comparison history

- Pass 1: no actionable P0, P1, or P2 visual mismatch remains.
- P3: the expanded planning context makes the page vertically longer than the earlier plan screenshot. This is intentional progressive disclosure; the exam roadmap and textbook scope must precede daily execution.
- Typography, spacing, colors, icons, copy, image quality, responsiveness, and core affordances: passed. No photographic assets are used in the interface; supplied book photos inform plan data and are not reproduced in the product.

final result: passed

## Vocabulary header practice-entry removal

- Source visual truth: `design-audit/vocabulary-header/01-before.png`.
- Implementation screenshot: `design-audit/vocabulary-header/02-after.png`.
- Focused comparison: `design-audit/vocabulary-header/03-header-comparison.png`.
- Viewport: 1440 x 1024 CSS pixels. Source and normalized implementation are both 1440 x 1024 pixels; the browser capture was normalized from a 2x-density surface before comparison.
- State: vocabulary library, `词条列表` selected, all wordbooks visible.

### Full-view and focused comparison evidence

- The header now retains only `添加记录`; the duplicate `开始专项练习` action is absent.
- Typography, spacing, ivory background, indigo control treatment, breadcrumbs, tabs, filters, table, and detail preview remain unchanged.
- The focused header comparison was sufficient because the requested change affects only the page action group and introduces no new assets or responsive structure.

### Interaction and runtime evidence

- Browser DOM confirms no `开始专项练习` button exists on the vocabulary page.
- The `练习` tab remains selectable and exposes `今日推荐` and `继续练习`, preserving the sole practice entry path.
- Browser runtime logs contain no error-level entries. Build passed; Sites tests passed 4/4.

### Findings and comparison history

- Pass 1: no actionable P0, P1, or P2 mismatch. The requested duplicate action was removed without disturbing the remaining header action or practice-tab interaction.
- Fonts and typography: unchanged. Spacing and layout rhythm: passed. Colors and tokens: unchanged. Image quality and assets: no raster imagery involved. Copy and content: duplicate practice CTA removed; all remaining labels retained.

final result: passed

## Today memory-review workspace and plan checklist

- Selected design source: `design-audit/today-memory/01-selected-mock.png`.
- Implementation screenshot: `design-audit/today-memory/02-implementation.png`.
- Full comparison: `design-audit/today-memory/03-comparison.png`.
- Viewport: 1440 x 1024 CSS pixels. The in-app browser capture was normalized from its 2x-density surface before comparison.
- State: September 1, no cards reviewed, no plan items completed, external-Agent practice pack received.

### Full-view and focused comparison evidence

- The selected two-column hierarchy is preserved: memory review is the dominant workspace and the original textbook plan is retained as a compact `今日待办` checklist without a timeline.
- Yesterday's scheduled capture status and the day's aggregate progress remain visible above the work area without explanatory onboarding copy.
- The targeted-question pack is visually and semantically separated below memory review. Its provenance explicitly states that Codex Agent wrote it back through MCP.
- Navigation, editorial serif headings, ivory background, indigo actions, matcha evidence states, thin separators, compact radii, and Phosphor icons remain consistent with the existing prototype.

### Interaction and runtime evidence

- `显示答案` reveals grammar connection, meaning, memory note, and example.
- Selecting `记得` advances to the next card, changes the remaining count from 16 to 15, and schedules the next review.
- Checking the first textbook todo changes its completion state to 1 / 3.
- `查看练习` routes to the existing targeted comprehensive-practice page at `#/mixed`.
- Browser runtime logs contain no error-level entries. Production build passed; Sites tests passed 4/4.

### Findings and comparison history

- Pass 1: no actionable P0, P1, or P2 mismatch remains.
- The implementation is slightly denser than the concept image so the memory card, three plan items, and Agent practice handoff stay visible in one desktop viewport; the hierarchy and interaction model remain unchanged.
- Responsive rules collapse the study workspace to one column, wrap the session strip, and convert rating controls to a two-by-two grid on narrow screens.

final result: passed

## Focused memory-review route

- Source visual truth: `design-audit/focused-review/01-before.png` (memory review embedded in the Today dashboard).
- Today overview implementation: `design-audit/focused-review/02-today-overview.png`.
- Focused review implementation: `design-audit/focused-review/03-review-front.png`.
- Full flow comparison: `design-audit/focused-review/04-flow-comparison.png`.
- Mobile implementation: `design-audit/focused-review/07-review-mobile-final.png`.
- Viewports: 1440 x 1024 desktop and 390 x 844 mobile CSS pixels. Browser output was normalized from the in-app capture surface for equal-size visual comparison.
- State: 16 cards due, first grammar card unrevealed; Today todos and Agent practice remain unchanged.

### Full-view and focused comparison evidence

- The Today page now presents review as one legible summary with due counts, module split, expected duration, and one primary action; the original plan checklist and targeted-practice handoff remain separate.
- Starting review opens `#/review`, which removes the sidebar, MCP utility header, plan tasks, and Agent pack. Only exit, progress, one card, and the current recall action remain.
- The focused card retains the established ivory, indigo, matcha, serif-heading, thin-divider, and low-radius design language without importing dashboard density into the study state.
- The focused desktop and mobile captures make the typography, card proportions, source label, progress, and primary action readable enough for direct inspection; no additional crop comparison was required.

### Interaction and runtime evidence

- `开始复习` routes from `#/today` to `#/review`.
- `显示答案` reveals connection, meaning, memory note, example, and four recall ratings.
- Selecting `记得` advances from 1 / 16 to 2 / 16 and loads `纏う`.
- `退出复习` returns to `#/today`.
- Browser runtime logs contain no error-level entries. Production build passed; Sites tests passed 4/4.

### Required fidelity surfaces

- Fonts and typography: editorial serif display remains consistent; mobile term size was reduced to preserve one-line recognition.
- Spacing and layout: dashboard density is reduced and the review route centers one 820-pixel card with generous surrounding whitespace.
- Colors and tokens: existing paper, surface, line, indigo, green, and muted tokens are reused.
- Image quality and assets: no raster imagery is required; all interface icons use the existing Phosphor library.
- Copy and content: labels describe state and source data; no instructional paragraph is needed to operate the review.

### Comparison history

- Pass 1 found a P2 mobile typography issue: `～ざるを得ない` wrapped across two lines and weakened term recognition.
- Fix: reduced the mobile display size to 36 pixels, tightened card padding, and kept the term on one line.
- Pass 2 (`07-review-mobile-final.png`) shows the complete term on one line with no overlap or clipping. No actionable P0, P1, or P2 issue remains.

final result: passed
