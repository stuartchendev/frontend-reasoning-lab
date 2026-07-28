import assert from "node:assert/strict";
import test from "node:test";

import {
  createAiRuntimeStatusHttpHandler,
} from "../src/server/v3/aiRuntimeStatusHttp.ts";

const ENDPOINT =
  "http://localhost/.netlify/functions/ai-runtime-status";
const CONFIGURATION = {
  NETLIFY_LOCAL: "true",
  LM_STUDIO_BASE_URL: "http://127.0.0.1:1234/v1",
  LM_STUDIO_MODEL: "local-reasoning-model",
};
const OPENAI_CONFIGURATION = {
  NETLIFY_LOCAL: "true",
  OPENAI_API_KEY: "private-server-key",
};

function createFetchHarness({ body, ok = true, rejection } = {}) {
  const calls = [];

  return {
    calls,
    fetchImplementation: async (input, init) => {
      calls.push({ input, init });

      if (rejection) throw rejection;

      return {
        ok,
        async json() {
          if (body instanceof Error) throw body;
          return body;
        },
      };
    },
  };
}

async function readJson(response) {
  assert.equal(response.headers.get("Content-Type"), "application/json");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  return response.json();
}

test("reports connected only when LM Studio lists the configured model", async () => {
  const harness = createFetchHarness({
    body: {
      data: [
        { id: "another-model", object: "model" },
        { id: CONFIGURATION.LM_STUDIO_MODEL, object: "model" },
      ],
    },
  });
  const handler = createAiRuntimeStatusHttpHandler({
    environment: CONFIGURATION,
    fetchImplementation: harness.fetchImplementation,
  });
  const response = await handler(new Request(ENDPOINT));

  assert.equal(response.status, 200);
  assert.deepEqual(await readJson(response), {
    provider: "lm-studio",
    endpoint: CONFIGURATION.LM_STUDIO_BASE_URL,
    model: CONFIGURATION.LM_STUDIO_MODEL,
    status: "connected",
  });
  assert.equal(harness.calls.length, 1);
  assert.equal(
    harness.calls[0].input,
    "http://127.0.0.1:1234/v1/models",
  );
  assert.equal(harness.calls[0].init.method, "GET");
  assert.deepEqual(harness.calls[0].init.headers, {
    Accept: "application/json",
  });
  assert.equal(harness.calls[0].init.cache, "no-store");
  assert.ok(harness.calls[0].init.signal instanceof AbortSignal);
});

test("reports OpenAI configured without making a provider request", async () => {
  const harness = createFetchHarness();
  const handler = createAiRuntimeStatusHttpHandler({
    environment: OPENAI_CONFIGURATION,
    fetchImplementation: harness.fetchImplementation,
  });
  const response = await handler(new Request(ENDPOINT));
  const serializedBody = JSON.stringify(await readJson(response));

  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(serializedBody), {
    provider: "openai",
    model: "gpt-5.6-luna",
    status: "configured",
  });
  assert.equal(serializedBody.includes("private-server-key"), false);
  assert.equal(harness.calls.length, 0);
});

test("returns safe provider-specific configuration failures without a request", async () => {
  const cases = [
    {
      environment: { NETLIFY_LOCAL: "true" },
      expected: {
        provider: "openai",
        model: "gpt-5.6-luna",
        status: "unavailable",
        reason: "missing-configuration",
      },
    },
    {
      environment: {
        ...OPENAI_CONFIGURATION,
        LM_STUDIO_BASE_URL: CONFIGURATION.LM_STUDIO_BASE_URL,
      },
      expected: {
        provider: "lm-studio",
        endpoint: null,
        model: null,
        status: "unavailable",
        reason: "incomplete-configuration",
      },
    },
    {
      environment: {
        ...OPENAI_CONFIGURATION,
        LM_STUDIO_BASE_URL: "",
        LM_STUDIO_MODEL: CONFIGURATION.LM_STUDIO_MODEL,
      },
      expected: {
        provider: "lm-studio",
        endpoint: null,
        model: null,
        status: "unavailable",
        reason: "incomplete-configuration",
      },
    },
    {
      environment: {
        ...CONFIGURATION,
        OPENAI_API_KEY: "private-server-key",
        LM_STUDIO_BASE_URL: "https://provider.example/v1?secret=value",
      },
      expected: {
        provider: "lm-studio",
        endpoint: null,
        model: null,
        status: "unavailable",
        reason: "invalid-configuration",
      },
    },
  ];

  for (const { environment, expected } of cases) {
    const harness = createFetchHarness();
    const handler = createAiRuntimeStatusHttpHandler({
      environment,
      fetchImplementation: harness.fetchImplementation,
    });
    const response = await handler(new Request(ENDPOINT));

    assert.equal(response.status, 200);
    const serializedBody = JSON.stringify(await readJson(response));

    assert.deepEqual(JSON.parse(serializedBody), expected);
    assert.equal(serializedBody.includes("private-server-key"), false);
    assert.equal(serializedBody.includes("secret=value"), false);
    assert.equal(harness.calls.length, 0);
  }
});

