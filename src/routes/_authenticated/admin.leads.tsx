import { createFileRoute } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import { ComingSoon } from "@/components/shared/ComingSoon";

export const Route = createFileRoute("/_authenticated/admin/leads")({
  component: () => (
    <ComingSoon
      title="Leads"
      description="Inbound school and teacher enquiries, qualification and follow-ups."
      icon={UserPlus}
      note="Lead capture, assignment and pipeline tracking are being built for the operations team."
    />
  ),
});
