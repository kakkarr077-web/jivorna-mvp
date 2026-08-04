import { useMemo } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Ban,
  Briefcase,
  CalendarClock,
  Download,
  GraduationCap,
  Mail,
  Pencil,
  Send,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState, InfoCard, InfoRow, LoadingSkeleton, StatusBadge } from "@/components/crm/CrmPrimitives";
import { Timeline, type TimelineItem } from "@/components/crm/Timeline";
import { initialsOf, formatDate, formatDateTime } from "@/lib/crm";
import { stageLabel } from "@/lib/pipeline";
import {
  OverviewSection,
  EducationSection,
  TagsSection,
  DocumentsSection,
  ApplicationsSection,
  InterviewsSection,
  InternalCommentsSection,
} from "@/components/admin/TeacherProfileSections";
import {
  fetchTeacherDetail,
  teacherProfileCompletion,
  VERIFICATION_LABELS,
  VERIFICATION_TONES,
  type TeacherStatus,
} from "@/lib/admin-teachers";

export const Route = createFileRoute("/_authenticated/admin/teachers/$teacherId")({
  component: AdminTeacherProfile,
});

function AdminTeacherProfile() {
  const { teacherId } = useParams({ from: "/_authenticated/admin/teachers/$teacherId" });
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-teacher", teacherId],
    queryFn: () => fetchTeacherDetail(teacherId),
  });

  const setStatus = useMutation({
    mutationFn: async (status: TeacherStatus) => {
      const { error: err } = await supabase.from("teacher_profiles").update({ status }).eq("user_id", teacherId);
      if (err) throw err;
      return status;
    },
    onSuccess: (status) => {
      toast.success(`Verification updated to ${VERIFICATION_LABELS[status]}.`);
      void qc.invalidateQueries({ queryKey: ["admin-teacher", teacherId] });
      void qc.invalidateQueries({ queryKey: ["admin-teachers"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update teacher"),
  });

  const timeline = useMemo<TimelineItem[]>(() => {
    if (!data) return [];
    const items: TimelineItem[] = [
      { id: `joined-${data.profile.user_id}`, at: data.profile.created_at, title: "Registered on Jivorna", icon: GraduationCap },
    ];
    if (data.profile.status === "active" || data.profile.status === "placed") {
      items.push({
        id: `verified-${data.profile.user_id}`,
        at: data.profile.updated_at,
        title: "Verification completed",
        icon: ShieldCheck,
      });
    }
    for (const a of data.applications) {
      items.push({
        id: `app-${a.id}`,
        at: a.created_at,
        title: "Applied to a job",
        description: `${a.jobTitle} · ${a.schoolName}`,
        icon: Send,
      });
      if (a.interviewAt) {
        items.push({
          id: `int-${a.id}`,
          at: a.interviewAt,
          title: "Interview scheduled",
          description: `${a.jobTitle} · ${a.schoolName}`,
          icon: CalendarClock,
        });
      }
      if (a.status === "joined") {
        items.push({
          id: `hire-${a.id}`,
          at: a.updated_at,
          title: "Offer accepted",
          description: `${a.jobTitle} · ${a.schoolName}`,
          icon: UserCheck,
        });
      }
    }
    for (const act of data.activity) {
      items.push({ id: `act-${act.id}`, at: act.created_at, title: act.action, description: act.detail, icon: Activity });
    }
    return items.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime());
  }, [data]);

  if (isLoading) return <LoadingSkeleton variant="profile" />;

  if (error || !data) {
    return (
      <EmptyState
        title="Teacher not found"
        description="This teacher profile may have been removed."
        action={
          <Button asChild variant="outline">
            <Link to="/admin/teachers">Back to teachers</Link>
          </Button>
        }
      />
    );
  }

  const { profile, avatar_url, applications, interviews, documents, internalComments } = data;
  const completion = teacherProfileCompletion(profile);
  const verified = profile.status === "active" || profile.status === "placed";

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
        <Link to="/admin/teachers">← All teachers</Link>
      </Button>

      <header className="rounded-xl border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-wrap items-start gap-5">
            <Avatar className="h-16 w-16 shrink-0 rounded-xl">
              <AvatarImage src={profile.profile_photo_url ?? avatar_url ?? undefined} alt={profile.full_name ?? "Teacher"} />
              <AvatarFallback className="rounded-xl text-lg">{initialsOf(profile.full_name, "T")}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="text-display text-3xl">{profile.full_name ?? "Unnamed teacher"}</h1>
              {profile.headline && <p className="mt-1 text-sm text-muted-foreground">{profile.headline}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge label={VERIFICATION_LABELS[profile.status]} tone={VERIFICATION_TONES[profile.status]} />
                <StatusBadge label={profile.available ? "Available now" : "Not available"} tone={profile.available ? "default" : "outline"} />
                {profile.city && <span className="text-sm text-muted-foreground">{profile.city}</span>}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={verified ? "outline" : "gold"}
              size="sm"
              disabled={setStatus.isPending}
              onClick={() => setStatus.mutate("active")}
            >
              <ShieldCheck /> Verify
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={setStatus.isPending || profile.status === "inactive"}
              onClick={() => setStatus.mutate("inactive")}
            >
              <Ban /> Suspend
            </Button>
            {profile.email && (
              <Button asChild variant="outline" size="sm">
                <a href={`mailto:${profile.email}`}>
                  <Mail /> Email
                </a>
              </Button>
            )}
            {profile.resume_url && (
              <Button variant="outline" size="sm" onClick={() => void downloadDocument(profile.resume_url!)}>
                <Download /> Resume
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <OverviewSection profile={profile} />
          <EducationSection profile={profile} />
          <TagsSection
            subjects={profile.subjects}
            boards={profile.boards}
            grades={profile.grades}
            cities={[profile.city, profile.state].filter((v): v is string => Boolean(v))}
            languages={profile.languages}
          />
          <DocumentsSection documents={documents} onDownload={downloadDocument} />
          <ApplicationsSection applications={applications} />
          <InterviewsSection interviews={interviews} />
          <InfoCard title="Timeline">
            <Timeline items={timeline} />
          </InfoCard>
          <InternalCommentsSection comments={internalComments} />
        </div>

        <aside className="space-y-6">
          <InfoCard title="Verification status">
            <StatusBadge label={VERIFICATION_LABELS[profile.status]} tone={VERIFICATION_TONES[profile.status]} />
          </InfoCard>
          <InfoCard title="Availability">
            <InfoRow label="Status" value={profile.available ? "Available now" : "Not available"} />
            <InfoRow label="Available from" value={profile.available_from ? formatDate(profile.available_from) : null} />
            <InfoRow label="Notice period" value={profile.notice_period_days ? `${profile.notice_period_days} days` : null} />
          </InfoCard>
          <InfoCard title="Expected salary">
            <p className="font-serif text-2xl">
              {profile.expected_salary ? `₹${profile.expected_salary.toLocaleString("en-IN")}` : "Not recorded"}
            </p>
          </InfoCard>
          <InfoCard title="Last login">
            <p className="text-sm text-muted-foreground">
              {data.lastLoginAt ? formatDateTime(data.lastLoginAt) : "Not recorded"}
            </p>
          </InfoCard>
          <InfoCard title="Profile completion">
            <div className="flex items-center gap-3">
              <Progress value={completion} className="h-2 flex-1" />
              <span className="text-sm font-medium">{completion}%</span>
            </div>
          </InfoCard>
        </aside>
      </div>
    </div>
  );
}
