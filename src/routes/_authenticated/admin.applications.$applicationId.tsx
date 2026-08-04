import { useRef, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, CalendarClock, Download, Paperclip, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PageHeader,
  InfoCard,
  InfoRow,
  StatusBadge,
  LoadingSkeleton,
  EmptyState,
  ConfirmDialog,
} from "@/components/crm/CrmPrimitives";
import { Timeline, type TimelineItem } from "@/components/crm/Timeline";
import { NotesPanel, type CrmNote } from "@/components/crm/NotesPanel";
import { CommunicationTimeline } from "@/components/crm/CommunicationTimeline";
import { TasksPanel } from "@/components/crm/TasksPanel";
import { RecruiterSelect } from "@/components/crm/RecruiterSelect";
import { formatDate, formatDateTime, formatMoney, initialsOf } from "@/lib/crm";
import { ATS_STAGES, atsStage, atsStageIndex, atsStageLabel, atsStageTone, isTerminalStage, type AtsStageId } from "@/lib/ats";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { bulkAssignRecruiter, fetchAdminApplication, updateApplicationStage } from "@/lib/admin-applications";
import { fetchAdminInterviews } from "@/lib/admin-interviews";

export const Route = createFileRoute("/_authenticated/admin/applications/$applicationId")({
  component: AdminApplicationDetail,
});

type EventRow = {
  id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  summary: string;
  created_at: string;
};

type CommentRow = { id: string; body: string; internal: boolean; created_at: string; author_id: string };
type AttachmentRow = { id: string; name: string; file_path: string; file_size_bytes: number | null; created_at: string; uploaded_by: string };

