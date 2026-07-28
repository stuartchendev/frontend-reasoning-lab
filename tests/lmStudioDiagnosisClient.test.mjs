import assert from "node:assert/strict";
import test from "node:test";

import {
  OPENAI_CALL_1_MAX_OUTPUT_TOKENS,
  OPENAI_CALL_1_MODEL,
  OpenAICall1ResponseError,
  createOpenAICall1ModelBoundary,
} from "../src/server/v3/openaiDiagnosisClient.ts";
import {
  LM_STUDIO_REQUEST_TIMEOUT_MS,
  LmStudioCall1ConfigurationError,
  LmStudioCall1RequestError,
  LmStudioCall1ResponseError,
  createLmStudioCall1ModelBoundaryFromEnvironment,
  createLmStudioCall1Transport,
  createLmStudioCall2ModelBoundaryFromEnvironment,
  createLmStudioCall2Transport,
  loadLmStudioCall1Configuration,
  loadLmStudioRequestTimeoutMs,
} from "../src/server/v3/lmStudioDiagnosisClient.ts";
import {
  createOpenAICall2ModelBoundary,
} from "../src/server/v3/openaiRevisionReviewClient.ts";
import {
  prepareInitialDiagnosisPipeline,
  runInitialDiagnosisPipeline,
} from "../src/server/v3/diagnosisPipeline.ts";
import {
  prepareRevisionReviewPipeline,
  runRevisionReviewPipeline,
} from "../src/server/v3/revisionReviewPipeline.ts";
import {
  flawedStateOwnershipAnswer,
  sufficientStateOwnershipAnswer,
  validNeedsFollowUpDiagnosis,
  validResolvedRevisionComparison,
  validSufficientDiagnosis,
} from "./fixtures/referenceEvaluationCases.mjs";

const LOCAL_CONFIGURATION = {
  baseURL: "http://127.0.0.1:1234/v1",
  model: "local-reasoning-model",
  requestTimeoutMs: LM_STUDIO_REQUEST_TIMEOUT_MS,
};

function createPipelineRequest(answer = flawedStateOwnershipAnswer) {
  return {
    contractVersion: "1",
    questionId: "react-state-ownership-01",
    questionVersion: 1,
    answer,
  };
}

function createCompletion(options = {}) {
  const result = options.result ?? validNeedsFollowUpDiagnosis;
  const content = options.content ?? JSON.stringify({ result });
  const finishReason = options.finishReason ?? "stop";
  const usage = Object.hasOwn(options, "usage")
    ? options.usage
    : {
        prompt_tokens: 300,
        completion_tokens: 140,
      };
  const completion = {
    choices: [
      {
        finish_reason: finishReason,
        message: { content },
      },
    ],
  };

  if (usage !== undefined) completion.usage = usage;

  return completion;
}

function createFakeClient(completion = createCompletion()) {
  const requests = [];

  return {
    requests,
    client: {
      async createCompletion(request) {
        requests.push(request);
        return completion;
      },
    },
  };
}

async function captureAcceptedSourceRequest(
  answer = flawedStateOwnershipAnswer,
) {
  const prepared = prepareInitialDiagnosisPipeline(
    createPipelineRequest(answer),
  );
  let sourceRequest;
  const captureBoundary = createOpenAICall1ModelBoundary({
    async createResponse(request) {
      sourceRequest = request;
      return {
        status: "completed",
        output_text: JSON.stringify({ result: validNeedsFollowUpDiagnosis }),
        output: [],
      };
    },
  });

  await captureBoundary(prepared.modelInput);
  assert.ok(sourceRequest);
  return sourceRequest;
}

function createRevisionPipelineRequest() {
  return {
    contractVersion: "1",
    questionId: "react-state-ownership-01",
    questionVersion: 1,
    originalAnswer: flawedStateOwnershipAnswer,
    revisedAnswer:
      "App owns the canonical selectedQuestionId. It passes the ID down, and QuestionNavigator requests changes through a callback.",
    diagnosis: validNeedsFollowUpDiagnosis,
  };
}

