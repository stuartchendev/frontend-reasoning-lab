# Frontend Reasoning Lab

Frontend Reasoning Lab is a tiny proof project focused on frontend reasoning within a small, controlled UI workflow.

Rather than building a large product, the goal is to demonstrate how I think about state, data flow, responsibility boundaries, and AI-assisted engineering decisions.

> Train reasoning consistency, not answer generation.

## Live Demo

[View Live Demo](https://frontend-reasoning-lab.netlify.app/)

## Preview

![Frontend Reasoning Lab preview](./docs/preview.png)

This tiny proof demonstrates a controlled frontend reasoning loop: a fixed question, answer input, evaluator boundary, structured result, and visible feedback/data-flow behavior.

## Why This Project Exists

Frontend work is not only about rendering UI. It also involves deciding:

- what state should exist
- what should be derived
- where evaluation logic belongs
- how user actions move through the system
- how to keep scope small and explainable

This project makes those decisions visible.

## What It Demonstrates

> This project demonstrates a small but complete frontend reasoning loop:
>
> ```txt
> fixed question + code snippet
> → user answer
> → state update
> → fake async evaluator
> → structured result
> → UI feedback
> → decision notes
> ```
>
> The focus is not feature expansion, but making state, data flow, responsibility boundaries, and engineering decisions explainable.

## Core Ideas

### State-Driven UI

User input updates state, the evaluator produces a result, and the UI renders feedback from that result.

The UI does not own the evaluation decision. It reflects the current state and result.

### Evaluator Boundary

The evaluator is separated from the UI layer.

The UI presents input and feedback.  
The evaluator checks input against the rubric and produces a result.

This keeps rendering responsibility separate from evaluation responsibility.

### Rubric vs Result

The rubric defines what should be evaluated.  
The result represents the outcome of that evaluation.

Keeping them separate makes responsibilities easier to reason about.

### Scope Control

This project was intentionally kept small.

The focus was on completing a tiny proof with a clear boundary and explainable decisions.

### AI-Assisted Engineering Workflow

AI was used as a thinking and implementation assistant during development.

Project scope, architecture, and final decisions were reviewed and owned by me.

Decision notes are documented in:

```txt
docs/ai-assisted-decision-log.md
```

## Tech Stack

- React
- TypeScript
- Vite
- CSS

## Status

Tiny proof completed and frozen.

Demonstrates:

- controlled scope
- state-driven UI
- visible data flow
- evaluator boundary
- rubric/result separation
- AI-assisted decision logging

## Key Takeaway

Frontend Reasoning Lab shows how I approach frontend work beyond rendering UI:

define a small scope, model state, separate responsibilities, document decisions, and keep implementation explainable.

## Additional Notes

This README is intentionally focused on the completed tiny proof scope.

For deeper project context, see:

- `docs/ai-assisted-decision-log.md` — scope decisions, slice rationale, deferred features, owner responsibility, and AI assistance boundary
- `docs/EVALUATOR_RUBRIC.md` — fixed question context, rubric expectations, manual evaluator checks, and future evaluator boundary
- `docs/TINY_PROOF.md` — original owner draft for the tiny proof direction
