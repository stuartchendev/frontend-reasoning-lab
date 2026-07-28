// @ts-expect-error Node's native TypeScript loader requires the .ts extension.
import { loadLmStudioCall1Configuration, type LmStudioCall1Configuration } from "./lmStudioDiagnosisClient.ts";
// @ts-expect-error Node's native TypeScript loader requires the .ts extension.
import { loadOpenAIApiKey } from "./openaiDiagnosisClient.ts";

export type AiProviderEnvironment = {
  readonly LM_STUDIO_BASE_URL?: string;
  readonly LM_STUDIO_MODEL?: string;
  readonly LM_STUDIO_TIMEOUT_MS?: string;
  readonly OPENAI_API_KEY?: string;
};

export type ResolvedAiProvider =
  | {
      readonly provider: "lm-studio";
      readonly configuration: LmStudioCall1Configuration;
    }
  | {
      readonly provider: "openai";
    };

export type AiProviderConfigurationReason =
  | "incomplete-lm-studio-configuration"
  | "invalid-lm-studio-configuration"
  | "missing-openai-configuration";

export class AiProviderConfigurationError extends Error {
  readonly provider: "lm-studio" | "openai";
  readonly reason: AiProviderConfigurationReason;

  constructor(
    provider: "lm-studio" | "openai",
    reason: AiProviderConfigurationReason,
  ) {
    super("The AI provider configuration is invalid.");
    this.name = "AiProviderConfigurationError";
    this.provider = provider;
    this.reason = reason;
  }
}

function hasEnvironmentEntry(value: string | undefined): boolean {
  return typeof value === "string";
}

function hasNonEmptyValue(value: string | undefined): value is string {
  return typeof value === "string" && Boolean(value.trim());
}

export function resolveAiProvider(
  environment: AiProviderEnvironment,
): ResolvedAiProvider {
  const rawBaseURL = environment.LM_STUDIO_BASE_URL;
  const rawModel = environment.LM_STUDIO_MODEL;
  const hasAnyLmStudioEntry =
    hasEnvironmentEntry(rawBaseURL) || hasEnvironmentEntry(rawModel);

  if (hasAnyLmStudioEntry) {
    if (!hasNonEmptyValue(rawBaseURL) || !hasNonEmptyValue(rawModel)) {
      throw new AiProviderConfigurationError(
        "lm-studio",
        "incomplete-lm-studio-configuration",
      );
    }

    try {
      return {
        provider: "lm-studio",
        configuration: loadLmStudioCall1Configuration(environment),
      };
    } catch {
      throw new AiProviderConfigurationError(
        "lm-studio",
        "invalid-lm-studio-configuration",
      );
    }
  }

  try {
    loadOpenAIApiKey(environment);
  } catch {
    throw new AiProviderConfigurationError(
      "openai",
      "missing-openai-configuration",
    );
  }

  return { provider: "openai" };
}
