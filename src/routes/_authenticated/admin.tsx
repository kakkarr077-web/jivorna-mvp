import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CalendarClock,
  GraduationCap,
  LayoutDashboard,
  Receipt,
  Send,
  Settings,
  UserPlus,
  Users,
} from "lucide-react";
import { DashboardLayout, type NavItem } from "@/components/layouts/DashboardLayout";
import { RoleGate } from "@/components/auth/RoleGate";

const nav: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/leads", label: "Leads", icon: UserPlus },
  { to: "/admin/schools", label: "Schools", icon: Building2 },
  { to: "/admin/teachers", label: "Teachers", icon: GraduationCap },
  { to: "/admin/jobs", label: "Jobs", icon: Briefcase },
  { to: "/admin/applications", label: "Applications", icon: Send },
  { to: "/admin/interviews", label: "Interviews", icon: CalendarClock },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/invoices", label: "Invoices", icon: Receipt },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/notifications", label: "Notifications", icon: Bell },
];

export const Route = createFileRoute("/_authenticated/admin")({
  component: () => (
    <RoleGate allow="admin">
      <DashboardLayout portal="Operations CRM" nav={nav}>
        <Outlet />
      </DashboardLayout>
    </RoleGate>
  ),
});
