import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { FullPageLoader } from "@/components/ui/full-page-loader";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  // Show the spinner immediately while the session check runs, rather than
  // letting the previous screen linger or a shell mount underneath.
  pendingMs: 0,
  pendingMinMs: 0,
  pendingComponent: () => <FullPageLoader label="Checking your session…" />,
  component: () => <Outlet />,
});
