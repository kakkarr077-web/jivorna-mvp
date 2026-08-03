import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Bell, Briefcase, ClipboardList, LayoutDashboard, Send, Settings, UserRound } from "lucide-react";
import { DashboardLayout, type NavItem } from "@/components/layouts/DashboardLayout";
import { RoleGate } from "@/components/auth/RoleGate";
import { useProfileIncompleteNotice } from "@/hooks/useProfileIncompleteNotice";

const nav: NavItem[] = [
  { to: "/teacher", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/teacher/onboarding", label: "Registration", icon: ClipboardList },
  { to: "/teacher/jobs", label: "Find jobs", icon: Briefcase },
  { to: "/teacher/applications", label: "My applications", icon: Send },
  { to: "/teacher/profile", label: "My profile", icon: UserRound },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/notifications", label: "Notifications", icon: Bell },
];

/** Only mounted once RoleGate has confirmed the visitor is a teacher. */
function TeacherShell() {
  useProfileIncompleteNotice();
  return (
    <DashboardLayout portal="Teacher portal" nav={nav}>
      <Outlet />
    </DashboardLayout>
  );
}

export const Route = createFileRoute("/_authenticated/teacher")({
  component: () => (
    <RoleGate allow="teacher">
      <TeacherShell />
    </RoleGate>
  ),
});
