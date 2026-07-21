import assert from "node:assert/strict";
import test from "node:test";

import {
  flawedStateOwnershipAnswer,
  sufficientStateOwnershipAnswer,
  revisedStateOwnershipAnswer,
  validNeedsFollowUpDiagnosis,
  validResolvedRevisionComparison,
  validSufficientDiagnosis,
} from "../src/data/v3/referencePracticeFixtures.ts";
import {
  createPracticeSessionState,
  practiceSessionReducer,
} from "../src/domain/v3/practiceSessionReducer.ts";
import {
  selectCanSubmitAnswer,
  selectCanSubmitRevision,
  selectIsPracticeSessionBusy,
  selectPracticeSessionFailure,
} from "../src/domain/v3/practiceSessionSelectors.ts";
import { reactStateOwnershipQuestion } from "../src/domain/v3/questionContent.ts";
import {
  PracticeEvaluationAdapterError,
  createDeterministicPracticeEvaluationAdapter,
} from "../src/lib/v3/practiceEvaluationAdapter.ts";

const defaultAdapterOptions = {
  diagnosisPath: "needs-follow-up",
  revisionPath: "resolved",
};

function createAdapter(overrides = {}) {
  return createDeterministicPracticeEvaluationAdapter({
    ...defaultAdapterOptions,
    ...overrides,
  });
}

function createDiagnosisInput(sessionId = "session-1", overrides = {}) {
  return {
    sessionId,
    requestId: "diagnosis-request-1",
    questionId: reactStateOwnershipQuestion.id,
    questionVersion: reactStateOwnershipQuestion.version,
    originalAnswer: flawedStateOwnershipAnswer,
    ...overrides,
  };
}

function createRevisionInput(sessionId = "session-1", overrides = {}) {
  return {
    sessionId,
    requestId: "revision-request-1",
    questionId: reactStateOwnershipQuestion.id,
    questionVersion: reactStateOwnershipQuestion.version,
    diagnosis: validNeedsFollowUpDiagnosis,
    originalAnswer: flawedStateOwnershipAnswer,
    revisedAnswer: revisedStateOwnershipAnswer,
    ...overrides,
  };
}

async function captureAdapterFailure(promise, expectedCode) {
  let capturedFailure;

  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof PracticeEvaluationAdapterError);
    assert.equal(error.failure.code, expectedCode);
    capturedFailure = error.failure;
    return true;
  });

  return capturedFailure;
}

function toDiagnosing(
  sessionId = "session-1",
  answer = flawedStateOwnershipAnswer,
  requestId = "diagnosis-request-1",
) {
  const answering = createPracticeSessionState(
    sessionId,
    reactStateOwnershipQuestion,
  );
  const edited = practiceSessionReducer(answering, {
    type: "answer-draft-changed",
    answerDraft: answer,
  });

  return practiceSessionReducer(edited, {
    type: "answer-submitted",
    requestId,
  });
}

function toRevising(sessionId = "session-1") {
  const diagnosing = toDiagnosing(sessionId);

  return practiceSessionReducer(diagnosing, {
    type: "diagnosis-succeeded",
    sessionId: diagnosing.sessionId,
    requestId: diagnosing.requestId,
    diagnosis: validNeedsFollowUpDiagnosis,
  });
}

function toReviewingRevision(sessionId = "session-1") {
  const revising = toRevising(sessionId);
  const edited = practiceSessionReducer(revising, {
    type: "revision-draft-changed",
    revisionDraft: revisedStateOwnershipAnswer,
  });

  return practiceSessionReducer(edited, {
    type: "revision-submitted",
    requestId: "revision-request-1",
  });
}

test("creates an initial answering session from canonical question identity", () => {
  const state = createPracticeSessionState(
    "  session-preserved  ",
    reactStateOwnershipQuestion,
  );

  assert.deepEqual(state, {
    sessionId: "  session-preserved  ",
    questionId: reactStateOwnershipQuestion.id,
    questionVersion: reactStateOwnershipQuestion.version,
    phase: "answering",
    answerDraft: "",
  });
});

test("rejects invalid initial session and question identity", () => {
  for (const sessionId of ["", "   "]) {
    assert.throws(
      () => createPracticeSessionState(sessionId, reactStateOwnershipQuestion),
      TypeError,
    );
  }

  for (const question of [
    { ...reactStateOwnershipQuestion, id: "   " },
    { ...reactStateOwnershipQuestion, version: 0 },
    { ...reactStateOwnershipQuestion, version: -1 },
    { ...reactStateOwnershipQuestion, version: 1.5 },
  ]) {
    assert.throws(
      () => createPracticeSessionState("session-1", question),
      TypeError,
    );
  }
});

