import OpenAI from "openai";
import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions/completions";
import type {
  Call1ModelBoundary,
} from "./diagnosisPipeline";
import type {
  Call1OpenAITransport,
} from "./openaiDiagnosisClient";
import type {
  Call2ModelBoundary,
} from "./revisionReviewPipeline";
import type {
  Call2OpenAITransport,
} from "./openaiRevisionReviewClient";
// @ts-expect-error Node's native TypeScript loader requires the .ts extension.
import { createOpenAICall1ModelBoundary } from "./openaiDiagnosisClient.ts";
// @ts-expect-error Node's native TypeScript loader requires the .ts extension.
import { createOpenAICall2ModelBoundary } from "./openaiRevisionReviewClient.ts";

type LmStudioEnvironment = {
  readonly LM_STUDIO_BASE_URL?: string;
  readonly LM_STUDIO_MODEL?: string;
  readonly LM_STUDIO_TIMEOUT_MS?: string;
};

export const LM_STUDIO_REQUEST_TIMEOUT_MS = 25_000;

type LmStudioChatCompletionRequest =
  ChatCompletionCreateParamsNonStreaming & {
    readonly chat_template_kwargs: {
      readonly enable_thinking: false;
    };
  };

export type LmStudioCall1Configuration = {
  readonly baseURL: string;
  readonly model: string;
  readonly requestTimeoutMs: number;
};

export type LmStudioChatCompletionsClient = {
  readonly createCompletion: (
    request: ChatCompletionCreateParamsNonStreaming,
  ) => Promise<unknown>;
};

export type LmStudioChatCompletionsClientFactory = (
  configuration: LmStudioCall1Configuration,
) => LmStudioChatCompletionsClient;

type AcceptedCall1SourceRequest = {
  readonly instructions: string;
  readonly canonicalDataMessage: string;
  readonly learnerSubmissionMessage: string;
  readonly maxOutputTokens: number;
  readonly formatName: string;
  readonly schema: Record<string, unknown>;
};

const SOURCE_REQUEST_KEYS = new Set([
  "model",
  "instructions",
  "input",
  "reasoning",
  "text",
  "max_output_tokens",
  "store",
  "stream",
]);
const SOURCE_MESSAGE_KEYS = new Set(["role", "content"]);
const SOURCE_REASONING_KEYS = new Set(["effort"]);
const SOURCE_TEXT_KEYS = new Set(["format"]);
const SOURCE_FORMAT_KEYS = new Set([
  "type",
  "name",
  "strict",
  "schema",
]);

export class LmStudioCall1ConfigurationError extends TypeError {
  constructor() {
    super("LM Studio Call 1 configuration is invalid.");
    this.name = "LmStudioCall1ConfigurationError";
  }
}

export class LmStudioCall1RequestError extends TypeError {
  constructor() {
    super("The Call 1 request cannot be translated for LM Studio.");
    this.name = "LmStudioCall1RequestError";
  }
}

export class LmStudioCall1ResponseError extends Error {
  constructor() {
    super("The LM Studio completion did not contain usable output.");
    this.name = "LmStudioCall1ResponseError";
  }
}

function failConfiguration(): never {
  throw new LmStudioCall1ConfigurationError();
}

function failRequest(): never {
  throw new LmStudioCall1RequestError();
}

function failResponse(): never {
  throw new LmStudioCall1ResponseError();
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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && Boolean(value.trim());
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isLoopbackHostname(hostname: string): boolean {
  return (
    hostname === "127.0.0.1" ||
    hostname === "localhost" ||
    hostname === "[::1]"
  );
}

export function loadLmStudioCall1Configuration(
  environment: LmStudioEnvironment,
): LmStudioCall1Configuration {
  const rawBaseURL = environment.LM_STUDIO_BASE_URL;
  const rawModel = environment.LM_STUDIO_MODEL;

  if (!isNonEmptyString(rawBaseURL) || !isNonEmptyString(rawModel)) {
    return failConfiguration();
  }

  const baseURL = rawBaseURL.trim();
  const model = rawModel.trim();
  let parsedBaseURL: URL;

  try {
    parsedBaseURL = new URL(baseURL);
  } catch {
    return failConfiguration();
  }

  if (
    parsedBaseURL.protocol !== "http:" ||
    !isLoopbackHostname(parsedBaseURL.hostname) ||
    parsedBaseURL.username ||
    parsedBaseURL.password ||
    parsedBaseURL.search ||
    parsedBaseURL.hash
  ) {
    return failConfiguration();
  }

  return {
    baseURL,
    model,
    requestTimeoutMs: loadLmStudioRequestTimeoutMs(environment),
  };
}

export function loadLmStudioRequestTimeoutMs(
  environment: LmStudioEnvironment,
): number {
  const rawTimeoutMs = environment.LM_STUDIO_TIMEOUT_MS;

  if (!isNonEmptyString(rawTimeoutMs)) {
    return LM_STUDIO_REQUEST_TIMEOUT_MS;
  }

  const normalizedTimeoutMs = rawTimeoutMs.trim();

  if (!/^\d+$/.test(normalizedTimeoutMs)) {
    return LM_STUDIO_REQUEST_TIMEOUT_MS;
  }

  const timeoutMs = Number(normalizedTimeoutMs);

  return Number.isSafeInteger(timeoutMs) && timeoutMs > 0
    ? timeoutMs
    : LM_STUDIO_REQUEST_TIMEOUT_MS;
}

function parseAcceptedCall1SourceRequest(
  request: unknown,
): AcceptedCall1SourceRequest {
  if (
    !isRecord(request) ||
    !hasExactKeys(request, SOURCE_REQUEST_KEYS) ||
    !isNonEmptyString(request.model) ||
    !isNonEmptyString(request.instructions) ||
    !Array.isArray(request.input) ||
    request.input.length !== 2 ||
    !isRecord(request.input[0]) ||
    !hasExactKeys(request.input[0], SOURCE_MESSAGE_KEYS) ||
    request.input[0].role !== "developer" ||
    !isNonEmptyString(request.input[0].content) ||
    !isRecord(request.input[1]) ||
    !hasExactKeys(request.input[1], SOURCE_MESSAGE_KEYS) ||
    request.input[1].role !== "user" ||
    !isNonEmptyString(request.input[1].content) ||
    !isRecord(request.reasoning) ||
    !hasExactKeys(request.reasoning, SOURCE_REASONING_KEYS) ||
    request.reasoning.effort !== "low" ||
    !isRecord(request.text) ||
    !hasExactKeys(request.text, SOURCE_TEXT_KEYS) ||
    !isRecord(request.text.format) ||
    !hasExactKeys(request.text.format, SOURCE_FORMAT_KEYS) ||
    request.text.format.type !== "json_schema" ||
    !isNonEmptyString(request.text.format.name) ||
    request.text.format.strict !== true ||
    !isRecord(request.text.format.schema) ||
    !isPositiveInteger(request.max_output_tokens) ||
    request.store !== false ||
    request.stream !== false
  ) {
    return failRequest();
  }

  return {
    instructions: request.instructions,
    canonicalDataMessage: request.input[0].content,
    learnerSubmissionMessage: request.input[1].content,
    maxOutputTokens: request.max_output_tokens,
    formatName: request.text.format.name,
    schema: request.text.format.schema,
  };
}

function createChatCompletionRequest(
  source: AcceptedCall1SourceRequest,
  model: string,
): LmStudioChatCompletionRequest {
  return {
    model,
    messages: [
      { role: "system", content: source.instructions },
      { role: "system", content: source.canonicalDataMessage },
      { role: "user", content: source.learnerSubmissionMessage },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: source.formatName,
        strict: true,
        schema: source.schema,
      },
    },
    max_tokens: source.maxOutputTokens,
    n: 1,
    stream: false,
    temperature: 0,

    chat_template_kwargs: {
      enable_thinking: false,
    },
  };
}

