import type { ReasoningQuestions } from "../types/reasoning";
type QuestionNavigatorProps = {
    questions: ReasoningQuestions[];
    selectedQuestionId: string | null;
    searchText: string;
    onSelectQuestion: (id: string) => void;
    onSearchTextChange: (questionId: string) => void;
}
export function QuestionNavigator({
    questions,
    searchText,
    selectedQuestionId,
    onSelectQuestion,
    onSearchTextChange
}: QuestionNavigatorProps) {

    return (
        <aside className="question-navigator" aria-label="Question navigator">
            <div className="question-navigator__header">
                <input
                    className="question-navigator__search"
                    type="search"
                    value={searchText}
                    onChange={(event) => onSearchTextChange(event.target.value)}
                    placeholder="Search questions..."
                    aria-label="Search questions..."
                ></input>
            </div>

            <nav className="question-navigator__nav">
                {questions.length === 0 ?
                    (
                        <div className="question-navigator__empty">
                            <p>No question found</p>
                            <span>Try another keyword.</span>
                        </div>
                    ) : (
                        questions.map((question) => (
                            <button
                                key={question.id}
                                type="button"
                                className={`question-navigator__link${question.id === selectedQuestionId ? " is-active" : ""
                                    }`}
                                aria-current={
                                    question.id === selectedQuestionId ? "page" : undefined
                                }
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
                        ))
                    )

                }
            </nav>
        </aside>
    );
}
