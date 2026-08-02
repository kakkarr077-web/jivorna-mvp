import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Award,
  Briefcase,
  CalendarClock,
  LifeBuoy,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { PageHeader, EmptyState } from "@/components/shared/Primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/school/")({
  component: SchoolOverview,
});

type JobRow = { id: string; title: string; status: string; created_at: string };
type AppRow = {
  id: string;
  status: string;
  created_at: string;
  job_id: string;
  jobs: { title: string } | null;
};
type InterviewRow = {
  id: string;
  scheduled_at: string;
  status: string;
  mode: string;
  application_id: string;
};

const PIPELINE = ["submitted", "reviewing", "shortlisted", "hired", "rejected"] as const;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  to,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: typeof Users;
  to?: string;
}) {
  const body = (
    <div className="card-premium card-premium-hover h-full p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 font-serif text-3xl leading-none">{value}</p>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
  return to ? (
    <Link to={to} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

function SchoolOverview() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["school-overview", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: school } = await supabase
        .from("schools")
        .select("id,name")
        .eq("owner_id", user!.id)
        .maybeSingle();
      if (!school) return { school: null, jobs: [] as JobRow[], applications: [] as AppRow[], interviews: [] as InterviewRow[] };

      const { data: jobs } = await supabase
        .from("jobs")
        .select("id,title,status,created_at")
        .eq("school_id", school.id)
        .order("created_at", { ascending: false });

      const jobIds = (jobs ?? []).map((j) => j.id);
      const { data: applications } = jobIds.length
        ? await supabase
            .from("applications")
            .select("id,status,created_at,job_id,jobs(title)")
            .in("job_id", jobIds)
            .order("created_at", { ascending: false })
        : { data: [] };

      const appIds = (applications ?? []).map((a) => a.id);
      const { data: interviews } = appIds.length
        ? await supabase
            .from("interviews")
            .select("id,scheduled_at,status,mode,application_id")
            .in("application_id", appIds)
            .order("scheduled_at", { ascending: true })
        : { data: [] };

      return {
        school,
        jobs: (jobs ?? []) as JobRow[],
        applications: (applications ?? []) as unknown as AppRow[],
        interviews: (interviews ?? []) as InterviewRow[],
      };
    },
  });

  if (data && !data.school) {
    return (
      <div>
        <PageHeader title="Welcome to Jivorna" description="First, tell us about your school." />
        <EmptyState
          title="Set up your school profile"
          description="Add your school details so you can publish vacancies and receive applications."
          action={
            <Button asChild>
              <Link to="/school/profile">Create school profile</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const jobs = data?.jobs ?? [];
  const applications = data?.applications ?? [];
  const interviews = data?.interviews ?? [];

  const published = jobs.filter((j) => j.status === "published").length;
  const openings = published;
  const now = Date.now();
  const scheduled = interviews.filter(
    (i) => i.status === "scheduled" && new Date(i.scheduled_at).getTime() >= now,
  ).length;
  const placements = applications.filter((a) => a.status === "hired").length;

  // Analytics — last 6 months of applications vs interviews
  const months: { key: string; label: string; applications: number; interviews: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString(undefined, { month: "short" }),
      applications: 0,
      interviews: 0,
    });
  }
  const bucket = (iso: string) => {
    const d = new Date(iso);
    return months.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`);
  };
  applications.forEach((a) => {
    const m = bucket(a.created_at);
    if (m) m.applications += 1;
  });
  interviews.forEach((i) => {
    const m = bucket(i.scheduled_at);
    if (m) m.interviews += 1;
  });

  const pipeline = PIPELINE.map((status) => ({
    status,
    label: status[0]!.toUpperCase() + status.slice(1),
    count: applications.filter((a) => a.status === status).length,
  }));
  const pipelineColors: Record<string, string> = {
    submitted: "var(--primary-soft)",
    reviewing: "var(--gold-soft)",
    shortlisted: "var(--gold)",
    hired: "var(--primary)",
    rejected: "var(--muted)",
  };

  const activity = [
    ...applications.slice(0, 6).map((a) => ({
      id: `app-${a.id}`,
      at: a.created_at,
      icon: Users,
      text: `New application for ${a.jobs?.title ?? "a role"}`,
      meta: a.status,
    })),
    ...jobs.slice(0, 6).map((j) => ({
      id: `job-${j.id}`,
      at: j.created_at,
      icon: Briefcase,
      text: `Vacancy ${j.status === "published" ? "published" : j.status} — ${j.title}`,
      meta: j.status,
    })),
    ...interviews.slice(0, 6).map((i) => ({
      id: `int-${i.id}`,
      at: i.scheduled_at,
      icon: CalendarClock,
      text: `Interview ${i.status} (${i.mode.replace("_", " ")})`,
      meta: i.status,
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8);

  return (
    <div>
      <PageHeader
        title={data?.school?.name ?? "School overview"}
        description="Hiring performance, pipeline and activity across your vacancies."
        action={
          <Button asChild>
            <Link to="/school/jobs">
              <Plus className="mr-1 h-4 w-4" /> Post a vacancy
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Open positions"
            value={openings}
            hint={`${jobs.length} total vacancies created`}
            icon={Briefcase}
            to="/school/jobs"
          />
          <MetricCard
            label="Candidates received"
            value={applications.length}
            hint={`${applications.filter((a) => a.status === "shortlisted").length} shortlisted`}
            icon={Users}
            to="/school/applicants"
          />
          <MetricCard
            label="Interviews scheduled"
            value={scheduled}
            hint={`${interviews.length} total booked`}
            icon={CalendarClock}
          />
          <MetricCard
            label="Successful placements"
            value={placements}
            hint={
              applications.length
                ? `${Math.round((placements / applications.length) * 100)}% conversion`
                : "No hires yet"
            }
            icon={Award}
          />
        </div>
      )}

      {/* Quick actions */}
      <h2 className="mt-12 mb-4 font-serif text-xl">Quick actions</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { to: "/school/jobs", label: "Post new job", icon: Plus, blurb: "Publish a vacancy in minutes" },
          { to: "/school/teachers", label: "Browse teachers", icon: Search, blurb: "Search verified educators" },
          { to: "/school/applicants", label: "View applications", icon: Users, blurb: "Move candidates through" },
          { to: "/contact", label: "Contact support", icon: LifeBuoy, blurb: "Our team replies same day" },
        ].map((a) => (
          <Link key={a.label} to={a.to} className="card-premium card-premium-hover flex items-start gap-3 p-5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold">
              <a.icon className="h-4 w-4" />
            </span>
            <span>
              <span className="block font-medium">{a.label}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{a.blurb}</span>
            </span>
          </Link>
        ))}
      </div>

      {/* Hiring analytics */}
      <h2 className="mt-12 mb-4 font-serif text-xl">Hiring analytics</h2>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card-premium p-5 lg:col-span-2">
          <p className="text-sm text-muted-foreground">Applications vs interviews · last 6 months</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={months} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="applications" stroke="var(--primary)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="interviews" stroke="var(--gold)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-premium p-5">
          <p className="text-sm text-muted-foreground">Candidate pipeline</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipeline} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {pipeline.map((p) => (
                    <Cell key={p.status} fill={pipelineColors[p.status]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <h2 className="mt-12 mb-4 font-serif text-xl">Recent activity</h2>
      {activity.length === 0 ? (
        <EmptyState
          title="No activity yet"
          description="Publish a vacancy and qualified teachers will start applying."
          action={
            <Button asChild variant="outline">
              <Link to="/school/jobs">Manage vacancies</Link>
            </Button>
          }
        />
      ) : (
        <ol className="relative space-y-4 border-l border-border pl-6">
          {activity.map((a) => (
            <li key={a.id} className="relative">
              <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card">
                <a.icon className="h-3 w-3 text-muted-foreground" />
              </span>
              <p className="text-sm">{a.text}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                <Badge variant="secondary" className="mr-2 capitalize">
                  {a.meta}
                </Badge>
                {fmtDate(a.at)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
