import assert from "node:assert/strict";
import test from "node:test";

import {
  DIAGNOSE_INITIAL_ANSWER_CONTRACT_VERSION,
} from "../src/domain/v3/diagnosisApi.ts";
import {
  REVIEW_REVISED_ANSWER_CONTRACT_VERSION,
} from "../src/domain/v3/revisionReviewApi.ts";
import {
  PracticeEvaluationAdapterError,
} from "../src/lib/v3/practiceEvaluationAdapter.ts";
import {
  createHttpPracticeEvaluationAdapter,
} from "../src/lib/v3/httpPracticeEvaluationAdapter.ts";
import {
  flawedStateOwnershipAnswer,
  revisedStateOwnershipAnswer,
  validNeedsFollowUpDiagnosis,
  validResolvedRevisionComparison,
  validSufficientDiagnosis,
} from "./fixtures/referenceEvaluationCases.mjs";

const DIAGNOSIS_INPUT = {
  sessionId: "session-private-correlation",
  requestId: "request-private-correlation",
  questionId: "react-state-ownership-01",
  questionVersion: 1,
  originalAnswer: `  ${flawedStateOwnershipAnswer}  `,
};
const REVISION_INPUT = {
  sessionId: "session-private-revision-correlation",
  requestId: "request-private-revision-correlation",
  questionId: "react-state-ownership-01",
  questionVersion: 1,
  diagnosis: validNeedsFollowUpDiagnosis,
  originalAnswer: `  ${flawedStateOwnershipAnswer}  `,
  revisedAnswer: `  ${revisedStateOwnershipAnswer}  `,
};
const SUCCESS_META = {
  traceId: "trace-adapter-success",
  modelLatencyMs: 120,
  usage: null,
};

function createSuccess(result) {
  return {
    contractVersion: "1",
    ok: true,
    result,
    meta: SUCCESS_META,
  };
}

function createError(failure) {
  return {
    contractVersion: "1",
    ok: false,
    error: failure,
    meta: { traceId: "trace-adapter-error" },
  };
}

function createServiceHarness({ response, rejection } = {}) {
  const requests = [];

  return {
    requests,
    service: async (request) => {
      requests.push(request);

      if (rejection) throw rejection;

      return response;
    },
  };
}

async function unexpectedServiceInvocation() {
  throw new Error("Unexpected browser service invocation.");
}

async function captureAdapterError(promise) {
  let captured;

  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof PracticeEvaluationAdapterError);
    captured = error;
    return true;
  });

  return captured;
}

test("diagnose maps only the four shared Call 1 request fields exactly once", async () => {
  const envelope = createSuccess(validNeedsFollowUpDiagnosis);
  const harness = createServiceHarness({ response: envelope });
  const adapter = createHttpPracticeEvaluationAdapter(
    harness.service,
    unexpectedServiceInvocation,
  );

  assert.strictEqual(
    await adapter.diagnose(DIAGNOSIS_INPUT),
    validNeedsFollowUpDiagnosis,
  );
  assert.equal(harness.requests.length, 1);
  assert.deepEqual(harness.requests[0], {
    contractVersion: DIAGNOSE_INITIAL_ANSWER_CONTRACT_VERSION,
    questionId: DIAGNOSIS_INPUT.questionId,
    questionVersion: DIAGNOSIS_INPUT.questionVersion,
    answer: DIAGNOSIS_INPUT.originalAnswer,
  });
  assert.equal(harness.requests[0].answer, DIAGNOSIS_INPUT.originalAnswer);
  assert.equal(Object.hasOwn(harness.requests[0], "sessionId"), false);
  assert.equal(Object.hasOwn(harness.requests[0], "requestId"), false);
});

test("diagnose returns both valid result variants by reference", async () => {
  for (const result of [
    validNeedsFollowUpDiagnosis,
    validSufficientDiagnosis,
  ]) {
    const harness = createServiceHarness({ response: createSuccess(result) });
    const returned = await createHttpPracticeEvaluationAdapter(
      harness.service,
      unexpectedServiceInvocation,
    ).diagnose(DIAGNOSIS_INPUT);

    assert.strictEqual(returned, result);
    assert.equal(harness.requests.length, 1);
  }
});

