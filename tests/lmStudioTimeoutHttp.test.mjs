import assert from "node:assert/strict";
import test from "node:test";
import { APIConnectionTimeoutError } from "openai";

import {
  parseDiagnoseInitialAnswerError,
} from "../src/domain/v3/diagnosisApi.ts";
import {
  parseReviewRevisedAnswerError,
} from "../src/domain/v3/revisionReviewApi.ts";
import {
  createDiagnoseInitialAnswerHttpHandler,
} from "../src/server/v3/diagnoseInitialAnswerHttp.ts";
import {
  LM_STUDIO_REQUEST_TIMEOUT_MS,
  createLmStudioCall1ModelBoundaryFromEnvironment,
  createLmStudioCall2ModelBoundaryFromEnvironment,
} from "../src/server/v3/lmStudioDiagnosisClient.ts";
import {
  createReviewRevisedAnswerHttpHandler,
} from "../src/server/v3/reviewRevisedAnswerHttp.ts";
import {
  flawedStateOwnershipAnswer,
  revisedStateOwnershipAnswer,
  validNeedsFollowUpDiagnosis,
} from "./fixtures/referenceEvaluationCases.mjs";

const LOCAL_CONFIGURATION = {
  LM_STUDIO_BASE_URL: "http://127.0.0.1:1234/v1",
  LM_STUDIO_MODEL: "local-reasoning-model",
};
const CALL_1_ENDPOINT =
  "http://localhost/.netlify/functions/diagnose-initial-answer";
const CALL_2_ENDPOINT =
  "http://localhost/.netlify/functions/review-revised-answer";

function postJson(endpoint, body) {
  return new Request(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createDelayedTimeoutClient(privateDetail) {
  let invocationCount = 0;

  return {
    client: {
      async createCompletion() {
        invocationCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 5));
        throw new APIConnectionTimeoutError({
          message: privateDetail,
        });
      },
    },
    getInvocationCount: () => invocationCount,
  };
}

async function assertSafeTimeoutResponse(
  response,
  parseError,
  traceId,
  privateDetail,
) {
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("Content-Type"), "application/json");
  assert.equal(response.headers.get("Cache-Control"), "no-store");

  const body = await response.json();
  assert.strictEqual(parseError(body), body);
  assert.equal(body.contractVersion, "1");
  assert.equal(body.ok, false);
  assert.equal(body.error.code, "model-unavailable");
  assert.equal(body.error.retryable, true);
  assert.equal(body.meta.traceId, traceId);
  assert.equal(JSON.stringify(body).includes(privateDetail), false);
}

test("keeps both LM Studio calls below the local Netlify timeout", () => {
  assert.equal(LM_STUDIO_REQUEST_TIMEOUT_MS, 25_000);
  assert.equal(LM_STUDIO_REQUEST_TIMEOUT_MS < 30_000, true);
});

test("Call 1 returns the safe 503 envelope when the LM Studio client times out", async () => {
  const traceId = "trace-lm-studio-call-1-timeout";
  const privateDetail = "private Call 1 timeout detail";
  const delayedClient = createDelayedTimeoutClient(privateDetail);
  const handler = createDiagnoseInitialAnswerHttpHandler({
    createModelBoundary: () =>
      createLmStudioCall1ModelBoundaryFromEnvironment(
        LOCAL_CONFIGURATION,
        () => delayedClient.client,
      ),
    createTraceId: () => traceId,
  });

  const response = await handler(
    postJson(CALL_1_ENDPOINT, {
      contractVersion: "1",
      questionId: "react-state-ownership-01",
      questionVersion: 1,
      answer: flawedStateOwnershipAnswer,
    }),
  );

  await assertSafeTimeoutResponse(
    response,
    parseDiagnoseInitialAnswerError,
    traceId,
    privateDetail,
  );
  assert.equal(delayedClient.getInvocationCount(), 1);
});

test("Call 2 returns the safe 503 envelope when the LM Studio client times out", async () => {
  const traceId = "trace-lm-studio-call-2-timeout";
  const privateDetail = "private Call 2 timeout detail";
  const delayedClient = createDelayedTimeoutClient(privateDetail);
  const handler = createReviewRevisedAnswerHttpHandler({
    createModelBoundary: () =>
      createLmStudioCall2ModelBoundaryFromEnvironment(
        LOCAL_CONFIGURATION,
        () => delayedClient.client,
      ),
    createTraceId: () => traceId,
  });

  const response = await handler(
    postJson(CALL_2_ENDPOINT, {
      contractVersion: "1",
      questionId: "react-state-ownership-01",
      questionVersion: 1,
      originalAnswer: flawedStateOwnershipAnswer,
      revisedAnswer: revisedStateOwnershipAnswer,
      diagnosis: validNeedsFollowUpDiagnosis,
    }),
  );

  await assertSafeTimeoutResponse(
    response,
    parseReviewRevisedAnswerError,
    traceId,
    privateDetail,
  );
  assert.equal(delayedClient.getInvocationCount(), 1);
});
