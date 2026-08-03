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
  ArrowRight,
  Award,
  Briefcase,
  CalendarClock,
  Clock,
  Plus,
  Users,
  Video,
} from "lucide-react";
import { PageHeader, EmptyState } from "@/components/shared/Primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { stageLabel } from "@/lib/pipeline";

export const Route = createFileRoute("/_authenticated/school/")({
  component: SchoolOverview,
});

type JobRow = { id: string; title: string; status: string; created_at: string };
type AppRow = {
  id: string;
  status: string;
  created_at: string;
  job_id: string;
  teacher_id: string;
  jobs: { title: string } | null;
};
type InterviewRow = {
  id: string;
  scheduled_at: string;
  status: string;
  mode: string;
  location: string | null;
  meeting_url: string | null;
  application_id: string;
};

const PIPELINE = ["submitted", "reviewing", "shortlisted", "hired", "rejected"] as const;
const WAITING = new Set(["submitted", "screening", "reviewing"]);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

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

function SectionTitle({
  title,
  count,
  to,
  linkLabel,
}: {
  title: string;
  count?: number;
  to?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 className="font-serif text-xl">
        {title}
        {typeof count === "number" && count > 0 && (
          <span className="ml-2 align-middle text-sm font-normal text-muted-foreground">{count}</span>
        )}
      </h2>
      {to && (
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link to={to}>
            {linkLabel ?? "View all"} <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      )}
    </div>
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
      if (!school)
        return {
          school: null,
          jobs: [] as JobRow[],
          applications: [] as AppRow[],
          interviews: [] as InterviewRow[],
          names: {} as Record<string, string>,
        };

      const { data: jobs } = await supabase
        .from("jobs")
        .select("id,title,status,created_at")
        .eq("school_id", school.id)
        .order("created_at", { ascending: false });

      const jobIds = (jobs ?? []).map((j) => j.id);
      const { data: applications } = jobIds.length
        ? await supabase
            .from("applications")
            .select("id,status,created_at,job_id,teacher_id,jobs(title)")
            .in("job_id", jobIds)
            .order("created_at", { ascending: false })
        : { data: [] };

      const appIds = (applications ?? []).map((a) => a.id);
      const { data: interviews } = appIds.length
        ? await supabase
            .from("interviews")
            .select("id,scheduled_at,status,mode,location,meeting_url,application_id")
            .in("application_id", appIds)
            .order("scheduled_at", { ascending: true })
        : { data: [] };

      const teacherIds = [...new Set((applications ?? []).map((a) => a.teacher_id))];
      const { data: profiles } = teacherIds.length
        ? await supabase.from("teacher_profiles").select("user_id,full_name").in("user_id", teacherIds)
        : { data: [] };
      const names: Record<string, string> = {};
      (profiles ?? []).forEach((p) => {
        if (p.full_name) names[p.user_id] = p.full_name;
      });

      return {
        school,
        jobs: (jobs ?? []) as JobRow[],
        applications: (applications ?? []) as unknown as AppRow[],
        interviews: (interviews ?? []) as InterviewRow[],
        names,
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
  const names = data?.names ?? {};

  const openJobs = jobs.filter((j) => j.status === "published");
  const openings = openJobs.length;
  const now = Date.now();
  const upcoming = interviews.filter(
    (i) => i.status === "scheduled" && new Date(i.scheduled_at).getTime() >= now,
  );
  const todays = upcoming.filter((i) => isToday(i.scheduled_at));
  const scheduled = upcoming.length;
  const placements = applications.filter((a) => a.status === "hired").length;
  const waiting = applications.filter((a) => WAITING.has(a.status));

  const appsByJob = (jobId: string) => applications.filter((a) => a.job_id === jobId);
  const jobTitleForInterview = (i: InterviewRow) =>
    applications.find((a) => a.id === i.application_id)?.jobs?.title ?? "Interview";
  const candidateForInterview = (i: InterviewRow) => {
    const app = applications.find((a) => a.id === i.application_id);
    return app ? (names[app.teacher_id] ?? "Candidate") : "Candidate";
  };

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
        description="Everything that needs your attention today, in one place."
      />

      {/* Top actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            to: "/school/jobs",
            label: "Post new job",
            blurb: "Publish a vacancy in minutes",
            icon: Plus,
            primary: true,
          },
          {
            to: "/school/applicants",
            label: "Review applications",
            blurb: waiting.length ? `${waiting.length} awaiting your review` : "Move candidates forward",
            icon: Users,
          },
          {
            to: "/school/applicants",
            label: "Interview schedule",
            blurb: todays.length
              ? `${todays.length} interview${todays.length === 1 ? "" : "s"} today`
              : `${scheduled} upcoming`,
            icon: CalendarClock,
          },
        ].map((a) => (
          <Link
            key={a.label}
            to={a.to}
            className={
              a.primary
                ? "group flex items-start gap-3 rounded-2xl bg-primary p-5 text-primary-foreground shadow-lg transition-transform duration-200 hover:-translate-y-0.5"
                : "card-premium card-premium-hover group flex items-start gap-3 p-5"
            }
          >
            <span
              className={
                a.primary
                  ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/15"
                  : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold"
              }
            >
              <a.icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1 font-medium">
                {a.label}
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
              <span
                className={
                  a.primary
                    ? "mt-1 block text-xs text-primary-foreground/75"
                    : "mt-1 block text-xs text-muted-foreground"
                }
              >
                {a.blurb}
              </span>
            </span>
          </Link>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          {/* Actionable columns */}
          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            <section className="lg:col-span-2">
              <SectionTitle
                title="Applicants waiting"
                count={waiting.length}
                to="/school/applicants"
              />
              {waiting.length === 0 ? (
                <div className="card-premium p-6 text-sm text-muted-foreground">
                  No candidates waiting on you. New applications appear here the moment they arrive.
                </div>
              ) : (
                <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                  {waiting.slice(0, 6).map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{names[a.teacher_id] ?? "Candidate"}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.jobs?.title ?? "Role"} · Applied {fmtDate(a.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">{stageLabel(a.status)}</Badge>
                        <Button asChild size="sm" variant="outline">
                          <Link to="/school/applicants">Review</Link>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <SectionTitle title="Today's interviews" count={todays.length} />
              {todays.length === 0 ? (
                <div className="card-premium p-6 text-sm text-muted-foreground">
                  {upcoming.length
                    ? `Nothing today. Next interview ${fmtDate(upcoming[0]!.scheduled_at)} at ${fmtTime(upcoming[0]!.scheduled_at)}.`
                    : "No interviews scheduled yet."}
                </div>
              ) : (
                <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                  {todays.map((i) => (
                    <li key={i.id} className="px-5 py-4">
                      <p className="truncate font-medium">{candidateForInterview(i)}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {jobTitleForInterview(i)}
                      </p>
                      <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> {fmtTime(i.scheduled_at)}
                        <span className="text-border">·</span>
                        <Video className="h-3.5 w-3.5" /> {i.mode.replace("_", " ")}
                      </p>
                      {i.meeting_url && (
                        <a
                          href={i.meeting_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-xs font-medium text-primary underline-offset-4 hover:underline"
                        >
                          Join meeting
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Open positions */}
          <section className="mt-12">
            <SectionTitle title="Open positions" count={openings} to="/school/jobs" linkLabel="Manage" />
            {openJobs.length === 0 ? (
              <EmptyState
                title="No live vacancies"
                description="Post a role and verified teachers can start applying right away."
                action={
                  <Button asChild>
                    <Link to="/school/jobs">
                      <Plus className="mr-1 h-4 w-4" /> Post new job
                    </Link>
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {openJobs.slice(0, 6).map((j) => {
                  const jobApps = appsByJob(j.id);
                  const jobWaiting = jobApps.filter((a) => WAITING.has(a.status)).length;
                  return (
                    <Link key={j.id} to="/school/jobs" className="card-premium card-premium-hover p-5">
                      <p className="truncate font-medium">{j.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Posted {fmtDate(j.created_at)}</p>
                      <div className="mt-4 flex items-center gap-2 text-xs">
                        <Badge variant="secondary">{jobApps.length} applicants</Badge>
                        {jobWaiting > 0 && (
                          <Badge className="bg-gold/15 text-gold hover:bg-gold/15">
                            {jobWaiting} to review
                          </Badge>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* Recent activity */}
          <section className="mt-12">
            <SectionTitle title="Recent activity" />
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
          </section>

          {/* Statistics */}
          <section className="mt-14">
            <SectionTitle title="Statistics" />
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

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
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
          </section>
        </>
      )}
    </div>
  );
}
