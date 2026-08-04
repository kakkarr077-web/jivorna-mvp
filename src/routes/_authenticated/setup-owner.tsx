import { useEffect, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldCheck, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FullPageLoader } from "@/components/ui/full-page-loader";
import { claimOwnership, getOwnerBootstrapStatus } from "@/lib/owner-bootstrap.functions";

export const Route = createFileRoute("/_authenticated/setup-owner")({
  head: () => ({
    meta: [
      { title: "Owner setup — Jivorna" },
      {
        name: "description",
        content:
          "One-time owner bootstrap for a new Jivorna workspace. Available only until the first administrator is created.",
      },
      { property: "og:title", content: "Owner setup — Jivorna" },
      {
        property: "og:description",
        content: "Claim the first administrator account for your Jivorna workspace.",
      },
    ],
  }),
  component: SetupOwnerPage,
});

function SetupOwnerPage() {
  const router = useRouter();
  const fetchStatus = useServerFn(getOwnerBootstrapStatus);
  const claim = useServerFn(claimOwnership);
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["owner-bootstrap-status"],
    queryFn: () => fetchStatus(),
    staleTime: 0,
  });

  const locked = !!data && !data.available;

  useEffect(() => {
    if (!locked) return;
    toast.error("Owner account has already been configured.");
    void router.navigate({ to: "/auth", replace: true });
  }, [locked, router]);

  if (isLoading) return <FullPageLoader label="Checking owner setup…" />;
  if (locked) return <FullPageLoader label="Redirecting…" />;

  const promote = async () => {
    setBusy(true);
    try {
      await claim();
      toast.success("You're now the owner. Welcome to the admin dashboard.");
      // Full reload so the auth context picks up the new admin role.
      window.location.assign("/admin");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not complete owner setup.");
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-16">
      <div className="card-premium w-full max-w-lg space-y-6 p-8">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-gold" />
          <h1 className="font-serif text-2xl text-primary">Owner setup</h1>
        </div>

        <div className="flex gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          <p>
            This page is available only until the first administrator is created. Once an owner
            exists it is disabled permanently, and further admins are granted from Admin → Users.
          </p>
        </div>

        <div className="rounded-xl border border-border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Signed in as</p>
          <p className="mt-1 text-sm font-medium text-foreground">{data?.email ?? "Your account"}</p>
        </div>

        <Button className="w-full" disabled={busy} onClick={() => void promote()}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Make me the Owner
        </Button>

        <p className="text-xs text-muted-foreground">
          Your existing teacher or school access stays exactly as it is — the admin role is added
          alongside it.
        </p>
      </div>
    </main>
  );
}
