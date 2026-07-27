import assert from "node:assert/strict";
import test from "node:test";

import {
  parseReviewRevisedAnswerError,
  parseReviewRevisedAnswerSuccess,
} from "../src/domain/v3/revisionReviewApi.ts";
import {
  RevisionReviewPipelineError,
} from "../src/server/v3/revisionReviewPipeline.ts";
import {
  MAX_REVIEW_REVISED_ANSWER_RAW_BODY_BYTES,
  createReviewRevisedAnswerHttpHandler,
} from "../src/server/v3/reviewRevisedAnswerHttp.ts";
import { ModelBoundaryError } from "../src/server/v3/modelBoundaryError.ts";
import {
  flawedStateOwnershipAnswer,
  revisedStateOwnershipAnswer,
  validNeedsFollowUpDiagnosis,
  validResolvedRevisionComparison,
} from "./fixtures/referenceEvaluationCases.mjs";

const ENDPOINT =
  "http://localhost/.netlify/functions/review-revised-answer";
const TRACE_ID = "trace-review-http-test";
const MODEL_META = {
  modelLatencyMs: 140,
  usage: {
    inputTokens: 480,
    outputTokens: 160,
  },
};

function createRequest(overrides = {}) {
  return {
    contractVersion: "1",
    questionId: "react-state-ownership-01",
    questionVersion: 1,
    originalAnswer: flawedStateOwnershipAnswer,
    revisedAnswer: revisedStateOwnershipAnswer,
    diagnosis: validNeedsFollowUpDiagnosis,
    ...overrides,
  };
}

