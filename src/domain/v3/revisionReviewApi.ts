import type {
  NeedsFollowUpDiagnosisResult,
  RevisionComparisonResult,
} from "./evaluationResults";
import type { PracticeSessionFailure } from "./practiceSession";
// @ts-expect-error Node's native TypeScript loader requires the .ts extension.
import { parseInitialDiagnosisResult } from "./evaluationResults.ts";
// @ts-expect-error Node's native TypeScript loader requires the .ts extension.
import { parseRevisionComparisonResult } from "./evaluationResults.ts";
// @ts-expect-error Node's native TypeScript loader requires the .ts extension.
import { PRACTICE_SESSION_FAILURE_CODES } from "./practiceSession.ts";

export const REVIEW_REVISED_ANSWER_CONTRACT_VERSION = "1" as const;

export type ReviewRevisedAnswerRequest = {
  readonly contractVersion: typeof REVIEW_REVISED_ANSWER_CONTRACT_VERSION;
  readonly questionId: string;
  readonly questionVersion: number;
  readonly originalAnswer: string;
  readonly revisedAnswer: string;
  readonly diagnosis: NeedsFollowUpDiagnosisResult;
};

export type ReviewRevisedAnswerUsage = {
  readonly inputTokens: number;
  readonly outputTokens: number;
};

export type ReviewRevisedAnswerSuccess = {
  readonly contractVersion: typeof REVIEW_REVISED_ANSWER_CONTRACT_VERSION;
  readonly ok: true;
  readonly result: RevisionComparisonResult;
  readonly meta: {
    readonly traceId: string;
    readonly modelLatencyMs: number;
    readonly usage: ReviewRevisedAnswerUsage | null;
  };
};

export type ReviewRevisedAnswerError = {
  readonly contractVersion: typeof REVIEW_REVISED_ANSWER_CONTRACT_VERSION;
  readonly ok: false;
  readonly error: PracticeSessionFailure;
  readonly meta: {
    readonly traceId: string;
  };
};

export type ReviewRevisedAnswerResponse =
  | ReviewRevisedAnswerSuccess
  | ReviewRevisedAnswerError;

const REQUEST_KEYS = new Set([
  "contractVersion",
  "questionId",
  "questionVersion",
  "originalAnswer",
  "revisedAnswer",
  "diagnosis",
]);
const SUCCESS_KEYS = new Set(["contractVersion", "ok", "result", "meta"]);
const SUCCESS_META_KEYS = new Set([
  "traceId",
  "modelLatencyMs",
  "usage",
]);
const USAGE_KEYS = new Set(["inputTokens", "outputTokens"]);
const ERROR_KEYS = new Set(["contractVersion", "ok", "error", "meta"]);
const FAILURE_KEYS = new Set(["code", "message", "retryable"]);
const ERROR_META_KEYS = new Set(["traceId"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertRecord(
  value: unknown,
  typeName: string,
): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new TypeError(typeName + " must be an object.");
  }
}

function assertExactKeys(
  value: Record<string, unknown>,
  allowedKeys: ReadonlySet<string>,
  typeName: string,
): void {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      throw new TypeError(typeName + ' contains unsupported field "' + key + '".');
    }
  }
}

function assertNonEmptyString(
  value: unknown,
  fieldName: string,
): asserts value is string {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(fieldName + " must be a non-empty string.");
  }
}

function assertString(
  value: unknown,
  fieldName: string,
): asserts value is string {
  if (typeof value !== "string") {
    throw new TypeError(fieldName + " must be a string.");
  }
}

function assertPositiveInteger(
  value: unknown,
  fieldName: string,
): asserts value is number {
  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw new TypeError(fieldName + " must be a positive integer.");
  }
}

function assertNonNegativeInteger(
  value: unknown,
  fieldName: string,
): asserts value is number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new TypeError(fieldName + " must be a non-negative integer.");
  }
}

function assertContractVersion(value: unknown): void {
  if (value !== REVIEW_REVISED_ANSWER_CONTRACT_VERSION) {
    throw new TypeError("ReviewRevisedAnswer contractVersion is unsupported.");
  }
}

function assertUsage(
  value: unknown,
): asserts value is ReviewRevisedAnswerUsage {
  assertRecord(value, "ReviewRevisedAnswerUsage");
  assertExactKeys(value, USAGE_KEYS, "ReviewRevisedAnswerUsage");
  assertNonNegativeInteger(
    value.inputTokens,
    "ReviewRevisedAnswerUsage.inputTokens",
  );
  assertNonNegativeInteger(
    value.outputTokens,
    "ReviewRevisedAnswerUsage.outputTokens",
  );
}

