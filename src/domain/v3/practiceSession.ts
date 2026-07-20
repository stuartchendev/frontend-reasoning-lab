type SessionIdentity = {
  sessionId: string;
  questionId: string;
  questionVersion: number;
};

export type PracticeSessionFailureCode =
  | "invalid-request"
  | "unsupported-contract-version"
  | "payload-too-large"
  | "question-not-found"
  | "question-version-mismatch"
  | "rate-limited"
  | "model-unavailable"
  | "invalid-model-output"
  | "server-error";

export type PracticeSessionFailure = {
  code: PracticeSessionFailureCode;
  message: string;
  retryable: boolean;
};

export type NeedsFollowUpDiagnosis = {
  outcome: "needs-follow-up";
  primaryGap: {
    criterionId: string;
    explanation: string;
    learnerEvidence: string;
    whyItMatters: string;
  };
  followUpQuestion: string;
};

export type SufficientDiagnosis = {
  outcome: "sufficient";
  coveredCriterionIds: string[];
};

export type RevisionComparison = {
  resolution: "resolved" | "partially-resolved" | "unresolved";
  originalEvidence: string;
  revisedEvidence: string;
  comparisonSummary: string;
};

export type PracticeSessionState =
  | (SessionIdentity & {
      phase: "answering";
      answerDraft: string;
    })
  | (SessionIdentity & {
      phase: "diagnosing";
      originalAnswer: string;
      requestId: string;
    })
  | (SessionIdentity & {
      phase: "diagnosis-failed";
      originalAnswer: string;
      failure: PracticeSessionFailure;
      // Reducer invariant: editing after diagnosis-failed seeds answerDraft from originalAnswer.
    })
  | (SessionIdentity & {
      phase: "revising";
      originalAnswer: string;
      diagnosis: NeedsFollowUpDiagnosis;
      revisionDraft: string;
      // Reducer invariant: entering revising seeds revisionDraft from originalAnswer.
    })
  | (SessionIdentity & {
      phase: "reviewing-revision";
      originalAnswer: string;
      diagnosis: NeedsFollowUpDiagnosis;
      revisedAnswer: string;
      requestId: string;
    })
  | (SessionIdentity & {
      phase: "revision-review-failed";
      originalAnswer: string;
      diagnosis: NeedsFollowUpDiagnosis;
      revisedAnswer: string;
      failure: PracticeSessionFailure;
      // Reducer invariant: editing after revision-review-failed seeds revisionDraft from revisedAnswer.
    })
  | (SessionIdentity & {
      phase: "complete";
      completionKind: "initial-sufficient";
      originalAnswer: string;
      diagnosis: SufficientDiagnosis;
    })
  | (SessionIdentity & {
      phase: "complete";
      completionKind: "revision-reviewed";
      originalAnswer: string;
      diagnosis: NeedsFollowUpDiagnosis;
      revisedAnswer: string;
      comparison: RevisionComparison;
    });
