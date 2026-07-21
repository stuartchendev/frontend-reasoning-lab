import type {
  DiagnoseInitialAnswerRequest,
  DiagnoseInitialAnswerResponse,
} from "../../domain/v3/diagnosisApi";
import type { PracticeSessionFailure } from "../../domain/v3/practiceSession";
import type {
  PracticeEvaluationAdapter,
} from "./practiceEvaluationAdapter";
import type {
  DiagnoseInitialAnswerService,
} from "./diagnoseInitialAnswerService";
// @ts-expect-error Node's native TypeScript loader requires the .ts extension.
import { DIAGNOSE_INITIAL_ANSWER_CONTRACT_VERSION } from "../../domain/v3/diagnosisApi.ts";
// @ts-expect-error Node's native TypeScript loader requires the .ts extension.
import { PracticeEvaluationAdapterError } from "./practiceEvaluationAdapter.ts";

const SAFE_BROWSER_SERVICE_FAILURE = {
  code: "server-error",
  message: "The diagnosis service could not be completed. Please try again.",
  retryable: true,
} as const satisfies PracticeSessionFailure;

const REVISION_OPERATION_UNAVAILABLE_FAILURE = {
  code: "operation-unavailable",
  message: "Revision review is not available yet.",
  retryable: false,
} as const satisfies PracticeSessionFailure;

export function createHttpPracticeEvaluationAdapter(
  diagnoseInitialAnswer: DiagnoseInitialAnswerService,
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
          SAFE_BROWSER_SERVICE_FAILURE,
        );
      }

      if (!response.ok) {
        throw new PracticeEvaluationAdapterError(response.error);
      }

      return response.result;
    },

    async compareRevision() {
      throw new PracticeEvaluationAdapterError(
        REVISION_OPERATION_UNAVAILABLE_FAILURE,
      );
    },
  };
}
