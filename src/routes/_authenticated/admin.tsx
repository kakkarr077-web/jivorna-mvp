import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CalendarClock,
  CalendarDays,
  CheckSquare,
  LayoutDashboard,
  Receipt,
  Send,
  Settings,
  Target,
  Users,
  GraduationCap,
} from "lucide-react";
import { DashboardLayout, type NavItem } from "@/components/layouts/DashboardLayout";
import { RoleGate } from "@/components/auth/RoleGate";
import { GlobalSearch } from "@/components/admin/GlobalSearch";

const nav: NavItem[] = [
  { to: "/admin", label: "Workspace", icon: LayoutDashboard, exact: true },
  { to: "/admin/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/admin/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/admin/leads", label: "Leads", icon: Target },
  { to: "/admin/schools", label: "Schools", icon: Building2 },
  { to: "/admin/teachers", label: "Teachers", icon: GraduationCap },
  { to: "/admin/jobs", label: "Jobs", icon: Briefcase },
  { to: "/admin/applications", label: "Applications", icon: Send },
  { to: "/admin/interviews", label: "Interviews", icon: CalendarClock },
  { to: "/admin/activity", label: "Activity", icon: Activity },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/invoices", label: "Invoices", icon: Receipt },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/notifications", label: "Notifications", icon: Bell },
];

export const Route = createFileRoute("/_authenticated/admin")({
  component: () => (
    <RoleGate allow={["admin", "recruiter"]}>
      <DashboardLayout portal="Operations CRM" nav={nav}>
        <GlobalSearch />
        <Outlet />
      </DashboardLayout>
    </RoleGate>
  ),
});
