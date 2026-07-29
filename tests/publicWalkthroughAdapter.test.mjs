import assert from "node:assert/strict";
import test from "node:test";

import {
  publicWalkthroughCaptureProvenance,
  publicWalkthroughComparison,
  publicWalkthroughDiagnosis,
} from "../src/data/v3/publicWalkthroughFixtures.ts";
import {
  flawedStateOwnershipAnswer,
  revisedStateOwnershipAnswer,
} from "../src/data/v3/referencePracticeFixtures.ts";
import {
  createPracticeSessionState,
  practiceSessionReducer,
} from "../src/domain/v3/practiceSessionReducer.ts";
import {
  projectListStateDataFlowQuestion,
  reactStateOwnershipQuestion,
} from "../src/domain/v3/questionContent.ts";
import {
  PracticeEvaluationAdapterError,
} from "../src/lib/v3/practiceEvaluationAdapter.ts";
import {
  canRunPracticeAnswer,
  canRunPracticeRevision,
  createPublicWalkthroughPracticeEvaluationAdapter,
  executePracticeCommandIfAllowed,
} from "../src/lib/v3/publicWalkthroughAdapter.ts";
import {
  getCanonicalDiagnosisContext,
} from "../src/server/v3/diagnosisPipeline.ts";
import {
  validateInitialDiagnosisResult,
  validateRevisionComparisonResult,
} from "../src/server/v3/evaluation.ts";
import {
  selectRevisionRecommendationCandidates,
} from "../src/server/v3/revisionReviewPipeline.ts";

function createDiagnosisInput(overrides = {}) {
  return {
    sessionId: "public-session",
    requestId: "public-call-1",
    questionId: reactStateOwnershipQuestion.id,
    questionVersion: reactStateOwnershipQuestion.version,
    originalAnswer: flawedStateOwnershipAnswer,
    ...overrides,
  };
}

function createRevisionInput(overrides = {}) {
  return {
    sessionId: "public-session",
    requestId: "public-call-2",
    questionId: reactStateOwnershipQuestion.id,
    questionVersion: reactStateOwnershipQuestion.version,
    diagnosis: publicWalkthroughDiagnosis,
    originalAnswer: flawedStateOwnershipAnswer,
    revisedAnswer: revisedStateOwnershipAnswer,
    ...overrides,
  };
}

test("revalidates the captured walkthrough fixtures at existing boundaries", () => {
  const diagnosisContext = getCanonicalDiagnosisContext(
    reactStateOwnershipQuestion.id,
  );
  const candidates = selectRevisionRecommendationCandidates(
    publicWalkthroughDiagnosis.primaryGap.criterionId,
  );

  assert.strictEqual(
    validateInitialDiagnosisResult(publicWalkthroughDiagnosis, {
      spec: diagnosisContext.evaluationSpec,
      normalizedAnswer: flawedStateOwnershipAnswer,
    }),
    publicWalkthroughDiagnosis,
  );
  assert.strictEqual(
    validateRevisionComparisonResult(publicWalkthroughComparison, {
      diagnosis: publicWalkthroughDiagnosis,
      normalizedOriginalAnswer: flawedStateOwnershipAnswer,
      normalizedRevisedAnswer: revisedStateOwnershipAnswer,
      candidateQuestionIds: candidates.map((candidate) => candidate.id),
    }),
    publicWalkthroughComparison,
  );
  assert.equal(publicWalkthroughDiagnosis.outcome, "needs-follow-up");
  assert.equal(
    publicWalkthroughComparison.resolution,
    "partially-resolved",
  );
  assert.equal(
    publicWalkthroughComparison.nextAction?.questionId,
    projectListStateDataFlowQuestion.id,
  );
  assert.deepEqual(publicWalkthroughCaptureProvenance, {
    capturedAt: "2026-07-29T15:01:27.829Z",
    source: "validated-local-model-run",
    call1Validation: "runInitialDiagnosisPipeline",
    call2Validation: "runRevisionReviewPipeline",
  });
});

