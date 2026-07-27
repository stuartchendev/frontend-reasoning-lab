// @ts-expect-error Node's native TypeScript loader requires the .ts extension.
import { loadLmStudioCall1Configuration } from "./lmStudioDiagnosisClient.ts";

const AI_RUNTIME_STATUS_TIMEOUT_MS = 3_000;

export type AiRuntimeStatusEnvironment = {
  readonly CONTEXT?: string;
  readonly NETLIFY_LOCAL?: string;
  readonly LM_STUDIO_BASE_URL?: string;
  readonly LM_STUDIO_MODEL?: string;
};

export type AiRuntimeStatusReason =
  | "missing-configuration"
  | "connection-failed"
  | "model-unavailable";

export type AiRuntimeConnected = {
  readonly provider: "lm-studio";
  readonly endpoint: string;
  readonly model: string;
  readonly status: "connected";
};

export type AiRuntimeUnavailable = {
  readonly provider: "lm-studio";
  readonly endpoint: string | null;
  readonly model: string | null;
  readonly status: "unavailable";
  readonly reason: AiRuntimeStatusReason;
};

export type AiRuntimeStatusResponse =
  | AiRuntimeConnected
  | AiRuntimeUnavailable;

export type AiRuntimeStatusFetch = (
  input: string,
  init: RequestInit,
) => Promise<Pick<Response, "ok" | "json">>;

type AiRuntimeStatusHttpDependencies = {
  readonly environment: AiRuntimeStatusEnvironment;
  readonly fetchImplementation?: AiRuntimeStatusFetch;
};

const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

function defaultFetch(
  input: string,
  init: RequestInit,
): Promise<Response> {
  return globalThis.fetch(input, init);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type ModelListEnvelope = {
  readonly data: readonly unknown[];
};

function isModelListEnvelope(value: unknown): value is ModelListEnvelope {
  return isRecord(value) && Array.isArray(value.data);
}

function listsConfiguredModel(
  value: ModelListEnvelope,
  model: string,
): boolean {
  return value.data.some(
    (item) =>
      isRecord(item) &&
      typeof item.id === "string" &&
      item.id === model,
  );
}

function unavailable(
  reason: AiRuntimeStatusReason,
  configuration?: { readonly baseURL: string; readonly model: string },
): AiRuntimeUnavailable {
  return {
    provider: "lm-studio",
    endpoint: configuration?.baseURL ?? null,
    model: configuration?.model ?? null,
    status: "unavailable",
    reason,
  };
}

export function createAiRuntimeStatusHttpHandler({
  environment,
  fetchImplementation = defaultFetch,
}: AiRuntimeStatusHttpDependencies) {
  return async (request: Request): Promise<Response> => {
    if (
      environment.NETLIFY_LOCAL !== "true" ||
      environment.CONTEXT === "production"
    ) {
      return jsonResponse({ error: "operation-unavailable" }, 404);
    }

    if (request.method !== "GET") {
      const response = jsonResponse({ error: "method-not-allowed" }, 405);
      response.headers.set("Allow", "GET");
      return response;
    }

    let configuration: { readonly baseURL: string; readonly model: string };

    try {
      configuration = loadLmStudioCall1Configuration(environment);
    } catch {
      return jsonResponse(unavailable("missing-configuration"));
    }

    try {
      const modelsEndpoint =
        `${configuration.baseURL.replace(/\/+$/, "")}/models`;
      const response = await fetchImplementation(modelsEndpoint, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(AI_RUNTIME_STATUS_TIMEOUT_MS),
      });

      if (!response.ok) {
        return jsonResponse(unavailable("connection-failed", configuration));
      }

      const body: unknown = await response.json();

      if (!isModelListEnvelope(body)) {
        return jsonResponse(unavailable("connection-failed", configuration));
      }

      if (!listsConfiguredModel(body, configuration.model)) {
        return jsonResponse(unavailable("model-unavailable", configuration));
      }

      return jsonResponse({
        provider: "lm-studio",
        endpoint: configuration.baseURL,
        model: configuration.model,
        status: "connected",
      } satisfies AiRuntimeConnected);
    } catch {
      return jsonResponse(unavailable("connection-failed", configuration));
    }
  };
}
