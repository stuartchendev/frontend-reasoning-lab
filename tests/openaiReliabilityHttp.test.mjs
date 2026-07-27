import assert from "node:assert/strict";
import test from "node:test";
import { APIConnectionTimeoutError } from "openai";

import {
  createDiagnoseInitialAnswerHttpHandler,
} from "../src/server/v3/diagnoseInitialAnswerHttp.ts";
import {
  createOpenAICall1ModelBoundary,
} from "../src/server/v3/openaiDiagnosisClient.ts";
import {
  createOpenAICall2ModelBoundary,
} from "../src/server/v3/openaiRevisionReviewClient.ts";
import {
  createReviewRevisedAnswerHttpHandler,
} from "../src/server/v3/reviewRevisedAnswerHttp.ts";
import {
  flawedStateOwnershipAnswer,
  revisedStateOwnershipAnswer,
  validNeedsFollowUpDiagnosis,
  validResolvedRevisionComparison,
} from "./fixtures/referenceEvaluationCases.mjs";

const CALL_1_ENDPOINT =
  "http://localhost/.netlify/functions/diagnose-initial-answer";
const CALL_2_ENDPOINT =
  "http://localhost/.netlify/functions/review-revised-answer";

function createCompletedResponse(result, usage) {
  const outputText = JSON.stringify({ result });

  return {
    status: "completed",
    output_text: outputText,
    output: [],
    usage,
  };
}

function createTransport(behavior, calls) {
  return {
    async createResponse(request) {
      calls.push(request);

      if (behavior.error) {
        throw behavior.error;
      }

      return behavior.response;
    },
  };
}

