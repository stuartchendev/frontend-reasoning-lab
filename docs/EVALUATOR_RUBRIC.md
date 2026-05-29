# Evaluator Rubric — Single-Question Tiny Proof

This document defines manual test cases for the current fake evaluator flow.

It is documentation only. It should not change the UI, source code, evaluator behavior, or current tiny-proof scope.

## Rubric Philosophy

The rubric should not attempt to determine a single perfect answer.

Instead, the rubric exists to:
- detect missing reasoning parts
- identify explanation weaknesses
- evaluate consistency
- encourage structured engineering thinking

This is a reasoning calibration system, not a grading system.

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

```txt
You explained the intent clearly, but you did not explain why storing the entire object could create duplicated truth risk.
```

## 1. Current Question Summary

The current fixed question asks the user to reason about state and derived data in a project list UI.

Scenario:
- Projects come from an API.
- The user can search by project name.
- The user can choose a sort order.
- The user can select one active project to inspect in a detail panel.

The answer should explain:
- what should be stored as React state
- what should be derived during render or memoized from existing data
- why duplicated derived state can make data flow harder to reason about

## 2. Test Case: Empty Answer

Input:

```txt

```

Expected current behavior:
- The UI should prevent submitting an empty or whitespace-only answer.
- The fake evaluator should not be called through normal UI usage.

Manual check:
- The submit button should be disabled when the textarea is empty.
- No evaluation result should appear.

## 3. Test Case: Weak Answer

Input:

```txt
I would store everything in state because it is easier to use later.
```

Expected current fake evaluator behavior:
- If submitted, the fake evaluator should return a resolved result.
- `isComplete` should be `true` because the answer is non-empty.
- The feedback should remain the current placeholder feedback.

Manual interpretation:
- This is a weak reasoning answer because it does not separate source state from derived data.
- It does not explain the risk of storing duplicated filtered, sorted, or selected data.
- It does not describe predictable data flow.

## 4. Test Case: Stronger Answer

Input:

```txt
I would store the search text, sort order, and active project id as state because those are user-controlled inputs. The filtered and sorted projects should be derived from the API projects plus the search text and sort order, either during render or with memoization if the list becomes expensive.

The selected project should also be derived from activeProjectId and the projects array. I would not store the full selected project object or a separate filtered list in state because that duplicates data that already exists elsewhere. If the API projects change, duplicated derived state can become stale or inconsistent.

This keeps the data flow predictable: source data and user choices are state, while views of that data are recalculated from the current inputs.
```

Expected current fake evaluator behavior:
- The fake evaluator should return a resolved result.
- `isComplete` should be `true`.
- The summary and feedback should remain the current placeholder strings.

Manual interpretation:
- This is a stronger answer because it identifies `searchText`, `sortOrder`, and `activeProjectId` as state.
- It treats filtered and sorted projects as derived data.
- It derives the selected project from `activeProjectId` and `projects`.
- It explains why duplicate derived data can become stale or inconsistent.
- It explains how the data flow stays predictable.

## 5. What The Current Fake Evaluator Should Do

The current fake evaluator is intentionally minimal.

It should:
- return a `Promise<EvaluationResult>`
- wait briefly to simulate an async evaluation
- mark `isComplete` as `true` when the submitted text is not empty
- mark `isComplete` as `false` when the submitted text is empty
- return the current placeholder `summary`
- return the current placeholder `feedback`

It should not:
- call a real AI API
- score answer quality deeply
- inspect specific rubric dimensions
- generate adaptive follow-up questions
- change behavior based on weak vs stronger reasoning beyond the non-empty check

## 6. What A Future Real Evaluator Should Eventually Check

A future real evaluator should check whether the answer explains the reasoning behind state responsibility.

It should evaluate whether the answer identifies:
- search text as state
- sort order as state
- active project id as state
- filtered projects as derived data
- sorted projects as derived data
- selected project as derived from `activeProjectId` and `projects`

It should also evaluate reasoning quality:
- whether the answer avoids storing duplicate derived data
- whether it explains stale state or inconsistency risk
- whether it describes source data vs user-controlled state vs derived views
- whether it gives a clear reason for predictable data flow
- whether it uses frontend-specific language clearly enough for an interview answer

The future evaluator should preserve the current architectural boundary:
- UI submits the fixed question and user answer.
- Evaluation happens behind a replaceable async function or API boundary.
- The UI renders structured results without knowing evaluator internals.

## Future Rubric Notes

Future evaluator work may use broader reasoning dimensions, but those dimensions are not part of the current fake evaluator behavior.

Possible future dimensions:
- intent clarity: whether the user explains the purpose of the decision
- trade-off awareness: whether the user explains costs, benefits, and alternatives
- example specificity: whether the answer is grounded in a concrete implementation scenario
- state responsibility awareness: whether the user explains ownership, avoids duplicated truth, and identifies derived state
- failure case awareness: whether the user describes what can go wrong
- follow-up consistency: whether later answers align with the original reasoning

Reasoning calibration idea:
- The evaluator should detect reasoning structure and gaps rather than produce a single pass/fail grade.
- Feedback should help the user improve the explanation, not just label the answer as correct or incorrect.
- Follow-up questions, if added in a later MVP, should test reasoning depth, consistency, trade-offs, and assumptions.

Future follow-up questions should avoid:
- random unrelated questions
- trivia
- excessively academic prompts

Possible later topic coverage:
- React state
- derived state
- async UI
- `useEffect`
- API normalization
- component responsibility
- rendering logic
- state machines
- optimistic UI

Do not treat these future notes as current tiny proof scope.
