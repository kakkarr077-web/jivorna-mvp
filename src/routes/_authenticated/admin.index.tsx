import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Contact,
  ListChecks,
  Send,
  Sparkles,
} from "lucide-react";
import { PageHeader, MetricCard, LoadingSkeleton, EmptyState, InfoCard } from "@/components/crm/CrmPrimitives";
import { channelMeta, fetchRecentCommunications } from "@/lib/communications";
import { fetchAdminInterviews } from "@/lib/admin-interviews";
import { fetchAdminApplications } from "@/lib/admin-applications";
import { fetchAdminSchools } from "@/lib/admin-schools";
import { fetchAdminTeachers } from "@/lib/admin-teachers";
import { fetchAdminJobs } from "@/lib/admin-jobs";
import { fetchLeads } from "@/lib/admin-leads";
import { fetchTasks, isOverdue, isDueToday, updateTask, TASK_PRIORITIES, taskPriorityTone } from "@/lib/tasks";
import { atsStage, ATS_STAGES } from "@/lib/ats";
import { formatDate, formatDateTime } from "@/lib/crm";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/crm/CrmPrimitives";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: RecruiterWorkspace,
});

function RecruiterWorkspace() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id ?? null;
  const userName = (user?.user_metadata?.["full_name"] as string | undefined) || user?.email || "there";

  const tasksQ = useQuery({ queryKey: ["tasks"], queryFn: fetchTasks });
  const interviewsQ = useQuery({ queryKey: ["admin-interviews"], queryFn: fetchAdminInterviews });
  const applicationsQ = useQuery({ queryKey: ["admin-applications"], queryFn: fetchAdminApplications });
  const schoolsQ = useQuery({ queryKey: ["admin-schools"], queryFn: fetchAdminSchools });
  const teachersQ = useQuery({ queryKey: ["admin-teachers"], queryFn: fetchAdminTeachers });
  const jobsQ = useQuery({ queryKey: ["admin-jobs"], queryFn: fetchAdminJobs });
  const leadsQ = useQuery({ queryKey: ["admin-leads"], queryFn: fetchLeads });
  const activityQ = useQuery({ queryKey: ["communications-recent"], queryFn: () => fetchRecentCommunications(8) });

  const isLoading =
    tasksQ.isLoading || interviewsQ.isLoading || applicationsQ.isLoading || schoolsQ.isLoading || teachersQ.isLoading;

  const myAssignedCount = useMemo(() => {
    if (!userId) return 0;
    return (
      (schoolsQ.data ?? []).filter((s) => s.assigned_recruiter === userId).length +
      (teachersQ.data ?? []).filter((t) => t.assigned_recruiter === userId).length +
      (jobsQ.data ?? []).filter((j) => j.assigned_recruiter === userId).length
    );
  }, [userId, schoolsQ.data, teachersQ.data, jobsQ.data]);

  const [scope, setScope] = useState<"mine" | "agency" | null>(null);
  const effectiveScope = scope ?? (myAssignedCount > 0 ? "mine" : "agency");

  const toggleDone = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => updateTask(id, { status: done ? "done" : "todo" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update task"),
  });

  const allTasks = tasksQ.data ?? [];
  const myTasks = allTasks.filter((t) => t.assigned_to === userId);
  const scopedTasks = effectiveScope === "mine" ? myTasks : allTasks;
  const openTasks = scopedTasks.filter((t) => t.status !== "done");
  const overdueTasks = scopedTasks.filter(isOverdue);
  const nextTasks = [...openTasks]
    .sort((a, b) => (a.due_at ? new Date(a.due_at).getTime() : Infinity) - (b.due_at ? new Date(b.due_at).getTime() : Infinity))
    .slice(0, 5);

  const allInterviews = interviewsQ.data ?? [];
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const upcomingInterviews = allInterviews
    .filter((i) => i.status !== "cancelled" && new Date(i.scheduled_at).getTime() >= startOfToday.getTime())
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  const interviewsToday = upcomingInterviews.filter((i) => isDueTodayDate(i.scheduled_at));

  const allApplications = applicationsQ.data ?? [];
  const applicationsNeedingAction = allApplications.filter((a) =>
    ["applied", "application_reviewed"].includes(atsStage(a.status)),
  );
  const offersAwaiting = allApplications.filter((a) => atsStage(a.status) === "offer_sent");

  const myPipeline = useMemo(() => {
    const scoped = effectiveScope === "mine" ? allApplications.filter(() => true) : allApplications;
    const counts = new Map<string, number>();
    for (const a of scoped) {
      const stage = atsStage(a.status);
      counts.set(stage, (counts.get(stage) ?? 0) + 1);
    }
    return ATS_STAGES.map((s) => ({ ...s, count: counts.get(s.id) ?? 0 }));
  }, [allApplications, effectiveScope]);

  const recentlyAssigned = useMemo(() => {
    if (!userId) return [];
    const schools = (schoolsQ.data ?? [])
      .filter((s) => s.assigned_recruiter === userId)
      .map((s) => ({ id: s.id, label: s.name, kind: "School", at: s.updated_at, to: "/admin/schools/$schoolId", params: { schoolId: s.id } }));
    const teachers = (teachersQ.data ?? [])
      .filter((t) => t.assigned_recruiter === userId)
      .map((t) => ({ id: t.user_id, label: t.full_name ?? "Teacher", kind: "Teacher", at: t.updated_at, to: "/admin/teachers/$teacherId", params: { teacherId: t.user_id } }));
    const jobs = (jobsQ.data ?? [])
      .filter((j) => j.assigned_recruiter === userId)
      .map((j) => ({ id: j.id, label: j.title, kind: "Job", at: j.updated_at, to: "/admin/jobs", params: {} }));
    return [...schools, ...teachers, ...jobs]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 6);
  }, [userId, schoolsQ.data, teachersQ.data, jobsQ.data]);

  const followUps = (leadsQ.data ?? [])
    .filter((l) => l.next_follow_up && new Date(l.next_follow_up).getTime() <= Date.now())
    .sort((a, b) => new Date(a.next_follow_up!).getTime() - new Date(b.next_follow_up!).getTime())
    .slice(0, 6);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-secondary">Recruiter workspace</p>
          <h1 className="font-serif text-3xl">Welcome back, {userName.split(" ")[0] ?? userName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here&apos;s what needs your attention today.</p>
        </div>
        <div className="flex gap-2 rounded-lg border border-border bg-card p-1">
          <Button size="sm" variant={effectiveScope === "mine" ? "gold" : "ghost"} onClick={() => setScope("mine")}>
            My work
          </Button>
          <Button size="sm" variant={effectiveScope === "agency" ? "gold" : "ghost"} onClick={() => setScope("agency")}>
            Whole agency
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton variant="cards" rows={5} />
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard label="Open tasks" value={openTasks.length} icon={ListChecks} />
            <MetricCard label="Overdue tasks" value={overdueTasks.length} icon={ClipboardList} tone={overdueTasks.length ? "gold" : "default"} />
            <MetricCard label="Interviews today" value={interviewsToday.length} icon={CalendarClock} />
            <MetricCard label="Applications needing action" value={applicationsNeedingAction.length} icon={Send} />
            <MetricCard label="Offers awaiting response" value={offersAwaiting.length} icon={Sparkles} tone="gold" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <InfoCard
              title={effectiveScope === "mine" ? "My tasks" : "Team tasks"}
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin/tasks">View all</Link>
                </Button>
              }
            >
              {nextTasks.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nothing due — you&apos;re clear.</p>
              ) : (
                <ul className="space-y-2">
                  {nextTasks.map((t) => (
                    <li key={t.id} className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3">
                      <Checkbox
                        checked={t.status === "done"}
                        onCheckedChange={(v) => toggleDone.mutate({ id: t.id, done: Boolean(v) })}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{t.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <StatusBadge label={t.priority} tone={taskPriorityTone(t.priority)} />
                          {t.due_at && <span>{formatDate(t.due_at)}</span>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </InfoCard>

            <InfoCard
              title="Today's & upcoming interviews"
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin/calendar">Open calendar</Link>
                </Button>
              }
            >
              {upcomingInterviews.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No interviews scheduled.</p>
              ) : (
                <ul className="space-y-2">
                  {upcomingInterviews.slice(0, 5).map((i) => (
                    <li key={i.id} className="rounded-lg border border-border bg-surface p-3">
                      <p className="text-sm font-medium">{i.teacher_name} · {i.job_title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{i.school_name} · {formatDateTime(i.scheduled_at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </InfoCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <InfoCard title="My pipeline" description="Applications by stage" className="lg:col-span-1">
              {myPipeline.every((s) => s.count === 0) ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No applications yet.</p>
              ) : (
                <ul className="space-y-2">
                  {myPipeline.map((s) => {
                    const max = Math.max(1, ...myPipeline.map((p) => p.count));
                    return (
                      <li key={s.id}>
                        <div className="flex items-center justify-between text-xs">
                          <span>{s.label}</span>
                          <span className="text-muted-foreground">{s.count}</span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-secondary/40">
                          <div
                            className="h-2 rounded-full bg-gold"
                            style={{ width: `${(s.count / max) * 100}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </InfoCard>

            <InfoCard title="Recently assigned to me" className="lg:col-span-1">
              {recentlyAssigned.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nothing assigned to you yet.</p>
              ) : (
                <ul className="space-y-2">
                  {recentlyAssigned.map((r) => (
                    <li key={`${r.kind}-${r.id}`}>
                      <Link
                        to={r.to}
                        params={r.params as never}
                        className="flex items-center justify-between rounded-lg border border-border bg-surface p-3 text-sm hover:border-primary/40"
                      >
                        <span className="truncate">{r.label}</span>
                        <span className="ml-2 shrink-0 text-xs text-muted-foreground">{r.kind}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </InfoCard>

            <InfoCard title="Follow-ups due" description="Leads needing outreach" className="lg:col-span-1">
              {followUps.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No follow-ups due.</p>
              ) : (
                <ul className="space-y-2">
                  {followUps.map((l) => (
                    <li key={l.id}>
                      <Link
                        to="/admin/leads/$leadId"
                        params={{ leadId: l.id }}
                        className="flex items-center justify-between rounded-lg border border-border bg-surface p-3 text-sm hover:border-primary/40"
                      >
                        <span className="truncate">{l.school_name}</span>
                        <span className="ml-2 shrink-0 text-xs text-muted-foreground">{formatDate(l.next_follow_up)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </InfoCard>
          </div>

          <InfoCard
            title="Recent activity"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to="/admin/leads">View CRM</Link>
              </Button>
            }
          >
            {(activityQ.data ?? []).length === 0 ? (
              <EmptyState title="No activity yet" description="Logged calls, emails and updates will appear here." />
            ) : (
              <ul className="space-y-2">
                {(activityQ.data ?? []).map((entry) => {
                  const meta = channelMeta(entry.channel);
                  const Icon = meta.icon;
                  return (
                    <li key={entry.id} className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{entry.summary}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {meta.label} · {timeAgoShort(entry.occurred_at)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </InfoCard>
        </div>
      )}
    </div>
  );
}

function isDueTodayDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function timeAgoShort(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
