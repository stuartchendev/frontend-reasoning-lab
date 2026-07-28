import assert from "node:assert/strict";
import test from "node:test";

import {
  AiProviderConfigurationError,
  resolveAiProvider,
} from "../src/server/v3/aiProvider.ts";

const LM_STUDIO_CONFIGURATION = {
  LM_STUDIO_BASE_URL: "http://127.0.0.1:1234/v1",
  LM_STUDIO_MODEL: "local-reasoning-model",
};

test("selects OpenAI only when LM Studio settings are absent", () => {
  const resolution = resolveAiProvider({
    OPENAI_API_KEY: "  private-server-key  ",
  });

  assert.deepEqual(resolution, { provider: "openai" });
  assert.equal(JSON.stringify(resolution).includes("private-server-key"), false);
});

test("gives complete LM Studio settings explicit precedence over OpenAI", () => {
  const resolution = resolveAiProvider({
    LM_STUDIO_BASE_URL: `  ${LM_STUDIO_CONFIGURATION.LM_STUDIO_BASE_URL}  `,
    LM_STUDIO_MODEL: `  ${LM_STUDIO_CONFIGURATION.LM_STUDIO_MODEL}  `,
    LM_STUDIO_TIMEOUT_MS: " 90000 ",
    OPENAI_API_KEY: "private-server-key",
  });

  assert.deepEqual(resolution, {
    provider: "lm-studio",
    configuration: {
      baseURL: LM_STUDIO_CONFIGURATION.LM_STUDIO_BASE_URL,
      model: LM_STUDIO_CONFIGURATION.LM_STUDIO_MODEL,
      requestTimeoutMs: 90_000,
    },
  });
});

test("rejects partial or blank LM Studio settings instead of falling through to OpenAI", () => {
  const invalidEnvironments = [
    { LM_STUDIO_BASE_URL: LM_STUDIO_CONFIGURATION.LM_STUDIO_BASE_URL },
    { LM_STUDIO_MODEL: LM_STUDIO_CONFIGURATION.LM_STUDIO_MODEL },
    { ...LM_STUDIO_CONFIGURATION, LM_STUDIO_BASE_URL: "" },
    { ...LM_STUDIO_CONFIGURATION, LM_STUDIO_MODEL: "   " },
    { LM_STUDIO_BASE_URL: "", LM_STUDIO_MODEL: "   " },
  ];

  for (const environment of invalidEnvironments) {
    assert.throws(
      () =>
        resolveAiProvider({
          ...environment,
          OPENAI_API_KEY: "private-server-key",
        }),
      (error) =>
        error instanceof AiProviderConfigurationError &&
        error.provider === "lm-studio" &&
        error.reason === "incomplete-lm-studio-configuration",
    );
  }
});

test("rejects invalid complete LM Studio configuration", () => {
  assert.throws(
    () =>
      resolveAiProvider({
        LM_STUDIO_BASE_URL: "https://provider.example/v1?secret=value",
        LM_STUDIO_MODEL: LM_STUDIO_CONFIGURATION.LM_STUDIO_MODEL,
        OPENAI_API_KEY: "private-server-key",
      }),
    (error) =>
      error instanceof AiProviderConfigurationError &&
      error.provider === "lm-studio" &&
      error.reason === "invalid-lm-studio-configuration",
  );
});

test("requires a non-blank OpenAI key when LM Studio settings are absent", () => {
  for (const environment of [{}, { OPENAI_API_KEY: "" }, { OPENAI_API_KEY: "   " }]) {
    assert.throws(
      () => resolveAiProvider(environment),
      (error) =>
        error instanceof AiProviderConfigurationError &&
        error.provider === "openai" &&
        error.reason === "missing-openai-configuration",
    );
  }
});
