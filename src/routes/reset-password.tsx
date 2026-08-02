import { useEffect, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — Jivorna" },
      {
        name: "description",
        content: "Set a new password for your Jivorna teacher, school or administrator account.",
      },
      { property: "og:title", content: "Choose a new password — Jivorna" },
      { property: "og:description", content: "Set a new password for your Jivorna account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  // Supabase delivers a recovery session via the URL fragment. Wait for the
  // client to consume it before deciding whether this link is usable.
  useEffect(() => {
    let active = true;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setValid(true);
        setReady(true);
      }
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) setValid(true);
      setReady(true);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Those passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You're signed in.");
      void router.navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update your password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-14">
      <div className="w-full max-w-sm">
        <Logo />
        <h1 className="text-display mt-8 text-3xl">Choose a new password</h1>

        {!ready ? (
          <p className="mt-3 text-sm text-muted-foreground">Checking your reset link…</p>
        ) : !valid ? (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              This reset link is invalid or has expired. Request a new one and it will arrive within
              a minute.
            </p>
            <Button asChild size="lg" className="mt-6 w-full">
              <Link to="/auth" search={{ mode: "forgot" }}>
                Request a new link
              </Link>
            </Button>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Pick something at least 8 characters long that you don't use elsewhere.
            </p>
            <form onSubmit={submit} className="mt-7 grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="password">New password</Label>
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
              <div className="grid gap-2">
                <Label htmlFor="confirm">Confirm new password</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" size="lg" disabled={busy}>
                {busy ? "Updating…" : "Update password"}
              </Button>
            </form>
          </>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Back to jivorna.com
          </Link>
        </p>
      </div>
    </div>
  );
}
