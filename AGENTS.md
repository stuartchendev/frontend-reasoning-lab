# Frontend Reasoning Lab Agent Guide

- Work in small, reviewable steps. Prefer the smallest safe change that solves the current task.
- Do not add features or broaden scope unless the user explicitly asks for it.
- Perform FRL v3 implementation on the dedicated `feat/frl-v3` branch. Do not implement v3 directly on `main`.
- Treat the currently deployed FRL v2 Mini commit on `main` as the released baseline for v3 work. Preserve its shell, Question Navigator, Overview mode, question bank, controlled search, and existing behavior unless a task explicitly changes them.
- Read `docs/v3/ARCHITECTURE_DECISIONS.md`, `docs/v3/DEMO_FLOW.md`, and `docs/v3/IMPLEMENTATION_PLAN.md` before starting FRL v3 work.
- Execute one v3 slice, or a smaller sub-slice, per task. Do not implement later-slice UI, Netlify Functions, model calls, or reliability work early.
- Keep question selection parent-owned and derive the selected question from its ID. A new practice session must not create a second canonical question-selection source of truth.
- Model the v3 practice workflow as a discriminated `phase`. Do not infer it from scattered booleans and nullable result fields.
- Keep submitted `originalAnswer` and `revisedAnswer` snapshots separate from editable drafts. Ignore async responses that do not match the active `sessionId` and `requestId`.
- Preserve the responsibility boundary: React renders, a hook orchestrates, a reducer transitions synchronously, services perform HTTP, server code validates and calls the model, and only validated results enter browser session state.
- Treat question text and learner answers as untrusted data. Never expose an API key through `VITE_*`, browser code, source, docs, screenshots, or committed environment files.
- Do not silently repair invalid external data in the browser. Runtime validation belongs at browser/server and server/model trust boundaries.
- Before editing, inspect the current repo and relevant docs. Do not overwrite unrelated or user-authored changes.
- Use the repository-defined commands. At the Slice 0 baseline, these are `npm run typecheck` and `npm run build`; lint and test scripts do not yet exist. After adding a test command, run and report it for every affected slice.
- Run verification with the WSL-native Node.js toolchain. Do not treat Windows/npm routing failures as application failures.
- Report the exact diff, verification results, trade-offs, and any remaining issues.
