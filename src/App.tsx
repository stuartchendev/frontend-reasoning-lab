import { useRef, useState, type FormEvent } from "react";
import { fixedQuestions } from "./data/fixedQuestions";
import { rubricCriteria } from "./data/rubricCriteria";
import { fakeEvaluator } from "./lib/fakeEvaluator";
import { OverviewPanel } from "./components/OverviewPanel";
import { ProjectIntro } from "./components/ProjectIntro";
import { QuestionNavigator } from "./components/QuestionNavigator";
import { QuestionBrief } from "./components/QuestionBrief";
import { ProjectFooter } from "./components/ProjectFooter";
import { V3PracticeWorkspace } from "./components/V3PracticeWorkspace";
import { AiRuntimeStatusPanel } from "./components/AiRuntimeStatusPanel";
import {
  getV3PracticeQuestion,
  reactStateOwnershipQuestion,
  v3PracticeQuestions,
} from "./domain/v3/questionContent";
import { usePracticeSession } from "./hooks/v3/usePracticeSession";
import { createPracticeEvaluationComposition } from "./lib/v3/practiceEvaluationComposition";
import type { SelectedContent } from "./types/navigation";
import type { EvaluationResult, UserAnswer } from "./types/reasoning";

const practiceEvaluation = createPracticeEvaluationComposition({
  isDevelopment: import.meta.env.DEV,
});

export default function App() {
  const [selectedContent, setSelectedContent] =
    useState<SelectedContent>({ type: "overview" });
  const [answerText, setAnswerText] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] =
    useState<EvaluationResult | null>(null);
  const evaluationRequestVersionRef = useRef(0);
  const practiceSession = usePracticeSession({
    initialQuestion: reactStateOwnershipQuestion,
    adapter: practiceEvaluation.adapter,
  });

  const selectedQuestion =
    selectedContent.type === "question"
      ? fixedQuestions.find(
        (question) => question.id === selectedContent.questionId,
      )
      : undefined;
  const selectedV3Question =
    selectedContent.type === "question"
      ? getV3PracticeQuestion(selectedContent.questionId)
      : undefined;

  const handleSelectContent = (content: SelectedContent) => {
    evaluationRequestVersionRef.current += 1;
    setSelectedContent(content);
    setAnswerText("");
    setIsEvaluating(false);
    setEvaluationResult(null);

    if (content.type === "question") {
      const nextV3Question = getV3PracticeQuestion(content.questionId);

      if (nextV3Question) {
        practiceSession.startQuestion(nextV3Question);
      }
    }
  };

  const handleSelectRecommendedQuestion = (questionId: string) => {
    if (!getV3PracticeQuestion(questionId)) return;

    handleSelectContent({ type: "question", questionId });
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // logic guard for empty answer or ongoing evaluation 
    if (!answerText.trim() || isEvaluating || !selectedQuestion) return;

    const userAnswer: UserAnswer = {
      questionId: selectedQuestion.id,
      text: answerText,
    };
    const requestVersion = evaluationRequestVersionRef.current + 1;

    evaluationRequestVersionRef.current = requestVersion;

    setIsEvaluating(true);
    setEvaluationResult(null);

    // API call and handling
    try {
      const result = await fakeEvaluator(selectedQuestion, userAnswer);

      if (evaluationRequestVersionRef.current === requestVersion) {
        setEvaluationResult(result);
      }
    } finally {
      if (evaluationRequestVersionRef.current === requestVersion) {
        setIsEvaluating(false);
      }
    }
  }

  function renderSelectedContent() {
    if (selectedContent.type === "overview") {
      return <OverviewPanel />;
    }
    if (selectedV3Question) {
      return (
        <V3PracticeWorkspace
          question={selectedV3Question}
          state={practiceSession.state}
          setAnswerDraft={practiceSession.setAnswerDraft}
          submitAnswer={practiceSession.submitAnswer}
          retryDiagnosis={practiceSession.retryDiagnosis}
          editAfterDiagnosisFailure={
            practiceSession.editAfterDiagnosisFailure
          }
          setRevisionDraft={practiceSession.setRevisionDraft}
          submitRevision={practiceSession.submitRevision}
          retryRevisionReview={practiceSession.retryRevisionReview}
          editAfterRevisionReviewFailure={
            practiceSession.editAfterRevisionReviewFailure
          }
          selectRecommendedQuestion={handleSelectRecommendedQuestion}
          evaluationGuide={rubricCriteria}
          executionMode={practiceEvaluation.mode}
        />
      );
    }
    if (!selectedQuestion) {
      return <p role="alert">The selected question could not be found.</p>
    }

    return (
      <section className="practice-panel" aria-labelledby="question-title">
        <div className="practice-layout">
          <div className="practice-main">
            <QuestionBrief
              titleId="question-title"
              metadata={[
                selectedQuestion.category,
                selectedQuestion.difficulty,
              ]}
              title={selectedQuestion.title}
              prompt={[selectedQuestion.scenario, selectedQuestion.prompt]}
              evaluationGuide={rubricCriteria}
            />

            <div className="practice-workflow">
              <form className="answer-form" onSubmit={handleSubmit}>
                <label htmlFor="answer">Your answer:</label>
                <textarea
                  id="answer"
                  value={answerText}
                  onChange={(event) => setAnswerText(event.target.value)}
                  placeholder="Type Answer here!"
                  rows={6}
                />
                <button type="submit" disabled={isEvaluating || !answerText.trim()}>
                  {isEvaluating ? "Evaluating..." : "Submit"}
                </button>
              </form>

              {isEvaluating && (
                <p className="status-text" role="status" aria-live="polite">
                  Evaluation is running. Your result will appear below.
                </p>
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
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <main className="page-shell">
      <section className="project-intro">
        <ProjectIntro />
      </section>
      <div className="workspace-shell">
        <div className="workspace-layout">
          <QuestionNavigator
            guidedQuestions={v3PracticeQuestions}
            selectedContent={selectedContent}
            onSelectContent={handleSelectContent}
          />
          <div className="workspace-main">{renderSelectedContent()}</div>
          {import.meta.env.DEV && (
            <div className="ai-runtime-panel-slot">
              <AiRuntimeStatusPanel />
            </div>
          )}
        </div>
      </div>
      <ProjectFooter />
    </main>
  );
}
