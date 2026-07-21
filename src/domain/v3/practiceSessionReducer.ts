import type {
  InitialDiagnosisResult,
  RevisionComparisonResult,
} from "./evaluationResults";
import type {
  PracticeSessionFailure,
  PracticeSessionState,
} from "./practiceSession";
import type { QuestionContent } from "./questionContent";

type AnsweringPracticeSessionState = Extract<
  PracticeSessionState,
  { readonly phase: "answering" }
>;

type CorrelatedResponseIdentity = {
  readonly sessionId: string;
  readonly requestId: string;
};

export type PracticeSessionAction =
  | {
      readonly type: "start-question";
      readonly sessionId: string;
      readonly questionId: string;
      readonly questionVersion: number;
    }
  | {
      readonly type: "answer-draft-changed";
      readonly answerDraft: string;
    }
  | {
      readonly type: "answer-submitted";
      readonly requestId: string;
    }
  | (CorrelatedResponseIdentity & {
      readonly type: "diagnosis-succeeded";
      readonly diagnosis: InitialDiagnosisResult;
    })
  | (CorrelatedResponseIdentity & {
      readonly type: "diagnosis-failed";
      readonly failure: PracticeSessionFailure;
    })
  | {
      readonly type: "diagnosis-retried";
      readonly requestId: string;
    }
  | {
      readonly type: "diagnosis-edit-requested";
    }
  | {
      readonly type: "revision-draft-changed";
      readonly revisionDraft: string;
    }
  | {
      readonly type: "revision-submitted";
      readonly requestId: string;
    }
  | (CorrelatedResponseIdentity & {
      readonly type: "revision-reviewed";
      readonly comparison: RevisionComparisonResult;
    })
  | (CorrelatedResponseIdentity & {
      readonly type: "revision-review-failed";
      readonly failure: PracticeSessionFailure;
    })
  | {
      readonly type: "revision-review-retried";
      readonly requestId: string;
    }
  | {
      readonly type: "revision-edit-requested";
    };

function assertNonEmptyString(value: string, fieldName: string): void {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(fieldName + " must be a non-empty string.");
  }
}

function assertPositiveQuestionVersion(
  questionVersion: number,
  fieldName: string,
): void {
  if (
    typeof questionVersion !== "number" ||
    !Number.isInteger(questionVersion) ||
    questionVersion <= 0
  ) {
    throw new TypeError(
      fieldName + " must be a positive integer.",
    );
  }
}

function createAnsweringPracticeSessionState(
  sessionId: string,
  questionId: string,
  questionVersion: number,
  fieldPrefix: string,
): AnsweringPracticeSessionState {
  assertNonEmptyString(sessionId, fieldPrefix + "sessionId");
  assertNonEmptyString(questionId, fieldPrefix + "questionId");
  assertPositiveQuestionVersion(
    questionVersion,
    fieldPrefix + "questionVersion",
  );

  return {
    sessionId,
    questionId,
    questionVersion,
    phase: "answering",
    answerDraft: "",
  };
}

export function createPracticeSessionState(
  sessionId: string,
  question: QuestionContent,
): AnsweringPracticeSessionState {
  return createAnsweringPracticeSessionState(
    sessionId,
    question.id,
    question.version,
    "",
  );
}

function invalidTransition(
  state: PracticeSessionState,
  action: PracticeSessionAction,
): never {
  throw new Error(
    'Invalid practice session transition: action "' +
      action.type +
      '" is not valid from phase "' +
      state.phase +
      '".',
  );
}

function matchesActiveRequest(
  state: {
    readonly sessionId: string;
    readonly requestId: string;
  },
  action: CorrelatedResponseIdentity,
): boolean {
  return (
    action.sessionId === state.sessionId &&
    action.requestId === state.requestId
  );
}

