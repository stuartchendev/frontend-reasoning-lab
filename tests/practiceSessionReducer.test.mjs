import assert from "node:assert/strict";
import test from "node:test";

import { practiceSessionReducer } from "../src/domain/v3/practiceSessionReducer.ts";
import { projectListStateDataFlowQuestion } from "../src/domain/v3/questionContent.ts";
import {
  flawedStateOwnershipAnswer,
  revisedStateOwnershipAnswer,
  sufficientStateOwnershipAnswer,
  validNeedsFollowUpDiagnosis,
  validResolvedRevisionComparison,
  validSufficientDiagnosis,
} from "./fixtures/referenceEvaluationCases.mjs";

const diagnosisFailure = {
  code: "model-unavailable",
  message: "The evaluator is temporarily unavailable.",
  retryable: true,
};

const revisionReviewFailure = {
  code: "invalid-model-output",
  message: "The revision comparison could not be validated.",
  retryable: true,
};

function createAnsweringState(overrides = {}) {
  return {
    sessionId: "session-1",
    questionId: "react-state-ownership-01",
    questionVersion: 1,
    phase: "answering",
    answerDraft: "",
    ...overrides,
  };
}

function toDiagnosing(
  answer = flawedStateOwnershipAnswer,
  requestId = "diagnosis-request-1",
) {
  const edited = practiceSessionReducer(createAnsweringState(), {
    type: "answer-draft-changed",
    answerDraft: answer,
  });

  return practiceSessionReducer(edited, {
    type: "answer-submitted",
    requestId,
  });
}

function toRevising() {
  const diagnosing = toDiagnosing();

  return practiceSessionReducer(diagnosing, {
    type: "diagnosis-succeeded",
    sessionId: diagnosing.sessionId,
    requestId: diagnosing.requestId,
    diagnosis: validNeedsFollowUpDiagnosis,
  });
}

function toReviewingRevision(
  revision = revisedStateOwnershipAnswer,
  requestId = "revision-request-1",
) {
  const revising = toRevising();
  const edited = practiceSessionReducer(revising, {
    type: "revision-draft-changed",
    revisionDraft: revision,
  });

  return practiceSessionReducer(edited, {
    type: "revision-submitted",
    requestId,
  });
}

function toRevisionReviewedComplete() {
  const reviewing = toReviewingRevision();

  return practiceSessionReducer(reviewing, {
    type: "revision-reviewed",
    sessionId: reviewing.sessionId,
    requestId: reviewing.requestId,
    comparison: validResolvedRevisionComparison,
  });
}

function assertInvalidTransition(state, action) {
  assert.throws(
    () => practiceSessionReducer(state, action),
    /Invalid practice session transition/,
  );
}

test("completes the full needs-follow-up revision path", () => {
  const answering = createAnsweringState();
  const editedAnswer = practiceSessionReducer(answering, {
    type: "answer-draft-changed",
    answerDraft: flawedStateOwnershipAnswer,
  });
  const diagnosing = practiceSessionReducer(editedAnswer, {
    type: "answer-submitted",
    requestId: "diagnosis-request-1",
  });
  const revising = practiceSessionReducer(diagnosing, {
    type: "diagnosis-succeeded",
    sessionId: diagnosing.sessionId,
    requestId: diagnosing.requestId,
    diagnosis: validNeedsFollowUpDiagnosis,
  });
  const editedRevision = practiceSessionReducer(revising, {
    type: "revision-draft-changed",
    revisionDraft: revisedStateOwnershipAnswer,
  });
  const reviewing = practiceSessionReducer(editedRevision, {
    type: "revision-submitted",
    requestId: "revision-request-1",
  });
  const complete = practiceSessionReducer(reviewing, {
    type: "revision-reviewed",
    sessionId: reviewing.sessionId,
    requestId: reviewing.requestId,
    comparison: validResolvedRevisionComparison,
  });

  assert.equal(answering.answerDraft, "");
  assert.equal(diagnosing.originalAnswer, flawedStateOwnershipAnswer);
  assert.equal(revising.revisionDraft, flawedStateOwnershipAnswer);
  assert.equal(revising.originalAnswer, flawedStateOwnershipAnswer);
  assert.equal(reviewing.revisedAnswer, revisedStateOwnershipAnswer);
  assert.equal(complete.phase, "complete");
  assert.equal(complete.completionKind, "revision-reviewed");
  assert.equal(complete.originalAnswer, flawedStateOwnershipAnswer);
  assert.equal(complete.revisedAnswer, revisedStateOwnershipAnswer);
  assert.strictEqual(complete.diagnosis, validNeedsFollowUpDiagnosis);
  assert.strictEqual(complete.comparison, validResolvedRevisionComparison);
});

