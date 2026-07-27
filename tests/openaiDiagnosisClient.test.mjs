import assert from "node:assert/strict";
import test from "node:test";
import { APIConnectionTimeoutError } from "openai";

import { parseInitialDiagnosisResult } from "../src/domain/v3/evaluationResults.ts";
import {
  buildCall1ModelInput,
  getCanonicalDiagnosisContext,
} from "../src/server/v3/diagnosisPipeline.ts";
import {
  OPENAI_CALL_1_MAX_OUTPUT_TOKENS,
  OPENAI_CALL_1_MODEL,
  OPENAI_CALL_1_TIMEOUT_MS,
  OpenAICall1ConfigurationError,
  OpenAICall1ResponseError,
  createOpenAICall1ModelBoundary,
  createOpenAICall1ModelBoundaryFromEnvironment,
  loadOpenAIApiKey,
} from "../src/server/v3/openaiDiagnosisClient.ts";
import {
  ModelBoundaryError,
} from "../src/server/v3/modelBoundaryError.ts";
import {
  reactStateOwnershipCriterionIds,
} from "../src/server/v3/evaluation.ts";
import {
  flawedStateOwnershipAnswer,
  sufficientStateOwnershipAnswer,
  validNeedsFollowUpDiagnosis,
  validSufficientDiagnosis,
} from "./fixtures/referenceEvaluationCases.mjs";

function createModelInput(answer = flawedStateOwnershipAnswer) {
  return buildCall1ModelInput(
    getCanonicalDiagnosisContext("react-state-ownership-01"),
    answer,
  );
}

function createResponse(result, overrides = {}) {
  const outputText = JSON.stringify({ result });

  return {
    status: "completed",
    output_text: outputText,
    output: [
      {
        type: "message",
        status: "completed",
        role: "assistant",
        content: [
          {
            type: "output_text",
            text: outputText,
            annotations: [],
          },
        ],
      },
    ],
    usage: {
      input_tokens: 300,
      output_tokens: 140,
    },
    ...overrides,
  };
}

function createTransport(response, calls = []) {
  return {
    async createResponse(request) {
      calls.push(request);
      return response;
    },
  };
}

function createClock(startedAt = 1_000, completedAt = 1_120) {
  const readings = [startedAt, completedAt];
  return () => readings.shift();
}

test("uses the explicit smallest supported Call 1 model", () => {
  assert.equal(OPENAI_CALL_1_MODEL, "gpt-5.6-luna");
});

test("keeps the OpenAI timeout below the Netlify function limit", () => {
  assert.equal(OPENAI_CALL_1_TIMEOUT_MS, 45_000);
  assert.equal(OPENAI_CALL_1_TIMEOUT_MS < 60_000, true);
});

test("invokes the Responses API once with strict bounded configuration", async () => {
  const calls = [];
  const boundary = createOpenAICall1ModelBoundary(
    createTransport(createResponse(validNeedsFollowUpDiagnosis), calls),
    { now: createClock() },
  );

  await boundary(createModelInput());

  assert.equal(calls.length, 1);
  const [request] = calls;
  assert.equal(request.model, OPENAI_CALL_1_MODEL);
  assert.equal(request.stream, false);
  assert.equal(request.store, false);
  assert.equal(request.max_output_tokens, OPENAI_CALL_1_MAX_OUTPUT_TOKENS);
  assert.equal("tools" in request, false);
  assert.deepEqual(request.reasoning, { effort: "low" });
  assert.equal(request.text.format.type, "json_schema");
  assert.equal(request.text.format.name, "initial_diagnosis");
  assert.equal(request.text.format.strict, true);
});

