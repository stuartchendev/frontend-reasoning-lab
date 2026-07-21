import type {
  InitialDiagnosisResult,
  NeedsFollowUpDiagnosisResult,
  RevisionComparisonResult,
} from "../../domain/v3/evaluationResults";
import type { PracticeSessionFailure } from "../../domain/v3/practiceSession";
// @ts-expect-error Node's native TypeScript loader requires the .ts extension.
import { reactStateOwnershipQuestion } from "../../domain/v3/questionContent.ts";
// @ts-expect-error Node's native TypeScript loader requires the .ts extension.
import * as referencePracticeFixtures from "../../data/v3/referencePracticeFixtures.ts";

const {
  validNeedsFollowUpDiagnosis,
  validResolvedRevisionComparison,
  validSufficientDiagnosis,
} = referencePracticeFixtures;

export type DiagnosePracticeAnswerInput = {
  readonly sessionId: string;
  readonly requestId: string;
  readonly questionId: string;
  readonly questionVersion: number;
  readonly originalAnswer: string;
};

export type ComparePracticeRevisionInput = {
  readonly sessionId: string;
  readonly requestId: string;
  readonly questionId: string;
  readonly questionVersion: number;
  readonly diagnosis: NeedsFollowUpDiagnosisResult;
  readonly originalAnswer: string;
  readonly revisedAnswer: string;
};

export interface PracticeEvaluationAdapter {
  diagnose(
    input: DiagnosePracticeAnswerInput,
  ): Promise<InitialDiagnosisResult>;
  compareRevision(
    input: ComparePracticeRevisionInput,
  ): Promise<RevisionComparisonResult>;
}

const DETERMINISTIC_DIAGNOSIS_PATHS = [
  "needs-follow-up",
  "initial-sufficient",
  "fail-once-then-needs-follow-up",
] as const;

const DETERMINISTIC_REVISION_PATHS = [
  "resolved",
  "fail-once-then-resolved",
] as const;

export type DeterministicDiagnosisPath =
  (typeof DETERMINISTIC_DIAGNOSIS_PATHS)[number];

export type DeterministicRevisionPath =
  (typeof DETERMINISTIC_REVISION_PATHS)[number];

export type DeterministicPracticeEvaluationOptions = {
  readonly diagnosisPath: DeterministicDiagnosisPath;
  readonly revisionPath: DeterministicRevisionPath;
};

const DIAGNOSIS_FAILURE = {
  code: "model-unavailable",
  message: "The reasoning diagnosis is temporarily unavailable.",
  retryable: true,
} as const satisfies PracticeSessionFailure;

const REVISION_FAILURE = {
  code: "invalid-model-output",
  message: "The revision comparison could not be validated.",
  retryable: true,
} as const satisfies PracticeSessionFailure;

const QUESTION_NOT_FOUND_FAILURE = {
  code: "question-not-found",
  message: "The requested practice question is not available.",
  retryable: false,
} as const satisfies PracticeSessionFailure;

const QUESTION_VERSION_MISMATCH_FAILURE = {
  code: "question-version-mismatch",
  message: "The practice question version is not supported.",
  retryable: false,
} as const satisfies PracticeSessionFailure;

export class PracticeEvaluationAdapterError extends Error {
  readonly failure: PracticeSessionFailure;

  constructor(failure: PracticeSessionFailure) {
    super(failure.message);
    this.name = "PracticeEvaluationAdapterError";
    this.failure = failure;
  }
}

function assertReferenceQuestion(
  input: Pick<DiagnosePracticeAnswerInput, "questionId" | "questionVersion">,
): void {
  if (input.questionId !== reactStateOwnershipQuestion.id) {
    throw new PracticeEvaluationAdapterError(QUESTION_NOT_FOUND_FAILURE);
  }

  if (input.questionVersion !== reactStateOwnershipQuestion.version) {
    throw new PracticeEvaluationAdapterError(
      QUESTION_VERSION_MISMATCH_FAILURE,
    );
  }
}

// Development/test adapter only. It must never be used as a production fallback.
export function createDeterministicPracticeEvaluationAdapter(
  options: DeterministicPracticeEvaluationOptions,
): PracticeEvaluationAdapter {
  const diagnosisFailuresBySession = new Set<string>();
  const revisionFailuresBySession = new Set<string>();

  return {
    async diagnose(input) {
      assertReferenceQuestion(input);

      if (
        options.diagnosisPath === "fail-once-then-needs-follow-up" &&
        !diagnosisFailuresBySession.has(input.sessionId)
      ) {
        diagnosisFailuresBySession.add(input.sessionId);
        throw new PracticeEvaluationAdapterError(DIAGNOSIS_FAILURE);
      }

      if (options.diagnosisPath === "initial-sufficient") {
        return validSufficientDiagnosis;
      }

      return validNeedsFollowUpDiagnosis;
    },

    async compareRevision(input) {
      assertReferenceQuestion(input);

      if (
        options.revisionPath === "fail-once-then-resolved" &&
        !revisionFailuresBySession.has(input.sessionId)
      ) {
        revisionFailuresBySession.add(input.sessionId);
        throw new PracticeEvaluationAdapterError(REVISION_FAILURE);
      }

      return validResolvedRevisionComparison;
    },
  };
}
