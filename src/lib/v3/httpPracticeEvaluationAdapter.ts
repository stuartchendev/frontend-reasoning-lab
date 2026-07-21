import type {
  DiagnoseInitialAnswerRequest,
  DiagnoseInitialAnswerResponse,
} from "../../domain/v3/diagnosisApi";
import type {
  ReviewRevisedAnswerRequest,
  ReviewRevisedAnswerResponse,
} from "../../domain/v3/revisionReviewApi";
import type { PracticeSessionFailure } from "../../domain/v3/practiceSession";
import type {
  PracticeEvaluationAdapter,
} from "./practiceEvaluationAdapter";
import type {
  DiagnoseInitialAnswerService,
} from "./diagnoseInitialAnswerService";
import type {
  ReviewRevisedAnswerService,
} from "./reviewRevisedAnswerService";
// @ts-expect-error Node's native TypeScript loader requires the .ts extension.
import { DIAGNOSE_INITIAL_ANSWER_CONTRACT_VERSION } from "../../domain/v3/diagnosisApi.ts";
// @ts-expect-error Node's native TypeScript loader requires the .ts extension.
import { REVIEW_REVISED_ANSWER_CONTRACT_VERSION } from "../../domain/v3/revisionReviewApi.ts";
// @ts-expect-error Node's native TypeScript loader requires the .ts extension.
import { PracticeEvaluationAdapterError } from "./practiceEvaluationAdapter.ts";

const SAFE_DIAGNOSIS_SERVICE_FAILURE = {
  code: "server-error",
  message: "The diagnosis service could not be completed. Please try again.",
  retryable: true,
} as const satisfies PracticeSessionFailure;

const SAFE_REVISION_REVIEW_SERVICE_FAILURE = {
  code: "server-error",
  message:
    "The revision-review service could not be completed. Please try again.",
  retryable: true,
} as const satisfies PracticeSessionFailure;

export function createHttpPracticeEvaluationAdapter(
  diagnoseInitialAnswer: DiagnoseInitialAnswerService,
  reviewRevisedAnswer: ReviewRevisedAnswerService,
): PracticeEvaluationAdapter {
  return {
    async diagnose(input) {
      const request = {
        contractVersion: DIAGNOSE_INITIAL_ANSWER_CONTRACT_VERSION,
        questionId: input.questionId,
        questionVersion: input.questionVersion,
        answer: input.originalAnswer,
      } as const satisfies DiagnoseInitialAnswerRequest;
      let response: DiagnoseInitialAnswerResponse;

      try {
        response = await diagnoseInitialAnswer(request);
      } catch {
        throw new PracticeEvaluationAdapterError(
          SAFE_DIAGNOSIS_SERVICE_FAILURE,
        );
      }

      if (!response.ok) {
        throw new PracticeEvaluationAdapterError(response.error);
      }

      return response.result;
    },

    async compareRevision(input) {
      const request = {
        contractVersion: REVIEW_REVISED_ANSWER_CONTRACT_VERSION,
        questionId: input.questionId,
        questionVersion: input.questionVersion,
        originalAnswer: input.originalAnswer,
        revisedAnswer: input.revisedAnswer,
        diagnosis: input.diagnosis,
      } as const satisfies ReviewRevisedAnswerRequest;
      let response: ReviewRevisedAnswerResponse;

      try {
        response = await reviewRevisedAnswer(request);
      } catch {
        throw new PracticeEvaluationAdapterError(
          SAFE_REVISION_REVIEW_SERVICE_FAILURE,
        );
      }

      if (!response.ok) {
        throw new PracticeEvaluationAdapterError(response.error);
      }

      return response.result;
    },
  };
}
