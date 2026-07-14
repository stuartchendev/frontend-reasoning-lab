# Current Project Status

## Production

FRL v1 is completed, frozen, and currently deployed to production.

FRL v2 Mini is implemented on the `FRLv2` development/release branch. It has not yet been merged into `main` or deployed.

## FRLv2 Release Status

The branch currently includes:

- a static ten-question frontend reasoning bank
- controlled search and visual category grouping
- explicit Overview and Question content selection through `SelectedContent`
- parent-owned selection, search, answer, and evaluation state
- derived filtered questions, category groups, and selected-question data
- a controlled `QuestionNavigator` and separate `OverviewPanel`
- answer/result reset when selected content changes
- stale evaluator request invalidation
- the preserved typed evaluator boundary
- responsive and keyboard interaction support
- project introduction, metadata, and presentation polish

The current implementation decisions are documented in [`v2/FRL_V2_DECISIONS.md`](./v2/FRL_V2_DECISIONS.md). V2 verification is documented in [`v2/VERIFICATION.md`](./v2/VERIFICATION.md).

## Remaining Before Merge

- organize the existing v1 documents into the approved versioned structure
- move archived planning documents and repair links affected by those moves
- replace the v1 preview image with the final v2 release preview
- run the final README and documentation link check
- verify the production deployment as part of the version-level release
- align portfolio and public evidence with the released version

These are release-evidence and organization tasks. They do not reopen application feature scope.

## Deferred Scope

The following are not part of the current FRL v2 Mini release:

- practice history and `localStorage` persistence
- authentication, user accounts, and backend storage
- real AI API integration
- routing, dashboards, analytics, and admin tooling
- question-specific scoring and production evaluator behavior
- dark mode and further visual expansion
- full learning-platform features

The original v0.1 planning document is preserved at [`v2/FRL_V2_MINI_SCOPE_V0_1.md`](./v2/FRL_V2_MINI_SCOPE_V0_1.md). It is historical context and does not override the current decisions or release status.
