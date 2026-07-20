import assert from "node:assert/strict";
import test from "node:test";

import { parseInitialDiagnosisResult } from "../src/domain/v3/evaluationResults.ts";
import { reactStateOwnershipQuestion } from "../src/domain/v3/questionContent.ts";
import {
  parseQuestionEvaluationSpec,
  reactStateOwnershipCriterionIds,
  reactStateOwnershipEvaluationSpec,
  validateInitialDiagnosisResult,
} from "../src/server/v3/evaluation.ts";
import {
  flawedStateOwnershipAnswer,
  sufficientStateOwnershipAnswer,
  validNeedsFollowUpDiagnosis,
  validSufficientDiagnosis,
} from "./fixtures/referenceEvaluationCases.mjs";

const parsedReferenceSpec = parseQuestionEvaluationSpec(
  reactStateOwnershipEvaluationSpec,
);

function parseAndValidateDiagnosis(input, normalizedAnswer) {
  const parsedResult = parseInitialDiagnosisResult(input);

  return validateInitialDiagnosisResult(parsedResult, {
    spec: parsedReferenceSpec,
    normalizedAnswer,
  });
}

test("validates the reference spec and question identity", () => {
  assert.strictEqual(parsedReferenceSpec, reactStateOwnershipEvaluationSpec);
  assert.equal(
    parsedReferenceSpec.questionId,
    reactStateOwnershipQuestion.id,
  );
  assert.equal(
    parsedReferenceSpec.questionVersion,
    reactStateOwnershipQuestion.version,
  );
});

test("rejects invalid criterion IDs and prerequisite graphs", () => {
  const [sourceOfTruth, dataFlow, avoidDuplicatedState] =
    reactStateOwnershipEvaluationSpec.criteria;

  assert.throws(
    () =>
      parseQuestionEvaluationSpec({
        ...reactStateOwnershipEvaluationSpec,
        criteria: [
          sourceOfTruth,
          dataFlow,
          { ...avoidDuplicatedState, id: sourceOfTruth.id },
        ],
      }),
    TypeError,
  );

  assert.throws(
    () =>
      parseQuestionEvaluationSpec({
        ...reactStateOwnershipEvaluationSpec,
        criteria: [
          sourceOfTruth,
          {
            ...dataFlow,
            prerequisiteCriterionIds: ["unknown-criterion"],
          },
          avoidDuplicatedState,
        ],
      }),
    TypeError,
  );

  assert.throws(
    () =>
      parseQuestionEvaluationSpec({
        ...reactStateOwnershipEvaluationSpec,
        criteria: [
          sourceOfTruth,
          {
            ...dataFlow,
            prerequisiteCriterionIds: [dataFlow.id],
          },
          avoidDuplicatedState,
        ],
      }),
    TypeError,
  );

  assert.throws(
    () =>
      parseQuestionEvaluationSpec({
        ...reactStateOwnershipEvaluationSpec,
        criteria: [
          {
            ...sourceOfTruth,
            prerequisiteCriterionIds: [dataFlow.id],
          },
          dataFlow,
          avoidDuplicatedState,
        ],
      }),
    TypeError,
  );
});

test("rejects invalid spec structure and required not-applicable policy", () => {
  const [sourceOfTruth, ...remainingCriteria] =
    reactStateOwnershipEvaluationSpec.criteria;

  assert.throws(
    () =>
      parseQuestionEvaluationSpec({
        ...reactStateOwnershipEvaluationSpec,
        questionVersion: 0,
      }),
    TypeError,
  );

  assert.throws(
    () =>
      parseQuestionEvaluationSpec({
        ...reactStateOwnershipEvaluationSpec,
        unexpected: true,
      }),
    TypeError,
  );

  assert.throws(
    () =>
      parseQuestionEvaluationSpec({
        ...reactStateOwnershipEvaluationSpec,
        criteria: [
          { ...sourceOfTruth, allowsNotApplicable: true },
          ...remainingCriteria,
        ],
      }),
    TypeError,
  );
});

test("accepts the valid needs-follow-up diagnosis", () => {
  assert.strictEqual(
    parseAndValidateDiagnosis(
      validNeedsFollowUpDiagnosis,
      flawedStateOwnershipAnswer,
    ),
    validNeedsFollowUpDiagnosis,
  );
});

test("accepts the valid sufficient diagnosis", () => {
  assert.strictEqual(
    parseAndValidateDiagnosis(
      validSufficientDiagnosis,
      sufficientStateOwnershipAnswer,
    ),
    validSufficientDiagnosis,
  );
});

