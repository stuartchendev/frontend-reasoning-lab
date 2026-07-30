# Frontend Reasoning Lab Documentation

This directory separates shared project references from version-specific evidence.

## Current Release Path

FRL v3 is the current application on `main` and in production. Its guided
workflow moves through Answer → Revise → Review while the application owns
session state, legal transitions, validation boundaries, recommendation
navigation, and rendering.

The `v0.3.1` release-status closure adds the Public Interactive Walkthrough to
the v3 release line. Production replays validated responses captured from a
real local model run; local development can run the same application workflow
with live LM Studio or OpenAI inference through the existing server-owned
boundary.

For the current release and reviewer path, read:

1. [`CURRENT_STATUS.md`](./CURRENT_STATUS.md) — current production and
   `v0.3.1` release-closure status
2. [`../README.md`](../README.md) — project positioning, execution modes,
   architecture, local live-AI setup, and verification boundaries
3. [`v3/evidence/README.md`](./v3/evidence/README.md) — same-session local
   real-model Answer → Revise → Review browser evidence
4. [`v3/ARCHITECTURE_DECISIONS.md`](./v3/ARCHITECTURE_DECISIONS.md) — accepted
   v3 ownership, contract, and state-machine decisions

[`v3/DEMO_FLOW.md`](./v3/DEMO_FLOW.md) and
[`v3/IMPLEMENTATION_PLAN.md`](./v3/IMPLEMENTATION_PLAN.md) are retained as the
original v3 handoff and slice plan. Their baseline status language is
historical and does not override the current release status.

## Shared Reference

![Frontend Reasoning Lab core reasoning model](./frl-core-concepts.svg)

The core reasoning model summarizes the project principles that remain shared across versions: explicit state ownership, predictable data flow, responsibility boundaries, verification, scope control, and owner accountability in AI-assisted work.

- [`frl-core-concepts.svg`](./frl-core-concepts.svg) — cross-version reasoning model
- [`EVALUATOR_RUBRIC.md`](./EVALUATOR_RUBRIC.md) — shared evaluator rubric and boundary

## Historical v2 Evidence

The following files describe the released v2 Mini frontend foundation retained
by v3:

- [`v2/FRL_V2_DECISIONS.md`](./v2/FRL_V2_DECISIONS.md)
- [`v2/VERIFICATION.md`](./v2/VERIFICATION.md)
- [`v2/FRL_V2_MINI_SCOPE_V0_1.md`](./v2/FRL_V2_MINI_SCOPE_V0_1.md)

## Historical v1 Evidence

The following files describe the completed and frozen v1 tiny proof:

- [`v1/FRL_V1_DECISIONS.md`](./v1/FRL_V1_DECISIONS.md)
- [`v1/TINY_PROOF.md`](./v1/TINY_PROOF.md)
- [`v1/VERIFICATION.md`](./v1/VERIFICATION.md)

## Archived and Future Context

The following planning documents are retained for historical context:

- [`archive/FUTURE_MVP_SCOPE.md`](./archive/FUTURE_MVP_SCOPE.md)
- [`archive/FUTURE_ARCHITECTURE_NOTES.md`](./archive/FUTURE_ARCHITECTURE_NOTES.md)
- [`archive/ARCHIVED_AI_COLLAB_CONTEXT.md`](./archive/ARCHIVED_AI_COLLAB_CONTEXT.md)

They do not override [`CURRENT_STATUS.md`](./CURRENT_STATUS.md) or the current
v3 reviewer path.
