import { useState, type FormEvent } from "react";
import { fixedQuestion } from "./data/fixedQuestion";
import { rubricCriteria } from "./data/rubricCriteria";
import { fakeEvaluator } from "./lib/fakeEvaluator";
import type { EvaluationResult, UserAnswer } from "./types/reasoning";

export default function App() {
  const [answerText, setAnswerText] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] =
    useState<EvaluationResult | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // logic guard for empty answer or ongoing evaluation 
    if (!answerText.trim() || isEvaluating) return;

    const userAnswer: UserAnswer = {
      questionId: fixedQuestion.id,
      text: answerText,
    };

    setIsEvaluating(true);
    setEvaluationResult(null);

    // API call and handling
    try {
      const result = await fakeEvaluator(fixedQuestion, userAnswer);
      setEvaluationResult(result);
    } finally {
      setIsEvaluating(false);
    }
  }

  return (
    <main className="app-shell">
      <h1>Frontend Reasoning Lab</h1>
      <section className="question-block" aria-labelledby="question-title">
        <h2 id="question-title">{fixedQuestion.title}</h2>
        <p>{fixedQuestion.scenario}</p>
        <p>{fixedQuestion.prompt}</p>
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

      {isEvaluating && <p className="status-text">Evaluation is running...</p>}

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
    </main>
  );
}