function postJson(endpoint, body) {
  return new Request(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createClock(startedAt, completedAt) {
  const readings = [startedAt, completedAt];
  return () => readings.shift();
}

function createProviderError(message, status) {
  return Object.assign(new Error(message), { status });
}

async function readJson(response) {
  assert.equal(response.headers.get("Content-Type"), "application/json");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  return response.json();
}

async function assertSafeError(response, expected, traceId, privateDetail) {
  assert.equal(response.status, expected.status);
  const body = await readJson(response);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, expected.code);
  assert.equal(body.error.retryable, expected.retryable ?? true);
  assert.equal(body.meta.traceId, traceId);
  assert.equal(JSON.stringify(body).includes(privateDetail), false);
}

test("Call 1 preserves OpenAI reliability classification through the HTTP envelope", async (t) => {
  const request = {
    contractVersion: "1",
    questionId: "react-state-ownership-01",
    questionVersion: 1,
    answer: flawedStateOwnershipAnswer,
  };
  const cases = [
    {
      name: "success",
      behavior: {
        response: createCompletedResponse(validNeedsFollowUpDiagnosis, {
          input_tokens: 300,
          output_tokens: 140,
        }),
      },
      expected: { status: 200 },
    },
    {
      name: "provider 429",
      behavior: {
        error: createProviderError("private rate-limit detail", 429),
      },
      expected: { status: 429, code: "rate-limited" },
      privateDetail: "private rate-limit detail",
    },
    {
      name: "timeout or transport failure",
      behavior: {
        error: new APIConnectionTimeoutError({
          message: "private timeout detail",
        }),
      },
      expected: { status: 503, code: "model-unavailable" },
      privateDetail: "private timeout detail",
    },
    {
      name: "provider authentication failure",
      behavior: {
        error: createProviderError("private authentication detail", 401),
      },
      expected: {
        status: 500,
        code: "server-error",
        retryable: false,
      },
      privateDetail: "private authentication detail",
    },
    {
      name: "unknown programmer error",
      behavior: {
        error: new TypeError("private programmer detail"),
      },
      expected: {
        status: 500,
        code: "server-error",
        retryable: false,
      },
      privateDetail: "private programmer detail",
    },
    {
      name: "malformed structured response",
      behavior: {
        response: {
          ...createCompletedResponse(validNeedsFollowUpDiagnosis, undefined),
          output_text: "{not-json",
        },
      },
      expected: { status: 502, code: "invalid-model-output" },
      privateDetail: "{not-json",
    },
    {
      name: "malformed provider envelope",
      behavior: {
        response: {
          ...createCompletedResponse(validNeedsFollowUpDiagnosis, undefined),
          output: undefined,
        },
      },
      expected: { status: 502, code: "invalid-model-output" },
      privateDetail: "undefined",
    },
  ];

  for (const item of cases) {
    await t.test(item.name, async () => {
      const calls = [];
      const diagnostics = [];
      const traceId = `trace-call-1-${item.name}`;
      const handler = createDiagnoseInitialAnswerHttpHandler({
        createModelBoundary: () =>
          createOpenAICall1ModelBoundary(
            createTransport(item.behavior, calls),
            { now: createClock(1_000, 1_125) },
          ),
        createTraceId: () => traceId,
        logSafeDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
      });
      const response = await handler(postJson(CALL_1_ENDPOINT, request));

      assert.equal(calls.length, 1);

      if (item.expected.status === 200) {
        assert.equal(response.status, 200);
        const body = await readJson(response);
        assert.equal(body.ok, true);
        assert.deepEqual(body.result, validNeedsFollowUpDiagnosis);
        assert.deepEqual(body.meta, {
          traceId,
          modelLatencyMs: 125,
          usage: {
            inputTokens: 300,
            outputTokens: 140,
          },
        });
      } else {
        await assertSafeError(
          response,
          item.expected,
          traceId,
          item.privateDetail,
        );
      }

      if (item.expected.status === 500) {
        assert.deepEqual(diagnostics, [
          { traceId, category: "unexpected-handler-error" },
        ]);
      } else {
        assert.deepEqual(diagnostics, []);
      }
    });
  }
});

test("Call 2 preserves OpenAI reliability classification through the HTTP envelope", async (t) => {
  const request = {
    contractVersion: "1",
    questionId: "react-state-ownership-01",
    questionVersion: 1,
    originalAnswer: flawedStateOwnershipAnswer,
    revisedAnswer: revisedStateOwnershipAnswer,
    diagnosis: validNeedsFollowUpDiagnosis,
  };
  const cases = [
    {
      name: "success",
      behavior: {
        response: createCompletedResponse(
          validResolvedRevisionComparison,
          {
            input_tokens: 480,
            output_tokens: 160,
          },
        ),
      },
      expected: { status: 200 },
    },
    {
      name: "provider 429",
      behavior: {
        error: createProviderError("private rate-limit detail", 429),
      },
      expected: { status: 429, code: "rate-limited" },
      privateDetail: "private rate-limit detail",
    },
    {
      name: "timeout or transport failure",
      behavior: {
        error: new APIConnectionTimeoutError({
          message: "private timeout detail",
        }),
      },
      expected: { status: 503, code: "model-unavailable" },
      privateDetail: "private timeout detail",
    },
    {
      name: "provider authentication failure",
      behavior: {
        error: createProviderError("private authentication detail", 401),
      },
      expected: {
        status: 500,
        code: "server-error",
        retryable: false,
      },
      privateDetail: "private authentication detail",
    },
    {
      name: "unknown programmer error",
      behavior: {
        error: new TypeError("private programmer detail"),
      },
      expected: {
        status: 500,
        code: "server-error",
        retryable: false,
      },
      privateDetail: "private programmer detail",
    },
    {
      name: "malformed structured response",
      behavior: {
        response: {
          ...createCompletedResponse(
            validResolvedRevisionComparison,
            undefined,
          ),
          output_text: "{not-json",
        },
      },
      expected: { status: 502, code: "invalid-model-output" },
      privateDetail: "{not-json",
    },
    {
      name: "malformed provider envelope",
      behavior: {
        response: {
          ...createCompletedResponse(
            validResolvedRevisionComparison,
            undefined,
          ),
          output: undefined,
        },
      },
      expected: { status: 502, code: "invalid-model-output" },
      privateDetail: "undefined",
    },
  ];

  for (const item of cases) {
    await t.test(item.name, async () => {
      const calls = [];
      const diagnostics = [];
      const traceId = `trace-call-2-${item.name}`;
      const handler = createReviewRevisedAnswerHttpHandler({
        createModelBoundary: () =>
          createOpenAICall2ModelBoundary(
            createTransport(item.behavior, calls),
            { now: createClock(2_000, 2_150) },
          ),
        createTraceId: () => traceId,
        logSafeDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
      });
      const response = await handler(postJson(CALL_2_ENDPOINT, request));

      assert.equal(calls.length, 1);

      if (item.expected.status === 200) {
        assert.equal(response.status, 200);
        const body = await readJson(response);
        assert.equal(body.ok, true);
        assert.deepEqual(body.result, validResolvedRevisionComparison);
        assert.deepEqual(body.meta, {
          traceId,
          modelLatencyMs: 150,
          usage: {
            inputTokens: 480,
            outputTokens: 160,
          },
        });
      } else {
        await assertSafeError(
          response,
          item.expected,
          traceId,
          item.privateDetail,
        );
      }

      if (item.expected.status === 500) {
        assert.deepEqual(diagnostics, [
          { traceId, category: "unexpected-handler-error" },
        ]);
      } else {
        assert.deepEqual(diagnostics, []);
      }
    });
  }
});
