import type { FormEvent } from "react";
import {
  flawedStateOwnershipAnswer,
  revisedStateOwnershipAnswer,
} from "../data/v3/referencePracticeFixtures";
import type { PracticeSessionState } from "../domain/v3/practiceSession";
import {
  selectCanSubmitAnswer,
  selectCanSubmitRevision,
} from "../domain/v3/practiceSessionSelectors";
import type { QuestionContent } from "../domain/v3/questionContent";

type V3PracticeWorkspaceProps = {
  readonly question: QuestionContent;
  readonly state: PracticeSessionState;
  readonly setAnswerDraft: (value: string) => void;
  readonly submitAnswer: () => Promise<void>;
  readonly retryDiagnosis: () => Promise<void>;
  readonly editAfterDiagnosisFailure: () => void;
  readonly setRevisionDraft: (value: string) => void;
  readonly submitRevision: () => Promise<void>;
  readonly retryRevisionReview: () => Promise<void>;
  readonly editAfterRevisionReviewFailure: () => void;
};

type AnswerSnapshotProps = {
  readonly title: string;
  readonly answer: string;
};

function consumeCommand(command: () => Promise<void>): void {
  // The hook maps adapter failures into session state; the component only
  // consumes rejected command promises so they cannot become unhandled.
  void command().catch(() => undefined);
}

function AnswerSnapshot({ title, answer }: AnswerSnapshotProps) {
  return (
    <section className="v3-snapshot">
      <h2>{title}</h2>
      <p>{answer}</p>
    </section>
  );
}

