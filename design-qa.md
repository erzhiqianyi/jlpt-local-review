# Mobile Practice Design QA

## Evidence

- Source visual truth: `/tmp/codex-remote-attachments/01a0434e-6b44-7ed1-9c45-1d24150ee964/74EFE161-00BF-429D-BB4A-826B93C845DF/1-写真1.jpg`
- Implementation screenshot: `/Users/itsuki/Documents/ChatGPT/JLPT-local-backend-auth-mcp/.design-qa/mobile-practice-390x844.png`
- Source pixels: 508 x 1280.
- Implementation pixels and CSS viewport: 390 x 844 at device scale factor 1.
- State: authenticated vocabulary practice, N1/N2 vocabulary filter, first answered question.
- Comparison method: both full-view images were opened together at native density. The source is an existing narrower-desktop layout reference, while the requested implementation intentionally changes its information architecture rather than reproducing every visible control.

## Full-View Comparison

The implementation preserves the source's quiet green, white, and warm-neutral palette, compact progress controls, Japanese question hierarchy, and vertically stacked answer targets. It intentionally removes the source's global nav row, persistent search field, three-way mode control, standalone filter bar, outer card frame, and mobile GitHub action from the task viewport. These controls now open as separate full-screen tasks.

## Focused Comparison

Header/task controls and the complete question/choice region are readable in the full-view captures, so separate crops were not required. Lucide icons replace text glyph controls, all tap targets are at least 40px, and the answer rows retain the source's stable dimensions and restrained borders.

## Findings And Iterations

### Iteration 1

- P1: Full-screen panels were constrained to the sticky header because `backdrop-filter` created a containing block. Fixed by removing the header blur; menu, search, task switcher, and filter now measure 390 x 844 and cover the viewport.
- P2: Mobile review initially exposed desktop summary, history, AI prompt, and every full answer explanation together. Fixed with a focused result list and a single-answer detail state.

### Final Pass

- Fonts and typography: system Japanese fallback, weights, line heights, and wrapping are consistent with the reference and remain readable at 390px.
- Spacing and layout: one task occupies the viewport; stable progress and answer dimensions produce no horizontal overflow.
- Colors and tokens: restrained green, warm white, neutral borders, and semantic result colors remain consistent.
- Image quality and assets: the screen contains no raster content requiring reproduction; interface icons use Lucide rather than approximated glyphs.
- Copy and content: current module, task, active filter, progress, instructions, and choices are all visible without exposing unrelated controls.
- Interactions tested: module menu, global search, task switching, deck filtering, review list, single-answer review, and route return.
- Console errors: none.
- Desktop regression: 1440px navigation and search remain visible, mobile controls remain hidden, and no horizontal overflow occurs.

No actionable P0, P1, or P2 findings remain. The footer is retained as a P3 consistency choice because it is present in the reference and existing application.

final result: passed

---

# Mobile Memory Card Viewport Height QA — 2026-09-01

## Evidence

- iPhone 16 Pro Max, 440 × 956 front: `/Users/itsuki/Documents/ChatGPT/JLPT/.design-qa/prototype-migration/10-review-height-440x956-front.png`.
- Short mobile viewport, 390 × 667 revealed: `/Users/itsuki/Documents/ChatGPT/JLPT/.design-qa/prototype-migration/11-review-height-390x667-back.png`.

## Verified Behavior

- The review stage consumes exactly the viewport below the 64px header and 3px progress bar.
- The card height is the remaining viewport height after 14px top spacing and an 80px bottom action dock, including the device safe area.
- At 440 × 956 the card is 795px high; at 390 × 667 it contracts to 506px without creating page scroll.
- Front and revealed faces share the same calculated height; long answer content remains internally scrollable.
- Reveal and rating controls remain fully visible at the bottom of both viewport sizes.
- Browser logs contained no warning, request failure, or render error; `npm run build`, `npm run lint`, and `git diff --check` passed.

No actionable P0, P1, or P2 layout findings remain.

final result: passed

---

# Mobile Memory Card Stable Flip Frame QA — 2026-09-01

## Evidence

- Front face: `/Users/itsuki/Documents/ChatGPT/JLPT/.design-qa/memory-card-layout/24-fixed-frame-front.png`.
- Back face: `/Users/itsuki/Documents/ChatGPT/JLPT/.design-qa/memory-card-layout/25-fixed-frame-back.png`.
- Same-viewport comparison: `/Users/itsuki/Documents/ChatGPT/JLPT/.design-qa/memory-card-layout/26-fixed-frame-comparison.png`.

