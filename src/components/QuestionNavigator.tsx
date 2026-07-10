import type { ReasoningQuestions } from "../types/reasoning";
type QuestionNavigatorProps = {
    questions: ReasoningQuestions[];
    onSelectQuestion: (id: string) => void;
}
export function QuestionNavigator({ questions, onSelectQuestion }: QuestionNavigatorProps) {

    return (
        <aside className="question-navigator" aria-label="Question navigator">
            <div className="question-navigator__header">
                <p className="question-navigator__eyebrow">QuestionNavigator</p>
                <p className="question-navigator__subtitle">
                    Practice frontend reasoning
                </p>
            </div>

            <nav className="question-navigator__nav">
                {questions.map((question) => (
                    <button
                        key={question.id}
                        type="button"
                        className="question-navigator__link"
                        onClick={() => onSelectQuestion(question.id)}
                    >
                        <span className="question-navigator__order">{question.order}</span>

                        <span className="question-navigator__text">
                            <span className="question-navigator__title">
                                {question.shortTitle}
                            </span>
                            <span className="question-navigator__meta">
                                {question.category} · {question.difficulty}
                            </span>
                        </span>
                    </button>
                ))}
            </nav>
        </aside>
    );
}