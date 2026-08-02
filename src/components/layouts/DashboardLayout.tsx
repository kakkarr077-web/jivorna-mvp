import type { ReactNode } from "react";
import { useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { LogOut, Menu, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export type NavItem = { to: string; label: string; icon: LucideIcon; exact?: boolean };

export function DashboardLayout({
  portal,
  nav,
  children,
}: {
  portal: string;
  nav: NavItem[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    void router.navigate({ to: "/" });
  };

  const navList = (
    <nav className="flex flex-col gap-1">
      {nav.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={() => setOpen(false)}
          activeOptions={{ exact: item.exact ?? false }}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium" }}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto flex w-full max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between bg-sidebar px-4 py-6 lg:flex">
          <div>
            <Logo tone="light" />
            <p className="eyebrow mt-6 mb-3 px-3 text-sidebar-primary">{portal}</p>
            {navList}
          </div>
          <div className="space-y-3 border-t border-sidebar-border pt-4">
            <p className="truncate px-3 text-xs text-sidebar-foreground/70">{user?.email}</p>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/90 px-5 backdrop-blur lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border lg:hidden"
                onClick={() => setOpen((v) => !v)}
                aria-label="Toggle menu"
              >
                {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
              <span className="font-serif text-lg">{portal}</span>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/">Public site</Link>
              </Button>
              <Button variant="outline" size="sm" className="lg:hidden" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          </header>

          {open && (
            <div className={cn("bg-sidebar px-4 py-4 lg:hidden")}>{navList}</div>
          )}

          <main className="flex-1 px-5 py-8 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
