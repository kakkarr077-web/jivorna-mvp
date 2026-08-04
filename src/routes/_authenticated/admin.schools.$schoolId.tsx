import { useMemo } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  Ban,
  Briefcase,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Send,
  ShieldCheck,
  Timer,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/Primitives";
import { SchoolNotes } from "@/components/admin/SchoolNotes";
import { SchoolTimeline, type TimelineEvent } from "@/components/admin/SchoolTimeline";
import { SchoolCreateJobDialog, SchoolEditDialog } from "@/components/admin/SchoolDialogs";
import { CommunicationTimeline } from "@/components/crm/CommunicationTimeline";
import { TasksPanel } from "@/components/crm/TasksPanel";
import { RecruiterSelect } from "@/components/crm/RecruiterSelect";
import { assignRecruiter } from "@/lib/recruiters";
import { jobStatusLabel, jobStatusTone } from "@/lib/jobStatus";
import { stageLabel } from "@/lib/pipeline";
import {
  fetchSchoolDetail,
  formatBytes,
  formatDate,
  isActiveSchool,
  schoolProfileCompletion,
  VERIFICATION_LABELS,
  VERIFICATION_TONES,
} from "@/lib/admin-schools";

export const Route = createFileRoute("/_authenticated/admin/schools/$schoolId")({
  component: AdminSchoolProfile,
});

const NOT_RECORDED = "Not recorded";

