import type {
  NeedsFollowUpDiagnosisResult,
  RevisionComparisonResult,
  SufficientDiagnosisResult,
} from "./evaluationResults";

type SessionIdentity = {
  readonly sessionId: string;
  readonly questionId: string;
  readonly questionVersion: number;
};

export const PRACTICE_SESSION_FAILURE_CODES = [
  "invalid-request",
  "unsupported-contract-version",
  "payload-too-large",
  "question-not-found",
  "question-version-mismatch",
  "rate-limited",
  "model-unavailable",
  "invalid-model-output",
  "server-error",
] as const;

export type PracticeSessionFailureCode =
  (typeof PRACTICE_SESSION_FAILURE_CODES)[number];

export type PracticeSessionFailure = {
  readonly code: PracticeSessionFailureCode;
  readonly message: string;
  readonly retryable: boolean;
};

export type PracticeSessionState =
  | (SessionIdentity & {
      readonly phase: "answering";
      readonly answerDraft: string;
    })
  | (SessionIdentity & {
      readonly phase: "diagnosing";
      readonly originalAnswer: string;
      readonly requestId: string;
    })
  | (SessionIdentity & {
      readonly phase: "diagnosis-failed";
      readonly originalAnswer: string;
      readonly failure: PracticeSessionFailure;
      // Reducer invariant: editing after diagnosis-failed seeds answerDraft from originalAnswer.
    })
  | (SessionIdentity & {
      readonly phase: "revising";
      readonly originalAnswer: string;
      readonly diagnosis: NeedsFollowUpDiagnosisResult;
      readonly revisionDraft: string;
      // Reducer invariant: entering revising seeds revisionDraft from originalAnswer.
    })
  | (SessionIdentity & {
      readonly phase: "reviewing-revision";
      readonly originalAnswer: string;
      readonly diagnosis: NeedsFollowUpDiagnosisResult;
      readonly revisedAnswer: string;
      readonly requestId: string;
    })
  | (SessionIdentity & {
      readonly phase: "revision-review-failed";
      readonly originalAnswer: string;
      readonly diagnosis: NeedsFollowUpDiagnosisResult;
      readonly revisedAnswer: string;
      readonly failure: PracticeSessionFailure;
      // Reducer invariant: editing after revision-review-failed seeds revisionDraft from revisedAnswer.
    })
  | (SessionIdentity & {
      readonly phase: "complete";
      readonly completionKind: "initial-sufficient";
      readonly originalAnswer: string;
      readonly diagnosis: SufficientDiagnosisResult;
    })
  | (SessionIdentity & {
      readonly phase: "complete";
      readonly completionKind: "revision-reviewed";
      readonly originalAnswer: string;
      readonly diagnosis: NeedsFollowUpDiagnosisResult;
      readonly revisedAnswer: string;
      readonly comparison: RevisionComparisonResult;
    });
