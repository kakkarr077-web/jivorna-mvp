import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { useAuth, dashboardPathForRole } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const links = [
  { to: "/jobs", label: "Browse Jobs" },
  { to: "/for-teachers", label: "For Teachers" },
  { to: "/for-schools", label: "For Schools" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, role } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 band-ink transition-shadow duration-300",
        scrolled ? "shadow-ink" : "",
      )}
    >
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-6 px-5 lg:px-10">
        <Logo tone="light" />

        <nav className="hidden items-center gap-8 lg:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="relative py-1 text-[0.82rem] tracking-wide text-ink-muted transition-colors hover:text-ink-foreground"
              activeProps={{
                className:
                  "text-ink-foreground after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-full after:bg-gold",
              }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <Button asChild size="sm" variant="gold" className="rounded-none px-5">
              <Link to={dashboardPathForRole(role)}>Dashboard</Link>
            </Button>
          ) : (
            <>
              <Link
                to="/auth"
                className="text-[0.82rem] tracking-wide text-ink-muted transition-colors hover:text-ink-foreground"
              >
                Sign in
              </Link>
              <Button asChild size="sm" variant="gold" className="rounded-none px-5">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Get started
                </Link>
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center border border-ink-border text-ink-foreground lg:hidden"
          aria-label="Toggle navigation"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-ink-border lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col px-5 py-3">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="border-b border-ink-border py-3 text-sm text-ink-muted transition-colors hover:text-ink-foreground"
                activeProps={{ className: "text-ink-foreground" }}
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-4 flex flex-col gap-2 pb-4">
              {user ? (
                <Button asChild variant="gold" className="rounded-none" onClick={() => setOpen(false)}>
                  <Link to={dashboardPathForRole(role)}>Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="onDark" className="rounded-none" onClick={() => setOpen(false)}>
                    <Link to="/auth">Sign in</Link>
                  </Button>
                  <Button asChild variant="gold" className="rounded-none" onClick={() => setOpen(false)}>
                    <Link to="/auth" search={{ mode: "signup" }}>
                      Get started
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
