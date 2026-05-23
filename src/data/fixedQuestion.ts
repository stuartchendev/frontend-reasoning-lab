import type { ReasoningQuestion } from "../types/reasoning";

export const fixedQuestion: ReasoningQuestion = {
  id: "project-list-state-data-flow",
  title: "Project List State and Data Flow",
  scenario:
    "A project list UI receives projects from an API. The user can search by project name, choose a sort order, and select one active project to inspect in a detail panel.",
  prompt:
    "Explain what should be stored as state, what should be derived during render or memoized from existing data, and why. Include how search text, sort order, filtered/sorted projects, and the active selected project should relate to each other.",
};
