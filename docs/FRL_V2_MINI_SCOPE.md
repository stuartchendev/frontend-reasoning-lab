# FRL v2 Mini Scope v0.1

## Purpose

FRL v2 Mini is the next-stage evidence upgrade for Frontend Reasoning Lab.

FRL v1 was intentionally kept as a tiny proof. It demonstrated one controlled frontend reasoning loop:

```txt
fixed question
→ user answer
→ fake async evaluator
→ structured result
→ UI feedback
→ decision notes
```

FRL v2 Mini should not replace or invalidate that frozen tiny proof. Instead, it extends the same idea into a small, user-facing practice flow.

The goal is to show that I can design a React + TypeScript frontend app with clearer user journey, state modeling, data flow, service boundaries, and component responsibilities.

This is not a full education platform.
This is not a production SaaS.
This is a controlled frontend evidence project for job search, portfolio, GitHub, and interview explanation.

---

## Product Positioning

**Working name:**

Frontend Reasoning Lab v2 Mini: Question Bank + Practice History

**One-sentence positioning:**

A small React + TypeScript frontend interview practice app where users select a frontend reasoning question, write an answer, receive structured feedback, and review local practice history.

---

## Target User

The target user is a junior or early-career frontend candidate who wants to practice explaining frontend engineering decisions.

The user may understand React basics, but needs help practicing how to explain:

- state vs derived data
- component responsibility
- data flow
- async UI behavior
- trade-offs
- implementation reasoning

---

## User Problem

The user does not only need interview questions.

They need a practice flow that helps them move from:

```txt
I know some frontend concepts
```

to:

```txt
I can explain my reasoning clearly in an interview
```

The main pain points are:

- not knowing how to structure an answer
- not knowing what reasoning dimensions are missing
- receiving feedback that is too generic
- having no simple way to review previous practice attempts
- difficulty connecting frontend implementation details to user-facing behavior

---

## Core User Journey

The v2 Mini user journey should stay small:

```txt
User opens the app
→ sees a list of frontend reasoning questions
→ selects one question
→ reads the scenario and criteria
→ writes an answer
→ submits the answer
→ receives structured feedback
→ saves the practice attempt locally
→ reviews previous attempts
```

The user-facing value is:

> The user can practice one frontend reasoning question, receive structured feedback, and understand what to improve next.

---

## In Scope

### 1. Question Bank

A static question bank stored in the frontend codebase.

Each question should include:

- id
- title
- category
- difficulty
- scenario
- prompt
- optional code snippet
- evaluation criteria

Initial categories may include:

- React state
- derived state
- component responsibility
- async UI
- data flow

The first version should only include a small number of questions.

Suggested initial count:

```txt
3–5 questions
```

### 2. Question Selection

The user should be able to select a question from a list.

The selected question should become the current practice target.

State should likely include:

```ts
selectedQuestionId
```

The selected question object should be derived from:

```ts
questions + selectedQuestionId
```

Do not store the full selected question object as duplicate state unless there is a clear reason.

### 3. Practice View

The practice view should show:

- selected question title
- scenario
- prompt
- optional code snippet
- evaluation criteria
- answer input
- submit button

The answer input should be controlled by React state.

State should include:

```ts
answerText
```

### 4. Mock Evaluator

The evaluator should remain fake / local in v2 Mini.

It should preserve the existing evaluator boundary:

```txt
UI submits question + answer
→ evaluatorService returns structured result
→ UI renders result
```

The evaluator does not need to call a real AI API.

The evaluator result should be structured enough to support clear UI feedback.

Possible result shape:

```ts
type EvaluationResult = {
  summary: string;
  strengths: string[];
  improvements: string[];
  nextStep: string;
};
```

### 5. Practice History

The app should save submitted attempts to localStorage.

Each history item may include:

```ts
type PracticeAttempt = {
  id: string;
  questionId: string;
  answerText: string;
  result: EvaluationResult;
  createdAt: string;
};
```

The user should be able to review recent practice attempts.

