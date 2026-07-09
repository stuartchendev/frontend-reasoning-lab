export type QuestionCategory =
  | "State Modeling"
  | "Data Flow"
  | "Component Responsibility"
  | "Async UI"
  | "TypeScript"
  | "JavaScript Fundamentals"
  | "Form Handling"
  | "Evaluator UX";

export type ReasoningQuestion = {
  id: string;
  order: string;
  title: string;
  shortTitle: string;
  category: QuestionCategory;
  difficulty: "Junior" | "Junior+";
  scenario: string;
  prompt: string;
  criteria: string[];
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