## Verified Behavior

- The 440px mobile viewport uses one 360px outer frame and one 342px inner flip surface for both faces.
- Before reveal: top `240.17px`, bottom `600.17px`, height `360px`.
- After reveal: top `240.17px`, bottom `600.17px`, height `360px`.
- The back face keeps its answer fields inside a 341px scroll viewport (`663px` content height), so long answers do not resize the card.
- The frame no longer animates `min-height`; only the existing Y-axis rotation transition runs.
- No warning or error log appeared during the final front-to-back interaction.

No actionable P0, P1, or P2 layout findings remain.

final result: passed

---

# Focused Memory Card Nyashiki Reference QA — 2026-09-01

## Evidence

- Source URL: `https://nyashiki.erzhiqian.cc/#study`.
- Source visual truth: `.design-qa/memory-card-layout/05-nyashiki-card-front-close.png` and `.design-qa/memory-card-layout/07-nyashiki-card-back.png`.
- Browser-rendered implementation: `.design-qa/memory-card-layout/15-final-front-440.png`, `.design-qa/memory-card-layout/16-final-flip-mid-440.png`, and `.design-qa/memory-card-layout/17-final-back-440.png`.
- Combined comparison: `.design-qa/memory-card-layout/18-reference-main-comparison.png`.
- Source and implementation pixels: 440 × 861 per state. CSS viewport: 440 × 861. The combined 2 × 2 canvas is rendered at macOS @2x (1760 × 3444); every tile preserves the same normalized size and crop.
- State: authenticated focused memory review, configured reading on the front and configured summary/details on the back.

## Full-View And Focused Comparison

- The front now follows the reference's nested rounded frame, centered primary term, close reading cue, quiet reveal instruction, and vertically calm composition.
- The back follows the reference's top summary block followed by a strong primary meaning and divided supporting fields. Fields not present in the current item remain skipped, and long configured content scrolls inside the card.
- The same combined image is sufficient for the focused comparison because the primary term, reading, summary block, field labels, dividers, radii, and fixed action rows remain legible at the normalized width.
- The JLPT card intentionally retains its indigo action color and fixed bottom reveal/rating controls. The user requested Nyashiki's layout and animation, while earlier requirements explicitly fixed these controls to the viewport bottom.

## Findings And Iterations

### Iteration 1

- P1: The main project replaced one face with another and had no physical flip. Fixed by keeping both faces in one 3D scene and applying the reference's measured `0.65s cubic-bezier(.2, .75, .25, 1)` Y-axis transition.
- P2: The front reading used a wide divider and two-column form row. Fixed with a compact centered cue directly under the primary term and a quiet reveal hint.
- P2: The back began as a flat list with no summary hierarchy. Fixed by grouping the selected original, reading, normalized form, level, and part of speech into a soft top summary when present, followed by meaning and divided detail rows.
- P2: The first rating-button entrance animation replaced the fixed horizontal centering transform and caused mobile overflow. Fixed by limiting the entrance animation to opacity; the final 440px capture has no horizontal overflow and all four buttons fit in one row.

### Final Pass

- Fonts and typography: the project keeps its existing Japanese Mincho stack and configurable small/standard/large scale; hierarchy and wrapping match the reference pattern without copying its brand typeface.
- Spacing and layout rhythm: inset face, rounded outer frame, centered front cluster, top-aligned back summary, internal detail scrolling, and fixed bottom controls remain stable at 440px.
- Colors and visual tokens: existing paper, indigo, ink, and neutral-divider tokens are retained as requested; only the reference's layout hierarchy is adopted.
- Image quality and assets: neither card needs raster imagery or decorative assets; existing Lucide action icons remain crisp.
- Copy and content: selected front/back fields still come from Settings; example sentences remain back-only; missing fields are skipped.
- Primary interactions tested: clicking the card, clicking an empty non-return area of the front stage, completing the 3D flip, scrolling long back content, and rendering all four fixed rating controls.
- Animation/accessibility: the final transform is `rotateY(180deg)` with the measured reference timing; keyboard Enter/Space remains supported and reduced-motion users receive an effectively instant state change.
- Browser console warnings/errors: none. Build, lint, and whitespace checks passed.

