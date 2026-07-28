import assert from "node:assert/strict";
import test from "node:test";

import {
  AI_RUNTIME_STATUS_ENDPOINT,
  AiRuntimeStatusServiceError,
  createAiRuntimeStatusService,
  parseAiRuntimeStatus,
} from "../src/lib/v3/aiRuntimeStatusService.ts";

const CONNECTED = {
  provider: "lm-studio",
  endpoint: "http://127.0.0.1:1234/v1",
  model: "local-reasoning-model",
  status: "connected",
};
const UNAVAILABLE = {
  ...CONNECTED,
  status: "unavailable",
  reason: "model-unavailable",
};
const OPENAI_CONFIGURED = {
  provider: "openai",
  model: "gpt-5.6-luna",
  status: "configured",
};
const OPENAI_UNAVAILABLE = {
  ...OPENAI_CONFIGURED,
  status: "unavailable",
  reason: "missing-configuration",
};

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

test("accepts the exact connected and unavailable status shapes", () => {
  assert.strictEqual(parseAiRuntimeStatus(CONNECTED), CONNECTED);
  assert.strictEqual(parseAiRuntimeStatus(UNAVAILABLE), UNAVAILABLE);
  assert.strictEqual(parseAiRuntimeStatus(OPENAI_CONFIGURED), OPENAI_CONFIGURED);
  assert.strictEqual(parseAiRuntimeStatus(OPENAI_UNAVAILABLE), OPENAI_UNAVAILABLE);
});

test("rejects malformed, unknown, and over-broad status responses", () => {
  const invalidResponses = [
    null,
    {},
    { ...CONNECTED, provider: "arbitrary-provider" },
    { ...CONNECTED, endpoint: "" },
    { ...CONNECTED, apiKey: "must-not-enter-browser-state" },
    { ...UNAVAILABLE, reason: "raw-provider-error" },
    { ...UNAVAILABLE, stack: "private stack" },
    { ...OPENAI_CONFIGURED, endpoint: "https://api.openai.com" },
    { ...OPENAI_CONFIGURED, apiKey: "must-not-enter-browser-state" },
    { ...OPENAI_UNAVAILABLE, reason: "raw-provider-error" },
  ];

  for (const response of invalidResponses) {
    assert.throws(
      () => parseAiRuntimeStatus(response),
      AiRuntimeStatusServiceError,
    );
  }
});

test("gets the fixed same-origin endpoint once with no-store", async () => {
  const harness = createFetchHarness({ body: CONNECTED });
  const service = createAiRuntimeStatusService(
    harness.fetchImplementation,
  );

  assert.strictEqual(await service(), CONNECTED);
  assert.deepEqual(harness.calls, [
    {
      input: AI_RUNTIME_STATUS_ENDPOINT,
      init: {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      },
    },
  ]);
  assert.equal(harness.jsonReadCount, 1);
});

test("maps HTTP, JSON, network, and validation failures to one safe error", async () => {
  const cases = [
    { ok: false, body: { error: "operation-unavailable" } },
    { body: new SyntaxError("private JSON response") },
    { rejection: new Error("private network response") },
    { body: { ...CONNECTED, stack: "private stack" } },
  ];

  for (const options of cases) {
    const harness = createFetchHarness(options);
    let captured;

    await assert.rejects(
      createAiRuntimeStatusService(harness.fetchImplementation)(),
      (error) => {
        assert.ok(error instanceof AiRuntimeStatusServiceError);
        captured = error;
        return true;
      },
    );

    assert.equal(captured.message.includes("private"), false);
    assert.equal(Object.hasOwn(captured, "cause"), false);
    assert.equal(harness.calls.length, 1);
  }
});