async function captureAcceptedCall2SourceRequest() {
  const prepared = prepareRevisionReviewPipeline(
    createRevisionPipelineRequest(),
  );
  let sourceRequest;
  const captureBoundary = createOpenAICall2ModelBoundary({
    async createResponse(request) {
      sourceRequest = request;
      return {
        status: "completed",
        output_text: JSON.stringify({
          result: validResolvedRevisionComparison,
        }),
        output: [],
      };
    },
  });

  await captureBoundary(prepared.modelInput);
  assert.ok(sourceRequest);
  return sourceRequest;
}

test("rejects missing and blank LM Studio configuration", () => {
  const invalidEnvironments = [
    {},
    { LM_STUDIO_BASE_URL: "", LM_STUDIO_MODEL: "model" },
    { LM_STUDIO_BASE_URL: "   ", LM_STUDIO_MODEL: "model" },
    { LM_STUDIO_BASE_URL: LOCAL_CONFIGURATION.baseURL },
    { LM_STUDIO_BASE_URL: LOCAL_CONFIGURATION.baseURL, LM_STUDIO_MODEL: "" },
    {
      LM_STUDIO_BASE_URL: LOCAL_CONFIGURATION.baseURL,
      LM_STUDIO_MODEL: "   ",
    },
  ];

  for (const environment of invalidEnvironments) {
    assert.throws(
      () => loadLmStudioCall1Configuration(environment),
      LmStudioCall1ConfigurationError,
    );
  }
});

test("trims configuration and accepts only explicit loopback HTTP URLs", () => {
  assert.deepEqual(
    loadLmStudioCall1Configuration({
      LM_STUDIO_BASE_URL: `  ${LOCAL_CONFIGURATION.baseURL}  `,
      LM_STUDIO_MODEL: `  ${LOCAL_CONFIGURATION.model}  `,
    }),
    LOCAL_CONFIGURATION,
  );

  for (const baseURL of [
    "http://localhost:1234/v1",
    "http://[::1]:1234/v1",
  ]) {
    assert.deepEqual(
      loadLmStudioCall1Configuration({
        LM_STUDIO_BASE_URL: baseURL,
        LM_STUDIO_MODEL: LOCAL_CONFIGURATION.model,
      }),
      {
        baseURL,
        model: LOCAL_CONFIGURATION.model,
        requestTimeoutMs: LM_STUDIO_REQUEST_TIMEOUT_MS,
      },
    );
  }
});

test("loads a positive integer LM Studio timeout and keeps the existing default", () => {
  for (const environment of [
    {},
    { LM_STUDIO_TIMEOUT_MS: "" },
    { LM_STUDIO_TIMEOUT_MS: "   " },
  ]) {
    assert.equal(
      loadLmStudioRequestTimeoutMs(environment),
      LM_STUDIO_REQUEST_TIMEOUT_MS,
    );
  }

  assert.equal(
    loadLmStudioRequestTimeoutMs({ LM_STUDIO_TIMEOUT_MS: " 90000 " }),
    90_000,
  );
});

test("falls back to the default for invalid LM Studio timeout values", () => {
  for (const value of [
    "0",
    "-1",
    "1.5",
    "9e4",
    "NaN",
    "Infinity",
    "90000ms",
    String(Number.MAX_SAFE_INTEGER + 1),
  ]) {
    assert.equal(
      loadLmStudioRequestTimeoutMs({ LM_STUDIO_TIMEOUT_MS: value }),
      LM_STUDIO_REQUEST_TIMEOUT_MS,
    );
  }
});

