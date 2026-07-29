type QuestionBriefProps = {
  readonly titleId: string;
  readonly metadata: readonly string[];
  readonly title: string;
  readonly prompt: readonly string[];
  readonly codeSnippet?: string;
  readonly evaluationGuide: readonly string[];
};

export function QuestionBrief({
  titleId,
  metadata,
  title,
  prompt,
  codeSnippet,
  evaluationGuide,
}: QuestionBriefProps) {
  const evaluationGuideTitleId = `${titleId}-evaluation-guide`;

  return (
    <>
      <section className="question-block" aria-labelledby={titleId}>
        <p className="question-brief__meta">{metadata.join(" · ")}</p>
        <h1 id={titleId}>{title}</h1>
        {prompt.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {codeSnippet && (
          <pre className="v3-code-block">
            <code>{codeSnippet}</code>
          </pre>
        )}
      </section>

      <details
        className="evaluation-guide"
        aria-labelledby={evaluationGuideTitleId}
      >
        <summary id={evaluationGuideTitleId}>Evaluation guide</summary>
        <ul>
          {evaluationGuide.map((criterion) => (
            <li key={criterion}>{criterion}</li>
          ))}
        </ul>
      </details>
    </>
  );
}
