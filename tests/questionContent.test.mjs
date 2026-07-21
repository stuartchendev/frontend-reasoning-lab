import assert from "node:assert/strict";
import test from "node:test";

import {
  getV3PracticeQuestion,
  parseQuestionContent,
  projectListStateDataFlowQuestion,
  reactStateOwnershipQuestion,
  v3PracticeQuestions,
} from "../src/domain/v3/questionContent.ts";
import {
  validResolvedRevisionComparison,
} from "./fixtures/referenceEvaluationCases.mjs";

test("accepts both bounded v3 questions without cloning", () => {
  for (const question of v3PracticeQuestions) {
    assert.strictEqual(parseQuestionContent(question), question);
  }
});

test("looks up only registered v3 practice questions", () => {
  assert.strictEqual(
    getV3PracticeQuestion(reactStateOwnershipQuestion.id),
    reactStateOwnershipQuestion,
  );
  assert.strictEqual(
    getV3PracticeQuestion(projectListStateDataFlowQuestion.id),
    projectListStateDataFlowQuestion,
  );
  assert.equal(getV3PracticeQuestion("unknown-question"), undefined);
  assert.equal(
    new Set(v3PracticeQuestions.map((question) => question.id)).size,
    v3PracticeQuestions.length,
  );
});

test("resolves the validated reference recommendation to the project-list question", () => {
  assert.strictEqual(
    getV3PracticeQuestion(
      validResolvedRevisionComparison.nextAction.questionId,
    ),
    projectListStateDataFlowQuestion,
  );
});

test("rejects non-object input", () => {
  assert.throws(() => parseQuestionContent(null), TypeError);
  assert.throws(() => parseQuestionContent([]), TypeError);
});

test("rejects missing and invalid versions", () => {
  const { version: _version, ...missingVersion } = reactStateOwnershipQuestion;

  assert.throws(() => parseQuestionContent(missingVersion), TypeError);

  for (const version of [0, -1, 1.5]) {
    assert.throws(
      () => parseQuestionContent({ ...reactStateOwnershipQuestion, version }),
      TypeError,
    );
  }
});

test("rejects unsupported contract values", () => {
  for (const fieldName of [
    "category",
    "difficulty",
    "languageContext",
    "evaluationMode",
    "syntaxPolicy",
  ]) {
    assert.throws(
      () =>
        parseQuestionContent({
          ...reactStateOwnershipQuestion,
          [fieldName]: "unsupported",
        }),
      TypeError,
    );
  }
});

test("rejects empty required text", () => {
  for (const fieldName of ["id", "title", "prompt"]) {
    assert.throws(
      () =>
        parseQuestionContent({
          ...reactStateOwnershipQuestion,
          [fieldName]: "   ",
        }),
      TypeError,
    );
  }
});

test("rejects an empty code snippet when present", () => {
  assert.throws(
    () =>
      parseQuestionContent({
        ...reactStateOwnershipQuestion,
        codeSnippet: "",
      }),
    TypeError,
  );
});

test("rejects invalid target concept IDs", () => {
  assert.throws(
    () =>
      parseQuestionContent({
        ...reactStateOwnershipQuestion,
        targetConceptIds: [],
      }),
    TypeError,
  );
  assert.throws(
    () =>
      parseQuestionContent({
        ...reactStateOwnershipQuestion,
        targetConceptIds: ["react-state-ownership", "   "],
      }),
    TypeError,
  );
});

test("rejects unknown fields", () => {
  assert.throws(
    () =>
      parseQuestionContent({
        ...reactStateOwnershipQuestion,
        criteria: [],
      }),
    TypeError,
  );
});