test("configures the exact nested diagnosis union schema", async () => {
  const calls = [];
  const boundary = createOpenAICall1ModelBoundary(
    createTransport(createResponse(validNeedsFollowUpDiagnosis), calls),
    { now: createClock() },
  );

  await boundary(createModelInput());

  const schema = calls[0].text.format.schema;
  assert.equal(schema.type, "object");
  assert.deepEqual(schema.required, ["result"]);
  assert.equal(schema.additionalProperties, false);
  const variants = schema.properties.result.anyOf;
  assert.equal(variants.length, 2);
  assert.deepEqual(variants[0].required, [
    "outcome",
    "assessments",
    "primaryGap",
    "followUpQuestion",
  ]);
  assert.deepEqual(variants[1].required, ["outcome", "assessments"]);
  assert.equal(variants[0].additionalProperties, false);
  assert.equal(variants[1].additionalProperties, false);
  assert.equal(
    variants[0].properties.primaryGap.additionalProperties,
    false,
  );
  assert.equal(
    variants[0].properties.assessments.items.additionalProperties,
    false,
  );
  assert.deepEqual(
    variants[0].properties.assessments.items.properties.criterionId.enum,
    Object.values(reactStateOwnershipCriterionIds),
  );
  assert.deepEqual(
    variants[0].properties.assessments.items.properties.status.enum,
    ["met", "partially-met", "missing", "not-applicable"],
  );
});

test("separates canonical instructions, canonical data, and learner data", async () => {
  const calls = [];
  const input = createModelInput("The child should own selectedQuestionId.");
  const boundary = createOpenAICall1ModelBoundary(
    createTransport(createResponse(validNeedsFollowUpDiagnosis), calls),
    { now: createClock() },
  );

  await boundary(input);

  const [request] = calls;
  assert.match(request.instructions, /Evaluate the learner submission/);
  assert.match(request.instructions, /delimited data sections/);
  assert.equal(request.input.length, 2);
  assert.equal(request.input[0].role, "developer");
  assert.match(request.input[0].content, /<canonical_question_and_evaluation>/);
  assert.match(request.input[0].content, /evaluationPolicy/);
  assert.doesNotMatch(request.input[0].content, /The child should own/);
  assert.equal(request.input[1].role, "user");
  assert.match(request.input[1].content, /<learner_submission>/);
  assert.match(request.input[1].content, /The child should own/);
  assert.doesNotMatch(request.input[1].content, /evaluationGuidance/);
});

test("extracts a valid needs-follow-up result accepted by the domain parser", async () => {
  const boundary = createOpenAICall1ModelBoundary(
    createTransport(createResponse(validNeedsFollowUpDiagnosis)),
    { now: createClock() },
  );

  const invocation = await boundary(createModelInput());

  assert.deepEqual(invocation.output, validNeedsFollowUpDiagnosis);
  assert.strictEqual(
    parseInitialDiagnosisResult(invocation.output),
    invocation.output,
  );
});

test("extracts a valid sufficient result accepted by the domain parser", async () => {
  const boundary = createOpenAICall1ModelBoundary(
    createTransport(createResponse(validSufficientDiagnosis)),
    { now: createClock() },
  );

  const invocation = await boundary(
    createModelInput(sufficientStateOwnershipAnswer),
  );

  assert.deepEqual(invocation.output, validSufficientDiagnosis);
  assert.strictEqual(
    parseInitialDiagnosisResult(invocation.output),
    invocation.output,
  );
});

test("returns non-negative integer latency and complete token usage", async () => {
  const boundary = createOpenAICall1ModelBoundary(
    createTransport(createResponse(validSufficientDiagnosis)),
    { now: createClock(2_000.2, 2_120.8) },
  );

  const invocation = await boundary(createModelInput());

  assert.equal(invocation.meta.modelLatencyMs, 121);
  assert.equal(Number.isInteger(invocation.meta.modelLatencyMs), true);
  assert.equal(invocation.meta.modelLatencyMs >= 0, true);
  assert.deepEqual(invocation.meta.usage, {
    inputTokens: 300,
    outputTokens: 140,
  });
});

test("maps missing, partial, or invalid usage to null", async () => {
  const usageCases = [
    undefined,
    { input_tokens: 300 },
    { output_tokens: 140 },
    { input_tokens: -1, output_tokens: 140 },
    { input_tokens: 300.5, output_tokens: 140 },
    { input_tokens: 300, output_tokens: -1 },
    { input_tokens: 300, output_tokens: 140.5 },
  ];

  for (const usage of usageCases) {
    const boundary = createOpenAICall1ModelBoundary(
      createTransport(createResponse(validSufficientDiagnosis, { usage })),
      { now: createClock() },
    );

    const invocation = await boundary(createModelInput());
    assert.equal(invocation.meta.usage, null);
  }
});

