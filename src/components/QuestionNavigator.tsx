import { staticNavigationItems } from "../data/staticNavigationItems";
import type { QuestionContent } from "../domain/v3/questionContent";
import type { SelectedContent } from "../types/navigation";
type QuestionNavigatorProps = {
    guidedQuestions: readonly QuestionContent[];
    selectedContent: SelectedContent;
    onSelectContent: (content: SelectedContent) => void;
}
export function QuestionNavigator({
    guidedQuestions,
    selectedContent,
    onSelectContent,
}: QuestionNavigatorProps) {

    const selectedQuestionId = selectedContent.type === "question"
        ? selectedContent.questionId
        : undefined;

    return (
        <aside className="question-navigator" aria-label="Question navigator">
            <div className="question-navigator__header">
                <h2 className="question-navigator__heading">
                    Guided practice
                </h2>
            </div>

            <nav className="question-navigator__nav">
                {staticNavigationItems.map((item) => {
                    const isActive = item.content.type === "overview"
                        ? selectedContent.type === "overview"
                        : selectedContent.type === "question" &&
                        selectedContent.questionId === item.content.questionId;
                    const itemKey = item.content.type === "overview"
                        ? item.content.type
                        : `${item.content.type}:${item.content.questionId}`;

                    return (
                        <button
                            key={itemKey}
                            type="button"
                            className={`question-navigator__link question-navigator__link--overview${isActive ? " is-active" : ""
                                }`}
                            aria-current={
                                isActive ? "page" : undefined
                            }
                            onClick={() => onSelectContent(item.content)}
                        >
                            <span className="question-navigator__title">
                                {item.label}
                            </span>
                        </button>
                    );
                })}

                {guidedQuestions.length > 0 && (
                    <section className="question-navigator__section question-navigator__section--guided">
                        <h3 className="question-navigator__section-title">
                            AI-guided examples
                        </h3>
                        <div className="question-navigator__group-list">
                            {guidedQuestions.map((question) => (
                                <button
                                    key={question.id}
                                    type="button"
                                    className={`question-navigator__link question-navigator__link--guided${question.id === selectedQuestionId
                                        ? " is-active"
                                        : ""
                                        }`}
                                    aria-current={
                                        question.id === selectedQuestionId
                                            ? "page"
                                            : undefined
                                    }
                                    onClick={() => onSelectContent({
                                        type: "question",
                                        questionId: question.id,
                                    })}
                                >
                                    <span className="question-navigator__text">
                                        <span className="question-navigator__title">
                                            {question.title}
                                        </span>
                                        <span className="question-navigator__meta">
                                            Answer → Revise → Review
                                        </span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {guidedQuestions.length === 0 ?
                    (
                        <div className="question-navigator__empty">
                            <p>No guided examples available.</p>
                        </div>
                    ) : null
                }
            </nav>
        </aside>
    );
}
