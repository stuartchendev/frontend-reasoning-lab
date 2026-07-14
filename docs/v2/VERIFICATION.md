# FRL v2 Mini Verification

## Scope

This document records verification for the FRL v2 Mini implementation on the `FRLv2` development/release branch. It does not describe the deployed v1 tiny proof.

The v1 verification record remains at [`../v1/VERIFICATION.md`](../v1/VERIFICATION.md).

## Interaction Verification

### Overview and Question Selection

- The initial selection renders the Overview.
- Activating the static Overview item emits `{ type: "overview" }`.
- Activating a question emits `{ type: "question", questionId }` and renders that question's title, scenario, prompt, evaluation guide, and answer form.
- The active Overview or question item exposes `aria-current="page"`.
- An invalid question ID reaches the explicit missing-question alert instead of rendering stale content.

### Search

- The search input is controlled through `searchText` owned by `App`.
- Matching is trimmed and case-insensitive.
- Search checks question order, title, short title, and category.
- An empty search shows the full question bank.
- No matches show the navigator's `No question found` state.
- Filtering does not automatically replace the current Overview or question selection.

### Category Grouping

- The filtered question list is grouped by each question's category.
- Category headings render from question data.
- Grouping does not introduce category selection, collapse state, or a second category source of truth.

### Answer and Result Reset

- A whitespace-only answer cannot be submitted.
- The submit button is disabled while the answer is empty or evaluation is running.
- Starting an evaluation clears the previous result and shows the live status message.
- Selecting Overview or another question clears the answer, loading state, and previous result.
- The newly selected content does not display another question's answer or feedback.

### Stale Evaluator Invalidation

- Each submission captures an evaluator request version.
- Content navigation increments the current version before resetting the practice state.
- A result from an older request is ignored after content changes.
- The older request's `finally` block also cannot clear a newer request's loading state.
- The underlying mock promise is allowed to finish; only stale state updates are rejected.

### Keyboard Interaction

- Search uses a native `input[type="search"]` with an accessible label.
- Overview and question choices use native buttons and are reachable by Tab.
- Enter or Space activates the focused navigation button through native button behavior.
- Focus-visible styles are defined for navigation controls, and the answer input has an explicit label.

## Responsive Verification

The completed responsive pass covered representative widths of 390px, 980px, and 1280px.

- At desktop width, the workspace uses a navigator column and a flexible main content column.
- At 980px and below, the workspace becomes one column and the navigator returns to normal document flow.
- The narrow layout keeps the navigator scrollable, prevents the main panel from forcing grid overflow, and preserves access to the practice flow.
- At mobile width, project-intro content stacks without changing the selection or evaluator data flow.

Responsive changes are CSS-only; no viewport-specific React state or duplicated markup is used.

## Engineering Verification

Run from the repository root with the project toolchain:

```bash
npm run typecheck
npm run build
npm run dev -- --host 127.0.0.1
git diff --check
```

Current result (2026-07-14):

- `npm run typecheck` passed without errors.
- `npm run build` passed; Vite completed the production bundle.
- The development server started at `http://127.0.0.1:5173/` and returned HTTP `200`.
- `git diff --check` passed with no whitespace errors.

## Release Boundary Check

Verification should also confirm that the current release does not add:

- practice history or `localStorage` persistence
- real AI or backend integration
- authentication or user accounts
- routing, dashboards, analytics, or admin features
- dark mode or a broader design-system expansion

Passing this check means the v2 branch demonstrates the intended navigation, state, evaluator, and responsive evidence without reopening deferred product scope.
