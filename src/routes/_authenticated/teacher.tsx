import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Briefcase, LayoutDashboard, Send, UserRound } from "lucide-react";
import { DashboardLayout, type NavItem } from "@/components/layouts/DashboardLayout";

const nav: NavItem[] = [
  { to: "/teacher", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/teacher/jobs", label: "Find jobs", icon: Briefcase },
  { to: "/teacher/applications", label: "My applications", icon: Send },
  { to: "/teacher/profile", label: "My profile", icon: UserRound },
];

export const Route = createFileRoute("/_authenticated/teacher")({
  component: () => (
    <DashboardLayout portal="Teacher portal" nav={nav}>
      <Outlet />
    </DashboardLayout>
  ),
});
