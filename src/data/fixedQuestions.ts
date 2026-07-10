import type { ReasoningQuestions } from "../types/reasoning";

export const fixedQuestions: ReasoningQuestions[] = [
  {
    id: "project-list-state-data-flow",
    order: "Q1",
    title: "Project List State and Data Flow",
    shortTitle: "Project list flow",
    category: "State Modeling",
    difficulty: "Junior",
    scenario:
      "A project list UI receives projects from an API. The user can search by project name, choose a sort order, and select one active project to inspect in a detail panel.",
    prompt:
      "Explain what should be stored as state, what should be derived during render or memoized from existing data, and why. Include how search text, sort order, filtered and sorted projects, and the active selected project should relate to each other.",
    criteria: [
      "Stores user-controlled inputs and selected project identity as state.",
      "Derives filtered and sorted projects from source data plus controls.",
      "Derives the active project from selected identity and project data.",
      "Explains why duplicate derived state can become stale.",
    ],
  },
  {
    id: "fantasy-team-selected-ids",
    order: "Q2",
    title: "Fantasy Team Selection Model",
    shortTitle: "Selected IDs",
    category: "State Modeling",
    difficulty: "Junior",
    scenario:
      "A fantasy sports mini dashboard shows a player list. Users can search, sort, add players to a selected team, remove players, and see total price and projected points.",
    prompt:
      "Describe a simple state model for this UI. Explain why selected player IDs are usually better state than storing copied player objects, and identify which values should be derived.",
    criteria: [
      "Uses source player data, selected IDs, search text, and sort choice clearly.",
      "Derives selected players, visible players, total price, and total points.",
      "Mentions stable IDs for selection and list keys.",
      "Explains duplicate prevention and remove behavior.",
    ],
  },
  {
    id: "question-navigator-selected-question",
    order: "Q3",
    title: "Question Navigator Selection Flow",
    shortTitle: "Question select",
    category: "Data Flow",
    difficulty: "Junior",
    scenario:
      "A practice app has a sidebar list of questions and a right-side practice view. Clicking a question should update the selected item and show its scenario, prompt, and answer form.",
    prompt:
      "Explain the data flow from clicking a question in the navigator to rendering the selected practice view. Include what the parent owns, what the navigator receives, and why the selected question should be derived from the selected ID.",
    criteria: [
      "Identifies selectedQuestionId as the parent-owned state.",
      "Derives selectedQuestion from the question list and selected ID.",
      "Keeps the navigator focused on rendering options and emitting selection events.",
      "Avoids using display order as identity.",
    ],
  },
  {
    id: "async-player-loading-error-retry",
    order: "Q4",
    title: "Loading, Error, and Retry UI",
    shortTitle: "Async states",
    category: "Async UI",
    difficulty: "Junior",
    scenario:
      "A player dashboard starts with no loaded data, fetches players through an API-like function, and must show loading, error with retry, or the successful dashboard content.",
    prompt:
      "Describe the state needed for this async UI and how the render should decide which view to show. Explain what should happen when retry succeeds or fails.",
    criteria: [
      "Models loaded data, loading, and error state explicitly.",
      "Explains loading, error, retry, and success rendering paths.",
      "Uses loaded data as the source for later filtering and selection.",
      "Mentions clearing stale errors or results at the right time.",
    ],
  },
  {
    id: "queue-command-parser-flow",
    order: "Q5",
    title: "Queue Command Parser Flow",
    shortTitle: "Queue parser",
    category: "JavaScript Fundamentals",
    difficulty: "Junior+",
    scenario:
      "A coding test gives command strings such as EQUEUE 20 and DEQUEUE. The function must parse each command, update a queue, and return how many items are before a target value.",
    prompt:
      "Explain how you would break the problem into parsing, state updates, and deriving the final answer. You do not need to write full code, but name the data structures and edge cases you would handle.",
    criteria: [
      "Separates input parsing from core queue logic.",
      "Parses action and value safely before updating the queue.",
      "Uses either a head pointer or careful dequeue behavior.",
      "Defines what happens when the target is not found.",
    ],
  },
  {
    id: "string-shift-preserve-output",
    order: "Q6",
    title: "String Shift Matching and Output Rules",
    shortTitle: "String shift",
    category: "JavaScript Fundamentals",
    difficulty: "Junior+",
    scenario:
      "A coding test gives an encrypted sentence and a known plaintext key. You need to find a word with the same letter shift as the key, then decode the sentence while preserving spaces and letter casing.",
    prompt:
      "Explain the steps you would use to compare words, find the shift, and produce the decoded output. Include how you would normalize for comparison without losing the original output format.",
    criteria: [
      "Checks candidate words by length before comparing shifts.",
      "Normalizes for comparison while preserving original text for output.",
      "Mentions character codes, modulo wrapping, and non-letter handling.",
      "Separates helper logic from the main flow.",
    ],
  },
  {
    id: "typescript-async-state-model",
    order: "Q7",
    title: "TypeScript Async State Model",
    shortTitle: "TS async state",
    category: "TypeScript",
    difficulty: "Junior+",
    scenario:
      "A component currently tracks async work with several nullable fields and booleans. Some combinations are impossible, such as showing both success data and an error message.",
    prompt:
      "Explain how TypeScript can help model this UI more safely. Describe a union-style state shape and the trade-off compared with a few simple booleans.",
    criteria: [
      "Identifies impossible state combinations as the main risk.",
      "Proposes status-based or discriminated union modeling.",
      "Explains how narrowing helps rendering logic.",
      "States the upfront type-design trade-off clearly.",
    ],
  },
  {
    id: "answer-form-submit-guards",
    order: "Q8",
    title: "Answer Form Submit Guards",
    shortTitle: "Form guards",
    category: "Form Handling",
    difficulty: "Junior",
    scenario:
      "A practice form lets the user type an answer and submit it to an evaluator. The evaluator is asynchronous, and users may click submit more than once or submit empty whitespace.",
    prompt:
      "Describe the submit flow and guard conditions you would use. Explain how answer text, disabled state, evaluation state, and previous feedback should update.",
    criteria: [
      "Guards against empty answers and duplicate submissions.",
      "Explains when to set evaluating state and clear old feedback.",
      "Keeps the evaluator boundary separate from the form component behavior.",
      "Mentions basic failure or retry handling if evaluation can fail.",
    ],
  },
  {
    id: "component-boundaries-list-summary",
    order: "Q9",
    title: "List and Summary Component Boundaries",
    shortTitle: "Boundaries",
    category: "Component Responsibility",
    difficulty: "Junior",
    scenario:
      "A mini dashboard has a parent App, a searchable list, item cards, and a summary panel. The UI works, but logic is starting to spread across child components.",
    prompt:
      "Explain how you would decide which component owns state, which components receive data and callbacks, and where derived values should live. Include what you would avoid over-abstracting in a small project.",
    criteria: [
      "Keeps source state and main event handlers in the owning parent.",
      "Lets list, card, and summary components focus on presentation and local events.",
      "Names derived values clearly near the data flow owner.",
      "Explains the trade-off between cleaner boundaries and unnecessary abstraction.",
    ],
  },
  {
    id: "framework-vs-storage-boundary",
    order: "Q10",
    title: "Framework Choice vs Storage Boundary",
    shortTitle: "Storage boundary",
    category: "Data Flow",
    difficulty: "Junior",
    scenario:
      "A project stores many records in localStorage. Someone suggests that rewriting the UI in React and TypeScript will solve the scalability problem.",
    prompt:
      "Explain whether changing the UI framework solves the storage problem. Identify which layer React and TypeScript improve, which localStorage limitations remain, and what kind of next storage choice might actually address the bottleneck.",
    criteria: [
      "Separates UI structure from persistence strategy.",
      "Mentions localStorage limitations such as synchronous access and serialization.",
      "Explains what React and TypeScript can still improve.",
      "Names a more appropriate persistence direction when scale requires it.",
    ],
  },
];
