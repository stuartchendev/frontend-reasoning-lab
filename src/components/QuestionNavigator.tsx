import { staticNavigationItems } from "../data/staticNavigationItems";
import type { SelectedContent } from "../types/navigation";
import type { ReasoningQuestions } from "../types/reasoning";
type QuestionNavigatorProps = {
    questions: ReasoningQuestions[];
    selectedContent: SelectedContent;
    searchText: string;
    onSelectContent: (content: SelectedContent) => void;
    onSearchTextChange: (searchText: string) => void;
}
export function QuestionNavigator({
    questions,
    searchText,
    selectedContent,
    onSelectContent,
    onSearchTextChange
}: QuestionNavigatorProps) {

    const selectedQuestionId = selectedContent.type === "question"
        ? selectedContent.questionId
        : undefined;

    const groupedQuestions = questions.reduce<
        Record<string, typeof questions>
    >((groups, question) => {
        const currentGroup = groups[question.category] ?? [];
        return {
            ...groups,
            [question.category]: [...currentGroup, question],
        }
    }, {});

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
                {staticNavigationItems.map((item) => {

                    const isActive = selectedContent.type === item.content.type;

                    return(
                    <button
                        key={item.content.type}
                        type="button"
                        className={`question-navigator__link question-navigator__link--static${
                            isActive ? " is-active" : ""
                            }`}
                        aria-current={
                            isActive ? "page" : undefined
                        }
                        onClick={() => onSelectContent({ type: "overview" })}
                    >
                        <span className="question-navigator__title">
                            {item.label}
                        </span>
                    </button>
                    );
                })}

                {questions.length === 0 ?
                    (
                        <div className="question-navigator__empty">
                            <p>No question found</p>
                            <span>Try another keyword.</span>
                        </div>
                    ) :
                    (
                        Object.entries(groupedQuestions).map(([category, categoryQuestions]) => (
                            <section
                                key={category}
                                className="question-navigator__group"
                            >
                                <h3 className="question-navigator__group-title">
                                    {category}
                                </h3>

                                <div className="question-navigator__group-list">
                                    {categoryQuestions.map((question) => (
                                        <button
                                            key={question.id}
                                            type="button"
                                            className={`question-navigator__link${question.id === selectedQuestionId
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
                                            <span className="question-navigator__order">
                                                {question.order}
                                            </span>

                                            <span className="question-navigator__text">
                                                <span className="question-navigator__title">
                                                    {question.shortTitle}
                                                </span>

                                                <span className="question-navigator__meta">
                                                    {question.difficulty}
                                                </span>
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        ))
                    )

                }
            </nav>
        </aside>
    );
}
