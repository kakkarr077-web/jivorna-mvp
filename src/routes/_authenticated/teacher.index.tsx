import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  Bell,
  Bookmark,
  CalendarClock,
  CheckCircle2,
  FileText,
  Send,
  Sparkle,
  UploadCloud,
  UserRound,
  Video,
} from "lucide-react";
import { EmptyState } from "@/components/shared/Primitives";
import { JobCard, type JobCardData } from "@/components/shared/JobCard";
import { ProfileCompletionWidget } from "@/components/shared/ProfileCompletionWidget";
import { HiringTimeline, timelineStageLabel } from "@/components/shared/HiringTimeline";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { completionPercent, emptyWizard, type WizardValues } from "@/lib/teacherWizard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/teacher/")({
  component: TeacherOverview,
});

type AppRow = {
  id: string;
  status: string;
  created_at: string;
  jobs: { title: string; schools: { name: string } | null } | null;
};

type InterviewRow = {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  mode: string;
  location: string | null;
  meeting_url: string | null;
  status: string;
  applications: { jobs: { title: string; schools: { name: string } | null } | null } | null;
};

type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
};

type SavedRow = {
  id: string;
  created_at: string;
  jobs: { id: string; title: string; location: string | null; schools: { name: string } | null } | null;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

function WidgetCard({
  label,
  value,
  hint,
  icon: Icon,
  to,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: typeof Send;
  to?: string;
  accent?: boolean;
}) {
  const inner = (
    <div
      className={cn(
        "card-premium card-premium-hover h-full p-5",
        accent && "bg-primary-soft/40",
      )}
    >
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
      {inner}
    </Link>
  ) : (
    inner
  );
}

function SectionTitle({
  title,
  to,
  linkLabel,
}: {
  title: string;
  to?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 className="font-serif text-xl">{title}</h2>
      {to && (
        <Link
          to={to}
          className="inline-flex items-center gap-1 text-sm text-primary hover:text-gold"
        >
          {linkLabel ?? "View all"} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function TeacherOverview() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const uid = user?.id;

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["teacher-profile", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teacher_profiles")
        .select("*")
        .eq("user_id", uid!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: applications } = useQuery({
    queryKey: ["teacher-applications", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("id,status,created_at,jobs(title,schools(name))")
        .eq("teacher_id", uid!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AppRow[];
    },
  });

  const { data: interviews } = useQuery({
    queryKey: ["teacher-interviews", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interviews")
        .select(
          "id,scheduled_at,duration_minutes,mode,location,meeting_url,status,applications(jobs(title,schools(name)))",
        )
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as InterviewRow[];
    },
  });

  const { data: notifications } = useQuery({
    queryKey: ["teacher-notifications", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id,title,body,read,created_at")
        .eq("user_id", uid!)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return (data ?? []) as NotificationRow[];
    },
  });

  const { data: saved } = useQuery({
    queryKey: ["teacher-saved-jobs", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_jobs")
        .select("id,created_at,jobs(id,title,location,schools(name))")
        .eq("teacher_id", uid!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SavedRow[];
    },
  });

  const { data: openJobs, isLoading: jobsLoading } = useQuery({
    queryKey: ["teacher-open-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id,title,subject,location,employment_type,salary_range,description,schools(name,city)")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as JobCardData[];
    },
  });

  const { data: appliedIds } = useQuery({
    queryKey: ["teacher-applied-ids", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from("applications").select("job_id").eq("teacher_id", uid!);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.job_id));
    },
  });

  const toggleAvailability = useMutation({
    mutationFn: async (next: boolean) => {
      const { error } = await supabase
        .from("teacher_profiles")
        .upsert({ user_id: uid!, available: next }, { onConflict: "user_id" });
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      toast.success(next ? "You're marked available for new roles." : "You're marked unavailable.");
      void qc.invalidateQueries({ queryKey: ["teacher-profile"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update availability"),
  });

  const rows = applications ?? [];
  const now = Date.now();
  const upcoming = (interviews ?? []).filter(
    (i) => i.status === "scheduled" && new Date(i.scheduled_at).getTime() >= now,
  );
  const unread = (notifications ?? []).filter((n) => !n.read).length;

  const values: WizardValues = {
    ...emptyWizard,
    ...(profile
      ? ({
          full_name: profile.full_name ?? "",
          email: profile.email ?? "",
          phone: profile.phone ?? "",
          city: profile.city ?? "",
          state: profile.state ?? "",
          qualification: profile.qualification ?? "",
          languages: profile.languages ?? [],
          experience_years: profile.experience_years ?? 0,
          headline: profile.headline ?? "",
          subjects: profile.subjects ?? [],
          grades: profile.grades ?? [],
          expected_salary: profile.expected_salary ?? (undefined as unknown as number),
          resume_url: profile.resume_url ?? "",
        } as Partial<WizardValues>)
      : {}),
  };
  const completion = profile ? completionPercent(values) : 0;
  const available = profile?.available ?? true;
  const firstName = profile?.full_name ? profile.full_name.split(" ")[0] : null;

  const mySubjects = (profile?.subjects ?? []).map((s: string) => s.toLowerCase());
  const myCity = (profile?.city ?? "").toLowerCase();
  const recommended = (openJobs ?? [])
    .filter((j) => !appliedIds?.has(j.id))
    .map((j) => {
      const subject = (j.subject ?? "").toLowerCase();
      const location = (j.location ?? "").toLowerCase();
      let score = 0;
      if (subject && mySubjects.some((s) => subject.includes(s) || s.includes(subject))) score += 2;
      if (myCity && location.includes(myCity)) score += 1;
      return { job: j, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const activity = [
    ...rows.slice(0, 5).map((a) => ({
      id: `app-${a.id}`,
      at: a.created_at,
      icon: Send,
      text: `Applied to ${a.jobs?.title ?? "a role"}${a.jobs?.schools?.name ? ` at ${a.jobs.schools.name}` : ""}`,
      meta: a.status,
    })),
    ...(interviews ?? []).slice(0, 5).map((i) => ({
      id: `int-${i.id}`,
      at: i.scheduled_at,
      icon: CalendarClock,
      text: `Interview ${i.status} — ${i.applications?.jobs?.title ?? "role"}`,
      meta: i.mode.replace("_", " "),
    })),
    ...(saved ?? []).slice(0, 5).map((s) => ({
      id: `sav-${s.id}`,
      at: s.created_at,
      icon: Bookmark,
      text: `Saved ${s.jobs?.title ?? "a job"}`,
      meta: "saved",
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8);

  return (
    <div>
      {/* Action-first welcome */}
      <div className="card-premium mb-12 flex flex-col gap-6 bg-primary-soft/40 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="eyebrow text-gold">Teacher portal</p>
          <h1 className="mt-2 font-serif text-3xl sm:text-4xl">
            {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Pick up where you left off — new roles, live applications and upcoming interviews.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link to="/teacher/jobs">Browse new jobs</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/teacher/onboarding">Complete profile</Link>
            </Button>
          </div>
        </div>
        <div className="shrink-0 rounded-2xl border border-border bg-card p-5 lg:w-64">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Availability</p>
              <p className="mt-2 font-serif text-xl leading-none">
                {available ? "Open to roles" : "Not looking"}
              </p>
            </div>
            <Switch
              checked={available}
              disabled={toggleAvailability.isPending}
              onCheckedChange={(v) => toggleAvailability.mutate(v)}
              aria-label="Toggle availability"
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Schools only see teachers who are open to roles.
          </p>
        </div>
      </div>

      {/* Recommended jobs */}
      <section>
        <SectionTitle title="Recommended jobs" to="/teacher/jobs" linkLabel="See all jobs" />
        {jobsLoading ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-52 rounded-xl" />
            ))}
          </div>
        ) : recommended.length === 0 ? (
          <EmptyState
            title="No new matches right now"
            description="Add your subjects and city to your profile so we can match you faster."
            action={
              <Button asChild>
                <Link to="/teacher/jobs">Browse all jobs</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {recommended.map(({ job, score }) => (
              <JobCard
                key={job.id}
                job={job}
                action={
                  <div className="flex items-center gap-2">
                    {score > 0 && (
                      <Badge variant="secondary" className="gap-1">
                        <Sparkle className="h-3 w-3" /> Match
                      </Badge>
                    )}
                    <Button asChild size="sm">
                      <Link to="/teacher/jobs">View & apply</Link>
                    </Button>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* Recent applications + interview schedule */}
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <SectionTitle title="Recent applications" to="/teacher/applications" />
          {rows.length === 0 ? (
            <EmptyState
              title="No applications yet"
              description="Apply to a role and track its progress right here."
              action={
                <Button asChild>
                  <Link to="/teacher/jobs">Browse roles</Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {rows.slice(0, 5).map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.jobs?.title ?? "Role"}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.jobs?.schools?.name ?? "School"} · Applied {fmtDate(a.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <HiringTimeline status={a.status} compact />
                    <span className="text-xs font-medium text-muted-foreground">
                      {timelineStageLabel(a.status)}
                    </span>
                  </div>
                </li>

              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionTitle title="Interview schedule" />
          {upcoming.length === 0 ? (
            <div className="card-premium p-6 text-sm text-muted-foreground">
              No interviews scheduled. When a school invites you, the details appear here.
            </div>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {upcoming.map((i) => (
                <li key={i.id} className="px-5 py-4">
                  <p className="truncate font-medium">{i.applications?.jobs?.title ?? "Interview"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {i.applications?.jobs?.schools?.name ?? "School"} · {fmtDateTime(i.scheduled_at)} ·{" "}
                    {i.duration_minutes} min
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {i.mode.replace("_", " ")}
                    </Badge>
                    {i.meeting_url && (
                      <Button asChild size="sm" variant="outline">
                        <a href={i.meeting_url} target="_blank" rel="noreferrer">
                          <Video className="mr-1 h-3.5 w-3.5" /> Join
                        </a>
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Profile completion */}
      <section className="mt-12">
        <SectionTitle title="Profile completion" />
        <div className="grid gap-6 lg:grid-cols-3">
          <ProfileCompletionWidget profile={profile ?? null} loading={profileLoading} />
          <div className="card-premium p-6 lg:col-span-2">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <p className="font-serif text-2xl leading-none">{completion}% registration complete</p>
            </div>
            <Progress value={completion} className="mt-4 h-2" />
            <p className="mt-2 text-sm text-muted-foreground">
              {completion === 100
                ? "Your profile is complete and visible to verified schools."
                : "Finish your registration to appear higher in school searches."}
            </p>
            {completion < 100 && (
              <Button asChild variant="outline" className="mt-4">
                <Link to="/teacher/onboarding">Continue registration</Link>
              </Button>
            )}
          </div>
        </div>
      </section>


      {/* Quick actions */}
      <h2 className="mt-12 mb-4 font-serif text-xl">Quick actions</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { to: "/teacher/profile", label: "Edit profile", icon: UserRound, blurb: "Keep your details current" },
          { to: "/teacher/jobs", label: "Apply to jobs", icon: Send, blurb: "Browse live vacancies" },
          { to: "/teacher/onboarding", label: "Upload resume", icon: UploadCloud, blurb: "Refresh your CV & certificates" },
          { to: "/teacher/applications", label: "Track applications", icon: FileText, blurb: "See where you stand" },
        ].map((a) => (
          <Link key={a.to + a.label} to={a.to} className="card-premium card-premium-hover flex items-start gap-3 p-5">
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

      {/* Statistics */}
      <h2 className="mt-12 mb-4 font-serif text-xl">Your statistics</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <WidgetCard
          label="Applications"
          value={rows.length}
          hint={`${rows.filter((r) => r.status === "shortlisted" || r.status === "hired").length} shortlisted or hired`}
          icon={Send}
          to="/teacher/applications"
        />
        <WidgetCard
          label="Interviews"
          value={(interviews ?? []).length}
          hint={`${upcoming.length} upcoming`}
          icon={CalendarClock}
        />
        <WidgetCard
          label="Saved jobs"
          value={(saved ?? []).length}
          hint="Roles you bookmarked"
          icon={Bookmark}
          to="/teacher/jobs"
        />
        <WidgetCard
          label="Notifications"
          value={unread}
          hint={unread ? "Unread updates" : "You're all caught up"}
          icon={Bell}
          accent={unread > 0}
        />
      </div>

      {/* Notifications */}
      <h2 className="mt-12 mb-4 font-serif text-xl">Notifications</h2>
      {(notifications ?? []).length === 0 ? (
        <div className="card-premium p-6 text-sm text-muted-foreground">No notifications yet.</div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {(notifications ?? []).map((n) => (
            <li key={n.id} className="px-5 py-4">
              <div className="flex items-start gap-2">
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />}
                <div className="min-w-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body && <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>}
                  <p className="mt-1 text-[11px] text-muted-foreground">{fmtDate(n.created_at)}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Recent activity */}
      <h2 className="mt-12 mb-4 font-serif text-xl">Recent activity</h2>
      {activity.length === 0 ? (
        <EmptyState
          title="Nothing to show yet"
          description="Apply to a role or save a job and your activity trail starts here."
          action={
            <Button asChild>
              <Link to="/teacher/jobs">Browse roles</Link>
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
              <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                {a.meta} · {fmtDate(a.at)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