test("completes the initial-sufficient path", () => {
  const diagnosing = toDiagnosing(
    sufficientStateOwnershipAnswer,
    "sufficient-request-1",
  );
  const complete = practiceSessionReducer(diagnosing, {
    type: "diagnosis-succeeded",
    sessionId: diagnosing.sessionId,
    requestId: diagnosing.requestId,
    diagnosis: validSufficientDiagnosis,
  });

  assert.equal(complete.phase, "complete");
  assert.equal(complete.completionKind, "initial-sufficient");
  assert.equal(complete.originalAnswer, sufficientStateOwnershipAnswer);
  assert.strictEqual(complete.diagnosis, validSufficientDiagnosis);
});

test("preserves the submitted answer through diagnosis failure and retry", () => {
  const diagnosing = toDiagnosing();
  const failed = practiceSessionReducer(diagnosing, {
    type: "diagnosis-failed",
    sessionId: diagnosing.sessionId,
    requestId: diagnosing.requestId,
    failure: diagnosisFailure,
  });
  const retrying = practiceSessionReducer(failed, {
    type: "diagnosis-retried",
    requestId: "diagnosis-request-2",
  });

  assert.equal(failed.phase, "diagnosis-failed");
  assert.equal(failed.originalAnswer, flawedStateOwnershipAnswer);
  assert.strictEqual(failed.failure, diagnosisFailure);
  assert.equal(retrying.phase, "diagnosing");
  assert.equal(retrying.originalAnswer, flawedStateOwnershipAnswer);
  assert.equal(retrying.requestId, "diagnosis-request-2");
});

test("seeds answer editing from the submitted answer after diagnosis failure", () => {
  const diagnosing = toDiagnosing();
  const failed = practiceSessionReducer(diagnosing, {
    type: "diagnosis-failed",
    sessionId: diagnosing.sessionId,
    requestId: diagnosing.requestId,
    failure: diagnosisFailure,
  });
  const editing = practiceSessionReducer(failed, {
    type: "diagnosis-edit-requested",
  });

  assert.deepEqual(editing, {
    sessionId: failed.sessionId,
    questionId: failed.questionId,
    questionVersion: failed.questionVersion,
    phase: "answering",
    answerDraft: flawedStateOwnershipAnswer,
  });
});

test("preserves both snapshots through revision-review failure and retry", () => {
  const reviewing = toReviewingRevision();
  const failed = practiceSessionReducer(reviewing, {
    type: "revision-review-failed",
    sessionId: reviewing.sessionId,
    requestId: reviewing.requestId,
    failure: revisionReviewFailure,
  });
  const retrying = practiceSessionReducer(failed, {
    type: "revision-review-retried",
    requestId: "revision-request-2",
  });

  assert.equal(failed.phase, "revision-review-failed");
  assert.equal(failed.originalAnswer, flawedStateOwnershipAnswer);
  assert.equal(failed.revisedAnswer, revisedStateOwnershipAnswer);
  assert.strictEqual(failed.diagnosis, validNeedsFollowUpDiagnosis);
  assert.strictEqual(failed.failure, revisionReviewFailure);
  assert.equal(retrying.phase, "reviewing-revision");
  assert.equal(retrying.originalAnswer, flawedStateOwnershipAnswer);
  assert.equal(retrying.revisedAnswer, revisedStateOwnershipAnswer);
  assert.equal(retrying.requestId, "revision-request-2");
});

test("seeds revision editing from the submitted revision after review failure", () => {
  const reviewing = toReviewingRevision();
  const failed = practiceSessionReducer(reviewing, {
    type: "revision-review-failed",
    sessionId: reviewing.sessionId,
    requestId: reviewing.requestId,
    failure: revisionReviewFailure,
  });
  const editing = practiceSessionReducer(failed, {
    type: "revision-edit-requested",
  });

  assert.equal(editing.phase, "revising");
  assert.equal(editing.originalAnswer, flawedStateOwnershipAnswer);
  assert.equal(editing.revisionDraft, revisedStateOwnershipAnswer);
  assert.strictEqual(editing.diagnosis, validNeedsFollowUpDiagnosis);
});