function postBody(body) {
  return new Request(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

function postJson(body) {
  return postBody(JSON.stringify(body));
}

function createHarness(options = {}) {
  const counts = {
    boundaryFactory: 0,
    model: 0,
  };
  const safeDiagnostics = [];
  const defaultBoundary = async () => {
    counts.model += 1;
    return {
      output: options.output ?? validResolvedRevisionComparison,
      meta: options.meta ?? MODEL_META,
    };
  };
  const createModelBoundary =
    options.createModelBoundary ??
    (() => {
      counts.boundaryFactory += 1;
      return options.modelBoundary ?? defaultBoundary;
    });
  const handler = createReviewRevisedAnswerHttpHandler({
    createModelBoundary,
    createTraceId: () => TRACE_ID,
    runPreparedPipeline: options.runPreparedPipeline,
    logSafeDiagnostic: (diagnostic) => safeDiagnostics.push(diagnostic),
  });

  return { handler, counts, safeDiagnostics };
}

async function readJsonResponse(response) {
  assert.equal(response.headers.get("Content-Type"), "application/json");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  return response.json();
}

async function assertErrorResponse(response, status, code) {
  assert.equal(response.status, status);
  const body = await readJsonResponse(response);
  assert.strictEqual(parseReviewRevisedAnswerError(body), body);
  assert.equal(body.contractVersion, "1");
  assert.equal(body.ok, false);
  assert.equal(body.error.code, code);
  assert.equal(body.meta.traceId, TRACE_ID);
  return body;
}

async function assertSuccessResponse(response, expectedResult) {
  assert.equal(response.status, 200);
  const body = await readJsonResponse(response);
  assert.strictEqual(parseReviewRevisedAnswerSuccess(body), body);
  assert.deepEqual(body.result, expectedResult);
  assert.deepEqual(body.meta, {
    traceId: TRACE_ID,
    ...MODEL_META,
  });
  return body;
}

test("returns a validated revision-review success envelope", async () => {
  const harness = createHarness();
  const response = await harness.handler(postJson(createRequest()));

  await assertSuccessResponse(response, validResolvedRevisionComparison);
  assert.equal(harness.counts.boundaryFactory, 1);
  assert.equal(harness.counts.model, 1);
});

test("accepts a validated comparison without a next action", async () => {
  const result = {
    ...validResolvedRevisionComparison,
    nextAction: null,
  };
  const harness = createHarness({ output: result });
  const response = await harness.handler(postJson(createRequest()));

  await assertSuccessResponse(response, result);
  assert.equal(harness.counts.model, 1);
});

test("rejects non-POST methods with Allow POST", async () => {
  for (const method of ["GET", "PUT", "DELETE"]) {
    const harness = createHarness();
    const response = await harness.handler(new Request(ENDPOINT, { method }));

    await assertErrorResponse(response, 405, "invalid-request");
    assert.equal(response.headers.get("Allow"), "POST");
    assert.equal(harness.counts.boundaryFactory, 0);
    assert.equal(harness.counts.model, 0);
  }
});

test("rejects empty, malformed, and non-object JSON bodies", async () => {
  const bodies = ["", "   ", "{not-json", "[]", "null", "1", '"text"'];

  for (const body of bodies) {
    const harness = createHarness();
    const response = await harness.handler(postBody(body));

    await assertErrorResponse(response, 400, "invalid-request");
    assert.equal(harness.counts.boundaryFactory, 0);
    assert.equal(harness.counts.model, 0);
  }
});

test("rejects missing and browser-owned request fields", async () => {
  const invalidRequests = [
    {
      contractVersion: "1",
      questionId: "react-state-ownership-01",
      questionVersion: 1,
      originalAnswer: flawedStateOwnershipAnswer,
      revisedAnswer: revisedStateOwnershipAnswer,
    },
    {
      ...createRequest(),
      candidateQuestionIds: ["browser-selected-candidate"],
    },
    {
      ...createRequest(),
      rubric: "browser-owned-policy",
    },
  ];

  for (const request of invalidRequests) {
    const harness = createHarness();
    const response = await harness.handler(postJson(request));

    await assertErrorResponse(response, 400, "invalid-request");
    assert.equal(harness.counts.boundaryFactory, 0);
    assert.equal(harness.counts.model, 0);
  }
});

test("rejects unsupported contract versions using envelope version 1", async () => {
  const harness = createHarness();
  const response = await harness.handler(
    postJson(createRequest({ contractVersion: "2" })),
  );

  const body = await assertErrorResponse(
    response,
    400,
    "unsupported-contract-version",
  );
  assert.equal(body.error.retryable, false);
  assert.equal(harness.counts.boundaryFactory, 0);
  assert.equal(harness.counts.model, 0);
});

test("accepts a structurally valid raw body exactly at 24 KiB", async () => {
  const serialized = JSON.stringify(createRequest());
  const byteLength = new TextEncoder().encode(serialized).byteLength;
  const body =
    serialized +
    " ".repeat(MAX_REVIEW_REVISED_ANSWER_RAW_BODY_BYTES - byteLength);
  assert.equal(
    new TextEncoder().encode(body).byteLength,
    MAX_REVIEW_REVISED_ANSWER_RAW_BODY_BYTES,
  );
  const harness = createHarness();
  const response = await harness.handler(postBody(body));

  await assertSuccessResponse(response, validResolvedRevisionComparison);
  assert.equal(harness.counts.model, 1);
});

test("rejects a raw body over 24 KiB before model creation", async () => {
  const harness = createHarness();
  const response = await harness.handler(
    postBody("x".repeat(MAX_REVIEW_REVISED_ANSWER_RAW_BODY_BYTES + 1)),
  );

  await assertErrorResponse(response, 413, "payload-too-large");
  assert.equal(harness.counts.boundaryFactory, 0);
  assert.equal(harness.counts.model, 0);
});

test("maps unknown question and version mismatch before model creation", async () => {
  const cases = [
    {
      request: createRequest({ questionId: "unknown-question" }),
      status: 404,
      code: "question-not-found",
    },
    {
      request: createRequest({ questionVersion: 2 }),
      status: 409,
      code: "question-version-mismatch",
    },
  ];

  for (const item of cases) {
    const harness = createHarness();
    const response = await harness.handler(postJson(item.request));

    await assertErrorResponse(response, item.status, item.code);
    assert.equal(harness.counts.boundaryFactory, 0);
    assert.equal(harness.counts.model, 0);
  }
});

test("preserves both normalized-answer 8 KiB limits as 413", async () => {
  for (const field of ["originalAnswer", "revisedAnswer"]) {
    const harness = createHarness();
    const response = await harness.handler(
      postJson(createRequest({ [field]: "a".repeat(8 * 1024 + 1) })),
    );

    await assertErrorResponse(response, 413, "payload-too-large");
    assert.equal(harness.counts.boundaryFactory, 0);
    assert.equal(harness.counts.model, 0);
  }
});

test("revalidates diagnosis evidence against the original answer", async () => {
  const diagnosis = {
    ...validNeedsFollowUpDiagnosis,
    primaryGap: {
      ...validNeedsFollowUpDiagnosis.primaryGap,
      learnerEvidence: "evidence absent from the original answer",
    },
  };
  const harness = createHarness();
  const response = await harness.handler(
    postJson(createRequest({ diagnosis })),
  );

  await assertErrorResponse(response, 400, "invalid-request");
  assert.equal(harness.counts.boundaryFactory, 0);
  assert.equal(harness.counts.model, 0);
});

test("maps a model-boundary rejection to 503 without leaking details", async () => {
  const providerError = new ModelBoundaryError(
    "model-unavailable",
    "provider detail must remain private",
  );
  let invocationCount = 0;
  const harness = createHarness({
    modelBoundary: async () => {
      invocationCount += 1;
      throw providerError;
    },
  });
  const response = await harness.handler(postJson(createRequest()));

  const body = await assertErrorResponse(response, 503, "model-unavailable");
  assert.equal(harness.counts.boundaryFactory, 1);
  assert.equal(invocationCount, 1);
  assert.equal(JSON.stringify(body).includes(providerError.message), false);
});

test("maps invalid model output to 502", async () => {
  const harness = createHarness({
    output: {
      ...validResolvedRevisionComparison,
      nextAction: {
        ...validResolvedRevisionComparison.nextAction,
        questionId: "not-a-server-candidate",
      },
    },
  });
  const response = await harness.handler(postJson(createRequest()));

  await assertErrorResponse(response, 502, "invalid-model-output");
  assert.equal(harness.counts.model, 1);
});

test("maps model-boundary construction failure to a safe 500", async () => {
  const safeDiagnostics = [];
  let boundaryFactoryCount = 0;
  const handler = createReviewRevisedAnswerHttpHandler({
    createModelBoundary() {
      boundaryFactoryCount += 1;
      throw new Error("missing key with secret-value");
    },
    createTraceId: () => TRACE_ID,
    logSafeDiagnostic: (diagnostic) => safeDiagnostics.push(diagnostic),
  });
  const response = await handler(postJson(createRequest()));

  const body = await assertErrorResponse(response, 500, "server-error");
  assert.equal(boundaryFactoryCount, 1);
  assert.deepEqual(safeDiagnostics, [
    {
      traceId: TRACE_ID,
      category: "model-boundary-configuration",
    },
  ]);
  assert.equal(JSON.stringify(body).includes("secret-value"), false);
});

test("maps unexpected internal failure to a safe 500", async () => {
  const harness = createHarness({
    async runPreparedPipeline() {
      throw new Error("answers provider prompt stack private-detail");
    },
  });
  const response = await harness.handler(postJson(createRequest()));

  const body = await assertErrorResponse(response, 500, "server-error");
  const exposed = JSON.stringify({ body, logs: harness.safeDiagnostics });
  for (const forbidden of [
    flawedStateOwnershipAnswer,
    revisedStateOwnershipAnswer,
    "provider",
    "prompt",
    "stack",
    "private-detail",
  ]) {
    assert.equal(exposed.includes(forbidden), false);
  }
  assert.deepEqual(harness.safeDiagnostics, [
    { traceId: TRACE_ID, category: "unexpected-handler-error" },
  ]);
});

test("maps rate limit and operation-unavailable failures", async () => {
  const failures = [
    {
      failure: {
        code: "rate-limited",
        message: "Please retry the revision review later.",
        retryable: true,
      },
      status: 429,
    },
    {
      failure: {
        code: "operation-unavailable",
        message: "Revision review is not available yet.",
        retryable: false,
      },
      status: 501,
    },
  ];

  for (const item of failures) {
    const harness = createHarness({
      async runPreparedPipeline() {
        throw new RevisionReviewPipelineError(item.failure);
      },
    });
    const response = await harness.handler(postJson(createRequest()));

    const body = await assertErrorResponse(
      response,
      item.status,
      item.failure.code,
    );
    assert.deepEqual(body.error, item.failure);
  }
});

test("generates one trace ID and invokes the model at most once", async () => {
  let traceIdCount = 0;
  let boundaryFactoryCount = 0;
  let modelInvocationCount = 0;
  const handler = createReviewRevisedAnswerHttpHandler({
    createTraceId() {
      traceIdCount += 1;
      return TRACE_ID;
    },
    createModelBoundary() {
      boundaryFactoryCount += 1;
      return async () => {
        modelInvocationCount += 1;
        return {
          output: validResolvedRevisionComparison,
          meta: MODEL_META,
        };
      };
    },
  });
  const response = await handler(postJson(createRequest()));

  const body = await assertSuccessResponse(
    response,
    validResolvedRevisionComparison,
  );
  assert.equal(body.meta.traceId, TRACE_ID);
  assert.equal(traceIdCount, 1);
  assert.equal(boundaryFactoryCount, 1);
  assert.equal(modelInvocationCount, 1);
});
