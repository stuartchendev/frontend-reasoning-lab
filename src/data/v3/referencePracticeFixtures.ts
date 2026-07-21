import type {
  NeedsFollowUpDiagnosisResult,
  RevisionComparisonResult,
  SufficientDiagnosisResult,
} from "../../domain/v3/evaluationResults";

export const flawedStateOwnershipAnswer =
  "QuestionNavigator can keep the selected question in its state and pass it to PracticePanel as a prop. PracticePanel can also keep its own selected question so it can render the current content.";

export const sufficientStateOwnershipAnswer =
  "App owns the canonical selectedQuestionId. It passes the selected ID and an onSelectQuestion callback to QuestionNavigator. App derives the selected question from the question list and selectedQuestionId, then passes that question to PracticePanel. Neither child stores a second canonical copy of the selection.";

export const revisedStateOwnershipAnswer =
  "App owns the canonical selectedQuestionId. It passes the ID to QuestionNavigator and PracticePanel. QuestionNavigator requests changes through an onSelectQuestion callback, and neither child stores a second canonical selection.";

export const validNeedsFollowUpDiagnosis = {
  outcome: "needs-follow-up",
  assessments: [
    {
      criterionId: "identify-source-of-truth",
      status: "missing",
    },
    {
      criterionId: "explain-data-flow",
      status: "partially-met",
    },
    {
      criterionId: "avoid-duplicated-state",
      status: "missing",
    },
  ],
  primaryGap: {
    criterionId: "identify-source-of-truth",
    explanation:
      "The answer assigns canonical question selection to more than one component.",
    learnerEvidence:
      "PracticePanel can also keep its own selected question",
    whyItMatters:
      "Independent canonical copies can diverge and render inconsistent selection state.",
  },
  followUpQuestion:
    "Which component should own the canonical selectedQuestionId, and how should QuestionNavigator request a selection change?",
} as const satisfies NeedsFollowUpDiagnosisResult;

export const validSufficientDiagnosis = {
  outcome: "sufficient",
  assessments: [
    {
      criterionId: "identify-source-of-truth",
      status: "met",
    },
    {
      criterionId: "explain-data-flow",
      status: "met",
    },
    {
      criterionId: "avoid-duplicated-state",
      status: "met",
    },
  ],
} as const satisfies SufficientDiagnosisResult;

export const validResolvedRevisionComparison = {
  criterionId: "identify-source-of-truth",
  resolution: "resolved",
  originalEvidence: "PracticePanel can also keep its own selected question",
  revisedEvidence: "App owns the canonical selectedQuestionId",
  comparisonSummary:
    "The revision replaces duplicated child ownership with one application-owned source of truth and callback-driven changes.",
  nextAction: {
    kind: "practice-question",
    questionId: "project-list-state-data-flow",
    rationale:
      "Practice applying a single source of truth and explicit data flow in another component tree.",
  },
} as const satisfies RevisionComparisonResult;