export function practiceSessionReducer(
  state: PracticeSessionState,
  action: PracticeSessionAction,
): PracticeSessionState {
  if (action.type === "start-question") {
    const nextState = createAnsweringPracticeSessionState(
      action.sessionId,
      action.questionId,
      action.questionVersion,
      "start-question.",
    );

    if (action.sessionId === state.sessionId) {
      throw new TypeError(
        "start-question.sessionId must differ from the current sessionId.",
      );
    }

    return nextState;
  }

  if (
    (action.type === "diagnosis-succeeded" ||
      action.type === "diagnosis-failed" ||
      action.type === "revision-reviewed" ||
      action.type === "revision-review-failed") &&
    action.sessionId !== state.sessionId
  ) {
    return state;
  }

  const identity = {
    sessionId: state.sessionId,
    questionId: state.questionId,
    questionVersion: state.questionVersion,
  };

  switch (state.phase) {
    case "answering":
      switch (action.type) {
        case "answer-draft-changed":
          return {
            ...state,
            answerDraft: action.answerDraft,
          };

        case "answer-submitted":
          assertNonEmptyString(state.answerDraft, "answerDraft");
          assertNonEmptyString(
            action.requestId,
            "answer-submitted.requestId",
          );

          return {
            ...identity,
            phase: "diagnosing",
            originalAnswer: state.answerDraft,
            requestId: action.requestId,
          };

        default:
          return invalidTransition(state, action);
      }

    case "diagnosing":
      switch (action.type) {
        case "diagnosis-succeeded":
          if (!matchesActiveRequest(state, action)) return state;

          if (action.diagnosis.outcome === "needs-follow-up") {
            return {
              ...identity,
              phase: "revising",
              originalAnswer: state.originalAnswer,
              diagnosis: action.diagnosis,
              revisionDraft: state.originalAnswer,
            };
          }

          return {
            ...identity,
            phase: "complete",
            completionKind: "initial-sufficient",
            originalAnswer: state.originalAnswer,
            diagnosis: action.diagnosis,
          };

        case "diagnosis-failed":
          if (!matchesActiveRequest(state, action)) return state;

          return {
            ...identity,
            phase: "diagnosis-failed",
            originalAnswer: state.originalAnswer,
            failure: action.failure,
          };

        default:
          return invalidTransition(state, action);
      }

    case "diagnosis-failed":
      switch (action.type) {
        case "diagnosis-retried":
          assertNonEmptyString(
            action.requestId,
            "diagnosis-retried.requestId",
          );

          return {
            ...identity,
            phase: "diagnosing",
            originalAnswer: state.originalAnswer,
            requestId: action.requestId,
          };

        case "diagnosis-edit-requested":
          return {
            ...identity,
            phase: "answering",
            answerDraft: state.originalAnswer,
          };

        default:
          return invalidTransition(state, action);
      }

    case "revising":
      switch (action.type) {
        case "revision-draft-changed":
          return {
            ...state,
            revisionDraft: action.revisionDraft,
          };

        case "revision-submitted":
          assertNonEmptyString(state.revisionDraft, "revisionDraft");
          assertNonEmptyString(
            action.requestId,
            "revision-submitted.requestId",
          );

          return {
            ...identity,
            phase: "reviewing-revision",
            originalAnswer: state.originalAnswer,
            diagnosis: state.diagnosis,
            revisedAnswer: state.revisionDraft,
            requestId: action.requestId,
          };

        default:
          return invalidTransition(state, action);
      }

    case "reviewing-revision":
      switch (action.type) {
        case "revision-reviewed":
          if (!matchesActiveRequest(state, action)) return state;

          return {
            ...identity,
            phase: "complete",
            completionKind: "revision-reviewed",
            originalAnswer: state.originalAnswer,
            diagnosis: state.diagnosis,
            revisedAnswer: state.revisedAnswer,
            comparison: action.comparison,
          };

        case "revision-review-failed":
          if (!matchesActiveRequest(state, action)) return state;

          return {
            ...identity,
            phase: "revision-review-failed",
            originalAnswer: state.originalAnswer,
            diagnosis: state.diagnosis,
            revisedAnswer: state.revisedAnswer,
            failure: action.failure,
          };

        default:
          return invalidTransition(state, action);
      }

    case "revision-review-failed":
      switch (action.type) {
        case "revision-review-retried":
          assertNonEmptyString(
            action.requestId,
            "revision-review-retried.requestId",
          );

          return {
            ...identity,
            phase: "reviewing-revision",
            originalAnswer: state.originalAnswer,
            diagnosis: state.diagnosis,
            revisedAnswer: state.revisedAnswer,
            requestId: action.requestId,
          };

        case "revision-edit-requested":
          return {
            ...identity,
            phase: "revising",
            originalAnswer: state.originalAnswer,
            diagnosis: state.diagnosis,
            revisionDraft: state.revisedAnswer,
          };

        default:
          return invalidTransition(state, action);
      }

    case "complete":
      return invalidTransition(state, action);

    default:
      return invalidTransition(state, action);
  }
}
