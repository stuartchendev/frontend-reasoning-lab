# Current Project Status

## Production

FRL v3 is the current application on `main` and is deployed to production. The
guided practice path is:

```txt
Answer
→ Revise
→ Review
→ start a validated recommended question
→ new Answer session
```

After the Public Interactive Walkthrough branch was merged into `main`, the
resulting production deployment was manually verified. The walkthrough
completed successfully, the real-model evidence CTA and local live-AI README
CTA reached their intended destinations, and no unexpected errors were
observed during that check.

This is a manual production smoke check. It does not claim hosted live-model
inference or replace the separate local real-model evidence.

## v0.3.1 Release-status Closure

The current v3 release line includes:

- a phase-driven Answer → Revise → Review practice session
- immutable submitted-answer snapshots and explicit retry/edit recovery paths
- stale session and request protection
- one bounded diagnosis, targeted revision, semantic comparison, and validated
  next action
- recommendation navigation through the application-owned question-selection
  boundary into a fresh session
- structural and semantic validation before model results enter browser session
  state
- a production Public Interactive Walkthrough that accepts only the verified
  demo answer and revision
- local live inference through LM Studio or OpenAI behind server-owned HTTP and
  provider boundaries

The application owns question and session state, legal transitions, result
acceptance, navigation, and rendering. The model proposes structured,
bounded evaluation results; it does not own the workflow or write directly to
UI state.

The `v0.3.0` tag records the completed v3 guided workflow and local real-model
evidence baseline. This document prepares the `v0.3.1` status closure for the
already merged and production-verified public walkthrough. It does not claim
that the `v0.3.1` tag has already been created.

## Execution and Evidence Boundaries

| Context | Evaluation source | Verified boundary |
| --- | --- | --- |
| Public production | Replayed Call 1 and Call 2 responses captured from a validated real local model run | Verified demo answer and revision only; application workflow runs in the browser |
| Local development | Live LM Studio or OpenAI inference through the existing server-owned boundary | Arbitrary answers and revisions; provider credentials and configuration remain outside browser code |

The public walkthrough does not send model requests and does not present fixed
feedback as an evaluation of edited input. Only model inference is replayed;
the reducer, phase transitions, revision comparison, recommendation navigation,
and session reset still execute.

Current reviewer references:

- [`../README.md`](../README.md) — current project positioning, execution modes,
  local setup, and verification scope
- [`v3/evidence/README.md`](./v3/evidence/README.md) — local same-session
  real-model browser evidence
- [`v3/ARCHITECTURE_DECISIONS.md`](./v3/ARCHITECTURE_DECISIONS.md) — accepted
  v3 ownership and contract decisions

## Scope Boundary

FRL remains a bounded engineering demonstration. Authentication, persistence,
accounts, practice history, analytics, admin tooling, payments, broad routing,
an open-ended public AI endpoint, and a full learning platform remain outside
the current release scope.

The v2 and v1 documents remain historical implementation evidence. They do not
describe the current production release.