No actionable P0, P1, or P2 findings remain.

final result: passed

---

# Mobile Practice History Density QA — 2026-09-01

## Evidence

- Source visual truth: `/tmp/codex-remote-attachments/01a05c32-b5fb-75c0-b678-9a00948da477/87EDBDB8-9460-4180-A987-B861822ACE32/1-写真1.jpg` (mobile word-entry list design language) and `/tmp/codex-remote-attachments/01a05c32-b5fb-75c0-b678-9a00948da477/87EDBDB8-9460-4180-A987-B861822ACE32/2-写真2.jpg` (practice-history screen before the change).
- Browser-rendered implementation: `/Users/itsuki/Documents/ChatGPT/JLPT/.design-qa/history-mobile-390-final.png`.
- Combined comparison: `/Users/itsuki/Documents/ChatGPT/JLPT/.design-qa/history-mobile-design-comparison.png`.
- Source pixels: 588 x 1280, including Safari chrome. Implementation pixels and CSS viewport: 390 x 844 at device scale factor 1.
- Density normalization: the reference and implementation were compared at a common 390px content width; browser chrome and differing content were treated as non-fidelity regions.
- State: authenticated practice-history list with 11 temporary visual-QA attempts; the original empty attempt history was restored immediately after capture.

## Full-View And Focused Comparison

- The history screen now shares the word-entry screen's app-header-to-toolbar transition, full-width divided list, flat surfaces, restrained green hierarchy, warm-neutral separators, and right-aligned progress cue.
- All three filters remain visible in one row at 390px. The filter area measures 390 x 99px and begins immediately below the 49px app header.
- History rows measure 74.4px, show module and compact date/question/duration metadata on the left, and keep the score plus chevron stable on the right. Ten rows fit in the 844px viewport without horizontal overflow.
- The combined full-view comparison is sufficient for the toolbar, typography, row separators, alignment, and density; no smaller focused crop was needed because these surfaces remain legible at the normalized width.

## Findings And Iterations

### Iteration 1

- P2: The first browser capture retained 32px of blank space between the app header and history filters, unlike the word-entry reference. The mobile data-management and history top padding were collapsed; the final filter now starts at y=49 directly below the header.

### Final Pass

- Fonts and typography: existing system Chinese/Japanese fallbacks are retained; module and score use the same compact optical weight as the word-entry list, while metadata remains readable and truncates on one line.
- Spacing and layout rhythm: three equal filter tracks, 8px gaps, flat full-width sections, and 74.4px rows create a consistent scan rhythm with no card gaps or excess top padding.
- Colors and visual tokens: existing green titles, warm paper background, muted metadata, pink chevrons, and neutral separators are reused without new palette drift.
- Image quality and assets: the screen contains no raster content; the existing Lucide chevron remains the interface cue.
- Copy and content: module, result, time range, visible count, timestamp, question count, duration, score, and accuracy remain visible.
- Primary interactions tested: module filter changed the list from 11 attempts to 4 grammar attempts, resetting to all restored 11, and selecting a record opened its detail state.
- Browser console errors: none. Document width remained 390px at the 390px viewport.
- Build checks: `npm run build`, `npm run lint -- --quiet`, and `git diff --check` passed.

No actionable P0, P1, or P2 findings remain.

final result: passed

---

# Vocabulary Wordbook Filter QA — 2026-09-01

## Evidence

- Source visual truth: `/tmp/codex-remote-attachments/01a05b81-c4da-7d20-9546-fd24905ee232/D26FED4C-5F8A-4D86-9B0E-5DBD4A27B16D/1-写真1.jpg`.
- Browser-rendered implementation: `/Users/itsuki/Documents/ChatGPT/JLPT/.design-qa/mobile-nav-merged-filter-390.png`.
- Source pixels: 588 × 1280. Implementation pixels and CSS viewport: 390 × 844 at device scale factor 1.
- Density normalization: both captures were inspected together at a common 390px display width; their aspect ratios differ only because the source includes Safari chrome.
- State: authenticated vocabulary entry list with deck filter `全部` and wordbook filter `全部单词本`.

## Full-View And Focused Comparison