test("replays only the exact verified answer and revision", async () => {
  const adapter = createPublicWalkthroughPracticeEvaluationAdapter();

  assert.strictEqual(
    await adapter.diagnose(createDiagnosisInput()),
    publicWalkthroughDiagnosis,
  );
  assert.strictEqual(
    await adapter.compareRevision(createRevisionInput()),
    publicWalkthroughComparison,
  );

  for (const promise of [
    adapter.diagnose(
      createDiagnosisInput({
        originalAnswer: flawedStateOwnershipAnswer + " Edited.",
      }),
    ),
    adapter.compareRevision(
      createRevisionInput({
        revisedAnswer: revisedStateOwnershipAnswer + " Edited.",
      }),
    ),
  ]) {
    await assert.rejects(promise, (error) => {
      assert.ok(error instanceof PracticeEvaluationAdapterError);
      assert.equal(error.failure.code, "invalid-request");
      assert.equal(error.failure.retryable, false);
      return true;
    });
  }
});

test("guards edited public inputs at the event layer while live mode stays free", () => {
  const editedAnswer = flawedStateOwnershipAnswer + " Edited.";
  const editedRevision = revisedStateOwnershipAnswer + " Edited.";

  assert.equal(
    canRunPracticeAnswer(
      "public-walkthrough",
      reactStateOwnershipQuestion.id,
      flawedStateOwnershipAnswer,
    ),
    true,
  );
  assert.equal(
    canRunPracticeAnswer(
      "public-walkthrough",
      reactStateOwnershipQuestion.id,
      editedAnswer,
    ),
    false,
  );
  assert.equal(
    canRunPracticeRevision(
      "public-walkthrough",
      reactStateOwnershipQuestion.id,
      flawedStateOwnershipAnswer,
      revisedStateOwnershipAnswer,
    ),
    true,
  );
  assert.equal(
    canRunPracticeRevision(
      "public-walkthrough",
      reactStateOwnershipQuestion.id,
      flawedStateOwnershipAnswer,
      editedRevision,
    ),
    false,
  );
  assert.equal(
    canRunPracticeAnswer(
      "live-model",
      reactStateOwnershipQuestion.id,
      editedAnswer,
    ),
    true,
  );
  assert.equal(
    canRunPracticeRevision(
      "live-model",
      reactStateOwnershipQuestion.id,
      editedAnswer,
      editedRevision,
    ),
    true,
  );

  let commandCount = 0;
  assert.equal(
    executePracticeCommandIfAllowed(false, () => {
      commandCount += 1;
    }),
    false,
  );
  assert.equal(commandCount, 0);
  assert.equal(
    executePracticeCommandIfAllowed(true, () => {
      commandCount += 1;
    }),
    true,
  );
  assert.equal(commandCount, 1);
});

test("walkthrough recommendation uses the existing fresh-session transition", () => {
  let state = createPracticeSessionState(
    "public-session",
    reactStateOwnershipQuestion,
  );
  state = practiceSessionReducer(state, {
    type: "answer-draft-changed",
    answerDraft: flawedStateOwnershipAnswer,
  });
  state = practiceSessionReducer(state, {
    type: "answer-submitted",
    requestId: "public-call-1",
  });
  state = practiceSessionReducer(state, {
    type: "diagnosis-succeeded",
    sessionId: "public-session",
    requestId: "public-call-1",
    diagnosis: publicWalkthroughDiagnosis,
  });
  state = practiceSessionReducer(state, {
    type: "revision-draft-changed",
    revisionDraft: revisedStateOwnershipAnswer,
  });
  state = practiceSessionReducer(state, {
    type: "revision-submitted",
    requestId: "public-call-2",
  });
  state = practiceSessionReducer(state, {
    type: "revision-reviewed",
    sessionId: "public-session",
    requestId: "public-call-2",
    comparison: publicWalkthroughComparison,
  });

  assert.equal(state.phase, "complete");
  assert.equal(state.completionKind, "revision-reviewed");

  state = practiceSessionReducer(state, {
    type: "start-question",
    sessionId: "recommended-session",
    questionId: projectListStateDataFlowQuestion.id,
    questionVersion: projectListStateDataFlowQuestion.version,
  });

  assert.deepEqual(state, {
    sessionId: "recommended-session",
    questionId: projectListStateDataFlowQuestion.id,
    questionVersion: projectListStateDataFlowQuestion.version,
    phase: "answering",
    answerDraft: "",
  });
});
