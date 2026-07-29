// @ts-expect-error Node's native TypeScript loader requires the .ts extension.
import { createDiagnoseInitialAnswerService, type DiagnoseInitialAnswerService } from "./diagnoseInitialAnswerService.ts";
// @ts-expect-error Node's native TypeScript loader requires the .ts extension.
import { createHttpPracticeEvaluationAdapter } from "./httpPracticeEvaluationAdapter.ts";
import type { PracticeEvaluationAdapter } from "./practiceEvaluationAdapter";
// @ts-expect-error Node's native TypeScript loader requires the .ts extension.
import { createPublicWalkthroughPracticeEvaluationAdapter, type PracticeExecutionMode } from "./publicWalkthroughAdapter.ts";
// @ts-expect-error Node's native TypeScript loader requires the .ts extension.
import { createReviewRevisedAnswerService, type ReviewRevisedAnswerService } from "./reviewRevisedAnswerService.ts";

type PracticeEvaluationCompositionOptions = {
  readonly isDevelopment: boolean;
  readonly diagnoseInitialAnswer?: DiagnoseInitialAnswerService;
  readonly reviewRevisedAnswer?: ReviewRevisedAnswerService;
};

export type PracticeEvaluationComposition = {
  readonly mode: PracticeExecutionMode;
  readonly adapter: PracticeEvaluationAdapter;
};

export function createPracticeEvaluationComposition({
  isDevelopment,
  diagnoseInitialAnswer,
  reviewRevisedAnswer,
}: PracticeEvaluationCompositionOptions): PracticeEvaluationComposition {
  if (!isDevelopment) {
    return {
      mode: "public-walkthrough",
      adapter: createPublicWalkthroughPracticeEvaluationAdapter(),
    };
  }

  return {
    mode: "live-model",
    adapter: createHttpPracticeEvaluationAdapter(
      diagnoseInitialAnswer ?? createDiagnoseInitialAnswerService(),
      reviewRevisedAnswer ?? createReviewRevisedAnswerService(),
    ),
  };
}
