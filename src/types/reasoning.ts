export type ReasoningQuestion = {
  id: string;
  title: string;
  prompt: string;
  scenario: string;
};

export type UserAnswer = {
  questionId: string;
  text: string;
};

export type EvaluationResult = {
  questionId: string;
  isComplete: boolean;
  summary: string;
  feedback: string;
};