function AdminSchoolProfile() {
  const { schoolId } = useParams({ from: "/_authenticated/admin/schools/$schoolId" });
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-school", schoolId],
    queryFn: () => fetchSchoolDetail(schoolId),
  });

  const setRecruiter = useMutation({
    mutationFn: (recruiterId: string | null) => assignRecruiter("schools", [schoolId], recruiterId),
    onSuccess: () => {
      toast.success("Recruiter updated.");
      void qc.invalidateQueries({ queryKey: ["admin-school", schoolId] });
      void qc.invalidateQueries({ queryKey: ["admin-schools"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not assign recruiter"),
  });

  const setSubscription = useMutation({
    mutationFn: async (status: "active" | "cancelled") => {
      const { error: err } = await supabase
        .from("schools")
        .update({ subscription_status: status })
        .eq("id", schoolId);
      if (err) throw err;
      return status;
    },
    onSuccess: (status) => {
      toast.success(status === "cancelled" ? "School deactivated." : "School reactivated.");
      void qc.invalidateQueries({ queryKey: ["admin-school", schoolId] });
      void qc.invalidateQueries({ queryKey: ["admin-schools"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update school"),
  });

  const archiveJob = useMutation({
    mutationFn: async (jobId: string) => {
      const { error: err } = await supabase.from("jobs").update({ status: "closed" }).eq("id", jobId);
      if (err) throw err;
    },
    onSuccess: () => {
      toast.success("Vacancy archived.");
      void qc.invalidateQueries({ queryKey: ["admin-school", schoolId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not archive vacancy"),
  });

  const timeline = useMemo<TimelineEvent[]>(() => {
    if (!data) return [];
    const events: TimelineEvent[] = [
      { id: `reg-${data.school.id}`, at: data.school.created_at, title: "School registered", icon: Building2 },
    ];
    if (data.school.subscription_status === "active") {
      events.push({
        id: `verified-${data.school.id}`,
        at: data.school.updated_at,
        title: "Verification completed",
        icon: ShieldCheck,
      });
    }
    for (const j of data.jobs) {
      events.push({ id: `job-${j.id}`, at: j.created_at, title: "Job created", detail: j.title, icon: Briefcase });
    }
    for (const a of data.applications) {
      events.push({
        id: `app-${a.id}`,
        at: a.created_at,
        title: "Application received",
        detail: `${a.candidate} · ${a.jobTitle}`,
        icon: Send,
      });
      if (a.interviewAt) {
        events.push({
          id: `int-${a.id}`,
          at: a.interviewAt,
          title: "Interview scheduled",
          detail: `${a.candidate} · ${a.jobTitle}`,
          icon: CalendarClock,
        });
      }
      if (a.status === "joined" || a.status === "hired") {
        events.push({
          id: `hire-${a.id}`,
          at: a.created_at,
          title: "Offer accepted",
          detail: `${a.candidate} · ${a.jobTitle}`,
          icon: UserCheck,
        });
      }
    }
    return events.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime());
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <EmptyState
        title="School not found"
        description="This school may have been removed."
        action={
          <Button asChild variant="outline">
            <Link to="/admin/schools">Back to schools</Link>
          </Button>
        }
      />
    );
  }

  const { school, jobs, applications, documents, owner } = data;
  const active = isActiveSchool(school.subscription_status);
  const activeJobs = jobs.filter((j) => j.status === "published");
  const appsByJob = new Map<string, number>();
  for (const a of applications) appsByJob.set(a.job_id, (appsByJob.get(a.job_id) ?? 0) + 1);
  const completion = schoolProfileCompletion(school);
  const hiringStatus = activeJobs.length > 0 ? `Actively hiring · ${activeJobs.length} live` : "Not currently hiring";

  const downloadDocument = async (path: string) => {
    const { data: signed, error: err } = await supabase.storage
      .from("teacher-documents")
      .createSignedUrl(path, 60);
    if (err || !signed) {
      toast.error("Could not open this file");
      return;
    }
    window.open(signed.signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/admin/schools">← All schools</Link>
      </Button>

      <header className="rounded-xl border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-wrap items-start gap-5">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-primary-soft text-primary">
              {school.logo_url ? (
                <img src={school.logo_url} alt={`${school.name} logo`} className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-7 w-7" />
              )}
            </span>
            <div className="min-w-0">
              <h1 className="text-display text-3xl">{school.name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant={VERIFICATION_TONES[school.subscription_status]}>
                  <ShieldCheck className="mr-1 h-3 w-3" />
                  {VERIFICATION_LABELS[school.subscription_status]}
                </Badge>
                <Badge variant={active ? "default" : "destructive"}>{active ? "Active" : "Inactive"}</Badge>
                <Badge variant="outline">{school.board ?? "Board not set"}</Badge>
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> {school.city ?? NOT_RECORDED}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <RecruiterSelect
              value={school.assigned_recruiter}
              onChange={(v) => setRecruiter.mutate(v)}
              className="h-9 w-48"
            />
            <SchoolEditDialog
              school={school}
              trigger={
                <Button variant="outline" size="sm">
                  <Pencil /> Edit school
                </Button>
              }
            />
            <SchoolCreateJobDialog
              schoolId={school.id}
              trigger={
                <Button variant="gold" size="sm">
                  <Plus /> Create job
                </Button>
              }
            />
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/jobs">
                <Briefcase /> View jobs
              </Link>
            </Button>
            <Button
              variant={active ? "outline" : "gold"}
              size="sm"
              disabled={setSubscription.isPending}
              onClick={() => setSubscription.mutate(active ? "cancelled" : "active")}
            >
              <Ban /> {active ? "Deactivate school" : "Reactivate school"}
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <PanelCard title="Overview">
            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <Item label="School name" value={school.name} />
              <Item label="Board" value={school.board} />
              <Item label="School type" value={school.school_type} />
              <Item label="City" value={school.city} />
              <Item label="State" value={null} />
              <Item label="Address" value={null} />
              <Item
                label="Website"
                value={
                  school.website ? (
                    <a
                      href={school.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-gold hover:underline"
                    >
                      {school.website} <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null
                }
              />
              <Item label="Established year" value={null} />
              <Item label="Number of students" value={school.student_count?.toLocaleString() ?? null} />
              <Item label="Number of teachers" value={null} />
              <Item label="Current hiring status" value={hiringStatus} />
            </dl>
            {school.description && (
              <>
                <Separator className="my-5" />
                <p className="text-sm leading-relaxed text-muted-foreground">{school.description}</p>
              </>
            )}
          </PanelCard>

          <PanelCard title="Contacts">
            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <Item label="Principal" value={school.principal_name} />
              <Item label="HR manager" value={school.hr_name} />
              <Item label="Recruitment contact" value={owner?.full_name ?? null} />
              <Item
                label="Phone"
                value={
                  school.phone ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {school.phone}
                    </span>
                  ) : null
                }
              />
              <Item
                label="Email"
                value={
                  school.contact_email || owner?.email ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      {school.contact_email ?? owner?.email}
                    </span>
                  ) : null
                }
              />
              <Item label="Alternative phone" value={null} />
              <Item
                label="Website"
                value={
                  school.website ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" /> {school.website}
                    </span>
                  ) : null
                }
              />
            </dl>
          </PanelCard>

          <PanelCard title="Hiring metrics">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Kpi label="Total jobs posted" value={jobs.length} icon={Briefcase} />
              <Kpi label="Active jobs" value={activeJobs.length} icon={CheckCircle2} />
              <Kpi label="Applications received" value={applications.length} icon={Send} />
              <Kpi label="Interviews scheduled" value={data.interviewCount} icon={CalendarClock} />
              <Kpi label="Successful hires" value={data.hires} icon={UserCheck} />
              <Kpi
                label="Average time to hire"
                value={data.avgTimeToHireDays === null ? "—" : `${data.avgTimeToHireDays} days`}
                icon={Timer}
              />
            </div>
          </PanelCard>

          <PanelCard
            title="Current jobs"
            action={
              <SchoolCreateJobDialog
                schoolId={school.id}
                trigger={
                  <Button size="sm" variant="gold">
                    <Plus /> Create new job
                  </Button>
                }
              />
            }
          >
            {jobs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No vacancies posted yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job title</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Applications</TableHead>
                      <TableHead>Posted</TableHead>
                      <TableHead>Closing</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((j) => (
                      <TableRow key={j.id}>
                        <TableCell className="font-medium">{j.title}</TableCell>
                        <TableCell>{j.subject ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={jobStatusTone(j.status)}>{jobStatusLabel(j.status)}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{appsByJob.get(j.id) ?? 0}</TableCell>
                        <TableCell>{formatDate(j.created_at)}</TableCell>
                        <TableCell className="text-muted-foreground">—</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button asChild size="sm" variant="ghost">
                              <Link to="/admin/jobs">View</Link>
                            </Button>
                            <Button asChild size="sm" variant="ghost">
                              <Link to="/admin/jobs">Edit</Link>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={j.status === "closed" || archiveJob.isPending}
                              onClick={() => archiveJob.mutate(j.id)}
                            >
                              <Archive className="h-4 w-4" />
                              <span className="sr-only">Archive</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </PanelCard>

          <PanelCard title="Recent applications">
            {applications.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No applications yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Applied on</TableHead>
                      <TableHead>Interview</TableHead>
                      <TableHead className="text-right">Quick actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.slice(0, 10).map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.candidate}</TableCell>
                        <TableCell>{a.jobTitle}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{stageLabel(a.status)}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(a.created_at)}</TableCell>
                        <TableCell>{a.interviewAt ? formatDate(a.interviewAt) : "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="ghost">
                            <Link to="/admin/jobs">Open</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </PanelCard>

          <CommunicationTimeline entityType="school" entityId={school.id} />

          <TasksPanel relatedType="school" relatedId={school.id} />

          <PanelCard title="Activity timeline">
            <SchoolTimeline events={timeline.slice(0, 25)} />
          </PanelCard>

          <PanelCard title="Internal notes" subtitle="Admin only — never visible to the school.">
            <SchoolNotes schoolId={school.id} />
          </PanelCard>

          <PanelCard title="Files" subtitle="School documents, verification files, contracts and images.">
            {documents.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No files uploaded yet.</p>
            ) : (
              <ul className="space-y-2">
                {documents.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background/60 p-3"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-sm">{d.name}</span>
                    <Badge variant="outline" className="capitalize">
                      {d.doc_type.replace("_", " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatBytes(d.file_size_bytes)}</span>
                    <Button size="sm" variant="ghost" onClick={() => void downloadDocument(d.file_url)}>
                      <Download className="h-4 w-4" /> Download
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </PanelCard>
        </div>

        <aside className="space-y-6">
          <PanelCard title="Quick information">
            <dl className="space-y-4">
              <Item label="Date joined" value={formatDate(school.created_at)} />
              <Item label="Last login" value={null} />
              <Item label="Last activity" value={data.lastActivityAt ? formatDate(data.lastActivityAt) : null} />
              <Item label="Lead source" value={null} />
              <Item label="Assigned recruiter" value={null} />
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Profile completion</dt>
                <dd className="mt-2 space-y-2">
                  <Progress value={completion} />
                  <span className="text-sm text-muted-foreground">{completion}% complete</span>
                </dd>
              </div>
            </dl>
          </PanelCard>

          <PanelCard title="At a glance">
            <ul className="space-y-3 text-sm">
              <Glance icon={Users} label="Students" value={school.student_count?.toLocaleString() ?? NOT_RECORDED} />
              <Glance icon={Briefcase} label="Live vacancies" value={String(activeJobs.length)} />
              <Glance icon={Send} label="Applications" value={String(applications.length)} />
              <Glance icon={Clock} label="Last updated" value={formatDate(school.updated_at)} />
            </ul>
          </PanelCard>
        </aside>
      </div>
    </div>
  );
}

function PanelCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-soft">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={empty ? "mt-1 text-sm text-muted-foreground/70" : "mt-1 text-sm"}>
        {empty ? NOT_RECORDED : value}
      </dd>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: typeof Briefcase;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-soft text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 font-serif text-2xl">{value}</p>
    </div>
  );
}

function Glance({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </span>
      <span className="font-medium">{value}</span>
    </li>
  );
}
