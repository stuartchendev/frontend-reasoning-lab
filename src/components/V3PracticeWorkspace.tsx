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
import { reactStateOwnershipQuestion } from "../domain/v3/questionContent";
import { QuestionBrief } from "./QuestionBrief";

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
  readonly selectRecommendedQuestion: (questionId: string) => void;
  readonly evaluationGuide: readonly string[];
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

function formatIdentifier(value: string): string {
  const words = value.replaceAll("-", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
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
  selectRecommendedQuestion,
  evaluationGuide,
}: V3PracticeWorkspaceProps) {
  const hasReferenceDemoAnswers =
    question.id === reactStateOwnershipQuestion.id;
  const activeStep =
    state.phase === "revising"
      ? "revise"
      : state.phase === "reviewing-revision" ||
          state.phase === "revision-review-failed" ||
          state.phase === "complete"
        ? "review"
        : "answer";

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
              {hasReferenceDemoAnswers && (
                <button
                  type="button"
                  className="practice-action practice-action--secondary"
                  onClick={() => setAnswerDraft(flawedStateOwnershipAnswer)}
                >
                  Load demo answer
                </button>
              )}
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
              <header className="result-block__header">
                <p className="result-block__eyebrow">
                  {formatIdentifier(
                    state.diagnosis.primaryGap.criterionId,
                  )}
                </p>
                <h2 id="v3-gap-title">What to revise</h2>
              </header>
              <p>{state.diagnosis.primaryGap.explanation}</p>
              <div className="v3-feedback-detail">
                <h3>Your answer says</h3>
                <p>
                  <q>{state.diagnosis.primaryGap.learnerEvidence}</q>
                </p>
              </div>
              <div className="v3-feedback-detail">
                <h3>Why this matters</h3>
                <p>{state.diagnosis.primaryGap.whyItMatters}</p>
              </div>
              <div className="v3-follow-up">
                <p className="result-block__eyebrow">Focus question</p>
                <p>{state.diagnosis.followUpQuestion}</p>
              </div>
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
                {hasReferenceDemoAnswers && (
                  <button
                    type="button"
                    className="practice-action practice-action--secondary"
                    onClick={() =>
                      setRevisionDraft(revisedStateOwnershipAnswer)
                    }
                  >
                    Load improved answer
                  </button>
                )}
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
                      <span>
                        {formatIdentifier(assessment.criterionId)}
                      </span>
                      <strong>{formatIdentifier(assessment.status)}</strong>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          );
        }

        const nextAction = state.comparison.nextAction;

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
              <header className="result-block__header">
                <p className="result-block__eyebrow">
                  {formatIdentifier(state.comparison.resolution)}
                </p>
                <h2 id="v3-comparison-title">Revision comparison</h2>
              </header>
              <div className="v3-comparison-evidence">
                <section>
                  <h3>Original evidence</h3>
                  <p>
                    <q>{state.comparison.originalEvidence}</q>
                  </p>
                </section>
                <section>
                  <h3>Revised evidence</h3>
                  <p>
                    <q>{state.comparison.revisedEvidence}</q>
                  </p>
                </section>
              </div>
              <p className="v3-comparison-summary">
                {state.comparison.comparisonSummary}
              </p>
              {nextAction && (
                <div className="v3-next-action">
                  <h3>Next practice action</h3>
                  <p>{nextAction.rationale}</p>
                  <button
                    type="button"
                    className="practice-action"
                    onClick={() =>
                      selectRecommendedQuestion(nextAction.questionId)
                    }
                  >
                    Start recommended question
                  </button>
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
          <QuestionBrief
            titleId="v3-question-title"
            metadata={[
              question.category,
              question.difficulty,
              question.languageContext,
            ]}
            title={question.title}
            prompt={[question.prompt]}
            codeSnippet={question.codeSnippet}
            evaluationGuide={evaluationGuide}
          />

          <div className="practice-workflow">
            <ol className="v3-progress" aria-label="Practice progress">
              <li className={activeStep === "answer" ? "is-active" : ""}>
                <span>1</span>
                Answer
              </li>
              <li className={activeStep === "revise" ? "is-active" : ""}>
                <span>2</span>
                Revise
              </li>
              <li className={activeStep === "review" ? "is-active" : ""}>
                <span>3</span>
                Review
              </li>
            </ol>
            {renderPhase()}
          </div>
        </div>
      </div>
    </section>
  );
}
