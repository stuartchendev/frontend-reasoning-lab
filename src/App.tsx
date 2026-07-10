import { useState, type FormEvent } from "react";
import { fixedQuestions } from "./data/fixedQuestions";
import { rubricCriteria } from "./data/rubricCriteria";
import { fakeEvaluator } from "./lib/fakeEvaluator";
import { ProjectIntro } from "./components/ProjectIntro";
import { QuestionNavigator } from "./components/QuestionNavigator";
import type { EvaluationResult, UserAnswer } from "./types/reasoning";

const flowSteps = [
  {
    label: "Question",
    source: "source: fixedQuestion",
  },
  {
    label: "Evaluation Criteria",
    source: "source: rubricCriteria",
  },
  {
    label: "User Answer",
    source: "state: answerText",
  },
  {
    label: "Fake Evaluator Boundary",
    source: "function: fakeEvaluator(question, answer)",
  },
  {
    label: "Evaluation Result",
    source: "state: evaluationResult",
  },
];

export default function App() {
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] =
    useState<EvaluationResult | null>(null);

  const selectedQuestion = fixedQuestions.find((question) => question.id === selectedQuestionId);

  const handleSelectQuestion = (id: string) => {
    setSelectedQuestionId(id);
    setAnswerText("");
    setEvaluationResult(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // logic guard for empty answer or ongoing evaluation 
    if (!answerText.trim() || isEvaluating || !selectedQuestion) return;

    const userAnswer: UserAnswer = {
      questionId: selectedQuestion.id,
      text: answerText,
    };

    setIsEvaluating(true);
    setEvaluationResult(null);

    // API call and handling
    try {
      const result = await fakeEvaluator(selectedQuestion, userAnswer);
      setEvaluationResult(result);
    } finally {
      setIsEvaluating(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="project-intro">
        <ProjectIntro />
      </section>
      <div className="workspace-layout">
        <QuestionNavigator questions={fixedQuestions} onSelectQuestion={handleSelectQuestion} />
        {selectedQuestion ?
          <section className="app-shell" aria-labelledby="app-title">
            <h1 id="app-title">Frontend Reasoning Lab</h1>
            <section className="question-block" aria-labelledby="question-title">
              <h2 id="question-title">{selectedQuestion.title}</h2>
              <p>{selectedQuestion.scenario}</p>
              <p>{selectedQuestion.prompt}</p>
            </section>

            <section className="criteria-block" aria-labelledby="criteria-title">
              <h2 id="criteria-title">Evaluation Criteria</h2>
              <ul>
                {rubricCriteria.map((criterion) => (
                  <li key={criterion}>{criterion}</li>
                ))}
              </ul>
            </section>

            <form className="answer-form" onSubmit={handleSubmit}>
              <label htmlFor="answer">Your answer</label>
              <textarea
                id="answer"
                value={answerText}
                onChange={(event) => setAnswerText(event.target.value)}
                rows={8}
              />
              <button type="submit" disabled={isEvaluating || !answerText.trim()}>
                {isEvaluating ? "Evaluating..." : "Submit answer"}
              </button>
            </form>

            {isEvaluating && (
              <p className="status-text">Evaluation is running...</p>
            )}

            {evaluationResult && (
              <section className="result-block" aria-labelledby="result-title">
                <h2 id="result-title">Evaluation result</h2>
                <p>
                  <strong>Status:</strong>{" "}
                  {evaluationResult.isComplete ? "Complete" : "Incomplete"}
                </p>
                <p>
                  <strong>Summary:</strong> {evaluationResult.summary}
                </p>
                <p>
                  <strong>Feedback:</strong> {evaluationResult.feedback}
                </p>
              </section>
            )}
          </section> :
          <p>Please select a question</p>
        }
      </div>
    </main>
  );
}

{/* flow panel
<aside className="flow-panel" aria-labelledby="flow-title">
        <h2 id="flow-title">Data-flow Loop</h2>
        <p>
          This panel maps the current UI to the data and state used by the tiny
          proof.
        </p>
        <ol>
          {flowSteps.map((step) => (
            <li key={step.label}>
              <strong>{step.label}</strong>
              <span>{step.source}</span>
            </li>
          ))}
        </ol>
</aside> 
*/}


