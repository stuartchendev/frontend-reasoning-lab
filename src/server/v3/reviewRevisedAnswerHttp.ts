import type {
  ReviewRevisedAnswerError,
  ReviewRevisedAnswerRequest,
  ReviewRevisedAnswerSuccess,
} from "../../domain/v3/revisionReviewApi";
import type {
  PracticeSessionFailure,
  PracticeSessionFailureCode,
} from "../../domain/v3/practiceSession";
import type {
  Call2ModelBoundary,
  PreparedRevisionReview,
  RevisionReviewPipelineSuccess,
} from "./revisionReviewPipeline";
// @ts-expect-error Node's native TypeScript loader requires the .ts extension.
import { REVIEW_REVISED_ANSWER_CONTRACT_VERSION, parseReviewRevisedAnswerRequest } from "../../domain/v3/revisionReviewApi.ts";
// @ts-expect-error Node's native TypeScript loader requires the .ts extension.
import { prepareRevisionReviewPipeline } from "./revisionReviewPipeline.ts";
// @ts-expect-error Node's native TypeScript loader requires the .ts extension.
import { RevisionReviewPipelineError } from "./revisionReviewPipeline.ts";
// @ts-expect-error Node's native TypeScript loader requires the .ts extension.
import { runPreparedRevisionReviewPipeline } from "./revisionReviewPipeline.ts";

export const MAX_REVIEW_REVISED_ANSWER_RAW_BODY_BYTES = 24 * 1024;

type RunPreparedRevisionReviewPipeline = (
  prepared: PreparedRevisionReview,
  invokeModel: Call2ModelBoundary,
) => Promise<RevisionReviewPipelineSuccess>;

export type ReviewRevisedAnswerSafeDiagnostic = {
  readonly traceId: string;
  readonly category:
    | "model-boundary-configuration"
    | "unexpected-handler-error";
};

export type ReviewRevisedAnswerHttpDependencies = {
  readonly createModelBoundary: () => Call2ModelBoundary;
  readonly createTraceId?: () => string;
  readonly runPreparedPipeline?: RunPreparedRevisionReviewPipeline;
  readonly logSafeDiagnostic?: (
    diagnostic: ReviewRevisedAnswerSafeDiagnostic,
  ) => void;
};

const FAILURE_STATUS_BY_CODE = {
  "invalid-request": 400,
  "unsupported-contract-version": 400,
  "operation-unavailable": 501,
  "payload-too-large": 413,
  "question-not-found": 404,
  "question-version-mismatch": 409,
  "rate-limited": 429,
  "invalid-model-output": 502,
  "model-unavailable": 503,
  "server-error": 500,
} as const satisfies Record<PracticeSessionFailureCode, number>;

const INVALID_METHOD_FAILURE = {
  code: "invalid-request",
  message: "Only POST requests are supported.",
  retryable: false,
} as const satisfies PracticeSessionFailure;

const INVALID_BODY_FAILURE = {
  code: "invalid-request",
  message: "The revision-review request body is invalid.",
  retryable: false,
} as const satisfies PracticeSessionFailure;

const UNSUPPORTED_CONTRACT_VERSION_FAILURE = {
  code: "unsupported-contract-version",
  message: "The revision-review API contract version is not supported.",
  retryable: false,
} as const satisfies PracticeSessionFailure;

const RAW_BODY_TOO_LARGE_FAILURE = {
  code: "payload-too-large",
  message: "The revision-review request body is too large.",
  retryable: false,
} as const satisfies PracticeSessionFailure;

const SAFE_SERVER_FAILURE = {
  code: "server-error",
  message: "The revision-review request could not be completed.",
  retryable: false,
} as const satisfies PracticeSessionFailure;

function defaultTraceId(): string {
  return crypto.randomUUID();
}

function defaultSafeLogger(
  diagnostic: ReviewRevisedAnswerSafeDiagnostic,
): void {
  console.error("review-revised-answer", diagnostic);
}

function jsonResponse(
  body: ReviewRevisedAnswerSuccess | ReviewRevisedAnswerError,
  status: number,
  additionalHeaders?: HeadersInit,
): Response {
  const headers = new Headers(additionalHeaders);
  headers.set("Content-Type", "application/json");
  headers.set("Cache-Control", "no-store");

  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
}

