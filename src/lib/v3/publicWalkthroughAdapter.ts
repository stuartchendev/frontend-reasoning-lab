import type { PracticeSessionFailure } from "../../domain/v3/practiceSession";
// @ts-expect-error Node's native TypeScript loader requires the .ts extension.
import { reactStateOwnershipQuestion } from "../../domain/v3/questionContent.ts";
// @ts-expect-error Node's native TypeScript loader requires the .ts extension.
import { flawedStateOwnershipAnswer, revisedStateOwnershipAnswer } from "../../data/v3/referencePracticeFixtures.ts";
// @ts-expect-error Node's native TypeScript loader requires the .ts extension.
import { publicWalkthroughComparison, publicWalkthroughDiagnosis } from "../../data/v3/publicWalkthroughFixtures.ts";
// @ts-expect-error Node's native TypeScript loader requires the .ts extension.
import { PracticeEvaluationAdapterError, type PracticeEvaluationAdapter } from "./practiceEvaluationAdapter.ts";

export type PracticeExecutionMode =
  | "live-model"
  | "public-walkthrough";

const UNSUPPORTED_WALKTHROUGH_INPUT = {
  code: "invalid-request",
  message:
    "The public walkthrough only replays the verified demo inputs.",
  retryable: false,
} as const satisfies PracticeSessionFailure;

const WALKTHROUGH_QUESTION_NOT_FOUND = {
  code: "question-not-found",
  message: "The public walkthrough starts from the reference question.",
  retryable: false,
} as const satisfies PracticeSessionFailure;

function fail(failure: PracticeSessionFailure): never {
  throw new PracticeEvaluationAdapterError(failure);
}

function assertReferenceQuestion(
  questionId: string,
  questionVersion: number,
): void {
  if (
    questionId !== reactStateOwnershipQuestion.id ||
    questionVersion !== reactStateOwnershipQuestion.version
  ) {
    return fail(WALKTHROUGH_QUESTION_NOT_FOUND);
  }
}

export function isVerifiedWalkthroughAnswer(
  questionId: string,
  answer: string,
): boolean {
  return (
    questionId === reactStateOwnershipQuestion.id &&
    answer === flawedStateOwnershipAnswer
  );
}

export function isVerifiedWalkthroughRevision(
  questionId: string,
  originalAnswer: string,
  revisedAnswer: string,
): boolean {
  return (
    isVerifiedWalkthroughAnswer(questionId, originalAnswer) &&
    revisedAnswer === revisedStateOwnershipAnswer
  );
}

export function canRunPracticeAnswer(
  mode: PracticeExecutionMode,
  questionId: string,
  answer: string,
): boolean {
  return (
    mode === "live-model" ||
    isVerifiedWalkthroughAnswer(questionId, answer)
  );
}

export function canRunPracticeRevision(
  mode: PracticeExecutionMode,
  questionId: string,
  originalAnswer: string,
  revisedAnswer: string,
): boolean {
  return (
    mode === "live-model" ||
    isVerifiedWalkthroughRevision(
      questionId,
      originalAnswer,
      revisedAnswer,
    )
  );
}

export function executePracticeCommandIfAllowed(
  isAllowed: boolean,
  command: () => void,
): boolean {
  if (!isAllowed) return false;

  command();
  return true;
}

export function createPublicWalkthroughPracticeEvaluationAdapter(): PracticeEvaluationAdapter {
  return {
    async diagnose(input) {
      assertReferenceQuestion(input.questionId, input.questionVersion);

      if (
        !isVerifiedWalkthroughAnswer(
          input.questionId,
          input.originalAnswer,
        )
      ) {
        return fail(UNSUPPORTED_WALKTHROUGH_INPUT);
      }

      return publicWalkthroughDiagnosis;
    },

    async compareRevision(input) {
      assertReferenceQuestion(input.questionId, input.questionVersion);

      if (
        input.diagnosis !== publicWalkthroughDiagnosis ||
        !isVerifiedWalkthroughRevision(
          input.questionId,
          input.originalAnswer,
          input.revisedAnswer,
        )
      ) {
        return fail(UNSUPPORTED_WALKTHROUGH_INPUT);
      }

      return publicWalkthroughComparison;
    },
  };
}
