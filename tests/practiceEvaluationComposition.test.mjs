import assert from "node:assert/strict";
import test from "node:test";

import {
  publicWalkthroughComparison,
  publicWalkthroughDiagnosis,
} from "../src/data/v3/publicWalkthroughFixtures.ts";
import {
  flawedStateOwnershipAnswer,
  revisedStateOwnershipAnswer,
} from "../src/data/v3/referencePracticeFixtures.ts";
import {
  reactStateOwnershipQuestion,
} from "../src/domain/v3/questionContent.ts";
import {
  createPracticeEvaluationComposition,
} from "../src/lib/v3/practiceEvaluationComposition.ts";

function createAdapterInput(answer) {
  return {
    sessionId: "composition-session",
    requestId: "composition-call-1",
    questionId: reactStateOwnershipQuestion.id,
    questionVersion: reactStateOwnershipQuestion.version,
    originalAnswer: answer,
  };
}

test("production composes replay without constructing live services", async () => {
  let liveCallCount = 0;
  const composition = createPracticeEvaluationComposition({
    isDevelopment: false,
    diagnoseInitialAnswer: async () => {
      liveCallCount += 1;
      throw new Error("live diagnosis must not run");
    },
    reviewRevisedAnswer: async () => {
      liveCallCount += 1;
      throw new Error("live review must not run");
    },
  });

  assert.equal(composition.mode, "public-walkthrough");
  assert.strictEqual(
    await composition.adapter.diagnose(
      createAdapterInput(flawedStateOwnershipAnswer),
    ),
    publicWalkthroughDiagnosis,
  );
  assert.equal(liveCallCount, 0);
});

test("development composes the existing HTTP adapter and permits free input", async () => {
  const arbitraryAnswer = "A freely edited local development answer.";
  const arbitraryRevision = "A freely edited local development revision.";
  const diagnosisRequests = [];
  const reviewRequests = [];
  const composition = createPracticeEvaluationComposition({
    isDevelopment: true,
    diagnoseInitialAnswer: async (request) => {
      diagnosisRequests.push(request);
      return {
        contractVersion: "1",
        ok: true,
        result: publicWalkthroughDiagnosis,
        meta: {
          traceId: "composition-call-1",
          modelLatencyMs: 1,
          usage: null,
        },
      };
    },
    reviewRevisedAnswer: async (request) => {
      reviewRequests.push(request);
      return {
        contractVersion: "1",
        ok: true,
        result: publicWalkthroughComparison,
        meta: {
          traceId: "composition-call-2",
          modelLatencyMs: 1,
          usage: null,
        },
      };
    },
  });

  assert.equal(composition.mode, "live-model");
  await composition.adapter.diagnose(createAdapterInput(arbitraryAnswer));
  await composition.adapter.compareRevision({
    sessionId: "composition-session",
    requestId: "composition-call-2",
    questionId: reactStateOwnershipQuestion.id,
    questionVersion: reactStateOwnershipQuestion.version,
    diagnosis: publicWalkthroughDiagnosis,
    originalAnswer: arbitraryAnswer,
    revisedAnswer: arbitraryRevision,
  });

  assert.equal(diagnosisRequests[0].answer, arbitraryAnswer);
  assert.equal(reviewRequests[0].originalAnswer, arbitraryAnswer);
  assert.equal(reviewRequests[0].revisedAnswer, arbitraryRevision);
});