test("selects only the four approved derived session values", () => {
  const emptyAnswering = createPracticeSessionState(
    "session-1",
    reactStateOwnershipQuestion,
  );
  const answerReady = practiceSessionReducer(emptyAnswering, {
    type: "answer-draft-changed",
    answerDraft: "  answer  ",
  });
  const diagnosing = toDiagnosing();
  const revising = toRevising();
  const revisionReady = practiceSessionReducer(revising, {
    type: "revision-draft-changed",
    revisionDraft: "  revision  ",
  });
  const reviewing = toReviewingRevision();
  const failure = {
    code: "model-unavailable",
    message: "The evaluator is unavailable.",
    retryable: true,
  };
  const failed = practiceSessionReducer(diagnosing, {
    type: "diagnosis-failed",
    sessionId: diagnosing.sessionId,
    requestId: diagnosing.requestId,
    failure,
  });

  assert.equal(selectCanSubmitAnswer(emptyAnswering), false);
  assert.equal(selectCanSubmitAnswer(answerReady), true);
  assert.equal(selectCanSubmitAnswer(diagnosing), false);
  assert.equal(selectCanSubmitRevision(revising), true);
  assert.equal(
    selectCanSubmitRevision(
      practiceSessionReducer(revising, {
        type: "revision-draft-changed",
        revisionDraft: "   ",
      }),
    ),
    false,
  );
  assert.equal(selectCanSubmitRevision(revisionReady), true);
  assert.equal(selectIsPracticeSessionBusy(diagnosing), true);
  assert.equal(selectIsPracticeSessionBusy(reviewing), true);
  assert.equal(selectIsPracticeSessionBusy(revising), false);
  assert.strictEqual(selectPracticeSessionFailure(failed), failure);
  assert.equal(selectPracticeSessionFailure(revising), null);
});

test("returns explicit diagnosis and revision fixtures by reference", async () => {
  const needsFollowUpAdapter = createAdapter();
  const sufficientAdapter = createAdapter({
    diagnosisPath: "initial-sufficient",
  });

  assert.strictEqual(
    await needsFollowUpAdapter.diagnose(createDiagnosisInput("session-needs")),
    validNeedsFollowUpDiagnosis,
  );
  assert.strictEqual(
    await sufficientAdapter.diagnose(
      createDiagnosisInput("session-sufficient", {
        originalAnswer: sufficientStateOwnershipAnswer,
      }),
    ),
    validSufficientDiagnosis,
  );
  assert.strictEqual(
    await needsFollowUpAdapter.compareRevision(createRevisionInput()),
    validResolvedRevisionComparison,
  );
});

test("rejects unsupported reference question identity with stable failures", async () => {
  const adapter = createAdapter();
  const missingQuestionFailure = await captureAdapterFailure(
    adapter.diagnose(
      createDiagnosisInput("missing-question", {
        questionId: "unknown-question",
      }),
    ),
    "question-not-found",
  );
  const versionFailure = await captureAdapterFailure(
    adapter.diagnose(
      createDiagnosisInput("wrong-version", {
        questionVersion: reactStateOwnershipQuestion.version + 1,
      }),
    ),
    "question-version-mismatch",
  );

  assert.equal(missingQuestionFailure.retryable, false);
  assert.equal(versionFailure.retryable, false);
});

test("scopes fail-once behavior by adapter operation and session", async () => {
  const adapter = createAdapter({
    diagnosisPath: "fail-once-then-needs-follow-up",
    revisionPath: "fail-once-then-resolved",
  });

  for (const sessionId of ["session-1", "session-2"]) {
    const diagnosisFailure = await captureAdapterFailure(
      adapter.diagnose(createDiagnosisInput(sessionId)),
      "model-unavailable",
    );
    assert.equal(diagnosisFailure.retryable, true);
    assert.strictEqual(
      await adapter.diagnose(createDiagnosisInput(sessionId)),
      validNeedsFollowUpDiagnosis,
    );

    const revisionFailure = await captureAdapterFailure(
      adapter.compareRevision(createRevisionInput(sessionId)),
      "invalid-model-output",
    );
    assert.equal(revisionFailure.retryable, true);
    assert.strictEqual(
      await adapter.compareRevision(createRevisionInput(sessionId)),
      validResolvedRevisionComparison,
    );
  }

  const separateAdapter = createAdapter({
    diagnosisPath: "fail-once-then-needs-follow-up",
  });
  await captureAdapterFailure(
    separateAdapter.diagnose(createDiagnosisInput("session-1")),
    "model-unavailable",
  );
});

