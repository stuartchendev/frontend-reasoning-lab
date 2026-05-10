# Architecture Overview

## Architecture Goal

The architecture should:
- remain small and explainable
- separate UI concerns from evaluation logic
- support future provider replacement
- keep prompts and evaluation rules server-side
- avoid tightly coupling the system to one LLM vendor

---

## High-Level Flow

```txt
Frontend UI
→ API Route / Backend Layer
→ Evaluation Pipeline
→ LLM Provider Adapter
→ Structured JSON Response
→ UI Rendering
```

---

## Recommended Stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend
- Next.js API routes or lightweight Node backend

### AI Layer
- OpenAI as the initial provider
- provider adapter pattern for future compatibility

Potential future providers:
- Anthropic
- local models
- mock provider for testing

---

## Suggested Folder Structure

```txt
/src
  /app
  /components
  /features/interview
    questions.ts
    rubrics.ts
    interviewState.ts
    types.ts
  /server
    evaluateAnswer.ts
    generateFollowUp.ts
    llmClient.ts
```

---

## Frontend Responsibilities

The frontend is responsible for:
- topic selection
- answer input
- displaying feedback
- displaying follow-up questions
- managing async UI state
- rendering practice history

The frontend should NOT:
- store prompts
- contain API keys
- contain evaluation philosophy logic
- tightly couple to one provider

---

## Backend Responsibilities

The backend is responsible for:
- prompt orchestration
- rubric injection
- provider communication
- follow-up generation
- structured response generation
- protecting API keys

---

## Evaluation Pipeline Philosophy

The evaluation system should prefer:
- structured JSON
- predictable schema
- explainable evaluation
- constrained output

Avoid:
- vague prose-only responses
- unconstrained AI output
- hidden evaluation logic

---

## Suggested Evaluation Shape

```ts
export type EvaluationResult = {
  detected: {
    intent: boolean;
    tradeOff: boolean;
    example: boolean;
    failureCase: boolean;
    stateResponsibility: boolean;
    consistency: boolean;
  };
  feedback: string;
  followUpQuestion: string;
  improvedAnswer?: string;
};
```

---

## Async UI States

The interview flow should use explicit UI states.

Suggested states:
- idle
- answering
- evaluating
- followUp
- completed
- error

Avoid multiple disconnected boolean states.

---

## AI Provider Abstraction

Suggested abstraction:

```ts
interface LLMClient {
  generate(prompt: string): Promise<string>;
}
```

This allows:
- provider replacement
- mock testing
- experimentation
- cost control

---

## Initial Persistence Strategy

Initial persistence can remain lightweight.

Acceptable early options:
- local JSON
- browser localStorage
- small database later if needed

Do not over-engineer persistence before validating the core workflow.

---

## Important Architectural Constraints

The project should remain:
- explainable
- modular
- maintainable
- portfolio-friendly

Avoid:
- premature microservices
- unnecessary realtime systems
- over-designed infrastructure
- complex orchestration before the core loop works