function mapCompletionUsage(completion: Record<string, unknown>) {
  if (!isRecord(completion.usage)) return undefined;

  const inputTokens = completion.usage.prompt_tokens;
  const outputTokens = completion.usage.completion_tokens;

  if (
    !isNonNegativeInteger(inputTokens) ||
    !isNonNegativeInteger(outputTokens)
  ) {
    return undefined;
  }

  return {
    input_tokens: inputTokens,
    input_tokens_details: {
      cache_write_tokens: 0,
      cached_tokens: 0,
    },
    output_tokens: outputTokens,
    output_tokens_details: {
      reasoning_tokens: 0,
    },
    total_tokens: inputTokens + outputTokens,
  };
}

function mapChatCompletion(completion: unknown) {
  if (
    !isRecord(completion) ||
    !Array.isArray(completion.choices) ||
    completion.choices.length === 0 ||
    !isRecord(completion.choices[0]) ||
    !isRecord(completion.choices[0].message) ||
    !isNonEmptyString(completion.choices[0].message.content)
  ) {
    return failResponse();
  }

  return {
    status:
      completion.choices[0].finish_reason === "stop"
        ? ("completed" as const)
        : ("incomplete" as const),
    output_text: completion.choices[0].message.content,
    output: [],
    usage: mapCompletionUsage(completion),
  };
}

function createLmStudioChatCompletionsClient(
  configuration: LmStudioCall1Configuration,
): LmStudioChatCompletionsClient {
  const client = new OpenAI({
    baseURL: configuration.baseURL,
    apiKey: "lm-studio",
    maxRetries: 0,
    timeout: configuration.requestTimeoutMs,
  });

  return {
    createCompletion: async (request) =>
      client.chat.completions.create(request),
  };
}

export function createLmStudioCall1Transport(
  configuration: LmStudioCall1Configuration,
  client: LmStudioChatCompletionsClient,
): Call1OpenAITransport {
  return {
    createResponse: async (request) => {
      const source = parseAcceptedCall1SourceRequest(request);
      const completion = await client.createCompletion(
        createChatCompletionRequest(source, configuration.model),
      );

      return mapChatCompletion(completion);
    },
  };
}

export function createLmStudioCall2Transport(
  configuration: LmStudioCall1Configuration,
  client: LmStudioChatCompletionsClient,
): Call2OpenAITransport {
  return createLmStudioCall1Transport(configuration, client);
}

export function createLmStudioCall1ModelBoundaryFromEnvironment(
  environment: LmStudioEnvironment,
  createClient: LmStudioChatCompletionsClientFactory =
    createLmStudioChatCompletionsClient,
): Call1ModelBoundary {
  const configuration = loadLmStudioCall1Configuration(environment);
  const client = createClient(configuration);
  const transport = createLmStudioCall1Transport(configuration, client);

  return createOpenAICall1ModelBoundary(transport);
}

export function createLmStudioCall2ModelBoundaryFromEnvironment(
  environment: LmStudioEnvironment,
  createClient: LmStudioChatCompletionsClientFactory =
    createLmStudioChatCompletionsClient,
): Call2ModelBoundary {
  const configuration = loadLmStudioCall1Configuration(environment);
  const client = createClient(configuration);
  const transport = createLmStudioCall2Transport(configuration, client);

  return createOpenAICall2ModelBoundary(transport);
}