test("diagnose preserves the exact stable server failure", async () => {
  const failure = {
    code: "question-version-mismatch",
    message: "The practice question version is not supported.",
    retryable: false,
  };
  const harness = createServiceHarness({
    response: createError(failure),
  });
  const error = await captureAdapterError(
    createHttpPracticeEvaluationAdapter(
      harness.service,
      unexpectedServiceInvocation,
    ).diagnose(DIAGNOSIS_INPUT),
  );

  assert.strictEqual(error.failure, failure);
  assert.equal(error.failure.code, failure.code);
  assert.equal(error.failure.message, failure.message);
  assert.equal(error.failure.retryable, failure.retryable);
  assert.equal(harness.requests.length, 1);
});

test("diagnose maps browser-service failure to a safe retryable server error", async () => {
  const privateMessage = "private response, provider, and stack detail";
  const originalError = new Error(privateMessage, {
    cause: new Error("private cause"),
  });
  const harness = createServiceHarness({ rejection: originalError });
  const error = await captureAdapterError(
    createHttpPracticeEvaluationAdapter(
      harness.service,
      unexpectedServiceInvocation,
    ).diagnose(DIAGNOSIS_INPUT),
  );

  assert.deepEqual(error.failure, {
    code: "server-error",
    message: "The diagnosis service could not be completed. Please try again.",
    retryable: true,
  });
  assert.equal(error.message.includes(privateMessage), false);
  assert.equal(error.message.includes(DIAGNOSIS_INPUT.originalAnswer), false);
  assert.equal(Object.hasOwn(error, "cause"), false);
  assert.equal(harness.requests.length, 1);
});

test("compareRevision maps only the six shared Call 2 request fields exactly once", async () => {
  const harness = createServiceHarness({
    response: createSuccess(validResolvedRevisionComparison),
  });
  const adapter = createHttpPracticeEvaluationAdapter(
    unexpectedServiceInvocation,
    harness.service,
  );

  assert.strictEqual(
    await adapter.compareRevision(REVISION_INPUT),
    validResolvedRevisionComparison,
  );
  assert.equal(harness.requests.length, 1);
  assert.deepEqual(harness.requests[0], {
    contractVersion: REVIEW_REVISED_ANSWER_CONTRACT_VERSION,
    questionId: REVISION_INPUT.questionId,
    questionVersion: REVISION_INPUT.questionVersion,
    originalAnswer: REVISION_INPUT.originalAnswer,
    revisedAnswer: REVISION_INPUT.revisedAnswer,
    diagnosis: REVISION_INPUT.diagnosis,
  });
  assert.equal(
    harness.requests[0].originalAnswer,
    REVISION_INPUT.originalAnswer,
  );
  assert.equal(
    harness.requests[0].revisedAnswer,
    REVISION_INPUT.revisedAnswer,
  );
  assert.strictEqual(harness.requests[0].diagnosis, REVISION_INPUT.diagnosis);
  assert.equal(Object.hasOwn(harness.requests[0], "sessionId"), false);
  assert.equal(Object.hasOwn(harness.requests[0], "requestId"), false);
});

test("compareRevision preserves the exact stable server failure", async () => {
  const failure = {
    code: "invalid-model-output",
    message: "The revision review could not be validated.",
    retryable: true,
  };
  const harness = createServiceHarness({
    response: createError(failure),
  });
  const error = await captureAdapterError(
    createHttpPracticeEvaluationAdapter(
      unexpectedServiceInvocation,
      harness.service,
    ).compareRevision(REVISION_INPUT),
  );

  assert.strictEqual(error.failure, failure);
  assert.equal(error.failure.code, failure.code);
  assert.equal(error.failure.message, failure.message);
  assert.equal(error.failure.retryable, failure.retryable);
  assert.equal(harness.requests.length, 1);
});

test("compareRevision maps browser-service failure to a safe retryable server error", async () => {
  const privateMessage = "private revision response, provider, and stack detail";
  const originalError = new Error(privateMessage, {
    cause: new Error("private revision cause"),
  });
  const harness = createServiceHarness({ rejection: originalError });
  const error = await captureAdapterError(
    createHttpPracticeEvaluationAdapter(
      unexpectedServiceInvocation,
      harness.service,
    ).compareRevision(REVISION_INPUT),
  );

  assert.deepEqual(error.failure, {
    code: "server-error",
    message:
      "The revision-review service could not be completed. Please try again.",
    retryable: true,
  });
  assert.equal(error.message.includes(privateMessage), false);
  assert.equal(error.message.includes(REVISION_INPUT.originalAnswer), false);
  assert.equal(error.message.includes(REVISION_INPUT.revisedAnswer), false);
  assert.equal(Object.hasOwn(error, "cause"), false);
  assert.equal(harness.requests.length, 1);
});
