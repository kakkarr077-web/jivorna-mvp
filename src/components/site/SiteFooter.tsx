import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";

const columns = [
  {
    title: "Platform",
    links: [
      { to: "/jobs", label: "Browse jobs" },
      { to: "/for-teachers", label: "For teachers" },
      { to: "/for-schools", label: "For schools" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/about", label: "About Jivorna" },
      { to: "/contact", label: "Contact" },
      { to: "/auth", label: "Sign in" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="band-ink grid-field">
      <div className="mx-auto max-w-7xl px-5 pt-20 pb-10 lg:px-10">
        <div className="grid gap-14 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo tone="light" />
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-ink-muted">
              Jivorna connects outstanding teachers with schools that value them — a considered,
              transparent alternative to recruitment agencies.
            </p>
            <div className="rule-gold mt-8 w-40" />
            <p className="mt-4 font-serif text-lg text-ink-foreground">
              Where talent meets opportunity
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <p className="eyebrow text-gold">{col.title}</p>
              <ul className="mt-6 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="text-sm text-ink-muted transition-colors hover:text-ink-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col gap-2 border-t border-ink-border pt-6 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Jivorna. All rights reserved.</p>
          <p>Built for schools and teachers who expect better.</p>
        </div>
      </div>
    </footer>
  );
}
