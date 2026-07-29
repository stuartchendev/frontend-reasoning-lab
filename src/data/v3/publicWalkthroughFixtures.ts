import type {
  NeedsFollowUpDiagnosisResult,
  RevisionComparisonResult,
} from "../../domain/v3/evaluationResults";
// @ts-expect-error Node's native TypeScript loader requires the .ts extension.
import { parseInitialDiagnosisResult, parseRevisionComparisonResult } from "../../domain/v3/evaluationResults.ts";

const capturedDiagnosis = {
  outcome: "needs-follow-up",
  assessments: [
    {
      criterionId: "identify-source-of-truth",
      status: "met",
    },
    {
      criterionId: "explain-data-flow",
      status: "partially-met",
    },
    {
      criterionId: "avoid-duplicated-state",
      status: "met",
    },
  ],
  primaryGap: {
    criterionId: "explain-data-flow",
    explanation:
      "Your answer explains that the navigator keeps state and passes it to PracticePanel, but you do not explain how the owning parent derives the selected question from its ID. You also miss explaining that the navigator emits a change request (callback) rather than just holding state.",
    learnerEvidence:
      "QuestionNavigator can keep the selected question in its state",
    whyItMatters:
      "The evaluation policy requires you to explain how the parent derives the selected question from its ID and how the navigator emits a change request. Your answer only describes passing props, missing the derivation step.",
  },
  followUpQuestion:
    "How does the owning parent derive the selected question object from the selected question ID?",
} as const;

const capturedComparison = {
  criterionId: "explain-data-flow",
  resolution: "partially-resolved",
  originalEvidence:
    "QuestionNavigator can keep the selected question in its state",
  revisedEvidence:
    "App owns the canonical selectedQuestionId. It passes the ID to QuestionNavigator and PracticePanel.",
  comparisonSummary:
    "Your original answer stated that the navigator keeps the selected question in its state, but you did not explain how the owning parent derives the selected question from its ID or how the navigator emits a change request. Your revision correctly identifies that the App owns the canonical selectedQuestionId and passes it to both children, and notes that the navigator requests changes through an onSelectQuestion callback. However, your revision still does not explicitly describe how the App derives the full selected question object from the provided ID (e.g., by looking it up in a shared data source or array).",
  nextAction: {
    kind: "practice-question",
    questionId: "project-list-state-data-flow",
    rationale:
      "This practice question reinforces state modeling and derivation, which aligns with your partially resolved gap on explaining how an owning parent derives selected data from its ID.",
  },
} as const;

const parsedDiagnosis = parseInitialDiagnosisResult(capturedDiagnosis);

if (parsedDiagnosis.outcome !== "needs-follow-up") {
  throw new TypeError(
    "The public walkthrough diagnosis must require follow-up.",
  );
}

export const publicWalkthroughDiagnosis =
  parsedDiagnosis satisfies NeedsFollowUpDiagnosisResult;
export const publicWalkthroughComparison =
  parseRevisionComparisonResult(
    capturedComparison,
  ) satisfies RevisionComparisonResult;

export const publicWalkthroughCaptureProvenance = {
  capturedAt: "2026-07-29T15:01:27.829Z",
  source: "validated-local-model-run",
  call1Validation: "runInitialDiagnosisPipeline",
  call2Validation: "runRevisionReviewPipeline",
} as const;
