import { useCallback, useEffect, useRef, useState } from "react";
import {
  createAiRuntimeStatusService,
} from "../lib/v3/aiRuntimeStatusService";
import {
  createAiRuntimePanelView,
  type AiRuntimePanelState,
} from "./aiRuntimeStatusPanelView";

const runtimeStatusService = createAiRuntimeStatusService();

export function AiRuntimeStatusPanel() {
  const [panelState, setPanelState] = useState<AiRuntimePanelState>({
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

  const view = createAiRuntimePanelView(panelState);

  return (
    <aside
      className="ai-runtime-panel"
      aria-labelledby="ai-runtime-panel-title"
    >
      <div className="ai-runtime-panel__header">
        <div>
          <p className="ai-runtime-panel__eyebrow">Development only</p>
          <h2 id="ai-runtime-panel-title">AI Runtime</h2>
        </div>
        <span
          className={`ai-runtime-panel__status ai-runtime-panel__status--${view.statusTone}`}
        >
          {view.statusLabel}
        </span>
      </div>

      <dl className="ai-runtime-panel__metadata">
        <div>
          <dt>Provider</dt>
          <dd>{view.providerLabel}</dd>
        </div>
        {view.endpointLabel !== null && (
          <div>
            <dt>Endpoint</dt>
            <dd>{view.endpointLabel}</dd>
          </div>
        )}
        <div>
          <dt>Model</dt>
          <dd>{view.modelLabel}</dd>
        </div>
      </dl>

      <div className="ai-runtime-panel__actions">
        <p role="status" aria-live="polite">
          {view.statusMessage}
        </p>
        <button
          type="button"
          onClick={() => void testConnection()}
          disabled={panelState.phase === "checking"}
        >
          {view.actionLabel}
        </button>
      </div>

      <p className="ai-runtime-panel__note">
        Runtime settings are read from server environment variables. Restart
        the development server after changing .env.
      </p>
    </aside>
  );
}
