# Verification — Tiny Proof v0

This document defines how to verify that the tiny proof stays small and works as intended.

It is not a full automated checker yet.  
It is a human-readable guardrail for scope control, manual validation, and future Codex review.

## Purpose

The goal of v0 is to validate one small evaluator flow:

```txt
snippet → answer → loading → structured feedback → edit/resubmit
```

v0 should prove the core reasoning loop without expanding into the broader MVP.

## Scope Check

v0 is complete only if it includes:

- one fixed frontend reasoning question
- one code snippet
- one answer textarea
- one fake async evaluator
- one structured feedback result
- edit and resubmit behavior

v0 should not include:

- topic selection
- multiple-question UI
- adaptive follow-up questions
- practice tracking or history
- real API integration
- routing
- login
- dashboard
- analytics
- long-term memory
- large external question bank

These features may belong to a later MVP, but they should not appear in tiny proof v0.

## Manual Flow Check

The v0 flow passes if:

- The page loads with one question and one code snippet.
- An empty answer cannot be submitted.
- Submitting a valid answer shows a loading state.
- The fake evaluator returns structured feedback.
- Feedback renders in clear sections.
- Editing the answer and submitting again replaces the previous feedback.
- No postponed MVP features appear in the UI.

## Engineering Check

The implementation should follow these rules:

- Stored state is limited to user input, async status, feedback result, and error state.
- UI affordances such as `canSubmit`, `hasFeedback`, and button labels are derived.
- The fake evaluator is isolated behind a replaceable function boundary.
- Structured feedback uses a typed contract.
- Components have clear responsibilities.
- The UI does not depend on evaluator implementation details.

## Expected State Shape

Suggested stored state:

```ts
const [answerText, setAnswerText] = useState("");
const [evaluationStatus, setEvaluationStatus] =
  useState<"idle" | "loading" | "success" | "error">("idle");
const [feedbackResult, setFeedbackResult] =
  useState<EvaluationResult | null>(null);
const [errorMessage, setErrorMessage] = useState<string | null>(null);
```

Suggested derived values:

```ts
const canSubmit =
  answerText.trim().length > 0 && evaluationStatus !== "loading";

const hasFeedback = feedbackResult !== null;
```

Do not store derived values unless there is a clear reason.

## Evaluator Boundary Check

The evaluator should be replaceable.

A future real API evaluator should be able to use the same input and output shape without changing the UI state model.

Suggested boundary:

```ts
type EvaluationInput = {
  questionId: string;
  codeSnippet: string;
  prompt: string;
  userAnswer: string;
};

type EvaluationResult = {
  accuracy: "strong" | "partial" | "weak";
  strengths: string[];
  gaps: string[];
  suggestions: string[];
};

function evaluateAnswer(input: EvaluationInput): Promise<EvaluationResult>;
```

## Completion Definition

Tiny proof v0 is done when:

- the single flow works end to end
- the scope has not expanded into MVP features
- stored vs derived state can be clearly explained
- the evaluator boundary can be explained
- the project produces one resume-ready engineering talking point

Possible talking point:

> Built a tiny proof of a frontend reasoning trainer by validating one evaluator flow with typed structured feedback, explicit async UI states, and a replaceable evaluator boundary before adding real AI or broader MVP features.
