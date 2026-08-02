import { useEffect } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth, dashboardPathForRole } from "@/hooks/useAuth";

/**
 * Post-login landing route. Sends each signed-in user to the dashboard that
 * matches their role: teacher -> /teacher, school -> /school, admin -> /admin.
 */
export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardRedirect,
});

function DashboardRedirect() {
  const { role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !role) return;
    void router.navigate({ to: dashboardPathForRole(role), replace: true });
  }, [loading, role, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-surface">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Taking you to your dashboard…</p>
    </div>
  );
}
