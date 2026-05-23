import type {
  EvaluationResult,
  ReasoningQuestion,
  UserAnswer,
} from "../types/reasoning";

export function fakeEvaluator(
  question: ReasoningQuestion,
  answer: UserAnswer
): Promise<EvaluationResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        questionId: question.id,
        isComplete: answer.text.trim().length > 0,
        summary: "Placeholder evaluation for the single-question proof.",
        feedback:
          "A strong answer should separate source state from derived views: keep inputs like search text, sort order, and selected project identity as state, then derive filtered and sorted lists from the project data.",
      });
    }, 250);
  });
}