function AdminApplicationDetail() {
  const { applicationId } = useParams({ from: "/_authenticated/admin/applications/$applicationId" });
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingDeleteNote, setPendingDeleteNote] = useState<string | null>(null);

  const appQuery = useQuery({
    queryKey: ["admin-application", applicationId],
    queryFn: () => fetchAdminApplication(applicationId),
  });

  const eventsQuery = useQuery({
    queryKey: ["application-events", applicationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_events")
        .select("id,event_type,from_status,to_status,summary,created_at")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });

  const commentsQuery = useQuery({
    queryKey: ["application-comments", applicationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_comments")
        .select("id,body,internal,created_at,author_id")
        .eq("application_id", applicationId)
        .eq("internal", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CommentRow[];
    },
  });

  const attachmentsQuery = useQuery({
    queryKey: ["application-attachments", applicationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_attachments")
        .select("id,name,file_path,file_size_bytes,created_at,uploaded_by")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AttachmentRow[];
    },
  });

  const interviewsQuery = useQuery({
    queryKey: ["admin-interviews-for-application", applicationId],
    queryFn: async () => {
      const all = await fetchAdminInterviews();
      return all.filter((i) => i.application_id === applicationId);
    },
  });

  const invalidateApp = () => {
    void qc.invalidateQueries({ queryKey: ["admin-application", applicationId] });
    void qc.invalidateQueries({ queryKey: ["admin-applications"] });
    void qc.invalidateQueries({ queryKey: ["application-events", applicationId] });
  };

  const changeStage = useMutation({
    mutationFn: async (to: AtsStageId) => {
      if (!appQuery.data) return;
      await updateApplicationStage({ applicationId, from: appQuery.data.status, to, actorId: user?.id });
    },
    onSuccess: () => {
      toast.success("Stage updated.");
      invalidateApp();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update stage"),
  });

  const assignRecruiterMutation = useMutation({
    mutationFn: async (recruiterId: string | null) => bulkAssignRecruiter([applicationId], recruiterId),
    onSuccess: () => {
      toast.success("Recruiter updated.");
      invalidateApp();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not assign recruiter"),
  });

  const addNote = useMutation({
    mutationFn: async (body: string) => {
      const { error } = await supabase
        .from("application_comments")
        .insert({ application_id: applicationId, author_id: user!.id, body, internal: true });
      if (error) throw error;
      await supabase.from("application_events").insert({
        application_id: applicationId,
        actor_id: user!.id,
        event_type: "comment",
        summary: "Added an internal note",
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["application-comments", applicationId] });
      void qc.invalidateQueries({ queryKey: ["application-events", applicationId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add note"),
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("application_comments").delete().eq("id", id).eq("author_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["application-comments", applicationId] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete note"),
  });

  const upload = async (file: File) => {
    if (!user) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Files must be under 10 MB.");
      return;
    }
    setUploading(true);
    try {
      const path = `${applicationId}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("application-attachments").upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("application_attachments").insert({
        application_id: applicationId,
        uploaded_by: user.id,
        name: file.name,
        file_path: path,
        file_size_bytes: file.size,
      });
      if (error) throw error;
      await supabase.from("application_events").insert({
        application_id: applicationId,
        actor_id: user.id,
        event_type: "attachment",
        summary: `Attached ${file.name}`,
      });
      toast.success("File attached.");
      void qc.invalidateQueries({ queryKey: ["application-attachments", applicationId] });
      void qc.invalidateQueries({ queryKey: ["application-events", applicationId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const openFile = async (path: string) => {
    const { data, error } = await supabase.storage.from("application-attachments").createSignedUrl(path, 60);
    if (error || !data) {
      toast.error("Could not open file");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const app = appQuery.data;

  const timelineItems: TimelineItem[] = (eventsQuery.data ?? []).map((e) => ({
    id: e.id,
    title: e.summary,
    at: e.created_at,
    icon: CalendarClock,
  }));

  const notes: CrmNote[] = (commentsQuery.data ?? []).map((c) => ({
    id: c.id,
    body: c.body,
    author: c.author_id === user?.id ? "You" : undefined,
    created_at: c.created_at,
  }));

  const currentIndex = app ? atsStageIndex(app.status) : -1;
  const nextStage = app && currentIndex >= 0 && currentIndex < ATS_STAGES.length - 2 ? ATS_STAGES[currentIndex + 1] : null;

  return (
    <div>
      <Link to="/admin/applications" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to applications
      </Link>

      {appQuery.isLoading ? (
        <LoadingSkeleton variant="profile" />
      ) : !app ? (
        <EmptyState title="Application not found" description="It may have been removed." />
      ) : (
        <>
          <PageHeader
            title={app.teacher_name}
            description={`${app.job_title} at ${app.school_name}`}
            action={
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label={atsStageLabel(app.status)} tone={atsStageTone(app.status)} />
                {nextStage && (
                  <Button size="sm" onClick={() => changeStage.mutate(nextStage.id)} disabled={changeStage.isPending}>
                    Advance to {nextStage.label}
                  </Button>
                )}
                {!isTerminalStage(app.status) && (
                  <Button size="sm" variant="outline" onClick={() => changeStage.mutate("rejected")} disabled={changeStage.isPending}>
                    <XCircle className="mr-2 h-4 w-4" /> Reject
                  </Button>
                )}
              </div>
            }
          />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              <InfoCard title="Candidate">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft font-serif text-sm text-primary">
                    {initialsOf(app.teacher_name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{app.teacher_name}</p>
                    <p className="truncate text-sm text-muted-foreground">{app.teacher_email ?? "No email on file"}</p>
                  </div>
                </div>
                <InfoRow label="Applied on" value={formatDate(app.created_at)} />
                <InfoRow label="Last updated" value={formatDate(app.updated_at)} />
                <InfoRow label="City" value={app.teacher_city ?? undefined} />
                <InfoRow label="Experience" value={app.teacher_experience_years != null ? `${app.teacher_experience_years} yrs` : undefined} />
                <InfoRow label="Subjects" value={app.teacher_subjects.length ? app.teacher_subjects.join(", ") : undefined} />
                <InfoRow label="Expected salary" value={formatMoney(app.expected_salary)} />
                {app.cover_letter && <InfoRow label="Cover letter" value={app.cover_letter} />}
              </InfoCard>

              <InfoCard title="Job & school">
                <InfoRow label="Job title" value={app.job_title} />
                <InfoRow label="School" value={app.school_name} />
              </InfoCard>

              <InfoCard title="Recruiter" description="Assign the team member owning this candidate.">
                <RecruiterSelect
                  value={app.assigned_recruiter}
                  onChange={(v) => assignRecruiterMutation.mutate(v)}
                  className="w-full sm:w-64"
                />
              </InfoCard>

              <InfoCard title="Interview history">
                {(interviewsQuery.data ?? []).length === 0 ? (
                  <EmptyState title="No interviews yet" description="Scheduled interviews will appear here." />
                ) : (
                  <ul className="space-y-3">
                    {(interviewsQuery.data ?? []).map((i) => (
                      <li key={i.id} className="rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{formatDateTime(i.scheduled_at)}</p>
                          <Badge variant="outline">{i.status}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {i.mode} · {i.interviewer_name ?? "Interviewer TBD"}
                        </p>
                        {i.outcome && <p className="mt-1 text-xs text-muted-foreground">Outcome: {i.outcome}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </InfoCard>

              <InfoCard title="Attachments" action={
                <label className="cursor-pointer text-sm text-primary hover:underline">
                  {uploading ? "Uploading…" : "Upload file"}
                  <input ref={fileRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                </label>
              }>
                {(attachmentsQuery.data ?? []).length === 0 ? (
                  <EmptyState title="No attachments" description="Uploaded files will appear here." />
                ) : (
                  <ul className="space-y-2">
                    {(attachmentsQuery.data ?? []).map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate text-sm">{a.name}</span>
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => openFile(a.file_path)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </InfoCard>

              <NotesPanel
                notes={notes}
                onAdd={(body) => addNote.mutateAsync(body)}
                onDelete={(id) => setPendingDeleteNote(id)}
                isBusy={addNote.isPending}
              />
            </div>

            <div className="space-y-4">
              <CommunicationTimeline entityType="application" entityId={applicationId} />

              <InfoCard title="Activity timeline">
                <Timeline items={timelineItems} />
              </InfoCard>

              <TasksPanel relatedType="application" relatedId={applicationId} />
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={pendingDeleteNote !== null}
        onOpenChange={(v) => !v && setPendingDeleteNote(null)}
        title="Delete this note?"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (pendingDeleteNote) deleteNote.mutate(pendingDeleteNote);
          setPendingDeleteNote(null);
        }}
      />
    </div>
  );
}
