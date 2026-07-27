import { useCallback, useEffect, useRef, useState } from "react";
import {
  createAiRuntimeStatusService,
  type AiRuntimeStatus,
} from "../lib/v3/aiRuntimeStatusService";

type PanelState =
  | { readonly phase: "checking"; readonly previous: AiRuntimeStatus | null }
  | { readonly phase: "ready"; readonly status: AiRuntimeStatus }
  | { readonly phase: "failed" };

const runtimeStatusService = createAiRuntimeStatusService();

const unavailableMessages = {
  "missing-configuration":
    "Check that both LM Studio settings are present and that the endpoint uses the documented loopback URL, then restart the development server.",
  "connection-failed":
    "LM Studio did not respond. Check that its local server is running.",
  "model-unavailable":
    "The configured model is not currently available in LM Studio.",
} as const;

export function AiRuntimeStatusPanel() {
  const [panelState, setPanelState] = useState<PanelState>({
    phase: "checking",
    previous: null,
  });
  const requestVersionRef = useRef(0);

  const testConnection = useCallback(async () => {
    const requestVersion = requestVersionRef.current + 1;

    requestVersionRef.current = requestVersion;
    setPanelState((current) => ({
      phase: "checking",
      previous:
        current.phase === "ready"
          ? current.status
          : current.phase === "checking"
            ? current.previous
            : null,
    }));

    try {
      const status = await runtimeStatusService();

      if (requestVersionRef.current === requestVersion) {
        setPanelState({ phase: "ready", status });
      }
    } catch {
      if (requestVersionRef.current === requestVersion) {
        setPanelState({ phase: "failed" });
      }
    }
  }, []);

  useEffect(() => {
    void testConnection();

    return () => {
      requestVersionRef.current += 1;
    };
  }, [testConnection]);

  const currentStatus =
    panelState.phase === "ready"
      ? panelState.status
      : panelState.phase === "checking"
        ? panelState.previous
        : null;
  const statusLabel =
    panelState.phase === "checking"
      ? "Checking…"
      : currentStatus?.status === "connected"
        ? "Connected"
        : "Unavailable";
  const statusMessage =
    panelState.phase === "checking"
      ? "Checking the configured LM Studio runtime."
      : panelState.phase === "failed"
        ? "The local status endpoint returned an invalid response."
        : panelState.status.status === "unavailable"
          ? unavailableMessages[panelState.status.reason]
          : "The configured model is available for local evaluation.";

  return (
    <aside
      className="ai-runtime-panel"
      aria-labelledby="ai-runtime-panel-title"
    >
      <div className="ai-runtime-panel__header">
        <div>
          <p className="ai-runtime-panel__eyebrow">Development only</p>
          <h2 id="ai-runtime-panel-title">Local AI Runtime</h2>
        </div>
        <span
          className={`ai-runtime-panel__status ai-runtime-panel__status--${
            currentStatus?.status === "connected"
              ? "connected"
              : "unavailable"
          }`}
        >
          {statusLabel}
        </span>
      </div>

      <dl className="ai-runtime-panel__metadata">
        <div>
          <dt>Provider</dt>
          <dd>LM Studio</dd>
        </div>
        <div>
          <dt>Endpoint</dt>
          <dd>{currentStatus?.endpoint ?? "Not configured"}</dd>
        </div>
        <div>
          <dt>Model</dt>
          <dd>{currentStatus?.model ?? "Not configured"}</dd>
        </div>
      </dl>

      <div className="ai-runtime-panel__actions">
        <p role="status" aria-live="polite">
          {statusMessage}
        </p>
        <button
          type="button"
          onClick={() => void testConnection()}
          disabled={panelState.phase === "checking"}
        >
          {panelState.phase === "checking"
            ? "Testing connection…"
            : "Test connection"}
        </button>
      </div>

      <p className="ai-runtime-panel__note">
        Runtime settings are read from server environment variables. Restart
        the development server after changing .env.
      </p>
    </aside>
  );
}
