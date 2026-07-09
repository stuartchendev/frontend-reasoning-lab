import type { ReasoningQuestion } from "../types/reasoning";
type QuestionNavigatorProps = {
    questions: ReasoningQuestion[];
}

export function QuestionNavigator({ questions }: QuestionNavigatorProps) {
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