import assert from "node:assert/strict";
import test from "node:test";

import {
  parseDiagnoseInitialAnswerError,
  parseDiagnoseInitialAnswerSuccess,
} from "../src/domain/v3/diagnosisApi.ts";
import {
  DiagnosisPipelineError,
} from "../src/server/v3/diagnosisPipeline.ts";
import {
  MAX_DIAGNOSE_INITIAL_ANSWER_RAW_BODY_BYTES,
  createDiagnoseInitialAnswerHttpHandler,
} from "../src/server/v3/diagnoseInitialAnswerHttp.ts";
import {
  flawedStateOwnershipAnswer,
  sufficientStateOwnershipAnswer,
  validNeedsFollowUpDiagnosis,
  validSufficientDiagnosis,
} from "./fixtures/referenceEvaluationCases.mjs";

const ENDPOINT =
  "http://localhost/.netlify/functions/diagnose-initial-answer";
const TRACE_ID = "trace-http-test";
const MODEL_META = {
  modelLatencyMs: 120,
  usage: {
    inputTokens: 300,
    outputTokens: 140,
  },
};

function createRequest(overrides = {}) {
  return {
    contractVersion: "1",
    questionId: "react-state-ownership-01",
    questionVersion: 1,
    answer: flawedStateOwnershipAnswer,
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
      output: options.output ?? validNeedsFollowUpDiagnosis,
      meta: options.meta ?? MODEL_META,
    };
  };
  const createModelBoundary =
    options.createModelBoundary ??
    (() => {
      counts.boundaryFactory += 1;
      return options.modelBoundary ?? defaultBoundary;
    });
  const handler = createDiagnoseInitialAnswerHttpHandler({
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
  assert.strictEqual(parseDiagnoseInitialAnswerError(body), body);
  assert.equal(body.contractVersion, "1");
  assert.equal(body.ok, false);
  assert.equal(body.error.code, code);
  assert.equal(body.meta.traceId, TRACE_ID);
  return body;
}

async function assertSuccessResponse(response, expectedResult) {
  assert.equal(response.status, 200);
  const body = await readJsonResponse(response);
  assert.strictEqual(parseDiagnoseInitialAnswerSuccess(body), body);
  assert.deepEqual(body.result, expectedResult);
  assert.deepEqual(body.meta, {
    traceId: TRACE_ID,
    ...MODEL_META,
  });
  return body;
}

test("returns a validated needs-follow-up success envelope", async () => {
  const harness = createHarness();
  const response = await harness.handler(postJson(createRequest()));

  await assertSuccessResponse(response, validNeedsFollowUpDiagnosis);
  assert.equal(harness.counts.boundaryFactory, 1);
  assert.equal(harness.counts.model, 1);
});

test("returns a validated sufficient success envelope", async () => {
  const harness = createHarness({ output: validSufficientDiagnosis });
  const response = await harness.handler(
    postJson(createRequest({ answer: sufficientStateOwnershipAnswer })),
  );

  await assertSuccessResponse(response, validSufficientDiagnosis);
  assert.equal(harness.counts.boundaryFactory, 1);
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

test("rejects missing and unknown request fields", async () => {
  const invalidRequests = [
    {
      contractVersion: "1",
      questionId: "react-state-ownership-01",
      questionVersion: 1,
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
  assert.equal(body.contractVersion, "1");
  assert.equal(body.error.retryable, false);
  assert.equal(harness.counts.boundaryFactory, 0);
  assert.equal(harness.counts.model, 0);
});

test("accepts a structurally valid raw body exactly at 16 KiB", async () => {
  const serialized = JSON.stringify(createRequest());
  const byteLength = new TextEncoder().encode(serialized).byteLength;
  const body =
    serialized +
    " ".repeat(MAX_DIAGNOSE_INITIAL_ANSWER_RAW_BODY_BYTES - byteLength);
  assert.equal(
    new TextEncoder().encode(body).byteLength,
    MAX_DIAGNOSE_INITIAL_ANSWER_RAW_BODY_BYTES,
  );
  const harness = createHarness();
  const response = await harness.handler(postBody(body));

  await assertSuccessResponse(response, validNeedsFollowUpDiagnosis);
  assert.equal(harness.counts.boundaryFactory, 1);
  assert.equal(harness.counts.model, 1);
});

test("rejects a raw body over 16 KiB before parsing or model creation", async () => {
  const harness = createHarness();
  const response = await harness.handler(
    postBody("x".repeat(MAX_DIAGNOSE_INITIAL_ANSWER_RAW_BODY_BYTES + 1)),
  );

  const body = await assertErrorResponse(
    response,
    413,
    "payload-too-large",
  );
  assert.equal(body.error.retryable, false);
  assert.equal(harness.counts.boundaryFactory, 0);
  assert.equal(harness.counts.model, 0);
});

test("maps an unknown question to 404 without model invocation", async () => {
  const harness = createHarness();
  const response = await harness.handler(
    postJson(createRequest({ questionId: "unknown-question" })),
  );

  await assertErrorResponse(response, 404, "question-not-found");
  assert.equal(harness.counts.boundaryFactory, 0);
  assert.equal(harness.counts.model, 0);
});

test("maps a question-version mismatch to 409 without model invocation", async () => {
  const harness = createHarness();
  const response = await harness.handler(
    postJson(createRequest({ questionVersion: 2 })),
  );

  await assertErrorResponse(response, 409, "question-version-mismatch");
  assert.equal(harness.counts.boundaryFactory, 0);
  assert.equal(harness.counts.model, 0);
});

test("preserves the pipeline normalized-answer 8 KiB limit as 413", async () => {
  const harness = createHarness();
  const response = await harness.handler(
    postJson(createRequest({ answer: "a".repeat(8 * 1024 + 1) })),
  );

  await assertErrorResponse(response, 413, "payload-too-large");
  assert.equal(harness.counts.boundaryFactory, 0);
  assert.equal(harness.counts.model, 0);
});

test("maps a model-boundary rejection to 503", async () => {
  const providerError = new Error("provider detail must remain private");
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
  const harness = createHarness({ output: { outcome: "unsupported" } });
  const response = await harness.handler(postJson(createRequest()));

  await assertErrorResponse(response, 502, "invalid-model-output");
  assert.equal(harness.counts.model, 1);
});

test("maps model-boundary construction failure to a safe 500", async () => {
  const safeDiagnostics = [];
  let boundaryFactoryCount = 0;
  const handler = createDiagnoseInitialAnswerHttpHandler({
    createModelBoundary() {
      boundaryFactoryCount += 1;
      throw new Error("missing key with secret-value");
    },
    createTraceId: () => TRACE_ID,
    logSafeDiagnostic: (diagnostic) => safeDiagnostics.push(diagnostic),
  });
  const response = await handler(postJson(createRequest()));

  const body = await assertErrorResponse(response, 500, "server-error");
  assert.equal(body.error.retryable, false);
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
      throw new Error("answer provider prompt stack private-detail");
    },
  });
  const response = await harness.handler(postJson(createRequest()));

  const body = await assertErrorResponse(response, 500, "server-error");
  const exposed = JSON.stringify({ body, logs: harness.safeDiagnostics });
  for (const forbidden of [
    flawedStateOwnershipAnswer,
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

test("maps rate-limited pipeline failure to 429 and preserves safe failure", async () => {
  const failure = {
    code: "rate-limited",
    message: "Please retry the diagnosis later.",
    retryable: true,
  };
  const harness = createHarness({
    async runPreparedPipeline() {
      throw new DiagnosisPipelineError(failure);
    },
  });
  const response = await harness.handler(postJson(createRequest()));

  const body = await assertErrorResponse(response, 429, "rate-limited");
  assert.deepEqual(body.error, failure);
});

test("generates one deterministic trace ID and invokes the model once", async () => {
  let traceIdCount = 0;
  let boundaryFactoryCount = 0;
  let modelInvocationCount = 0;
  const handler = createDiagnoseInitialAnswerHttpHandler({
    createTraceId() {
      traceIdCount += 1;
      return TRACE_ID;
    },
    createModelBoundary() {
      boundaryFactoryCount += 1;
      return async () => {
        modelInvocationCount += 1;
        return {
          output: validNeedsFollowUpDiagnosis,
          meta: MODEL_META,
        };
      };
    },
  });
  const response = await handler(postJson(createRequest()));

  const body = await assertSuccessResponse(
    response,
    validNeedsFollowUpDiagnosis,
  );
  assert.equal(body.meta.traceId, TRACE_ID);
  assert.equal(traceIdCount, 1);
  assert.equal(boundaryFactoryCount, 1);
  assert.equal(modelInvocationCount, 1);
});
