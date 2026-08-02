import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Bell, Building2, LayoutDashboard, Briefcase, Search, Users } from "lucide-react";
import { DashboardLayout, type NavItem } from "@/components/layouts/DashboardLayout";
import { RoleGate } from "@/components/auth/RoleGate";

const nav: NavItem[] = [
  { to: "/school", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/school/jobs", label: "Vacancies", icon: Briefcase },
  { to: "/school/applicants", label: "Applicants", icon: Users },
  { to: "/school/teachers", label: "Browse teachers", icon: Search },
  { to: "/school/profile", label: "School profile", icon: Building2 },
  { to: "/notifications", label: "Notifications", icon: Bell },
];


export const Route = createFileRoute("/_authenticated/school")({
  component: () => (
    <RoleGate allow="school">
      <DashboardLayout portal="School portal" nav={nav}>
        <Outlet />
      </DashboardLayout>
    </RoleGate>
  ),
});