function assertPracticeSessionFailure(
  value: unknown,
): asserts value is PracticeSessionFailure {
  assertRecord(value, "PracticeSessionFailure");
  assertExactKeys(value, FAILURE_KEYS, "PracticeSessionFailure");

  if (
    typeof value.code !== "string" ||
    !(PRACTICE_SESSION_FAILURE_CODES as readonly string[]).includes(value.code)
  ) {
    throw new TypeError("PracticeSessionFailure.code has an unsupported value.");
  }

  assertString(value.message, "PracticeSessionFailure.message");

  if (typeof value.retryable !== "boolean") {
    throw new TypeError("PracticeSessionFailure.retryable must be a boolean.");
  }
}

export function parseReviewRevisedAnswerRequest(
  input: unknown,
): ReviewRevisedAnswerRequest {
  assertRecord(input, "ReviewRevisedAnswerRequest");
  assertExactKeys(input, REQUEST_KEYS, "ReviewRevisedAnswerRequest");
  assertContractVersion(input.contractVersion);
  assertNonEmptyString(
    input.questionId,
    "ReviewRevisedAnswerRequest.questionId",
  );
  assertPositiveInteger(
    input.questionVersion,
    "ReviewRevisedAnswerRequest.questionVersion",
  );
  assertNonEmptyString(
    input.originalAnswer,
    "ReviewRevisedAnswerRequest.originalAnswer",
  );
  assertNonEmptyString(
    input.revisedAnswer,
    "ReviewRevisedAnswerRequest.revisedAnswer",
  );

  const diagnosis = parseInitialDiagnosisResult(input.diagnosis);

  if (diagnosis.outcome !== "needs-follow-up") {
    throw new TypeError(
      "ReviewRevisedAnswerRequest.diagnosis must require follow-up.",
    );
  }

  return input as ReviewRevisedAnswerRequest;
}

export function parseReviewRevisedAnswerSuccess(
  input: unknown,
): ReviewRevisedAnswerSuccess {
  assertRecord(input, "ReviewRevisedAnswerSuccess");
  assertExactKeys(input, SUCCESS_KEYS, "ReviewRevisedAnswerSuccess");
  assertContractVersion(input.contractVersion);

  if (input.ok !== true) {
    throw new TypeError("ReviewRevisedAnswerSuccess.ok must be true.");
  }

  parseRevisionComparisonResult(input.result);
  assertRecord(input.meta, "ReviewRevisedAnswerSuccess.meta");
  assertExactKeys(
    input.meta,
    SUCCESS_META_KEYS,
    "ReviewRevisedAnswerSuccess.meta",
  );
  assertNonEmptyString(
    input.meta.traceId,
    "ReviewRevisedAnswerSuccess.meta.traceId",
  );
  assertNonNegativeInteger(
    input.meta.modelLatencyMs,
    "ReviewRevisedAnswerSuccess.meta.modelLatencyMs",
  );

  if (input.meta.usage !== null) {
    assertUsage(input.meta.usage);
  }

  return input as ReviewRevisedAnswerSuccess;
}

export function parseReviewRevisedAnswerError(
  input: unknown,
): ReviewRevisedAnswerError {
  assertRecord(input, "ReviewRevisedAnswerError");
  assertExactKeys(input, ERROR_KEYS, "ReviewRevisedAnswerError");
  assertContractVersion(input.contractVersion);

  if (input.ok !== false) {
    throw new TypeError("ReviewRevisedAnswerError.ok must be false.");
  }

  assertPracticeSessionFailure(input.error);
  assertRecord(input.meta, "ReviewRevisedAnswerError.meta");
  assertExactKeys(
    input.meta,
    ERROR_META_KEYS,
    "ReviewRevisedAnswerError.meta",
  );
  assertNonEmptyString(
    input.meta.traceId,
    "ReviewRevisedAnswerError.meta.traceId",
  );

  return input as ReviewRevisedAnswerError;
}

export function parseReviewRevisedAnswerResponse(
  input: unknown,
): ReviewRevisedAnswerResponse {
  assertRecord(input, "ReviewRevisedAnswerResponse");

  if (input.ok === true) {
    return parseReviewRevisedAnswerSuccess(input);
  }

  if (input.ok === false) {
    return parseReviewRevisedAnswerError(input);
  }

  throw new TypeError("ReviewRevisedAnswerResponse.ok must be a boolean.");
}