export function V3PracticeWorkspace({
  question,
  state,
  setAnswerDraft,
  submitAnswer,
  retryDiagnosis,
  editAfterDiagnosisFailure,
  setRevisionDraft,
  submitRevision,
  retryRevisionReview,
  editAfterRevisionReviewFailure,
}: V3PracticeWorkspaceProps) {
  function handleAnswerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    consumeCommand(submitAnswer);
  }

  function handleRevisionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    consumeCommand(submitRevision);
  }

  function renderPhase() {
    switch (state.phase) {
      case "answering":
        return (
          <form className="answer-form" onSubmit={handleAnswerSubmit}>
            <label htmlFor="v3-answer">Your answer:</label>
            <textarea
              id="v3-answer"
              value={state.answerDraft}
              onChange={(event) => setAnswerDraft(event.target.value)}
              placeholder="Explain the state ownership and data flow."
              rows={7}
            />
            <div className="practice-actions">
              <button
                type="button"
                className="practice-action practice-action--secondary"
                onClick={() => setAnswerDraft(flawedStateOwnershipAnswer)}
              >
                Load demo answer
              </button>
              <button
                type="submit"
                className="practice-action"
                disabled={!selectCanSubmitAnswer(state)}
              >
                Analyze reasoning
              </button>
            </div>
          </form>
        );

      case "diagnosing":
        return (
          <>
            <AnswerSnapshot
              title="Submitted answer"
              answer={state.originalAnswer}
            />
            <p className="status-text" role="status" aria-live="polite">
              Analyzing your reasoning against the question criteria…
            </p>
          </>
        );

      case "revising":
        return (
          <>
            <section
              className="result-block v3-diagnosis"
              aria-labelledby="v3-gap-title"
            >
              <h2 id="v3-gap-title">Primary reasoning gap</h2>
              <p>
                <strong>Criterion:</strong>{" "}
                {state.diagnosis.primaryGap.criterionId}
              </p>
              <p>{state.diagnosis.primaryGap.explanation}</p>
              <p>
                <strong>Learner evidence:</strong>{" "}
                <q>{state.diagnosis.primaryGap.learnerEvidence}</q>
              </p>
              <p>
                <strong>Why it matters:</strong>{" "}
                {state.diagnosis.primaryGap.whyItMatters}
              </p>
              <p>
                <strong>Targeted follow-up:</strong>{" "}
                {state.diagnosis.followUpQuestion}
              </p>
            </section>
            <form className="answer-form" onSubmit={handleRevisionSubmit}>
              <label htmlFor="v3-revision">Revise your answer:</label>
              <textarea
                id="v3-revision"
                value={state.revisionDraft}
                onChange={(event) => setRevisionDraft(event.target.value)}
                rows={8}
              />
              <div className="practice-actions">
                <button
                  type="button"
                  className="practice-action practice-action--secondary"
                  onClick={() =>
                    setRevisionDraft(revisedStateOwnershipAnswer)
                  }
                >
                  Load improved answer
                </button>
                <button
                  type="submit"
                  className="practice-action"
                  disabled={!selectCanSubmitRevision(state)}
                >
                  Review revision
                </button>
              </div>
            </form>
          </>
        );

      case "reviewing-revision":
        return (
          <>
            <div className="v3-snapshot-grid">
              <AnswerSnapshot
                title="Original answer"
                answer={state.originalAnswer}
              />
              <AnswerSnapshot
                title="Submitted revision"
                answer={state.revisedAnswer}
              />
            </div>
            <p className="status-text" role="status" aria-live="polite">
              Comparing your original and revised reasoning…
            </p>
          </>
        );

      case "diagnosis-failed":
        return (
          <>
            <AnswerSnapshot
              title="Submitted answer"
              answer={state.originalAnswer}
            />
            <section className="v3-failure" role="alert">
              <h2>Diagnosis unavailable</h2>
              <p>{state.failure.message}</p>
              <div className="practice-actions">
                {state.failure.retryable && (
                  <button
                    type="button"
                    className="practice-action"
                    onClick={() => consumeCommand(retryDiagnosis)}
                  >
                    Retry
                  </button>
                )}
                <button
                  type="button"
                  className="practice-action practice-action--secondary"
                  onClick={editAfterDiagnosisFailure}
                >
                  Edit answer
                </button>
              </div>
            </section>
          </>
        );

      case "revision-review-failed":
        return (
          <>
            <div className="v3-snapshot-grid">
              <AnswerSnapshot
                title="Original answer"
                answer={state.originalAnswer}
              />
              <AnswerSnapshot
                title="Submitted revision"
                answer={state.revisedAnswer}
              />
            </div>
            <section className="v3-failure" role="alert">
              <h2>Revision review unavailable</h2>
              <p>{state.failure.message}</p>
              <div className="practice-actions">
                {state.failure.retryable && (
                  <button
                    type="button"
                    className="practice-action"
                    onClick={() => consumeCommand(retryRevisionReview)}
                  >
                    Retry
                  </button>
                )}
                <button
                  type="button"
                  className="practice-action practice-action--secondary"
                  onClick={editAfterRevisionReviewFailure}
                >
                  Continue editing
                </button>
              </div>
            </section>
          </>
        );

      case "complete":
        if (state.completionKind === "initial-sufficient") {
          return (
            <>
              <AnswerSnapshot
                title="Submitted answer"
                answer={state.originalAnswer}
              />
              <section
                className="result-block"
                aria-labelledby="v3-sufficient-title"
              >
                <h2 id="v3-sufficient-title">Reasoning is sufficient</h2>
                <p>
                  The submitted answer covers every required criterion for
                  this reference question.
                </p>
                <ul className="v3-assessment-list">
                  {state.diagnosis.assessments.map((assessment) => (
                    <li key={assessment.criterionId}>
                      <code>{assessment.criterionId}</code>:{" "}
                      {assessment.status}
                    </li>
                  ))}
                </ul>
              </section>
            </>
          );
        }

        return (
          <>
            <div className="v3-snapshot-grid">
              <AnswerSnapshot
                title="Original answer"
                answer={state.originalAnswer}
              />
              <AnswerSnapshot
                title="Revised answer"
                answer={state.revisedAnswer}
              />
            </div>
            <section
              className="result-block"
              aria-labelledby="v3-comparison-title"
            >
              <h2 id="v3-comparison-title">Revision comparison</h2>
              <p>
                <strong>Resolution:</strong> {state.comparison.resolution}
              </p>
              <p>
                <strong>Original evidence:</strong>{" "}
                <q>{state.comparison.originalEvidence}</q>
              </p>
              <p>
                <strong>Revised evidence:</strong>{" "}
                <q>{state.comparison.revisedEvidence}</q>
              </p>
              <p>{state.comparison.comparisonSummary}</p>
              {state.comparison.nextAction && (
                <div className="v3-next-action">
                  <h3>Next practice action</h3>
                  <p>
                    <strong>Question ID:</strong>{" "}
                    <code>{state.comparison.nextAction.questionId}</code>
                  </p>
                  <p>{state.comparison.nextAction.rationale}</p>
                </div>
              )}
            </section>
          </>
        );
    }
  }

  return (
    <section className="practice-panel" aria-labelledby="v3-question-title">
      <div className="practice-layout">
        <div className="practice-main">
          <section
            className="question-block"
            aria-labelledby="v3-question-title"
          >
            <p className="v3-question-meta">
              {question.category} · {question.difficulty} ·{" "}
              {question.languageContext}
            </p>
            <h1 id="v3-question-title">{question.title}</h1>
            <p>{question.prompt}</p>
            {question.codeSnippet && (
              <pre className="v3-code-block">
                <code>{question.codeSnippet}</code>
              </pre>
            )}
            <dl className="v3-question-context">
              <div>
                <dt>Evaluation mode</dt>
                <dd>{question.evaluationMode}</dd>
              </div>
              <div>
                <dt>Syntax policy</dt>
                <dd>{question.syntaxPolicy}</dd>
              </div>
              <div>
                <dt>Target concepts</dt>
                <dd>{question.targetConceptIds.join(", ")}</dd>
              </div>
            </dl>
          </section>

          <p className="v3-demo-note">
            Deterministic reference demo — use the provided sample answers to
            exercise the verified flow.
          </p>

          <div className="practice-workflow">{renderPhase()}</div>
        </div>
      </div>
    </section>
  );
}