- The implementation preserves the source hierarchy while consolidating the task and filter controls into one sticky top navigation row above the sort/count toolbar and compact entry list.
- The previous second filter navigation row was removed. The top-right area now contains one task control and one compact filter control without clipping or horizontal overflow at 390px.
- A separate focused crop was unnecessary because the top filter labels, icons, borders, and spacing are legible in the full-view captures.
- Fonts and typography: existing system Japanese/Chinese fallbacks, compact weights, truncation, and line heights remain consistent.
- Spacing and layout rhythm: the two compact actions share the existing pill size, border, radius, and gap; removing the second row moves the list content upward by one control-row height.
- Colors and visual tokens: the existing pink outline and white surface are reused; no new token drift was introduced.
- Image quality and assets: the screen has no raster content; the new control uses the existing Lucide icon system.
- Copy and content: `单词本` and `全部单词本` are localized in Chinese, Japanese, and English.

## Interactions And Regression Checks

- Mobile: opened the single top filter sheet, selected `N1/N2 词汇` in both the category and wordbook sections without closing the sheet, observed the top chip update and the list count change from 244 to 45, then restored both filters.
- Desktop: confirmed the wordbook select is visible and exposes the same choices; selecting `N1/N2 词汇` produced 45 entries.
- The selected wordbook filters both the library and its generated practice question pool through `wordbook_ids`.
- Browser console warnings/errors: none on mobile or desktop.
- Build checks: `npm run build`, `npm run lint`, and `git diff --check` passed.

No actionable P0, P1, or P2 findings remain. No P0/P1/P2 visual fix iteration was required after the first browser capture.

final result: passed

---

# Full Prototype Migration QA — 2026-09-01

## Evidence

- Today comparison: `/Users/itsuki/Documents/ChatGPT/JLPT/.design-qa/prototype-migration/comparison-today-final.png`
- Focused review comparison: `/Users/itsuki/Documents/ChatGPT/JLPT/.design-qa/prototype-migration/comparison-review-final.png`
- Verified application: `http://localhost:5193/#/home`

## Verified Behavior

- Migrated the complete prototype information architecture: Today, five learning modules, three review tools, plan, Agent sync, history, mistakes, learning memory, data, and MCP settings.
- Today uses real due vocabulary and grammar cards, real textbook-plan tasks, and external-Agent daily practice write-backs.
- Memory review opens in a clean shell-free page, reveals the actual reading, meaning, memory point, and example, then offers four spaced-review ratings.
- Memory ratings persist separately through the dedicated progress endpoint; the compatibility fallback keeps the currently running pre-restart backend functional without adding cards to visible question-practice state.
- Direct route checks passed for all migrated routes. The focused review front/back interaction passed.
- Browser console contained no warnings or errors in the final clean session.
- `npm run build`, `npm run lint`, backend module syntax checks, and a temporary backend health check passed.

No actionable P0, P1, or P2 findings remain.

final result: passed

---

# Main Branch Responsive Navigation QA

## Evidence

- Main branch test URL: `http://localhost:5193/#/home`.
- Mobile menu screenshot: `/Users/itsuki/Documents/ChatGPT/JLPT/.design-qa/navigation-mobile-430-main.jpg`.
- Desktop navigation screenshot: `/Users/itsuki/Documents/ChatGPT/JLPT/.design-qa/navigation-desktop-960-main.jpg`.
- Chrome desktop widths: 960px and 1440px.
- Chrome mobile viewport: 430 x 932px.

## Verified Behavior

- The full desktop study navigation remains visible from 768px upward; a zoomed desktop viewport no longer falls into the phone header at 960px.
- The full search field appears at 1280px and above, while narrower desktop layouts preserve navigation space.
- The phone header exposes Search and Menu as focused actions.
- The phone menu uses an opaque white full-screen surface and groups destinations into Study and Management.
- The 430px menu measured exactly 430 x 932px and the document had no horizontal overflow.
- The username field pattern is valid under the browser's Unicode-aware regular-expression parser.

No actionable P0, P1, or P2 findings remain.

final result: passed

---

# Entry Index And Detail QA

## Evidence

- Desktop grammar entry index: `/Users/itsuki/Documents/ChatGPT/JLPT-local-backend-auth-mcp/.design-qa/grammar-entry-list-desktop.png`
- Detail route tested: `#/grammar/words/n1-踏んで`.
- Chrome desktop and 390px mobile layouts.

## Verified Behavior

