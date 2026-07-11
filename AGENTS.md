# Frontend Reasoning Lab Agent Guide

- Work in small, reviewable steps. Prefer the smallest safe change that solves the current task.
- Do not add features or broaden scope unless the user explicitly asks for it.
- Preserve the current React component responsibilities, parent-owned state, and derived-data flow.
- Preserve the evaluator boundary: UI code submits typed inputs to the evaluator and renders its typed result without depending on evaluator internals.
- Treat Slice 1A selection, Slice 1B search, Slice 1C visual category grouping, RWD, and final verification as complete.
- The deployed production site remains v1; `FRLv2` is the development/release branch. Do not imply that v2 is deployed.
- The next bounded phase is project cleanup, followed separately by layout polish. Do not start component extraction or Slice 2 without an explicit scope.
- Before editing, inspect the current repo and relevant docs. Do not overwrite unrelated or user-authored changes.
- After implementation, run `npm run typecheck` and `npm run build` with the WSL-native Node.js toolchain.
- Report the exact diff, verification results, trade-offs, and any remaining issues.
