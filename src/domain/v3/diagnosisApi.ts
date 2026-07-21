import type { PracticeSessionFailure } from "./practiceSession";
import type { InitialDiagnosisResult } from "./evaluationResults";
// @ts-expect-error Node's native TypeScript loader requires the .ts extension.
import { PRACTICE_SESSION_FAILURE_CODES } from "./practiceSession.ts";
// @ts-expect-error Node's native TypeScript loader requires the .ts extension.
import { parseInitialDiagnosisResult } from "./evaluationResults.ts";

export const DIAGNOSE_INITIAL_ANSWER_CONTRACT_VERSION = "1" as const;

export type DiagnoseInitialAnswerRequest = {
  readonly contractVersion: typeof DIAGNOSE_INITIAL_ANSWER_CONTRACT_VERSION;
  readonly questionId: string;
  readonly questionVersion: number;
  readonly answer: string;
};

export type DiagnoseInitialAnswerUsage = {
  readonly inputTokens: number;
  readonly outputTokens: number;
};

export type DiagnoseInitialAnswerSuccess = {
  readonly contractVersion: typeof DIAGNOSE_INITIAL_ANSWER_CONTRACT_VERSION;
  readonly ok: true;
  readonly result: InitialDiagnosisResult;
  readonly meta: {
    readonly traceId: string;
    readonly modelLatencyMs: number;
    readonly usage: DiagnoseInitialAnswerUsage | null;
  };
};

export type DiagnoseInitialAnswerError = {
  readonly contractVersion: typeof DIAGNOSE_INITIAL_ANSWER_CONTRACT_VERSION;
  readonly ok: false;
  readonly error: PracticeSessionFailure;
  readonly meta: {
    readonly traceId: string;
  };
};

export type DiagnoseInitialAnswerResponse =
  | DiagnoseInitialAnswerSuccess
  | DiagnoseInitialAnswerError;

const REQUEST_KEYS = new Set([
  "contractVersion",
  "questionId",
  "questionVersion",
  "answer",
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
  if (value !== DIAGNOSE_INITIAL_ANSWER_CONTRACT_VERSION) {
    throw new TypeError("DiagnoseInitialAnswer contractVersion is unsupported.");
  }
}

function assertUsage(
  value: unknown,
): asserts value is DiagnoseInitialAnswerUsage {
  assertRecord(value, "DiagnoseInitialAnswerUsage");
  assertExactKeys(value, USAGE_KEYS, "DiagnoseInitialAnswerUsage");
  assertNonNegativeInteger(
    value.inputTokens,
    "DiagnoseInitialAnswerUsage.inputTokens",
  );
  assertNonNegativeInteger(
    value.outputTokens,
    "DiagnoseInitialAnswerUsage.outputTokens",
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

export function parseDiagnoseInitialAnswerRequest(
  input: unknown,
): DiagnoseInitialAnswerRequest {
  assertRecord(input, "DiagnoseInitialAnswerRequest");
  assertExactKeys(input, REQUEST_KEYS, "DiagnoseInitialAnswerRequest");
  assertContractVersion(input.contractVersion);
  assertNonEmptyString(
    input.questionId,
    "DiagnoseInitialAnswerRequest.questionId",
  );
  assertPositiveInteger(
    input.questionVersion,
    "DiagnoseInitialAnswerRequest.questionVersion",
  );
  assertNonEmptyString(input.answer, "DiagnoseInitialAnswerRequest.answer");

  return input as DiagnoseInitialAnswerRequest;
}

export function parseDiagnoseInitialAnswerSuccess(
  input: unknown,
): DiagnoseInitialAnswerSuccess {
  assertRecord(input, "DiagnoseInitialAnswerSuccess");
  assertExactKeys(input, SUCCESS_KEYS, "DiagnoseInitialAnswerSuccess");
  assertContractVersion(input.contractVersion);

  if (input.ok !== true) {
    throw new TypeError("DiagnoseInitialAnswerSuccess.ok must be true.");
  }

  parseInitialDiagnosisResult(input.result);
  assertRecord(input.meta, "DiagnoseInitialAnswerSuccess.meta");
  assertExactKeys(
    input.meta,
    SUCCESS_META_KEYS,
    "DiagnoseInitialAnswerSuccess.meta",
  );
  assertNonEmptyString(
    input.meta.traceId,
    "DiagnoseInitialAnswerSuccess.meta.traceId",
  );
  assertNonNegativeInteger(
    input.meta.modelLatencyMs,
    "DiagnoseInitialAnswerSuccess.meta.modelLatencyMs",
  );

  if (input.meta.usage !== null) {
    assertUsage(input.meta.usage);
  }

  return input as DiagnoseInitialAnswerSuccess;
}

export function parseDiagnoseInitialAnswerError(
  input: unknown,
): DiagnoseInitialAnswerError {
  assertRecord(input, "DiagnoseInitialAnswerError");
  assertExactKeys(input, ERROR_KEYS, "DiagnoseInitialAnswerError");
  assertContractVersion(input.contractVersion);

  if (input.ok !== false) {
    throw new TypeError("DiagnoseInitialAnswerError.ok must be false.");
  }

  assertPracticeSessionFailure(input.error);
  assertRecord(input.meta, "DiagnoseInitialAnswerError.meta");
  assertExactKeys(
    input.meta,
    ERROR_META_KEYS,
    "DiagnoseInitialAnswerError.meta",
  );
  assertNonEmptyString(
    input.meta.traceId,
    "DiagnoseInitialAnswerError.meta.traceId",
  );

  return input as DiagnoseInitialAnswerError;
}

export function parseDiagnoseInitialAnswerResponse(
  input: unknown,
): DiagnoseInitialAnswerResponse {
  assertRecord(input, "DiagnoseInitialAnswerResponse");

  if (input.ok === true) {
    return parseDiagnoseInitialAnswerSuccess(input);
  }

  if (input.ok === false) {
    return parseDiagnoseInitialAnswerError(input);
  }

  throw new TypeError("DiagnoseInitialAnswerResponse.ok must be a boolean.");
}