- The study mode previously labeled Reading is now Entries.
- The entry route without an item ID displays a scannable single-column index.
- Each index row stacks title, reading, and short meaning instead of pairing unrelated information on one line.
- Selecting an item opens the existing detail content on its own route.
- Detail sections follow one vertical order: Japanese explanation, localized explanation, exam note, and analysis.
- The normal grammar entry workflow no longer displays the official-sample promotion.
- Back-to-index navigation, mobile layout, and overflow checks passed.

No actionable P0, P1, or P2 findings remain.

final result: passed

---

# Single-Column Practice QA

## Evidence

- Desktop vocabulary practice: `/Users/itsuki/Documents/ChatGPT/JLPT-local-backend-auth-mcp/.design-qa/vocabulary-single-column-desktop.png`
- Chrome desktop width: 1920 CSS px.
- Chrome mobile width: 390 CSS px.

## Verified Behavior

- The persistent desktop side panel was removed; the question is now the only primary visual region.
- Practice, reading, and analysis remain available as quiet tabs above the question.
- Deck selection shows only the current value and expands into a menu on demand.
- Switching mode and deck works and preserves the existing routes.
- Mobile keeps its focused current-task controls and full-screen selectors.
- No horizontal overflow or current console warning/error was observed.

No actionable P0, P1, or P2 findings remain.

final result: passed

---

# Restored Study Navigation QA

## Correction

The four-step learning loop remains the product model, but the top navigation now prioritizes rapid access to JLPT study types. Capture remains a home-page entry rather than replacing Home or subject modules. Data overview, input management, and practice history are consolidated into one Data Management page.

## Evidence

- Mobile home: `/Users/itsuki/Documents/ChatGPT/JLPT-local-backend-auth-mcp/.design-qa/home-restored-mobile.png`
- Desktop home: `/Users/itsuki/Documents/ChatGPT/JLPT-local-backend-auth-mcp/.design-qa/home-restored-desktop.png`
- Chrome desktop width: 1905 CSS px.
- Chrome mobile layout: 375 CSS px after the requested responsive override.

## Verified Behavior

- Desktop navigation directly exposes Home, Vocabulary, Grammar, Listening, Reading, Mixed Practice, and Data Management.
- Mobile navigation exposes the same study destinations in its focused menu, followed by supporting tools.
- Home restores the product overview, adaptive countdown, status summary, module entry list, and official question-type preview.
- The capture action opens the focused recording workflow without adding another persistent top-level item.
- Data Management switches between Overview, Inputs, and Practice History; existing input status actions remain available.
- No horizontal overflow or console warning/error was observed.

No actionable P0, P1, or P2 findings remain.

final result: passed

---

# Home Plan Dashboard QA

## Evidence

- Source reference: user-provided Chrome screenshot of the existing home layout at 125% browser zoom.
- Desktop result: `/Users/itsuki/Documents/ChatGPT/JLPT/.design-qa/home-dashboard-desktop-main.jpg`.
- Mobile result: `/Users/itsuki/Documents/ChatGPT/JLPT/.design-qa/home-dashboard-mobile-main.jpg`.
- Main branch test URL: `http://localhost:5193/#/home`.

## Verified Behavior

- Plan is a visible primary navigation item on desktop and the second item in the mobile Study group.
- Home leads with today's plan, overall completion, today's task count, and up to three concise task rows.
- The plan action opens `#/plan`, where calendar tracking and basic information remain separate from the dashboard.
- Accounts without generated tasks receive a compact Create Plan state instead of an empty progress display.
- Capture and mixed review remain available as secondary quick actions.
- The 1092px desktop layout and 430px mobile layout have no horizontal overflow.
- The desktop result was checked at 125% browser zoom with realistic plan progress; mobile preserves one primary reading column.

No actionable P0, P1, or P2 findings remain.

final result: passed

---

# Draft And Account Navigation QA

## Evidence

- Desktop Drafts tab: `/Users/itsuki/Documents/ChatGPT/JLPT/.design-qa/data-management-drafts-main.jpg`.
- Mobile username navigation: `/Users/itsuki/Documents/ChatGPT/JLPT/.design-qa/username-navigation-mobile-main.jpg`.
- Main branch test URL: `http://localhost:5193/#/home`.

## Verified Behavior

