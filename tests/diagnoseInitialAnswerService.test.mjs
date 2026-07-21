import assert from "node:assert/strict";
import test from "node:test";

import {
  DiagnoseInitialAnswerServiceError,
  createDiagnoseInitialAnswerService,
} from "../src/lib/v3/diagnoseInitialAnswerService.ts";
import {
  validNeedsFollowUpDiagnosis,
  validSufficientDiagnosis,
} from "./fixtures/referenceEvaluationCases.mjs";

const ENDPOINT = "/.netlify/functions/diagnose-initial-answer";
const LEARNER_ANSWER = "  Preserve this learner answer exactly.  ";
const REQUEST = {
  contractVersion: "1",
  questionId: "react-state-ownership-01",
  questionVersion: 1,
  answer: LEARNER_ANSWER,
};
const SUCCESS_META = {
  traceId: "trace-service-success",
  modelLatencyMs: 120,
  usage: {
    inputTokens: 300,
    outputTokens: 140,
  },
};

function createSuccess(result) {
  return {
    contractVersion: "1",
    ok: true,
    result,
    meta: SUCCESS_META,
  };
}

function createError(failure = {
  code: "model-unavailable",
  message: "The diagnosis is temporarily unavailable.",
  retryable: true,
}) {
  return {
    contractVersion: "1",
    ok: false,
    error: failure,
    meta: { traceId: "trace-service-error" },
  };
}

function createFetchHarness({ body, ok = true, rejection } = {}) {
  const calls = [];
  let jsonReadCount = 0;

  return {
    calls,
    get jsonReadCount() {
      return jsonReadCount;
    },
    fetchImplementation: async (input, init) => {
      calls.push({ input, init });

      if (rejection) throw rejection;

      return {
        ok,
        async json() {
          jsonReadCount += 1;

          if (body instanceof Error) throw body;

          return body;
        },
      };
    },
  };
}

async function captureServiceError(promise) {
  let captured;

  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof DiagnoseInitialAnswerServiceError);
    captured = error;
    return true;
  });

  return captured;
}

test("posts the exact shared request once to the fixed same-origin endpoint", async () => {
  const envelope = createSuccess(validNeedsFollowUpDiagnosis);
  const harness = createFetchHarness({ body: envelope });
  const service = createDiagnoseInitialAnswerService(
    harness.fetchImplementation,
  );

  assert.strictEqual(await service(REQUEST), envelope);
  assert.equal(harness.calls.length, 1);
  assert.equal(harness.jsonReadCount, 1);
  assert.equal(harness.calls[0].input, ENDPOINT);
  assert.deepEqual(harness.calls[0].init, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify(REQUEST),
  });
  assert.deepEqual(JSON.parse(harness.calls[0].init.body), REQUEST);
  assert.equal(JSON.parse(harness.calls[0].init.body).answer, LEARNER_ANSWER);
  assert.equal(Object.hasOwn(harness.calls[0].init, "credentials"), false);
});

test("accepts both valid success result variants by reference", async () => {
  for (const result of [
    validNeedsFollowUpDiagnosis,
    validSufficientDiagnosis,
  ]) {
    const envelope = createSuccess(result);
    const harness = createFetchHarness({ body: envelope });
    const response = await createDiagnoseInitialAnswerService(
      harness.fetchImplementation,
    )(REQUEST);

    assert.strictEqual(response, envelope);
    assert.strictEqual(response.result, result);
  }
});

test("accepts a valid server error envelope only from an HTTP error", async () => {
  const envelope = createError();
  const harness = createFetchHarness({ body: envelope, ok: false });
  const response = await createDiagnoseInitialAnswerService(
    harness.fetchImplementation,
  )(REQUEST);

  assert.strictEqual(response, envelope);
  assert.strictEqual(response.error, envelope.error);
  assert.equal(harness.jsonReadCount, 1);
});

test("rejects unreadable JSON and malformed envelopes safely", async () => {
  const invalidBodies = [
    new SyntaxError("private malformed response text"),
    null,
    { contractVersion: "1", ok: true },
    {
      ...createSuccess(validNeedsFollowUpDiagnosis),
      unexpected: "raw provider field",
    },
  ];

  for (const body of invalidBodies) {
    const harness = createFetchHarness({ body });
    const error = await captureServiceError(
      createDiagnoseInitialAnswerService(harness.fetchImplementation)(REQUEST),
    );

    assert.equal(harness.calls.length, 1);
    assert.equal(harness.jsonReadCount, 1);
    assert.equal(error.message.includes(LEARNER_ANSWER), false);
    assert.equal(error.message.includes("private"), false);
    assert.equal(error.message.includes("provider"), false);
    assert.equal(Object.hasOwn(error, "cause"), false);
  }
});

test("rejects HTTP and envelope outcome mismatches", async () => {
  const mismatches = [
    { body: createError(), ok: true },
    { body: createSuccess(validNeedsFollowUpDiagnosis), ok: false },
  ];

  for (const mismatch of mismatches) {
    const harness = createFetchHarness(mismatch);

    await assert.rejects(
      createDiagnoseInitialAnswerService(harness.fetchImplementation)(REQUEST),
      DiagnoseInitialAnswerServiceError,
    );
    assert.equal(harness.calls.length, 1);
    assert.equal(harness.jsonReadCount, 1);
  }
});

test("maps fetch rejection to one safe service failure without retry", async () => {
  const privateMessage = "private network failure with response body";
  const harness = createFetchHarness({
    rejection: new Error(privateMessage),
  });
  const error = await captureServiceError(
    createDiagnoseInitialAnswerService(harness.fetchImplementation)(REQUEST),
  );

  assert.equal(harness.calls.length, 1);
  assert.equal(harness.jsonReadCount, 0);
  assert.equal(error.message.includes(privateMessage), false);
  assert.equal(error.message.includes(LEARNER_ANSWER), false);
  assert.equal(Object.hasOwn(error, "cause"), false);
});
