import { useRef, useState, type FormEvent } from "react";
import { fixedQuestions } from "./data/fixedQuestions";
import { rubricCriteria } from "./data/rubricCriteria";
import { fakeEvaluator } from "./lib/fakeEvaluator";
import { OverviewPanel } from "./components/OverviewPanel";
import { ProjectIntro } from "./components/ProjectIntro";
import { QuestionNavigator } from "./components/QuestionNavigator";
import { ProjectFooter } from "./components/ProjectFooter";
import { V3PracticeWorkspace } from "./components/V3PracticeWorkspace";
import { reactStateOwnershipQuestion } from "./domain/v3/questionContent";
import { usePracticeSession } from "./hooks/v3/usePracticeSession";
import { createDiagnoseInitialAnswerService } from "./lib/v3/diagnoseInitialAnswerService";
import { createHttpPracticeEvaluationAdapter } from "./lib/v3/httpPracticeEvaluationAdapter";
import type { SelectedContent } from "./types/navigation";
import type { EvaluationResult, UserAnswer } from "./types/reasoning";

const practiceEvaluationAdapter = createHttpPracticeEvaluationAdapter(
  createDiagnoseInitialAnswerService(),
);

export default function App() {
  const [selectedContent, setSelectedContent] =
    useState<SelectedContent>({ type: "overview" });
  const [searchText, setSearchText] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] =
    useState<EvaluationResult | null>(null);
  const evaluationRequestVersionRef = useRef(0);
  const practiceSession = usePracticeSession({
    initialQuestion: reactStateOwnershipQuestion,
    adapter: practiceEvaluationAdapter,
  });

  const selectedQuestion =
    selectedContent.type === "question"
      ? fixedQuestions.find(
        (question) => question.id === selectedContent.questionId,
      )
      : undefined;
  const isV3ReferenceSelected =
    selectedContent.type === "question" &&
    selectedContent.questionId === reactStateOwnershipQuestion.id;

  // for QuestionNavigator Search filter
  const filteredQuestions = fixedQuestions.filter((question) => {
    const normalizedSearchText = searchText.trim().toLowerCase();

    if (!normalizedSearchText) return true;

    return [
      question.order,
      question.title,
      question.shortTitle,
      question.category
    ].some((value) => value.toLowerCase().includes(normalizedSearchText));
  });

  const handleSelectContent = (content: SelectedContent) => {
    evaluationRequestVersionRef.current += 1;
    setSelectedContent(content);
    setAnswerText("");
    setIsEvaluating(false);
    setEvaluationResult(null);

    if (
      content.type === "question" &&
      content.questionId === reactStateOwnershipQuestion.id
    ) {
      practiceSession.startQuestion(reactStateOwnershipQuestion);
    }
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
    if (isV3ReferenceSelected) {
      return (
        <V3PracticeWorkspace
          question={reactStateOwnershipQuestion}
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
            <section className="question-block" aria-labelledby="question-title">
              <h1 id="question-title">{selectedQuestion.title}</h1>
              <p>{selectedQuestion.scenario}</p>
              <p>{selectedQuestion.prompt}</p>
            </section>

            <details
              className="evaluation-guide"
              aria-labelledby="evaluation-guide-title"
            >
              <summary id="evaluation-guide-title">Evaluation guide</summary>
              <ul>
                {rubricCriteria.map((criterion) => (
                  <li key={criterion}>{criterion}</li>
                ))}
              </ul>
            </details>

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
      <div className="workspace-layout">
        <QuestionNavigator
          questions={filteredQuestions}
          searchText={searchText}
          selectedContent={selectedContent}
          onSelectContent={handleSelectContent}
          onSearchTextChange={setSearchText}
        />
        {renderSelectedContent()}
      </div>
      <ProjectFooter />
    </main>
  );
}
