import { useEffect, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth, dashboardPathForRole } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup" | "forgot";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode?: Mode | undefined } => {
    const m = search["mode"];
    return { mode: m === "signup" || m === "forgot" ? m : undefined };
  },
  head: () => ({
    meta: [
      { title: "Sign in — Jivorna" },
      {
        name: "description",
        content:
          "Sign in or create your Jivorna account as a teacher or a school to access your dashboard.",
      },
      { property: "og:title", content: "Sign in — Jivorna" },
      { property: "og:description", content: "Access your Jivorna teacher, school or admin dashboard." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode: initialMode } = Route.useSearch();
  const [mode, setMode] = useState<Mode>(initialMode ?? "signin");
  const [role, setRole] = useState<"teacher" | "school">("teacher");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<{ kind: "verify" | "reset"; email: string } | null>(null);
  const router = useRouter();
  const { user, role: currentRole, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      void router.navigate({ to: dashboardPathForRole(currentRole), replace: true });
    }
  }, [loading, user, currentRole, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName, role },
          },
        });
        if (error) throw error;
        // With email confirmation on, no session is returned until the user
        // clicks the link in their inbox.
        if (!data.session) setSentTo({ kind: "verify", email });
        else toast.success("Account created. Welcome to Jivorna.");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSentTo({ kind: "reset", email });
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

  const resend = async () => {
    if (!sentTo) return;
    setBusy(true);
    try {
      if (sentTo.kind === "verify") {
        const { error } = await supabase.auth.resend({
          type: "signup",
          email: sentTo.email,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(sentTo.email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
      }
      toast.success("Sent again — check your inbox.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resend the email");
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

  const switchMode = (next: Mode) => {
    setSentTo(null);
    setMode(next);
  };

  const title =
    mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Welcome back";
  const blurb =
    mode === "signup"
      ? "Choose the portal that fits you. You can update details later."
      : mode === "forgot"
        ? "Enter the email on your account and we'll send a secure reset link."
        : "Sign in to reach your dashboard.";

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

          {sentTo ? (
            <div className="mt-8">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary">
                <MailCheck className="h-5 w-5" />
              </span>
              <h1 className="text-display mt-6 text-3xl">Check your inbox</h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {sentTo.kind === "verify"
                  ? "We've sent a verification link to "
                  : "We've sent a password reset link to "}
                <span className="font-medium text-foreground">{sentTo.email}</span>.{" "}
                {sentTo.kind === "verify"
                  ? "Confirm your address to activate your account and reach your dashboard."
                  : "The link opens a page where you can choose a new password."}
              </p>
              <div className="mt-7 grid gap-2">
                <Button variant="outline" size="lg" onClick={resend} disabled={busy}>
                  {busy ? "Sending…" : "Resend email"}
                </Button>
                <Button variant="ghost" size="lg" onClick={() => switchMode("signin")}>
                  Back to sign in
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-display mt-8 text-3xl lg:mt-0">{title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{blurb}</p>

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
                {mode !== "forgot" && (
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      {mode === "signin" && (
                        <button
                          type="button"
                          onClick={() => switchMode("forgot")}
                          className="text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="••••••••"
                    />
                  </div>
                )}
                <Button type="submit" size="lg" disabled={busy}>
                  {busy
                    ? "Please wait…"
                    : mode === "signup"
                      ? "Create account"
                      : mode === "forgot"
                        ? "Send reset link"
                        : "Sign in"}
                </Button>
              </form>

              {mode !== "forgot" && (
                <>
                  <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="h-px flex-1 bg-border" /> or{" "}
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <Button variant="outline" size="lg" className="w-full" onClick={google}>
                    Continue with Google
                  </Button>
                </>
              )}

              <p className="mt-8 text-center text-sm text-muted-foreground">
                {mode === "signin" ? (
                  <>
                    New to Jivorna?{" "}
                    <button
                      type="button"
                      className="font-medium text-primary underline-offset-4 hover:underline"
                      onClick={() => switchMode("signup")}
                    >
                      Create one
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="font-medium text-primary underline-offset-4 hover:underline"
                      onClick={() => switchMode("signin")}
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Administrator accounts are created by the Jivorna team.
              </p>
            </>
          )}

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