test("rejects a model refusal", async () => {
  const response = createResponse(validSufficientDiagnosis, {
    output_text: "",
    output: [
      {
        type: "message",
        status: "completed",
        role: "assistant",
        content: [{ type: "refusal", refusal: "Cannot comply." }],
      },
    ],
  });
  const boundary = createOpenAICall1ModelBoundary(
    createTransport(response),
    { now: createClock() },
  );

  await assert.rejects(
    boundary(createModelInput()),
    OpenAICall1ResponseError,
  );
});

test("rejects an incomplete response", async () => {
  const boundary = createOpenAICall1ModelBoundary(
    createTransport(
      createResponse(validSufficientDiagnosis, { status: "incomplete" }),
    ),
    { now: createClock() },
  );

  await assert.rejects(
    boundary(createModelInput()),
    OpenAICall1ResponseError,
  );
});

test("rejects missing structured output", async () => {
  for (const outputText of [undefined, "", "   "]) {
    const boundary = createOpenAICall1ModelBoundary(
      createTransport(
        createResponse(validSufficientDiagnosis, { output_text: outputText }),
      ),
      { now: createClock() },
    );

    await assert.rejects(
      boundary(createModelInput()),
      OpenAICall1ResponseError,
    );
  }
});

test("rejects invalid JSON and malformed structured wrappers", async () => {
  for (const outputText of [
    "{not-json",
    JSON.stringify(validSufficientDiagnosis),
    JSON.stringify({ result: validSufficientDiagnosis, extra: true }),
  ]) {
    const boundary = createOpenAICall1ModelBoundary(
      createTransport(
        createResponse(validSufficientDiagnosis, { output_text: outputText }),
      ),
      { now: createClock() },
    );

    await assert.rejects(
      boundary(createModelInput()),
      OpenAICall1ResponseError,
    );
  }
});

test("rejects malformed provider response envelopes", async () => {
  for (const overrides of [
    { output: undefined },
    { output: [{ type: "message", content: undefined }] },
  ]) {
    const boundary = createOpenAICall1ModelBoundary(
      createTransport(createResponse(validSufficientDiagnosis, overrides)),
      { now: createClock() },
    );

    await assert.rejects(
      boundary(createModelInput()),
      OpenAICall1ResponseError,
    );
  }
});

test("classifies transport rejection without retrying or leaking details", async () => {
  const providerError = new APIConnectionTimeoutError({
    message: "private provider detail",
  });
  let invocationCount = 0;
  const boundary = createOpenAICall1ModelBoundary({
    async createResponse() {
      invocationCount += 1;
      throw providerError;
    },
  });

  await assert.rejects(boundary(createModelInput()), (error) => {
    assert.equal(error instanceof ModelBoundaryError, true);
    assert.equal(error.failureCode, "model-unavailable");
    assert.equal(error.message.includes(providerError.message), false);
    return true;
  });
  assert.equal(invocationCount, 1);
});

test("rejects missing or blank API keys before transport creation", () => {
  for (const environment of [{}, { OPENAI_API_KEY: "" }, { OPENAI_API_KEY: "   " }]) {
    let factoryCallCount = 0;

    assert.throws(
      () =>
        createOpenAICall1ModelBoundaryFromEnvironment(
          environment,
          () => {
            factoryCallCount += 1;
            return createTransport(createResponse(validSufficientDiagnosis));
          },
        ),
      OpenAICall1ConfigurationError,
    );
    assert.equal(factoryCallCount, 0);
  }
});

test("loads only OPENAI_API_KEY and preserves its accepted value", () => {
  assert.equal(
    loadOpenAIApiKey({ OPENAI_API_KEY: "  server-key  " }),
    "server-key",
  );
  assert.throws(
    () => loadOpenAIApiKey({ UNRELATED_KEY: "not-an-api-key" }),
    OpenAICall1ConfigurationError,
  );
});

test("returns only the provider-independent invocation and metadata keys", async () => {
  const boundary = createOpenAICall1ModelBoundary(
    createTransport(createResponse(validSufficientDiagnosis)),
    { now: createClock() },
  );

  const invocation = await boundary(createModelInput());

  assert.deepEqual(Object.keys(invocation), ["output", "meta"]);
  assert.deepEqual(Object.keys(invocation.meta), ["modelLatencyMs", "usage"]);
  assert.equal("id" in invocation, false);
  assert.equal("model" in invocation, false);
});