test("completes the adapter and reducer revision flow with exact snapshots", async () => {
  const adapter = createAdapter();
  let state = createPracticeSessionState(
    "session-1",
    reactStateOwnershipQuestion,
  );
  state = practiceSessionReducer(state, {
    type: "answer-draft-changed",
    answerDraft: flawedStateOwnershipAnswer,
  });
  state = practiceSessionReducer(state, {
    type: "answer-submitted",
    requestId: "diagnosis-request-1",
  });

  const diagnosis = await adapter.diagnose({
    sessionId: state.sessionId,
    requestId: state.requestId,
    questionId: state.questionId,
    questionVersion: state.questionVersion,
    originalAnswer: state.originalAnswer,
  });
  state = practiceSessionReducer(state, {
    type: "diagnosis-succeeded",
    sessionId: state.sessionId,
    requestId: state.requestId,
    diagnosis,
  });
  state = practiceSessionReducer(state, {
    type: "revision-draft-changed",
    revisionDraft: revisedStateOwnershipAnswer,
  });
  state = practiceSessionReducer(state, {
    type: "revision-submitted",
    requestId: "revision-request-1",
  });

  const comparison = await adapter.compareRevision({
    sessionId: state.sessionId,
    requestId: state.requestId,
    questionId: state.questionId,
    questionVersion: state.questionVersion,
    diagnosis: state.diagnosis,
    originalAnswer: state.originalAnswer,
    revisedAnswer: state.revisedAnswer,
  });
  state = practiceSessionReducer(state, {
    type: "revision-reviewed",
    sessionId: state.sessionId,
    requestId: state.requestId,
    comparison,
  });

  assert.equal(state.phase, "complete");
  assert.equal(state.completionKind, "revision-reviewed");
  assert.equal(state.originalAnswer, flawedStateOwnershipAnswer);
  assert.equal(state.revisedAnswer, revisedStateOwnershipAnswer);
  assert.strictEqual(state.diagnosis, validNeedsFollowUpDiagnosis);
  assert.strictEqual(state.comparison, validResolvedRevisionComparison);
});

test("completes the adapter and reducer initial-sufficient flow", async () => {
  const adapter = createAdapter({ diagnosisPath: "initial-sufficient" });
  let state = toDiagnosing(
    "session-sufficient",
    sufficientStateOwnershipAnswer,
  );
  const diagnosis = await adapter.diagnose({
    sessionId: state.sessionId,
    requestId: state.requestId,
    questionId: state.questionId,
    questionVersion: state.questionVersion,
    originalAnswer: state.originalAnswer,
  });

  state = practiceSessionReducer(state, {
    type: "diagnosis-succeeded",
    sessionId: state.sessionId,
    requestId: state.requestId,
    diagnosis,
  });

  assert.equal(state.phase, "complete");
  assert.equal(state.completionKind, "initial-sufficient");
  assert.strictEqual(state.diagnosis, validSufficientDiagnosis);
});

