# FRL v3 Architecture Decisions

## Status and Scope

Accepted handoff baseline for FRL v3 Slice 0, frozen on 2026-07-19 from the reviewed v3 decision, contract, session-state, and demo-flow notes.

The deployed FRL v2 Mini commit on `main` is the released baseline from which v3 work begins. This document records future contracts; it does not claim that v3 UI, domain code, Netlify Functions, or model calls exist.

## Product Boundary

FRL v3 is a controlled debugger for frontend engineering reasoning:

```txt
fixed question
→ learner answer
→ one evidence-based reasoning gap
→ one targeted follow-up
→ revision
→ before/after reasoning comparison
→ validated next learning action
```

The product is not a chat interface, general AI tutor, generated course platform, dashboard, or scoring system.

## Ownership Decisions

### Application, model, and server

- The application owns the active question, practice session, legal transitions, stale-response protection, rendering, and recovery actions.
- The model interprets the learner's answer and proposes one bounded learning action. It does not own UI or application state.
- The server loads canonical question data, builds model input, holds secrets, calls the model, validates output, and returns stable envelopes.
- The browser accepts only server-validated domain results into session state.
- The MVP server is stateless. `sessionId` is correlation context, not proof of session integrity.

### Browser layers

- React components render the current state and collect input.
- A custom hook coordinates user actions, service calls, and reducer dispatches.
- A pure reducer owns legal synchronous state transitions.
- Service modules perform HTTP calls and validate server envelopes before returning results.
- Loading flags, progress, button availability, labels, recommendation lookup, and deterministic text diff are derived rather than duplicated in state.

## Session Contract

`PracticeSessionState` is a discriminated union keyed by `phase`:

```txt
answering
→ diagnosing
→ revising
→ reviewing-revision
→ complete
```

The supported alternative paths are:

```txt
diagnosing → diagnosis-failed → retry or answering
reviewing-revision → revision-review-failed → retry or revising
diagnosing → complete / initial-sufficient
```

Invariants:

- One session is tied to one fixed question ID and version.
- Selecting a practice question starts a new `sessionId` and discards the old active practice session.
- `originalAnswer` and `revisedAnswer` are immutable submitted snapshots; drafts are separate and editable only in matching phases.
- Call 1 and Call 2 each use a `requestId`. Results must match both the active `sessionId` and request ID.
- A completed session never transitions backward. Restarting creates a new session.
- Empty submissions and invalid transitions are rejected.

## Domain and Evaluation Contracts

A complete question package has three separate concerns:

1. `QuestionContent`: learner-visible question data.
2. `QuestionEvaluationSpec`: server-only rubric and evaluation policy.
3. `QuestionValidationCase[]`: test/demo fixtures and expected boundaries.

The initial reference package is `react-state-ownership-01`. Its rubric criteria are:

- `identify-source-of-truth`: core and required for sufficient.
- `explain-data-flow`: core and required for sufficient; depends on source-of-truth reasoning.
- `avoid-duplicated-state`: supporting; depends on source-of-truth reasoning.

Call 1 returns either `needs-follow-up` or `sufficient`. Every allowed rubric criterion is assessed as `met`, `partially-met`, `missing`, or explicitly permitted `not-applicable`. A primary gap must reference exactly one missing or partially-met criterion.

Call 2 reviews the diagnosed gap against the revised answer and returns `resolved`, `partially-resolved`, or `unresolved`, plus at most one bounded next action. A question recommendation must come from the server-supplied fixed-bank candidates.

## Runtime and API Boundaries

- External data enters runtime validators as `unknown`; TypeScript assertions alone are insufficient.
- Validate browser requests, model output, and server responses at their trust boundaries.
- Evidence quotes must exist in the normalized answer used for that model call.
- Required rubric criteria determine the `sufficient` threshold.
- Stable error codes include invalid request, unsupported contract version, payload too large, question/version failures, rate limiting, model unavailable, invalid model output, and server error.
- Responses use success/error envelopes with `contractVersion`; errors also expose retryability and a server-generated `traceId` without raw prompts, learner answers, provider errors, stacks, or secrets.
- Each submission performs at most one model call in v0.1. Invalid model output becomes an explicit retryable failure; there is no hidden corrective retry.