function errorResponse(
  failure: PracticeSessionFailure,
  traceId: string,
  status: number = FAILURE_STATUS_BY_CODE[failure.code],
  additionalHeaders?: HeadersInit,
): Response {
  const body = {
    contractVersion: REVIEW_REVISED_ANSWER_CONTRACT_VERSION,
    ok: false,
    error: failure,
    meta: { traceId },
  } as const satisfies ReviewRevisedAnswerError;

  return jsonResponse(body, status, additionalHeaders);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasUnsupportedContractVersion(value: unknown): boolean {
  return (
    isRecord(value) &&
    Object.hasOwn(value, "contractVersion") &&
    value.contractVersion !== REVIEW_REVISED_ANSWER_CONTRACT_VERSION
  );
}

function parseRawRequestBody(
  rawBody: ArrayBuffer,
):
  | { readonly ok: true; readonly request: ReviewRevisedAnswerRequest }
  | {
      readonly ok: false;
      readonly failure: PracticeSessionFailure;
      readonly status: number;
    } {
  if (rawBody.byteLength > MAX_REVIEW_REVISED_ANSWER_RAW_BODY_BYTES) {
    return {
      ok: false,
      failure: RAW_BODY_TOO_LARGE_FAILURE,
      status: 413,
    };
  }

  let text: string;

  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(rawBody);
  } catch {
    return { ok: false, failure: INVALID_BODY_FAILURE, status: 400 };
  }

  if (!text.trim()) {
    return { ok: false, failure: INVALID_BODY_FAILURE, status: 400 };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, failure: INVALID_BODY_FAILURE, status: 400 };
  }

  if (hasUnsupportedContractVersion(parsed)) {
    return {
      ok: false,
      failure: UNSUPPORTED_CONTRACT_VERSION_FAILURE,
      status: 400,
    };
  }

  try {
    return {
      ok: true,
      request: parseReviewRevisedAnswerRequest(parsed),
    };
  } catch {
    return { ok: false, failure: INVALID_BODY_FAILURE, status: 400 };
  }
}

export function createReviewRevisedAnswerHttpHandler(
  dependencies: ReviewRevisedAnswerHttpDependencies,
): (request: Request) => Promise<Response> {
  const createTraceId = dependencies.createTraceId ?? defaultTraceId;
  const runPreparedPipeline =
    dependencies.runPreparedPipeline ?? runPreparedRevisionReviewPipeline;
  const logSafeDiagnostic =
    dependencies.logSafeDiagnostic ?? defaultSafeLogger;

  return async (request: Request): Promise<Response> => {
    const traceId = createTraceId();

    if (request.method !== "POST") {
      return errorResponse(INVALID_METHOD_FAILURE, traceId, 405, {
        Allow: "POST",
      });
    }

    let rawBody: ArrayBuffer;

    try {
      rawBody = await request.arrayBuffer();
    } catch {
      logSafeDiagnostic({ traceId, category: "unexpected-handler-error" });
      return errorResponse(SAFE_SERVER_FAILURE, traceId, 500);
    }

    const parsedBody = parseRawRequestBody(rawBody);

    if (!parsedBody.ok) {
      return errorResponse(
        parsedBody.failure,
        traceId,
        parsedBody.status,
      );
    }

    let prepared: PreparedRevisionReview;

    try {
      prepared = prepareRevisionReviewPipeline(parsedBody.request);
    } catch (error) {
      if (error instanceof RevisionReviewPipelineError) {
        return errorResponse(error.failure, traceId);
      }

      logSafeDiagnostic({ traceId, category: "unexpected-handler-error" });
      return errorResponse(SAFE_SERVER_FAILURE, traceId, 500);
    }

    let invokeModel: Call2ModelBoundary;

    try {
      invokeModel = dependencies.createModelBoundary();
    } catch {
      logSafeDiagnostic({
        traceId,
        category: "model-boundary-configuration",
      });
      return errorResponse(SAFE_SERVER_FAILURE, traceId, 500);
    }

    try {
      const success = await runPreparedPipeline(prepared, invokeModel);
      const body = {
        contractVersion: REVIEW_REVISED_ANSWER_CONTRACT_VERSION,
        ok: true,
        result: success.result,
        meta: {
          traceId,
          modelLatencyMs: success.meta.modelLatencyMs,
          usage: success.meta.usage,
        },
      } as const satisfies ReviewRevisedAnswerSuccess;

      return jsonResponse(body, 200);
    } catch (error) {
      if (error instanceof RevisionReviewPipelineError) {
        return errorResponse(error.failure, traceId);
      }

      logSafeDiagnostic({ traceId, category: "unexpected-handler-error" });
      return errorResponse(SAFE_SERVER_FAILURE, traceId, 500);
    }
  };
}
