# Frontend Reasoning Lab

> **Release note:** FRL v2 Mini is released on `main`, deployed to production, and tagged as `v0.2.0`. FRL v1 remains preserved as completed and frozen historical evidence.

Frontend Reasoning Lab is a React + TypeScript practice workspace designed to make frontend engineering reasoning visible through structured questions, written responses, explicit state ownership, and evaluation feedback.

The project began as a small evaluator proof and has evolved into a controlled question-navigation and practice flow without expanding into a full learning platform.

> Small scope, clear engineering signal.

## Project Evidence

- **Frontend Reasoning Workspace** — question navigation, search, category grouping, and structured practice flow
- **Explicit State Model** — parent-owned content selection and derived selected-question data
- **Evaluator Boundary** — deterministic async-like evaluation separated from UI rendering
- **Engineering Decisions** — implemented scope, trade-offs, AI assistance boundaries, and owner responsibility
- **Verification Notes** — interaction checks, responsive checks, typecheck, and production build validation

## Live Demo

[View Live Demo](https://frontend-reasoning-lab.netlify.app/)

> The live demo serves the released FRL v2 Mini workspace.

## Preview

![Frontend Reasoning Lab preview](./docs/preview.png)

## What the Project Does

FRL v2 Mini provides a small frontend reasoning practice flow:

```txt
open the workspace
→ review the project overview
→ search or browse question categories
→ select a frontend reasoning question
→ write an answer
→ submit through the evaluator boundary
→ receive structured feedback
```

The evaluator currently uses a deterministic mock implementation. This keeps the state transitions, async UI behavior, and responsibility boundaries reviewable without depending on an external AI service.

## Why This Project Exists

Frontend work is not only about rendering components. It also involves deciding:

- what state should exist
- what data should be derived
- which component owns each decision
- how user actions move through the system
- how async results should update the current UI
- where service and rendering responsibilities should be separated
- which features should remain outside the current scope

This project makes those decisions visible and explainable.

## Evolution from FRL v1

FRL v1 was intentionally built as a tiny proof of one controlled reasoning loop:

```txt
fixed question
→ user answer
→ fake async evaluator
→ structured result
→ UI feedback
→ documented decisions
```

FRL v2 Mini preserves that evaluator foundation and adds a clearer user-facing workspace:

- a static frontend reasoning question bank
- a searchable Question Navigator
- visual category grouping
- Overview and Question content modes
- parent-owned selection state
- selected-question derivation
- reset and stale-result protection when content changes
- a more presentation-ready project entry point

The goal was not to replace v1 with a larger platform. The goal was to extend the original engineering proof through one bounded, reviewable frontend slice.

## State and Data Flow

The main application owns the state that coordinates the workspace:

```ts
type SelectedContent =
  | { type: "overview" }
  | { type: "question"; questionId: string };
```

The selected question is derived from:

```txt
selectedContent
+ fixedQuestions
→ selectedQuestion
```

This avoids storing both a selected ID and a duplicated selected question object as separate sources of truth.

The main flow is:

```txt
QuestionNavigator emits a selection intent
→ App updates selectedContent
→ App derives selectedQuestion
→ App renders Overview or Practice content
→ answer submission calls the evaluator
→ evaluator returns a structured result
→ App state updates the UI
```

When the selected content changes, the application resets the current answer, loading state, and evaluation result.

Pending evaluator requests are also invalidated so that a response from a previous question cannot update the newly selected view.

## Component Responsibilities

### App

The application root owns cross-component workflow state:

- selected content
- search text
- answer text
- evaluation loading state
- evaluation result
- evaluator request version

It also derives the selected question and decides whether to render the Overview or Practice view.

### QuestionNavigator

The navigator is responsible for:

- rendering static navigation items
- rendering question categories
- displaying filtered questions
- handling the controlled search input
- indicating the active selection
- emitting one unified selection intent

It does not own the current selection and does not decide what the main content area renders.

### OverviewPanel

The Overview introduces:

- the project purpose
- the user flow
- the evaluator data flow
- the main frontend engineering evidence

### Evaluator

The evaluator accepts a question and user answer and returns a structured result.

It does not render UI and does not own React state.

## Core Engineering Decisions

### Parent-Owned Selection State

Overview and Question selection affect the same main content area, answer state, and evaluator lifecycle.

For that reason, the selection is owned by the nearest common parent rather than stored inside the navigator.

### Unified Selection Intent

The navigator emits a `SelectedContent` value instead of separate callbacks such as:

```txt
onSelectOverview
onSelectQuestion
```

This gives the parent one consistent event boundary while preserving explicit content variants through a discriminated union.

### Derived Question Data

The application stores the selected content identity and derives the corresponding question from the static question collection.

This keeps the question data as the source of truth and avoids duplicated state.

### Stale Evaluation Protection

Changing the current content invalidates pending evaluation requests.

This prevents an older async result from appearing under a different question after the user navigates away.

### Evaluator Boundary

The UI and evaluator remain separate.

```txt
UI collects input
→ evaluator checks the answer
→ evaluator returns structured data
→ UI renders the result
```

A real API could later replace the mock evaluator behind the same boundary without requiring the rendering layer to own evaluation logic.

## Scope Control

FRL v2 Mini intentionally does not include:

- authentication
- backend persistence
- user accounts
- real AI API integration
- practice history
- analytics dashboard
- complex routing
- admin tools
- payments
- a large design system
- a full education platform

These are possible production extensions, not requirements for the current evidence slice.

The current goal is to demonstrate a small, coherent frontend system that can be inspected, tested, and explained clearly.

## AI-Assisted Engineering Workflow

AI was used to support:

- planning bounded implementation slices
- generating small implementation proposals
- reviewing state and component boundaries
- checking edge cases
- improving documentation
- validating whether changes stayed inside scope

The project scope, state model, component responsibilities, trade-offs, verification criteria, and final implementation decisions were reviewed and owned by me.

AI assistance is treated as part of the engineering workflow, not as a substitute for understanding or responsibility.

Current v2 decision evidence is recorded in:

```txt
docs/v2/FRL_V2_DECISIONS.md
```

The original v1 AI-assisted decision log remains preserved as historical evidence.

## Tech Stack

- React
- TypeScript
- Vite
- CSS

## Local LM Studio Development

The v3 evaluation path can use a local LM Studio server. The browser does not
own or modify runtime configuration and never receives provider credentials.

1. Start LM Studio, load the model you want to use, and start its local
   OpenAI-compatible server.
2. Copy the committed environment template:

   ```bash
   cp .env.example .env
   ```

3. In `.env`, keep the loopback base URL and replace the model placeholder with
   the exact identifier reported by LM Studio:

   ```env
   LM_STUDIO_BASE_URL=http://127.0.0.1:1234/v1
   LM_STUDIO_MODEL=your-loaded-model-identifier
   LM_STUDIO_TIMEOUT_MS=90000
   ```

4. Start the Vite development server with Netlify Functions enabled:

   ```bash
   npm run dev:netlify
   ```

5. Open the local URL printed by Vite. The development-only **Local AI
   Runtime** panel reports the configured endpoint and model. Use **Test
   connection** to refresh its `Connected` or `Unavailable` status.

The settings are read by the server runtime when development starts. Restart
`npm run dev:netlify` after changing `.env`. Do not rename these variables with
a `VITE_` prefix: credentials and model runtime configuration must remain
server-owned. The status panel and status endpoint are unavailable in
production. `LM_STUDIO_TIMEOUT_MS` is optional and accepts a positive integer
number of milliseconds. It defaults to 25 seconds when missing or invalid; the
90-second example is intended for a slower local architecture proof and does
not change the separate 45-second OpenAI timeouts.

## OpenAI Runtime and Verification

The same two-call v3 evaluation path can use the OpenAI Responses API. Provider
selection remains server-owned:

- If either `LM_STUDIO_BASE_URL` or `LM_STUDIO_MODEL` is present, the Netlify
  Functions select LM Studio and require both values to be valid.
- If neither LM Studio variable is present, the Functions select OpenAI and
  require `OPENAI_API_KEY`.

For local OpenAI verification, create a local `.env` that contains the
server-only key and does not contain either `LM_STUDIO_*` variable:

```env
OPENAI_API_KEY=replace-with-your-local-secret
```

Never add the key to a `VITE_*` variable, committed file, browser code, or test
fixture. Start the local Netlify runtime with `npm run dev:netlify`, then follow
the normal diagnosis and revision-review flow in the browser.

Both OpenAI clients use a 45-second request timeout, below Netlify's 60-second
synchronous Function limit, so FRL retains time to validate model output and
return a versioned safe envelope. SDK retries remain disabled with
`maxRetries: 0`; each learner submission performs at most one model call.
Provider rate limits map to `rate-limited`, transport/timeout failures map to
`model-unavailable`, and malformed structured responses map to
`invalid-model-output`.

The focused OpenAI reliability path does not require a real API key:

```bash
node --test \
  tests/openaiDiagnosisClient.test.mjs \
  tests/openaiRevisionReviewClient.test.mjs \
  tests/openaiReliabilityHttp.test.mjs
```

These tests use injected fake transports while exercising the real OpenAI
request boundary, server pipeline, semantic validation, HTTP status mapping,
safe envelopes, and trace IDs for Call 1 and Call 2. A successful automated run
is not evidence of a live OpenAI or browser E2E. Public deployment also remains
blocked on minimum rate limiting and usage protection.

### OpenAI live two-call HTTP smoke

The live HTTP smoke setup covers the actual local Netlify Function endpoints:

```txt
reference initial answer
→ diagnose-initial-answer
→ validated needs-follow-up diagnosis
→ reference revised answer
→ review-revised-answer
→ validated revision comparison
```

This setup is complete, but it is separate from the fake-transport tests above
and does not count as a passed live run until it is executed with a real
`OPENAI_API_KEY`. It does not execute the browser service, HTTP adapter, hook,
reducer, or UI. The resulting `complete / revision-reviewed` reducer state is
recorded only as an architectural expectation, not as live browser evidence.

When using WSL, confirm that both `node` and `npm` resolve to the Linux/WSL-native
Node 24 toolchain before running the commands below:

```bash
command -v node
command -v npm
node -v
npm -v
```

Prepare a local `.env` with only the OpenAI key, then build and start the local
Netlify runtime:

```bash
npm run build
npm run dev:netlify
```

In a second terminal, run:

```bash
npm run smoke:openai-live
```

The command loads `.env` when present, uses `OPENAI_LIVE_SMOKE_BASE_URL` when
provided, otherwise defaults to `http://127.0.0.1:5173`, and refuses to send a
model request when:

- `OPENAI_API_KEY` is missing
- either `LM_STUDIO_BASE_URL` or `LM_STUDIO_MODEL` would select LM Studio
- the running Netlify server cannot be reached or its provider state cannot be
  verified
- the target is not a loopback HTTP origin
- the production bundle contains the exact runtime key or the server-only
  `OPENAI_API_KEY` marker

A passed live HTTP smoke requires exactly HTTP 200 and valid version `"1"`
success envelopes for both calls, a `needs-follow-up` Call 1 result, and a valid
Call 2 resolution. The expected reducer outcome is not part of the live pass
criteria. A passed command writes redacted machine-readable JSON and
human-readable Markdown under:

```txt
tmp/openai-live-smoke/<timestamp>/
```

To save the evidence somewhere else:

```bash
npm run smoke:openai-live -- --output-dir /absolute/safe/evidence/path
```

The command refuses to overwrite an existing output directory. It writes both
evidence files into a fresh staging directory and publishes that directory only
after both writes succeed, so failed or not-run commands do not publish new
passed evidence in the requested final location.

The evidence records HTTP status, contract version, result kind, trace ID,
model latency, nullable token usage, `browserExecutionStatus: "not-run"`, the
architectural `expectedReducerOutcome`, and the bundle safety result. It does
not store the API key, raw provider details, prompts, learner answers, or full
model output. Keep generated evidence out of Git until it has been reviewed for
the intended audience.

The setup slice itself does not use a real API key, so its honest status is:

```txt
setup: complete
fake-transport tests: separate
live execution: not run
live execution passed: not claimed
browser execution: not run
```

## Verification

The released v2 workspace has been checked for:

- question selection behavior
- Overview and Question navigation
- controlled search behavior
- derived question filtering
- category grouping
- answer and result reset after navigation
- prevention of stale evaluation updates
- keyboard interaction
- responsive behavior
- TypeScript typecheck
- production build
- development-server response
- `git diff --check`

Detailed v2 verification notes are recorded in:

```txt
docs/v2/VERIFICATION.md
```

## Current Status

FRL v2 Mini is released on `main`, deployed to production, and tagged as `v0.2.0`.

The current production release includes:

- static frontend reasoning question bank
- searchable Question Navigator
- visual category grouping
- explicit Overview and Question content selection
- parent-owned `SelectedContent` state
- derived selected-question flow
- preserved evaluator boundary
- stale evaluation result protection
- doc-style Overview content
- project metadata and presentation polish
- responsive and build verification

FRL v1 is completed and frozen as historical evidence of the original tiny proof.

Post-release follow-up is limited to aligning portfolio and public evidence with the released version. It is not a release blocker and does not reopen application feature scope.

Dark mode, additional visual accents, practice history, backend features, and platform expansion remain outside the current release scope.

## Key Takeaway

Frontend Reasoning Lab demonstrates how I turn a bounded UI workflow into visible frontend engineering evidence:

- explicit state ownership
- derived data instead of duplicated state
- predictable one-way data flow
- separated component responsibilities
- protected async result handling
- documented trade-offs
- controlled AI-assisted implementation
- clear scope boundaries

The project is designed to be small enough to explain clearly while still showing meaningful React + TypeScript engineering decisions.

## Additional Documentation

- `docs/README.md` — documentation entry point and reading order
- `docs/frl-core-concepts.svg` — shared reasoning model across FRL versions
- `docs/v2/FRL_V2_DECISIONS.md` — current v2 engineering decisions and implemented scope
- `docs/v2/VERIFICATION.md` — current v2 interaction, responsive, and engineering verification
- `docs/v2/FRL_V2_MINI_SCOPE_V0_1.md` — historical v0.1 planning context
- `docs/CURRENT_STATUS.md` — current branch and release status
- `docs/EVALUATOR_RUBRIC.md` — shared evaluator criteria and boundary
- `docs/v1/FRL_V1_DECISIONS.md` — historical v1 AI-assisted decision evidence
- `docs/v1/VERIFICATION.md` — historical v1 verification
- `docs/v1/TINY_PROOF.md` — original FRL v1 project direction
