# FRL v3 Slice 3 Context

## Baseline

- Branch: `feat/frl-v3`.
- Slices 0 through 2 are committed and pushed.
- Accepted pre-Slice-3 verification: 60 tests, TypeScript typecheck, and production build pass.
- The deterministic browser practice flow remains the rollback baseline; no real API, model call, or browser-exposed key exists.

## Relevant Boundaries

- `src/lib/v3/practiceEvaluationAdapter.ts` exports the unchanged `PracticeEvaluationAdapter`, diagnosis/revision inputs, adapter error, and deterministic development/test adapter.
- `src/domain/v3/evaluationResults.ts` exports browser-safe Call 1 and Call 2 result contracts plus structural parsers.
- `src/domain/v3/practiceSession.ts` owns stable browser-safe failures and the phase-discriminated session contract.
- `src/domain/v3/diagnosisApi.ts` owns the versioned browser/server Call 1 request and response envelopes plus strict structural parsers.
- Server evaluation policy and semantic validation remain under `src/server/v3/`; they must not be imported by browser code.

## Accepted Call 1 HTTP Contract

- Request: contract version `"1"`, question ID, positive question version, and learner answer.
- Success: contract version `"1"`, `ok: true`, validated `InitialDiagnosisResult`, trace ID, non-negative model latency, and nullable input/output token usage.
- Error: contract version `"1"`, `ok: false`, stable `PracticeSessionFailure`, and trace ID.
- The HTTP contract version is independent from the canonical question version.
- All envelope-owned objects reject unknown fields and parsers preserve accepted input values and references.

## Ownership Decisions

- The browser sends learner-owned input and question identity only.
- The server reconstructs canonical question content, evaluation policy, prompt material, and expected boundaries.
- The application continues to own session and request correlation; those IDs are not part of the Call 1 request envelope.
- Only structurally and semantically validated model results may cross into the adapter and reducer.
- `OPENAI_API_KEY` remains server-only and must never use a `VITE_` prefix.

## Runtime and Temporary Call 2 Decisions

- Slice 3D keeps `npm run dev` as the local command and uses `@netlify/vite-plugin` to discover functions under `netlify/functions`.
- Call 1 is exposed at `/.netlify/functions/diagnose-initial-answer`; no custom public redirect exists.
- At final Call 1 application cutover, `compareRevision` will fail explicitly with a non-retryable `operation-unavailable` adapter failure until Slice 4. That failure is not implemented in Slice 3A.

## Checkpoints

1. 3A: shared HTTP contracts and strict parsers.
2. 3B: pure server Call 1 pipeline and canonical reference lookup.
3. 3C: one-call OpenAI client with strict structured output.
4. 3D: Netlify Function, configuration, and local runtime.
5. 3E: browser HTTP service and real diagnosis adapter.
6. 3F: application cutover and vertical verification.

## Non-goals

- No Call 2 implementation, UI redesign, reducer/session rewrite, provider abstraction, fixture-based production fallback, API-key exposure, reliability hardening, or non-reference-question migration.

## Model Decision

- Slice 3C pins Call 1 to `gpt-5.6-luna`, the smallest current GPT-5.6 tier with Responses API Structured Outputs support.
- Re-evaluate `gpt-5.6-terra` only if the reference evaluation shows a material diagnosis-quality gap.
