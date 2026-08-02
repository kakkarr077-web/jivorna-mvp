import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Briefcase, LayoutDashboard, Users } from "lucide-react";
import { DashboardLayout, type NavItem } from "@/components/layouts/DashboardLayout";

const nav: NavItem[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/jobs", label: "All vacancies", icon: Briefcase },
];

export const Route = createFileRoute("/_authenticated/admin")({
  component: () => (
    <DashboardLayout portal="Admin portal" nav={nav}>
      <Outlet />
    </DashboardLayout>
  ),
});
