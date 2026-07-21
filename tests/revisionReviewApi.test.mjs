import assert from "node:assert/strict";
import test from "node:test";

import {
  parseReviewRevisedAnswerError,
  parseReviewRevisedAnswerRequest,
  parseReviewRevisedAnswerResponse,
  parseReviewRevisedAnswerSuccess,
} from "../src/domain/v3/revisionReviewApi.ts";
import {
  flawedStateOwnershipAnswer,
  revisedStateOwnershipAnswer,
  validNeedsFollowUpDiagnosis,
  validResolvedRevisionComparison,
  validSufficientDiagnosis,
} from "./fixtures/referenceEvaluationCases.mjs";

const validRequest = {
  contractVersion: "1",
  questionId: "react-state-ownership-01",
  questionVersion: 1,
  originalAnswer: `  ${flawedStateOwnershipAnswer}  `,
  revisedAnswer: `  ${revisedStateOwnershipAnswer}  `,
  diagnosis: validNeedsFollowUpDiagnosis,
};

const successMeta = {
  traceId: "trace-review-1",
  modelLatencyMs: 140,
  usage: {
    inputTokens: 480,
    outputTokens: 160,
  },
};

const validError = {
  contractVersion: "1",
  ok: false,
  error: {
    code: "model-unavailable",
    message: "The revision review service is temporarily unavailable.",
    retryable: true,
  },
  meta: {
    traceId: "trace-review-error-1",
  },
};

function createSuccess(result, meta = successMeta) {
  return {
    contractVersion: "1",
    ok: true,
    result,
    meta,
  };
}

test("accepts a valid request without normalizing or cloning its values", () => {
  const parsed = parseReviewRevisedAnswerRequest(validRequest);

  assert.strictEqual(parsed, validRequest);
  assert.equal(parsed.originalAnswer, `  ${flawedStateOwnershipAnswer}  `);
  assert.equal(parsed.revisedAnswer, `  ${revisedStateOwnershipAnswer}  `);
  assert.strictEqual(parsed.diagnosis, validNeedsFollowUpDiagnosis);
});

test("accepts a valid success envelope", () => {
  const success = createSuccess(validResolvedRevisionComparison);

  assert.strictEqual(parseReviewRevisedAnswerSuccess(success), success);
  assert.strictEqual(parseReviewRevisedAnswerResponse(success), success);
  assert.strictEqual(success.result, validResolvedRevisionComparison);
});

test("accepts a valid success envelope with null usage", () => {
  const success = createSuccess(validResolvedRevisionComparison, {
    ...successMeta,
    usage: null,
  });

  assert.strictEqual(parseReviewRevisedAnswerResponse(success), success);
});

test("accepts a valid error envelope", () => {
  assert.strictEqual(parseReviewRevisedAnswerError(validError), validError);
  assert.strictEqual(parseReviewRevisedAnswerResponse(validError), validError);
});

test("accepts the stable operation-unavailable failure code", () => {
  const operationUnavailable = {
    ...validError,
    error: {
      code: "operation-unavailable",
      message: "Revision review is not available yet.",
      retryable: false,
    },
  };

  assert.strictEqual(
    parseReviewRevisedAnswerResponse(operationUnavailable),
    operationUnavailable,
  );
});

test("rejects sufficient and malformed diagnoses in requests", () => {
  const invalidDiagnoses = [
    validSufficientDiagnosis,
    {
      ...validNeedsFollowUpDiagnosis,
      primaryGap: {
        ...validNeedsFollowUpDiagnosis.primaryGap,
        learnerEvidence: "   ",
      },
    },
  ];

  for (const diagnosis of invalidDiagnoses) {
    assert.throws(
      () => parseReviewRevisedAnswerRequest({ ...validRequest, diagnosis }),
      TypeError,
    );
  }
});

test("rejects invalid error failure and metadata fields", () => {
  const invalidErrors = [
    {
      ...validError,
      error: { ...validError.error, code: "unsupported-code" },
    },
    {
      ...validError,
      error: { ...validError.error, message: 123 },
    },
    {
      ...validError,
      error: { ...validError.error, retryable: "true" },
    },
    {
      ...validError,
      meta: { traceId: "   " },
    },
  ];

  for (const error of invalidErrors) {
    assert.throws(
      () => parseReviewRevisedAnswerResponse(error),
      TypeError,
    );
  }
});

