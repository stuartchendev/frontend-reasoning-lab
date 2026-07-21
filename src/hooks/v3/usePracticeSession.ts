import { useCallback, useReducer, useRef } from "react";
import type { NeedsFollowUpDiagnosisResult } from "../../domain/v3/evaluationResults";
import type {
  PracticeSessionFailure,
  PracticeSessionState,
} from "../../domain/v3/practiceSession";
import {
  createPracticeSessionState,
  practiceSessionReducer,
} from "../../domain/v3/practiceSessionReducer";
import type { QuestionContent } from "../../domain/v3/questionContent";
import {
  PracticeEvaluationAdapterError,
  type PracticeEvaluationAdapter,
} from "../../lib/v3/practiceEvaluationAdapter";

export type UsePracticeSessionOptions = {
  readonly initialQuestion: QuestionContent;
  readonly adapter: PracticeEvaluationAdapter;
  readonly createSessionId?: () => string;
  readonly createRequestId?: () => string;
};

export type UsePracticeSessionResult = {
  readonly state: PracticeSessionState;
  readonly startQuestion: (question: QuestionContent) => void;
  readonly setAnswerDraft: (value: string) => void;
  readonly submitAnswer: () => Promise<void>;
  readonly retryDiagnosis: () => Promise<void>;
  readonly editAfterDiagnosisFailure: () => void;
  readonly setRevisionDraft: (value: string) => void;
  readonly submitRevision: () => Promise<void>;
  readonly retryRevisionReview: () => Promise<void>;
  readonly editAfterRevisionReviewFailure: () => void;
};

type ActiveRequest = {
  readonly sessionId: string;
  readonly requestId: string;
};

type DiagnosisOperationContext = {
  readonly sessionId: string;
  readonly questionId: string;
  readonly questionVersion: number;
  readonly originalAnswer: string;
};

type RevisionOperationContext = DiagnosisOperationContext & {
  readonly diagnosis: NeedsFollowUpDiagnosisResult;
  readonly revisedAnswer: string;
};

const UNEXPECTED_EVALUATION_FAILURE = {
  code: "server-error",
  message: "The practice evaluation could not be completed. Please try again.",
  retryable: true,
} as const satisfies PracticeSessionFailure;

function createBrowserId(): string {
  return globalThis.crypto.randomUUID();
}

function assertGeneratedRequestId(requestId: string): void {
  if (typeof requestId !== "string" || !requestId.trim()) {
    throw new TypeError("Generated requestId must be a non-empty string.");
  }
}

function toPracticeSessionFailure(error: unknown): PracticeSessionFailure {
  if (error instanceof PracticeEvaluationAdapterError) {
    return error.failure;
  }

  return UNEXPECTED_EVALUATION_FAILURE;
}

function invalidCommand(command: string, phase: PracticeSessionState["phase"]): never {
  throw new Error(
    'Practice session command "' +
      command +
      '" is not valid from phase "' +
      phase +
      '".',
  );
}

