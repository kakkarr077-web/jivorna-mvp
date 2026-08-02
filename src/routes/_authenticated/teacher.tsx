import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Bell, Briefcase, ClipboardList, LayoutDashboard, Send, UserRound } from "lucide-react";
import { DashboardLayout, type NavItem } from "@/components/layouts/DashboardLayout";
import { RoleGate } from "@/components/auth/RoleGate";

const nav: NavItem[] = [
  { to: "/teacher", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/teacher/onboarding", label: "Registration", icon: ClipboardList },
  { to: "/teacher/jobs", label: "Find jobs", icon: Briefcase },
  { to: "/teacher/applications", label: "My applications", icon: Send },
  { to: "/teacher/profile", label: "My profile", icon: UserRound },
  { to: "/notifications", label: "Notifications", icon: Bell },
];

function TeacherPortal() {
  useProfileIncompleteNotice();
  return (
    <RoleGate allow="teacher">
      <DashboardLayout portal="Teacher portal" nav={nav}>
        <Outlet />
      </DashboardLayout>
    </RoleGate>
  );
}

export const Route = createFileRoute("/_authenticated/teacher")({
  component: TeacherPortal,
});
