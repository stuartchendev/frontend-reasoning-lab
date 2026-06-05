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

export function ProjectFooter() {
  return (
    <footer className="project-footer">
      <nav className="project-footer__links" aria-label="Project links">
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

      <h2>Frontend reasoning, made visible.</h2>
      <p>
        A small React + TypeScript project focused on state, data flow,
        evaluator boundaries, and responsible AI-assisted implementation review.
        <em>AI-assisted workflow notes are documented in the repo.</em>
      </p>
      <p className="project-footer__closing">
        Built by Yi-Ting (Stuart) Chen · Open to junior frontend and
        remote-friendly roles.
      </p>
    </footer>
  );
}