test("starts a fresh answering session and clears populated session data", () => {
  for (const populatedState of [
    toReviewingRevision(),
    toRevisionReviewedComplete(),
  ]) {
    const fresh = practiceSessionReducer(populatedState, {
      type: "start-question",
      sessionId: "session-2",
      questionId: projectListStateDataFlowQuestion.id,
      questionVersion: projectListStateDataFlowQuestion.version,
    });

    assert.deepEqual(fresh, {
      sessionId: "session-2",
      questionId: projectListStateDataFlowQuestion.id,
      questionVersion: projectListStateDataFlowQuestion.version,
      phase: "answering",
      answerDraft: "",
    });
    assert.equal("originalAnswer" in fresh, false);
    assert.equal("diagnosis" in fresh, false);
    assert.equal("comparison" in fresh, false);
    assert.equal("requestId" in fresh, false);
    assert.equal("failure" in fresh, false);
  }
});

test("keeps editable drafts separate from submitted snapshots", () => {
  const exactAnswer = "  A valid answer with intentional outer spacing.  ";
  const diagnosing = toDiagnosing(exactAnswer);
  const revising = practiceSessionReducer(diagnosing, {
    type: "diagnosis-succeeded",
    sessionId: diagnosing.sessionId,
    requestId: diagnosing.requestId,
    diagnosis: validNeedsFollowUpDiagnosis,
  });
  const editedRevision = practiceSessionReducer(revising, {
    type: "revision-draft-changed",
    revisionDraft: "  A revised answer with intentional outer spacing.  ",
  });
  const reviewing = practiceSessionReducer(editedRevision, {
    type: "revision-submitted",
    requestId: "revision-request-spacing",
  });

  assert.equal(diagnosing.originalAnswer, exactAnswer);
  assert.equal(revising.originalAnswer, exactAnswer);
  assert.equal(revising.revisionDraft, exactAnswer);
  assert.equal(editedRevision.originalAnswer, exactAnswer);
  assert.equal(
    reviewing.revisedAnswer,
    "  A revised answer with intentional outer spacing.  ",
  );
});

test("stores validated diagnosis and comparison objects by reference", () => {
  const revising = toRevising();
  const complete = toRevisionReviewedComplete();

  assert.strictEqual(revising.diagnosis, validNeedsFollowUpDiagnosis);
  assert.strictEqual(complete.diagnosis, validNeedsFollowUpDiagnosis);
  assert.strictEqual(complete.comparison, validResolvedRevisionComparison);
});

test("does not mutate previous state objects during later transitions", () => {
  const answering = Object.freeze(createAnsweringState());
  const edited = practiceSessionReducer(answering, {
    type: "answer-draft-changed",
    answerDraft: "first answer",
  });
  const submitted = practiceSessionReducer(edited, {
    type: "answer-submitted",
    requestId: "diagnosis-request-immutable",
  });
  const revising = Object.freeze(
    practiceSessionReducer(submitted, {
      type: "diagnosis-succeeded",
      sessionId: submitted.sessionId,
      requestId: submitted.requestId,
      diagnosis: validNeedsFollowUpDiagnosis,
    }),
  );
  const revised = practiceSessionReducer(revising, {
    type: "revision-draft-changed",
    revisionDraft: "second answer",
  });

  assert.equal(answering.answerDraft, "");
  assert.equal(edited.answerDraft, "first answer");
  assert.equal(submitted.originalAnswer, "first answer");
  assert.equal(revising.revisionDraft, "first answer");
  assert.equal(revised.revisionDraft, "second answer");
  assert.notStrictEqual(edited, answering);
  assert.notStrictEqual(submitted, edited);
  assert.notStrictEqual(revised, revising);
});

test("rejects empty and whitespace-only answer and revision submissions", () => {
  for (const answerDraft of ["", "   "]) {
    const state = createAnsweringState({ answerDraft });

    assert.throws(
      () =>
        practiceSessionReducer(state, {
          type: "answer-submitted",
          requestId: "diagnosis-request-1",
        }),
      TypeError,
    );
  }

  for (const revisionDraft of ["", "   "]) {
    const revising = practiceSessionReducer(toRevising(), {
      type: "revision-draft-changed",
      revisionDraft,
    });

    assert.throws(
      () =>
        practiceSessionReducer(revising, {
          type: "revision-submitted",
          requestId: "revision-request-1",
        }),
      TypeError,
    );
  }
});