Future Netlify Functions are `diagnose-initial-answer` and `review-revised-answer`, but they are not part of Slice 0 or Slice 1.

## Exact v2 Integration Points

| Current v2 location | Current responsibility | v3 insertion decision |
| --- | --- | --- |
| `src/App.tsx` | Owns `SelectedContent`, search, answer, evaluation state, selected-question derivation, and stale mock-request guard | Keep `SelectedContent`, search, and selected-question ownership. A later UI slice replaces the local answer/evaluation cluster with one session hook; do not add a second selection owner. |
| `src/components/QuestionNavigator.tsx` | Controlled search and selection intents | Preserve its controlled contract. Question clicks later trigger the application-level start-question/session action through the parent boundary. |
| `src/types/navigation.ts` | Separates Overview from question selection | Preserve this workspace-navigation union. Do not overload it with practice phases. |
| `src/data/fixedQuestions.ts` | Canonical ten-question learner-visible bank with embedded string criteria | Migrate incrementally to learner-visible `QuestionContent`; add versioned evaluation specs and fixtures in separate modules. Avoid a broad rewrite of all ten questions in the reference slice. |
| `src/types/reasoning.ts` | Combines v2 question fields with shallow answer/result contracts | Add v3 contracts in new focused modules first. Do not mutate v2 types until a consuming slice is ready. |
| `src/lib/fakeEvaluator.ts` | Local async evaluator returning `EvaluationResult` | Preserve through Slice 1. Slice 2 introduces a deterministic fixture adapter behind the new session orchestration; real services arrive later. |
| `src/data/rubricCriteria.ts` | One global learner-visible evaluation guide | It cannot be the canonical v3 rubric. V3 evaluation rules are question-specific, ID-based, versioned, and server-only; learner-visible guidance must not leak fixtures or full evaluation answers. |
| `src/App.tsx` inline practice markup | Current right-side practice view | Preserve through Slice 1. A later deterministic-session UI slice may become a phase-driven Practice Workspace without changing the left shell. |

## Conflicts to Resolve Deliberately

- `ReasoningQuestions` has no question `version`, language/evaluation metadata, target concept IDs, or optional code snippet required by v3.
- `criteria: string[]` has no stable criterion IDs, prerequisite links, required-for-sufficient rule, or server-only guidance.
- The global `rubricCriteria` list conflicts with question-specific canonical evaluation specs.
- `UserAnswer` and `EvaluationResult` represent one shallow submit/result cycle; they cannot represent two immutable submissions, rubric assessments, a primary gap, follow-up, revision review, or bounded next action.
- `answerText`, `isEvaluating`, and nullable `evaluationResult` are adequate for v2 but conflict with the accepted phase-discriminated v3 session contract.
- `evaluationRequestVersionRef` protects the v2 mock lifecycle, but v3 requires both session and per-call request identity across two calls and recovery paths.
- The v2 evaluator cannot express failure/retry states and always marks a non-empty answer complete. It must not be presented as a v3 fixture or production fallback.
- The current bank uses `question-navigator-selected-question`; the accepted reference ID is `react-state-ownership-01`. Temporary coexistence or mapping must be documented during Slice 1. Replacement or navigation migration is deferred until a consuming UI slice.

## Non-goals

- No v2 shell rewrite.
- No v3 UI implementation in Slice 0 or Slice 1.
- No Netlify configuration or Functions before their named slices.
- No OpenAI SDK, prompt, model call, or API key handling before the real-call slices.
- No authentication, persistence, analytics, routing expansion, multi-agent system, RAG, or general workflow framework.
