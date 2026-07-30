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
                Frontend Reasoning Lab is a bounded reference workflow showing
                how application architecture can constrain AI while it
                diagnoses and improves frontend reasoning. It is an engineering
                demonstration, not a course platform.
              </p>
            </header>

            <section
              className="overview-content__section"
              aria-labelledby="overview-how-it-works"
            >
              <h2 id="overview-how-it-works">How it works</h2>
              <ol>
                <li>Choose an example and explain your frontend reasoning.</li>
                <li>Receive one validated diagnosis of a reasoning gap.</li>
                <li>
                  Revise your answer, compare what improved, and continue to one
                  bounded next question.
                </li>
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
                <li>Evaluation adapter</li>
                <li>Validated diagnosis</li>
                <li>Revision</li>
                <li>Validated comparison</li>
                <li>Recommended next question</li>
              </ol>
              <p>
                Local development uses live model inference. The public
                walkthrough replays validated responses captured from a real
                local model run. Both enter the same application workflow
                through one adapter contract.
              </p>
              <p>
                Session identity and legal reducer transitions remain
                application-owned, preventing stale results from updating the
                current question.
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
                <li>Application-owned React state and phase transitions</li>
                <li>Structurally and semantically validated model output</li>
                <li>Execution-source-independent evaluation composition</li>
                <li>Honest public replay and local live-AI boundaries</li>
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
