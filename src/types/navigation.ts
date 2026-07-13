export type SelectedContent =
  | { type: "overview" }
  | { type: "question"; questionId: string };
