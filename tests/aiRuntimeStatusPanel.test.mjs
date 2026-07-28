import assert from "node:assert/strict";
import test from "node:test";

import {
  createAiRuntimePanelView,
} from "../src/components/aiRuntimeStatusPanelView.ts";

test("presents OpenAI configuration without claiming a connectivity check", () => {
  const view = createAiRuntimePanelView({
    phase: "ready",
    status: {
      provider: "openai",
      model: "gpt-5.6-luna",
      status: "configured",
    },
  });

  assert.equal(view.providerLabel, "OpenAI");
  assert.equal(view.endpointLabel, null);
  assert.equal(view.modelLabel, "gpt-5.6-luna");
  assert.equal(view.statusLabel, "Configured");
  assert.equal(view.statusTone, "connected");
  assert.match(view.statusMessage, /did not call the OpenAI API/);
  assert.equal(view.actionLabel, "Refresh status");
});

test("presents safe OpenAI and partial LM Studio configuration messages", () => {
  const openAiView = createAiRuntimePanelView({
    phase: "ready",
    status: {
      provider: "openai",
      model: "gpt-5.6-luna",
      status: "unavailable",
      reason: "missing-configuration",
    },
  });
  const lmStudioView = createAiRuntimePanelView({
    phase: "ready",
    status: {
      provider: "lm-studio",
      endpoint: null,
      model: null,
      status: "unavailable",
      reason: "incomplete-configuration",
    },
  });

  assert.match(openAiView.statusMessage, /OPENAI_API_KEY/);
  assert.equal(openAiView.statusMessage.includes("private"), false);
  assert.match(lmStudioView.statusMessage, /both LM Studio settings/);
  assert.match(lmStudioView.statusMessage, /remove both to select OpenAI/);
});

test("preserves LM Studio connectivity presentation", () => {
  const view = createAiRuntimePanelView({
    phase: "ready",
    status: {
      provider: "lm-studio",
      endpoint: "http://127.0.0.1:1234/v1",
      model: "local-reasoning-model",
      status: "connected",
    },
  });

  assert.equal(view.providerLabel, "LM Studio");
  assert.equal(view.endpointLabel, "http://127.0.0.1:1234/v1");
  assert.equal(view.statusLabel, "Connected");
  assert.equal(view.actionLabel, "Test connection");
});
