# FRL v3 Demo Flow

## Status

Accepted three-minute demo baseline. This is a product-flow handoff, not implemented behavior.

The v2 page shell, project introduction, left Question Navigator, Overview, question-bank context, and responsive layout remain. A later slice changes only the right practice area into one phase-driven Practice Workspace.

## Stable Reference Path

Use `react-state-ownership-01` and this intentionally plausible but flawed answer:

> QuestionNavigator can keep the selected question in its state and pass it to PracticePanel as a prop. PracticePanel can also keep its own selected question so it can render the current content.

The expected primary gap is unclear source of truth, supported by the learner evidence “PracticePanel can also keep its own selected question.” The targeted follow-up asks which component should own the single canonical `selectedQuestionId` and how the navigator should request a change.

The revision establishes that `App` owns the selected ID, passes it down, receives change requests through a callback, and avoids duplicated canonical state that can diverge.

## Workspace States

### Answering

- Show category, title, prompt, optional code, and a lightweight `Answer → Revise → Review` indicator.
- Show one controlled answer editor and an `Analyze reasoning` action.

### Diagnosing

- Keep the question and submitted answer visible.
- Show: “Analyzing your reasoning against the question criteria…”
- Do not replace the workspace with an empty spinner.

### Revising

- Show at most one evidence-based recognized strength.
- Show one primary gap: rubric label, concise explanation, exact learner evidence, and why it matters.
- Show one targeted follow-up.
- Initialize the revision editor from the original answer rather than an empty field.

### Reviewing revision

- Keep the diagnosis and submitted revision visible.
- Show: “Comparing your original and revised reasoning…”

### Complete: revision reviewed

- Show gap resolution as resolved, partially resolved, or unresolved; do not show a numeric score.
- Show original evidence, revised evidence, and a concise semantic improvement explanation.
- Show a compact rubric summary.
- Show one validated next action. A recommended question must exist in the fixed bank.
- Selecting a recommendation starts a new session and returns to answering.

### Complete: initial sufficient

- Do not invent a gap or force revision.
- Show the required reasoning dimensions already covered and one optional bounded next practice action.

## Recovery Paths

Diagnosis failure preserves the submitted original answer and offers `Try again` or `Edit answer`.

Revision-review failure preserves the submitted revision and offers `Try again` or `Continue editing`.

Switching questions during either request starts a new session; an old response must not update the new question.

## Three-Minute Script

### 0:00–0:25 — Problem

Frontend learners often receive generic AI feedback without seeing where their engineering reasoning broke down.

### 0:25–0:55 — Submit a plausible incomplete answer

Use the duplicated-ownership reference answer and select `Analyze reasoning`.

### 0:55–1:30 — Diagnosis

Show one recognized strength, one primary gap, exact learner evidence, and one targeted follow-up.

Key message for the real-call demo: the model evaluates against a question-defined rubric and proposes one bounded learning action; it does not invent the grading rules.

### 1:30–2:00 — Revision

Revise the answer to give `App` canonical ownership, pass the ID down, and use a callback for change requests. Select `Review revision`.

### 2:00–2:35 — Reasoning comparison

Show gap resolution, original and revised evidence, and the semantic improvement.

Key message: FRL makes the learner's change in reasoning visible instead of only displaying another answer.

### 2:35–3:00 — Next action and control boundary

Show one bounded next action. When a fixed-bank recommendation is available and validated, it must reference an existing question.

Key message: the model proposes; the application validates, owns the session, and permits only bounded actions.

## Demo Success Criteria

- Feedback is tied to exact learner evidence.
- Exactly one primary reasoning gap is selected.
- The learner revises their own answer.
- The before/after reasoning change is visible.
- The next action is bounded and explainable.
- The application, not the model, owns workflow state and navigation.
- Loading or failure never destroys submitted learner input.