The purpose is not analytics.
The purpose is to show a simple local user flow:

```txt
practice → feedback → review
```

### 6. Service Boundaries

The app should separate core logic from rendering logic.

Suggested service files:

```txt
questionService
evaluatorService
historyService
```

Responsibilities:

```txt
questionService
→ provides static questions and lookup helpers

evaluatorService
→ accepts question + answer and returns structured feedback

historyService
→ saves and loads practice attempts from localStorage
```

React components should not directly own all data logic.

### 7. UI States

The app should show basic frontend interaction states where appropriate:

- empty question state
- empty answer prevention
- submitting / evaluating state
- result state
- empty history state
- localStorage failure fallback if needed

The goal is not complex polish.
The goal is to show that user interaction states are considered.

### 8. Documentation

The README or docs should explain:

- why FRL v1 is frozen
- why v2 Mini exists
- what user problem v2 Mini addresses
- state model
- data flow
- service responsibility boundaries
- trade-offs
- why real AI / backend / auth are excluded
- how AI assistance was used and reviewed

---

## Out of Scope

FRL v2 Mini should not include:

- real AI API
- login / auth
- backend database
- user accounts
- dashboard
- analytics
- voice mode
- public sharing
- admin system
- payments
- full education platform
- complex routing
- large design system
- production-grade scoring engine
- multi-user collaboration

These may be future ideas, but they are not part of v2 Mini.

---

## Engineering Goals

FRL v2 Mini should demonstrate:

- React + TypeScript implementation
- state-driven UI
- selected item state
- derived data
- controlled input
- async-like evaluator flow
- local persistence
- service boundaries
- component responsibility separation
- user-facing feedback flow
- scope control
- explainable trade-offs

The project should remain small enough to explain clearly in an interview.

---

## Interview Narrative

FRL v2 Mini can be explained like this:

```txt
FRL v1 was a tiny proof that demonstrated one controlled frontend reasoning loop.

For v2 Mini, I wanted to add more user-facing product flow without turning it into a full education platform.

So I added a small question bank, question selection, answer input, structured feedback, and local practice history.

The main frontend reasoning was deciding what should be stored as state, what should be derived, and how to separate question data, evaluator logic, local persistence, and UI rendering responsibilities.

The goal was not to build a production SaaS. The goal was to show a small but complete React + TypeScript practice flow that is easier for users and interviewers to understand.
```

---

## First Implementation Slice

Do not start with practice history.

The first implementation slice should be:

```txt
Question Bank Foundation
```

### Slice 1 goal

Add a static question bank and allow the user to select a question.

### Slice 1 includes

- create static `questions.ts`
- define `Question` type
- render question list
- store `selectedQuestionId`
- derive `selectedQuestion`
- show selected question detail
- keep existing evaluator flow simple

### Slice 1 excludes

- localStorage
- practice history
- real AI API
- routing
- dashboard
- redesign

### Slice 1 success criteria

The app should allow a user to:

```txt
open the app
→ see multiple questions
→ select one question
→ read its scenario and prompt
```

No history is required yet.

---

## Production Extension Path

The following features are valid future directions, but they are intentionally excluded from FRL v2 Mini.

If the project moved toward a real product, production expansion should happen in stages:

1. Replace the mock evaluator with a real evaluator API behind the same evaluator boundary.
2. Move local practice history to backend persistence only when cross-device or account-based history is needed.
3. Add authentication only when user-specific saved history or private progress data becomes necessary.
4. Add dashboard or analytics only after the core loop has enough meaningful user activity.
5. Consider voice practice only after the text-based reasoning flow is stable.

This extension path is an interview and future-direction reference. It should not be treated as permission to expand v2 Mini immediately.

---

## Stop Line

FRL v2 Mini should stop when it demonstrates:

```txt
question selection
→ practice answer
→ structured feedback
→ local practice history
```

Once those are working and documented, the next step is not automatic expansion.

The next step should be:

- README update
- portfolio case-study update
- interview answer update
- resume bullet update

Do not expand into a larger platform unless there is clear job-search value.