test("preserves submitted snapshots through adapter failures and retries", async () => {
  const adapter = createAdapter({
    diagnosisPath: "fail-once-then-needs-follow-up",
    revisionPath: "fail-once-then-resolved",
  });
  let state = toDiagnosing();
  const diagnosisFailure = await captureAdapterFailure(
    adapter.diagnose({
      sessionId: state.sessionId,
      requestId: state.requestId,
      questionId: state.questionId,
      questionVersion: state.questionVersion,
      originalAnswer: state.originalAnswer,
    }),
    "model-unavailable",
  );
  state = practiceSessionReducer(state, {
    type: "diagnosis-failed",
    sessionId: state.sessionId,
    requestId: state.requestId,
    failure: diagnosisFailure,
  });

  assert.equal(state.originalAnswer, flawedStateOwnershipAnswer);

  state = practiceSessionReducer(state, {
    type: "diagnosis-retried",
    requestId: "diagnosis-request-2",
  });
  const diagnosis = await adapter.diagnose({
    sessionId: state.sessionId,
    requestId: state.requestId,
    questionId: state.questionId,
    questionVersion: state.questionVersion,
    originalAnswer: state.originalAnswer,
  });
  state = practiceSessionReducer(state, {
    type: "diagnosis-succeeded",
    sessionId: state.sessionId,
    requestId: state.requestId,
    diagnosis,
  });
  state = practiceSessionReducer(state, {
    type: "revision-draft-changed",
    revisionDraft: revisedStateOwnershipAnswer,
  });
  state = practiceSessionReducer(state, {
    type: "revision-submitted",
    requestId: "revision-request-1",
  });

  const revisionFailure = await captureAdapterFailure(
    adapter.compareRevision({
      sessionId: state.sessionId,
      requestId: state.requestId,
      questionId: state.questionId,
      questionVersion: state.questionVersion,
      diagnosis: state.diagnosis,
      originalAnswer: state.originalAnswer,
      revisedAnswer: state.revisedAnswer,
    }),
    "invalid-model-output",
  );
  state = practiceSessionReducer(state, {
    type: "revision-review-failed",
    sessionId: state.sessionId,
    requestId: state.requestId,
    failure: revisionFailure,
  });

  assert.equal(state.originalAnswer, flawedStateOwnershipAnswer);
  assert.equal(state.revisedAnswer, revisedStateOwnershipAnswer);

  state = practiceSessionReducer(state, {
    type: "revision-review-retried",
    requestId: "revision-request-2",
  });
  const comparison = await adapter.compareRevision({
    sessionId: state.sessionId,
    requestId: state.requestId,
    questionId: state.questionId,
    questionVersion: state.questionVersion,
    diagnosis: state.diagnosis,
    originalAnswer: state.originalAnswer,
    revisedAnswer: state.revisedAnswer,
  });
  state = practiceSessionReducer(state, {
    type: "revision-reviewed",
    sessionId: state.sessionId,
    requestId: state.requestId,
    comparison,
  });

  assert.equal(state.phase, "complete");
  assert.equal(state.completionKind, "revision-reviewed");
  assert.equal(state.originalAnswer, flawedStateOwnershipAnswer);
  assert.equal(state.revisedAnswer, revisedStateOwnershipAnswer);
});

test("keeps fresh sessions unchanged when old adapter responses arrive", async () => {
  const adapter = createAdapter();
  const oldDiagnosisState = toDiagnosing("old-diagnosis-session");
  const pendingDiagnosis = adapter.diagnose({
    sessionId: oldDiagnosisState.sessionId,
    requestId: oldDiagnosisState.requestId,
    questionId: oldDiagnosisState.questionId,
    questionVersion: oldDiagnosisState.questionVersion,
    originalAnswer: oldDiagnosisState.originalAnswer,
  });
  const freshAfterDiagnosis = practiceSessionReducer(oldDiagnosisState, {
    type: "start-question",
    sessionId: "fresh-after-diagnosis",
    questionId: reactStateOwnershipQuestion.id,
    questionVersion: reactStateOwnershipQuestion.version,
  });
  const oldDiagnosis = await pendingDiagnosis;

  assert.strictEqual(
    practiceSessionReducer(freshAfterDiagnosis, {
      type: "diagnosis-succeeded",
      sessionId: oldDiagnosisState.sessionId,
      requestId: oldDiagnosisState.requestId,
      diagnosis: oldDiagnosis,
    }),
    freshAfterDiagnosis,
  );

  const oldReviewState = toReviewingRevision("old-review-session");
  const pendingComparison = adapter.compareRevision({
    sessionId: oldReviewState.sessionId,
    requestId: oldReviewState.requestId,
    questionId: oldReviewState.questionId,
    questionVersion: oldReviewState.questionVersion,
    diagnosis: oldReviewState.diagnosis,
    originalAnswer: oldReviewState.originalAnswer,
    revisedAnswer: oldReviewState.revisedAnswer,
  });
  const freshAfterReview = practiceSessionReducer(oldReviewState, {
    type: "start-question",
    sessionId: "fresh-after-review",
    questionId: reactStateOwnershipQuestion.id,
    questionVersion: reactStateOwnershipQuestion.version,
  });
  const oldComparison = await pendingComparison;

  assert.strictEqual(
    practiceSessionReducer(freshAfterReview, {
      type: "revision-reviewed",
      sessionId: oldReviewState.sessionId,
      requestId: oldReviewState.requestId,
      comparison: oldComparison,
    }),
    freshAfterReview,
  );
});
