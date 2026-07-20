import assert from "node:assert/strict";
import test from "node:test";

import {
  parseQuestionContent,
  reactStateOwnershipQuestion,
} from "../src/domain/v3/questionContent.ts";

test("accepts the reference question without cloning", () => {
  assert.strictEqual(
    parseQuestionContent(reactStateOwnershipQuestion),
    reactStateOwnershipQuestion,
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