test("rejects empty identity values and invalid question versions", () => {
  const answering = createAnsweringState();

  for (const startQuestion of [
    {
      type: "start-question",
      sessionId: "   ",
      questionId: "project-list-state-data-flow",
      questionVersion: 1,
    },
    {
      type: "start-question",
      sessionId: "session-2",
      questionId: "",
      questionVersion: 1,
    },
    {
      type: "start-question",
      sessionId: "session-2",
      questionId: "project-list-state-data-flow",
      questionVersion: 0,
    },
    {
      type: "start-question",
      sessionId: "session-2",
      questionId: "project-list-state-data-flow",
      questionVersion: 1.5,
    },
  ]) {
    assert.throws(
      () => practiceSessionReducer(answering, startQuestion),
      TypeError,
    );
  }

  assert.throws(
    () =>
      practiceSessionReducer(
        createAnsweringState({ answerDraft: "valid answer" }),
        {
          type: "answer-submitted",
          requestId: "   ",
        },
      ),
    TypeError,
  );

  const diagnosisFailed = practiceSessionReducer(toDiagnosing(), {
    type: "diagnosis-failed",
    sessionId: "session-1",
    requestId: "diagnosis-request-1",
    failure: diagnosisFailure,
  });

  assert.throws(
    () =>
      practiceSessionReducer(diagnosisFailed, {
        type: "diagnosis-retried",
        requestId: "",
      }),
    TypeError,
  );

  assert.throws(
    () =>
      practiceSessionReducer(toRevising(), {
        type: "revision-submitted",
        requestId: "   ",
      }),
    TypeError,
  );

  const reviewFailed = practiceSessionReducer(toReviewingRevision(), {
    type: "revision-review-failed",
    sessionId: "session-1",
    requestId: "revision-request-1",
    failure: revisionReviewFailure,
  });

  assert.throws(
    () =>
      practiceSessionReducer(reviewFailed, {
        type: "revision-review-retried",
        requestId: "",
      }),
    TypeError,
  );
});

test("rejects reusing the active session ID for start-question", () => {
  assert.throws(
    () =>
      practiceSessionReducer(toRevisionReviewedComplete(), {
        type: "start-question",
        sessionId: "session-1",
        questionId: "project-list-state-data-flow",
        questionVersion: 1,
      }),
    TypeError,
  );
});

test("throws for invalid phase and action combinations", () => {
  const diagnosing = toDiagnosing();
  const diagnosisFailed = practiceSessionReducer(diagnosing, {
    type: "diagnosis-failed",
    sessionId: diagnosing.sessionId,
    requestId: diagnosing.requestId,
    failure: diagnosisFailure,
  });
  const reviewing = toReviewingRevision();
  const reviewFailed = practiceSessionReducer(reviewing, {
    type: "revision-review-failed",
    sessionId: reviewing.sessionId,
    requestId: reviewing.requestId,
    failure: revisionReviewFailure,
  });

  const cases = [
    [createAnsweringState(), { type: "diagnosis-edit-requested" }],
    [
      diagnosing,
      { type: "answer-draft-changed", answerDraft: "unexpected" },
    ],
    [
      diagnosisFailed,
      { type: "revision-draft-changed", revisionDraft: "unexpected" },
    ],
    [toRevising(), { type: "diagnosis-retried", requestId: "unexpected" }],
    [
      reviewing,
      { type: "revision-draft-changed", revisionDraft: "unexpected" },
    ],
    [reviewFailed, { type: "answer-submitted", requestId: "unexpected" }],
  ];

  for (const [state, action] of cases) {
    assertInvalidTransition(state, action);
  }
});

test("allows only start-question to leave a completed session", () => {
  const complete = toRevisionReviewedComplete();
  const nonStartActions = [
    { type: "answer-draft-changed", answerDraft: "unexpected" },
    { type: "answer-submitted", requestId: "unexpected" },
    {
      type: "diagnosis-succeeded",
      sessionId: complete.sessionId,
      requestId: "unexpected",
      diagnosis: validNeedsFollowUpDiagnosis,
    },
    {
      type: "diagnosis-failed",
      sessionId: complete.sessionId,
      requestId: "unexpected",
      failure: diagnosisFailure,
    },
    { type: "diagnosis-retried", requestId: "unexpected" },
    { type: "diagnosis-edit-requested" },
    { type: "revision-draft-changed", revisionDraft: "unexpected" },
    { type: "revision-submitted", requestId: "unexpected" },
    {
      type: "revision-reviewed",
      sessionId: complete.sessionId,
      requestId: "unexpected",
      comparison: validResolvedRevisionComparison,
    },
    {
      type: "revision-review-failed",
      sessionId: complete.sessionId,
      requestId: "unexpected",
      failure: revisionReviewFailure,
    },
    { type: "revision-review-retried", requestId: "unexpected" },
    { type: "revision-edit-requested" },
  ];

  for (const action of nonStartActions) {
    assertInvalidTransition(complete, action);
  }
});

