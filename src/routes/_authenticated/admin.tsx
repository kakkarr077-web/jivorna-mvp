import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Bell, Briefcase, LayoutDashboard, Receipt, Users } from "lucide-react";
import { DashboardLayout, type NavItem } from "@/components/layouts/DashboardLayout";
import { RoleGate } from "@/components/auth/RoleGate";

const nav: NavItem[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/jobs", label: "All vacancies", icon: Briefcase },
  { to: "/admin/invoices", label: "Invoices", icon: Receipt },
  { to: "/notifications", label: "Notifications", icon: Bell },
];

export const Route = createFileRoute("/_authenticated/admin")({
  component: () => (
    <RoleGate allow="admin">
      <DashboardLayout portal="Admin portal" nav={nav}>
        <Outlet />
      </DashboardLayout>
    </RoleGate>
  ),
});
