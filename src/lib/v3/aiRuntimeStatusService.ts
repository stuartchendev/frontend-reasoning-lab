export const AI_RUNTIME_STATUS_ENDPOINT =
  "/.netlify/functions/ai-runtime-status";

export type AiRuntimeStatus =
  | {
      readonly provider: "lm-studio";
      readonly endpoint: string;
      readonly model: string;
      readonly status: "connected";
    }
  | {
      readonly provider: "lm-studio";
      readonly endpoint: string | null;
      readonly model: string | null;
      readonly status: "unavailable";
      readonly reason:
        | "incomplete-configuration"
        | "invalid-configuration"
        | "connection-failed"
        | "model-unavailable";
    }
  | {
      readonly provider: "openai";
      readonly model: string;
      readonly status: "configured";
    }
  | {
      readonly provider: "openai";
      readonly model: string;
      readonly status: "unavailable";
      readonly reason: "missing-configuration";
    };

export type AiRuntimeStatusFetch = (
  input: string,
  init: RequestInit,
) => Promise<Pick<Response, "ok" | "json">>;

export type AiRuntimeStatusService = () => Promise<AiRuntimeStatus>;

export class AiRuntimeStatusServiceError extends Error {
  constructor() {
    super("The development AI runtime status could not be checked.");
    this.name = "AiRuntimeStatusServiceError";
  }
}

const CONNECTED_KEYS = new Set([
  "provider",
  "endpoint",
  "model",
  "status",
]);
const UNAVAILABLE_KEYS = new Set([
  ...CONNECTED_KEYS,
  "reason",
]);
const UNAVAILABLE_REASONS = new Set([
  "incomplete-configuration",
  "invalid-configuration",
  "connection-failed",
  "model-unavailable",
]);
const OPENAI_CONFIGURED_KEYS = new Set(["provider", "model", "status"]);
const OPENAI_UNAVAILABLE_KEYS = new Set([
  ...OPENAI_CONFIGURED_KEYS,
  "reason",
]);

function defaultFetch(
  input: string,
  init: RequestInit,
): Promise<Response> {
  return globalThis.fetch(input, init);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expectedKeys: ReadonlySet<string>,
): boolean {
  const actualKeys = Object.keys(value);

  return (
    actualKeys.length === expectedKeys.size &&
    actualKeys.every((key) => expectedKeys.has(key))
  );
}

function isOptionalMetadata(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && Boolean(value.trim()));
}

function failService(): never {
  throw new AiRuntimeStatusServiceError();
}

export function parseAiRuntimeStatus(value: unknown): AiRuntimeStatus {
  if (!isRecord(value)) {
    return failService();
  }

  if (value.provider === "openai") {
    if (
      value.status === "configured" &&
      hasExactKeys(value, OPENAI_CONFIGURED_KEYS) &&
      typeof value.model === "string" &&
      Boolean(value.model.trim())
    ) {
      return value as AiRuntimeStatus;
    }

    if (
      value.status === "unavailable" &&
      hasExactKeys(value, OPENAI_UNAVAILABLE_KEYS) &&
      typeof value.model === "string" &&
      Boolean(value.model.trim()) &&
      value.reason === "missing-configuration"
    ) {
      return value as AiRuntimeStatus;
    }

    return failService();
  }

  if (value.provider !== "lm-studio") {
    return failService();
  }

  if (
    value.status === "connected" &&
    hasExactKeys(value, CONNECTED_KEYS) &&
    typeof value.endpoint === "string" &&
    Boolean(value.endpoint.trim()) &&
    typeof value.model === "string" &&
    Boolean(value.model.trim())
  ) {
    return value as AiRuntimeStatus;
  }

  if (
    value.status === "unavailable" &&
    hasExactKeys(value, UNAVAILABLE_KEYS) &&
    isOptionalMetadata(value.endpoint) &&
    isOptionalMetadata(value.model) &&
    typeof value.reason === "string" &&
    UNAVAILABLE_REASONS.has(value.reason)
  ) {
    return value as AiRuntimeStatus;
  }

  return failService();
}

export function createAiRuntimeStatusService(
  fetchImplementation: AiRuntimeStatusFetch = defaultFetch,
): AiRuntimeStatusService {
  return async () => {
    try {
      const response = await fetchImplementation(
        AI_RUNTIME_STATUS_ENDPOINT,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        return failService();
      }

      return parseAiRuntimeStatus(await response.json());
    } catch {
      return failService();
    }
  };
}
