const footerLinks = [
  {
    label: "GitHub Repo",
    href: "https://github.com/stuartchendev/frontend-reasoning-lab",
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
        A small React + TypeScript project focused on state, data flow, and
        responsible AI-assisted implementation review.
      </p>
      <p className="project-footer__closing">
        Built by Yi-Ting (Stuart) Chen · Open to junior frontend and
        remote-friendly roles.
      </p>
    </footer>
  );
}