test("passes the configured LM Studio timeout to both client factories", () => {
  const environment = {
    LM_STUDIO_BASE_URL: LOCAL_CONFIGURATION.baseURL,
    LM_STUDIO_MODEL: LOCAL_CONFIGURATION.model,
    LM_STUDIO_TIMEOUT_MS: "90000",
  };
  const observedConfigurations = [];
  const createClient = (configuration) => {
    observedConfigurations.push(configuration);
    return { createCompletion: async () => createCompletion() };
  };

  createLmStudioCall1ModelBoundaryFromEnvironment(environment, createClient);
  createLmStudioCall2ModelBoundaryFromEnvironment(environment, createClient);

  assert.equal(observedConfigurations.length, 2);

  for (const configuration of observedConfigurations) {
    assert.deepEqual(configuration, {
      baseURL: LOCAL_CONFIGURATION.baseURL,
      model: LOCAL_CONFIGURATION.model,
      requestTimeoutMs: 90_000,
    });
  }
});

test("rejects non-loopback, credentialed, queried, and hashed base URLs", () => {
  const rejectedBaseURLs = [
    "https://127.0.0.1:1234/v1",
    "ftp://127.0.0.1:1234/v1",
    "http://192.168.1.20:1234/v1",
    "http://8.8.8.8:1234/v1",
    "http://example.com/v1",
    "http://user@127.0.0.1:1234/v1",
    "http://user:password@127.0.0.1:1234/v1",
    "http://127.0.0.1:1234/v1?mode=local",
    "http://127.0.0.1:1234/v1#local",
  ];

  for (const baseURL of rejectedBaseURLs) {
    assert.throws(
      () =>
        loadLmStudioCall1Configuration({
          LM_STUDIO_BASE_URL: baseURL,
          LM_STUDIO_MODEL: LOCAL_CONFIGURATION.model,
        }),
      LmStudioCall1ConfigurationError,
    );
  }
});

test("constructs the client only after configuration validation", () => {
  let factoryCount = 0;

  assert.throws(
    () =>
      createLmStudioCall1ModelBoundaryFromEnvironment(
        {},
        () => {
          factoryCount += 1;
          return { createCompletion: async () => createCompletion() };
        },
      ),
    LmStudioCall1ConfigurationError,
  );
  assert.equal(factoryCount, 0);
});

test("translates one accepted Call 1 request into one bounded chat completion", async () => {
  const sourceRequest = await captureAcceptedSourceRequest();
  const fake = createFakeClient();
  const transport = createLmStudioCall1Transport(
    LOCAL_CONFIGURATION,
    fake.client,
  );

  await transport.createResponse(sourceRequest);

  assert.equal(fake.requests.length, 1);
  const chatRequest = fake.requests[0];
  assert.equal(sourceRequest.model, OPENAI_CALL_1_MODEL);
  assert.equal(chatRequest.model, LOCAL_CONFIGURATION.model);
  assert.equal(chatRequest.stream, false);
  assert.equal(chatRequest.n, 1);
  assert.equal(chatRequest.temperature, 0);
  assert.equal(chatRequest.max_tokens, OPENAI_CALL_1_MAX_OUTPUT_TOKENS);
  assert.equal(Object.hasOwn(chatRequest, "tools"), false);
  assert.deepEqual(
    chatRequest.messages.map(({ role }) => role),
    ["system", "system", "user"],
  );
  assert.equal(chatRequest.messages[0].content, sourceRequest.instructions);
  assert.equal(chatRequest.messages[1].content, sourceRequest.input[0].content);
  assert.equal(chatRequest.messages[2].content, sourceRequest.input[1].content);
  assert.equal(
    chatRequest.messages[0].content.includes(flawedStateOwnershipAnswer),
    false,
  );
  assert.equal(
    chatRequest.messages[1].content.includes(flawedStateOwnershipAnswer),
    false,
  );
  assert.equal(
    chatRequest.messages[2].content.includes(flawedStateOwnershipAnswer),
    true,
  );
  assert.equal(chatRequest.response_format.type, "json_schema");
  assert.equal(chatRequest.response_format.json_schema.name, "initial_diagnosis");
  assert.equal(chatRequest.response_format.json_schema.strict, true);
  assert.strictEqual(
    chatRequest.response_format.json_schema.schema,
    sourceRequest.text.format.schema,
  );
  assert.deepEqual(chatRequest.chat_template_kwargs, {
    enable_thinking: false,
  });
});

