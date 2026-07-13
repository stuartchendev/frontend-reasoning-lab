export function OverviewPanel() {
  return (
    <section
      className="practice-panel overview-panel"
      aria-labelledby="overview-title"
    >
      <div className="practice-layout">
        <div className="practice-main">
          <article className="overview-content">
            <header className="overview-content__intro">
              <h1 id="overview-title">Overview</h1>
              <p>
                Frontend Reasoning Lab is a React and TypeScript practice
                workspace designed to make frontend reasoning visible through
                structured questions, written responses, and evaluation feedback.
              </p>
            </header>

            <section
              className="overview-content__section"
              aria-labelledby="overview-how-it-works"
            >
              <h2 id="overview-how-it-works">How it works</h2>
              <ol>
                <li>Choose a frontend reasoning question from the navigator.</li>
                <li>Review the scenario and write your response.</li>
                <li>Submit your answer to receive structured feedback.</li>
              </ol>
            </section>

            <section
              className="overview-content__section"
              aria-labelledby="overview-data-flow"
            >
              <h2 id="overview-data-flow">Data flow</h2>
              <ol className="overview-flow">
                <li>Question selection</li>
                <li>App-owned state</li>
                <li>Answer submission</li>
                <li>Evaluator boundary</li>
                <li>Structured result</li>
                <li>UI feedback</li>
              </ol>
              <p>
                The evaluator currently uses a deterministic mock implementation,
                allowing the interaction and state flow to be reviewed independently
                from an external AI service.
              </p>
              <p>
                Pending evaluation requests are invalidated when the selected
                content changes, preventing stale results from updating the current
                view.
              </p>
            </section>

            <section
              className="overview-content__section"
              aria-labelledby="overview-demonstrates"
            >
              <h2 id="overview-demonstrates">
                What this project demonstrates
              </h2>
              <ul>
                <li>Explicit React state ownership</li>
                <li>Predictable component data flow</li>
                <li>Clear evaluator and UI responsibility boundaries</li>
                <li>
                  Responsible review of AI-assisted implementation decisions
                </li>
              </ul>
            </section>

            <footer className="overview-content__start">
              <p>Choose a question from the navigator to begin.</p>
            </footer>
          </article>
        </div>
      </div>
    </section>
  );
}
