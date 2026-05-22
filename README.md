# Frontend Reasoning Lab

An experimental frontend reasoning practice project focused on state design, data flow, component responsibility, and AI-assisted engineering workflow.

> Train reasoning consistency, not answer generation.

## Project Status

This repository is currently in the **tiny proof / planning stage**.

The broader MVP direction is documented in [`PROJECT_SCOPE.md`](./PROJECT_SCOPE.md).  
The current short-term goal is to slice that broader vision into a small, explainable proof of workflow before expanding the product scope.

## Why This Project Exists

Frontend learners often know how to make a UI work, but struggle to explain:

- why a specific state model was chosen
- what should be stored vs derived
- how data flows through the UI
- where component responsibilities should be separated
- how to defend trade-offs in an interview or code review

This project explores a structured way to practice those explanations.

The goal is not to build a generic AI chatbot or answer generator.  
The goal is to build a reasoning-focused training flow that helps users practice frontend engineering decisions.

## Current Tiny Proof Scope

The first proof should stay intentionally small.

It should focus on one end-to-end flow:

1. Show a small frontend code snippet and reasoning question.
2. Let the user write an answer.
3. Evaluate the answer through a fake or replaceable evaluator boundary.
4. Display structured feedback.
5. Keep the state model and component responsibilities explainable.

The first version may use:

- a small local question list
- a fake async evaluator instead of a real API
- structured feedback data
- minimal stored state
- derived values where possible

## Tiny Proof Non-Goals

The tiny proof should not include:

- login
- realtime voice interview flow
- avatar interviewer
- cheating / copilot overlay
- autonomous multi-agent workflow
- large external question bank
- full SaaS account system
- long-term AI memory
- analytics dashboard
- full MVP-level practice tracking

These may be reconsidered later only after the core reasoning loop is proven.

## Broader MVP Direction

The broader MVP vision may eventually include:

- topic selection
- curated frontend reasoning questions
- structured rubric-based evaluation
- adaptive follow-up questions
- final feedback summary
- minimal practice attempt tracking
- clear loading / error / retry states

The key product direction is to support:

- reasoning structure
- engineering intent
- design defense
- evaluation consistency

## Engineering Focus

This project is intended to demonstrate:

- state-driven UI
- single source of truth
- stored vs derived state decisions
- async UI status handling
- component responsibility separation
- API / evaluator boundary design
- TypeScript contracts for structured data
- scope control before implementation

## AI-Assisted Workflow Positioning

This project is also used as a small proof of AI-assisted engineering workflow.

AI tools may support:

- goal review
- scope risk identification
- implementation planning
- small diff review
- documentation drafting

However, the owner remains responsible for:

- final scope decisions
- state model design
- data flow decisions
- component boundaries
- TypeScript type design
- final code quality review
- project explanation and documentation

## Current Workflow

```txt
MVP vision
→ tiny proof goal
→ Codex /goal review
→ owner decision
→ implementation plan
→ small implementation slice
```

For now, implementation should not expand beyond the tiny proof unless the scope is reviewed first.

## Possible Resume / Interview Narrative

> Scoped a broader AI-assisted frontend reasoning trainer into a tiny proof milestone to validate the core evaluation flow before expanding into a full MVP.

This project is meant to show not only that a feature can be built, but that the scope, state model, data flow, and responsibilities can be explained clearly.