test("rejects unexpected source request shapes before client invocation", async () => {
  const sourceRequest = await captureAcceptedSourceRequest();
  const invalidRequests = [
    { ...sourceRequest, unexpected: true },
    { ...sourceRequest, input: sourceRequest.input.slice(0, 1) },
    {
      ...sourceRequest,
      input: [
        { ...sourceRequest.input[0], role: "user" },
        sourceRequest.input[1],
      ],
    },
    { ...sourceRequest, stream: true },
  ];

  for (const invalidRequest of invalidRequests) {
    const fake = createFakeClient();
    const transport = createLmStudioCall1Transport(
      LOCAL_CONFIGURATION,
      fake.client,
    );

    await assert.rejects(
      transport.createResponse(invalidRequest),
      LmStudioCall1RequestError,
    );
    assert.equal(fake.requests.length, 0);
  }
});

test("passes needs-follow-up through the existing boundary and pipeline", async () => {
  const fake = createFakeClient(createCompletion());
  const transport = createLmStudioCall1Transport(
    LOCAL_CONFIGURATION,
    fake.client,
  );
  const times = [1_000, 1_120];
  const boundary = createOpenAICall1ModelBoundary(transport, {
    now: () => times.shift(),
  });
  const success = await runInitialDiagnosisPipeline(
    createPipelineRequest(),
    boundary,
  );

  assert.deepEqual(success.result, validNeedsFollowUpDiagnosis);
  assert.deepEqual(success.meta, {
    modelLatencyMs: 120,
    usage: { inputTokens: 300, outputTokens: 140 },
  });
  assert.equal(fake.requests.length, 1);
});

test("passes sufficient through the existing boundary and pipeline", async () => {
  const fake = createFakeClient(
    createCompletion({ result: validSufficientDiagnosis }),
  );
  const transport = createLmStudioCall1Transport(
    LOCAL_CONFIGURATION,
    fake.client,
  );
  const boundary = createOpenAICall1ModelBoundary(transport);
  const success = await runInitialDiagnosisPipeline(
    createPipelineRequest(sufficientStateOwnershipAnswer),
    boundary,
  );

  assert.deepEqual(success.result, validSufficientDiagnosis);
  assert.equal(fake.requests.length, 1);
});

test("maps missing or invalid chat usage to null", async () => {
  const invalidUsages = [
    undefined,
    null,
    {},
    { prompt_tokens: -1, completion_tokens: 10 },
    { prompt_tokens: 10.5, completion_tokens: 10 },
    { prompt_tokens: 10, completion_tokens: -1 },
    { prompt_tokens: 10, completion_tokens: 10.5 },
  ];

  for (const usage of invalidUsages) {
    const fake = createFakeClient(createCompletion({ usage }));
    const boundary = createOpenAICall1ModelBoundary(
      createLmStudioCall1Transport(LOCAL_CONFIGURATION, fake.client),
    );
    const success = await runInitialDiagnosisPipeline(
      createPipelineRequest(),
      boundary,
    );

    assert.equal(success.meta.usage, null);
  }
});

test("rejects missing choices and missing or blank completion content", async () => {
  const invalidCompletions = [
    { choices: [] },
    { choices: [{ finish_reason: "stop", message: {} }] },
    { choices: [{ finish_reason: "stop", message: { content: null } }] },
    { choices: [{ finish_reason: "stop", message: { content: "   " } }] },
  ];

  for (const completion of invalidCompletions) {
    const fake = createFakeClient(completion);
    const transport = createLmStudioCall1Transport(
      LOCAL_CONFIGURATION,
      fake.client,
    );
    const sourceRequest = await captureAcceptedSourceRequest();

    await assert.rejects(
      transport.createResponse(sourceRequest),
      LmStudioCall1ResponseError,
    );
    assert.equal(fake.requests.length, 1);
  }
});

