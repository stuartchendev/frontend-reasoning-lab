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
                Frontend Reasoning Lab is a working reference flow for using
                architecture-constrained AI to diagnose and improve frontend
                reasoning.
              </p>
            </header>

            <section
              className="overview-content__section"
              aria-labelledby="overview-how-it-works"
            >
              <h2 id="overview-how-it-works">How it works</h2>
              <ol>
                <li>Choose an example and explain your frontend reasoning.</li>
                <li>Receive a focused diagnosis of one reasoning gap.</li>
                <li>Revise your answer and compare what improved.</li>
              </ol>
            </section>

            <section
              className="overview-content__section"
              aria-labelledby="overview-data-flow"
            >
              <h2 id="overview-data-flow">Data flow</h2>
              <ol className="overview-flow">
                <li>Question selection</li>
                <li>Answer submission</li>
                <li>Model boundary</li>
                <li>Structured diagnosis</li>
                <li>Revision</li>
                <li>Comparison</li>
                <li>Recommended next question</li>
              </ol>
              <p>
                Model responses pass through typed contracts and semantic
                validation before entering React state.
              </p>
              <p>
                Pending requests are invalidated when the active question changes,
                preventing stale results from updating the current session.
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
                <li>Bounded model output</li>
                <li>Validated data flow</li>
                <li>Clear AI-assisted workflow responsibility boundaries</li>
              </ul>
            </section>

            <footer className="overview-content__start">
              <p>Choose a guided example from the navigator to begin.</p>
            </footer>
          </article>
        </div>
      </div>
    </section>
  );
}
