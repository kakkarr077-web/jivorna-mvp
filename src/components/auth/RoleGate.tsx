import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { FullPageLoader } from "@/components/ui/full-page-loader";
import { useAuth, dashboardPathForRole, type AppRole } from "@/hooks/useAuth";

/**
 * Client-side role gate for portal layouts. The `_authenticated` layout has
 * already guaranteed a session; this narrows access to a single role and
 * sends anyone else to the dashboard that matches their own role.
 *
 * Children are never mounted until the role check has fully resolved, so an
 * unauthorised visitor never sees a flash of the wrong dashboard shell.
 */
export function RoleGate({ allow, children }: { allow: AppRole; children: ReactNode }) {
  const { role, loading } = useAuth();
  const router = useRouter();
  const allowed = !loading && role === allow;

  useEffect(() => {
    if (loading || allowed) return;
    void router.navigate({ to: role ? dashboardPathForRole(role) : "/auth", replace: true });
  }, [loading, allowed, role, router]);

  if (!allowed) {
    return <FullPageLoader label={loading ? "Checking your access…" : "Redirecting…"} />;
  }

  return <>{children}</>;
}
