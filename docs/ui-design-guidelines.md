# JLPT Master Deck UI Design Guidelines

This document defines the information architecture and interaction rules for the JLPT Master Deck frontend. New pages and redesigns should follow these rules before adding visual decoration or new components.

## Core Principle

One page should have one primary responsibility.

The product exists to support one repeated learning loop:

1. **Capture:** record something the learner does not understand with as little setup as possible.
2. **Review:** turn captured or generated material into focused reading and question practice.
3. **History:** revisit original inputs and past attempts without mixing them into the active exercise.
4. **Data:** observe pending work, practice volume, accuracy, and mastery in a compact form.

These four responsibilities define the learning loop, but they do not all need equal navigation weight. The primary navigation prioritizes fast study access: Home, Vocabulary, Grammar, Listening, Reading, Mixed Practice, and Data Management. Capture is a prominent home-page action. Metrics, captured-input management, and practice history are grouped inside Data Management. Planning, question-type guidance, drafts, About, and Settings remain supporting tools in secondary navigation.

Cards and list rows provide an overview and a route into deeper content. They should not attempt to display the complete explanation, editing form, progress history, and related actions at the same time. Detailed information belongs on a dedicated detail page with its own hash route.

The default navigation depth is:

1. **Overview or index page:** helps the learner scan, compare, filter, and choose where to go next.
2. **Detail page:** presents the complete explanation, study guidance, history, and context for one item.
3. **Focused action state:** editing, annotation, upload, or another complex operation happens inside the detail page or in a focused modal when leaving the page would lose important context.

## Overview Pages

Overview pages should establish a clear reading order:

1. Page title and one short description.
2. Compact status, filters, tabs, or summary metrics.
3. A list or small set of overview cards.
4. Secondary references or notices.

Use a row list instead of a card grid when any of these conditions are true:

- The user needs to scan more than four similar items.
- Item descriptions require more than two short lines.
- The items share the same structure and are mainly compared by title, status, date, or count.
- Showing every item's complete content would make the page longer than the selection task requires.

Each overview card or row should normally contain only:

- title;
- one status, count, date, or short metadata group;
- a one-sentence summary;
- a clear navigation affordance.

Do not put long explanations, large forms, full study tips, annotations, tables, or several competing actions inside overview cards.

## Detail Pages

Every content type that has a full explanation or editable user data should support an independent route, for example:

```text
/#/question-types/vocabulary-kanji-reading
/#/vocabulary/words/<item-id>
```

A detail page should include:

- a visible route back to its parent list;
- content identity and relevant status;
- the complete information needed to understand one item;
- editing or other primary actions close to the content they affect;
- loading, empty, invalid-route, and save-result states where applicable.

Editing should not begin on the overview page. The user first opens the item, reviews its context, and then explicitly enters edit mode. Existing personal data must remain visible and recoverable, including a restore-default action when the application provides a default value.

## Card Usage

Cards are appropriate for:

- repeated module or item overviews;
- compact summaries with a clear destination;
- a focused tool or form that genuinely needs a visual boundary;
- modal content.

Cards are not appropriate for:

- wrapping an entire page section only for decoration;
- placing cards inside other cards;
- displaying several long content sections at once;
- combining navigation, editing, history, and help content in one repeated item;
- turning every statistic or label into a separate box.

Use borders, spacing, section bands, dividers, and typography before adding another card container. Cards should use a radius of 8px or less and should not rely on heavy shadows for hierarchy.

## Information Density

The interface should support repeated study, quick scanning, and focused reading.

- Keep overview copy short and move full content to detail routes.
- Use section headings to explain hierarchy instead of repeating framed containers.
- Keep one primary action per section; secondary actions should be visually quieter.
- Avoid showing more than two levels of metadata before the main content.
- Preserve stable dimensions for counters, tabs, module entries, calendar cells, and other repeated controls.
- Do not hide essential actions behind hover-only behavior.

If a page contains more than three substantial content sections or more than four repeated information-heavy items, review whether it should be split into an index and detail route before adding more UI.

## Responsive Behavior

On smaller screens:

- give each screen one primary task instead of compressing the complete desktop workspace;
- move global module navigation and search into separate full-screen panels;
- move study-mode switching and deck filters into separate focused panels;
- show only the answer result on the practice screen, then route or focus into explanation content;
- present review as a result list first and open one answer explanation at a time;
- prevent page-level horizontal overflow;
- avoid placing several text-heavy cards side by side;
- keep tap targets at least 40px high.

The mobile layout is not a narrower desktop layout. Preserve the same data and routes, but progressively disclose navigation, filters, summaries, and explanations so the current task remains obvious.

## Current Application Patterns

- **Home:** combines the product purpose, a prominent capture entry, phase-aware exam countdown, compact learning status, direct module rows, and a short official-question-type preview. It does not contain detailed module business logic.
- **Capture:** contains one input form for unclear material. Category and context are optional metadata; history and generated exercises do not appear on the same screen.
- **Data Management:** uses tabs for learning overview, captured inputs, and practice history. Rows expose status, date, and one relevant action; it is not a decorative dashboard.
- **Question types:** the main page is a sectioned row list. Each question type has an independent detail route where its full description and personal solving tip can be edited.
- **Plan:** basic profile setup and calendar tracking are separate views. Calendar tasks are concise; detailed generation is delegated through MCP.
- **Drafts:** the list selects a draft. Preview, annotations, and revision context belong to the selected draft workflow rather than every list item.
- **Vocabulary practice:** desktop uses one centered learning column. Practice, reading, and analysis are lightweight tabs above the content; deck selection stays collapsed in a filter menu until requested. Do not restore a persistent side panel that competes with the question.
- **Entry browsing:** the mode label is `词条` / `項目` / `Entries`, not `阅读`. Opening the mode shows a vertically structured index first; each row places title, reading, and short meaning on separate lines. The selected entry opens its own route and returns to the index explicitly.
- **Vocabulary detail:** question practice and word detail use separate routes and page modes. Meaning sections use a single vertical reading order rather than placing Japanese and localized explanations side by side.
- **Grammar, reading, and listening samples:** each module starts with a compact list of original exercises shaped around official N1 item types. Instructions, stimulus, answer choices, explanations, and listening transcripts live on independent routes. These design samples do not update personal progress.

Official type names, purposes, and section timing may be used as structural metadata with source links. Do not copy official workbook prompts, passages, answer choices, or audio into the repository; create original sample material for interaction and layout testing.

## Review Checklist

Before accepting a new page or component, verify:

- Does the page have one primary responsibility?
- Can a learner understand the overview without reading every item's full content?
- Does detailed or editable content have an independent route or focused state?
- Are cards limited to summaries, repeated items, or genuinely framed tools?
- Are there any nested cards or decorative page-sized cards that can be replaced by sections and dividers?
- Is the primary action clear and close to the content it affects?
- Does the page remain readable without horizontal overflow on a 390px viewport?
- Can browser back and forward navigation recover the list and detail states?
