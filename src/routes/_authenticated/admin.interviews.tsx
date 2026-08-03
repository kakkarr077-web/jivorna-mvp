import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";
import { ComingSoon } from "@/components/shared/ComingSoon";

export const Route = createFileRoute("/_authenticated/admin/interviews")({
  component: () => (
    <ComingSoon
      title="Interviews"
      description="Scheduled interviews and demo classes across all schools."
      icon={CalendarClock}
      note="Interview scheduling oversight is being built."
    />
  ),
});
