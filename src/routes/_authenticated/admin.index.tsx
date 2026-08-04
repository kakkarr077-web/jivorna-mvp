import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Building2, CalendarClock, ClipboardList, Send, Users } from "lucide-react";
import { PageHeader, MetricCard, LoadingSkeleton } from "@/components/crm/CrmPrimitives";
import { supabase } from "@/integrations/supabase/client";
import { fetchActivityFeed } from "@/lib/admin-activity";
import {
  PendingJobReviews,
  QuickActions,
  RecentActivityFeed,
  RecentCountList,
  TodaysInterviews,
  UpcomingFollowUps,
} from "@/components/admin/DashboardWidgets";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

const sevenDaysAgoIso = () => new Date(Date.now() - 7 * 86400000).toISOString();

async function fetchDashboardData() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const sevenDaysAgo = sevenDaysAgoIso();

  const [
    { count: schools },
    { count: teachers },
    { count: jobs },
    { count: applications },
    { data: pendingJobs },
    { data: todaysInterviews },
    { data: newTeachers },
    { data: newSchools },
    { data: newApplications },
    { data: leads },
    activity,
  ] = await Promise.all([
    supabase.from("schools").select("id", { count: "exact", head: true }),
    supabase.from("teacher_profiles").select("user_id", { count: "exact", head: true }),
    supabase.from("jobs").select("id", { count: "exact", head: true }),
    supabase.from("applications").select("id", { count: "exact", head: true }),
    supabase
      .from("jobs")
      .select("id,title,school_id,created_at")
      .eq("status", "pending_review")
      .order("created_at", { ascending: false }),
    supabase
      .from("interviews")
      .select("id,application_id,scheduled_at,mode")
      .gte("scheduled_at", startOfToday.toISOString())
      .lte("scheduled_at", endOfToday.toISOString())
      .order("scheduled_at", { ascending: true }),
    supabase
      .from("teacher_profiles")
      .select("user_id,full_name,city,created_at")
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false }),
    supabase
      .from("schools")
      .select("id,name,city,created_at")
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false }),
    supabase
      .from("applications")
      .select("id,job_id,status,created_at")
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false }),
    supabase
      .from("leads")
      .select("id,school_name,contact_person,next_follow_up")
      .not("next_follow_up", "is", null)
      .gte("next_follow_up", new Date().toISOString())
      .order("next_follow_up", { ascending: true })
      .limit(6),
    fetchActivityFeed(),
  ]);

  const schoolIds = Array.from(new Set((pendingJobs ?? []).map((j) => j.school_id)));
  const applicationIds = Array.from(
    new Set([...(todaysInterviews ?? []).map((i) => i.application_id), ...(newApplications ?? []).map((a) => a.job_id)]),
  );

  const [{ data: schoolNames }, { data: interviewApps }, { data: jobTitles }] = await Promise.all([
    schoolIds.length
      ? supabase.from("schools").select("id,name").in("id", schoolIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    (todaysInterviews ?? []).length
      ? supabase
          .from("applications")
          .select("id,job_id,teacher_id")
          .in("id", (todaysInterviews ?? []).map((i) => i.application_id))
      : Promise.resolve({ data: [] as { id: string; job_id: string; teacher_id: string }[] }),
    supabase.from("jobs").select("id,title"),
  ]);

  const schoolNameById = new Map((schoolNames ?? []).map((s) => [s.id, s.name]));
  const jobTitleById = new Map((jobTitles ?? []).map((j) => [j.id, j.title]));
  const interviewAppById = new Map((interviewApps ?? []).map((a) => [a.id, a]));
  const teacherIds = Array.from(new Set((interviewApps ?? []).map((a) => a.teacher_id)));
  const { data: teacherNames } = teacherIds.length
    ? await supabase.from("teacher_profiles").select("user_id,full_name").in("user_id", teacherIds)
    : { data: [] as { user_id: string; full_name: string | null }[] };
  const teacherNameById = new Map((teacherNames ?? []).map((t) => [t.user_id, t.full_name]));

  return {
    kpis: {
      schools: schools ?? 0,
      teachers: teachers ?? 0,
      jobs: jobs ?? 0,
      applications: applications ?? 0,
      pendingReviews: (pendingJobs ?? []).length,
      interviewsToday: (todaysInterviews ?? []).length,
    },
    pendingJobs: (pendingJobs ?? []).map((j) => ({
      id: j.id,
      title: j.title,
      schoolName: schoolNameById.get(j.school_id) ?? "Unknown school",
      created_at: j.created_at,
    })),
    todaysInterviews: (todaysInterviews ?? []).map((i) => {
      const app = interviewAppById.get(i.application_id);
      return {
        id: i.id,
        scheduled_at: i.scheduled_at,
        mode: i.mode,
        jobTitle: app ? jobTitleById.get(app.job_id) ?? "Vacancy" : "Vacancy",
        candidate: app ? teacherNameById.get(app.teacher_id) ?? "Candidate" : "Candidate",
      };
    }),
    newTeachers: (newTeachers ?? []).map((t) => ({
      id: t.user_id,
      primary: t.full_name || "New teacher",
      secondary: t.city,
      at: t.created_at,
    })),
    newSchools: (newSchools ?? []).map((s) => ({
      id: s.id,
      primary: s.name,
      secondary: s.city,
      at: s.created_at,
    })),
    newApplications: (newApplications ?? []).map((a) => ({
      id: a.id,
      primary: jobTitleById.get(a.job_id) ?? "Vacancy",
      secondary: a.status,
      at: a.created_at,
    })),
    leads: (leads ?? []).map((l) => ({
      id: l.id,
      school_name: l.school_name,
      contact_person: l.contact_person,
      next_follow_up: l.next_follow_up as string,
    })),
    activity: activity.slice(0, 8),
  };
}

function AdminOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: fetchDashboardData,
  });

  return (
    <div>
      <PageHeader title="Operations dashboard" description="Health of the Jivorna marketplace." />

      {isLoading || !data ? (
        <LoadingSkeleton variant="cards" rows={6} />
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <MetricCard label="Schools" value={data.kpis.schools} icon={Building2} />
            <MetricCard label="Teachers" value={data.kpis.teachers} icon={Users} />
            <MetricCard label="Jobs" value={data.kpis.jobs} icon={Briefcase} />
            <MetricCard label="Applications" value={data.kpis.applications} icon={Send} />
            <MetricCard label="Pending reviews" value={data.kpis.pendingReviews} icon={ClipboardList} tone="gold" />
            <MetricCard label="Interviews today" value={data.kpis.interviewsToday} icon={CalendarClock} tone="gold" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <TodaysInterviews interviews={data.todaysInterviews} />
            <PendingJobReviews jobs={data.pendingJobs} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <RecentCountList title="New teachers" description="Last 7 days" rows={data.newTeachers} />
            <RecentCountList title="New schools" description="Last 7 days" rows={data.newSchools} />
            <RecentCountList title="New applications" description="Last 7 days" rows={data.newApplications} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RecentActivityFeed items={data.activity} />
            </div>
            <div className="space-y-6">
              <UpcomingFollowUps leads={data.leads} />
              <QuickActions />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-7">
            <h2 className="font-serif text-xl">Moderation notes</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Admin accounts can read every profile, school, vacancy and application. Role assignment is
              stored separately from profiles, so elevating a user to admin is a deliberate database
              action rather than something a user can self-serve.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