test("keeps LM Studio precedence when both providers are configured", async () => {
  const harness = createFetchHarness({
    body: { data: [{ id: CONFIGURATION.LM_STUDIO_MODEL }] },
  });
  const handler = createAiRuntimeStatusHttpHandler({
    environment: {
      ...CONFIGURATION,
      OPENAI_API_KEY: "private-server-key",
    },
    fetchImplementation: harness.fetchImplementation,
  });
  const response = await handler(new Request(ENDPOINT));

  assert.equal(response.status, 200);
  assert.equal((await readJson(response)).provider, "lm-studio");
  assert.equal(harness.calls.length, 1);
});

test("maps unreachable or invalid model-list responses to safe fixed reasons", async () => {
  const cases = [
    {
      options: { ok: false },
      reason: "connection-failed",
    },
    {
      options: {
        body: new SyntaxError("private provider response"),
      },
      reason: "connection-failed",
    },
    {
      options: {
        rejection: new Error("private provider stack and API key"),
      },
      reason: "connection-failed",
    },
    {
      options: {
        body: { unexpected: "shape" },
      },
      reason: "connection-failed",
    },
    {
      options: {
        body: { data: [{ id: "different-model" }] },
      },
      reason: "model-unavailable",
    },
  ];

  for (const { options, reason } of cases) {
    const harness = createFetchHarness(options);
    const handler = createAiRuntimeStatusHttpHandler({
      environment: CONFIGURATION,
      fetchImplementation: harness.fetchImplementation,
    });
    const response = await handler(new Request(ENDPOINT));
    const serializedBody = JSON.stringify(await readJson(response));

    assert.equal(response.status, 200);
    assert.equal(JSON.parse(serializedBody).reason, reason);
    assert.equal(serializedBody.includes("private"), false);
    assert.equal(serializedBody.includes("API key"), false);
    assert.equal(serializedBody.includes("stack"), false);
    assert.equal(harness.calls.length, 1);
  }
});

test("returns 404 outside local development before reading configuration", async () => {
  const harness = createFetchHarness({
    body: { data: [{ id: CONFIGURATION.LM_STUDIO_MODEL }] },
  });
  const unavailableEnvironments = [
    { ...CONFIGURATION, NETLIFY_LOCAL: undefined },
    { ...CONFIGURATION, NETLIFY_LOCAL: "false" },
    { ...CONFIGURATION, CONTEXT: "production" },
  ];

  for (const environment of unavailableEnvironments) {
    const handler = createAiRuntimeStatusHttpHandler({
      environment,
      fetchImplementation: harness.fetchImplementation,
    });
    const response = await handler(new Request(ENDPOINT));

    assert.equal(response.status, 404);
    assert.deepEqual(await readJson(response), {
      error: "operation-unavailable",
    });
  }

  assert.equal(harness.calls.length, 0);
});

test("allows only GET outside production", async () => {
  const harness = createFetchHarness();
  const handler = createAiRuntimeStatusHttpHandler({
    environment: CONFIGURATION,
    fetchImplementation: harness.fetchImplementation,
  });
  const response = await handler(
    new Request(ENDPOINT, { method: "POST" }),
  );

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("Allow"), "GET");
  assert.deepEqual(await readJson(response), {
    error: "method-not-allowed",
  });
  assert.equal(harness.calls.length, 0);
});
