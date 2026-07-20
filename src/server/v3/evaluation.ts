// @ts-expect-error Node's native TypeScript loader requires the .ts extension.
import { reactStateOwnershipQuestion } from "../../domain/v3/questionContent.ts";
import type {
  CriterionAssessment,
  InitialDiagnosisResult,
} from "../../domain/v3/evaluationResults";

const RUBRIC_CRITERION_ROLES = ["core", "supporting"] as const;

export type RubricCriterionRole =
  (typeof RUBRIC_CRITERION_ROLES)[number];

export type RubricCriterion = {
  readonly id: string;
  readonly label: string;
  readonly role: RubricCriterionRole;
  readonly evaluationGuidance: string;
  readonly requiredForSufficient: boolean;
  readonly prerequisiteCriterionIds: readonly string[];
  readonly allowsNotApplicable: boolean;
};

export type QuestionEvaluationSpec = {
  readonly questionId: string;
  readonly questionVersion: number;
  readonly criteria: readonly RubricCriterion[];
};

const QUESTION_EVALUATION_SPEC_KEYS = new Set([
  "questionId",
  "questionVersion",
  "criteria",
]);

const RUBRIC_CRITERION_KEYS = new Set([
  "id",
  "label",
  "role",
  "evaluationGuidance",
  "requiredForSufficient",
  "prerequisiteCriterionIds",
  "allowsNotApplicable",
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

function assertRubricCriterion(
  value: unknown,
): asserts value is RubricCriterion {
  assertRecord(value, "RubricCriterion");
  assertExactKeys(value, RUBRIC_CRITERION_KEYS, "RubricCriterion");
  assertNonEmptyString(value.id, "RubricCriterion.id");
  assertNonEmptyString(value.label, "RubricCriterion.label");

  if (!isSupportedValue(value.role, RUBRIC_CRITERION_ROLES)) {
    throw new TypeError("RubricCriterion.role has an unsupported value.");
  }

  assertNonEmptyString(
    value.evaluationGuidance,
    "RubricCriterion.evaluationGuidance",
  );

  if (typeof value.requiredForSufficient !== "boolean") {
    throw new TypeError(
      "RubricCriterion.requiredForSufficient must be a boolean.",
    );
  }

  if (
    !Array.isArray(value.prerequisiteCriterionIds) ||
    !value.prerequisiteCriterionIds.every(
      (criterionId) =>
        typeof criterionId === "string" && Boolean(criterionId.trim()),
    )
  ) {
    throw new TypeError(
      "RubricCriterion.prerequisiteCriterionIds must contain non-empty strings.",
    );
  }

  if (typeof value.allowsNotApplicable !== "boolean") {
    throw new TypeError(
      "RubricCriterion.allowsNotApplicable must be a boolean.",
    );
  }
}

function assertCriterionGraph(criteria: readonly RubricCriterion[]): void {
  const criteriaById = new Map<string, RubricCriterion>();

  for (const criterion of criteria) {
    if (criteriaById.has(criterion.id)) {
      throw new TypeError(
        'QuestionEvaluationSpec contains duplicate criterion ID "' +
          criterion.id +
          '".',
      );
    }

    criteriaById.set(criterion.id, criterion);

    if (
      new Set(criterion.prerequisiteCriterionIds).size !==
      criterion.prerequisiteCriterionIds.length
    ) {
      throw new TypeError(
        'RubricCriterion "' +
          criterion.id +
          '" contains duplicate prerequisite IDs.',
      );
    }

    if (
      criterion.requiredForSufficient &&
      criterion.allowsNotApplicable
    ) {
      throw new TypeError(
        'Required criterion "' +
          criterion.id +
          '" cannot allow not-applicable.',
      );
    }
  }

  for (const criterion of criteria) {
    for (const prerequisiteId of criterion.prerequisiteCriterionIds) {
      if (!criteriaById.has(prerequisiteId)) {
        throw new TypeError(
          'RubricCriterion "' +
            criterion.id +
            '" references unknown prerequisite "' +
            prerequisiteId +
            '".',
        );
      }

      if (prerequisiteId === criterion.id) {
        throw new TypeError(
          'RubricCriterion "' + criterion.id + '" cannot depend on itself.',
        );
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(criterionId: string): void {
    if (visiting.has(criterionId)) {
      throw new TypeError(
        "QuestionEvaluationSpec prerequisite graph must be acyclic.",
      );
    }

    if (visited.has(criterionId)) return;

    visiting.add(criterionId);

    const criterion = criteriaById.get(criterionId);

    if (!criterion) {
      throw new TypeError(
        'QuestionEvaluationSpec criterion "' + criterionId + '" was not found.',
      );
    }

    criterion.prerequisiteCriterionIds.forEach(visit);
    visiting.delete(criterionId);
    visited.add(criterionId);
  }

  criteria.forEach((criterion) => visit(criterion.id));
}

export function parseQuestionEvaluationSpec(
  input: unknown,
): QuestionEvaluationSpec {
  assertRecord(input, "QuestionEvaluationSpec");
  assertExactKeys(
    input,
    QUESTION_EVALUATION_SPEC_KEYS,
    "QuestionEvaluationSpec",
  );
  assertNonEmptyString(
    input.questionId,
    "QuestionEvaluationSpec.questionId",
  );

  if (
    typeof input.questionVersion !== "number" ||
    !Number.isInteger(input.questionVersion) ||
    input.questionVersion <= 0
  ) {
    throw new TypeError(
      "QuestionEvaluationSpec.questionVersion must be a positive integer.",
    );
  }

  if (!Array.isArray(input.criteria) || input.criteria.length === 0) {
    throw new TypeError(
      "QuestionEvaluationSpec.criteria must be a non-empty array.",
    );
  }

  input.criteria.forEach(assertRubricCriterion);
  assertCriterionGraph(input.criteria);

  return input as QuestionEvaluationSpec;
}

function buildAssessmentMap(
  result: InitialDiagnosisResult,
  spec: QuestionEvaluationSpec,
): Map<string, CriterionAssessment> {
  const criteriaById = new Map(
    spec.criteria.map((criterion) => [criterion.id, criterion]),
  );
  const assessmentsById = new Map<string, CriterionAssessment>();

  for (const assessment of result.assessments) {
    const criterion = criteriaById.get(assessment.criterionId);

    if (!criterion) {
      throw new TypeError(
        'InitialDiagnosisResult assesses unknown criterion "' +
          assessment.criterionId +
          '".',
      );
    }

    if (assessmentsById.has(assessment.criterionId)) {
      throw new TypeError(
        'InitialDiagnosisResult contains duplicate assessment for "' +
          assessment.criterionId +
          '".',
      );
    }

    if (
      assessment.status === "not-applicable" &&
      !criterion.allowsNotApplicable
    ) {
      throw new TypeError(
        'Criterion "' +
          assessment.criterionId +
          '" does not allow not-applicable.',
      );
    }

    assessmentsById.set(assessment.criterionId, assessment);
  }

  for (const criterion of spec.criteria) {
    if (!assessmentsById.has(criterion.id)) {
      throw new TypeError(
        'InitialDiagnosisResult is missing assessment for "' +
          criterion.id +
          '".',
      );
    }
  }

  return assessmentsById;
}

export function validateInitialDiagnosisResult(
  result: InitialDiagnosisResult,
  context: {
    readonly spec: QuestionEvaluationSpec;
    readonly normalizedAnswer: string;
  },
): InitialDiagnosisResult {
  if (typeof context.normalizedAnswer !== "string") {
    throw new TypeError("normalizedAnswer must be a string.");
  }

  const assessmentsById = buildAssessmentMap(result, context.spec);

  if (result.outcome === "needs-follow-up") {
    const gapAssessment = assessmentsById.get(
      result.primaryGap.criterionId,
    );

    if (
      !gapAssessment ||
      (gapAssessment.status !== "missing" &&
        gapAssessment.status !== "partially-met")
    ) {
      throw new TypeError(
        "Primary gap must reference a missing or partially-met criterion.",
      );
    }

    if (!context.normalizedAnswer.includes(result.primaryGap.learnerEvidence)) {
      throw new TypeError(
        "Primary-gap learner evidence must occur in normalizedAnswer.",
      );
    }
  } else {
    for (const criterion of context.spec.criteria) {
      if (
        criterion.requiredForSufficient &&
        assessmentsById.get(criterion.id)?.status !== "met"
      ) {
        throw new TypeError(
          'Required criterion "' + criterion.id + '" must be met.',
        );
      }
    }
  }

  return result;
}

export const reactStateOwnershipCriterionIds = {
  sourceOfTruth: "identify-source-of-truth",
  dataFlow: "explain-data-flow",
  avoidDuplicatedState: "avoid-duplicated-state",
} as const;

export const reactStateOwnershipEvaluationSpec = {
  questionId: reactStateOwnershipQuestion.id,
  questionVersion: reactStateOwnershipQuestion.version,
  criteria: [
    {
      id: reactStateOwnershipCriterionIds.sourceOfTruth,
      label: "Source of truth",
      role: "core",
      evaluationGuidance:
        "The answer identifies one application-level owner for the canonical selectedQuestionId.",
      requiredForSufficient: true,
      prerequisiteCriterionIds: [],
      allowsNotApplicable: false,
    },
    {
      id: reactStateOwnershipCriterionIds.dataFlow,
      label: "Selection data flow",
      role: "core",
      evaluationGuidance:
        "The answer explains that the navigator receives selection data, emits a change request, and the owning parent derives the selected question from its ID.",
      requiredForSufficient: true,
      prerequisiteCriterionIds: [
        reactStateOwnershipCriterionIds.sourceOfTruth,
      ],
      allowsNotApplicable: false,
    },
    {
      id: reactStateOwnershipCriterionIds.avoidDuplicatedState,
      label: "Avoid duplicated selection state",
      role: "supporting",
      evaluationGuidance:
        "The answer explains that child components must not keep independent canonical copies of question selection because those copies can diverge.",
      requiredForSufficient: false,
      prerequisiteCriterionIds: [
        reactStateOwnershipCriterionIds.sourceOfTruth,
      ],
      allowsNotApplicable: false,
    },
  ],
} as const satisfies QuestionEvaluationSpec;
