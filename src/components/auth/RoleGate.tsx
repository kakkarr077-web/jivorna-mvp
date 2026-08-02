import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth, dashboardPathForRole, type AppRole } from "@/hooks/useAuth";

/**
 * Client-side role gate for portal layouts. The `_authenticated` layout has
 * already guaranteed a session; this narrows access to a single role and
 * sends anyone else to the dashboard that matches their own role.
 */
export function RoleGate({ allow, children }: { allow: AppRole; children: ReactNode }) {
  const { role, loading } = useAuth();
  const router = useRouter();
  const allowed = role === allow;

  useEffect(() => {
    if (loading || allowed) return;
    void router.navigate({ to: role ? dashboardPathForRole(role) : "/auth", replace: true });
  }, [loading, allowed, role, router]);

  if (loading || !allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
