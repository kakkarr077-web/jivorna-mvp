import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { ComingSoon } from "@/components/shared/ComingSoon";

export const Route = createFileRoute("/_authenticated/admin/teachers")({
  component: () => (
    <ComingSoon
      title="Teachers"
      description="Candidate records, verification status and profile quality."
      icon={GraduationCap}
      note="Teacher verification and quality review tooling is on the way."
    />
  ),
});
