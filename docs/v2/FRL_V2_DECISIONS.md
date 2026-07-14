# FRL v2 Mini Engineering Decisions

## Status

This document is the source of truth for the implemented FRL v2 Mini scope on the `FRLv2` development/release branch.

FRL v1 remains deployed to production. FRL v2 Mini is implemented but has not yet been merged into `main` or deployed.

The original v0.1 proposal is preserved in [`FRL_V2_MINI_SCOPE_V0_1.md`](./FRL_V2_MINI_SCOPE_V0_1.md). Where that proposal differs from the current implementation, this document takes precedence.

## Goal

FRL v2 Mini extends the v1 single-question evaluator proof into a small, navigable frontend reasoning workspace.

The release demonstrates:

- a static ten-question frontend reasoning bank
- Overview and Question content modes
- controlled search and visual category grouping
- explicit state ownership and derived question data
- a preserved typed evaluator boundary
- reset and stale-result protection when navigation changes
- a responsive, keyboard-operable interface

The goal is visible frontend engineering evidence, not a full learning platform.

## Current State and Data Flow

The main content selection is represented by a discriminated union:

```ts
type SelectedContent =
  | { type: "overview" }
  | { type: "question"; questionId: string };
```

The primary flow is:

```txt
QuestionNavigator emits SelectedContent
→ App updates selectedContent
→ App derives selectedQuestion from fixedQuestions
→ App renders OverviewPanel or the practice view
→ the answer is submitted through fakeEvaluator
→ App renders the typed EvaluationResult
```

`App` owns the cross-workspace state:

- `selectedContent`
- `searchText`
- `answerText`
- `isEvaluating`
- `evaluationResult`
- the evaluator request-version ref

The question collection, filtered questions, grouped questions, selected question, active item, and submit availability are derived from that source data and state.

## Decision 1: Use One Explicit Content Selection Model

### Goal

Represent both the static Overview and question practice content without creating mutually exclusive booleans or unrelated selection callbacks.

### Decision

Use `SelectedContent` as one explicit selection intent with `overview` and `question` variants.

### Trade-off

The union adds a small amount of type narrowing. In return, it makes valid content modes explicit, prevents impossible combinations, and gives navigation one consistent callback boundary.

## Decision 2: Keep Selection State in `App`

### Goal

Coordinate the main content view, answer state, evaluation lifecycle, and active navigation item from one owner.

### Decision

`App` owns `selectedContent`. `QuestionNavigator` receives the current value and emits `onSelectContent` intents.

### Trade-off

The root component carries the workflow state and handlers. That is appropriate at the current scale because the affected UI branches share the same nearest owner; moving this state into the navigator would split ownership and make content resets harder to reason about.

## Decision 3: Derive the Selected Question

### Goal

Keep the static question bank as the canonical question data.

### Decision

When the selected content is a question, derive `selectedQuestion` by matching `questionId` against `fixedQuestions`.

### Trade-off

The lookup runs during render and can return `undefined`, so the practice view includes a missing-question guard. The small lookup cost is preferable to storing a copied question object that could become stale.

## Decision 4: Keep Search Independent from Selection

### Goal

Allow users to narrow the navigator without unexpectedly replacing their current content.

### Decision

`searchText` is controlled by `App`. `filteredQuestions` is derived with trimmed, case-insensitive matching across order, title, short title, and category. Filtering changes the navigator list only; it does not mutate `selectedContent`.

### Trade-off

A selected question may remain open while it is absent from the filtered list. This is intentional: search is a discovery control, while selection is an explicit navigation decision.

## Decision 5: Derive Visual Category Groups

### Goal

Make the question bank easier to scan without adding category interaction state.

### Decision

`QuestionNavigator` groups the already-filtered questions by their category for rendering.

### Trade-off

Grouping is recalculated during render. With ten static questions, this keeps the model simple and avoids a second category source of truth, collapse state, or category routing.

## Decision 6: Reset Practice State When Content Changes

### Goal

Prevent an answer or evaluation result from one question appearing under another question or the Overview.

### Decision

Every content selection clears `answerText`, `isEvaluating`, and `evaluationResult` before the new content is used.

### Trade-off

Unsaved draft answers are discarded on navigation. Preserving per-question drafts would require persistence and additional ownership rules that are outside the current release scope.

## Decision 7: Invalidate Stale Evaluator Requests

### Goal

Prevent an older asynchronous evaluation from updating the UI after the user navigates to different content or starts a newer request.

### Decision

`App` increments an evaluator request version on content selection and submission. Both the result update and the `finally` loading-state update run only when their captured version is still current.

### Trade-off

This does not cancel the underlying promise. It is a minimal response-order guard suited to the local mock evaluator and preserves the existing evaluator boundary without introducing an abort-controller abstraction.

## Decision 8: Keep Navigation Controlled and Rendering Separate

### Goal

Give each component one clear responsibility.

### Decision

`QuestionNavigator` renders the search input, static Overview item, category groups, active states, and empty-search state. It emits selection and search events but does not own the selected content or render the main panel.

`OverviewPanel` renders project context only. `App` decides whether the Overview or practice content is active.

### Trade-off

Some orchestration remains in `App`. Extracting a larger practice container could reduce file length, but it would not improve the current state boundary enough to justify another structural change in this release.

## Decision 9: Preserve the Evaluator Boundary

### Goal

Keep UI workflow concerns separate from evaluation implementation details.

### Decision

The UI submits a typed question and `UserAnswer` to `fakeEvaluator`, then renders its typed `EvaluationResult`. The evaluator does not own React state or render UI.

### Trade-off

The current evaluator is deterministic and intentionally shallow. It proves the async boundary and result flow, not production-quality answer scoring or real AI integration.

## Scope Reconciliation

The v0.1 plan proposed practice history, `localStorage`, and related service boundaries. Those features were deferred after implementation review.

The implemented release stops at:

```txt
Overview or question selection
→ question practice
→ deterministic evaluation
→ structured UI feedback
```

The following remain outside the current release:

- practice history and `localStorage` persistence
- authentication, accounts, and backend storage
- real AI API integration
- routing, dashboard, analytics, and admin tooling
- question-specific scoring
- dark mode and further visual expansion
- a full education platform

This stop line keeps the v2 work reviewable and preserves the project as a focused frontend engineering case study.

## AI-Assisted Workflow Boundary

AI assistance supported bounded planning, small implementation proposals, edge-case review, documentation, and verification review.

Project scope, state ownership, component responsibilities, accepted trade-offs, verification criteria, and final implementation decisions remained owner-reviewed decisions.

## Next Step

Complete release evidence and version-level merge preparation. New application features require a separate scope decision and should not be bundled into the v2 documentation and release pass.
