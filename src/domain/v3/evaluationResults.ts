const CRITERION_ASSESSMENT_STATUSES = [
  "met",
  "partially-met",
  "missing",
  "not-applicable",
] as const;

const INITIAL_DIAGNOSIS_OUTCOMES = [
  "needs-follow-up",
  "sufficient",
] as const;

export type CriterionAssessmentStatus =
  (typeof CRITERION_ASSESSMENT_STATUSES)[number];

export type CriterionAssessment = {
  readonly criterionId: string;
  readonly status: CriterionAssessmentStatus;
};

export type PrimaryReasoningGap = {
  readonly criterionId: string;
  readonly explanation: string;
  readonly learnerEvidence: string;
  readonly whyItMatters: string;
};

export type NeedsFollowUpDiagnosisResult = {
  readonly outcome: "needs-follow-up";
  readonly assessments: readonly CriterionAssessment[];
  readonly primaryGap: PrimaryReasoningGap;
  readonly followUpQuestion: string;
};

export type SufficientDiagnosisResult = {
  readonly outcome: "sufficient";
  readonly assessments: readonly CriterionAssessment[];
};

export type InitialDiagnosisResult =
  | NeedsFollowUpDiagnosisResult
  | SufficientDiagnosisResult;

const NEEDS_FOLLOW_UP_KEYS = new Set([
  "outcome",
  "assessments",
  "primaryGap",
  "followUpQuestion",
]);

const SUFFICIENT_KEYS = new Set(["outcome", "assessments"]);
const ASSESSMENT_KEYS = new Set(["criterionId", "status"]);
const PRIMARY_GAP_KEYS = new Set([
  "criterionId",
  "explanation",
  "learnerEvidence",
  "whyItMatters",
]);

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

function isSupportedValue<T extends readonly string[]>(
  value: unknown,
  supportedValues: T,
): value is T[number] {
  return (
    typeof value === "string" &&
    (supportedValues as readonly string[]).includes(value)
  );
}

function assertAssessment(value: unknown): asserts value is CriterionAssessment {
  assertRecord(value, "CriterionAssessment");
  assertExactKeys(value, ASSESSMENT_KEYS, "CriterionAssessment");
  assertNonEmptyString(
    value.criterionId,
    "CriterionAssessment.criterionId",
  );

  if (!isSupportedValue(value.status, CRITERION_ASSESSMENT_STATUSES)) {
    throw new TypeError("CriterionAssessment.status has an unsupported value.");
  }
}

function assertAssessments(
  value: unknown,
): asserts value is readonly CriterionAssessment[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(
      "InitialDiagnosisResult.assessments must be a non-empty array.",
    );
  }

  value.forEach(assertAssessment);
}

function assertPrimaryGap(
  value: unknown,
): asserts value is PrimaryReasoningGap {
  assertRecord(value, "PrimaryReasoningGap");
  assertExactKeys(value, PRIMARY_GAP_KEYS, "PrimaryReasoningGap");
  assertNonEmptyString(
    value.criterionId,
    "PrimaryReasoningGap.criterionId",
  );
  assertNonEmptyString(
    value.explanation,
    "PrimaryReasoningGap.explanation",
  );
  assertNonEmptyString(
    value.learnerEvidence,
    "PrimaryReasoningGap.learnerEvidence",
  );
  assertNonEmptyString(
    value.whyItMatters,
    "PrimaryReasoningGap.whyItMatters",
  );
}

export function parseInitialDiagnosisResult(
  input: unknown,
): InitialDiagnosisResult {
  assertRecord(input, "InitialDiagnosisResult");

  if (!isSupportedValue(input.outcome, INITIAL_DIAGNOSIS_OUTCOMES)) {
    throw new TypeError("InitialDiagnosisResult.outcome has an unsupported value.");
  }

  if (input.outcome === "needs-follow-up") {
    assertExactKeys(
      input,
      NEEDS_FOLLOW_UP_KEYS,
      "NeedsFollowUpDiagnosisResult",
    );
    assertAssessments(input.assessments);
    assertPrimaryGap(input.primaryGap);
    assertNonEmptyString(
      input.followUpQuestion,
      "NeedsFollowUpDiagnosisResult.followUpQuestion",
    );
  } else {
    assertExactKeys(input, SUFFICIENT_KEYS, "SufficientDiagnosisResult");
    assertAssessments(input.assessments);
  }

  return input as InitialDiagnosisResult;
}
