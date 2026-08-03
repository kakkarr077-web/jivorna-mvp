import { createFileRoute } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { ComingSoon } from "@/components/shared/ComingSoon";

export const Route = createFileRoute("/_authenticated/admin/schools")({
  component: () => (
    <ComingSoon
      title="Schools"
      description="Every registered institution, subscription state and account owner."
      icon={Building2}
      note="A dedicated school account manager view is on the way."
    />
  ),
});
