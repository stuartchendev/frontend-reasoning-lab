import { reactStateOwnershipCriterionIds } from "../../src/server/v3/evaluation.ts";

export const flawedStateOwnershipAnswer =
  "QuestionNavigator can keep the selected question in its state and pass it to PracticePanel as a prop. PracticePanel can also keep its own selected question so it can render the current content.";

export const sufficientStateOwnershipAnswer =
  "App owns the canonical selectedQuestionId. It passes the selected ID and an onSelectQuestion callback to QuestionNavigator. App derives the selected question from the question list and selectedQuestionId, then passes that question to PracticePanel. Neither child stores a second canonical copy of the selection.";

export const validNeedsFollowUpDiagnosis = {
  outcome: "needs-follow-up",
  assessments: [
    {
      criterionId: reactStateOwnershipCriterionIds.sourceOfTruth,
      status: "missing",
    },
    {
      criterionId: reactStateOwnershipCriterionIds.dataFlow,
      status: "partially-met",
    },
    {
      criterionId: reactStateOwnershipCriterionIds.avoidDuplicatedState,
      status: "missing",
    },
  ],
  primaryGap: {
    criterionId: reactStateOwnershipCriterionIds.sourceOfTruth,
    explanation:
      "The answer assigns canonical question selection to more than one component.",
    learnerEvidence:
      "PracticePanel can also keep its own selected question",
    whyItMatters:
      "Independent canonical copies can diverge and render inconsistent selection state.",
  },
  followUpQuestion:
    "Which component should own the canonical selectedQuestionId, and how should QuestionNavigator request a selection change?",
};

export const validSufficientDiagnosis = {
  outcome: "sufficient",
  assessments: [
    {
      criterionId: reactStateOwnershipCriterionIds.sourceOfTruth,
      status: "met",
    },
    {
      criterionId: reactStateOwnershipCriterionIds.dataFlow,
      status: "met",
    },
    {
      criterionId: reactStateOwnershipCriterionIds.avoidDuplicatedState,
      status: "met",
    },
  ],
};