test("rejects unsupported contract versions", () => {
  assert.throws(
    () =>
      parseReviewRevisedAnswerRequest({
        ...validRequest,
        contractVersion: "2",
      }),
    TypeError,
  );

  assert.throws(
    () =>
      parseReviewRevisedAnswerResponse({
        ...validError,
        contractVersion: "2",
      }),
    TypeError,
  );
});

test("rejects missing required fields", () => {
  const { revisedAnswer: _revisedAnswer, ...requestWithoutRevision } =
    validRequest;
  const success = createSuccess(validResolvedRevisionComparison);
  const { meta: _meta, ...successWithoutMeta } = success;

  assert.throws(
    () => parseReviewRevisedAnswerRequest(requestWithoutRevision),
    TypeError,
  );
  assert.throws(
    () => parseReviewRevisedAnswerResponse(successWithoutMeta),
    TypeError,
  );
});

test("rejects invalid request values", () => {
  const invalidRequests = [
    { ...validRequest, questionId: "   " },
    { ...validRequest, questionVersion: 0 },
    { ...validRequest, questionVersion: 1.5 },
    { ...validRequest, originalAnswer: "   " },
    { ...validRequest, revisedAnswer: "   " },
  ];

  for (const request of invalidRequests) {
    assert.throws(
      () => parseReviewRevisedAnswerRequest(request),
      TypeError,
    );
  }
});

test("rejects unknown fields at every envelope-owned object level", () => {
  const success = createSuccess(validResolvedRevisionComparison);

  const invalidInputs = [
    [parseReviewRevisedAnswerRequest, { ...validRequest, candidateIds: [] }],
    [parseReviewRevisedAnswerResponse, { ...success, unexpected: true }],
    [
      parseReviewRevisedAnswerResponse,
      { ...success, meta: { ...success.meta, unexpected: true } },
    ],
    [
      parseReviewRevisedAnswerResponse,
      {
        ...success,
        meta: {
          ...success.meta,
          usage: { ...success.meta.usage, unexpected: true },
        },
      },
    ],
    [
      parseReviewRevisedAnswerResponse,
      { ...validError, error: { ...validError.error, unexpected: true } },
    ],
    [
      parseReviewRevisedAnswerResponse,
      { ...validError, meta: { ...validError.meta, unexpected: true } },
    ],
  ];

  for (const [parse, input] of invalidInputs) {
    assert.throws(() => parse(input), TypeError);
  }
});

test("rejects invalid nested metadata", () => {
  const invalidMetadata = [
    { ...successMeta, traceId: "   " },
    { ...successMeta, modelLatencyMs: -1 },
    { ...successMeta, modelLatencyMs: 1.5 },
    { ...successMeta, usage: { inputTokens: -1, outputTokens: 1 } },
    { ...successMeta, usage: { inputTokens: 1, outputTokens: 1.5 } },
  ];

  for (const meta of invalidMetadata) {
    assert.throws(
      () =>
        parseReviewRevisedAnswerResponse(
          createSuccess(validResolvedRevisionComparison, meta),
        ),
      TypeError,
    );
  }
});

test("rejects an invalid revision comparison result", () => {
  assert.throws(
    () =>
      parseReviewRevisedAnswerResponse(
        createSuccess({
          ...validResolvedRevisionComparison,
          resolution: "improved",
        }),
      ),
    TypeError,
  );
});

test("rejects incorrect ok discriminant combinations", () => {
  const success = createSuccess(validResolvedRevisionComparison);

  assert.throws(
    () => parseReviewRevisedAnswerResponse({ ...success, ok: false }),
    TypeError,
  );
  assert.throws(
    () => parseReviewRevisedAnswerResponse({ ...validError, ok: true }),
    TypeError,
  );
  assert.throws(
    () => parseReviewRevisedAnswerResponse({ ...success, ok: "true" }),
    TypeError,
  );
});
