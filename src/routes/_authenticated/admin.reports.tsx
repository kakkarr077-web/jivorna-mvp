import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { ComingSoon } from "@/components/shared/ComingSoon";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: () => (
    <ComingSoon
      title="Reports"
      description="Revenue, hiring velocity and marketplace performance analytics."
      icon={BarChart3}
      note="Exportable operations reporting is being built."
    />
  ),
});
