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
    <nav className="flex flex-col">
      {nav.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={() => setOpen(false)}
          activeOptions={{ exact: item.exact ?? false }}
          className="relative flex items-center gap-3 px-4 py-2.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeProps={{
            className:
              "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-sidebar-primary",
          }}
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
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between bg-sidebar lg:flex">
          <div>
            <div className="px-5 py-6">
              <Logo tone="light" />
            </div>
            <p className="eyebrow mb-3 px-4 text-sidebar-primary">{portal}</p>
            {navList}
          </div>
          <div className="space-y-3 border-t border-sidebar-border px-4 py-5">
            <p className="truncate text-xs text-sidebar-foreground/60">{user?.email}</p>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 rounded-none px-0 text-sidebar-foreground hover:bg-transparent hover:text-sidebar-primary"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/90 px-5 backdrop-blur lg:px-10">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center border border-border lg:hidden"
                onClick={() => setOpen((v) => !v)}
                aria-label="Toggle menu"
              >
                {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
              <span className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                {portal}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Button asChild variant="ghost" size="sm" className="hidden rounded-none sm:inline-flex">
                <Link to="/">Public site</Link>
              </Button>
              <Button variant="outline" size="sm" className="rounded-none lg:hidden" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          </header>

          {open && (
            <div className={cn("bg-sidebar py-3 lg:hidden")}>{navList}</div>
          )}

          <main className="flex-1 px-5 py-10 lg:px-10">{children}</main>
        </div>
      </div>
    </div>
  );
}