test("rejects structurally invalid Call 1 results", () => {
  assert.throws(
    () =>
      parseInitialDiagnosisResult({
        ...validNeedsFollowUpDiagnosis,
        outcome: "unsupported",
      }),
    TypeError,
  );

  assert.throws(
    () =>
      parseInitialDiagnosisResult({
        ...validNeedsFollowUpDiagnosis,
        unexpected: true,
      }),
    TypeError,
  );

  assert.throws(
    () =>
      parseInitialDiagnosisResult({
        ...validNeedsFollowUpDiagnosis,
        followUpQuestion: "   ",
      }),
    TypeError,
  );

  assert.throws(
    () =>
      parseInitialDiagnosisResult({
        ...validNeedsFollowUpDiagnosis,
        assessments: [
          {
            ...validNeedsFollowUpDiagnosis.assessments[0],
            status: "unsupported",
          },
          ...validNeedsFollowUpDiagnosis.assessments.slice(1),
        ],
      }),
    TypeError,
  );
});

test("requires every spec criterion to be assessed exactly once", () => {
  assert.throws(
    () =>
      parseAndValidateDiagnosis(
        {
          ...validNeedsFollowUpDiagnosis,
          assessments: validNeedsFollowUpDiagnosis.assessments.slice(0, 2),
        },
        flawedStateOwnershipAnswer,
      ),
    TypeError,
  );

  assert.throws(
    () =>
      parseAndValidateDiagnosis(
        {
          ...validNeedsFollowUpDiagnosis,
          assessments: [
            validNeedsFollowUpDiagnosis.assessments[0],
            validNeedsFollowUpDiagnosis.assessments[0],
            validNeedsFollowUpDiagnosis.assessments[2],
          ],
        },
        flawedStateOwnershipAnswer,
      ),
    TypeError,
  );

  assert.throws(
    () =>
      parseAndValidateDiagnosis(
        {
          ...validNeedsFollowUpDiagnosis,
          assessments: [
            ...validNeedsFollowUpDiagnosis.assessments.slice(0, 2),
            {
              criterionId: "unknown-criterion",
              status: "missing",
            },
          ],
        },
        flawedStateOwnershipAnswer,
      ),
    TypeError,
  );
});

test("allows not-applicable only when permitted by the spec", () => {
  assert.throws(
    () =>
      parseAndValidateDiagnosis(
        {
          ...validNeedsFollowUpDiagnosis,
          assessments: [
            ...validNeedsFollowUpDiagnosis.assessments.slice(0, 2),
            {
              criterionId:
                reactStateOwnershipCriterionIds.avoidDuplicatedState,
              status: "not-applicable",
            },
          ],
        },
        flawedStateOwnershipAnswer,
      ),
    TypeError,
  );
});

test("requires the primary gap to be missing or partially met", () => {
  assert.doesNotThrow(() =>
    parseAndValidateDiagnosis(
      {
        ...validNeedsFollowUpDiagnosis,
        assessments: [
          {
            criterionId: reactStateOwnershipCriterionIds.sourceOfTruth,
            status: "partially-met",
          },
          ...validNeedsFollowUpDiagnosis.assessments.slice(1),
        ],
      },
      flawedStateOwnershipAnswer,
    ),
  );

  assert.throws(
    () =>
      parseAndValidateDiagnosis(
        {
          ...validNeedsFollowUpDiagnosis,
          assessments: [
            {
              criterionId: reactStateOwnershipCriterionIds.sourceOfTruth,
              status: "met",
            },
            ...validNeedsFollowUpDiagnosis.assessments.slice(1),
          ],
        },
        flawedStateOwnershipAnswer,
      ),
    TypeError,
  );
});

test("requires exact primary-gap evidence in the normalized answer", () => {
  assert.throws(
    () =>
      parseAndValidateDiagnosis(
        {
          ...validNeedsFollowUpDiagnosis,
          primaryGap: {
            ...validNeedsFollowUpDiagnosis.primaryGap,
            learnerEvidence: "Evidence that is not in the answer",
          },
        },
        flawedStateOwnershipAnswer,
      ),
    TypeError,
  );
});

test("requires every required criterion to be met for sufficient", () => {
  assert.throws(
    () =>
      parseAndValidateDiagnosis(
        {
          ...validSufficientDiagnosis,
          assessments: [
            {
              criterionId: reactStateOwnershipCriterionIds.sourceOfTruth,
              status: "partially-met",
            },
            ...validSufficientDiagnosis.assessments.slice(1),
          ],
        },
        sufficientStateOwnershipAnswer,
      ),
    TypeError,
  );
});