test("maps every non-stop finish reason to an incomplete boundary response", async () => {
  const sourceRequest = await captureAcceptedSourceRequest();
  const prepared = prepareInitialDiagnosisPipeline(createPipelineRequest());

  for (const finishReason of [
    "length",
    "content_filter",
    "tool_calls",
    "unexpected-local-value",
  ]) {
    const fake = createFakeClient(createCompletion({ finishReason }));
    const transport = createLmStudioCall1Transport(
      LOCAL_CONFIGURATION,
      fake.client,
    );
    const mapped = await transport.createResponse(sourceRequest);

    assert.equal(mapped.status, "incomplete");
    await assert.rejects(
      createOpenAICall1ModelBoundary(transport)(prepared.modelInput),
      OpenAICall1ResponseError,
    );
  }
});

test("preserves client rejection and does not retry", async () => {
  const sourceRequest = await captureAcceptedSourceRequest();
  const clientError = new Error("private local client detail");
  let clientCallCount = 0;
  const transport = createLmStudioCall1Transport(LOCAL_CONFIGURATION, {
    async createCompletion() {
      clientCallCount += 1;
      throw clientError;
    },
  });

  await assert.rejects(
    transport.createResponse(sourceRequest),
    (error) => error === clientError,
  );
  assert.equal(clientCallCount, 1);
});

test("safe response errors do not expose completion or learner content", async () => {
  const rawCompletion = "raw-local-completion-secret";
  const fake = createFakeClient({
    choices: [
      {
        finish_reason: "stop",
        message: { content: { rawCompletion } },
      },
    ],
  });
  const transport = createLmStudioCall1Transport(
    LOCAL_CONFIGURATION,
    fake.client,
  );
  const sourceRequest = await captureAcceptedSourceRequest();

  await assert.rejects(transport.createResponse(sourceRequest), (error) => {
    assert.ok(error instanceof LmStudioCall1ResponseError);
    assert.equal(error.message.includes(rawCompletion), false);
    assert.equal(error.message.includes(flawedStateOwnershipAnswer), false);
    return true;
  });
});

test("translates Call 2 through the same bounded LM Studio adapter", async () => {
  const sourceRequest = await captureAcceptedCall2SourceRequest();
  const fake = createFakeClient(
    createCompletion({ result: validResolvedRevisionComparison }),
  );
  const transport = createLmStudioCall2Transport(
    LOCAL_CONFIGURATION,
    fake.client,
  );

  await transport.createResponse(sourceRequest);

  assert.equal(fake.requests.length, 1);
  const chatRequest = fake.requests[0];
  assert.equal(chatRequest.model, LOCAL_CONFIGURATION.model);
  assert.equal(chatRequest.response_format.type, "json_schema");
  assert.equal(chatRequest.response_format.json_schema.name, "revision_review");
  assert.equal(chatRequest.response_format.json_schema.strict, true);
  assert.equal(
    chatRequest.messages[2].content.includes(
      "App owns the canonical selectedQuestionId",
    ),
    true,
  );
  assert.deepEqual(chatRequest.chat_template_kwargs, {
    enable_thinking: false,
  });
});

test("passes a valid Call 2 result through the LM Studio boundary and pipeline", async () => {
  const fake = createFakeClient(
    createCompletion({ result: validResolvedRevisionComparison }),
  );
  const boundary = createLmStudioCall2ModelBoundaryFromEnvironment(
    {
      LM_STUDIO_BASE_URL: LOCAL_CONFIGURATION.baseURL,
      LM_STUDIO_MODEL: LOCAL_CONFIGURATION.model,
    },
    () => fake.client,
  );

  const success = await runRevisionReviewPipeline(
    createRevisionPipelineRequest(),
    boundary,
  );

  assert.deepEqual(success.result, validResolvedRevisionComparison);
  assert.deepEqual(success.meta.usage, {
    inputTokens: 300,
    outputTokens: 140,
  });
  assert.equal(fake.requests.length, 1);
});
