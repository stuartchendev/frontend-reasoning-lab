> Status: Future MVP scope note.
>
> This document describes a broader product direction that was intentionally deferred after the tiny proof was completed.
>
> The current public-facing scope is documented in `README.md`.

# Frontend Reasoning Trainer — Project Scope

## Project Overview

This is an experimental AI-assisted workflow project focused on frontend interview reasoning practice.

The goal is **not** to build:
- a generic AI chatbot
- a realtime voice interviewer
- a cheating/copilot system

The goal **is** to build:
- a structured reasoning training workflow
- focused on frontend engineering decision-making
- with follow-up defense and structured evaluation

Core concept:
> Train reasoning consistency, not answer generation.

---

## One-line Description

A frontend-focused reasoning trainer that helps users practice engineering explanations, follow-up defense, and structured interview thinking.

---

## Core Problem

Current AI interview tools mostly:
- generate answers
- simulate conversations
- provide generic feedback

But they often fail to:
- evaluate reasoning quality clearly
- expose missing trade-offs
- test follow-up consistency
- turn repeated practice into a structured learning loop

This project focuses on:
- reasoning structure
- engineering intent
- design defense
- evaluation consistency

---

## Target Users

Primary users:
- junior frontend engineers
- React / TypeScript learners
- candidates preparing for frontend interviews

Focus area:
- frontend engineering reasoning
- not general software engineering interview preparation

---

## Core Training Topics

Initial topic candidates:
- state responsibility
- derived state
- single source of truth
- async UI state
- `useEffect` responsibility
- API normalization
- component design
- rendering flow
- `filter` vs `find`
- optimistic UI
- state machine design

---

## MVP Workflow

1. User selects a topic.
2. System presents one main interview question.
3. User submits a text answer.
4. Backend evaluates the answer using a structured rubric.
5. System generates one follow-up question based on the answer.
6. User answers the follow-up.
7. System returns final structured feedback.

---

## MVP Must Include

- topic selection
- a small curated question set
- text-based answer input
- structured answer evaluation
- one adaptive follow-up question
- final feedback summary
- practice attempt storage or tracking in a minimal form
- clear loading / error / retry states for async interactions

---

## Explicit Non-Goals

Do **not** build in the first version:
- realtime voice interview flow
- avatar interviewer
- cheating/copilot overlay
- autonomous multi-agent system
- full recruiter simulator
- long-term AI memory
- JD matching platform
- broad software-engineering interview coverage
- full SaaS account system
- excessive analytics or dashboards before the core loop works

This is an experimental workflow project, not a startup platform.

---

## Product Differentiation

The differentiation is **not**:
- smarter AI
- larger prompts
- realtime voice
- generic answer generation

The differentiation **is**:
- fixed evaluation structure
- reasoning-specific rubric
- follow-up defense
- consistency-focused feedback
- repeatable practice workflow

---

## Success Criteria for MVP

The MVP succeeds if:
- the workflow feels coherent from question to final feedback
- feedback points to concrete reasoning gaps rather than generic advice
- follow-up questions meaningfully test the user's prior answer
- the architecture is explainable and maintainable
- the project can be demonstrated and discussed clearly in a portfolio or interview

The MVP fails if:
- it becomes ChatGPT with extra UI
- the AI workflow is vague or unstructured
- scope expands before the core loop is proven
- feedback becomes generic praise without reasoning value

---

## README Positioning Draft

> An experimental AI-assisted workflow project focused on frontend interview reasoning, structured evaluation, and follow-up defense training.

---

## Estimated Delivery Shape

Target: a demoable MVP in roughly 3–4 weeks of focused work.

Likely sequence:
1. scope, architecture, rubric, and UI flow
2. evaluation pipeline and follow-up workflow
3. practice tracking and result presentation
4. polish, deployment, and portfolio narrative
