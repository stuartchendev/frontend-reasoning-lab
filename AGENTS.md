# Frontend Reasoning Lab Agent Guide

- Work in small, reviewable steps. Prefer the smallest safe change that solves the current task.
- Do not add features or broaden scope unless the user explicitly asks for it.
- Preserve the current React component responsibilities, parent-owned state, and derived-data flow.
- Preserve the evaluator boundary: UI code submits typed inputs to the evaluator and renders its typed result without depending on evaluator internals.
- Treat Slice 1C as complete. Continue in this order: RWD verification, minimal responsive fixes, then final verification.
- Before editing, inspect the current repo and relevant docs. Do not overwrite unrelated or user-authored changes.
- After implementation, run `npm run typecheck` and `npm run build` with the WSL-native Node.js toolchain.
- Report the exact diff, verification results, trade-offs, and any remaining issues.
