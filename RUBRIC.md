# Reasoning Evaluation Rubric

## Rubric Philosophy

The system should not attempt to determine a single perfect answer.

Instead, the rubric exists to:
- detect missing reasoning parts
- identify explanation weaknesses
- evaluate consistency
- encourage structured engineering thinking

This is a reasoning calibration system, not a grading system.

---

## Primary Evaluation Dimensions

### 1. Intent Clarity

Questions:
- Did the user explain the purpose of the decision?
- Did the answer connect the design to user or system intent?

Good example:
> I used `activeProjectId` because the UI only needs the selected entity identity.

Weak example:
> I used it because it works.

---

### 2. Trade-Off Awareness

Questions:
- Did the user explain why this solution was chosen over alternatives?
- Did the user discuss costs or benefits?

Good example:
> Storing the whole object could duplicate source data and create inconsistency risk.

---

### 3. Example Specificity

Questions:
- Did the answer include a concrete example?
- Was the explanation grounded in a real implementation scenario?

Good example:
> In my portfolio project, I derived `selectedProject` from `activeProjectId`.

---

### 4. State Responsibility Awareness

Questions:
- Did the user explain state ownership clearly?
- Did the user avoid duplicated truth?
- Was derived state reasoning present?

---

### 5. Failure Case Awareness

Questions:
- Did the answer mention edge cases or risks?
- Did the user explain what could go wrong?

Good example:
> If the source data changes while storing the full object, the UI could become stale.

---

### 6. Follow-Up Consistency

Questions:
- Does the follow-up answer align with the original explanation?
- Did the reasoning drift after pressure or deeper questioning?

---

## Suggested Evaluation Output

```ts
{
  detected: {
    intent: true,
    tradeOff: false,
    example: true,
    failureCase: false,
    stateResponsibility: true,
    consistency: true,
  },
  feedback: string,
  followUpQuestion: string,
}
```

---

## Feedback Philosophy

Avoid generic feedback such as:
- Good answer.
- Be more specific.
- Nice explanation.

Prefer:
- concrete reasoning gaps
- explicit missing dimensions
- actionable explanation improvements

Example:
> You explained the intent clearly, but you did not explain why storing the entire object could create duplicated truth risk.

---

## Follow-Up Question Philosophy

Follow-up questions should:
- test reasoning depth
- test consistency
- introduce trade-offs
- challenge assumptions
- simulate realistic interview pressure

Avoid:
- random unrelated questions
- trivia
- excessively academic prompts

---

## Initial Topic Coverage

Suggested first rubric coverage:
- React state
- derived state
- async UI
- `useEffect`
- API normalization
- component responsibility
- rendering logic
- state machines
- optimistic UI

Do not attempt broad software-engineering coverage in the initial version.
