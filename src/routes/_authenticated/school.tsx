import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Building2, LayoutDashboard, Briefcase, Users } from "lucide-react";
import { DashboardLayout, type NavItem } from "@/components/layouts/DashboardLayout";

const nav: NavItem[] = [
  { to: "/school", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/school/jobs", label: "Vacancies", icon: Briefcase },
  { to: "/school/applicants", label: "Applicants", icon: Users },
  { to: "/school/profile", label: "School profile", icon: Building2 },
];

export const Route = createFileRoute("/_authenticated/school")({
  component: () => (
    <DashboardLayout portal="School portal" nav={nav}>
      <Outlet />
    </DashboardLayout>
  ),
});
