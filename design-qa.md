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
