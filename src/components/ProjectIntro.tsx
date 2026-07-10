const footerLinks = [
  {
    label: "GitHub Repo",
    href: "https://github.com/stuartchendev/frontend-reasoning-lab",
  },
  {
    label: "Decision Log",
    href: "https://github.com/stuartchendev/frontend-reasoning-lab/blob/927427b3028dd8cbe9c09ba1a6ef9219c798fc1f/docs/ai-assisted-decision-log.md",
  },
  {
    label: "Portfolio",
    href: "https://stuartchendev.github.io/",
  },
];

export function ProjectIntro() {
  return (
    <>
      <div className="project-intro__main">
        <div>
          <p className="project-intro__eyebrow">Frontend Reasoning Lab</p>

          <h2>Frontend reasoning, made visible.</h2>

          <p className="project-intro__description">
            A React + TypeScript practice project focused on state, data flow,
            evaluator boundaries, and responsible AI-assisted implementation review.
          </p>
        </div>

        <nav className="project-intro__links" aria-label="Project links">
          {footerLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>

      {/* <div className="project-intro__meta">
        <p>AI-assisted workflow notes are documented in the repo.</p>
        <p>
          Built by Yi-Ting (Stuart) Chen · Open to junior frontend and
          remote-friendly roles.
        </p>
      </div> */}
    </>
  );
}