- Drafts no longer appears in desktop or mobile global navigation.
- Data Management includes Drafts as its fourth tab with the current draft count.
- Empty Drafts displays one concise state and one Create Daily Draft action.
- The legacy `#/drafts` route remains compatible and opens Data Management with Drafts selected.
- Settings no longer appears as a text navigation item; the current username is the direct Settings button.
- Username navigation opens `#/settings` and shows an active state on the Settings page.
- The desktop layout at 1092px and mobile layout at 430px have no horizontal overflow.

No actionable P0, P1, or P2 findings remain.

final result: passed

---

# Mobile Focused Review Spacing QA — 2026-09-01

## Evidence

- User reference: Chrome iPhone 16 Pro Max capture showing excessive empty space below the review header.
- Updated 440 × 956 result: `/Users/itsuki/Documents/ChatGPT/JLPT/.design-qa/prototype-migration/09-review-mobile-compact-normalized.png`.

## Verified Behavior

- The memory card starts 16px below the progress bar instead of being vertically centered in the viewport.
- Card, reveal action, progress header, and mobile safe-width layout remain intact.
- The rating request no longer probes an unavailable progress route, removing the visible 404 from the current backend.
- Browser DOM contained the full review state and the final clean page had no warning or error logs.
- `npm run build`, `npm run lint`, and the backend syntax check passed.

No actionable P0, P1, or P2 findings remain.

final result: passed

---

# Focused Review Queue Stability QA — 2026-09-01

## Verified Behavior

- The 16-card session queue is frozen when focused review opens.
- Rating the first card advanced from `1 / 16` to `2 / 16`; the total did not shrink and the next card rendered exactly once.
- The browser console contained no warning, request failure, or render error after the rating was saved.
- `npm run build`, `npm run lint`, and `git diff --check` passed.

No actionable P0, P1, or P2 findings remain.

final result: passed

---

# Mobile Memory Card Whitespace QA — 2026-09-01

## Evidence

- User reference: `/tmp/codex-remote-attachments/01a05c3b-7ce1-7621-9b55-79b17c1b18fb/8FA3D4A5-5345-4FF1-8FF0-0314E9690CC3/1-写真1.jpg`.
- Updated iPhone 16 Pro Max preview: `/Users/itsuki/Documents/ChatGPT/JLPT/.design-qa/memory-card-layout/22-spacing-final-device.jpg`.
- Side-by-side composition check: `/Users/itsuki/Documents/ChatGPT/JLPT/.design-qa/memory-card-layout/23-spacing-comparison.png`.

## Iteration Notes

- The first 380px mobile pass shortened the card but still distributed empty space around the content, so it did not materially improve content density.
- The final pass uses a 320px front face with one centered content stack and compact 12px/26px reading and hint spacing.
- The revealed face remains 410px tall and internally scrollable so answer fields stay readable without making the prompt side oversized.
- The fixed reveal and rating controls are unchanged and remain separate from the card surface.

## Verification

- The final 440 × 956 preview shows a visibly shorter prompt card and a more compact word/reading/hint grouping.
- The card retains its rounded frame, depth treatment, tap target, and flip transition.
- `npm run build`, `npm run lint`, and `git diff --check` passed.
- Four pre-existing progress-route 404 entries remained visible in preserved DevTools history; no new layout or render failure appeared during this pass.

No actionable P0, P1, or P2 layout findings remain.

final result: passed

---

# Mobile Focused Review Header QA — 2026-09-01

## Evidence

- User reference: `/Users/itsuki/Downloads/IMG_1699.PNG`.
- 402 × 874 compact header, front: `/Users/itsuki/Documents/ChatGPT/JLPT/.design-qa/prototype-migration/12-review-compact-header-front-402x874.png`.
- 402 × 874 compact header, revealed: `/Users/itsuki/Documents/ChatGPT/JLPT/.design-qa/prototype-migration/13-review-compact-header-back-402x874.png`.

## Verified Behavior

- The app-owned mobile header contracts from 64px plus a separate 3px progress row to one 52px header with an inset 2px progress edge.
- The mobile exit label is shortened to `退出`; the full accessible label remains `退出复习`.
- Title and counter retain centered alignment and tabular progress numbers.
- The recovered 15px is returned to the viewport-calculated memory card.
- Front, reveal, and four-rating states remain fully visible with no document scrolling at 402 × 874.
- Browser logs contained no warning, request failure, or render error; `npm run build`, `npm run lint`, and `git diff --check` passed.

No actionable P0, P1, or P2 layout findings remain.

final result: passed
