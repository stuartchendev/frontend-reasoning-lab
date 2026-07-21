import assert from "node:assert/strict";
import test from "node:test";

import {
  parseDiagnoseInitialAnswerError,
  parseDiagnoseInitialAnswerRequest,
  parseDiagnoseInitialAnswerResponse,
  parseDiagnoseInitialAnswerSuccess,
} from "../src/domain/v3/diagnosisApi.ts";
import {
  validNeedsFollowUpDiagnosis,
  validSufficientDiagnosis,
} from "./fixtures/referenceEvaluationCases.mjs";

const validRequest = {
  contractVersion: "1",
  questionId: "react-state-ownership-01",
  questionVersion: 1,
  answer: "  The learner-owned answer remains unchanged.  ",
};

const successMeta = {
  traceId: "trace-1",
  modelLatencyMs: 120,
  usage: {
    inputTokens: 300,
    outputTokens: 140,
  },
};

const validError = {
  contractVersion: "1",
  ok: false,
  error: {
    code: "model-unavailable",
    message: "The diagnosis service is temporarily unavailable.",
    retryable: true,
  },
  meta: {
    traceId: "trace-error-1",
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

test("accepts a valid request without normalizing its values", () => {
  assert.strictEqual(
    parseDiagnoseInitialAnswerRequest(validRequest),
    validRequest,
  );
  assert.equal(
    parseDiagnoseInitialAnswerRequest(validRequest).answer,
    "  The learner-owned answer remains unchanged.  ",
  );
});

test("accepts a valid needs-follow-up success envelope", () => {
  const success = createSuccess(validNeedsFollowUpDiagnosis);

  assert.strictEqual(parseDiagnoseInitialAnswerSuccess(success), success);
  assert.strictEqual(parseDiagnoseInitialAnswerResponse(success), success);
  assert.strictEqual(success.result, validNeedsFollowUpDiagnosis);
});

test("accepts a valid sufficient success envelope with null usage", () => {
  const success = createSuccess(validSufficientDiagnosis, {
    ...successMeta,
    usage: null,
  });

  assert.strictEqual(parseDiagnoseInitialAnswerResponse(success), success);
  assert.strictEqual(success.result, validSufficientDiagnosis);
});

test("accepts a valid error envelope", () => {
  assert.strictEqual(parseDiagnoseInitialAnswerError(validError), validError);
  assert.strictEqual(parseDiagnoseInitialAnswerResponse(validError), validError);
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
    parseDiagnoseInitialAnswerResponse(operationUnavailable),
    operationUnavailable,
  );
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
      () => parseDiagnoseInitialAnswerResponse(error),
      TypeError,
    );
  }
});

test("rejects unsupported contract versions", () => {
  assert.throws(
    () =>
      parseDiagnoseInitialAnswerRequest({
        ...validRequest,
        contractVersion: "2",
      }),
    TypeError,
  );

  assert.throws(
    () =>
      parseDiagnoseInitialAnswerResponse({
        ...validError,
        contractVersion: "2",
      }),
    TypeError,
  );
});

test("rejects missing required fields", () => {
  const { answer: _answer, ...requestWithoutAnswer } = validRequest;
  const success = createSuccess(validNeedsFollowUpDiagnosis);
  const { meta: _meta, ...successWithoutMeta } = success;

  assert.throws(
    () => parseDiagnoseInitialAnswerRequest(requestWithoutAnswer),
    TypeError,
  );
  assert.throws(
    () => parseDiagnoseInitialAnswerResponse(successWithoutMeta),
    TypeError,
  );
});

test("rejects invalid request values", () => {
  const invalidRequests = [
    { ...validRequest, questionId: "   " },
    { ...validRequest, questionVersion: 0 },
    { ...validRequest, questionVersion: 1.5 },
    { ...validRequest, answer: "   " },
  ];

  for (const request of invalidRequests) {
    assert.throws(
      () => parseDiagnoseInitialAnswerRequest(request),
      TypeError,
    );
  }
});

test("rejects unknown fields at every envelope-owned object level", () => {
  const success = createSuccess(validNeedsFollowUpDiagnosis);

  const invalidInputs = [
    [parseDiagnoseInitialAnswerRequest, { ...validRequest, unexpected: true }],
    [parseDiagnoseInitialAnswerResponse, { ...success, unexpected: true }],
    [
      parseDiagnoseInitialAnswerResponse,
      { ...success, meta: { ...success.meta, unexpected: true } },
    ],
    [
      parseDiagnoseInitialAnswerResponse,
      {
        ...success,
        meta: {
          ...success.meta,
          usage: { ...success.meta.usage, unexpected: true },
        },
      },
    ],
    [
      parseDiagnoseInitialAnswerResponse,
      { ...validError, error: { ...validError.error, unexpected: true } },
    ],
    [
      parseDiagnoseInitialAnswerResponse,
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
        parseDiagnoseInitialAnswerResponse(
          createSuccess(validNeedsFollowUpDiagnosis, meta),
        ),
      TypeError,
    );
  }
});

test("rejects an invalid diagnosis result", () => {
  assert.throws(
    () =>
      parseDiagnoseInitialAnswerResponse(
        createSuccess({
          ...validNeedsFollowUpDiagnosis,
          outcome: "unsupported",
        }),
      ),
    TypeError,
  );
});

test("rejects incorrect ok discriminant combinations", () => {
  const success = createSuccess(validNeedsFollowUpDiagnosis);

  assert.throws(
    () => parseDiagnoseInitialAnswerResponse({ ...success, ok: false }),
    TypeError,
  );
  assert.throws(
    () => parseDiagnoseInitialAnswerResponse({ ...validError, ok: true }),
    TypeError,
  );
  assert.throws(
    () => parseDiagnoseInitialAnswerResponse({ ...success, ok: "true" }),
    TypeError,
  );
});
