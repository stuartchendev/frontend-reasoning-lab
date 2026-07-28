import type { AiRuntimeStatus } from "../lib/v3/aiRuntimeStatusService";

export type AiRuntimePanelState =
  | { readonly phase: "checking"; readonly previous: AiRuntimeStatus | null }
  | { readonly phase: "ready"; readonly status: AiRuntimeStatus }
  | { readonly phase: "failed" };

export type AiRuntimePanelView = {
  readonly currentStatus: AiRuntimeStatus | null;
  readonly providerLabel: string;
  readonly endpointLabel: string | null;
  readonly modelLabel: string;
  readonly statusLabel: string;
  readonly statusTone: "connected" | "unavailable";
  readonly statusMessage: string;
  readonly actionLabel: string;
};

const lmStudioUnavailableMessages = {
  "incomplete-configuration":
    "Set both LM Studio settings, or remove both to select OpenAI, then restart the development server.",
  "invalid-configuration":
    "Check that both LM Studio settings are valid and that the endpoint uses the documented loopback URL, then restart the development server.",
  "connection-failed":
    "LM Studio did not respond. Check that its local server is running.",
  "model-unavailable":
    "The configured model is not currently available in LM Studio.",
} as const;

function getCurrentStatus(state: AiRuntimePanelState): AiRuntimeStatus | null {
  return state.phase === "ready"
    ? state.status
    : state.phase === "checking"
      ? state.previous
      : null;
}

export function createAiRuntimePanelView(
  state: AiRuntimePanelState,
): AiRuntimePanelView {
  const currentStatus = getCurrentStatus(state);
  const isAvailable =
    currentStatus?.status === "connected" ||
    currentStatus?.status === "configured";
  const providerLabel =
    currentStatus?.provider === "lm-studio"
      ? "LM Studio"
      : currentStatus?.provider === "openai"
        ? "OpenAI"
        : "Not configured";
  const endpointLabel =
    currentStatus?.provider === "lm-studio"
      ? currentStatus.endpoint ?? "Not configured"
      : null;
  const modelLabel = currentStatus?.model ?? "Not configured";
  const statusLabel =
    state.phase === "checking"
      ? "Checking…"
      : currentStatus?.status === "connected"
        ? "Connected"
        : currentStatus?.status === "configured"
          ? "Configured"
          : "Unavailable";
  const statusMessage =
    state.phase === "checking"
      ? "Checking the configured AI runtime."
      : state.phase === "failed"
        ? "The development status endpoint returned an invalid response."
        : state.status.provider === "openai"
          ? state.status.status === "configured"
            ? "OpenAI is configured. This status check did not call the OpenAI API."
            : "Set the server-only OPENAI_API_KEY, then restart the development server."
          : state.status.status === "unavailable"
            ? lmStudioUnavailableMessages[state.status.reason]
            : "The configured model is available for local evaluation.";
  const actionLabel =
    state.phase === "checking"
      ? "Refreshing status…"
      : currentStatus?.provider === "openai"
        ? "Refresh status"
        : "Test connection";

  return {
    currentStatus,
    providerLabel,
    endpointLabel,
    modelLabel,
    statusLabel,
    statusTone: isAvailable ? "connected" : "unavailable",
    statusMessage,
    actionLabel,
  };
}
