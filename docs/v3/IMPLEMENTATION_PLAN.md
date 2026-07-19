# FRL v3 Implementation Plan

## Execution Rule

Implement one verifiable vertical slice, or a smaller reviewed sub-slice, per Codex task. Preserve a safe rollback boundary and do not pull later-slice work forward.

The architecture documents are context, not one giant implementation prompt.

## Current Repository Baseline

Slice 0 was inspected on `main` at `92b1a8e` on 2026-07-19. The working tree was clean before this documentation change. FRL v2 Mini is released and deployed.

Defined package scripts:

| Check | Command | Slice 0 result |
| --- | --- | --- |
| Typecheck | `npm run typecheck` | Passed with WSL-native Node v24.15.0 |
| Production build | `npm run build` | Passed with Vite 7.3.3; 37 modules transformed |
| Lint | none | Not available; no `lint` script or lint configuration is defined |
| Test | none | Not available; no `test` script or test runner is defined |

The default environment routed `npm` to Windows and failed before project execution. Verification succeeded after using the existing WSL-native Node toolchain and repository dependencies. This is an environment constraint, not an application defect.

## Slices

### Slice 0 — Freeze the Handoff

Deliver the three repository-local v3 documents and root agent instructions. Record the v2 integration points, contract conflicts, commands, baseline, stop-lines, and first Slice 1 task. Do not change application behavior.

### Slice 1 — Domain Foundation

Add shared domain contracts, runtime schemas, stable success/error envelopes, learner-visible question content, server-side evaluation specs, fixtures, and pure consistency validators for only `react-state-ownership-01`.

Completion requires valid `needs-follow-up` and `sufficient` fixtures plus predictable invalid fixtures. No React integration, HTTP, Netlify, or model calls.

### Slice 2 — Deterministic Session Demo

Add the phase-discriminated session state, reducer, selectors, initial-session factory, orchestration hook, and deterministic development/test adapter. Integrate the state-driven Practice Workspace with the existing navigator and prove both completion paths plus failure, retry, editing, and stale-response behavior.

Fixtures are development/test inputs, never a fake production AI fallback.

### Slice 3 — Real Call 1

Add the initial-diagnosis Netlify Function, shared server pipeline, model client, request/model/domain validation, safe error mapping and metadata, browser service, and session/request stale-response guards.

### Slice 4 — Real Call 2

Add revision review, diagnosis revalidation, bounded candidate selection, semantic comparison, next-action validation, browser service integration, and the complete two-call reference path.

Slice 4 is the minimum complete Build Week victory line.

### Slice 5 — Reliability Paths

Harden stale responses, question switching, retries and edit recovery, invalid output, version mismatch, network/timeout behavior, size limits, `no-store`, same-origin, and minimum rate limiting.

### Slice 6 — Demo Polish and Submission Evidence

Polish the visible `Answer → Revise → Review` story, stabilize the three-minute script, and add README, architecture, verification, screenshots/video, deployment, and submission evidence that match actual behavior.

## First Small Codex Task for Slice 1

### Goal

Define the learner-visible `QuestionContent` contract and one `react-state-ownership-01` content object without changing the running v2 app.

### In scope

- Add a focused v3 domain module under `src/domain/v3/`, unless repository inspection identifies a smaller existing boundary that preserves the same separation.
- Define `QuestionContent` with `id`, positive integer `version`, title, category, difficulty, prompt, optional code snippet, language context, evaluation mode, syntax policy, and target concept IDs.
- Add the single learner-visible reference question.
- Add a pure runtime parser/validator for this one contract and focused valid/invalid tests after selecting the smallest compatible test runner.
- Keep existing `fixedQuestions`, `ReasoningQuestions`, `App`, navigator, evaluator, and rendering unchanged.

### Non-goals

- No evaluation spec or rubric implementation in this first task.
- No full question-bank migration.
- No session state, reducer, hook, React UI, Netlify Function, HTTP service, OpenAI SDK, prompt, or model call.
- No rename of the existing v2 question ID.

### Decisions required before editing

- Choose and document the runtime schema library versus a small local validator.
- Choose the smallest test runner compatible with Vite/TypeScript and add only the scripts/configuration required for these domain tests.
- Decide the temporary coexistence rule between `react-state-ownership-01` and the related v2 question without changing navigation.

### Completion evidence

- The new contract validates the reference content and rejects missing/invalid version, unsupported enum values, empty IDs/text, and empty target concepts.
- `npm run typecheck`, `npm run build`, and the newly defined test command pass.
- No new v3 domain module is imported by the running v2 application.
- A brief manual smoke check confirms the current v2 navigation and evaluator flow still behave as before.

## Known Risks

- The test and runtime-validation stack is not selected. Choosing it inside a broad domain implementation would hide a dependency decision inside feature work.
- The reference ID differs from the related v2 bank ID; accidental replacement would break selection and URLs/bookmarks that rely on current IDs.
- Learner-visible content, server-only rubric policy, and test fixtures can leak into one another unless their module boundaries remain explicit.
- The stateless Call 2 design can revalidate data but cannot prove the browser returned the exact diagnosis previously issued; signing or storage is deferred.
- A public function can consume quota even when the API key is hidden. Rate limits and usage monitoring remain required before public model integration.
- The current docs freeze accepted v0.1 contracts. Any contract change should update this handoff before implementation diverges.
