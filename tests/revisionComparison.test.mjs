import assert from "node:assert/strict";
import test from "node:test";

import {
  parseInitialDiagnosisResult,
  parseRevisionComparisonResult,
} from "../src/domain/v3/evaluationResults.ts";
import {
  parseQuestionEvaluationSpec,
  reactStateOwnershipCriterionIds,
  reactStateOwnershipEvaluationSpec,
  validateInitialDiagnosisResult,
  validateRevisionComparisonResult,
} from "../src/server/v3/evaluation.ts";
import {
  flawedStateOwnershipAnswer,
  referenceCandidateQuestionIds,
  revisedStateOwnershipAnswer,
  validNeedsFollowUpDiagnosis,
  validResolvedRevisionComparison,
} from "./fixtures/referenceEvaluationCases.mjs";

const validatedNeedsFollowUpDiagnosis = validateInitialDiagnosisResult(
  parseInitialDiagnosisResult(validNeedsFollowUpDiagnosis),
  {
    spec: parseQuestionEvaluationSpec(reactStateOwnershipEvaluationSpec),
    normalizedAnswer: flawedStateOwnershipAnswer,
  },
);

function parseAndValidateComparison(
  input,
  {
    normalizedOriginalAnswer = flawedStateOwnershipAnswer,
    normalizedRevisedAnswer = revisedStateOwnershipAnswer,
    candidateQuestionIds = referenceCandidateQuestionIds,
  } = {},
) {
  const parsedResult = parseRevisionComparisonResult(input);

  return validateRevisionComparisonResult(parsedResult, {
    diagnosis: validatedNeedsFollowUpDiagnosis,
    normalizedOriginalAnswer,
    normalizedRevisedAnswer,
    candidateQuestionIds,
  });
}

test("accepts all supported revision resolution literals structurally", () => {
  for (const resolution of [
    "resolved",
    "partially-resolved",
    "unresolved",
  ]) {
    const comparison = {
      ...validResolvedRevisionComparison,
      resolution,
    };

    assert.strictEqual(parseRevisionComparisonResult(comparison), comparison);
  }
});

test("accepts null or one bounded next action without cloning", () => {
  assert.strictEqual(
    parseAndValidateComparison(validResolvedRevisionComparison),
    validResolvedRevisionComparison,
  );

  const comparisonWithoutAction = {
    ...validResolvedRevisionComparison,
    nextAction: null,
  };

  assert.strictEqual(
    parseAndValidateComparison(comparisonWithoutAction),
    comparisonWithoutAction,
  );
});

test("rejects unsupported resolutions and an omitted nextAction", () => {
  assert.throws(
    () =>
      parseRevisionComparisonResult({
        ...validResolvedRevisionComparison,
        resolution: "improved",
      }),
    TypeError,
  );

  const { nextAction: _nextAction, ...comparisonWithoutNextAction } =
    validResolvedRevisionComparison;

  assert.throws(
    () => parseRevisionComparisonResult(comparisonWithoutNextAction),
    TypeError,
  );
});

test("rejects whitespace-only required strings", () => {
  assert.throws(
    () =>
      parseRevisionComparisonResult({
        ...validResolvedRevisionComparison,
        comparisonSummary: "   ",
      }),
    TypeError,
  );
});

test("requires the diagnosed primary-gap criterion", () => {
  assert.throws(
    () =>
      parseAndValidateComparison({
        ...validResolvedRevisionComparison,
        criterionId: reactStateOwnershipCriterionIds.dataFlow,
      }),
    TypeError,
  );
});

test("rejects fabricated original and revised evidence", () => {
  assert.throws(
    () =>
      parseAndValidateComparison({
        ...validResolvedRevisionComparison,
        originalEvidence: "The original answer did not contain this evidence",
      }),
    TypeError,
  );

  assert.throws(
    () =>
      parseAndValidateComparison({
        ...validResolvedRevisionComparison,
        revisedEvidence: "The revised answer did not contain this evidence",
      }),
    TypeError,
  );
});

test("rejects unsupported and malformed bounded actions", () => {
  assert.throws(
    () =>
      parseRevisionComparisonResult({
        ...validResolvedRevisionComparison,
        nextAction: {
          ...validResolvedRevisionComparison.nextAction,
          kind: "open-url",
        },
      }),
    TypeError,
  );

  assert.throws(
    () =>
      parseRevisionComparisonResult({
        ...validResolvedRevisionComparison,
        nextAction: {
          ...validResolvedRevisionComparison.nextAction,
          rationale: "   ",
        },
      }),
    TypeError,
  );
});

test("rejects recommendations outside the candidate question IDs", () => {
  assert.throws(
    () =>
      parseAndValidateComparison({
        ...validResolvedRevisionComparison,
        nextAction: {
          ...validResolvedRevisionComparison.nextAction,
          questionId: "not-a-candidate",
        },
      }),
    TypeError,
  );
});

test("rejects action arrays and multiple recommendations", () => {
  assert.throws(
    () =>
      parseRevisionComparisonResult({
        ...validResolvedRevisionComparison,
        nextAction: [
          validResolvedRevisionComparison.nextAction,
          validResolvedRevisionComparison.nextAction,
        ],
      }),
    TypeError,
  );
});

test("rejects unknown comparison and bounded-action fields", () => {
  assert.throws(
    () =>
      parseRevisionComparisonResult({
        ...validResolvedRevisionComparison,
        confidence: "high",
      }),
    TypeError,
  );

  assert.throws(
    () =>
      parseRevisionComparisonResult({
        ...validResolvedRevisionComparison,
        nextAction: {
          ...validResolvedRevisionComparison.nextAction,
          title: "Extra metadata",
        },
      }),
    TypeError,
  );
});
