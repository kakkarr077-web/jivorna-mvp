import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/crm/CrmPrimitives";
import {
  INTERVIEW_MODES,
  OUTCOME_OPTIONS,
  cancelInterview,
  completeInterviewWithFeedback,
  createInterview,
  fetchSchedulableApplications,
  rescheduleInterview,
  type AdminInterviewRow,
  type InterviewMode,
} from "@/lib/admin-interviews";

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

type FormState = {
  application_id: string;
  scheduled_at: string;
  duration_minutes: string;
  mode: InterviewMode;
  location: string;
  meeting_url: string;
  interviewer_name: string;
};

const emptyForm: FormState = {
  application_id: "",
  scheduled_at: "",
  duration_minutes: "30",
  mode: "video",
  location: "",
  meeting_url: "",
  interviewer_name: "",
};

export function ScheduleInterviewDialog({
  open,
  onOpenChange,
  interview,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** When present, dialog reschedules this interview instead of creating a new one. */
  interview?: AdminInterviewRow | null;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);

  const applicationsQuery = useQuery({
    queryKey: ["admin-schedulable-applications"],
    queryFn: fetchSchedulableApplications,
    enabled: open && !interview,
  });

  useEffect(() => {
    if (!open) return;
    if (interview) {
      setForm({
        application_id: interview.application_id,
        scheduled_at: toLocalInput(interview.scheduled_at),
        duration_minutes: String(interview.duration_minutes),
        mode: interview.mode,
        location: interview.location ?? "",
        meeting_url: interview.meeting_url ?? "",
        interviewer_name: interview.interviewer_name ?? "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, interview]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.application_id) throw new Error("Select an application first.");
      if (!form.scheduled_at) throw new Error("Pick a date and time.");
      const payload = {
        application_id: form.application_id,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        duration_minutes: Number(form.duration_minutes) || 30,
        mode: form.mode,
        location: form.location || null,
        meeting_url: form.meeting_url || null,
        interviewer_name: form.interviewer_name || null,
      };
      if (interview) {
        await rescheduleInterview({ id: interview.id, ...payload });
      } else {
        await createInterview(payload);
      }
    },
    onSuccess: () => {
      toast.success(interview ? "Interview rescheduled." : "Interview scheduled.");
      onOpenChange(false);
      void qc.invalidateQueries({ queryKey: ["admin-interviews"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save interview"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{interview ? "Reschedule interview" : "Schedule interview"}</DialogTitle>
          <DialogDescription>
            {interview ? "Update the date, time or details for this interview." : "Pick a candidate application and set up the interview."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!interview && (
            <div className="space-y-1.5">
              <Label>Application</Label>
              <Select value={form.application_id} onValueChange={(v) => setForm((f) => ({ ...f, application_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select a candidate application" /></SelectTrigger>
                <SelectContent>
                  {(applicationsQuery.data ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.teacher_name} · {a.job_title} ({a.school_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Date & time</Label>
              <Input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                min={5}
                value={form.duration_minutes}
                onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Mode</Label>
            <Select value={form.mode} onValueChange={(v) => setForm((f) => ({ ...f, mode: v as InterviewMode }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INTERVIEW_MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.mode === "in_person" ? (
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="School campus, room, etc." />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Meeting link</Label>
              <Input value={form.meeting_url} onChange={(e) => setForm((f) => ({ ...f, meeting_url: e.target.value }))} placeholder="https://…" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Interviewer</Label>
            <Input value={form.interviewer_name} onChange={(e) => setForm((f) => ({ ...f, interviewer_name: e.target.value }))} placeholder="Interviewer name" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {interview ? "Save changes" : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CancelInterviewDialog({
  interview,
  onOpenChange,
}: {
  interview: AdminInterviewRow | null;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const cancel = useMutation({
    mutationFn: async (id: string) => cancelInterview(id),
    onSuccess: () => {
      toast.success("Interview cancelled.");
      onOpenChange(false);
      void qc.invalidateQueries({ queryKey: ["admin-interviews"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not cancel interview"),
  });

  return (
    <ConfirmDialog
      open={interview !== null}
      onOpenChange={onOpenChange}
      title="Cancel this interview?"
      description={interview ? `This cancels the interview with ${interview.teacher_name} scheduled for ${new Date(interview.scheduled_at).toLocaleString()}.` : undefined}
      confirmLabel="Cancel interview"
      destructive
      onConfirm={() => interview && cancel.mutate(interview.id)}
    />
  );
}

export function CompleteInterviewDialog({
  interview,
  onOpenChange,
}: {
  interview: AdminInterviewRow | null;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (interview) {
      setOutcome(interview.outcome ?? "");
      setNotes(interview.notes ?? "");
    }
  }, [interview]);

  const complete = useMutation({
    mutationFn: async () => {
      if (!interview) return;
      if (!outcome) throw new Error("Select an outcome.");
      await completeInterviewWithFeedback({ id: interview.id, outcome, notes: notes || null });
    },
    onSuccess: () => {
      toast.success("Interview marked completed.");
      onOpenChange(false);
      void qc.invalidateQueries({ queryKey: ["admin-interviews"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save feedback"),
  });

  return (
    <Dialog open={interview !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete interview</DialogTitle>
          <DialogDescription>Record the outcome and feedback for this interview.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Outcome</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
              <SelectContent>
                {OUTCOME_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Interview feedback…" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => complete.mutate()} disabled={complete.isPending}>Save feedback</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