export function usePracticeSession({
  initialQuestion,
  adapter,
  createSessionId = createBrowserId,
  createRequestId = createBrowserId,
}: UsePracticeSessionOptions): UsePracticeSessionResult {
  const [state, dispatch] = useReducer(
    practiceSessionReducer,
    { createSessionId, initialQuestion },
    ({ createSessionId: createInitialSessionId, initialQuestion }) =>
      createPracticeSessionState(createInitialSessionId(), initialQuestion),
  );
  const activeDiagnosisRequestRef = useRef<ActiveRequest | null>(null);
  const activeRevisionRequestRef = useRef<ActiveRequest | null>(null);

  const runDiagnosis = useCallback(
    async (
      context: DiagnosisOperationContext,
      operation: "submit" | "retry",
    ): Promise<void> => {
      if (
        activeDiagnosisRequestRef.current?.sessionId === context.sessionId
      ) {
        return;
      }

      const requestId = createRequestId();
      assertGeneratedRequestId(requestId);

      const activeRequest = {
        sessionId: context.sessionId,
        requestId,
      };
      activeDiagnosisRequestRef.current = activeRequest;

      dispatch(
        operation === "submit"
          ? { type: "answer-submitted", requestId }
          : { type: "diagnosis-retried", requestId },
      );

      try {
        const diagnosis = await adapter.diagnose({
          ...context,
          requestId,
        });

        dispatch({
          type: "diagnosis-succeeded",
          sessionId: context.sessionId,
          requestId,
          diagnosis,
        });
      } catch (error) {
        dispatch({
          type: "diagnosis-failed",
          sessionId: context.sessionId,
          requestId,
          failure: toPracticeSessionFailure(error),
        });
      } finally {
        const currentRequest = activeDiagnosisRequestRef.current;

        if (
          currentRequest?.sessionId === activeRequest.sessionId &&
          currentRequest.requestId === activeRequest.requestId
        ) {
          activeDiagnosisRequestRef.current = null;
        }
      }
    },
    [adapter, createRequestId],
  );

  const runRevisionComparison = useCallback(
    async (
      context: RevisionOperationContext,
      operation: "submit" | "retry",
    ): Promise<void> => {
      if (
        activeRevisionRequestRef.current?.sessionId === context.sessionId
      ) {
        return;
      }

      const requestId = createRequestId();
      assertGeneratedRequestId(requestId);

      const activeRequest = {
        sessionId: context.sessionId,
        requestId,
      };
      activeRevisionRequestRef.current = activeRequest;

      dispatch(
        operation === "submit"
          ? { type: "revision-submitted", requestId }
          : { type: "revision-review-retried", requestId },
      );

      try {
        const comparison = await adapter.compareRevision({
          ...context,
          requestId,
        });

        dispatch({
          type: "revision-reviewed",
          sessionId: context.sessionId,
          requestId,
          comparison,
        });
      } catch (error) {
        dispatch({
          type: "revision-review-failed",
          sessionId: context.sessionId,
          requestId,
          failure: toPracticeSessionFailure(error),
        });
      } finally {
        const currentRequest = activeRevisionRequestRef.current;

        if (
          currentRequest?.sessionId === activeRequest.sessionId &&
          currentRequest.requestId === activeRequest.requestId
        ) {
          activeRevisionRequestRef.current = null;
        }
      }
    },
    [adapter, createRequestId],
  );

  const startQuestion = useCallback(
    (question: QuestionContent) => {
      dispatch({
        type: "start-question",
        sessionId: createSessionId(),
        questionId: question.id,
        questionVersion: question.version,
      });
    },
    [createSessionId],
  );

  const setAnswerDraft = useCallback((value: string) => {
    dispatch({ type: "answer-draft-changed", answerDraft: value });
  }, []);

  const submitAnswer = useCallback(async (): Promise<void> => {
    if (state.phase !== "answering") {
      return invalidCommand("submitAnswer", state.phase);
    }

    if (!state.answerDraft.trim()) {
      throw new TypeError("answerDraft must be a non-empty string.");
    }

    await runDiagnosis(
      {
        sessionId: state.sessionId,
        questionId: state.questionId,
        questionVersion: state.questionVersion,
        originalAnswer: state.answerDraft,
      },
      "submit",
    );
  }, [runDiagnosis, state]);

  const retryDiagnosis = useCallback(async (): Promise<void> => {
    if (state.phase !== "diagnosis-failed") {
      return invalidCommand("retryDiagnosis", state.phase);
    }

    await runDiagnosis(
      {
        sessionId: state.sessionId,
        questionId: state.questionId,
        questionVersion: state.questionVersion,
        originalAnswer: state.originalAnswer,
      },
      "retry",
    );
  }, [runDiagnosis, state]);

  const editAfterDiagnosisFailure = useCallback(() => {
    dispatch({ type: "diagnosis-edit-requested" });
  }, []);

  const setRevisionDraft = useCallback((value: string) => {
    dispatch({ type: "revision-draft-changed", revisionDraft: value });
  }, []);

  const submitRevision = useCallback(async (): Promise<void> => {
    if (state.phase !== "revising") {
      return invalidCommand("submitRevision", state.phase);
    }

    if (!state.revisionDraft.trim()) {
      throw new TypeError("revisionDraft must be a non-empty string.");
    }

    await runRevisionComparison(
      {
        sessionId: state.sessionId,
        questionId: state.questionId,
        questionVersion: state.questionVersion,
        diagnosis: state.diagnosis,
        originalAnswer: state.originalAnswer,
        revisedAnswer: state.revisionDraft,
      },
      "submit",
    );
  }, [runRevisionComparison, state]);

  const retryRevisionReview = useCallback(async (): Promise<void> => {
    if (state.phase !== "revision-review-failed") {
      return invalidCommand("retryRevisionReview", state.phase);
    }

    await runRevisionComparison(
      {
        sessionId: state.sessionId,
        questionId: state.questionId,
        questionVersion: state.questionVersion,
        diagnosis: state.diagnosis,
        originalAnswer: state.originalAnswer,
        revisedAnswer: state.revisedAnswer,
      },
      "retry",
    );
  }, [runRevisionComparison, state]);

  const editAfterRevisionReviewFailure = useCallback(() => {
    dispatch({ type: "revision-edit-requested" });
  }, []);

  return {
    state,
    startQuestion,
    setAnswerDraft,
    submitAnswer,
    retryDiagnosis,
    editAfterDiagnosisFailure,
    setRevisionDraft,
    submitRevision,
    retryRevisionReview,
    editAfterRevisionReviewFailure,
  };
}
