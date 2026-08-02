import { useEffect, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth, dashboardPathForRole } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode?: Mode | undefined } => ({
    mode: search["mode"] === "signup" ? "signup" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Jivorna" },
      {
        name: "description",
        content: "Sign in or create your Jivorna account as a teacher or a school to access your dashboard.",
      },
      { property: "og:title", content: "Sign in — Jivorna" },
      { property: "og:description", content: "Access your Jivorna teacher, school or admin dashboard." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode: initialMode } = Route.useSearch();
  const [mode, setMode] = useState<Mode>(initialMode === "signup" ? "signup" : "signin");
  const [role, setRole] = useState<"teacher" | "school">("teacher");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { user, role: currentRole, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      void router.navigate({ to: dashboardPathForRole(currentRole) });
    }
  }, [loading, user, currentRole, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, role },
          },
        });
        if (error) throw error;
        toast.success("Account created. Welcome to Jivorna.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-navy p-12 lg:flex">
        <Logo tone="light" />
        <div>
          <h2 className="text-display max-w-sm text-4xl text-primary-foreground">
            One platform. Three portals. Zero agency fees.
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-primary-foreground/75">
            Teachers manage their profile and applications. Schools publish roles and shortlist.
            Administrators keep the standard high.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/50">© {new Date().getFullYear()} Jivorna</p>
      </div>

      <div className="flex items-center justify-center bg-background px-5 py-14">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <Logo />
          </div>

          <h1 className="text-display mt-8 text-3xl lg:mt-0">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signup"
              ? "Choose the portal that fits you. You can update details later."
              : "Sign in to reach your dashboard."}
          </p>

          {mode === "signup" && (
            <div className="mt-7 grid grid-cols-2 gap-2">
              {(["teacher", "school"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    "rounded-lg border px-4 py-3 text-sm capitalize transition-colors",
                    role === r
                      ? "border-primary bg-primary-soft font-medium text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  I'm a {r}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={submit} className="mt-6 grid gap-4">
            {mode === "signup" && (
              <div className="grid gap-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Amara Okafor"
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@school.org"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" size="lg" disabled={busy}>
              {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" size="lg" className="w-full" onClick={google}>
            Continue with Google
          </Button>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            {mode === "signup" ? "Already have an account?" : "New to Jivorna?"}{" "}
            <button
              type="button"
              className="font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            >
              {mode === "signup" ? "Sign in" : "Create one"}
            </button>
          </p>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              Back to jivorna.com
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
