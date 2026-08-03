import { createFileRoute } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { ComingSoon } from "@/components/shared/ComingSoon";

export const Route = createFileRoute("/_authenticated/admin/applications")({
  component: () => (
    <ComingSoon
      title="Applications"
      description="Cross-platform view of every application and its hiring stage."
      icon={Send}
      note="A consolidated application monitor for the operations team is being built."
    />
  ),
});