test("returns the same state for mismatched response session and request IDs", () => {
  const diagnosing = toDiagnosing();
  const reviewing = toReviewingRevision();

  assert.strictEqual(
    practiceSessionReducer(diagnosing, {
      type: "diagnosis-succeeded",
      sessionId: "stale-session",
      requestId: diagnosing.requestId,
      diagnosis: validNeedsFollowUpDiagnosis,
    }),
    diagnosing,
  );
  assert.strictEqual(
    practiceSessionReducer(diagnosing, {
      type: "diagnosis-succeeded",
      sessionId: diagnosing.sessionId,
      requestId: "stale-request",
      diagnosis: validNeedsFollowUpDiagnosis,
    }),
    diagnosing,
  );
  assert.strictEqual(
    practiceSessionReducer(reviewing, {
      type: "revision-reviewed",
      sessionId: "stale-session",
      requestId: reviewing.requestId,
      comparison: validResolvedRevisionComparison,
    }),
    reviewing,
  );
  assert.strictEqual(
    practiceSessionReducer(reviewing, {
      type: "revision-reviewed",
      sessionId: reviewing.sessionId,
      requestId: "stale-request",
      comparison: validResolvedRevisionComparison,
    }),
    reviewing,
  );
});

test("stale success and failure actions have no state effect", () => {
  const diagnosing = toDiagnosing();
  const reviewing = toReviewingRevision();
  const staleDiagnosisActions = [
    {
      type: "diagnosis-succeeded",
      sessionId: "stale-session",
      requestId: diagnosing.requestId,
      diagnosis: validNeedsFollowUpDiagnosis,
    },
    {
      type: "diagnosis-failed",
      sessionId: diagnosing.sessionId,
      requestId: "stale-request",
      failure: diagnosisFailure,
    },
  ];
  const staleReviewActions = [
    {
      type: "revision-reviewed",
      sessionId: "stale-session",
      requestId: reviewing.requestId,
      comparison: validResolvedRevisionComparison,
    },
    {
      type: "revision-review-failed",
      sessionId: reviewing.sessionId,
      requestId: "stale-request",
      failure: revisionReviewFailure,
    },
  ];

  for (const action of staleDiagnosisActions) {
    assert.strictEqual(
      practiceSessionReducer(diagnosing, action),
      diagnosing,
    );
  }

  for (const action of staleReviewActions) {
    assert.strictEqual(
      practiceSessionReducer(reviewing, action),
      reviewing,
    );
  }
});

test("ignores old diagnosis responses after start-question", () => {
  const oldRequestState = toDiagnosing();
  const freshSessionState = practiceSessionReducer(oldRequestState, {
    type: "start-question",
    sessionId: "session-2",
    questionId: "project-list-state-data-flow",
    questionVersion: 1,
  });
  const staleActions = [
    {
      type: "diagnosis-succeeded",
      sessionId: oldRequestState.sessionId,
      requestId: oldRequestState.requestId,
      diagnosis: validNeedsFollowUpDiagnosis,
    },
    {
      type: "diagnosis-failed",
      sessionId: oldRequestState.sessionId,
      requestId: oldRequestState.requestId,
      failure: diagnosisFailure,
    },
  ];

  for (const action of staleActions) {
    assert.strictEqual(
      practiceSessionReducer(freshSessionState, action),
      freshSessionState,
    );
  }
});

test("ignores old revision-review responses after start-question", () => {
  const oldRequestState = toReviewingRevision();
  const freshSessionState = practiceSessionReducer(oldRequestState, {
    type: "start-question",
    sessionId: "session-2",
    questionId: "project-list-state-data-flow",
    questionVersion: 1,
  });
  const staleActions = [
    {
      type: "revision-reviewed",
      sessionId: oldRequestState.sessionId,
      requestId: oldRequestState.requestId,
      comparison: validResolvedRevisionComparison,
    },
    {
      type: "revision-review-failed",
      sessionId: oldRequestState.sessionId,
      requestId: oldRequestState.requestId,
      failure: revisionReviewFailure,
    },
  ];

  for (const action of staleActions) {
    assert.strictEqual(
      practiceSessionReducer(freshSessionState, action),
      freshSessionState,
    );
  }
});
