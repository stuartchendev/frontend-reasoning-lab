const QUESTION_CONTENT_CATEGORIES = ["Data Flow", "State Modeling"] as const;
const QUESTION_CONTENT_DIFFICULTIES = ["Junior"] as const;
const QUESTION_LANGUAGE_CONTEXTS = ["React + TypeScript"] as const;
const QUESTION_EVALUATION_MODES = ["reasoning"] as const;
const QUESTION_SYNTAX_POLICIES = ["syntax-not-evaluated"] as const;

export type QuestionContentCategory =
  (typeof QUESTION_CONTENT_CATEGORIES)[number];
export type QuestionContentDifficulty =
  (typeof QUESTION_CONTENT_DIFFICULTIES)[number];
export type QuestionLanguageContext =
  (typeof QUESTION_LANGUAGE_CONTEXTS)[number];
export type QuestionEvaluationMode =
  (typeof QUESTION_EVALUATION_MODES)[number];
export type QuestionSyntaxPolicy =
  (typeof QUESTION_SYNTAX_POLICIES)[number];

export type QuestionContent = {
  readonly id: string;
  readonly version: number;
  readonly title: string;
  readonly category: QuestionContentCategory;
  readonly difficulty: QuestionContentDifficulty;
  readonly prompt: string;
  readonly codeSnippet?: string;
  readonly languageContext: QuestionLanguageContext;
  readonly evaluationMode: QuestionEvaluationMode;
  readonly syntaxPolicy: QuestionSyntaxPolicy;
  readonly targetConceptIds: readonly string[];
};

const QUESTION_CONTENT_KEYS = new Set([
  "id",
  "version",
  "title",
  "category",
  "difficulty",
  "prompt",
  "codeSnippet",
  "languageContext",
  "evaluationMode",
  "syntaxPolicy",
  "targetConceptIds",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSupportedValue<T extends readonly string[]>(
  value: unknown,
  supportedValues: T,
): value is T[number] {
  return (
    typeof value === "string" &&
    (supportedValues as readonly string[]).includes(value)
  );
}

function assertNonEmptyString(
  value: unknown,
  fieldName: string,
): asserts value is string {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(
      `QuestionContent.${fieldName} must be a non-empty string.`,
    );
  }
}

function assertSupportedValue<T extends readonly string[]>(
  value: unknown,
  supportedValues: T,
  fieldName: string,
): asserts value is T[number] {
  if (!isSupportedValue(value, supportedValues)) {
    throw new TypeError(
      `QuestionContent.${fieldName} has an unsupported value.`,
    );
  }
}

export function parseQuestionContent(input: unknown): QuestionContent {
  if (!isRecord(input)) {
    throw new TypeError("QuestionContent must be an object.");
  }

  for (const key of Object.keys(input)) {
    if (!QUESTION_CONTENT_KEYS.has(key)) {
      throw new TypeError(`QuestionContent contains unsupported field "${key}".`);
    }
  }

  assertNonEmptyString(input.id, "id");

  if (
    typeof input.version !== "number" ||
    !Number.isInteger(input.version) ||
    input.version <= 0
  ) {
    throw new TypeError("QuestionContent.version must be a positive integer.");
  }

  assertNonEmptyString(input.title, "title");
  assertSupportedValue(
    input.category,
    QUESTION_CONTENT_CATEGORIES,
    "category",
  );
  assertSupportedValue(
    input.difficulty,
    QUESTION_CONTENT_DIFFICULTIES,
    "difficulty",
  );
  assertNonEmptyString(input.prompt, "prompt");

  if (Object.hasOwn(input, "codeSnippet")) {
    assertNonEmptyString(input.codeSnippet, "codeSnippet");
  }

  assertSupportedValue(
    input.languageContext,
    QUESTION_LANGUAGE_CONTEXTS,
    "languageContext",
  );
  assertSupportedValue(
    input.evaluationMode,
    QUESTION_EVALUATION_MODES,
    "evaluationMode",
  );
  assertSupportedValue(
    input.syntaxPolicy,
    QUESTION_SYNTAX_POLICIES,
    "syntaxPolicy",
  );

  if (
    !Array.isArray(input.targetConceptIds) ||
    input.targetConceptIds.length === 0 ||
    !input.targetConceptIds.every(
      (conceptId) => typeof conceptId === "string" && Boolean(conceptId.trim()),
    )
  ) {
    throw new TypeError(
      "QuestionContent.targetConceptIds must contain non-empty strings.",
    );
  }

  return input as QuestionContent;
}

// Temporary coexistence: this v3 reference does not replace the v2
// question-navigator-selected-question entry used by the running application.
export const reactStateOwnershipQuestion = {
  id: "react-state-ownership-01",
  version: 1,
  title: "Question Navigator State Ownership",
  category: "Data Flow",
  difficulty: "Junior",
  prompt:
    "A React practice workspace has an App, a QuestionNavigator, and a PracticePanel. Selecting a question must update both the navigator's active item and the question shown in the practice panel. Explain where the selection state should live, what data and callbacks each component should receive, and how the selected question should be obtained from its ID.",
  languageContext: "React + TypeScript",
  evaluationMode: "reasoning",
  syntaxPolicy: "syntax-not-evaluated",
  targetConceptIds: [
    "react-state-ownership",
    "parent-child-data-flow",
    "derived-selected-question",
  ],
} as const satisfies QuestionContent;

export const projectListStateDataFlowQuestion = {
  id: "project-list-state-data-flow",
  version: 1,
  title: "Project List State and Data Flow",
  category: "State Modeling",
  difficulty: "Junior",
  prompt:
    "A project list UI receives projects from an API. The user can search by project name, choose a sort order, and select one active project to inspect in a detail panel. Explain what should be stored as state, what should be derived during render or memoized from existing data, and why. Include how search text, sort order, filtered and sorted projects, and the active selected project should relate to each other.",
  languageContext: "React + TypeScript",
  evaluationMode: "reasoning",
  syntaxPolicy: "syntax-not-evaluated",
  targetConceptIds: [
    "source-state-vs-derived-data",
    "filter-and-sort-data-flow",
    "selected-identity-derived-entity",
  ],
} as const satisfies QuestionContent;

export const v3PracticeQuestions = [
  reactStateOwnershipQuestion,
  projectListStateDataFlowQuestion,
] as const satisfies readonly QuestionContent[];

export function getV3PracticeQuestion(
  questionId: string,
): QuestionContent | undefined {
  return v3PracticeQuestions.find((question) => question.id === questionId);
}
