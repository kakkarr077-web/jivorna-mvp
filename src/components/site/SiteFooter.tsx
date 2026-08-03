import { Link } from "@tanstack/react-router";
import { Linkedin, Instagram, Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

const columns = [
  {
    title: "Company",
    links: [
      { to: "/about", label: "About" },
      { to: "/contact", label: "Contact" },
      { to: "/privacy", label: "Privacy Policy" },
      { to: "/terms", label: "Terms" },
    ],
  },
  {
    title: "Resources",
    links: [
      { to: "/for-schools", label: "For Schools" },
      { to: "/for-teachers", label: "For Teachers" },
      { to: "/contact", label: "Support" },
      { to: "/faq", label: "FAQ" },
    ],
  },
] as const;

const contactDetails = [
  { icon: Phone, label: "+91 80 4718 2200", href: "tel:+918047182200" },
  { icon: Mail, label: "hello@jivorna.com", href: "mailto:hello@jivorna.com" },
] as const;

const socials = [
  { icon: Linkedin, label: "LinkedIn", href: "https://www.linkedin.com/" },
  { icon: Instagram, label: "Instagram", href: "https://www.instagram.com/" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Jivorna connects outstanding teachers with schools that value them — a considered,
            transparent alternative to recruitment agencies.
          </p>
          <div className="mt-6 flex items-center gap-3">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={s.label}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-gold hover:text-gold"
              >
                <s.icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-semibold text-foreground">{col.title}</h3>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h3 className="text-sm font-semibold text-foreground">Contact</h3>
          <ul className="mt-4 space-y-3">
            {contactDetails.map((c) => (
              <li key={c.label}>
                <a
                  href={c.href}
                  className="flex items-start gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <c.icon className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  <span>{c.label}</span>
                </a>
              </li>
            ))}
            <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <span>
                Jivorna HQ, 4th Floor, Prestige Atrium
                <br />
                Residency Road, Bengaluru 560025
              </span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>© {new Date().getFullYear()} Jivorna. All rights reserved.</p>
          <p>Built for schools and teachers who expect better.</p>
        </div>
      </div>
    </footer>
  );
}
